import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordStaffKhataDto } from './hr.dto';
import { Decimal, StaffKhataTxnTypeEnum } from '@ti-erp/database';

@Injectable()
export class StaffKhataAndCommissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record Mid-Month Salary Advance or Staff Grocery Purchase
   */
  async recordStaffKhata(dto: RecordStaffKhataDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

    const amount = new Decimal(dto.amount).toDecimalPlaces(2);

    const record = await this.prisma.staffAdvanceAndGroceryKhata.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        userId: dto.userId,
        txnType: dto.txnType,
        amount,
        invoiceId: dto.invoiceId,
        approvedByUserId: dto.approvedByUserId,
        notes: dto.notes,
      },
    });

    return {
      success: true,
      id: record.id,
      userId: record.userId,
      txnType: record.txnType,
      amount: Number(record.amount),
      createdAt: record.createdAt,
    };
  }

  /**
   * Get Staff Khata Advance & Grocery History
   */
  async getStaffKhataHistory(userId: string, monthYear?: string) {
    const whereClause: any = { userId };

    if (monthYear) {
      const [y, m] = monthYear.split('-').map((v) => parseInt(v, 10));
      const start = new Date(y, m - 1, 1, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59);
      whereClause.createdAt = { gte: start, lte: end };
    }

    const records = await this.prisma.staffAdvanceAndGroceryKhata.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const totalAdvances = records
      .filter((r) => r.txnType === StaffKhataTxnTypeEnum.SALARY_ADVANCE)
      .reduce((s, r) => s.add(r.amount), new Decimal(0));

    const totalGroceries = records
      .filter((r) => r.txnType === StaffKhataTxnTypeEnum.GROCERY_PURCHASE)
      .reduce((s, r) => s.add(r.amount), new Decimal(0));

    return {
      userId,
      totalAdvances: Number(totalAdvances),
      totalGroceries: Number(totalGroceries),
      totalDeductions: Number(totalAdvances.add(totalGroceries)),
      records: records.map((r) => ({
        id: r.id,
        txnType: r.txnType,
        amount: Number(r.amount),
        notes: r.notes,
        createdAt: r.createdAt,
      })),
    };
  }

  /**
   * Aggregate Line-Item Salesman Commissions across Invoices
   */
  async getSalesmanCommissions(tenantId: string, branchId?: string, month?: number, year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const targetMonth = month ?? new Date().getMonth() + 1;

    const start = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0);
    const end = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const whereInv: any = {
      tenantId,
      cancelledAt: null,
      createdAt: { gte: start, lte: end },
    };
    if (branchId) whereInv.branchId = branchId;

    // Find all invoice lines where salesmanId is tagged
    const lines = await this.prisma.posInvoiceLine.findMany({
      where: {
        salesmanId: { not: null },
        invoice: whereInv,
      },
    });

    const salesmanIds = Array.from(new Set(lines.map((l) => l.salesmanId).filter((id): id is string => !!id)));
    const salesmen = await this.prisma.user.findMany({
      where: { id: { in: salesmanIds } },
    });
    const userMap = new Map(salesmen.map((u) => [u.id, u]));

    const salesmanMap = new Map<
      string,
      {
        salesmanId: string;
        salesmanName: string;
        ratePct: Decimal;
        totalAttributedSales: Decimal;
        commissionEarned: Decimal;
        itemCount: number;
      }
    >();

    for (const l of lines) {
      if (!l.salesmanId) continue;
      const user = userMap.get(l.salesmanId);
      if (!user) continue;

      const sId = user.id;
      let agg = salesmanMap.get(sId);
      if (!agg) {
        agg = {
          salesmanId: sId,
          salesmanName: user.fullName,
          ratePct: user.salesmanCommissionRate,
          totalAttributedSales: new Decimal(0),
          commissionEarned: new Decimal(0),
          itemCount: 0,
        };
        salesmanMap.set(sId, agg);
      }

      agg.itemCount += 1;
      agg.totalAttributedSales = agg.totalAttributedSales.add(l.lineTotal);

      // Line commission = lineTotal * (commissionRate / 100)
      if (agg.ratePct.greaterThan(0)) {
        const lineComm = l.lineTotal.mul(agg.ratePct).div(100).toDecimalPlaces(2);
        agg.commissionEarned = agg.commissionEarned.add(lineComm);
      }
    }

    return {
      period: `${targetYear}-${targetMonth < 10 ? '0' + targetMonth : targetMonth}`,
      salesmen: Array.from(salesmanMap.values()).map((s) => ({
        salesmanId: s.salesmanId,
        salesmanName: s.salesmanName,
        commissionRatePct: Number(s.ratePct),
        totalItemsSold: s.itemCount,
        totalSalesVolume: Number(s.totalAttributedSales.toDecimalPlaces(2)),
        commissionEarned: Number(s.commissionEarned.toDecimalPlaces(2)),
      })),
    };
  }
}
