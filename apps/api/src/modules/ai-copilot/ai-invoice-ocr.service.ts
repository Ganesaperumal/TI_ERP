import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GrnService } from '../procurement/grn/grn.service';
import { AiProviderService } from './ai-provider.service';
import { Decimal } from '@ti-erp/database';

export interface ExtractedLineItem {
  rawItemName: string;
  barcode?: string;
  hsnCode?: string;
  batchNumber: string;
  expiryDate?: string;
  mrp: number;
  billedQty: number;
  freeQty: number;
  grossRate: number;
  tradeDiscountPct?: number;
  cashDiscountPct?: number;
  gstRatePct?: number;
  apportionedFreight?: number;
}

export interface ExtractedInvoicePayload {
  supplierName: string;
  supplierGstin?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  lines: ExtractedLineItem[];
}

export interface SmartMatchedLinePreview {
  rawItemName: string;
  extractedBarcode?: string;
  extractedBatch: string;
  extractedExpiry?: string;
  billedQty: number;
  freeQty: number;
  grossRate: number;
  tradeDiscountPct: number;
  cashDiscountPct: number;
  gstRatePct: number;
  mrp: number;
  matchedProduct: {
    id: string;
    skuCode: string;
    nameEn: string;
    baseUom: string;
  } | null;
  matchType: 'EXACT_BARCODE' | 'SKU_CODE' | 'NAME_HSN_SIMILARITY' | 'UNMATCHED';
  confidenceScore?: number;
  costing: {
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    netLandingCost: number;
    currentSellingPrice: number;
    actualMarginPct: number;
    marginGuardrailTriggered: boolean;
    alertColor: 'GREEN' | 'RED';
    suggestedRetailSellingPrice: number;
    costIncreased: boolean;
    previousNetLandingCost?: number;
  };
}

export interface OcrInvoiceResult {
  supplier: {
    id?: string;
    name: string;
    gstin?: string;
    isExistingSupplier: boolean;
  };
  invoiceNumber: string;
  invoiceDate?: string;
  lineItems: SmartMatchedLinePreview[];
  summary: {
    totalItems: number;
    matchedItemsCount: number;
    unmatchedItemsCount: number;
    redGuardrailCount: number;
    estimatedGrossAmount: number;
    estimatedTaxAmount: number;
    estimatedNetPayable: number;
  };
}

@Injectable()
export class AiInvoiceOcrService {
  private readonly logger = new Logger(AiInvoiceOcrService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly grnService: GrnService,
  ) {}

