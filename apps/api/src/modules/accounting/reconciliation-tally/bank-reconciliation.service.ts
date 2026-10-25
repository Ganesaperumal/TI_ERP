import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingVoucherService } from '../core/accounting-voucher.service';
import { AccountingSetupService } from '../core/accounting-setup.service';
import { SettleBankBatchDto } from './recon-tally.dto';
import {
  BankSettlementStatusEnum,
  PaymentMethodEnum,
  VoucherTypeEnum,
  Decimal,
} from '@ti-erp/database';

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly setupService: AccountingSetupService,
    private readonly voucherService: AccountingVoucherService,
  ) {}

  /**
   * List Pending/Unsettled UPI and Card POS Transactions
   */
  async getPendingSettlements(tenantId: string, branchId?: string) {
    const whereClause: any = {
      bankSettlementStatus: BankSettlementStatusEnum.PENDING,
      method: { in: [PaymentMethodEnum.UPI, PaymentMethodEnum.CARD, PaymentMethodEnum.SODEXO] },
      invoice: {
        tenantId,
        cancelledAt: null,
      },
    };
    if (branchId) whereClause.invoice.branchId = branchId;

    const splits = await this.prisma.posPaymentSplit.findMany({
      where: whereClause,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            createdAt: true,
            branchId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalPendingAmount = new Decimal(0);
    const dateMethodGroups = new Map<
      string,
      { date: string; method: string; count: number; totalAmount: Decimal; splitIds: string[] }
    >();

    for (const s of splits) {
      totalPendingAmount = totalPendingAmount.add(s.amount);
      const dateKey = s.createdAt.toISOString().slice(0, 10);
      const groupKey = `${dateKey}_${s.method}`;

      let grp = dateMethodGroups.get(groupKey);
      if (!grp) {
        grp = {
          date: dateKey,
          method: s.method,
          count: 0,
          totalAmount: new Decimal(0),
          splitIds: [],
        };
        dateMethodGroups.set(groupKey, grp);
      }

      grp.count += 1;
      grp.totalAmount = grp.totalAmount.add(s.amount);
      grp.splitIds.push(s.id);
    }

    return {
      totalPendingTransactions: splits.length,
      totalPendingGrossAmount: Number(totalPendingAmount.toDecimalPlaces(2)),
      groups: Array.from(dateMethodGroups.values()).map((g) => ({
        date: g.date,
        method: g.method,
        count: g.count,
        totalAmount: Number(g.totalAmount.toDecimalPlaces(2)),
        splitIds: g.splitIds,
      })),
      splits: splits.map((s) => ({
        id: s.id,
        invoiceId: s.invoiceId,
        invoiceNumber: s.invoice.invoiceNumber,
        method: s.method,
        amount: Number(s.amount),
        upiTxnId: s.upiTxnId,
        edcTerminalRef: s.edcTerminalRef,
        date: s.createdAt,
      })),
    };
  }

  /**
   * Settle Batch of UPI/Card Payments with Automatic MDR Variance Calculation & Clearing Journal
   */
  async settleBatch(dto: SettleBankBatchDto) {
    if (!dto.splitIds || dto.splitIds.length === 0) {
      throw new BadRequestException('At least one payment splitId is required for settlement');
    }

    const expectedGross = new Decimal(dto.expectedGrossAmount).toDecimalPlaces(2);
    const actualCredited = new Decimal(dto.actualBankCreditedAmount).toDecimalPlaces(2);

    // MDR & Gateway Charges = Expected Gross - Actual Bank Credited
    // (If negative, bank credited more than expected e.g. gateway incentive or rounding excess)
    const mdrFee = expectedGross.sub(actualCredited).toDecimalPlaces(2);
    const mdrPct = expectedGross.greaterThan(0)
      ? mdrFee.mul(100).div(expectedGross).toDecimalPlaces(2)
      : new Decimal(0);

    const threshold = dto.discrepancyThresholdPct ?? 2.5;
    const isDiscrepancyAbnormal = Number(mdrPct) > threshold;

    await this.setupService.ensureStandardChartOfAccounts(dto.tenantId);
    const getAccount = async (code: string) => {
      const acc = await this.setupService.getLedgerByCode(dto.tenantId, code);
      if (!acc) throw new BadRequestException(`Account ${code} not found in COA`);
      return acc;
    };

    const bankAcc = await getAccount('ASSET_BANK_MAIN');
    const mdrExpAcc = await getAccount('EXP_BANK_MDR_CHARGES');
    const otherIncomeAcc = await getAccount('INC_OTHER_STORE_INCOME');
    const clearingAcc = await getAccount('ASSET_UPI_CARD_CLEARING');

    return this.prisma.$transaction(async (tx) => {
      // 1. Update PosPaymentSplit records
      const perSplitMdrRatio = expectedGross.greaterThan(0) ? mdrFee.div(expectedGross) : new Decimal(0);

      for (const splitId of dto.splitIds) {
        const split = await tx.posPaymentSplit.findUnique({ where: { id: splitId } });
        if (split) {
          const splitMdr = split.amount.mul(perSplitMdrRatio).toDecimalPlaces(2);
          await tx.posPaymentSplit.update({
            where: { id: splitId },
            data: {
              bankSettlementStatus: BankSettlementStatusEnum.SETTLED,
              bankSettlementRef: dto.bankUtrNumber,
              bankMdrFee: splitMdr.greaterThanOrEqualTo(0) ? splitMdr : new Decimal(0),
            },
          });
        }
      }

      // 2. Post Balanced Double-Entry Clearing Journal
      // Dr: Bank Account (actual money credited in bank)
      // If mdrFee > 0: Dr: Bank MDR Charges (fee deducted by gateway)
      // If mdrFee < 0: Cr: Other Store / Settlement Income (incentive/excess credited)
      // Cr: UPI/Card Clearing Account (clears out the pending receivable asset)
      const lines = [
        {
          ledgerAccountId: bankAcc.id,
          debitAmount: actualCredited,
          creditAmount: new Decimal(0),
          narration: `Bank Credit UTR: ${dto.bankUtrNumber} (Settlement Date: ${dto.settlementDate})`,
        },
      ];

      if (mdrFee.greaterThan(0)) {
        lines.push({
          ledgerAccountId: mdrExpAcc.id,
          debitAmount: mdrFee,
          creditAmount: new Decimal(0),
          narration: `Bank MDR / EDC Gateway Charges (${mdrPct.toFixed(2)}%)`,
        });
      } else if (mdrFee.lessThan(0)) {
        // [REMOD-601B] Handle Negative MDR / Excess Settlement Credit
        lines.push({
          ledgerAccountId: otherIncomeAcc.id,
          debitAmount: new Decimal(0),
          creditAmount: mdrFee.abs(),
          narration: `Bank Settlement Incentive / Excess Gain (${mdrFee.abs().toFixed(2)})`,
        });
      }

      lines.push({
        ledgerAccountId: clearingAcc.id,
        debitAmount: new Decimal(0),
        creditAmount: expectedGross,
        narration: `Cleared ${dto.splitIds.length} POS UPI/Card Transactions`,
      });

      const voucher = await this.voucherService.postBalancedVoucherInternal({
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        voucherType: VoucherTypeEnum.BANK_SETTLEMENT,
        voucherDate: new Date(dto.settlementDate),
        narration: `Bank & UPI/Card Settlement (UTR: ${dto.bankUtrNumber}, Gross: ₹${expectedGross.toFixed(2)}, Net: ₹${actualCredited.toFixed(2)}, MDR: ₹${mdrFee.toFixed(2)})`,
        lines,
      });

      this.logger.log(
        `Settled ${dto.splitIds.length} payments. UTR: ${dto.bankUtrNumber}, MDR: ₹${mdrFee.toFixed(2)} (${mdrPct.toFixed(2)}%)`,
      );

      return {
        success: true,
        settledTransactionsCount: dto.splitIds.length,
        bankUtrNumber: dto.bankUtrNumber,
        expectedGrossAmount: Number(expectedGross),
        actualBankCreditedAmount: Number(actualCredited),
        mdrFeeDeducted: Number(mdrFee),
        mdrPercentage: Number(mdrPct),
        isDiscrepancyAbnormal,
        discrepancyWarning: isDiscrepancyAbnormal
          ? `MDR fee of ${mdrPct.toFixed(2)}% exceeds expected threshold of ${threshold}%. Please review bank settlement advice.`
          : undefined,
        voucherId: voucher.id,
        voucherNumber: voucher.voucherNumber,
      };
    });
  }
}
