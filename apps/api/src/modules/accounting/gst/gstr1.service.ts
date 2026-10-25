import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@ti-erp/database';

@Injectable()
export class Gstr1Service {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate Official Indian GSTN GSTR-1 Offline JSON & Summary
   */
  async generateGstr1(tenantId: string, branchId?: string, month?: number, year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const targetMonth = month ?? new Date().getMonth() + 1; // 1-indexed

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const branch = branchId
      ? await this.prisma.branch.findUnique({
          where: { id: branchId },
          include: { tenant: true },
        })
      : await this.prisma.branch.findFirst({
          where: { tenantId },
          include: { tenant: true },
        });

    if (!branch) throw new NotFoundException('Branch not found');

    const branchStateCode = branch.stateCode || (branch.gstin ? branch.gstin.slice(0, 2) : '33');

    // Query POS Invoices
    const whereInvoice: any = {
      tenantId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    };
    if (branchId) whereInvoice.branchId = branchId;

    const allInvoices = await this.prisma.posInvoice.findMany({
      where: whereInvoice,
      include: {
        customer: true,
        lines: { include: { product: { include: { hsn: true } }, hsn: true } },
      },
      orderBy: { invoiceNumber: 'asc' },
    });

    const activeInvoices = allInvoices.filter((inv) => !inv.cancelledAt);
    const cancelledCount = allInvoices.filter((inv) => !!inv.cancelledAt).length;

    // Query Sales Returns
    const whereReturns: any = {
      tenantId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    };
    if (branchId) whereReturns.branchId = branchId;

    const salesReturns = await this.prisma.salesReturn.findMany({
      where: whereReturns,
      include: {
        lines: true,
      },
    });

    // 1. SECTION: b2b
    const b2bMap = new Map<string, any[]>();
    const b2clInvoices: any[] = [];
    const b2csRateMap = new Map<string, { txval: Decimal; camt: Decimal; samt: Decimal; iamt: Decimal; csamt: Decimal }>();

    for (const inv of activeInvoices) {
      const custGstin = inv.customer?.gstin?.trim().toUpperCase();
      const isRegistered = !!custGstin && custGstin.length === 15;
      const isInterState = inv.igstAmount.greaterThan(0);
      const posState = isRegistered ? custGstin.slice(0, 2) : branchStateCode;

      if (isRegistered) {
        // B2B Invoice
        const invObj = {
          inum: inv.invoiceNumber,
          idt: inv.createdAt.toISOString().slice(0, 10),
          val: Number(inv.netPayable),
          pos: posState,
          rchrg: 'N',
          inv_typ: 'R',
          itms: [
            {
              num: 1,
              itm_det: {
                txval: Number(inv.taxableAmount),
                rt: Number(
                  inv.taxableAmount.greaterThan(0)
                    ? inv.cgstAmount.add(inv.sgstAmount).add(inv.igstAmount).mul(100).div(inv.taxableAmount).toDecimalPlaces(0)
                    : 0,
                ),
                iamt: Number(inv.igstAmount),
                camt: Number(inv.cgstAmount),
                samt: Number(inv.sgstAmount),
                csamt: Number(inv.cessAmount),
              },
            },
          ],
        };

        if (!b2bMap.has(custGstin)) b2bMap.set(custGstin, []);
        b2bMap.get(custGstin)!.push(invObj);
      } else if (isInterState && inv.netPayable.greaterThan(250000)) {
        // B2C Large (> 2.5 Lakhs inter-state)
        b2clInvoices.push({
          pos: posState,
          inv: [
            {
              inum: inv.invoiceNumber,
              idt: inv.createdAt.toISOString().slice(0, 10),
              val: Number(inv.netPayable),
              itms: [
                {
                  num: 1,
                  itm_det: {
                    txval: Number(inv.taxableAmount),
                    rt: 18,
                    iamt: Number(inv.igstAmount),
                    csamt: Number(inv.cessAmount),
                  },
                },
              ],
            },
          ],
        });
      } else {
        // B2C Small: consolidate by rate slab
        // Determine effective slab from line items or invoice totals
        for (const line of inv.lines) {
          const gstRatePct = line.taxableAmount.greaterThan(0)
            ? line.cgstAmount.add(line.sgstAmount).add(line.igstAmount).mul(100).div(line.taxableAmount).toDecimalPlaces(0)
            : new Decimal(0);

          const slabKey = `${isInterState ? 'INTER' : 'INTRA'}_${posState}_${gstRatePct.toFixed(0)}`;
          let agg = b2csRateMap.get(slabKey);
          if (!agg) {
            agg = {
              txval: new Decimal(0),
              camt: new Decimal(0),
              samt: new Decimal(0),
              iamt: new Decimal(0),
              csamt: new Decimal(0),
            };
            b2csRateMap.set(slabKey, agg);
          }

          agg.txval = agg.txval.add(line.taxableAmount);
          agg.camt = agg.camt.add(line.cgstAmount);
          agg.samt = agg.samt.add(line.sgstAmount);
          agg.iamt = agg.iamt.add(line.igstAmount);
          agg.csamt = agg.csamt.add(line.cessAmount);
        }
      }
    }

    const b2b = Array.from(b2bMap.entries()).map(([ctin, invList]) => ({
      ctin,
      inv: invList,
    }));

    const b2cs = Array.from(b2csRateMap.entries()).map(([key, vals]) => {
      const [sply_ty, pos, rt] = key.split('_');
      return {
        sply_ty,
        pos,
        typ: 'OE',
        rt: Number(rt),
        txval: Number(vals.txval.toDecimalPlaces(2)),
        iamt: Number(vals.iamt.toDecimalPlaces(2)),
        camt: Number(vals.camt.toDecimalPlaces(2)),
        samt: Number(vals.samt.toDecimalPlaces(2)),
        csamt: Number(vals.csamt.toDecimalPlaces(2)),
      };
    });

    // 4. SECTION: cdnr / cdnur (Credit/Debit Notes)
    const cdnr: any[] = [];
    const cdnur: any[] = [];

    for (const ret of salesReturns) {
      const noteObj = {
        nt_num: ret.returnNumber,
        nt_dt: ret.createdAt.toISOString().slice(0, 10),
        val: Number(ret.totalRefundAmount),
        itms: [
          {
            num: 1,
            itm_det: {
              txval: Number(ret.totalRefundAmount),
              rt: 0,
              iamt: 0,
              camt: 0,
              samt: 0,
              csamt: 0,
            },
          },
        ],
      };
      cdnur.push(noteObj);
    }

    // 5. SECTION: hsn (Consolidated HSN-wise summary)
    const hsnMap = new Map<
      string,
      {
        desc: string;
        uqc: string;
        qty: Decimal;
        val: Decimal;
        txval: Decimal;
        iamt: Decimal;
        camt: Decimal;
        samt: Decimal;
        csamt: Decimal;
      }
    >();

    for (const inv of activeInvoices) {
      for (const line of inv.lines) {
        const hsnCode = line.hsn?.hsnCode || line.product?.hsn?.hsnCode || '999999';
        let agg = hsnMap.get(hsnCode);
        if (!agg) {
          agg = {
            desc: line.product?.nameEn || 'General Retail Goods',
            uqc: line.product?.baseUom || 'PCS',
            qty: new Decimal(0),
            val: new Decimal(0),
            txval: new Decimal(0),
            iamt: new Decimal(0),
            camt: new Decimal(0),
            samt: new Decimal(0),
            csamt: new Decimal(0),
          };
          hsnMap.set(hsnCode, agg);
        }

        agg.qty = agg.qty.add(line.quantity);
        agg.val = agg.val.add(line.lineTotal);
        agg.txval = agg.txval.add(line.taxableAmount);
        agg.camt = agg.camt.add(line.cgstAmount);
        agg.samt = agg.samt.add(line.sgstAmount);
        agg.iamt = agg.iamt.add(line.igstAmount);
        agg.csamt = agg.csamt.add(line.cessAmount);
      }
    }

    let hsnSerial = 1;
    const hsn = {
      data: Array.from(hsnMap.entries()).map(([hsn_sc, d]) => ({
        num: hsnSerial++,
        hsn_sc,
        desc: d.desc,
        uqc: d.uqc,
        qty: Number(d.qty),
        val: Number(d.val.toDecimalPlaces(2)),
        txval: Number(d.txval.toDecimalPlaces(2)),
        iamt: Number(d.iamt.toDecimalPlaces(2)),
        camt: Number(d.camt.toDecimalPlaces(2)),
        samt: Number(d.samt.toDecimalPlaces(2)),
        csamt: Number(d.csamt.toDecimalPlaces(2)),
      })),
    };

    // 6. SECTION: doc_issue (Document Series)
    const firstInvoice = allInvoices[0]?.invoiceNumber || 'N/A';
    const lastInvoice = allInvoices[allInvoices.length - 1]?.invoiceNumber || 'N/A';
    const totalIssued = allInvoices.length;
    const netIssued = activeInvoices.length;

    const doc_issue = {
      doc_det: [
        {
          doc_num: 1,
          doc_typ: 'Invoices for outward supply',
          docs: [
            {
              num: 1,
              from: firstInvoice,
              to: lastInvoice,
              totnum: totalIssued,
              canc: cancelledCount,
              net_issue: netIssued,
            },
          ],
        },
      ],
    };

    // Official GSTN JSON structure
    const gstr1Payload = {
      gstin: branch.gstin || '33AAAAA0000A1Z5',
      fp: `${targetMonth < 10 ? '0' + targetMonth : targetMonth}${targetYear}`,
      cur_gt: Number(activeInvoices.reduce((s, i) => s.add(i.netPayable), new Decimal(0)).toDecimalPlaces(2)),
      b2b,
      b2cl: b2clInvoices,
      b2cs,
      cdnr,
      cdnur,
      hsn,
      doc_issue,
    };

    return {
      filingPeriod: `${targetYear}-${targetMonth < 10 ? '0' + targetMonth : targetMonth}`,
      summary: {
        totalInvoices: totalIssued,
        activeInvoices: netIssued,
        cancelledInvoices: cancelledCount,
        b2bCount: b2b.reduce((s, b) => s + b.inv.length, 0),
        b2csGroupCount: b2cs.length,
        hsnItemCount: hsn.data.length,
        totalTaxableTurnover: Number(
          activeInvoices.reduce((s, i) => s.add(i.taxableAmount), new Decimal(0)).toDecimalPlaces(2),
        ),
        totalGstTax: Number(
          activeInvoices
            .reduce((s, i) => s.add(i.cgstAmount).add(i.sgstAmount).add(i.igstAmount).add(i.cessAmount), new Decimal(0))
            .toDecimalPlaces(2),
        ),
      },
      gstr1Payload,
    };
  }
}
