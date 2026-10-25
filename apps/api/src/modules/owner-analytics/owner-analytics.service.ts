import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@ti-erp/database';

@Injectable()
export class OwnerAnalyticsService {
  private readonly logger = new Logger(OwnerAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Real-time supermarket KPIs for the Owner Mobile Command Center
   */
  async getLiveDashboard(tenantId: string, branchId?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const branchFilter: Prisma.PosInvoiceWhereInput = {
      tenantId,
      ...(branchId ? { branchId } : {}),
      createdAt: { gte: todayStart, lte: todayEnd },
    };

    // 1. Invoices & Revenue
    const completedInvoices = await this.prisma.posInvoice.findMany({
      where: {
        ...branchFilter,
        cancelledAt: null,
      },
      include: {
        lines: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    let totalRevenue = new Prisma.Decimal(0);
    let totalTaxable = new Prisma.Decimal(0);
    let totalCogs = new Prisma.Decimal(0);
    const invoiceIds: string[] = [];

    for (const inv of completedInvoices) {
      invoiceIds.push(inv.id);
      totalRevenue = totalRevenue.add(inv.netPayable);
      totalTaxable = totalTaxable.add(inv.taxableAmount);

      for (const line of inv.lines) {
        const lineCost = line.quantity.mul(line.netLandingCostSnapshot);
        totalCogs = totalCogs.add(lineCost);
      }
    }

    const billCount = completedInvoices.length;
    const avgBasketValue = billCount > 0
      ? totalRevenue.div(billCount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0);

    const grossProfitAmount = totalTaxable.sub(totalCogs).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const grossProfitPct = totalTaxable.greaterThan(0)
      ? grossProfitAmount.div(totalTaxable).mul(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0);

    // 2. Tender Split Breakup
    const paymentSplits = invoiceIds.length > 0
      ? await this.prisma.posPaymentSplit.findMany({
          where: { invoiceId: { in: invoiceIds } },
        })
      : [];

    const tenderSplitMap: Record<string, Prisma.Decimal> = {
      CASH: new Prisma.Decimal(0),
      UPI: new Prisma.Decimal(0),
      CARD: new Prisma.Decimal(0),
      SODEXO: new Prisma.Decimal(0),
      CREDIT_NOTE_SLIP: new Prisma.Decimal(0),
      LOYALTY_POINTS: new Prisma.Decimal(0),
      CUSTOMER_KHATA: new Prisma.Decimal(0),
      GIFT_CARD: new Prisma.Decimal(0),
    };

    for (const p of paymentSplits) {
      const method = p.method as string;
      if (tenderSplitMap[method] !== undefined) {
        tenderSplitMap[method] = tenderSplitMap[method].add(p.amount);
      } else {
        tenderSplitMap[method] = p.amount;
      }
    }

    const tenderSplits = Object.entries(tenderSplitMap).map(([method, amount]) => ({
      method,
      amount: amount.toNumber(),
      pct: totalRevenue.greaterThan(0)
        ? amount.div(totalRevenue).mul(100).toDecimalPlaces(1, Prisma.Decimal.ROUND_HALF_UP).toNumber()
        : 0,
    }));

    // 3. Live Counter Status
    const shiftFilter: Prisma.CashierShiftWhereInput = {
      tenantId,
      ...(branchId ? { branchId } : {}),
      status: 'OPEN',
    };

    const openShifts = await this.prisma.cashierShift.findMany({
      where: shiftFilter,
      include: {
        terminal: { select: { id: true, terminalCode: true } },
        cashier: { select: { id: true, fullName: true, username: true } },
        invoices: {
          where: { cancelledAt: null },
          select: {
            id: true,
            payments: {
              where: { method: 'CASH' },
              select: { amount: true },
            },
          },
        },
      },
    });

    const liveCounters = openShifts.map((shift) => {
      let shiftCashSales = new Prisma.Decimal(0);
      for (const inv of shift.invoices) {
        for (const pay of inv.payments) {
          shiftCashSales = shiftCashSales.add(pay.amount);
        }
      }
      const estimatedCashInDrawer = shift.openingFloat
        .add(shiftCashSales)
        .sub(shift.midDaySafeDrops);

      return {
        shiftId: shift.id,
        shiftNumber: shift.shiftNumber,
        terminalCode: shift.terminal.terminalCode,
        terminalName: shift.terminal.terminalCode,
        cashierName: shift.cashier.fullName,
        startTime: shift.startTime,
        openingFloat: shift.openingFloat.toNumber(),
        safeDrops: shift.midDaySafeDrops.toNumber(),
        cashSales: shiftCashSales.toNumber(),
        estimatedCashInDrawer: estimatedCashInDrawer.toNumber(),
        status: shift.status,
      };
    });

    // 4. Top 20 Selling SKUs & Categories Today
    const lineAggregates = new Map<string, { qty: Prisma.Decimal; total: Prisma.Decimal }>();
    for (const inv of completedInvoices) {
      for (const line of inv.lines) {
        const existing = lineAggregates.get(line.productId) ?? {
          qty: new Prisma.Decimal(0),
          total: new Prisma.Decimal(0),
        };
        existing.qty = existing.qty.add(line.quantity);
        existing.total = existing.total.add(line.lineTotal);
        lineAggregates.set(line.productId, existing);
      }
    }

    const sortedProductIds = Array.from(lineAggregates.entries())
      .sort((a, b) => (b[1].total.greaterThan(a[1].total) ? 1 : -1))
      .slice(0, 20);

    const productDetails = sortedProductIds.length > 0
      ? await this.prisma.product.findMany({
          where: { id: { in: sortedProductIds.map((item) => item[0]) } },
          include: { category: { select: { name: true } } },
        })
      : [];

    const productMap = new Map(productDetails.map((p) => [p.id, p]));

    const topSellingSkus = sortedProductIds.map(([pId, agg]) => {
      const prod = productMap.get(pId);
      return {
        productId: pId,
        productName: prod?.nameEn ?? 'Unknown Product',
        skuCode: prod?.skuCode ?? 'N/A',
        category: prod?.category?.name ?? 'General',
        quantitySold: agg.qty.toNumber(),
        revenueTotal: agg.total.toNumber(),
      };
    });

    // 5. Security & Shrinkage Alerts
    const auditLogs = await this.prisma.auditExceptionLog.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        timestamp: { gte: todayStart, lte: todayEnd },
      },
      include: {
        cashier: { select: { fullName: true, username: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    const cancelledBills = await this.prisma.posInvoice.findMany({
      where: {
        ...branchFilter,
        cancelledAt: { not: null },
      },
      select: {
        id: true,
        invoiceNumber: true,
        netPayable: true,
        cancelReason: true,
        cancelledAt: true,
      },
    });

    const voidCount = auditLogs.filter((l) => l.exceptionType === 'LINE_VOID').length;
    const cartCancelCount = auditLogs.filter((l) => l.exceptionType === 'CART_CANCEL').length;
    const priceOverrideCount = auditLogs.filter((l) => l.exceptionType === 'MANUAL_PRICE_OVERRIDE').length;
    const drawerKickCount = auditLogs.filter((l) => l.exceptionType === 'NO_SALE_DRAWER_KICK').length;
    const negativeStockCount = auditLogs.filter((l) => l.exceptionType === 'NEGATIVE_STOCK_OVERRIDE').length;

    let cancelledBillsTotal = new Prisma.Decimal(0);
    for (const cb of cancelledBills) {
      cancelledBillsTotal = cancelledBillsTotal.add(cb.netPayable);
    }

    return {
      timestamp: new Date().toISOString(),
      tenantId,
      branchId: branchId ?? 'ALL_BRANCHES',
      kpis: {
        todayRevenue: totalRevenue.toNumber(),
        todayTaxableSales: totalTaxable.toNumber(),
        todayBillCount: billCount,
        averageBasketValue: avgBasketValue.toNumber(),
        grossProfitAmount: grossProfitAmount.toNumber(),
        grossProfitPct: grossProfitPct.toNumber(),
      },
      tenderSplits,
      liveCounters,
      topSellingSkus,
      securityAlerts: {
        voidCount,
        cartCancelCount,
        priceOverrideCount,
        drawerKickCount,
        negativeStockCount,
        cancelledBillsCount: cancelledBills.length,
        cancelledBillsTotal: cancelledBillsTotal.toNumber(),
        recentAlertLogs: auditLogs.slice(0, 10).map((l) => ({
          id: l.id,
          type: l.exceptionType,
          cashier: l.cashier?.fullName ?? 'System',
          reason: l.reason,
          timestamp: l.timestamp,
        })),
        recentCancelledBills: cancelledBills.slice(0, 5),
      },
    };
  }

  /**
   * Compiles the 1-Page Executive Daily Closing Report formatted for instant WhatsApp dispatch at 10:30 PM
   */
  async generateNightlyClosingReport(tenantId: string, branchId?: string, targetDateStr?: string) {
    const reportDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const dayStart = new Date(reportDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(reportDate);
    dayEnd.setHours(23, 59, 59, 999);

    const branch = branchId
      ? await this.prisma.branch.findUnique({
          where: { id: branchId },
          select: { name: true, code: true },
        })
      : null;

    const branchName = branch ? `${branch.name} (${branch.code})` : 'All Branches (Consolidated)';

    // 1. Sales & Profit
    const invoices = await this.prisma.posInvoice.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        createdAt: { gte: dayStart, lte: dayEnd },
        cancelledAt: null,
      },
      include: { lines: true },
    });

    let totalRevenue = new Prisma.Decimal(0);
    let totalTaxable = new Prisma.Decimal(0);
    let totalCogs = new Prisma.Decimal(0);
    const invIds: string[] = [];

    for (const inv of invoices) {
      invIds.push(inv.id);
      totalRevenue = totalRevenue.add(inv.netPayable);
      totalTaxable = totalTaxable.add(inv.taxableAmount);
      for (const line of inv.lines) {
        totalCogs = totalCogs.add(line.quantity.mul(line.netLandingCostSnapshot));
      }
    }

    const billCount = invoices.length;
    const avgBasket = billCount > 0
      ? totalRevenue.div(billCount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0);
    const grossProfit = totalTaxable.sub(totalCogs).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const grossProfitPct = totalTaxable.greaterThan(0)
      ? grossProfit.div(totalTaxable).mul(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0);

    // 2. Safe Drops & Cashier Shortages
    const shiftsToday = await this.prisma.cashierShift.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        startTime: { gte: dayStart, lte: dayEnd },
      },
    });

    let safeDropsTotal = new Prisma.Decimal(0);
    let cashierShortageTotal = new Prisma.Decimal(0);
    let shortageCounterCount = 0;

    for (const s of shiftsToday) {
      safeDropsTotal = safeDropsTotal.add(s.midDaySafeDrops);
      if (s.shortageOrExcessAmount && s.shortageOrExcessAmount.lessThan(0)) {
        cashierShortageTotal = cashierShortageTotal.add(s.shortageOrExcessAmount.abs());
        shortageCounterCount += 1;
      }
    }

    // 3. UPI Pending Bank Settlement
    const pendingUpiPayments = invIds.length > 0
      ? await this.prisma.posPaymentSplit.findMany({
          where: {
            invoiceId: { in: invIds },
            method: 'UPI',
            bankSettlementStatus: 'PENDING',
          },
        })
      : [];

    let upiPendingTotal = new Prisma.Decimal(0);
    for (const u of pendingUpiPayments) {
      upiPendingTotal = upiPendingTotal.add(u.amount);
    }

    // 4. Goods Receipt Notes (Procurement today)
    const grnsToday = await this.prisma.goodsReceiptNote.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });

