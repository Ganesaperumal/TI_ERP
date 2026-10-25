import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingSetupService } from './accounting-setup.service';
import { CreateJournalVoucherDto, PostStoreExpenseDto } from './accounting.dto';
import {
  Decimal,
  VoucherTypeEnum,
  AccountTypeEnum,
  PaymentMethodEnum,
} from '@ti-erp/database';

export interface RawVoucherLine {
  ledgerAccountId: string;
  debitAmount: Decimal;
  creditAmount: Decimal;
  narration?: string;
}

@Injectable()
export class AccountingVoucherService {
  private readonly logger = new Logger(AccountingVoucherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly setupService: AccountingSetupService,
  ) {}

  /**
   * Balanced Double-Entry Journal Voucher Engine (Strict Sum(Debit) === Sum(Credit))
   */
  async createVoucher(dto: CreateJournalVoucherDto) {
    await this.setupService.ensureStandardChartOfAccounts(dto.tenantId);

    const lines = dto.lines.map((l) => ({
      ledgerAccountId: l.ledgerAccountId,
      debitAmount: new Decimal(l.debitAmount).toDecimalPlaces(2),
      creditAmount: new Decimal(l.creditAmount).toDecimalPlaces(2),
      narration: l.narration,
    }));

    return this.postBalancedVoucherInternal({
      tenantId: dto.tenantId,
      branchId: dto.branchId,
      voucherType: dto.voucherType,
      voucherNumber: dto.voucherNumber,
      voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : new Date(),
      narration: dto.narration,
      lines,
    });
  }

  /**
   * Internal Core Voucher Creator with Invariant Enforcement
   */
  async postBalancedVoucherInternal(params: {
    tenantId: string;
    branchId: string;
    voucherType: VoucherTypeEnum;
    voucherNumber?: string;
    voucherDate?: Date;
    narration: string;
    lines: RawVoucherLine[];
  }) {
    if (!params.lines || params.lines.length < 2) {
      throw new BadRequestException('Double-entry voucher must contain at least 2 lines (debit & credit)');
    }

    // Invariant: sum(Debit) === sum(Credit)
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const line of params.lines) {
      totalDebit = totalDebit.add(line.debitAmount);
      totalCredit = totalCredit.add(line.creditAmount);
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(
        `Double-entry voucher unbalanced: Total Debit ₹${totalDebit.toFixed(
          2,
        )} does not equal Total Credit ₹${totalCredit.toFixed(2)}`,
      );
    }

    if (totalDebit.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Voucher amount must be greater than zero');
    }

