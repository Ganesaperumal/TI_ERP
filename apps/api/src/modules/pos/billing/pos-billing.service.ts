import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Decimal,
  ShiftStatusEnum,
  StockMovementTypeEnum,
  StorageBinTypeEnum,
  PaymentMethodEnum,
  CreditNoteStatusEnum,
  PosInvoiceTypeEnum,
} from '@ti-erp/database';
import { PosCheckoutDto } from './billing.dto';

export interface HsnSummaryEntry {
  hsnCode: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
}

@Injectable()
export class PosBillingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomic POS Checkout Transaction & Invoice Generation
   */
  async checkout(dto: PosCheckoutDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Checkout requires at least one line item');
    }
    if (!dto.payments || dto.payments.length === 0) {
      throw new BadRequestException('Checkout requires at least one payment tender');
    }

    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: dto.shiftId },
      include: {
        terminal: true,
        cashier: true,
        branch: { include: { tenant: true } },
      },
    });
    if (!shift || shift.status !== ShiftStatusEnum.OPEN) {
      throw new BadRequestException(`Cashier shift ${dto.shiftId} is not in OPEN status`);
    }

    const branch = shift.branch;
    const tenantRegime = branch.tenant.gstRegime ?? 'REGULAR';
    const isComposition = tenantRegime === 'COMPOSITION';

    // Invoice Number Generator: INV-TERM01-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const invoiceNumber = `INV-${shift.terminal.terminalCode}-${dateStr}-${randSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      // Find shop floor bin for inventory deductions
      const shopFloorBin = await tx.storageBin.findFirst({
        where: {
          branchId: dto.branchId,
          binType: StorageBinTypeEnum.SHOP_FLOOR,
        },
      });
      const binId = shopFloorBin?.id ?? (await tx.storageBin.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          binCode: 'MAIN-FLOOR',
          binType: StorageBinTypeEnum.SHOP_FLOOR,
        },
      })).id;

      let totalGrossAmount = new Decimal(0);
      let totalDiscountAmount = new Decimal(0);
      let totalTaxableAmount = new Decimal(0);
      let totalCgst = new Decimal(0);
      let totalSgst = new Decimal(0);
      let totalIgst = new Decimal(0);
      let totalCess = new Decimal(0);
      let netPayable = new Decimal(0);

      const hsnSummaryMap = new Map<string, HsnSummaryEntry>();
      const preparedLines: any[] = [];

      for (const line of dto.lines) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          include: {
            hsn: true,
            comboAsParent: { include: { childProduct: true } },
          },
        });
        if (!product) throw new NotFoundException(`Product ${line.productId} not found`);

        const lineQty = new Decimal(line.quantity);
        const sellingPrice = new Decimal(line.sellingPrice);
        const mrp = new Decimal(line.mrp);
        const discountAmt = new Decimal(line.discountAmount ?? 0);

        const lineGross = lineQty.mul(sellingPrice);
        const lineNet = lineGross.sub(discountAmt).toDecimalPlaces(2);

        totalGrossAmount = totalGrossAmount.add(lineGross);
        totalDiscountAmount = totalDiscountAmount.add(discountAmt);
        netPayable = netPayable.add(lineNet);

        // Snapshot net landing cost
        let netCostSnapshot = new Decimal(0);
        let batchIdToUse = line.batchId;

        if (batchIdToUse) {
          const batch = await tx.inventoryBatch.findUnique({ where: { id: batchIdToUse } });
          if (batch) netCostSnapshot = batch.netLandingCost;
        } else {
          const latestBatch = await tx.inventoryBatch.findFirst({
            where: { branchId: dto.branchId, productId: line.productId },
            orderBy: { createdAt: 'desc' },
          });
          if (latestBatch) {
            netCostSnapshot = latestBatch.netLandingCost;
            batchIdToUse = latestBatch.id;
          }
        }

        // GST Inclusive Back-Calculation
        let lineTaxable = lineNet;
        let lineCgst = new Decimal(0);
        let lineSgst = new Decimal(0);
        let lineIgst = new Decimal(0);
        let lineCess = new Decimal(0);

        const gstRatePct = product.hsn ? product.hsn.igstRate : new Decimal(0);
        const cessRatePct = product.hsn?.cessRate ?? new Decimal(0);
        const totalTaxRatePct = gstRatePct.add(cessRatePct);

        if (!isComposition && totalTaxRatePct.greaterThan(0)) {
          // Formula: Taxable = Net / (1 + TaxRate/100)
          const divisor = new Decimal(1).add(totalTaxRatePct.div(100));
          lineTaxable = lineNet.div(divisor).toDecimalPlaces(2);
          const totalTaxVal = lineNet.sub(lineTaxable);

          // Standard intra-state split (CGST + SGST)
          const halfGstRate = gstRatePct.div(2);
          lineCgst = lineTaxable.mul(halfGstRate).div(100).toDecimalPlaces(2);
          lineSgst = lineTaxable.mul(halfGstRate).div(100).toDecimalPlaces(2);
          if (cessRatePct.greaterThan(0)) {
            lineCess = lineTaxable.mul(cessRatePct).div(100).toDecimalPlaces(2);
          }
        }

        totalTaxableAmount = totalTaxableAmount.add(lineTaxable);
        totalCgst = totalCgst.add(lineCgst);
        totalSgst = totalSgst.add(lineSgst);
        totalIgst = totalIgst.add(lineIgst);
        totalCess = totalCess.add(lineCess);

        // HSN Summary aggregation
        const hsnCode = product.hsn?.hsnCode ?? 'GENERAL';
        const existingHsn = hsnSummaryMap.get(hsnCode) || {
          hsnCode,
          taxableAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          cessAmount: 0,
          totalTax: 0,
        };
        existingHsn.taxableAmount += Number(lineTaxable);
        existingHsn.cgstAmount += Number(lineCgst);
        existingHsn.sgstAmount += Number(lineSgst);
        existingHsn.igstAmount += Number(lineIgst);
        existingHsn.cessAmount += Number(lineCess);
        existingHsn.totalTax += Number(lineCgst.add(lineSgst).add(lineIgst).add(lineCess));
        hsnSummaryMap.set(hsnCode, existingHsn);

        // Stock Deduction & Ledger Recording
        if (product.productType === 'COMBO_KIT' && product.comboAsParent.length > 0) {
          // Deduct underlying BOM components from Shop Floor
          for (const bomItem of product.comboAsParent) {
            const childDeductQty = bomItem.quantityRequired.mul(lineQty);
            const childBatch = await tx.inventoryBatch.findFirst({
              where: { branchId: dto.branchId, productId: bomItem.childProductId },
              orderBy: { createdAt: 'desc' },
            });

            if (childBatch) {
              const childBalance = await tx.binStockBalance.findUnique({
                where: {
                  branchId_binId_batchId: {
                    branchId: dto.branchId,
                    binId,
                    batchId: childBatch.id,
                  },
                },
              });
              const newChildQty = childBalance ? childBalance.quantity.sub(childDeductQty) : childDeductQty.negated();

              await tx.binStockBalance.upsert({
                where: {
                  branchId_binId_batchId: {
                    branchId: dto.branchId,
                    binId,
                    batchId: childBatch.id,
                  },
                },
                update: { quantity: newChildQty },
                create: {
                  tenantId: dto.tenantId,
                  branchId: dto.branchId,
                  binId,
                  productId: bomItem.childProductId,
                  batchId: childBatch.id,
                  quantity: newChildQty,
                },
              });

              await tx.stockLedger.create({
                data: {
                  tenantId: dto.tenantId,
                  branchId: dto.branchId,
                  binId,
                  productId: bomItem.childProductId,
                  batchId: childBatch.id,
                  movementType: StockMovementTypeEnum.POS_SALE,
                  quantityChange: childDeductQty.negated(),
                  runningBalance: newChildQty,
                  referenceType: 'POS_INVOICE',
                  referenceId: invoiceNumber,
                  unitCost: childBatch.netLandingCost,
                  notes: `Combo BOM Sale: ${product.nameEn} (Parent) -> ${bomItem.childProduct.nameEn}`,
                },
              });
            }
          }
        } else if (batchIdToUse) {
          // Standard Single SKU deduction
          const currentBal = await tx.binStockBalance.findUnique({
            where: {
              branchId_binId_batchId: {
                branchId: dto.branchId,
                binId,
                batchId: batchIdToUse,
              },
            },
          });
          const newQty = currentBal ? currentBal.quantity.sub(lineQty) : lineQty.negated();

          await tx.binStockBalance.upsert({
            where: {
              branchId_binId_batchId: {
                branchId: dto.branchId,
                binId,
                batchId: batchIdToUse,
              },
            },
            update: { quantity: newQty },
            create: {
              tenantId: dto.tenantId,
              branchId: dto.branchId,
              binId,
              productId: line.productId,
              batchId: batchIdToUse,
              quantity: newQty,
            },
          });

          await tx.stockLedger.create({
            data: {
              tenantId: dto.tenantId,
              branchId: dto.branchId,
              binId,
              productId: line.productId,
              batchId: batchIdToUse,
              movementType: StockMovementTypeEnum.POS_SALE,
              quantityChange: lineQty.negated(),
              runningBalance: newQty,
              referenceType: 'POS_INVOICE',
              referenceId: invoiceNumber,
              unitCost: netCostSnapshot,
              notes: `POS Bill ${invoiceNumber}`,
            },
          });
        }

        preparedLines.push({
          productId: line.productId,
          batchId: batchIdToUse,
          hsnId: product.hsnId,
          barcodeScanned: line.barcodeScanned,
          quantity: lineQty,
          mrp,
          sellingPrice,
          netLandingCostSnapshot: netCostSnapshot,
          discountAmount: discountAmt,
          promoId: line.promoId,
          taxableAmount: lineTaxable,
          cgstAmount: lineCgst,
          sgstAmount: lineSgst,
          igstAmount: lineIgst,
          cessAmount: lineCess,
          lineTotal: lineNet,
        });
      }

      // Multi-Mode Split Payment Validation
      let totalTendered = new Decimal(0);
      const paymentRecords: any[] = [];

      for (const p of dto.payments) {
        const amt = new Decimal(p.amount);
        totalTendered = totalTendered.add(amt);

        let slipId: string | undefined = undefined;

        // If Credit Note Slip used, verify & redeem
        if (p.method === PaymentMethodEnum.CREDIT_NOTE_SLIP && p.creditNoteSlipBarcode) {
          const slip = await tx.creditNoteSlip.findUnique({
            where: {
              tenantId_barcode: {
                tenantId: dto.tenantId,
                barcode: p.creditNoteSlipBarcode,
              },
            },
          });
          if (!slip || slip.status !== CreditNoteStatusEnum.ACTIVE) {
            throw new BadRequestException(`Credit note slip ${p.creditNoteSlipBarcode} is invalid or already redeemed`);
          }
          if (slip.balanceAmount.lessThan(amt)) {
            throw new BadRequestException(`Credit note balance ₹${slip.balanceAmount} is insufficient for tender ₹${amt}`);
          }

          const newSlipBal = slip.balanceAmount.sub(amt);
          await tx.creditNoteSlip.update({
            where: { id: slip.id },
            data: {
              balanceAmount: newSlipBal,
              status: newSlipBal.isZero() ? CreditNoteStatusEnum.REDEEMED : CreditNoteStatusEnum.ACTIVE,
            },
          });
          slipId = slip.id;
        }

        // Cash change calculation
        let cashTenderedDec: Decimal | undefined = undefined;
        let cashChangeDec: Decimal | undefined = undefined;
        if (p.method === PaymentMethodEnum.CASH && p.cashTendered) {
          cashTenderedDec = new Decimal(p.cashTendered);
          cashChangeDec = cashTenderedDec.greaterThan(amt)
            ? cashTenderedDec.sub(amt).toDecimalPlaces(2)
            : new Decimal(0);
        }

        paymentRecords.push({
          method: p.method,
          amount: amt,
          cashTendered: cashTenderedDec,
          cashChangeReturned: cashChangeDec,
          edcTerminalRef: p.edcTerminalRef,
          upiTxnId: p.upiTxnId,
          creditNoteSlipId: slipId,
          giftCardNumber: p.giftCardNumber,
        });
      }

      // Verify payment sum matches net payable
      if (!totalTendered.equals(netPayable)) {
        throw new BadRequestException(
          `Total payment tenders (₹${totalTendered.toFixed(2)}) do not match Net Payable (₹${netPayable.toFixed(2)})`,
        );
      }

      // Create PosInvoice
      const invoice = await tx.posInvoice.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          terminalId: dto.terminalId,
          shiftId: dto.shiftId,
          cashierId: dto.cashierId,
          customerId: dto.customerId,
          invoiceNumber,
          invoiceType: dto.invoiceType ?? PosInvoiceTypeEnum.WALK_IN_RETAIL,
          totalGrossAmount,
          totalDiscountAmount,
          taxableAmount: totalTaxableAmount,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          cessAmount: totalCess,
          roundOff: new Decimal(0),
          netPayable,
          isReturnBill: false,
          lines: {
            create: preparedLines,
          },
          payments: {
            create: paymentRecords,
          },
        },
        include: {
          lines: { include: { product: true } },
          payments: true,
          terminal: true,
          branch: { include: { tenant: true } },
        },
      });

      // Clear parked bill if specified
      if (dto.parkedBillIdToClear) {
        await tx.posParkedBill.update({
          where: { id: dto.parkedBillIdToClear },
          data: { isRecalled: true, recalledAt: new Date() },
        });
      }

      const totalSavings = totalDiscountAmount.add(
        preparedLines.reduce((acc, l) => {
          const itemSave = l.mrp.sub(l.sellingPrice).mul(l.quantity);
          return itemSave.greaterThan(0) ? acc.add(itemSave) : acc;
        }, new Decimal(0)),
      );

      return {
        invoice,
        hsnSummary: Array.from(hsnSummaryMap.values()),
        totalSavingsToday: Number(totalSavings),
        receiptPreview: {
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.createdAt,
          storeName: branch.name,
          gstin: branch.gstin ?? 'UNREGISTERED',
          cashierName: shift.cashier.fullName,
          terminalCode: shift.terminal.terminalCode,
          itemsCount: preparedLines.length,
          netPayable: Number(netPayable),
          totalSavings: Number(totalSavings),
        },
      };
    });
  }

  async getInvoiceByNumber(invoiceNumber: string) {
    const invoice = await this.prisma.posInvoice.findFirst({
      where: { invoiceNumber },
      include: {
        lines: { include: { product: { include: { hsn: true } }, batch: true } },
        payments: true,
        terminal: true,
        branch: true,
      },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceNumber} not found`);
    return invoice;
  }
}