    let grnTotal = new Prisma.Decimal(0);
    for (const g of grnsToday) {
      grnTotal = grnTotal.add(g.netPayable);
    }

    // 5. Stock-outs and Near-Expiry
    const nearExpiryCutoff = new Date(reportDate.getTime() + 45 * 24 * 60 * 60 * 1000);
    const nearExpiryBatches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        expiryDate: { lte: nearExpiryCutoff, gte: reportDate },
      },
      include: {
        stockBalances: true,
      },
    });

    let nearExpiryValue = new Prisma.Decimal(0);
    for (const b of nearExpiryBatches) {
      let batchStockQty = new Prisma.Decimal(0);
      for (const sb of b.stockBalances) {
        batchStockQty = batchStockQty.add(sb.quantity);
      }
      nearExpiryValue = nearExpiryValue.add(batchStockQty.mul(b.netLandingCost));
    }

    const stockOutsCount = await this.prisma.binStockBalance.count({
      where: {
        batch: { tenantId, ...(branchId ? { branchId } : {}) },
        quantity: { lte: 0 },
      },
    });

    // 6. Security & Audit Exceptions
    const auditLogs = await this.prisma.auditExceptionLog.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        timestamp: { gte: dayStart, lte: dayEnd },
      },
    });

    const voidCount = auditLogs.filter((l) => l.exceptionType === 'LINE_VOID' || l.exceptionType === 'CART_CANCEL').length;
    const overrideCount = auditLogs.filter((l) => l.exceptionType === 'MANUAL_PRICE_OVERRIDE').length;
    const drawerKickCount = auditLogs.filter((l) => l.exceptionType === 'NO_SALE_DRAWER_KICK').length;

    // Format WhatsApp summary
    const formattedDate = reportDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const whatsappMessage = [
      `📊 *TI-ERP SUPERMARKET 10:30 PM CLOSING REPORT*`,
      `📅 *Date:* ${formattedDate} | *Store:* ${branchName}`,
      ``,
      `💰 *FINANCIAL PERFORMANCE*`,
      `• *Total Sales:* ₹${totalRevenue.toFixed(2)} (${billCount} Bills)`,
      `• *Avg Basket Size:* ₹${avgBasket.toFixed(2)}`,
      `• *Gross Profit:* ₹${grossProfit.toFixed(2)} (${grossProfitPct.toFixed(1)}%)`,
      ``,
      `💵 *CASH & SETTLEMENTS*`,
      `• *Mid-Day Safe Drops:* ₹${safeDropsTotal.toFixed(2)}`,
      `• *UPI Pending Settlement:* ₹${upiPendingTotal.toFixed(2)} (${pendingUpiPayments.length} txns)`,
      `• *Cashier Shortages:* ₹${cashierShortageTotal.toFixed(2)} (${shortageCounterCount} counters)`,
      ``,
      `📦 *PROCUREMENT & INVENTORY*`,
      `• *Inward GRNs Today:* ${grnsToday.length} Invoices (₹${grnTotal.toFixed(2)})`,
      `• *Stock-Out Alerts:* ${stockOutsCount} SKUs`,
      `• *Near-Expiry Stock (<45d):* ₹${nearExpiryValue.toFixed(2)} (${nearExpiryBatches.length} Batches)`,
      ``,
      `🚨 *STORE SECURITY AUDIT*`,
      `• *Bill / Line Voids:* ${voidCount}`,
      `• *Price Overrides:* ${overrideCount}`,
      `• *No-Sale Drawer Kicks:* ${drawerKickCount}`,
      ``,
      `✅ _Generated automatically by TI-ERP Owner Command Center_`,
    ].join('\n');

    return {
      success: true,
      reportDate: reportDate.toISOString(),
      storeName: branchName,
      whatsappFormattedMessage: whatsappMessage,
      summary: {
        totalRevenue: totalRevenue.toNumber(),
        totalTaxable: totalTaxable.toNumber(),
        billCount,
        avgBasket: avgBasket.toNumber(),
        grossProfit: grossProfit.toNumber(),
        grossProfitPct: grossProfitPct.toNumber(),
        safeDropsTotal: safeDropsTotal.toNumber(),
        upiPendingTotal: upiPendingTotal.toNumber(),
        cashierShortageTotal: cashierShortageTotal.toNumber(),
        grnCount: grnsToday.length,
        grnTotal: grnTotal.toNumber(),
        stockOutsCount,
        nearExpiryValue: nearExpiryValue.toNumber(),
        voidCount,
        overrideCount,
        drawerKickCount,
      },
    };
  }
}
