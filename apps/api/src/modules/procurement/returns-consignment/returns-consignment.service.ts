import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Decimal,
  DebitNoteStatusEnum,
  ConsignmentSettlementStatusEnum,
  StockMovementTypeEnum,
  StorageBinTypeEnum,
} from '@ti-erp/database';
import {
  ReturnableDamagesQueryDto,
  CreateDebitNoteDto,
  ConsignmentSettlementPreviewQueryDto,
  CreateConsignmentSettlementDto,
} from './returns-consignment.dto';

@Injectable()
export class ReturnsConsignmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returnable Damages & Expired Stock Finder
   * Queries DAMAGED_RETURNABLE bin and expired batches mapped to supplier
   */
  async getReturnableDamages(query: ReturnableDamagesQueryDto) {
    const { branchId, supplierId } = query;
    const now = new Date();

    // 1. Balances in DAMAGED_RETURNABLE bins
    const damagedBalances = await this.prisma.binStockBalance.findMany({
      where: {
        branchId,
        quantity: { gt: 0 },
        bin: { binType: StorageBinTypeEnum.DAMAGED_RETURNABLE },
      },
      include: {
        product: { include: { hsn: true } },
        batch: true,
        bin: true,
      },
    });

    // 2. Expired batches with positive stock across all bins
    const expiredBalances = await this.prisma.binStockBalance.findMany({
      where: {
        branchId,
        quantity: { gt: 0 },
        batch: { expiryDate: { lte: now } },
      },
      include: {
        product: { include: { hsn: true } },
        batch: true,
        bin: true,
      },
    });

    // Merge and deduplicate by binBalance id
    const balanceMap = new Map<string, typeof damagedBalances[0]>();
    for (const b of [...damagedBalances, ...expiredBalances]) {
      balanceMap.set(b.id, b);
    }

    const claimableItems: any[] = [];

    for (const bal of balanceMap.values()) {
      // Find the supplier who supplied this batch
      const grnLine = await this.prisma.grnLineItem.findFirst({
        where: {
          productId: bal.productId,
          batchNumber: bal.batch.batchNumber,
          grn: { branchId },
        },
        include: {
          grn: { include: { supplier: true } },
        },
        orderBy: { grn: { createdAt: 'desc' } },
      });

      const supp = grnLine?.grn.supplier;
      if (supplierId && supp && supp.id !== supplierId) {
        continue;
      }

      const isExpired = bal.batch.expiryDate ? bal.batch.expiryDate <= now : false;
      const isDamagedBin = bal.bin.binType === StorageBinTypeEnum.DAMAGED_RETURNABLE;
      const unitCost = bal.batch.netLandingCost;
      const claimableValue = bal.quantity.mul(unitCost).toDecimalPlaces(2);

      claimableItems.push({
        balanceId: bal.id,
        branchId: bal.branchId,
        binId: bal.binId,
        binCode: bal.bin.binCode,
        binType: bal.bin.binType,
        productId: bal.productId,
        productName: bal.product.nameEn,
        skuCode: bal.product.skuCode,
        batchNumber: bal.batch.batchNumber,
        expiryDate: bal.batch.expiryDate,
        isExpired,
        isDamagedBin,
        returnReason: isExpired ? 'EXPIRED' : isDamagedBin ? 'DAMAGED' : 'UNSELLABLE',
        quantity: Number(bal.quantity),
        unitCost: Number(unitCost),
        claimableValue: Number(claimableValue),
        supplier: supp
          ? {
              id: supp.id,
              name: supp.name,
              phone: supp.phone,
              gstin: supp.gstin,
            }
          : null,
      });
    }

    return {
      branchId,
      totalClaimableItems: claimableItems.length,
      totalClaimableValue: claimableItems.reduce((acc, i) => acc + i.claimableValue, 0),
      items: claimableItems,
    };
  }

  /**
   * Create Purchase Return & GST Debit Note
   * Deducts stock, reverses GST, updates supplier ledger
   */
  async createDebitNote(dto: CreateDebitNoteDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Debit note must have at least one line item');
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier ${dto.supplierId} not found`);
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { tenant: true },
    });
    if (!branch) {
      throw new NotFoundException(`Branch ${dto.branchId} not found`);
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const debitNoteNumber = `DN-${dateStr}-${randSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      let totalDebitAmount = new Decimal(0);
      const linesData: any[] = [];

      for (const line of dto.lines) {
        const batch = await tx.inventoryBatch.findUnique({
          where: {
            branchId_productId_batchNumber: {
              branchId: dto.branchId,
              productId: line.productId,
              batchNumber: line.batchNumber,
            },
          },
        });
        if (!batch) {
          throw new NotFoundException(
            `Batch ${line.batchNumber} for product ${line.productId} not found`,
          );
        }

        const returnQty = new Decimal(line.returnedQty);
        const unitCost = line.unitCost ? new Decimal(line.unitCost) : batch.netLandingCost;
        const lineTotal = returnQty.mul(unitCost).toDecimalPlaces(2);
        totalDebitAmount = totalDebitAmount.add(lineTotal);

        // Find bin to deduct from (prefer DAMAGED_RETURNABLE, else GODOWN/SHOP_FLOOR)
        const targetBinType = line.sourceBinType ?? StorageBinTypeEnum.DAMAGED_RETURNABLE;
        let binStock = await tx.binStockBalance.findFirst({
          where: {
            branchId: dto.branchId,
            batchId: batch.id,
            bin: { binType: targetBinType },
          },
        });

        // Fallback to any bin with available stock
        if (!binStock || binStock.quantity.lessThan(returnQty)) {
          binStock = await tx.binStockBalance.findFirst({
            where: {
              branchId: dto.branchId,
              batchId: batch.id,
              quantity: { gte: returnQty },
            },
          });
        }

        if (binStock) {
          const newQty = binStock.quantity.sub(returnQty);
          await tx.binStockBalance.update({
            where: { id: binStock.id },
            data: { quantity: newQty },
          });

          // Write Stock Ledger
          await tx.stockLedger.create({
            data: {
              tenantId: dto.tenantId,
              branchId: dto.branchId,
              binId: binStock.binId,
              productId: line.productId,
              batchId: batch.id,
              movementType: StockMovementTypeEnum.DAMAGE_WRITE_OFF,
              quantityChange: returnQty.negated(),
              runningBalance: newQty,
              referenceType: 'DEBIT_NOTE',
              referenceId: debitNoteNumber,
              unitCost,
              notes: `Debit Note ${debitNoteNumber}: Return ${dto.reason}`,
            },
          });
        }

        linesData.push({
          productId: line.productId,
          batchNumber: line.batchNumber,
          returnedQty: returnQty,
          unitCost,
          totalAmount: lineTotal,
        });
      }

      // Create PurchaseReturnDebitNote
      const debitNote = await tx.purchaseReturnDebitNote.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          supplierId: dto.supplierId,
          debitNoteNumber,
          status: DebitNoteStatusEnum.ISSUED,
          reason: dto.reason,
          totalAmount: totalDebitAmount,
          notes: dto.notes
            ? `${dto.notes} [Mode: ${dto.settlementMode}]`
            : `[Mode: ${dto.settlementMode}]`,
          lines: {
            create: linesData,
          },
        },
        include: {
          lines: { include: { product: true } },
          supplier: true,
          branch: true,
        },
      });

      // If DEDUCT_FROM_NEXT_PAYMENT, atomically reduce supplier outstanding balance
      if (dto.settlementMode === 'DEDUCT_FROM_NEXT_PAYMENT') {
        await tx.supplier.update({
          where: { id: dto.supplierId },
          data: {
            outstandingBalance: supplier.outstandingBalance.sub(totalDebitAmount),
          },
        });
      }

      return debitNote;
    });
  }

  /**
   * Consignment Payout Settlement Preview
   * Computes vendor payout = sales value - store commission
   */
  async getConsignmentSettlementPreview(query: ConsignmentSettlementPreviewQueryDto) {
    const { branchId, supplierId, storeCommissionPct = 15 } = query;

    const fromDate = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = query.to ? new Date(query.to) : new Date();

    // Query POS invoice lines for consignment batches supplied by this vendor
    const soldLines = await this.prisma.posInvoiceLine.findMany({
      where: {
        invoice: {
          branchId,
          cancelledAt: null,
          createdAt: { gte: fromDate, lte: toDate },
        },
        product: {
          isConsignment: true,
        },
      },
      include: {
        product: true,
        batch: true,
        invoice: true,
      },
    });

    let totalSoldQty = new Decimal(0);
    let totalGrossSales = new Decimal(0);

    const lineBreakdown = soldLines.map((line) => {
      totalSoldQty = totalSoldQty.add(line.quantity);
      totalGrossSales = totalGrossSales.add(line.lineTotal);

      return {
        invoiceNumber: line.invoice.invoiceNumber,
        soldAt: line.invoice.createdAt,
        productId: line.productId,
        productName: line.product.nameEn,
        batchNumber: line.batch?.batchNumber ?? 'N/A',
        quantity: Number(line.quantity),
        sellingPrice: Number(line.sellingPrice),
        lineTotal: Number(line.lineTotal),
      };
    });

    const commRate = new Decimal(storeCommissionPct).div(100);
    const storeCommissionAmount = totalGrossSales.mul(commRate).toDecimalPlaces(2);
    const vendorPayout = totalGrossSales.sub(storeCommissionAmount).toDecimalPlaces(2);

    return {
      supplierId,
      branchId,
      periodStart: fromDate,
      periodEnd: toDate,
      storeCommissionPct,
      summary: {
        totalSoldQty: Number(totalSoldQty),
        totalGrossSales: Number(totalGrossSales),
        storeCommissionAmount: Number(storeCommissionAmount),
        vendorPayout: Number(vendorPayout),
      },
      lines: lineBreakdown,
    };
  }

  /**
   * Settle Consignment Payout
   */
  async settleConsignment(dto: CreateConsignmentSettlementDto) {
    const preview = await this.getConsignmentSettlementPreview({
      branchId: dto.branchId,
      supplierId: dto.supplierId,
      from: dto.periodStart,
      to: dto.periodEnd,
      storeCommissionPct: dto.storeCommissionPct ?? 15,
    });

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const settlementNumber = `CS-${dateStr}-${randSuffix}`;

    return this.prisma.consignmentSettlement.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        supplierId: dto.supplierId,
        settlementNumber,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        soldQty: new Decimal(preview.summary.totalSoldQty),
        settlementAmount: new Decimal(preview.summary.vendorPayout),
        status: ConsignmentSettlementStatusEnum.SETTLED,
      },
      include: {
        supplier: true,
      },
    });
  }

  async listDebitNotes(tenantId: string, branchId?: string, supplierId?: string) {
    return this.prisma.purchaseReturnDebitNote.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        ...(supplierId ? { supplierId } : {}),
      },
      include: {
        supplier: true,
        branch: true,
        lines: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listConsignmentSettlements(tenantId: string, supplierId?: string) {
    return this.prisma.consignmentSettlement.findMany({
      where: {
        tenantId,
        ...(supplierId ? { supplierId } : {}),
      },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
