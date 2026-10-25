import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Decimal,
  ShiftStatusEnum,
  PaymentMethodEnum,
  StaffKhataTxnTypeEnum,
  AuditExceptionTypeEnum,
} from '@ti-erp/database';
import { OpenShiftDto, SafeDropDto, BlindCloseDto } from './shift.dto';

@Injectable()
export class PosShiftService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Open Cashier Shift & Lock Register
   */
  async openShift(dto: OpenShiftDto) {
    const terminal = await this.prisma.posTerminal.findUnique({
      where: { id: dto.terminalId },
    });
    if (!terminal || !terminal.isActive) {
      throw new NotFoundException(`Terminal ${dto.terminalId} not found or inactive`);
    }

    // Check if terminal already has an active OPEN shift
    const existingOpenShift = await this.prisma.cashierShift.findFirst({
      where: {
        terminalId: dto.terminalId,
        status: ShiftStatusEnum.OPEN,
      },
      include: { cashier: true },
    });

    if (existingOpenShift) {
      throw new BadRequestException(
        `Terminal ${terminal.terminalCode} is currently locked by cashier ${existingOpenShift.cashier.fullName} (Shift #${existingOpenShift.shiftNumber}). Must blind-close previous shift first.`,
      );
    }

    // Determine next shift number for this terminal
    const lastShift = await this.prisma.cashierShift.findFirst({
      where: { terminalId: dto.terminalId },
      orderBy: { shiftNumber: 'desc' },
    });
    const nextShiftNumber = (lastShift?.shiftNumber ?? 0) + 1;

    return this.prisma.cashierShift.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        terminalId: dto.terminalId,
        cashierId: dto.cashierId,
        shiftNumber: nextShiftNumber,
        status: ShiftStatusEnum.OPEN,
        openingFloat: new Decimal(dto.openingFloat),
        midDaySafeDrops: new Decimal(0),
        blindCloseEnabled: dto.blindCloseEnabled ?? true,
      },
      include: {
        terminal: true,
        cashier: true,
        branch: true,
      },
    });
  }

  /**
   * Record Mid-Day Safe Drop (Cash Handover to Safe)
   */
  async recordSafeDrop(shiftId: string, dto: SafeDropDto) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: { terminal: true, cashier: true },
    });
    if (!shift || shift.status !== ShiftStatusEnum.OPEN) {
      throw new BadRequestException(`Shift ${shiftId} is not in OPEN status`);
    }

    const dropAmount = new Decimal(dto.amount);
    if (dropAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Safe drop amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedShift = await tx.cashierShift.update({
        where: { id: shiftId },
        data: {
          midDaySafeDrops: shift.midDaySafeDrops.add(dropAmount),
        },
      });

      // Audit log for safe drop
      await tx.auditExceptionLog.create({
        data: {
          tenantId: shift.tenantId,
          branchId: shift.branchId,
          terminalId: shift.terminalId,
          cashierId: shift.cashierId,
          supervisorId: dto.supervisorId,
          exceptionType: AuditExceptionTypeEnum.NO_SALE_DRAWER_KICK,
          referenceEntity: 'CashierShift',
          referenceId: shift.id,
          reason: `Mid-Day Cash Safe Drop: ₹${dropAmount.toFixed(2)} [${dto.notes ?? 'Standard handover'}]`,
          metadata: { dropAmount: Number(dropAmount), newTotalSafeDrops: Number(updatedShift.midDaySafeDrops) },
        },
      });

      return updatedShift;
    });
  }

  /**
   * X-Report (Mid-Shift Snapshot)
   */
  async getXReport(shiftId: string) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        terminal: true,
        cashier: true,
        branch: { include: { tenant: true } },
      },
    });
    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);

    const invoices = await this.prisma.posInvoice.findMany({
      where: { shiftId, cancelledAt: null },
      include: { payments: true, lines: true },
    });

    let totalSalesGross = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let totalNetPayable = new Decimal(0);
    let totalCashSales = new Decimal(0);
    let totalUpiSales = new Decimal(0);
    let totalCardSales = new Decimal(0);
    let totalOtherSales = new Decimal(0);

    for (const inv of invoices) {
      if (!inv.isReturnBill) {
        totalSalesGross = totalSalesGross.add(inv.totalGrossAmount);
        totalDiscount = totalDiscount.add(inv.totalDiscountAmount);
        totalNetPayable = totalNetPayable.add(inv.netPayable);

        for (const p of inv.payments) {
          if (p.method === PaymentMethodEnum.CASH) {
            totalCashSales = totalCashSales.add(p.amount);
          } else if (p.method === PaymentMethodEnum.UPI) {
            totalUpiSales = totalUpiSales.add(p.amount);
          } else if (p.method === PaymentMethodEnum.CARD) {
            totalCardSales = totalCardSales.add(p.amount);
          } else {
            totalOtherSales = totalOtherSales.add(p.amount);
          }
        }
      }
    }

    const estimatedDrawerCash = shift.openingFloat
      .add(totalCashSales)
      .sub(shift.midDaySafeDrops);

    return {
      reportType: 'X-REPORT',
      timestamp: new Date(),
      shiftNumber: shift.shiftNumber,
      terminalCode: shift.terminal.terminalCode,
      cashierName: shift.cashier.fullName,
      openingFloat: Number(shift.openingFloat),
      midDaySafeDrops: Number(shift.midDaySafeDrops),
      totalBills: invoices.length,
      totalSalesGross: Number(totalSalesGross),
      totalDiscount: Number(totalDiscount),
      totalNetSales: Number(totalNetPayable),
      paymentBreakdown: {
        cash: Number(totalCashSales),
        upi: Number(totalUpiSales),
        card: Number(totalCardSales),
        other: Number(totalOtherSales),
      },
      currentDrawerCashEstimate: Number(estimatedDrawerCash),
    };
  }

  /**
   * Cashier Blind Close & Comprehensive Z-Report Generation
   */
  async blindCloseShift(shiftId: string, dto: BlindCloseDto) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        terminal: true,
        cashier: true,
        branch: { include: { tenant: true } },
      },
    });
    if (!shift || shift.status !== ShiftStatusEnum.OPEN) {
      throw new BadRequestException(`Shift ${shiftId} is not in OPEN status`);
    }

    // 1. Calculate Physical Cash Total from Denominations
    // { "500": 20, "200": 10, "100": 15, "50": 8, "20": 5, "10": 10, "coins": 45 }
    let physicalCashTotal = new Decimal(0);
    const denoms = dto.denominations || {};

    const multipliers: Record<string, number> = {
      '2000': 2000,
      '500': 500,
      '200': 200,
      '100': 100,
      '50': 50,
      '20': 20,
      '10': 10,
      '5': 5,
      '2': 2,
      '1': 1,
      coins: 1,
    };

    for (const [key, count] of Object.entries(denoms)) {
      const mult = multipliers[key] ?? 0;
      if (mult > 0 && typeof count === 'number' && count > 0) {
        physicalCashTotal = physicalCashTotal.add(new Decimal(count).mul(mult));
      }
    }

    // 2. Compute Expected Cash from System Sales & Refunds
    const invoices = await this.prisma.posInvoice.findMany({
      where: { shiftId },
      include: {
        payments: true,
        lines: { include: { product: true, hsn: true } },
      },
    });

    let totalCashSales = new Decimal(0);
    let totalCashRefunds = new Decimal(0);
    let totalUpi = new Decimal(0);
    let totalCard = new Decimal(0);
    let totalSodexo = new Decimal(0);
    let totalCreditNote = new Decimal(0);
    let totalKhata = new Decimal(0);
    let totalLoyalty = new Decimal(0);

    let grossSales = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let netSales = new Decimal(0);
    let totalCostOfGoodsSold = new Decimal(0);
    let cancelledBillsCount = 0;

    // GST Slabs aggregation (0%, 5%, 12%, 18%, 28%)
    const gstSlabs: Record<string, { taxable: Decimal; tax: Decimal }> = {
      '0': { taxable: new Decimal(0), tax: new Decimal(0) },
      '5': { taxable: new Decimal(0), tax: new Decimal(0) },
      '12': { taxable: new Decimal(0), tax: new Decimal(0) },
      '18': { taxable: new Decimal(0), tax: new Decimal(0) },
      '28': { taxable: new Decimal(0), tax: new Decimal(0) },
    };

    for (const inv of invoices) {
      if (inv.cancelledAt) {
        cancelledBillsCount++;
        continue;
      }

      if (inv.isReturnBill) {
        // Sales Return / Refund Bill
        for (const p of inv.payments) {
          if (p.method === PaymentMethodEnum.CASH) {
            totalCashRefunds = totalCashRefunds.add(p.amount);
          }
        }
      } else {
        // Normal Sales Bill
        grossSales = grossSales.add(inv.totalGrossAmount);
        totalDiscount = totalDiscount.add(inv.totalDiscountAmount);
        netSales = netSales.add(inv.netPayable);

        for (const p of inv.payments) {
          if (p.method === PaymentMethodEnum.CASH) totalCashSales = totalCashSales.add(p.amount);
          else if (p.method === PaymentMethodEnum.UPI) totalUpi = totalUpi.add(p.amount);
          else if (p.method === PaymentMethodEnum.CARD) totalCard = totalCard.add(p.amount);
          else if (p.method === PaymentMethodEnum.SODEXO) totalSodexo = totalSodexo.add(p.amount);
          else if (p.method === PaymentMethodEnum.CREDIT_NOTE_SLIP) totalCreditNote = totalCreditNote.add(p.amount);
          else if (p.method === PaymentMethodEnum.CUSTOMER_KHATA) totalKhata = totalKhata.add(p.amount);
          else if (p.method === PaymentMethodEnum.LOYALTY_POINTS) totalLoyalty = totalLoyalty.add(p.amount);
        }

        // COGS and GST Slabs
        for (const line of inv.lines) {
          totalCostOfGoodsSold = totalCostOfGoodsSold.add(
            line.quantity.mul(line.netLandingCostSnapshot),
          );

          const igstRate = line.hsn?.igstRate ? line.hsn.igstRate.toString() : '0';
          const slabKey = gstSlabs[igstRate] ? igstRate : '0';
          const lineTax = line.cgstAmount.add(line.sgstAmount).add(line.igstAmount).add(line.cessAmount);

          gstSlabs[slabKey].taxable = gstSlabs[slabKey].taxable.add(line.taxableAmount);
          gstSlabs[slabKey].tax = gstSlabs[slabKey].tax.add(lineTax);
        }
      }
    }

    // Expected Drawer Cash Formula
    // Expected = Opening Float + Total Cash Sales - Total Cash Refunds - Mid-Day Safe Drops
    const expectedCashSystem = shift.openingFloat
      .add(totalCashSales)
      .sub(totalCashRefunds)
      .sub(shift.midDaySafeDrops)
      .toDecimalPlaces(2);

    // Shortage or Excess = Physical Cash Counted - Expected Cash System
    const shortageOrExcess = physicalCashTotal.sub(expectedCashSystem).toDecimalPlaces(2);

    // Gross Margin = Net Sales - COGS
    const grossProfit = netSales.sub(totalCostOfGoodsSold);
    const grossMarginPct = netSales.greaterThan(0)
      ? grossProfit.div(netSales).mul(100).toDecimalPlaces(2)
      : new Decimal(0);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const zReportNumber = `Z-${dateStr}-${shift.terminal.terminalCode}-S${shift.shiftNumber}`;

    const zReportSummary = {
      zReportNumber,
      shiftId: shift.id,
      shiftNumber: shift.shiftNumber,
      terminalCode: shift.terminal.terminalCode,
      cashierId: shift.cashier.id,
      cashierName: shift.cashier.fullName,
      startTime: shift.startTime,
      endTime: new Date(),
      openingFloat: Number(shift.openingFloat),
      midDaySafeDrops: Number(shift.midDaySafeDrops),
      physicalCashCounted: Number(physicalCashTotal),
      expectedCashSystem: Number(expectedCashSystem),
      shortageOrExcess: Number(shortageOrExcess),
      isShortage: shortageOrExcess.lessThan(0),
      isExcess: shortageOrExcess.greaterThan(0),
      salesSummary: {
        totalBillsCount: invoices.filter((i) => !i.cancelledAt && !i.isReturnBill).length,
        totalReturnBillsCount: invoices.filter((i) => i.isReturnBill).length,
        cancelledBillsCount,
        grossSales: Number(grossSales),
        totalDiscount: Number(totalDiscount),
        netSales: Number(netSales),
        cogs: Number(totalCostOfGoodsSold),
        grossProfit: Number(grossProfit),
        grossMarginPct: Number(grossMarginPct),
      },
      tendersBreakdown: {
        cash: Number(totalCashSales),
        cashRefunds: Number(totalCashRefunds),
        netCashReceived: Number(totalCashSales.sub(totalCashRefunds)),
        upi: Number(totalUpi),
        card: Number(totalCard),
        sodexo: Number(totalSodexo),
        creditNote: Number(totalCreditNote),
        customerKhata: Number(totalKhata),
        loyaltyPoints: Number(totalLoyalty),
      },
      gstBreakup: Object.entries(gstSlabs).map(([slab, data]) => ({
        slabPct: Number(slab),
        taxableAmount: Number(data.taxable.toDecimalPlaces(2)),
        taxAmount: Number(data.tax.toDecimalPlaces(2)),
      })),
      denominationCounts: denoms,
    };

    return this.prisma.$transaction(async (tx) => {
      // If shortage detected (shortageOrExcess < 0), auto-debit to cashier's staff advance ledger
      if (shortageOrExcess.lessThan(0)) {
        const shortageAbs = shortageOrExcess.abs();
        await tx.staffAdvanceAndGroceryKhata.create({
          data: {
            tenantId: shift.tenantId,
            branchId: shift.branchId,
            userId: shift.cashierId,
            txnType: StaffKhataTxnTypeEnum.SALARY_ADVANCE,
            amount: shortageAbs,
            approvedByUserId: dto.supervisorApprovedId,
            notes: `Auto Cashier Shortage Debit: Z-Report ${zReportNumber} (-₹${shortageAbs.toFixed(2)})`,
          },
        });

        // Audit exception log
        await tx.auditExceptionLog.create({
          data: {
            tenantId: shift.tenantId,
            branchId: shift.branchId,
            terminalId: shift.terminalId,
            cashierId: shift.cashierId,
            supervisorId: dto.supervisorApprovedId,
            exceptionType: AuditExceptionTypeEnum.NEGATIVE_STOCK_OVERRIDE, // Cash drawer discrepancy
            referenceEntity: 'CashierShift',
            referenceId: shift.id,
            reason: `Cashier Shortage of ₹${shortageAbs.toFixed(2)} detected in Blind Close. Auto-debited to staff payroll advance.`,
            metadata: {
              shortageAmount: Number(shortageAbs),
              physical: Number(physicalCashTotal),
              expected: Number(expectedCashSystem),
            },
          },
        });
      }

      // Close the shift
      return tx.cashierShift.update({
        where: { id: shiftId },
        data: {
          status: ShiftStatusEnum.CLOSED,
          endTime: new Date(),
          physicalCashCounted: physicalCashTotal,
          expectedCashSystem,
          denominationBreakdown: JSON.parse(JSON.stringify(denoms)),
          shortageOrExcessAmount: shortageOrExcess,
          shortageApprovedBySupervisorId: dto.supervisorApprovedId,
          zReportNumber,
          zReportSummary: JSON.parse(JSON.stringify(zReportSummary)),
        },
        include: {
          terminal: true,
          cashier: true,
        },
      });
    });
  }

  async getShiftById(shiftId: string) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        terminal: true,
        cashier: true,
        invoices: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
    return shift;
  }
}
