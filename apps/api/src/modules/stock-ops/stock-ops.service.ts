import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BinTransferDto,
  CreateStockTransferDto,
  ReceiveStockTransferDto,
  StartCycleCountDto,
  SubmitCycleCountsDto,
  ApproveCycleCountDto,
} from './stock-ops.dto';
import { Decimal } from '@ti-erp/database';

@Injectable()
export class StockOpsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Internal Bin Transfer (e.g. GODOWN -> SHOP_FLOOR or SHOP_FLOOR -> DAMAGED_RETURNABLE)
  async executeBinTransfer(dto: BinTransferDto) {
    return this.prisma.$transaction(async (tx) => {
      const qtyDec = new Decimal(dto.quantity);

      // Check source balance
      const sourceBalance = await tx.binStockBalance.findUnique({
        where: {
          branchId_binId_batchId: {
            branchId: dto.branchId,
            binId: dto.sourceBinId,
            batchId: dto.batchId,
          },
        },
        include: { batch: true },
      });

      if (!sourceBalance || sourceBalance.quantity.lt(qtyDec)) {
        throw new BadRequestException('Insufficient stock in source bin for transfer');
      }

      // Deduct from source bin
      await tx.binStockBalance.update({
        where: {
          branchId_binId_batchId: {
            branchId: dto.branchId,
            binId: dto.sourceBinId,
            batchId: dto.batchId,
          },
        },
        data: {
          quantity: { decrement: qtyDec },
        },
      });

      // Add to destination bin
      await tx.binStockBalance.upsert({
        where: {
          branchId_binId_batchId: {
            branchId: dto.branchId,
            binId: dto.destinationBinId,
            batchId: dto.batchId,
          },
        },
        update: {
          quantity: { increment: qtyDec },
        },
        create: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          binId: dto.destinationBinId,
          productId: dto.productId,
          batchId: dto.batchId,
          quantity: qtyDec,
        },
      });

      // Immutable StockLedger entries for source and destination
      await tx.stockLedger.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          binId: dto.sourceBinId,
          productId: dto.productId,
          batchId: dto.batchId,
          movementType: 'INTER_BRANCH_DISPATCH',
          quantityChange: qtyDec.negated(),
          runningBalance: sourceBalance.quantity.sub(qtyDec),
          referenceType: 'BIN_TRANSFER',
          referenceId: `${dto.sourceBinId}->${dto.destinationBinId}`,
          unitCost: sourceBalance.batch.netLandingCost,
          notes: dto.notes || 'Internal bin move out',
        },
      });

      await tx.stockLedger.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          binId: dto.destinationBinId,
          productId: dto.productId,
          batchId: dto.batchId,
          movementType: 'INTER_BRANCH_RECEIVE',
          quantityChange: qtyDec,
          runningBalance: qtyDec,
          referenceType: 'BIN_TRANSFER',
          referenceId: `${dto.sourceBinId}->${dto.destinationBinId}`,
          unitCost: sourceBalance.batch.netLandingCost,
          notes: dto.notes || 'Internal bin move in',
        },
      });

      return { success: true, message: 'Bin transfer completed' };
    });
  }

  // 2. Inter-Branch Stock Transfers with Goods-In-Transit (GIT)
  async createStockTransfer(dto: CreateStockTransferDto) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          tenantId: dto.tenantId,
          transferNumber: dto.transferNumber,
          originBranchId: dto.originBranchId,
          destinationBranchId: dto.destinationBranchId,
          status: 'DISPATCHED',
          eWayBillNo: dto.eWayBillNo,
          vehicleNo: dto.vehicleNo,
          notes: dto.notes,
          dispatchedAt: new Date(),
        },
      });

      // Find origin GODOWN bin
      const originBin = await tx.storageBin.findFirst({
        where: { branchId: dto.originBranchId, binType: 'GODOWN' },
      });
      if (!originBin) throw new BadRequestException('Origin branch missing GODOWN bin');

      for (const item of dto.items) {
        const qtyDec = new Decimal(item.dispatchedQty);

        await tx.stockTransferItem.create({
          data: {
            transferId: transfer.id,
            productId: item.productId,
            batchId: item.batchId,
            dispatchedQty: qtyDec,
            receivedQty: new Decimal(0),
          },
        });

        // Deduct from origin branch
        await tx.binStockBalance.update({
          where: {
            branchId_binId_batchId: {
              branchId: dto.originBranchId,
              binId: originBin.id,
              batchId: item.batchId,
            },
          },
          data: {
            quantity: { decrement: qtyDec },
          },
        });

        const batch = await tx.inventoryBatch.findUnique({ where: { id: item.batchId } });

        await tx.stockLedger.create({
          data: {
            tenantId: dto.tenantId,
            branchId: dto.originBranchId,
            binId: originBin.id,
            productId: item.productId,
            batchId: item.batchId,
            movementType: 'INTER_BRANCH_DISPATCH',
            quantityChange: qtyDec.negated(),
            runningBalance: new Decimal(0),
            referenceType: 'STOCK_TRANSFER_GIT',
            referenceId: transfer.id,
            unitCost: batch?.netLandingCost || new Decimal(0),
            notes: `Dispatched in GIT transfer ${dto.transferNumber}`,
          },
        });
      }

      return transfer;
    });
  }

  async receiveStockTransfer(transferId: string, dto: ReceiveStockTransferDto) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });
      if (!transfer) throw new NotFoundException(`Transfer ${transferId} not found`);

      // Find destination GODOWN bin
      let destBinId = dto.destinationBinId;
      if (!destBinId) {
        const destBin = await tx.storageBin.findFirst({
          where: { branchId: transfer.destinationBranchId, binType: 'GODOWN' },
        });
        destBinId = destBin?.id;
      }
      if (!destBinId) throw new BadRequestException('Destination branch missing receiving bin');

      let hasDiscrepancy = false;

      for (const receivedItem of dto.items) {
        const line = transfer.items.find((i) => i.id === receivedItem.transferItemId);
        if (!line) continue;

        const recQty = new Decimal(receivedItem.receivedQty);
        const shortQty = receivedItem.shortageQty ? new Decimal(receivedItem.shortageQty) : new Decimal(0);
        const damQty = receivedItem.damagedQty ? new Decimal(receivedItem.damagedQty) : new Decimal(0);

        if (shortQty.gt(0) || damQty.gt(0)) {
          hasDiscrepancy = true;
        }

        await tx.stockTransferItem.update({
          where: { id: line.id },
          data: {
            receivedQty: recQty,
            shortageQty: shortQty,
            damagedQty: damQty,
          },
        });

        // Add received stock to destination branch bin
        await tx.binStockBalance.upsert({
          where: {
            branchId_binId_batchId: {
              branchId: transfer.destinationBranchId,
              binId: destBinId,
              batchId: line.batchId,
            },
          },
          update: {
            quantity: { increment: recQty },
          },
          create: {
            tenantId: transfer.tenantId,
            branchId: transfer.destinationBranchId,
            binId: destBinId,
            productId: line.productId,
            batchId: line.batchId,
            quantity: recQty,
          },
        });

        const batch = await tx.inventoryBatch.findUnique({ where: { id: line.batchId } });

        await tx.stockLedger.create({
          data: {
            tenantId: transfer.tenantId,
            branchId: transfer.destinationBranchId,
            binId: destBinId,
            productId: line.productId,
            batchId: line.batchId,
            movementType: 'INTER_BRANCH_RECEIVE',
            quantityChange: recQty,
            runningBalance: recQty,
            referenceType: 'STOCK_TRANSFER_RECEIVE',
            referenceId: transfer.id,
            unitCost: batch?.netLandingCost || new Decimal(0),
            notes: `Received from GIT transfer ${transfer.transferNumber}`,
          },
        });
      }

      const updated = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: hasDiscrepancy ? 'RECEIVED_WITH_DISCREPANCY' : 'RECEIVED',
          receivedAt: new Date(),
        },
      });

      return updated;
    });
  }

  // 3. Live Cycle Counting (Stock Freeze Snapshot Audit)
  async startCycleCount(dto: StartCycleCountDto) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cycleCountSession.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          sessionNumber: dto.sessionNumber,
          rackOrCategoryZone: dto.rackOrCategoryZone,
          status: 'IN_PROGRESS',
        },
      });

      // Query current stock to freeze snapshot
      const balances = await tx.binStockBalance.findMany({
        where: {
          branchId: dto.branchId,
          ...(dto.binId ? { binId: dto.binId } : {}),
          ...(dto.categoryId ? { product: { categoryId: dto.categoryId } } : {}),
        },
        include: { batch: true },
      });

      for (const b of balances) {
        await tx.cycleCountItem.create({
          data: {
            sessionId: session.id,
            productId: b.productId,
            batchId: b.batchId,
            binId: b.binId,
            systemFrozenQty: b.quantity,
            physicalCountedQty: new Decimal(0),
            varianceQty: new Decimal(0),
            unitCostSnapshot: b.batch.netLandingCost,
          },
        });
      }

      return tx.cycleCountSession.findUnique({
        where: { id: session.id },
        include: { items: { include: { product: true, batch: true } } },
      });
    });
  }

  async submitCycleCounts(sessionId: string, dto: SubmitCycleCountsDto) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.countedItems) {
        const countItem = await tx.cycleCountItem.findUnique({
          where: { id: item.cycleCountItemId },
        });
        if (!countItem) continue;

        const physical = new Decimal(item.physicalCountedQty);
        const variance = physical.sub(countItem.systemFrozenQty);

        await tx.cycleCountItem.update({
          where: { id: item.cycleCountItemId },
          data: {
            physicalCountedQty: physical,
            varianceQty: variance,
            notes: item.notes,
          },
        });
      }

      return tx.cycleCountSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED_PENDING_APPROVAL',
        },
        include: { items: { include: { product: true, batch: true } } },
      });
    });
  }

  async approveCycleCount(sessionId: string, dto: ApproveCycleCountDto) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cycleCountSession.findUnique({
        where: { id: sessionId },
        include: { items: true },
      });
      if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

      for (const item of session.items) {
        if (!item.varianceQty.isZero()) {
          // Adjust physical balance to match verified count
          await tx.binStockBalance.update({
            where: {
              branchId_binId_batchId: {
                branchId: session.branchId,
                binId: item.binId,
                batchId: item.batchId,
              },
            },
            data: {
              quantity: item.physicalCountedQty,
            },
          });

          // Post audit adjustment to StockLedger
          await tx.stockLedger.create({
            data: {
              tenantId: session.tenantId,
              branchId: session.branchId,
              binId: item.binId,
              productId: item.productId,
              batchId: item.batchId,
              movementType: 'CYCLE_COUNT_ADJUSTMENT',
              quantityChange: item.varianceQty,
              runningBalance: item.physicalCountedQty,
              referenceType: 'CYCLE_COUNT_AUDIT',
              referenceId: session.sessionNumber,
              unitCost: item.unitCostSnapshot,
              notes: `Audited by manager ${dto.approvedByUserId}: variance ${item.varianceQty.toString()}`,
            },
          });
        }
      }

      return tx.cycleCountSession.update({
        where: { id: sessionId },
        data: {
          status: 'APPROVED',
          approvedByUserId: dto.approvedByUserId,
          completedAt: new Date(),
        },
      });
    });
  }
}
