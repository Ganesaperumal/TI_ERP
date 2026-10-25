import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@ti-erp/database';

@Injectable()
export class Gstr3bService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute GSTR-3B Summary: Table 3.1 (Outward Liability) vs. Table 4 (Eligible ITC) & Net Offset
   */
  async computeGstr3b(tenantId: string, branchId?: string, month?: number, year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const targetMonth = month ?? new Date().getMonth() + 1;

    const start = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0);
    const end = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // 1. Outward Supplies from Invoices (Table 3.1)
    const whereInv: any = {
      tenantId,
      cancelledAt: null,
      createdAt: { gte: start, lte: end },
    };
    if (branchId) whereInv.branchId = branchId;

    const invoices = await this.prisma.posInvoice.findMany({ where: whereInv });

    let outwardTaxable = new Decimal(0);
    let outwardIgst = new Decimal(0);
    let outwardCgst = new Decimal(0);
    let outwardSgst = new Decimal(0);
    let outwardCess = new Decimal(0);

    for (const inv of invoices) {
      outwardTaxable = outwardTaxable.add(inv.taxableAmount);
      outwardIgst = outwardIgst.add(inv.igstAmount);
      outwardCgst = outwardCgst.add(inv.cgstAmount);
      outwardSgst = outwardSgst.add(inv.sgstAmount);
      outwardCess = outwardCess.add(inv.cessAmount);
    }

    // 2. Inward Invoices / GRN for Eligible ITC (Table 4)
    const whereGrn: any = {
      tenantId,
      createdAt: { gte: start, lte: end },
    };
    if (branchId) whereGrn.branchId = branchId;

    const grns = await this.prisma.goodsReceiptNote.findMany({
      where: whereGrn,
      include: { lineItems: true },
    });

    let itcTaxable = new Decimal(0);
    let itcIgst = new Decimal(0);
    let itcCgst = new Decimal(0);
    let itcSgst = new Decimal(0);
    let itcCess = new Decimal(0);

    for (const g of grns) {
      for (const l of g.lineItems) {
        itcTaxable = itcTaxable.add(l.taxableAmount);
        itcIgst = itcIgst.add(l.igstAmount);
        itcCgst = itcCgst.add(l.cgstAmount);
        itcSgst = itcSgst.add(l.sgstAmount);
      }
    }

    // 3. Offset Calculation: Liability - ITC = Net Tax Payable in Cash
    const netIgst = Decimal.max(0, outwardIgst.sub(itcIgst));
    const netCgst = Decimal.max(0, outwardCgst.sub(itcCgst));
    const netSgst = Decimal.max(0, outwardSgst.sub(itcSgst));
    const netCess = Decimal.max(0, outwardCess.sub(itcCess));

    const totalCashPayable = netIgst.add(netCgst).add(netSgst).add(netCess);

    return {
      filingPeriod: `${targetYear}-${targetMonth < 10 ? '0' + targetMonth : targetMonth}`,
      table31OutwardSupplies: {
        natureOfSupplies: '(a) Outward taxable supplies (other than zero rated, nil and exempted)',
        taxableValue: Number(outwardTaxable.toDecimalPlaces(2)),
        igst: Number(outwardIgst.toDecimalPlaces(2)),
        cgst: Number(outwardCgst.toDecimalPlaces(2)),
        sgst: Number(outwardSgst.toDecimalPlaces(2)),
        cess: Number(outwardCess.toDecimalPlaces(2)),
      },
      table4EligibleItc: {
        natureOfItc: '(A)(5) All other ITC (Purchase Inwards from GRNs)',
        taxableValue: Number(itcTaxable.toDecimalPlaces(2)),
        igst: Number(itcIgst.toDecimalPlaces(2)),
        cgst: Number(itcCgst.toDecimalPlaces(2)),
        sgst: Number(itcSgst.toDecimalPlaces(2)),
        cess: Number(itcCess.toDecimalPlaces(2)),
      },
      netTaxPayableInCash: {
        igst: Number(netIgst.toDecimalPlaces(2)),
        cgst: Number(netCgst.toDecimalPlaces(2)),
        sgst: Number(netSgst.toDecimalPlaces(2)),
        cess: Number(netCess.toDecimalPlaces(2)),
        totalCashPayable: Number(totalCashPayable.toDecimalPlaces(2)),
      },
    };
  }
}
