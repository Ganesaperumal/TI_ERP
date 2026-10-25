import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './supplier.dto';
import { Decimal } from '@ti-erp/database';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        tenantId: dto.tenantId,
        code: dto.code,
        name: dto.name,
        legalTradeName: dto.legalTradeName,
        gstin: dto.gstin,
        pan: dto.pan,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        paymentTermsDays: dto.paymentTermsDays ?? 30,
        creditLimit: dto.creditLimit ? new Decimal(dto.creditLimit) : new Decimal(0),
        outstandingBalance: dto.openingBalance ? new Decimal(dto.openingBalance) : new Decimal(0),
        isConsignmentVendor: dto.isConsignmentVendor ?? false,
      },
    });
  }

  async list(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: { take: 5, orderBy: { createdAt: 'desc' } },
        goodsReceiptNotes: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        legalTradeName: dto.legalTradeName,
        gstin: dto.gstin,
        pan: dto.pan,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        paymentTermsDays: dto.paymentTermsDays,
        creditLimit: dto.creditLimit ? new Decimal(dto.creditLimit) : undefined,
        isConsignmentVendor: dto.isConsignmentVendor,
      },
    });
  }

  // Supplier Ledger & Payable Aging with Early Cash Discount Alerts
  async getLedgerAndAging(supplierId: string) {
    const supplier = await this.findOne(supplierId);

    const grns = await this.prisma.goodsReceiptNote.findMany({
      where: { supplierId, status: 'COMPLETED' },
      include: { lineItems: true },
      orderBy: { createdAt: 'desc' },
    });

    const debitNotes = await this.prisma.purchaseReturnDebitNote.findMany({
      where: { supplierId, status: 'ISSUED' },
    });

    const now = new Date();
    const paymentTermsDays = supplier.paymentTermsDays || 30;
    const earlyCdDays = 7; // Standard 7-day early cash discount window
    const earlyCdPct = 2.0; // 2% CD

    let totalGrossPayable = new Decimal(0);
    const bills = grns.map((g) => {
      totalGrossPayable = totalGrossPayable.add(g.netPayable);

      const billDate = g.supplierInvoiceDate || g.createdAt;
      const diffTime = Math.abs(now.getTime() - new Date(billDate).getTime());
      const ageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysUntilDue = paymentTermsDays - ageDays;

      const isDueSoon = daysUntilDue <= 2;
      const isOverdue = daysUntilDue < 0;
      const isEarlyCashDiscountEligible = ageDays <= earlyCdDays;

      const potentialCashDiscount = isEarlyCashDiscountEligible
        ? g.netPayable.mul(new Decimal(earlyCdPct)).div(100).toDecimalPlaces(2)
        : new Decimal(0);

      return {
        grnId: g.id,
        grnNumber: g.grnNumber,
        supplierInvoiceNo: g.supplierInvoiceNo,
        billDate,
        amount: Number(g.netPayable),
        ageDays,
        daysUntilDue,
        isDueSoon,
        isOverdue,
        isEarlyCashDiscountEligible,
        earlyDiscountAmount: Number(potentialCashDiscount),
        netAmountIfPaidToday: Number(g.netPayable.sub(potentialCashDiscount)),
      };
    });

    const totalDebitNotes = debitNotes.reduce(
      (acc, d) => acc.add(d.totalAmount),
      new Decimal(0),
    );

    const netOutstanding = totalGrossPayable.sub(totalDebitNotes);

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        gstin: supplier.gstin,
        phone: supplier.phone,
        paymentTermsDays,
      },
      summary: {
        totalGrossPayable: Number(totalGrossPayable),
        totalDebitNotesClaimable: Number(totalDebitNotes),
        netOutstanding: Number(netOutstanding),
        billsDueWithin2Days: bills.filter((b) => b.isDueSoon).length,
        earlyCdEligibleBills: bills.filter((b) => b.isEarlyCashDiscountEligible).length,
      },
      bills,
    };
  }
}