    const dateStr = (params.voucherDate ?? new Date()).toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const voucherNumber =
      params.voucherNumber ?? `JV-${params.voucherType.slice(0, 4)}-${dateStr}-${randSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create JournalVoucher header
      const voucher = await tx.journalVoucher.create({
        data: {
          tenantId: params.tenantId,
          branchId: params.branchId,
          voucherNumber,
          voucherDate: params.voucherDate ?? new Date(),
          voucherType: params.voucherType,
          narration: params.narration,
          isTallyExported: false,
          lines: {
            create: params.lines.map((l) => ({
              ledgerAccountId: l.ledgerAccountId,
              debitAmount: l.debitAmount,
              creditAmount: l.creditAmount,
              narration: l.narration,
            })),
          },
        },
        include: {
          lines: {
            include: { ledgerAccount: true },
          },
        },
      });

      // 2. Update currentBalance on LedgerAccount based on Indian Accounting rules
      for (const line of params.lines) {
        const account = await tx.ledgerAccount.findUnique({
          where: { id: line.ledgerAccountId },
          include: { group: true },
        });

        if (account) {
          // ASSET & EXPENSE: normal balance is Debit (Debit increases, Credit decreases)
          // LIABILITY, EQUITY, INCOME: normal balance is Credit (Credit increases, Debit decreases)
          let delta = new Decimal(0);
          if (
            account.group.groupType === AccountTypeEnum.ASSET ||
            account.group.groupType === AccountTypeEnum.EXPENSE
          ) {
            delta = line.debitAmount.sub(line.creditAmount);
          } else {
            delta = line.creditAmount.sub(line.debitAmount);
          }

          await tx.ledgerAccount.update({
            where: { id: account.id },
            data: {
              currentBalance: account.currentBalance.add(delta),
            },
          });
        }
      }

      this.logger.log(`Posted Voucher ${voucherNumber} (Amount: ₹${totalDebit.toFixed(2)})`);
      return voucher;
    });
  }

  /**
   * Auto-Post Double-Entry Journal for Shift Z-Report (Sales, Taxes, Tenders, COGS)
   */
  async postPosZReportJournal(tenantId: string, branchId: string, shiftId: string) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        invoices: {
          where: { cancelledAt: null },
          include: {
            payments: true,
            lines: true,
          },
        },
      },
    });

    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
    if (shift.invoices.length === 0) {
      this.logger.warn(`Shift ${shiftId} has no invoices; skipping POS journal`);
      return null;
    }

    // Ensure chart of accounts
    await this.setupService.ensureStandardChartOfAccounts(tenantId);
    const getAccount = async (code: string) => {
      const acc = await this.setupService.getLedgerByCode(tenantId, code);
      if (!acc) throw new NotFoundException(`Account ${code} not found in COA`);
      return acc;
    };

    const cashDrawerAcc = await getAccount('ASSET_CASH_DRAWER');
    const upiCardClearingAcc = await getAccount('ASSET_UPI_CARD_CLEARING');
    const debtorsAcc = await getAccount('ASSET_ACCOUNTS_RECEIVABLE');
    const creditNotesAcc = await getAccount('LIAB_CREDIT_NOTES');
    const giftCardsAcc = await getAccount('LIAB_PREPAID_GIFT_CARDS');

    const salesRevenueAcc = await getAccount('INC_RETAIL_SALES');
    const cgstOutputAcc = await getAccount('LIAB_GST_OUTPUT_CGST');
    const sgstOutputAcc = await getAccount('LIAB_GST_OUTPUT_SGST');
    const igstOutputAcc = await getAccount('LIAB_GST_OUTPUT_IGST');
    const cessOutputAcc = await getAccount('LIAB_GST_OUTPUT_CESS');
    const roundOffExpAcc = await getAccount('EXP_ROUNDOFF');
    const roundOffIncAcc = await getAccount('INC_ROUNDOFF');

    const cogsExpAcc = await getAccount('EXP_COGS');
    const inventoryStockAcc = await getAccount('ASSET_INVENTORY_STOCK');

    // Aggregate shift sales & tax figures
    let totalCash = new Decimal(0);
    let totalUpiCard = new Decimal(0);
    let totalKhata = new Decimal(0);
    let totalCreditNote = new Decimal(0);
    let totalGiftCard = new Decimal(0);

    let totalTaxable = new Decimal(0);
    let totalCgst = new Decimal(0);
    let totalSgst = new Decimal(0);
    let totalIgst = new Decimal(0);
    let totalCess = new Decimal(0);
    let totalRoundOff = new Decimal(0);
    let totalCogs = new Decimal(0);

    for (const inv of shift.invoices) {
      totalTaxable = totalTaxable.add(inv.taxableAmount);
      totalCgst = totalCgst.add(inv.cgstAmount);
      totalSgst = totalSgst.add(inv.sgstAmount);
      totalIgst = totalIgst.add(inv.igstAmount);
      totalCess = totalCess.add(inv.cessAmount);
      totalRoundOff = totalRoundOff.add(inv.roundOff);

      for (const p of inv.payments) {
        if (p.method === PaymentMethodEnum.CASH) {
          totalCash = totalCash.add(p.amount);
        } else if (
          p.method === PaymentMethodEnum.UPI ||
          p.method === PaymentMethodEnum.CARD ||
          p.method === PaymentMethodEnum.SODEXO
        ) {
          totalUpiCard = totalUpiCard.add(p.amount);
        } else if (p.method === PaymentMethodEnum.CUSTOMER_KHATA) {
          totalKhata = totalKhata.add(p.amount);
        } else if (p.method === PaymentMethodEnum.CREDIT_NOTE_SLIP) {
          totalCreditNote = totalCreditNote.add(p.amount);
        } else if (p.method === PaymentMethodEnum.GIFT_CARD) {
          totalGiftCard = totalGiftCard.add(p.amount);
        } else {
          totalCash = totalCash.add(p.amount);
        }
      }

      for (const l of inv.lines) {
        if (l.netLandingCostSnapshot && l.netLandingCostSnapshot.greaterThan(0)) {
          totalCogs = totalCogs.add(l.netLandingCostSnapshot.mul(l.quantity));
        }
      }
    }

    const lines: RawVoucherLine[] = [];

    // Debits (Assets & Reductions of liability)
    if (totalCash.greaterThan(0)) {
      lines.push({
        ledgerAccountId: cashDrawerAcc.id,
        debitAmount: totalCash,
        creditAmount: new Decimal(0),
        narration: `Counter Cash Collections - Shift ${shift.shiftNumber}`,
      });
    }
    if (totalUpiCard.greaterThan(0)) {
      lines.push({
        ledgerAccountId: upiCardClearingAcc.id,
        debitAmount: totalUpiCard,
        creditAmount: new Decimal(0),
        narration: `UPI / Card Settlement Pending - Shift ${shift.shiftNumber}`,
      });
    }
    if (totalKhata.greaterThan(0)) {
      lines.push({
        ledgerAccountId: debtorsAcc.id,
        debitAmount: totalKhata,
        creditAmount: new Decimal(0),
        narration: `Customer Khata Purchases - Shift ${shift.shiftNumber}`,
      });
    }
    if (totalCreditNote.greaterThan(0)) {
      lines.push({
        ledgerAccountId: creditNotesAcc.id,
        debitAmount: totalCreditNote,
        creditAmount: new Decimal(0),
        narration: `Credit Notes Redeemed - Shift ${shift.shiftNumber}`,
      });
    }
    if (totalGiftCard.greaterThan(0)) {
      lines.push({
        ledgerAccountId: giftCardsAcc.id,
        debitAmount: totalGiftCard,
        creditAmount: new Decimal(0),
        narration: `Gift Cards Redeemed - Shift ${shift.shiftNumber}`,
      });
    }

    // Credits (Sales Revenue & GST Output Liability)
    if (totalTaxable.greaterThan(0)) {
      lines.push({
        ledgerAccountId: salesRevenueAcc.id,
        debitAmount: new Decimal(0),
        creditAmount: totalTaxable,
        narration: `POS Taxable Sales - Shift ${shift.shiftNumber}`,
      });
    }
    if (totalCgst.greaterThan(0)) {
      lines.push({
        ledgerAccountId: cgstOutputAcc.id,
        debitAmount: new Decimal(0),
        creditAmount: totalCgst,
        narration: 'CGST Output Tax Collected',
      });
    }
    if (totalSgst.greaterThan(0)) {
      lines.push({
        ledgerAccountId: sgstOutputAcc.id,
        debitAmount: new Decimal(0),
        creditAmount: totalSgst,
        narration: 'SGST Output Tax Collected',
      });
    }
    if (totalIgst.greaterThan(0)) {
      lines.push({
        ledgerAccountId: igstOutputAcc.id,
        debitAmount: new Decimal(0),
        creditAmount: totalIgst,
        narration: 'IGST Output Tax Collected',
      });
    }
    if (totalCess.greaterThan(0)) {
      lines.push({
        ledgerAccountId: cessOutputAcc.id,
        debitAmount: new Decimal(0),
        creditAmount: totalCess,
        narration: 'GST Cess Output Collected',
      });
    }

    // RoundOff Handling
    const debitsSum = lines.reduce((s, l) => s.add(l.debitAmount), new Decimal(0));
    const creditsSum = lines.reduce((s, l) => s.add(l.creditAmount), new Decimal(0));
    const diff = debitsSum.sub(creditsSum);

    if (!diff.equals(0)) {
      if (diff.greaterThan(0)) {
        // Debits exceed credits -> RoundOff Gain (Credit)
        lines.push({
          ledgerAccountId: roundOffIncAcc.id,
          debitAmount: new Decimal(0),
          creditAmount: diff,
          narration: 'RoundOff Gain',
        });
      } else {
        // Credits exceed debits -> RoundOff Loss (Debit)
        lines.push({
          ledgerAccountId: roundOffExpAcc.id,
          debitAmount: diff.abs(),
          creditAmount: new Decimal(0),
          narration: 'RoundOff Loss',
        });
      }
    }

    // COGS & Inventory Reduction Entry (Sub-voucher / within same balanced JV)
    if (totalCogs.greaterThan(0)) {
      lines.push({
        ledgerAccountId: cogsExpAcc.id,
        debitAmount: totalCogs,
        creditAmount: new Decimal(0),
        narration: `COGS for Shift ${shift.shiftNumber}`,
      });
      lines.push({
        ledgerAccountId: inventoryStockAcc.id,
        debitAmount: new Decimal(0),
        creditAmount: totalCogs,
        narration: `Inventory Stock Reduction for Shift ${shift.shiftNumber}`,
      });
    }

    return this.postBalancedVoucherInternal({
      tenantId,
      branchId,
      voucherType: VoucherTypeEnum.POS_DAY_CLOSE,
      narration: `Automated POS Z-Report Day Close Journal for Shift ${shift.shiftNumber}`,
      lines,
    });
  }

  /**
   * Auto-Post Double-Entry Journal for Goods Receipt Note (GRN Purchase & Input Tax Credit)
   */
  async postGrnPurchaseJournal(tenantId: string, branchId: string, grnId: string) {
    const grn = await this.prisma.goodsReceiptNote.findUnique({
      where: { id: grnId },
      include: {
        lineItems: true,
        supplier: true,
      },
    });

    if (!grn) throw new NotFoundException(`GRN ${grnId} not found`);

    await this.setupService.ensureStandardChartOfAccounts(tenantId);
    const getAccount = async (code: string) => {
      const acc = await this.setupService.getLedgerByCode(tenantId, code);
      if (!acc) throw new NotFoundException(`Account ${code} not found in COA`);
      return acc;
    };

    const stockAcc = await getAccount('ASSET_INVENTORY_STOCK');
    const cgstInputAcc = await getAccount('ASSET_GST_INPUT_CGST');
    const sgstInputAcc = await getAccount('ASSET_GST_INPUT_SGST');
    const igstInputAcc = await getAccount('ASSET_GST_INPUT_IGST');
    const cessInputAcc = await getAccount('ASSET_GST_INPUT_CESS');
    const creditorsAcc = await getAccount('LIAB_ACCOUNTS_PAYABLE');

    // Aggregate line details
    let taxableTotal = new Decimal(0);
    let cgstTotal = new Decimal(0);
    let sgstTotal = new Decimal(0);
    let igstTotal = new Decimal(0);
    let cessTotal = new Decimal(0);

    for (const l of grn.lineItems) {
      taxableTotal = taxableTotal.add(l.taxableAmount);
      cgstTotal = cgstTotal.add(l.cgstAmount);
      sgstTotal = sgstTotal.add(l.sgstAmount);
      igstTotal = igstTotal.add(l.igstAmount);
    }

    const supplierDisplayName = grn.supplier.name || grn.supplier.legalTradeName || 'Supplier';

    const lines: RawVoucherLine[] = [
      {
        ledgerAccountId: stockAcc.id,
        debitAmount: taxableTotal,
        creditAmount: new Decimal(0),
        narration: `Inventory Inward from ${supplierDisplayName} (GRN ${grn.grnNumber})`,
      },
    ];

    if (cgstTotal.greaterThan(0)) {
      lines.push({
        ledgerAccountId: cgstInputAcc.id,
        debitAmount: cgstTotal,
        creditAmount: new Decimal(0),
        narration: `CGST Input Credit on GRN ${grn.grnNumber}`,
      });
    }
    if (sgstTotal.greaterThan(0)) {
      lines.push({
        ledgerAccountId: sgstInputAcc.id,
        debitAmount: sgstTotal,
        creditAmount: new Decimal(0),
        narration: `SGST Input Credit on GRN ${grn.grnNumber}`,
      });
    }
    if (igstTotal.greaterThan(0)) {
      lines.push({
        ledgerAccountId: igstInputAcc.id,
        debitAmount: igstTotal,
        creditAmount: new Decimal(0),
        narration: `IGST Input Credit on GRN ${grn.grnNumber}`,
      });
    }
    if (cessTotal.greaterThan(0)) {
      lines.push({
        ledgerAccountId: cessInputAcc.id,
        debitAmount: cessTotal,
        creditAmount: new Decimal(0),
        narration: `GST Cess Input Credit on GRN ${grn.grnNumber}`,
      });
    }

    // Balancing Credit to Supplier / Accounts Payable
    const debitSum = lines.reduce((s, l) => s.add(l.debitAmount), new Decimal(0));
    lines.push({
      ledgerAccountId: creditorsAcc.id,
      debitAmount: new Decimal(0),
      creditAmount: debitSum,
      narration: `Supplier Payable: ${supplierDisplayName} (Bill ${grn.supplierInvoiceNo ?? grn.grnNumber})`,
    });

    return this.postBalancedVoucherInternal({
      tenantId,
      branchId,
      voucherType: VoucherTypeEnum.GRN_PURCHASE,
      narration: `GRN Purchase Voucher for Inward ${grn.grnNumber} from ${supplierDisplayName}`,
      lines,
    });
  }

  /**
   * Auto-Post Double-Entry Journal for Shrinkage/Wastage/Damage Write-Off
   */
  async postWastageOrDamageWriteOff(tenantId: string, branchId: string, amount: Decimal, notes?: string) {
    await this.setupService.ensureStandardChartOfAccounts(tenantId);
    const getAccount = async (code: string) => {
      const acc = await this.setupService.getLedgerByCode(tenantId, code);
      if (!acc) throw new NotFoundException(`Account ${code} not found in COA`);
      return acc;
    };

    const shrinkageAcc = await getAccount('EXP_SHRINKAGE_WRITE_OFF');
    const stockAcc = await getAccount('ASSET_INVENTORY_STOCK');

    const lines: RawVoucherLine[] = [
      {
        ledgerAccountId: shrinkageAcc.id,
        debitAmount: amount,
        creditAmount: new Decimal(0),
        narration: notes ?? 'Inventory Shrinkage/Damage Write-Off',
      },
      {
        ledgerAccountId: stockAcc.id,
        debitAmount: new Decimal(0),
        creditAmount: amount,
        narration: notes ?? 'Inventory Asset Reduction',
      },
    ];

    return this.postBalancedVoucherInternal({
      tenantId,
      branchId,
      voucherType: VoucherTypeEnum.INVENTORY_WRITEOFF,
      narration: notes ?? 'Inventory Damage / Expiry / Shrinkage Write-Off',
      lines,
    });
  }

  /**
   * Post Store Expense Voucher (Rent, Electricity, Fuel, Petty Cash) with Optional GST Credit
   */
  async postStoreExpenseVoucher(tenantId: string, branchId: string, dto: PostStoreExpenseDto) {
    await this.setupService.ensureStandardChartOfAccounts(tenantId);
    const getAccount = async (code: string) => {
      const acc = await this.setupService.getLedgerByCode(tenantId, code);
      if (!acc) throw new NotFoundException(`Account ${code} not found in COA`);
      return acc;
    };

    const expenseAcc = await getAccount(dto.expenseAccountCode);
    const paymentAccCode = dto.paymentAccountCode || 'ASSET_CASH_DRAWER';
    const paymentAcc = await getAccount(paymentAccCode);

    const grossAmount = new Decimal(dto.amount).toDecimalPlaces(2);
    const lines: RawVoucherLine[] = [];

    if (dto.isGstClaimable && dto.gstRatePct && dto.gstRatePct > 0) {
      // Split taxable and GST
      const rateFactor = new Decimal(1).add(new Decimal(dto.gstRatePct).div(100));
      const taxable = grossAmount.div(rateFactor).toDecimalPlaces(2);
      const totalTax = grossAmount.sub(taxable);
      const halfTax = totalTax.div(2).toDecimalPlaces(2);
      const secondHalf = totalTax.sub(halfTax);

      const cgstInputAcc = await getAccount('ASSET_GST_INPUT_CGST');
      const sgstInputAcc = await getAccount('ASSET_GST_INPUT_SGST');

      lines.push({
        ledgerAccountId: expenseAcc.id,
        debitAmount: taxable,
        creditAmount: new Decimal(0),
        narration: dto.narration,
      });
      lines.push({
        ledgerAccountId: cgstInputAcc.id,
        debitAmount: halfTax,
        creditAmount: new Decimal(0),
        narration: `CGST Input on ${expenseAcc.accountName}`,
      });
      lines.push({
        ledgerAccountId: sgstInputAcc.id,
        debitAmount: secondHalf,
        creditAmount: new Decimal(0),
        narration: `SGST Input on ${expenseAcc.accountName}`,
      });
    } else {
      lines.push({
        ledgerAccountId: expenseAcc.id,
        debitAmount: grossAmount,
        creditAmount: new Decimal(0),
        narration: dto.narration,
      });
    }

    // Payment credit (Cash / Bank)
    lines.push({
      ledgerAccountId: paymentAcc.id,
      debitAmount: new Decimal(0),
      creditAmount: grossAmount,
      narration: `Payment from ${paymentAcc.accountName} for ${dto.narration}`,
    });

    return this.postBalancedVoucherInternal({
      tenantId,
      branchId,
      voucherType: VoucherTypeEnum.EXPENSE,
      narration: `Expense: ${dto.narration} (${expenseAcc.accountName})`,
      lines,
    });
  }
}
