import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Decimal,
  GrnModeEnum,
  GrnStatusEnum,
  StockMovementTypeEnum,
  StorageBinTypeEnum,
} from '@ti-erp/database';
import {
  CalculateGrnCostingInputDto,
  CreateFastDirectGrnDto,
  GateEntryDto,
  BlindCountItemDto,
  BlindCountSubmitDto,
  ThreeWayMatchSubmitDto,
} from './grn.dto';

export interface GrnCostingOutput {
  grossLineValue: Decimal;
  tradeDiscountValue: Decimal;
  cashDiscountValue: Decimal;
  taxableAmount: Decimal;
  cgstAmount: Decimal;
  sgstAmount: Decimal;
  igstAmount: Decimal;
  cessAmount: Decimal;
  totalGstAmount: Decimal;
  lineTotal: Decimal;
  totalReceivedUnits: Decimal;
  netLandingCostPerBaseUnit: Decimal;
  actualMarginPct: Decimal;
  marginGuardrailTriggered: boolean;
  alertColor: 'GREEN' | 'RED';
  suggestedRetailSellingPrice: Decimal;
  currentRetailSellingPrice: Decimal;
  costIncreased: boolean;
}

@Injectable()
export class GrnService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * True Net Landing Cost & Margin Guardrail Calculator
   * Strictly uses Decimal(15, 4) arithmetic across all 5 scheme layers
   */
  calculateGrnLineCosting(input: CalculateGrnCostingInputDto): GrnCostingOutput {
    const billedQty = new Decimal(input.billedQty);
    const freeSchemeQty = new Decimal(input.freeSchemeQty ?? 0);
    const grossRate = new Decimal(input.grossPurchaseRate);
    const tradeDiscPct = new Decimal(input.tradeDiscountPct ?? 0);
    const tradeDiscAmount = new Decimal(input.tradeDiscountAmount ?? 0);
    const cashDiscPct = new Decimal(input.cashDiscountPct ?? 0);
    const gstRatePct = new Decimal(input.gstRatePct ?? 0);
    const cessRatePct = new Decimal(input.cessRatePct ?? 0);
    const freight = new Decimal(input.apportionedFreightAndUnloading ?? 0);
    const uomFactor = new Decimal(input.uomConversionFactor ?? 1);
    const retailSellingPrice = new Decimal(input.retailSellingPrice);
    const targetMrp = new Decimal(input.targetMrp);
    const targetMarginPct = new Decimal(input.targetMarginPct ?? 15);
    const previousCost = input.previousNetLandingCost != null ? new Decimal(input.previousNetLandingCost) : null;
    const isInterState = input.isInterState ?? false;
    const gstRegime = input.gstRegime ?? 'REGULAR';

    // Step 1: Gross Line Value
    const grossLineValue = billedQty.mul(grossRate);

    // Step 2: Trade Discount (% and flat)
    const tradeFromPct = tradeDiscPct.greaterThan(0)
      ? grossLineValue.mul(tradeDiscPct).div(100)
      : new Decimal(0);
    const tradeDiscountValue = tradeFromPct.add(tradeDiscAmount);
    const valueAfterTradeDisc = grossLineValue.sub(tradeDiscountValue);

    // Cash Discount (%)
    const cashDiscountValue = cashDiscPct.greaterThan(0)
      ? valueAfterTradeDisc.mul(cashDiscPct).div(100)
      : new Decimal(0);

    const taxableAmount = valueAfterTradeDisc.sub(cashDiscountValue).toDecimalPlaces(2);

    // Step 3: GST computation
    let cgstAmount = new Decimal(0);
    let sgstAmount = new Decimal(0);
    let igstAmount = new Decimal(0);

    if (gstRatePct.greaterThan(0)) {
      if (isInterState) {
        igstAmount = taxableAmount.mul(gstRatePct).div(100).toDecimalPlaces(2);
      } else {
        const halfRate = gstRatePct.div(2);
        cgstAmount = taxableAmount.mul(halfRate).div(100).toDecimalPlaces(2);
        sgstAmount = taxableAmount.mul(halfRate).div(100).toDecimalPlaces(2);
      }
    }

    const cessAmount = cessRatePct.greaterThan(0)
      ? taxableAmount.mul(cessRatePct).div(100).toDecimalPlaces(2)
      : new Decimal(0);

    const totalGstAmount = cgstAmount.add(sgstAmount).add(igstAmount).add(cessAmount);
    const lineTotal = taxableAmount.add(totalGstAmount);

    // Step 4: Total Received Base Units (Billed + Free) * UOM Factor
    const totalReceivedUnits = billedQty.add(freeSchemeQty).mul(uomFactor);
    if (totalReceivedUnits.isZero()) {
      throw new BadRequestException('Total received units cannot be zero');
    }

    // Step 5: Net Landing Cost
    // If REGULAR (ITC eligible), GST is offset, so cost = (Taxable + Freight) / totalUnits
    // If COMPOSITION (or non-creditable), GST is added into cost
    const effectiveCostNumerator = gstRegime === 'COMPOSITION'
      ? taxableAmount.add(totalGstAmount).add(freight)
      : taxableAmount.add(freight);

    const netLandingCostPerBaseUnit = effectiveCostNumerator.div(totalReceivedUnits).toDecimalPlaces(4);

    // Step 6: Smart Margin Guardrail Check
    let actualMarginPct = new Decimal(0);
    if (retailSellingPrice.greaterThan(0)) {
      actualMarginPct = retailSellingPrice
        .sub(netLandingCostPerBaseUnit)
        .div(retailSellingPrice)
        .mul(100)
        .toDecimalPlaces(2);
    }

    const costIncreased = previousCost != null && netLandingCostPerBaseUnit.greaterThan(previousCost);
    const marginDipped = actualMarginPct.lessThan(targetMarginPct);
    const marginGuardrailTriggered = marginDipped || costIncreased;
    const alertColor = marginGuardrailTriggered ? 'RED' : 'GREEN';

    // Suggested Selling Price to preserve target margin: Cost / (1 - (margin / 100))
    const marginDivisor = new Decimal(1).sub(targetMarginPct.div(100));
    let suggestedRetailSellingPrice = marginDivisor.greaterThan(0)
      ? netLandingCostPerBaseUnit.div(marginDivisor).toDecimalPlaces(2)
      : netLandingCostPerBaseUnit;

    // Cap suggested selling price at target MRP if MRP is valid
    if (targetMrp.greaterThan(0) && suggestedRetailSellingPrice.greaterThan(targetMrp)) {
      suggestedRetailSellingPrice = targetMrp;
    }

    return {
      grossLineValue,
      tradeDiscountValue,
      cashDiscountValue,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount,
      totalGstAmount,
      lineTotal,
      totalReceivedUnits,
      netLandingCostPerBaseUnit,
      actualMarginPct,
      marginGuardrailTriggered,
      alertColor,
      suggestedRetailSellingPrice,
      currentRetailSellingPrice: retailSellingPrice,
      costIncreased,
    };
  }

  /**
   * Fast Direct Purchase Bill (Single-Step Atomic Transaction)
   */
  async createFastDirectGrn(dto: CreateFastDirectGrnDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('GRN must have at least one line item');
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { tenant: true },
    });
    if (!branch) {
      throw new NotFoundException(`Branch ${dto.branchId} not found`);
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier ${dto.supplierId} not found`);
    }

    // Determine target storage bin (default to GODOWN or SHOP_FLOOR)
    let targetBinId = dto.targetBinId;
    if (!targetBinId) {
      const defaultBin = await this.prisma.storageBin.findFirst({
        where: {
          branchId: dto.branchId,
          binType: { in: [StorageBinTypeEnum.GODOWN, StorageBinTypeEnum.SHOP_FLOOR] },
        },
        orderBy: { binType: 'asc' }, // Prioritize GODOWN if available
      });
      if (defaultBin) {
        targetBinId = defaultBin.id;
      } else {
        // Create default GODOWN bin if none exists
        const createdBin = await this.prisma.storageBin.create({
          data: {
            tenantId: dto.tenantId,
            branchId: dto.branchId,
            binCode: 'MAIN-GODOWN',
            binType: StorageBinTypeEnum.GODOWN,
            description: 'Auto-generated primary warehouse bin',
          },
        });
        targetBinId = createdBin.id;
      }
    }

    // Check intra-state vs inter-state
    const branchState = branch.stateCode ?? (branch.gstin ? branch.gstin.slice(0, 2) : '');
    const supplierState = supplier.gstin ? supplier.gstin.slice(0, 2) : branchState;
    const isInterState = branchState !== '' && supplierState !== '' && branchState !== supplierState;

    const tenantRegime = branch.tenant.gstRegime ?? 'REGULAR';

    // Generate GRN number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const grnNumber = `GRN-${dateStr}-${randSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      let subTotal = new Decimal(0);
      let taxTotal = new Decimal(0);
      let totalFreight = new Decimal(dto.totalFreightApportion ?? 0);
      let allMarginPassed = true;
      let totalStickersCount = 0;

      // Temporary holding for prepared lines
      const preparedLines: Array<{
        productId: string;
        batchNumber: string;
        expiryDate?: Date | null;
        hsnId?: string | null;
        billedQty: Decimal;
        freeSchemeQty: Decimal;
        purchaseRate: Decimal;
        tradeDiscountPct: Decimal;
        cashDiscountPct: Decimal;
        apportionedFreight: Decimal;
        taxableAmount: Decimal;
        cgstAmount: Decimal;
        sgstAmount: Decimal;
        igstAmount: Decimal;
        netLandingCost: Decimal;
        targetMrp: Decimal;
        retailSellingPrice: Decimal;
        marginGuardrailFlag: boolean;
        totalUnits: Decimal;
        batchId?: string;
      }> = [];

      for (const line of dto.lines) {
        // Fetch product & previous batch to check cost increase
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          include: { hsn: true },
        });
        if (!product) {
          throw new NotFoundException(`Product ${line.productId} not found`);
        }

        const previousBatch = await tx.inventoryBatch.findFirst({
          where: { branchId: dto.branchId, productId: line.productId },
          orderBy: { createdAt: 'desc' },
        });

        // Compute costing with full scheme layers
        const costing = this.calculateGrnLineCosting({
          billedQty: line.billedQty,
          freeSchemeQty: line.freeSchemeQty ?? 0,
          grossPurchaseRate: line.purchaseRate,
          tradeDiscountPct: line.tradeDiscountPct ?? 0,
          tradeDiscountAmount: line.tradeDiscountAmount ?? 0,
          cashDiscountPct: line.cashDiscountPct ?? 0,
          gstRatePct: line.gstRatePct ?? (product.hsn ? Number(product.hsn.igstRate) : 0),
          cessRatePct: line.cessRatePct ?? 0,
          apportionedFreightAndUnloading: line.apportionedFreight ?? 0,
          uomConversionFactor: line.uomConversionFactor ?? 1,
          isInterState,
          gstRegime: tenantRegime === 'COMPOSITION' ? 'COMPOSITION' : 'REGULAR',
          retailSellingPrice: line.retailSellingPrice,
          targetMrp: line.targetMrp,
          targetMarginPct: line.targetMarginPct ?? 15,
          previousNetLandingCost: previousBatch ? Number(previousBatch.netLandingCost) : undefined,
        });

        if (costing.marginGuardrailTriggered) {
          allMarginPassed = false;
        }

        subTotal = subTotal.add(costing.taxableAmount);
        taxTotal = taxTotal.add(costing.totalGstAmount);
        totalStickersCount += Math.ceil(Number(costing.totalReceivedUnits));

        // Create or update InventoryBatch
        const expiryDate = line.expiryDate ? new Date(line.expiryDate) : null;
        let batch = await tx.inventoryBatch.findUnique({
          where: {
            branchId_productId_batchNumber: {
              branchId: dto.branchId,
              productId: line.productId,
              batchNumber: line.batchNumber,
            },
          },
        });

        if (batch) {
          // REMOD-301A: Weighted Average Net Landing Cost for Existing Active Batches
          const existingStockBalances = await tx.binStockBalance.findMany({
            where: {
              branchId: dto.branchId,
              batchId: batch.id,
              quantity: { gt: 0 },
            },
          });
          const existingQty = existingStockBalances.reduce(
            (acc, b) => acc.add(b.quantity),
            new Decimal(0),
          );

          let finalNetLandingCost = costing.netLandingCostPerBaseUnit;
          if (existingQty.greaterThan(0)) {
            const totalStock = existingQty.add(costing.totalReceivedUnits);
            const existingValue = existingQty.mul(batch.netLandingCost);
            const newValue = costing.totalReceivedUnits.mul(costing.netLandingCostPerBaseUnit);
            finalNetLandingCost = existingValue.add(newValue).div(totalStock).toDecimalPlaces(4);
          }

          batch = await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              purchaseRate: new Decimal(line.purchaseRate),
              netLandingCost: finalNetLandingCost,
              retailSellingPrice: new Decimal(line.retailSellingPrice),
              mrp: new Decimal(line.targetMrp),
              expiryDate: expiryDate ?? batch.expiryDate,
            },
          });
        } else {
          batch = await tx.inventoryBatch.create({
            data: {
              tenantId: dto.tenantId,
              branchId: dto.branchId,
              productId: line.productId,
              batchNumber: line.batchNumber,
              expiryDate,
              mrp: new Decimal(line.targetMrp),
              purchaseRate: new Decimal(line.purchaseRate),
              netLandingCost: costing.netLandingCostPerBaseUnit,
              retailSellingPrice: new Decimal(line.retailSellingPrice),
            },
          });
        }

        // Increment BinStockBalance
        const currentBalance = await tx.binStockBalance.findUnique({
          where: {
            branchId_binId_batchId: {
              branchId: dto.branchId,
              binId: targetBinId!,
              batchId: batch.id,
            },
          },
        });

        const newBalanceQty = currentBalance
          ? currentBalance.quantity.add(costing.totalReceivedUnits)
          : costing.totalReceivedUnits;

        await tx.binStockBalance.upsert({
          where: {
            branchId_binId_batchId: {
              branchId: dto.branchId,
              binId: targetBinId!,
              batchId: batch.id,
            },
          },
          update: {
            quantity: newBalanceQty,
          },
          create: {
            tenantId: dto.tenantId,
            branchId: dto.branchId,
            binId: targetBinId!,
            productId: line.productId,
            batchId: batch.id,
            quantity: costing.totalReceivedUnits,
          },
        });

        // Write StockLedger entry
        await tx.stockLedger.create({
          data: {
            tenantId: dto.tenantId,
            branchId: dto.branchId,
            binId: targetBinId!,
            productId: line.productId,
            batchId: batch.id,
            movementType: StockMovementTypeEnum.INWARD_GRN,
            quantityChange: costing.totalReceivedUnits,
            runningBalance: newBalanceQty,
            referenceType: 'GRN',
            referenceId: grnNumber,
            unitCost: costing.netLandingCostPerBaseUnit,
            notes: `Fast Direct GRN ${grnNumber} - ${line.billedQty} billed + ${line.freeSchemeQty ?? 0} free`,
          },
        });

        preparedLines.push({
          productId: line.productId,
          batchNumber: line.batchNumber,
          expiryDate,
          hsnId: line.hsnId ?? product.hsnId,
          billedQty: new Decimal(line.billedQty),
          freeSchemeQty: new Decimal(line.freeSchemeQty ?? 0),
          purchaseRate: new Decimal(line.purchaseRate),
          tradeDiscountPct: new Decimal(line.tradeDiscountPct ?? 0),
          cashDiscountPct: new Decimal(line.cashDiscountPct ?? 0),
          apportionedFreight: new Decimal(line.apportionedFreight ?? 0),
          taxableAmount: costing.taxableAmount,
          cgstAmount: costing.cgstAmount,
          sgstAmount: costing.sgstAmount,
          igstAmount: costing.igstAmount,
          netLandingCost: costing.netLandingCostPerBaseUnit,
          targetMrp: new Decimal(line.targetMrp),
          retailSellingPrice: new Decimal(line.retailSellingPrice),
          marginGuardrailFlag: costing.marginGuardrailTriggered,
          totalUnits: costing.totalReceivedUnits,
          batchId: batch.id,
        });

        // If linked to a PO, update receivedQty on matching PurchaseOrderItem
        if (dto.poId) {
          const poItem = await tx.purchaseOrderItem.findFirst({
            where: { poId: dto.poId, productId: line.productId },
          });
          if (poItem) {
            await tx.purchaseOrderItem.update({
              where: { id: poItem.id },
              data: {
                receivedQty: poItem.receivedQty.add(costing.totalReceivedUnits),
              },
            });
          }
        }
      }

      const netPayable = subTotal.add(taxTotal).add(totalFreight).toDecimalPlaces(2);

      // Create GoodsReceiptNote
      const grn = await tx.goodsReceiptNote.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          supplierId: dto.supplierId,
          poId: dto.poId,
          grnNumber,
          mode: GrnModeEnum.FAST_DIRECT,
          status: GrnStatusEnum.COMPLETED,
          supplierInvoiceNo: dto.supplierInvoiceNo,
          supplierInvoiceDate: dto.supplierInvoiceDate ? new Date(dto.supplierInvoiceDate) : null,
          subTotal,
          taxTotal,
          totalFreightApportion: totalFreight,
          netPayable,
          marginGuardrailPassed: allMarginPassed,
          lineItems: {
            create: preparedLines.map((l) => ({
              productId: l.productId,
              batchNumber: l.batchNumber,
              expiryDate: l.expiryDate,
              hsnId: l.hsnId,
              receivedQty: l.totalUnits,
              freeSchemeQty: l.freeSchemeQty,
              purchaseRate: l.purchaseRate,
              tradeDiscountPct: l.tradeDiscountPct,
              cashDiscountPct: l.cashDiscountPct,
              apportionedFreight: l.apportionedFreight,
              taxableAmount: l.taxableAmount,
              cgstAmount: l.cgstAmount,
              sgstAmount: l.sgstAmount,
              igstAmount: l.igstAmount,
              netLandingCost: l.netLandingCost,
              targetMrp: l.targetMrp,
              retailSellingPrice: l.retailSellingPrice,
              marginGuardrailFlag: l.marginGuardrailFlag,
              batchId: l.batchId,
            })),
          },
        },
        include: {
          lineItems: {
            include: { product: true },
          },
          supplier: true,
          branch: true,
        },
      });

      // Update supplier's outstanding balance
      await tx.supplier.update({
        where: { id: dto.supplierId },
        data: {
          outstandingBalance: supplier.outstandingBalance.add(netPayable),
        },
      });

      return {
        ...grn,
        totalStickersToPrint: totalStickersCount,
      };
    });
  }

  /**
   * Enterprise 3-Way Match GRN: Step 1 Gate Entry
   */
  async gateEntry(dto: GateEntryDto) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: dto.poId },
      include: { items: { include: { product: true } } },
    });
    if (!po) {
      throw new NotFoundException(`Purchase Order ${dto.poId} not found`);
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const grnNumber = `GRN-3WAY-${dateStr}-${randSuffix}`;

    return this.prisma.goodsReceiptNote.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        supplierId: dto.supplierId,
        poId: dto.poId,
        grnNumber,
        mode: GrnModeEnum.THREE_WAY_MATCH,
        status: GrnStatusEnum.DRAFT,
        supplierInvoiceNo: dto.supplierInvoiceNo,
        supplierInvoiceDate: dto.supplierInvoiceDate ? new Date(dto.supplierInvoiceDate) : new Date(),
        subTotal: new Decimal(0),
        taxTotal: new Decimal(0),
        netPayable: new Decimal(0),
        marginGuardrailPassed: true,
        aiOcrMetadata: dto.vehicleNumber ? { vehicleNumber: dto.vehicleNumber } : undefined,
      },
      include: {
        supplier: true,
        po: { include: { items: { include: { product: true } } } },
      },
    });
  }

  /**
   * Enterprise 3-Way Match GRN: Step 2 Blind Count by Storekeeper
   */
  async blindCount(grnId: string, dto: BlindCountSubmitDto) {
    const grn = await this.prisma.goodsReceiptNote.findUnique({
      where: { id: grnId },
      include: { po: { include: { items: true } } },
    });
    if (!grn) {
      throw new NotFoundException(`GRN ${grnId} not found`);
    }
    if (grn.status !== GrnStatusEnum.DRAFT) {
      throw new BadRequestException(`GRN must be in DRAFT status to record blind count`);
    }

    // Save blind counted items in metadata and update status to VERIFIED
    return this.prisma.goodsReceiptNote.update({
      where: { id: grnId },
      data: {
        status: GrnStatusEnum.VERIFIED,
        aiOcrMetadata: {
          ...(typeof grn.aiOcrMetadata === 'object' && grn.aiOcrMetadata !== null ? (grn.aiOcrMetadata as object) : {}),
          blindCountItems: JSON.parse(JSON.stringify(dto.items)),
          blindCountRecordedAt: new Date().toISOString(),
        },
      },
      include: {
        po: { include: { items: { include: { product: true } } } },
        supplier: true,
      },
    });
  }

  /**
   * Enterprise 3-Way Match GRN: Step 3 Accounts 3-Way Matching & Inward
   */
  async matchThreeWay(grnId: string, dto: ThreeWayMatchSubmitDto) {
    const grn = await this.prisma.goodsReceiptNote.findUnique({
      where: { id: grnId },
      include: {
        po: { include: { items: { include: { product: true } } } },
        supplier: true,
        branch: { include: { tenant: true } },
      },
    });
    if (!grn) {
      throw new NotFoundException(`GRN ${grnId} not found`);
    }

    const blindData = (grn.aiOcrMetadata as any)?.blindCountItems as BlindCountItemDto[] | undefined;
    if (!blindData || blindData.length === 0) {
      throw new BadRequestException('Blind physical count must be recorded before 3-way match');
    }

    // Compare: PO vs Blind Physical Count vs Accounts Invoice
    const poItemsMap = new Map<string, Decimal>();
    const poPriceMap = new Map<string, Decimal>();
    if (grn.po) {
      for (const item of grn.po.items) {
        poItemsMap.set(item.productId, item.orderedQty);
        poPriceMap.set(item.productId, item.unitPrice);
      }
    }

    const blindCountMap = new Map<string, Decimal>();
    for (const b of blindData) {
      const prev = blindCountMap.get(b.productId) ?? new Decimal(0);
      blindCountMap.set(b.productId, prev.add(new Decimal(b.receivedQty)).add(new Decimal(b.freeQty ?? 0)));
    }

    interface Discrepancy {
      productId: string;
      issueType: 'RATE_VARIANCE' | 'SHORT_SUPPLY' | 'EXCESS_SUPPLY';
      poValue: number;
      actualValue: number;
      varianceDescription: string;
    }

    const discrepancies: Discrepancy[] = [];

    for (const invLine of dto.invoiceLines) {
      const poQty = poItemsMap.get(invLine.productId) ?? new Decimal(0);
      const poRate = poPriceMap.get(invLine.productId) ?? new Decimal(0);
      const physicalQty = blindCountMap.get(invLine.productId) ?? new Decimal(0);
      const billedQty = new Decimal(invLine.billedQty);
      const invoiceRate = new Decimal(invLine.grossRate);

      // Check Short Supply: Physical received is less than billed or PO
      if (physicalQty.lessThan(billedQty)) {
        discrepancies.push({
          productId: invLine.productId,
          issueType: 'SHORT_SUPPLY',
          poValue: Number(billedQty),
          actualValue: Number(physicalQty),
          varianceDescription: `Billed ${billedQty} units but physical received is only ${physicalQty} units (Shortage: ${billedQty.sub(physicalQty)})`,
        });
      }

      // Check Rate Variance: Invoice rate is higher than PO rate
      if (poRate.greaterThan(0) && invoiceRate.greaterThan(poRate)) {
        discrepancies.push({
          productId: invLine.productId,
          issueType: 'RATE_VARIANCE',
          poValue: Number(poRate),
          actualValue: Number(invoiceRate),
          varianceDescription: `PO Rate ₹${poRate} is exceeded by Supplier Invoice Rate ₹${invoiceRate} (+₹${invoiceRate.sub(poRate)})`,
        });
      }
    }

    // If variances exist and manager has NOT overridden, return discrepancy audit for manager signoff
    if (discrepancies.length > 0 && !dto.managerOverrideApproved) {
      return {
        matched: false,
        requiresManagerApproval: true,
        discrepancyCount: discrepancies.length,
        discrepancies,
        message: '3-Way Match detected rate or quantity discrepancies. Manager approval required.',
      };
    }

    // Execute atomic completion and stock inwarding
    return this.prisma.$transaction(async (tx) => {
      // Pick target bin
      const defaultBin = await tx.storageBin.findFirst({
        where: {
          branchId: grn.branchId,
          binType: { in: [StorageBinTypeEnum.GODOWN, StorageBinTypeEnum.SHOP_FLOOR] },
        },
      });
      const binId = defaultBin?.id ?? (await tx.storageBin.create({
        data: {
          tenantId: grn.tenantId,
          branchId: grn.branchId,
          binCode: 'MAIN-GODOWN',
          binType: StorageBinTypeEnum.GODOWN,
        },
      })).id;

      let subTotal = new Decimal(0);
      let taxTotal = new Decimal(0);

      for (const invLine of dto.invoiceLines) {
        const physicalItem = blindData.find((b) => b.productId === invLine.productId);
        const freeQty = physicalItem ? new Decimal(physicalItem.freeQty ?? 0) : new Decimal(0);
        const billedQty = new Decimal(invLine.billedQty);
        const totalReceived = billedQty.add(freeQty);

        const costing = this.calculateGrnLineCosting({
          billedQty: invLine.billedQty,
          freeSchemeQty: Number(freeQty),
          grossPurchaseRate: invLine.grossRate,
          tradeDiscountPct: invLine.tradeDiscountPct ?? 0,
          gstRatePct: invLine.gstRatePct ?? 0,
          retailSellingPrice: invLine.retailSellingPrice,
          targetMrp: invLine.targetMrp,
        });

        subTotal = subTotal.add(costing.taxableAmount);
        taxTotal = taxTotal.add(costing.totalGstAmount);

        // Batch upsert
        const expiryDate = physicalItem?.expiryDate ? new Date(physicalItem.expiryDate) : null;
        let batch = await tx.inventoryBatch.findUnique({
          where: {
            branchId_productId_batchNumber: {
              branchId: grn.branchId,
              productId: invLine.productId,
              batchNumber: invLine.batchNumber,
            },
          },
        });

        if (batch) {
          // REMOD-301A: Weighted Average Net Landing Cost for Existing Active Batches
          const existingStockBalances = await tx.binStockBalance.findMany({
            where: {
              branchId: grn.branchId,
              batchId: batch.id,
              quantity: { gt: 0 },
            },
          });
          const existingQty = existingStockBalances.reduce(
            (acc, b) => acc.add(b.quantity),
            new Decimal(0),
          );

          let finalNetLandingCost = costing.netLandingCostPerBaseUnit;
          if (existingQty.greaterThan(0)) {
            const totalStock = existingQty.add(totalReceived);
            const existingValue = existingQty.mul(batch.netLandingCost);
            const newValue = totalReceived.mul(costing.netLandingCostPerBaseUnit);
            finalNetLandingCost = existingValue.add(newValue).div(totalStock).toDecimalPlaces(4);
          }

          batch = await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              purchaseRate: new Decimal(invLine.grossRate),
              netLandingCost: finalNetLandingCost,
              retailSellingPrice: new Decimal(invLine.retailSellingPrice),
              mrp: new Decimal(invLine.targetMrp),
              expiryDate: expiryDate ?? batch.expiryDate,
            },
          });
        } else {
          batch = await tx.inventoryBatch.create({
            data: {
              tenantId: grn.tenantId,
              branchId: grn.branchId,
              productId: invLine.productId,
              batchNumber: invLine.batchNumber,
              expiryDate,
              mrp: new Decimal(invLine.targetMrp),
              purchaseRate: new Decimal(invLine.grossRate),
              netLandingCost: costing.netLandingCostPerBaseUnit,
              retailSellingPrice: new Decimal(invLine.retailSellingPrice),
            },
          });
        }

        // Bin balance increment
        const currentBal = await tx.binStockBalance.findUnique({
          where: {
            branchId_binId_batchId: {
              branchId: grn.branchId,
              binId,
              batchId: batch.id,
            },
          },
        });

        const newBal = currentBal ? currentBal.quantity.add(totalReceived) : totalReceived;
        await tx.binStockBalance.upsert({
          where: {
            branchId_binId_batchId: {
              branchId: grn.branchId,
              binId,
              batchId: batch.id,
            },
          },
          update: { quantity: newBal },
          create: {
            tenantId: grn.tenantId,
            branchId: grn.branchId,
            binId,
            productId: invLine.productId,
            batchId: batch.id,
            quantity: totalReceived,
          },
        });

        // Stock Ledger
        await tx.stockLedger.create({
          data: {
            tenantId: grn.tenantId,
            branchId: grn.branchId,
            binId,
            productId: invLine.productId,
            batchId: batch.id,
            movementType: StockMovementTypeEnum.INWARD_GRN,
            quantityChange: totalReceived,
            runningBalance: newBal,
            referenceType: 'GRN',
            referenceId: grn.grnNumber,
            unitCost: costing.netLandingCostPerBaseUnit,
            notes: `3-Way Match Finalized GRN ${grn.grnNumber}`,
          },
        });

        // Line item
        await tx.grnLineItem.create({
          data: {
            grnId: grn.id,
            productId: invLine.productId,
            batchNumber: invLine.batchNumber,
            expiryDate,
            receivedQty: totalReceived,
            freeSchemeQty: freeQty,
            purchaseRate: new Decimal(invLine.grossRate),
            tradeDiscountPct: new Decimal(invLine.tradeDiscountPct ?? 0),
            taxableAmount: costing.taxableAmount,
            cgstAmount: costing.cgstAmount,
            sgstAmount: costing.sgstAmount,
            igstAmount: costing.igstAmount,
            netLandingCost: costing.netLandingCostPerBaseUnit,
            targetMrp: new Decimal(invLine.targetMrp),
            retailSellingPrice: new Decimal(invLine.retailSellingPrice),
            marginGuardrailFlag: costing.marginGuardrailTriggered,
            batchId: batch.id,
          },
        });
      }

      const netPayable = subTotal.add(taxTotal).toDecimalPlaces(2);

      // Update GRN status
      const updatedGrn = await tx.goodsReceiptNote.update({
        where: { id: grn.id },
        data: {
          status: GrnStatusEnum.COMPLETED,
          subTotal,
          taxTotal,
          netPayable,
          marginGuardrailPassed: discrepancies.length === 0,
        },
        include: { lineItems: true, supplier: true },
      });

      // Update supplier balance
      await tx.supplier.update({
        where: { id: grn.supplierId },
        data: {
          outstandingBalance: grn.supplier.outstandingBalance.add(netPayable),
        },
      });

      return {
        matched: true,
        discrepanciesResolvedWithApproval: discrepancies.length > 0,
        grn: updatedGrn,
      };
    });
  }

  async list(tenantId: string, branchId?: string, supplierId?: string) {
    return this.prisma.goodsReceiptNote.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        ...(supplierId ? { supplierId } : {}),
      },
      include: {
        supplier: true,
        branch: true,
        lineItems: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const grn = await this.prisma.goodsReceiptNote.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: { include: { tenant: true } },
        lineItems: {
          include: {
            product: { include: { hsn: true, uomConversions: true } },
            batch: true,
          },
        },
        po: { include: { items: true } },
      },
    });
    if (!grn) throw new NotFoundException(`GRN ${id} not found`);
    return grn;
  }
}
