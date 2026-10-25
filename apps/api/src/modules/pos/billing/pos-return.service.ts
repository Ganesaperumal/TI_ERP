import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Decimal,
  StockMovementTypeEnum,
  StorageBinTypeEnum,
  RefundModeEnum,
  CreditNoteStatusEnum,
  AuditExceptionTypeEnum,
} from '@ti-erp/database';
import { ProcessSalesReturnDto } from './billing.dto';

@Injectable()
export class PosReturnService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process Sales Return, Instant Counter Exchange & Barcoded Credit Note Slip
   */
  async processSalesReturn(dto: ProcessSalesReturnDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Sales return must contain at least one line item');
    }

    // If Cash refund requested, verify supervisor PIN override
    if (dto.refundMode === RefundModeEnum.CASH_REFUND) {
      if (!dto.supervisorPin || (dto.supervisorPin !== '9999' && dto.supervisorPin !== '1234')) {
        throw new BadRequestException('Cash refund requires valid Supervisor PIN override authorization');
      }
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { tenant: true },
    });
    if (!branch) throw new NotFoundException(`Branch ${dto.branchId} not found`);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const returnNumber = `RET-${dateStr}-${randSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      let totalRefundAmount = new Decimal(0);
      const returnLinesData: any[] = [];

      for (const line of dto.lines) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product) throw new NotFoundException(`Product ${line.productId} not found`);

        const returnQty = new Decimal(line.returnedQty);
        const refundRate = new Decimal(line.refundRate);
        const lineRefundTotal = returnQty.mul(refundRate).toDecimalPlaces(2);
        totalRefundAmount = totalRefundAmount.add(lineRefundTotal);

        // Target bin: DAMAGED_RETURNABLE if defective, else SHOP_FLOOR
        const targetBinType = line.isDefectiveDamaged
          ? StorageBinTypeEnum.DAMAGED_RETURNABLE
          : StorageBinTypeEnum.SHOP_FLOOR;

        let targetBin = await tx.storageBin.findFirst({
          where: { branchId: dto.branchId, binType: targetBinType },
        });
        if (!targetBin) {
          targetBin = await tx.storageBin.create({
            data: {
              tenantId: dto.tenantId,
              branchId: dto.branchId,
              binCode: line.isDefectiveDamaged ? 'DAMAGED-RETURNS' : 'SHOP-RETURNS',
              binType: targetBinType,
            },
          });
        }

        // Batch resolution
        let batchId = line.batchId;
        if (!batchId) {
          const latestBatch = await tx.inventoryBatch.findFirst({
            where: { branchId: dto.branchId, productId: line.productId },
            orderBy: { createdAt: 'desc' },
          });
          batchId = latestBatch?.id;
        }

        if (batchId) {
          // Restore stock in bin
          const currentBal = await tx.binStockBalance.findUnique({
            where: {
              branchId_binId_batchId: {
                branchId: dto.branchId,
                binId: targetBin.id,
                batchId,
              },
            },
          });
          const newQty = currentBal ? currentBal.quantity.add(returnQty) : returnQty;

          await tx.binStockBalance.upsert({
            where: {
              branchId_binId_batchId: {
                branchId: dto.branchId,
                binId: targetBin.id,
                batchId,
              },
            },
            update: { quantity: newQty },
            create: {
              tenantId: dto.tenantId,
              branchId: dto.branchId,
              binId: targetBin.id,
              productId: line.productId,
              batchId,
              quantity: returnQty,
            },
          });

          // Stock Ledger: INWARD / SALES_RETURN
          await tx.stockLedger.create({
            data: {
              tenantId: dto.tenantId,
              branchId: dto.branchId,
              binId: targetBin.id,
              productId: line.productId,
              batchId,
              movementType: StockMovementTypeEnum.SALES_RETURN,
              quantityChange: returnQty,
              runningBalance: newQty,
              referenceType: 'SALES_RETURN',
              referenceId: returnNumber,
              unitCost: refundRate,
              notes: `Customer Return ${returnNumber} (${line.isDefectiveDamaged ? 'Defective' : 'Resellable'})`,
            },
          });
        }

        returnLinesData.push({
          productId: line.productId,
          batchId,
          returnedQty: returnQty,
          refundRate,
          lineTotal: lineRefundTotal,
          returnReason: dto.reason ?? 'Customer Return',
        });
      }

      // Create SalesReturn record
      const salesReturn = await tx.salesReturn.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          originalInvoiceId: dto.originalInvoiceId,
          returnNumber,
          refundMode: dto.refundMode,
          totalRefundAmount,
          reason: dto.reason,
          approvedByUserId: dto.cashierId,
          lines: {
            create: returnLinesData,
          },
        },
        include: {
          lines: true,
        },
      });

      // Handle Refund Mode Outputs
      let creditNoteSlip = null;

      if (dto.refundMode === RefundModeEnum.CREDIT_NOTE) {
        // Generate barcoded CreditNoteSlip valid for 90 days
        const slipNumber = `CN-${dateStr}-${randSuffix}`;
        const slipBarcode = `99${dateStr.slice(2)}${randSuffix}`;
        const expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

        creditNoteSlip = await tx.creditNoteSlip.create({
          data: {
            tenantId: dto.tenantId,
            branchId: dto.branchId,
            salesReturnId: salesReturn.id,
            slipNumber,
            barcode: slipBarcode,
            originalAmount: totalRefundAmount,
            balanceAmount: totalRefundAmount,
            status: CreditNoteStatusEnum.ACTIVE,
            expiryDate,
          },
        });
      } else if (dto.refundMode === RefundModeEnum.CASH_REFUND) {
        // Log Cash Refund Exception
        await tx.auditExceptionLog.create({
          data: {
            tenantId: dto.tenantId,
            branchId: dto.branchId,
            terminalId: dto.terminalId,
            cashierId: dto.cashierId,
            exceptionType: AuditExceptionTypeEnum.NO_SALE_DRAWER_KICK,
            referenceEntity: 'SalesReturn',
            referenceId: salesReturn.id,
            reason: `Cash refund of ₹${totalRefundAmount.toFixed(2)} authorized by supervisor`,
            metadata: { totalRefundAmount: Number(totalRefundAmount), returnNumber },
          },
        });
      }

      return {
        salesReturn,
        creditNoteSlip,
        totalRefundAmount: Number(totalRefundAmount),
        refundMode: dto.refundMode,
      };
    });
  }
}
