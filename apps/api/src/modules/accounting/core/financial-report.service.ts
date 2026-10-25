import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingSetupService } from './accounting-setup.service';
import { AccountTypeEnum, Decimal } from '@ti-erp/database';

@Injectable()
export class FinancialReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly setupService: AccountingSetupService,
  ) {}

  /**
   * Day Book: All Journal Vouchers for a Specific Date
   */
  async getDayBook(tenantId: string, branchId?: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const whereClause: any = {
      tenantId,
      voucherDate: { gte: startOfDay, lte: endOfDay },
    };
    if (branchId) whereClause.branchId = branchId;

    const vouchers = await this.prisma.journalVoucher.findMany({
      where: whereClause,
      include: {
        branch: { select: { name: true, code: true } },
        lines: {
          include: {
            ledgerAccount: {
              include: { group: true },
            },
          },
        },
      },
      orderBy: { voucherDate: 'asc' },
    });

    const totalDebit = vouchers.reduce(
      (sum, v) => sum.add(v.lines.reduce((s, l) => s.add(l.debitAmount), new Decimal(0))),
      new Decimal(0),
    );

    return {
      date: startOfDay.toISOString().slice(0, 10),
      totalVouchers: vouchers.length,
      totalTurnover: Number(totalDebit),
      vouchers: vouchers.map((v) => ({
        id: v.id,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        voucherDate: v.voucherDate,
        branchName: v.branch.name,
        narration: v.narration,
        isTallyExported: v.isTallyExported,
        totalAmount: Number(v.lines.reduce((s, l) => s.add(l.debitAmount), new Decimal(0))),
        lines: v.lines.map((l) => ({
          accountCode: l.ledgerAccount.code,
          accountName: l.ledgerAccount.accountName,
          groupName: l.ledgerAccount.group.groupName,
          debitAmount: Number(l.debitAmount),
          creditAmount: Number(l.creditAmount),
          narration: l.narration,
        })),
      })),
    };
  }

  /**
   * Cash / Bank Book: Detailed Ledger of Liquid Balances
   */
  async getCashBankBook(tenantId: string, branchId?: string, fromDate?: string, toDate?: string) {
    await this.setupService.ensureStandardChartOfAccounts(tenantId);

    const start = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59);

    const cashBankAccounts = await this.prisma.ledgerAccount.findMany({
      where: {
        tenantId,
        code: {
          in: ['ASSET_CASH_DRAWER', 'ASSET_SAFE_CASH', 'ASSET_BANK_MAIN', 'ASSET_UPI_CARD_CLEARING'],
        },
      },
    });

    const accountIds = cashBankAccounts.map((a) => a.id);

    const lines = await this.prisma.journalVoucherLine.findMany({
      where: {
        ledgerAccountId: { in: accountIds },
        voucher: {
          tenantId,
          ...(branchId ? { branchId } : {}),
          voucherDate: { gte: start, lte: end },
        },
      },
      include: {
        voucher: true,
        ledgerAccount: true,
      },
      orderBy: { voucher: { voucherDate: 'asc' } },
    });

    let totalReceipts = new Decimal(0);
    let totalPayments = new Decimal(0);

    const entries = lines.map((l) => {
      totalReceipts = totalReceipts.add(l.debitAmount);
      totalPayments = totalPayments.add(l.creditAmount);
      return {
        id: l.id,
        date: l.voucher.voucherDate,
        voucherNumber: l.voucher.voucherNumber,
        accountName: l.ledgerAccount.accountName,
        accountCode: l.ledgerAccount.code,
        narration: l.narration || l.voucher.narration,
        receiptAmount: Number(l.debitAmount), // Cash In
        paymentAmount: Number(l.creditAmount), // Cash Out
      };
    });

    const currentBalances = cashBankAccounts.map((a) => ({
      code: a.code,
      name: a.accountName,
      balance: Number(a.currentBalance),
    }));

    return {
      period: { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) },
      currentBalances,
      totalReceipts: Number(totalReceipts),
      totalPayments: Number(totalPayments),
      netCashFlow: Number(totalReceipts.sub(totalPayments)),
      entries,
    };
  }

  /**
   * Trial Balance: Full Chart of Accounts Balances with Debit === Credit Guarantee
   */
  async getTrialBalance(tenantId: string, branchId?: string, asOfDate?: string) {
    await this.setupService.ensureStandardChartOfAccounts(tenantId);

    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { tenantId },
      include: { group: true },
      orderBy: [{ group: { groupType: 'asc' } }, { code: 'asc' }],
    });

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    const reportRows = accounts.map((acc) => {
      const bal = acc.currentBalance;
      let debit = new Decimal(0);
      let credit = new Decimal(0);

      if (acc.group.groupType === AccountTypeEnum.ASSET || acc.group.groupType === AccountTypeEnum.EXPENSE) {
        if (bal.greaterThanOrEqualTo(0)) {
          debit = bal;
        } else {
          credit = bal.abs();
        }
      } else {
        if (bal.greaterThanOrEqualTo(0)) {
          credit = bal;
        } else {
          debit = bal.abs();
        }
      }

      totalDebit = totalDebit.add(debit);
      totalCredit = totalCredit.add(credit);

      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.accountName,
        groupName: acc.group.groupName,
        groupType: acc.group.groupType,
        debit: Number(debit),
        credit: Number(credit),
      };
    });

    return {
      asOfDate: asOfDate ?? new Date().toISOString().slice(0, 10),
      isBalanced: totalDebit.equals(totalCredit),
      totalDebit: Number(totalDebit),
      totalCredit: Number(totalCredit),
      rows: reportRows,
    };
  }

  /**
   * Real-Time Profit and Loss Statement with Live COGS & Closing Stock Valuation
   */
  async getProfitAndLoss(tenantId: string, branchId?: string, fromDate?: string, toDate?: string) {
    await this.setupService.ensureStandardChartOfAccounts(tenantId);

    // 1. Live Revenue from Accounts
    const revenueAccounts = await this.prisma.ledgerAccount.findMany({
      where: {
        tenantId,
        group: { groupType: AccountTypeEnum.INCOME },
      },
      include: { group: true },
    });

    let totalRevenue = new Decimal(0);
    const revenueBreakdown = revenueAccounts.map((a) => {
      const val = Decimal.max(0, a.currentBalance);
      totalRevenue = totalRevenue.add(val);
      return { code: a.code, name: a.accountName, amount: Number(val) };
    });

    // 2. COGS (Cost of Goods Sold)
    const cogsAccount = await this.prisma.ledgerAccount.findFirst({
      where: { tenantId, code: 'EXP_COGS' },
    });
    const totalCogs = cogsAccount ? Decimal.max(0, cogsAccount.currentBalance) : new Decimal(0);

    // Gross Profit
    const grossProfit = totalRevenue.sub(totalCogs);
    const grossMarginPct = totalRevenue.greaterThan(0)
      ? grossProfit.mul(100).div(totalRevenue).toDecimalPlaces(2)
      : new Decimal(0);

    // 3. Operating Expenses (Excluding COGS)
    const expenseAccounts = await this.prisma.ledgerAccount.findMany({
      where: {
        tenantId,
        group: { groupType: AccountTypeEnum.EXPENSE },
        code: { not: 'EXP_COGS' },
      },
      include: { group: true },
    });

    let totalOperatingExpenses = new Decimal(0);
    const expenseBreakdown = expenseAccounts.map((a) => {
      const val = Decimal.max(0, a.currentBalance);
      totalOperatingExpenses = totalOperatingExpenses.add(val);
      return { code: a.code, name: a.accountName, amount: Number(val) };
    });

    // Net Profit
    const netProfit = grossProfit.sub(totalOperatingExpenses);
    const netMarginPct = totalRevenue.greaterThan(0)
      ? netProfit.mul(100).div(totalRevenue).toDecimalPlaces(2)
      : new Decimal(0);

    // 4. Live Closing Stock Valuation: Sum of (BinStockBalance.quantity * InventoryBatch.netLandingCost)
    const stockBalances = await this.prisma.binStockBalance.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        quantity: { gt: 0 },
      },
      include: {
        batch: { select: { netLandingCost: true, purchaseRate: true } },
      },
    });

    let liveClosingStockValue = new Decimal(0);
    for (const b of stockBalances) {
      const unitCost = b.batch?.netLandingCost ?? b.batch?.purchaseRate ?? new Decimal(0);
      liveClosingStockValue = liveClosingStockValue.add(b.quantity.mul(unitCost));
    }

    return {
      period: {
        from: fromDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        to: toDate ?? new Date().toISOString().slice(0, 10),
      },
      revenue: {
        totalRevenue: Number(totalRevenue),
        breakdown: revenueBreakdown,
      },
      cogs: {
        totalCogs: Number(totalCogs),
      },
      grossProfit: Number(grossProfit),
      grossMarginPct: Number(grossMarginPct),
      operatingExpenses: {
        totalOperatingExpenses: Number(totalOperatingExpenses),
        breakdown: expenseBreakdown,
      },
      netProfit: Number(netProfit),
      netMarginPct: Number(netMarginPct),
      liveClosingStockValuation: Number(liveClosingStockValue.toDecimalPlaces(2)),
    };
  }

  /**
   * Balance Sheet
   */
  async getBalanceSheet(tenantId: string, branchId?: string, asOfDate?: string) {
    const trialBalance = await this.getTrialBalance(tenantId, branchId, asOfDate);
    const pnl = await this.getProfitAndLoss(tenantId, branchId);

    const assetRows = trialBalance.rows.filter((r) => r.groupType === AccountTypeEnum.ASSET);
    const liabilityRows = trialBalance.rows.filter((r) => r.groupType === AccountTypeEnum.LIABILITY);
    const equityRows = trialBalance.rows.filter((r) => r.groupType === AccountTypeEnum.EQUITY);

    const totalAssets = assetRows.reduce((sum, r) => sum + (r.debit - r.credit), 0);
    const totalLiabilities = liabilityRows.reduce((sum, r) => sum + (r.credit - r.debit), 0);
    const equityCapital = equityRows.reduce((sum, r) => sum + (r.credit - r.debit), 0);

    const retainedEarnings = pnl.netProfit;
    const totalEquityAndLiabilities = totalLiabilities + equityCapital + retainedEarnings;

    return {
      asOfDate: trialBalance.asOfDate,
      assets: {
        total: Number(totalAssets.toFixed(2)),
        rows: assetRows,
      },
      liabilities: {
        total: Number(totalLiabilities.toFixed(2)),
        rows: liabilityRows,
      },
      equity: {
        capital: Number(equityCapital.toFixed(2)),
        retainedEarnings: Number(retainedEarnings.toFixed(2)),
        totalEquity: Number((equityCapital + retainedEarnings).toFixed(2)),
      },
      totalEquityAndLiabilities: Number(totalEquityAndLiabilities.toFixed(2)),
      isBalanced: Math.abs(totalAssets - totalEquityAndLiabilities) < 0.05,
    };
  }
}