  /**
   * AI-powered OCR extraction and Smart SKU Matching
   */
  async ocrPurchaseInvoice(
    tenantId: string,
    branchId: string,
    fileBase64?: string,
    mimeType: string = 'image/jpeg',
    rawTextOrCsv?: string,
  ): Promise<OcrInvoiceResult> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { tenant: true },
    });
    if (!branch) throw new Error(`Branch ${branchId} not found`);

    let extracted: ExtractedInvoicePayload;

    if (rawTextOrCsv && !fileBase64) {
      extracted = this.parseCsvOrText(rawTextOrCsv);
    } else {
      const prompt = `You are an expert Indian FMCG / Supermarket GST Tax Invoice OCR parser.
Extract the following fields from this distributor tax invoice image/PDF:
- supplierName: Name of the distributor/supplier
- supplierGstin: 15-character GSTIN of the supplier
- invoiceNumber: Tax Invoice number
- invoiceDate: Invoice Date in YYYY-MM-DD format
- lines: Array of purchased products, with:
  - rawItemName: Exact product name/description printed on bill
  - barcode: 12 or 13-digit EAN/UPC barcode if printed
  - hsnCode: 4 to 8 digit HSN/SAC code
  - batchNumber: Batch/Lot number (if missing, use 'DEFAULT')
  - expiryDate: Expiry date in YYYY-MM-DD (or null)
  - mrp: Maximum Retail Price per unit printed on bill
  - billedQty: Billed / invoiced quantity
  - freeQty: Free scheme quantity (e.g., 10+1 free, or 0)
  - grossRate: Basic gross purchase rate per unit before discount
  - tradeDiscountPct: Trade discount percentage (or 0)
  - cashDiscountPct: Cash discount percentage (or 0)
  - gstRatePct: GST rate percentage (e.g. 5, 12, 18, 28, or 0)
Respond ONLY with a valid JSON object matching this schema.`;

      extracted = await this.aiProvider.extractStructuredJson<ExtractedInvoicePayload>(
        tenantId,
        prompt,
        fileBase64,
        mimeType,
      );
    }

    // Match or find supplier in DB
    let matchedSupplier = null;
    if (extracted.supplierGstin) {
      matchedSupplier = await this.prisma.supplier.findFirst({
        where: { tenantId, gstin: extracted.supplierGstin },
      });
    }
    if (!matchedSupplier && extracted.supplierName) {
      matchedSupplier = await this.prisma.supplier.findFirst({
        where: {
          tenantId,
          name: { contains: extracted.supplierName.split(' ')[0], mode: 'insensitive' },
        },
      });
    }

    const branchState = branch.stateCode ?? (branch.gstin ? branch.gstin.slice(0, 2) : '');
    const supplierState = extracted.supplierGstin
      ? extracted.supplierGstin.slice(0, 2)
      : branchState;
    const isInterState = branchState !== '' && supplierState !== '' && branchState !== supplierState;
    const tenantRegime = branch.tenant.gstRegime ?? 'REGULAR';

    const linesPreview: SmartMatchedLinePreview[] = [];
    let estimatedGross = new Decimal(0);
    let estimatedTax = new Decimal(0);
    let redGuardrailCount = 0;

    for (const line of extracted.lines) {
      // Smart SKU Matching
      let matchedProd = null;
      let matchType: 'EXACT_BARCODE' | 'SKU_CODE' | 'NAME_HSN_SIMILARITY' | 'UNMATCHED' = 'UNMATCHED';
      let confidenceScore = 0;

      if (line.barcode) {
        const barcodeRec = await this.prisma.productBarcode.findFirst({
          where: { barcode: line.barcode, product: { tenantId } },
          include: { product: { include: { hsn: true } } },
        });
        if (barcodeRec) {
          matchedProd = barcodeRec.product;
          matchType = 'EXACT_BARCODE';
          confidenceScore = 100;
        }
      }

      if (!matchedProd && line.barcode) {
        const uomRec = await this.prisma.productUomConversion.findFirst({
          where: { barcode: line.barcode, product: { tenantId } },
          include: { product: { include: { hsn: true } } },
        });
        if (uomRec) {
          matchedProd = uomRec.product;
          matchType = 'EXACT_BARCODE';
          confidenceScore = 100;
        }
      }

      // REMOD-301B: Multi-Token & HSN/MRP Ranked Scoring
      if (!matchedProd && line.rawItemName) {
        const keywords = line.rawItemName
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .toLowerCase()
          .split(/\s+/)
          .filter((k) => k.length > 2);

        if (keywords.length > 0) {
          // Query candidate products matching ANY of the top tokens or HSN code
          const candidates = await this.prisma.product.findMany({
            where: {
              tenantId,
              isActive: true,
              OR: [
                ...keywords.slice(0, 3).map((kw) => ({
                  nameEn: { contains: kw, mode: 'insensitive' as const },
                })),
                ...(line.hsnCode
                  ? [{ hsn: { hsnCode: line.hsnCode } }]
                  : []),
              ],
            },
            include: {
              hsn: true,
              batches: {
                take: 5,
                orderBy: { createdAt: 'desc' },
              },
            },
            take: 20,
          });

          // In-memory multi-attribute scoring
          let bestCandidate = null;
          let highestScore = 0;
          const targetMrpDec = new Decimal(line.mrp);

          for (const cand of candidates) {
            let score = 0;
            const candNameLower = cand.nameEn.toLowerCase();

            // +30 pts per matching keyword token
            for (const kw of keywords) {
              if (candNameLower.includes(kw)) {
                score += 30;
              }
            }

            // +25 pts if HSN code matches
            if (line.hsnCode && cand.hsn && cand.hsn.hsnCode === line.hsnCode) {
              score += 25;
            }

            // +20 pts if an existing batch has matching MRP
            const mrpMatches = cand.batches.some((b) => b.mrp.equals(targetMrpDec));
            if (mrpMatches) {
              score += 20;
            }

            if (score > highestScore) {
              highestScore = score;
              bestCandidate = cand;
            }
          }

          // Select candidate only if score meets confidence threshold (score >= 40)
          if (bestCandidate && highestScore >= 40) {
            matchedProd = bestCandidate;
            matchType = 'NAME_HSN_SIMILARITY';
            confidenceScore = Math.min(100, highestScore);
          }
        }
      }

      // Retrieve previous batch to check cost increase
      let previousBatch = null;
      if (matchedProd) {
        previousBatch = await this.prisma.inventoryBatch.findFirst({
          where: { branchId, productId: matchedProd.id },
          orderBy: { createdAt: 'desc' },
        });
      }

      // Selling price: current batch retailSellingPrice or default 90% of MRP
      const currentSellingPrice = previousBatch
        ? Number(previousBatch.retailSellingPrice)
        : Number(new Decimal(line.mrp).mul(0.9).toDecimalPlaces(2));

      // Calculate Net Landing Cost and Margin Guardrail
      const costing = this.grnService.calculateGrnLineCosting({
        billedQty: line.billedQty,
        freeSchemeQty: line.freeQty ?? 0,
        grossPurchaseRate: line.grossRate,
        tradeDiscountPct: line.tradeDiscountPct ?? 0,
        cashDiscountPct: line.cashDiscountPct ?? 0,
        gstRatePct: line.gstRatePct ?? (matchedProd?.hsn ? Number(matchedProd.hsn.igstRate) : 18),
        cessRatePct: 0,
        apportionedFreightAndUnloading: line.apportionedFreight ?? 0,
        uomConversionFactor: 1,
        isInterState,
        gstRegime: tenantRegime === 'COMPOSITION' ? 'COMPOSITION' : 'REGULAR',
        retailSellingPrice: currentSellingPrice,
        targetMrp: line.mrp,
        targetMarginPct: 15,
        previousNetLandingCost: previousBatch ? Number(previousBatch.netLandingCost) : undefined,
      });

      if (costing.marginGuardrailTriggered) {
        redGuardrailCount++;
      }

      estimatedGross = estimatedGross.add(costing.taxableAmount);
      estimatedTax = estimatedTax.add(costing.totalGstAmount);

      linesPreview.push({
        rawItemName: line.rawItemName,
        extractedBarcode: line.barcode,
        extractedBatch: line.batchNumber || 'DEFAULT',
        extractedExpiry: line.expiryDate,
        billedQty: line.billedQty,
        freeQty: line.freeQty ?? 0,
        grossRate: line.grossRate,
        tradeDiscountPct: line.tradeDiscountPct ?? 0,
        cashDiscountPct: line.cashDiscountPct ?? 0,
        gstRatePct: line.gstRatePct ?? 18,
        mrp: line.mrp,
        matchedProduct: matchedProd
          ? {
              id: matchedProd.id,
              skuCode: matchedProd.skuCode,
              nameEn: matchedProd.nameEn,
              baseUom: matchedProd.baseUom,
            }
          : null,
        matchType,
        confidenceScore,
        costing: {
          taxableAmount: Number(costing.taxableAmount),
          cgstAmount: Number(costing.cgstAmount),
          sgstAmount: Number(costing.sgstAmount),
          igstAmount: Number(costing.igstAmount),
          netLandingCost: Number(costing.netLandingCostPerBaseUnit),
          currentSellingPrice,
          actualMarginPct: Number(costing.actualMarginPct),
          marginGuardrailTriggered: costing.marginGuardrailTriggered,
          alertColor: costing.alertColor,
          suggestedRetailSellingPrice: Number(costing.suggestedRetailSellingPrice),
          costIncreased: costing.costIncreased,
          previousNetLandingCost: previousBatch ? Number(previousBatch.netLandingCost) : undefined,
        },
      });
    }

    const estimatedNetPayable = estimatedGross.add(estimatedTax).toDecimalPlaces(2);

    return {
      supplier: {
        id: matchedSupplier?.id,
        name: extracted.supplierName || matchedSupplier?.name || 'Unknown Supplier',
        gstin: extracted.supplierGstin || matchedSupplier?.gstin || undefined,
        isExistingSupplier: !!matchedSupplier,
      },
      invoiceNumber: extracted.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: extracted.invoiceDate || new Date().toISOString().slice(0, 10),
      lineItems: linesPreview,
      summary: {
        totalItems: linesPreview.length,
        matchedItemsCount: linesPreview.filter((l) => l.matchedProduct !== null).length,
        unmatchedItemsCount: linesPreview.filter((l) => l.matchedProduct === null).length,
        redGuardrailCount,
        estimatedGrossAmount: Number(estimatedGross),
        estimatedTaxAmount: Number(estimatedTax),
        estimatedNetPayable: Number(estimatedNetPayable),
      },
    };
  }

  /**
   * Helper: Parse CSV / Tab-Delimited Purchase Bills directly
   */
  parseCsvOrText(rawText: string): ExtractedInvoicePayload {
    const lines = rawText.trim().split('\n');
    const items: ExtractedLineItem[] = [];

    let supplierName = 'Distributor CSV Import';
    let invoiceNumber = `CSV-${Date.now().toString().slice(-6)}`;
    let invoiceDate = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#') || line.toLowerCase().startsWith('item')) continue;

      const cols = line.split(/[,\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length >= 5) {
        // Expected format: Name, Barcode/SKU, BilledQty, FreeQty, GrossRate, MRP, Batch, Expiry, GST%
        items.push({
          rawItemName: cols[0],
          barcode: cols[1] || undefined,
          billedQty: parseFloat(cols[2]) || 1,
          freeQty: parseFloat(cols[3]) || 0,
          grossRate: parseFloat(cols[4]) || 0,
          mrp: cols[5] ? parseFloat(cols[5]) : (parseFloat(cols[4]) || 0) * 1.2,
          batchNumber: cols[6] || 'DEFAULT',
          expiryDate: cols[7] || undefined,
          tradeDiscountPct: cols[8] ? parseFloat(cols[8]) : 0,
          gstRatePct: cols[9] ? parseFloat(cols[9]) : 18,
        });
      }
    }

    return {
      supplierName,
      invoiceNumber,
      invoiceDate,
      lines: items,
    };
  }
}
