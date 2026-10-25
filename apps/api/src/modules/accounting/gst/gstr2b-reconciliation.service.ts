import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReconcileGstr2bDto, Gstr2bLineItemDto } from './gst.dto';
import { Decimal } from '@ti-erp/database';

export type ReconStatus =
  | 'EXACT_MATCH'
  | 'TAX_VALUE_MISMATCH'
  | 'MISSING_IN_GSTR2B_SUPPLIER_NOT_FILED'
  | 'MISSING_IN_BOOKS';

export interface ReconResultItem {
  status: ReconStatus;
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  gstr2bTaxable: number;
  gstr2bTax: number;
  booksTaxable: number;
  booksTax: number;
  taxVariance: number;
  itcAtRisk: boolean;
  actionRecommended: string;
}

@Injectable()
export class Gstr2bReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reconcile Uploaded GSTR-2B Invoices Against Store GRN Purchase Register
   */
  async reconcileGstr2b(dto: ReconcileGstr2bDto) {
    const whereGrn: any = {
      tenantId: dto.tenantId,
    };
    if (dto.branchId) whereGrn.branchId = dto.branchId;

    // Fetch GRNs with supplier details
    const grnRecords = await this.prisma.goodsReceiptNote.findMany({
      where: whereGrn,
      include: {
        supplier: true,
        lineItems: true,
      },
    });

    const results: ReconResultItem[] = [];
    const matchedGrnIds = new Set<string>();

    let totalMatched = 0;
    let totalMismatch = 0;
    let totalMissingInBooks = 0;
    let totalItcAtRiskAmount = new Decimal(0);

    // 1. Check each GSTR-2B item against Store GRNs
    for (const gstr2bItem of dto.gstr2bInvoices) {
      const gstinClean = gstr2bItem.supplierGstin.trim().toUpperCase();
      const invNumClean = gstr2bItem.invoiceNumber.trim().toUpperCase();

      // Find matching GRN by supplier GSTIN and invoiceNumber (or GRN number)
      const matchedGrn = grnRecords.find((grn) => {
        const supGstin = grn.supplier.gstin?.trim().toUpperCase();
        const supInvNo = grn.supplierInvoiceNo?.trim().toUpperCase();
        const grnNo = grn.grnNumber.trim().toUpperCase();

        return (
          supGstin === gstinClean &&
          (supInvNo === invNumClean || grnNo === invNumClean || (supInvNo && supInvNo.includes(invNumClean)))
        );
      });

      const gstr2bTax = new Decimal(gstr2bItem.cgst)
        .add(gstr2bItem.sgst)
        .add(gstr2bItem.igst)
        .add(gstr2bItem.cess);

      if (matchedGrn) {
        matchedGrnIds.add(matchedGrn.id);

        let booksTaxable = new Decimal(0);
        let booksTax = new Decimal(0);

        for (const l of matchedGrn.lineItems) {
          booksTaxable = booksTaxable.add(l.taxableAmount);
          booksTax = booksTax.add(l.cgstAmount).add(l.sgstAmount).add(l.igstAmount);
        }

        const taxDiff = booksTax.sub(gstr2bTax).abs();
        const supName = matchedGrn.supplier.name || matchedGrn.supplier.legalTradeName || 'Supplier';

        if (taxDiff.lessThanOrEqualTo(1.0)) {
          totalMatched++;
          results.push({
            status: 'EXACT_MATCH',
            supplierGstin: gstinClean,
            supplierName: supName,
            invoiceNumber: gstr2bItem.invoiceNumber,
            invoiceDate: gstr2bItem.invoiceDate,
            gstr2bTaxable: gstr2bItem.taxableAmount,
            gstr2bTax: Number(gstr2bTax),
            booksTaxable: Number(booksTaxable),
            booksTax: Number(booksTax),
            taxVariance: Number(taxDiff),
            itcAtRisk: false,
            actionRecommended: '100% ITC Eligible & Safe to Claim',
          });
        } else {
          totalMismatch++;
          results.push({
            status: 'TAX_VALUE_MISMATCH',
            supplierGstin: gstinClean,
            supplierName: supName,
            invoiceNumber: gstr2bItem.invoiceNumber,
            invoiceDate: gstr2bItem.invoiceDate,
            gstr2bTaxable: gstr2bItem.taxableAmount,
            gstr2bTax: Number(gstr2bTax),
            booksTaxable: Number(booksTaxable),
            booksTax: Number(booksTax),
            taxVariance: Number(taxDiff),
            itcAtRisk: false,
            actionRecommended: 'Verify invoice tax line-items with vendor',
          });
        }
      } else {
        totalMissingInBooks++;
        results.push({
          status: 'MISSING_IN_BOOKS',
          supplierGstin: gstinClean,
          supplierName: gstr2bItem.supplierTradeName || 'Unknown Vendor',
          invoiceNumber: gstr2bItem.invoiceNumber,
          invoiceDate: gstr2bItem.invoiceDate,
          gstr2bTaxable: gstr2bItem.taxableAmount,
          gstr2bTax: Number(gstr2bTax),
          booksTaxable: 0,
          booksTax: 0,
          taxVariance: Number(gstr2bTax),
          itcAtRisk: false,
          actionRecommended: 'Supplier filed invoice not yet entered in GRN',
        });
      }
    }

    // 2. Identify Store GRNs MISSING in uploaded GSTR-2B (ITC AT RISK!)
    let totalMissingIn2b = 0;
    for (const grn of grnRecords) {
      if (!matchedGrnIds.has(grn.id)) {
        let booksTaxable = new Decimal(0);
        let booksTax = new Decimal(0);

        for (const l of grn.lineItems) {
          booksTaxable = booksTaxable.add(l.taxableAmount);
          booksTax = booksTax.add(l.cgstAmount).add(l.sgstAmount).add(l.igstAmount);
        }

        if (booksTax.greaterThan(0)) {
          totalMissingIn2b++;
          totalItcAtRiskAmount = totalItcAtRiskAmount.add(booksTax);
          const supName = grn.supplier.name || grn.supplier.legalTradeName || 'Supplier';

          results.push({
            status: 'MISSING_IN_GSTR2B_SUPPLIER_NOT_FILED',
            supplierGstin: grn.supplier.gstin || 'UNREGISTERED',
            supplierName: supName,
            invoiceNumber: grn.supplierInvoiceNo || grn.grnNumber,
            invoiceDate: grn.createdAt.toISOString().slice(0, 10),
            gstr2bTaxable: 0,
            gstr2bTax: 0,
            booksTaxable: Number(booksTaxable),
            booksTax: Number(booksTax),
            taxVariance: Number(booksTax),
            itcAtRisk: true,
            actionRecommended: 'ITC AT RISK — HOLD PAYMENT UNTIL SUPPLIER FILES GST',
          });
        }
      }
    }

    return {
      filingPeriod: dto.filingPeriod,
      summary: {
        totalGstr2bInvoices: dto.gstr2bInvoices.length,
        totalStoreGrns: grnRecords.length,
        exactMatchCount: totalMatched,
        taxMismatchCount: totalMismatch,
        missingInGstr2bCount: totalMissingIn2b,
        missingInBooksCount: totalMissingInBooks,
        itcAtRiskAmount: Number(totalItcAtRiskAmount.toDecimalPlaces(2)),
      },
      results,
    };
  }
}
