import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantBranchService } from '../core/tenant-branch.service';
import {
  CreateInventoryBatchDto,
  ResolveBatchForPosSaleDto,
  ApplyClearanceOfferDto,
  ExecuteRepackingJobDto,
} from './inventory.dto';
import {
  BatchTrackingMode,
  NegativeStockRule,
  StorageBinType,
} from '@ti-erp/shared-types';
import { Decimal } from '@ti-erp/database';

@Injectable()
export class InventoryBatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantBranchService: TenantBranchService,
  ) {}

  // 1. Create or Inward New Inventory Batch
  async createBatch(dto: CreateInventoryBatchDto) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.inventoryBatch.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          productId: dto.productId,
          batchNumber: dto.batchNumber,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          mrp: new Decimal(dto.mrp),
          purchaseRate: new Decimal(dto.purchaseRate),
          netLandingCost: new Decimal(dto.netLandingCost),
          retailSellingPrice: new Decimal(dto.retailSellingPrice),
          wholesalePriceTier1: dto.wholesalePriceTier1 ? new Decimal(dto.wholesalePriceTier1) : null,
          wholesalePriceTier2: dto.wholesalePriceTier2 ? new Decimal(dto.wholesalePriceTier2) : null,
        },
      });

      if (dto.initialQuantity && dto.initialQuantity > 0) {
        // Place initial stock in specified bin or default SHOP_FLOOR bin
        let targetBinId = dto.binId;
        if (!targetBinId) {
          const shopBin = await tx.storageBin.findFirst({
            where: { branchId: dto.branchId, binType: 'SHOP_FLOOR' },
          });
          targetBinId = shopBin?.id;
        }

        if (targetBinId) {
          const qtyDec = new Decimal(dto.initialQuantity);
          await tx.binStockBalance.upsert({
            where: {
              branchId_binId_batchId: {
                branchId: dto.branchId,
                binId: targetBinId,
                batchId: batch.id,
              },
            },
            update: {
              quantity: { increment: qtyDec },
            },
            create: {
              tenantId: dto.tenantId,
              branchId: dto.branchId,
              binId: targetBinId,
              productId: dto.productId,
              batchId: batch.id,
              quantity: qtyDec,
            },
          });

          await tx.stockLedger.create({
            data: {
              tenantId: dto.tenantId,
              branchId: dto.branchId,
              binId: targetBinId,
              productId: dto.productId,
              batchId: batch.id,
              movementType: 'INWARD_GRN',
              quantityChange: qtyDec,
              runningBalance: qtyDec,
              referenceType: 'INITIAL_STOCK',
              referenceId: batch.id,
              unitCost: new Decimal(dto.netLandingCost),
              notes: 'Initial opening batch stock',
            },
          });
        }
      }

      return batch;
    });
  }

  // 2. POS Batch Resolution (FEFO vs. MRP-Popup Resolver + Negative Stock Guardrail)
  async resolveBatchForPosSale(dto: ResolveBatchForPosSaleDto) {
    const config = await this.tenantBranchService.getMergedStoreConfig(dto.branchId);
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    // Fetch in-stock batches in SHOP_FLOOR or CONSIGNMENT bins (never damaged/scrap!)
    const balances = await this.prisma.binStockBalance.findMany({
      where: {
        branchId: dto.branchId,
        productId: dto.productId,
        quantity: { gt: 0 },
        bin: {
          binType: { in: ['SHOP_FLOOR', 'CONSIGNMENT'] },
        },
      },
      include: {
        batch: true,
        bin: true,
      },
      orderBy: {
        batch: {
          expiryDate: 'asc', // Earliest expiry first (FEFO)
        },
      },
    });

    // If cashier explicitly selected a batch from popup
    if (dto.selectedBatchId) {
      const selected = balances.find((b) => b.batchId === dto.selectedBatchId);
      if (!selected) {
        // Find batch even if zero stock if allowed by negative stock rule
        const fallbackBatch = await this.prisma.inventoryBatch.findUnique({
          where: { id: dto.selectedBatchId },
        });
        if (!fallbackBatch) throw new NotFoundException('Selected batch not found');
        return {
          requiresBatchPopup: false,
          resolvedBatch: fallbackBatch,
          effectivePrice: Number(fallbackBatch.retailSellingPrice),
          effectivePriceDecimal: fallbackBatch.retailSellingPrice,
          netLandingCostSnapshot: fallbackBatch.netLandingCost,
        };
      }
      return {
        requiresBatchPopup: false,
        resolvedBatch: selected.batch,
        effectivePrice: Number(selected.batch.retailSellingPrice),
        effectivePriceDecimal: selected.batch.retailSellingPrice,
        netLandingCostSnapshot: selected.batch.netLandingCost,
      };
    }

    // Determine batch tracking mode
    const mode =
      product.batchTrackingMode === 'STORE_DEFAULT'
        ? config.inventory.defaultBatchTrackingMode
        : (product.batchTrackingMode as BatchTrackingMode);

    // If no active batches in stock on shop floor (REMOD-201B zero-stock handling)
    if (balances.length === 0) {
      // Check negative stock rule
      const negRule =
        product.negativeStockRule === 'STORE_DEFAULT'
          ? config.inventory.negativeStockRule
          : (product.negativeStockRule as NegativeStockRule);

      if (negRule === NegativeStockRule.BLOCK) {
        throw new BadRequestException(`Negative stock blocked for item ${product.skuCode}`);
      }

      if (negRule === NegativeStockRule.WARN_PIN && !dto.supervisorPin) {
        return {
          negativeStockWarning: true,
          supervisorPinRequired: true,
          message: 'Zero stock. Supervisor PIN override required to bill negative stock.',
        };
      }

      // Fallback: fetch latest InventoryBatch for this product in the branch
      const latestBatch = await this.prisma.inventoryBatch.findFirst({
        where: { branchId: dto.branchId, productId: dto.productId },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestBatch) {
        throw new NotFoundException(`No active or historical batch found for product ${product.skuCode}`);
      }

      return {
        requiresBatchPopup: false,
        resolvedBatch: latestBatch,
        effectivePrice: Number(latestBatch.retailSellingPrice),
        effectivePriceDecimal: latestBatch.retailSellingPrice,
        netLandingCostSnapshot: latestBatch.netLandingCost,
        negativeStockApproved: true,
      };
    }

    // Multiple batches in stock: Check if MRPs/Selling Prices differ
    const uniqueMrps = new Set(balances.map((b) => b.batch.mrp.toString()));
    const uniqueSellingPrices = new Set(balances.map((b) => b.batch.retailSellingPrice.toString()));

    if (
      mode === BatchTrackingMode.POPUP_ON_MRP_DIFF &&
      (uniqueMrps.size > 1 || uniqueSellingPrices.size > 1)
    ) {
      // Trigger Batch Selection Popup on POS terminal
      return {
        requiresBatchPopup: true,
        message: 'Multiple active MRPs on shelf. Cashier selection required.',
        availableBatches: balances.map((b) => ({
          batchId: b.batch.id,
          batchNumber: b.batch.batchNumber,
          mrp: Number(b.batch.mrp),
          retailSellingPrice: Number(b.batch.retailSellingPrice),
          expiryDate: b.batch.expiryDate,
          availableQty: Number(b.quantity),
          clearanceDiscountPct: Number(b.batch.clearanceDiscountPct),
        })),
      };
    }

    // Default to AUTO_FEFO: oldest expiring batch
    const bestBatchBalance = balances[0];
    const resolvedBatch = bestBatchBalance.batch;

    // Strict Decimal arithmetic for clearance discount calculation (REMOD-201B)
    const sellingPriceDec = resolvedBatch.retailSellingPrice;
    let effectivePriceDec = sellingPriceDec;
    if (resolvedBatch.isNearExpiryClearance && resolvedBatch.clearanceDiscountPct.gt(0)) {
      const discountDec = sellingPriceDec.mul(resolvedBatch.clearanceDiscountPct).div(100);
      effectivePriceDec = sellingPriceDec.sub(discountDec).toDecimalPlaces(2);
    }

    return {
      requiresBatchPopup: false,
      resolvedBatch,
      effectivePrice: Number(effectivePriceDec),
      effectivePriceDecimal: effectivePriceDec,
      netLandingCostSnapshot: resolvedBatch.netLandingCost,
    };
  }

  // 3. Near-Expiry Batches & 1-Click Clearance
  async getNearExpiryBatches(branchId: string, days = 30) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Number(days));

    return this.prisma.inventoryBatch.findMany({
      where: {
        branchId,
        expiryDate: {
          lte: targetDate,
          gte: new Date(),
        },
        stockBalances: {
          some: {
            quantity: { gt: 0 },
          },
        },
      },
      include: {
        product: true,
        stockBalances: {
          include: { bin: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async applyClearanceOffer(dto: ApplyClearanceOfferDto) {
    const batch = await this.prisma.inventoryBatch.findUnique({
      where: { id: dto.batchId },
    });
    if (!batch) throw new NotFoundException(`Batch ${dto.batchId} not found`);

    return this.prisma.inventoryBatch.update({
      where: { id: dto.batchId },
      data: {
        clearanceDiscountPct: new Decimal(dto.clearanceDiscountPct),
        isNearExpiryClearance: true,
      },
    });
  }

  // 4. Bulk-to-Retail Repacking Engine (Strict Prisma $transaction)
  async executeRepackingJob(dto: ExecuteRepackingJobDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Bulk Parent SKU and consumed batch
      const bulkBatch = await tx.inventoryBatch.findUnique({
        where: { id: dto.bulkConsumedBatchId },
      });
      if (!bulkBatch) {
        throw new NotFoundException(`Bulk batch ${dto.bulkConsumedBatchId} not found`);
      }

      // Find Godown Bin
      const godownBin = await tx.storageBin.findFirst({
        where: { branchId: dto.branchId, binType: 'GODOWN' },
      });
      if (!godownBin) {
        throw new BadRequestException('GODOWN bin not configured for this branch');
      }

      // Deduct bulk quantity consumed
      const consumedQty = new Decimal(dto.bulkQtyConsumed);
      await tx.binStockBalance.update({
        where: {
          branchId_binId_batchId: {
            branchId: dto.branchId,
            binId: godownBin.id,
            batchId: bulkBatch.id,
          },
        },
        data: {
          quantity: { decrement: consumedQty },
        },
      });

      // Stock Ledger entry for Bulk Consumption
      await tx.stockLedger.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          binId: godownBin.id,
          productId: dto.bulkParentProductId,
          batchId: bulkBatch.id,
          movementType: 'REPACK_BULK_CONSUMPTION',
          quantityChange: consumedQty.negated(),
          runningBalance: new Decimal(0), // snapshot
          referenceType: 'REPACKING_JOB',
          referenceId: dto.jobNumber,
          unitCost: bulkBatch.netLandingCost,
          notes: `Consumed for retail repack job ${dto.jobNumber}`,
        },
      });

      // 2. Record wastage if any
      const wastage = dto.wastageQty ? new Decimal(dto.wastageQty) : new Decimal(0);
      if (wastage.gt(0)) {
        await tx.stockLedger.create({
          data: {
            tenantId: dto.tenantId,
            branchId: dto.branchId,
            binId: godownBin.id,
            productId: dto.bulkParentProductId,
            batchId: bulkBatch.id,
            movementType: 'DAMAGE_WRITE_OFF',
            quantityChange: wastage.negated(),
            runningBalance: new Decimal(0),
            referenceType: 'REPACK_WASTAGE',
            referenceId: dto.jobNumber,
            unitCost: bulkBatch.netLandingCost,
            notes: `Wastage loss in repack job ${dto.jobNumber}`,
          },
        });
      }

      // 3. True Net Landing Cost calculation:
      // Unit Cost = [(Bulk Qty Consumed * Bulk Unit Cost) + Packaging Cost + Labor] / Retail Packs Produced
      const bulkMaterialCost = consumedQty.mul(bulkBatch.netLandingCost);
      const pkgCost = dto.packagingMaterialCost ? new Decimal(dto.packagingMaterialCost) : new Decimal(0);
      const laborCost = dto.laborAndOverheadCost ? new Decimal(dto.laborAndOverheadCost) : new Decimal(0);
      const totalRepackCost = bulkMaterialCost.add(pkgCost).add(laborCost);
      const retailPacksProduced = new Decimal(dto.retailPacksProduced);
      const unitLandingCost = totalRepackCost.div(retailPacksProduced);

      // 4. Create Retail Child SKU Batch
      const retailBatch = await tx.inventoryBatch.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          productId: dto.retailChildProductId,
          batchNumber: dto.newRetailBatchNumber,
          expiryDate: new Date(dto.expiryDate),
          mrp: new Decimal(dto.mrpPerPack),
          purchaseRate: unitLandingCost,
          netLandingCost: unitLandingCost,
          retailSellingPrice: new Decimal(dto.sellingPricePerPack),
        },
      });

      // Target Bin for retail pouches (Default to SHOP_FLOOR)
      let destinationBinId = dto.destinationBinId;
      if (!destinationBinId) {
        const floorBin = await tx.storageBin.findFirst({
          where: { branchId: dto.branchId, binType: 'SHOP_FLOOR' },
        });
        destinationBinId = floorBin?.id || godownBin.id;
      }

      // Add retail packs to destination bin
      await tx.binStockBalance.upsert({
        where: {
          branchId_binId_batchId: {
            branchId: dto.branchId,
            binId: destinationBinId,
            batchId: retailBatch.id,
          },
        },
        update: {
          quantity: { increment: retailPacksProduced },
        },
        create: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          binId: destinationBinId,
          productId: dto.retailChildProductId,
          batchId: retailBatch.id,
          quantity: retailPacksProduced,
        },
      });

      // Stock Ledger entry for Retail Production
      await tx.stockLedger.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          binId: destinationBinId,
          productId: dto.retailChildProductId,
          batchId: retailBatch.id,
          movementType: 'REPACK_RETAIL_PRODUCTION',
          quantityChange: retailPacksProduced,
          runningBalance: retailPacksProduced,
          referenceType: 'REPACKING_JOB',
          referenceId: dto.jobNumber,
          unitCost: unitLandingCost,
          notes: `Produced from bulk repack job ${dto.jobNumber}`,
        },
      });

      // 5. Create immutable RepackingJob record
      const repackingJob = await tx.repackingJob.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          jobNumber: dto.jobNumber,
          bulkParentProductId: dto.bulkParentProductId,
          bulkConsumedBatchId: bulkBatch.id,
          bulkQtyConsumed: consumedQty,
          retailChildProductId: dto.retailChildProductId,
          retailProducedBatchId: retailBatch.id,
          retailPacksProduced,
          wastageQty: wastage,
          packagingMaterialCost: pkgCost,
          laborAndOverheadCost: laborCost,
          calculatedUnitCost: unitLandingCost,
        },
      });

      return {
        job: repackingJob,
        retailBatch,
        calculatedUnitCost: Number(unitLandingCost),
        labelsToPrint: Number(retailPacksProduced),
      };
    });
  }
}
