import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDeliveryOrderDto,
  UpdateDeliveryStatusDto,
  RiderSettlementDto,
} from './fulfillment.dto';
import {
  Decimal,
  DeliveryStatusEnum,
  PosInvoiceTypeEnum,
  PaymentMethodEnum,
} from '@ti-erp/database';

@Injectable()
export class HomeDeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create New Home Delivery Order from WhatsApp / Phone / Walk-in
   */
  async createDeliveryOrder(dto: CreateDeliveryOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer) throw new NotFoundException(`Customer ${dto.customerId} not found`);

      // Find terminal and shift for order creation
      const openShift = await tx.cashierShift.findFirst({
        where: { branchId: dto.branchId, status: 'OPEN' },
        include: { terminal: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!openShift) {
        throw new BadRequestException('An active open cashier shift is required to create a delivery order');
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randSuffix = Math.floor(1000 + Math.random() * 9000).toString();
      const orderNumber = `DEL-${dateStr}-${randSuffix}`;
      const invoiceNumber = `INV-DEL-${dateStr}-${randSuffix}`;

      // Calculate totals
      let totalGross = new Decimal(0);
      const linesData = [];

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { hsn: true },
        });
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

        const qty = new Decimal(item.quantity);
        const price = new Decimal(item.sellingPrice ?? 100);
        const mrp = new Decimal(item.mrp ?? item.sellingPrice ?? 100);
        const lineTotal = qty.mul(price);
        totalGross = totalGross.add(lineTotal);

        linesData.push({
          productId: product.id,
          quantity: qty,
          mrp,
          sellingPrice: price,
          netLandingCostSnapshot: new Decimal(0),
          taxableAmount: lineTotal,
          cgstAmount: new Decimal(0),
          sgstAmount: new Decimal(0),
          igstAmount: new Decimal(0),
          cessAmount: new Decimal(0),
          lineTotal,
        });
      }

      // Create linked POS Invoice with invoiceType: HOME_DELIVERY
      const invoice = await tx.posInvoice.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          terminalId: openShift.terminalId,
          shiftId: openShift.id,
          cashierId: openShift.cashierId,
          customerId: customer.id,
          invoiceNumber,
          invoiceType: PosInvoiceTypeEnum.HOME_DELIVERY,
          totalGrossAmount: totalGross,
          totalDiscountAmount: new Decimal(0),
          taxableAmount: totalGross,
          cgstAmount: new Decimal(0),
          sgstAmount: new Decimal(0),
          igstAmount: new Decimal(0),
          cessAmount: new Decimal(0),
          roundOff: new Decimal(0),
          netPayable: totalGross,
          lines: { create: linesData },
          payments: {
            create: [
              {
                method: PaymentMethodEnum.CASH,
                amount: totalGross,
              },
            ],
          },
        },
      });

      // Create DeliveryOrder
      const deliveryOrder = await tx.deliveryOrder.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          invoiceId: invoice.id,
          customerId: customer.id,
          orderNumber,
          deliveryAddress: dto.deliveryAddress.trim(),
          status: DeliveryStatusEnum.PICK_LIST_GENERATED,
          expectedDeliveryTime: dto.expectedDeliveryTime ? new Date(dto.expectedDeliveryTime) : null,
        },
        include: {
          customer: true,
          invoice: { include: { lines: { include: { product: true } } } },
        },
      });

      return deliveryOrder;
    });
  }

  /**
   * Generate Aisle & Rack-Sorted Walking Pick-List
   * Sorts items in physical supermarket sequence (Aisle -> Rack -> Shelf)
   * Enabling floor staff to pick 35 items in 5 minutes!
   */
  async getAisleSortedPickList(deliveryOrderId: string) {
    const deliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: {
        customer: true,
        invoice: {
          include: {
            lines: {
              include: {
                product: {
                  include: {
                    binStockBalances: {
                      where: {
                        quantity: { gt: 0 },
                        bin: { binType: 'SHOP_FLOOR' },
                      },
                      include: { bin: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!deliveryOrder) throw new NotFoundException(`Delivery order ${deliveryOrderId} not found`);

    const rawItems = deliveryOrder.invoice.lines.map((line) => {
      // Find the primary shelf location for this product on the shop floor
      const primaryBin = line.product.binStockBalances[0]?.bin;
      const aisle = primaryBin?.aisle || 'Z-Floor';
      const rack = primaryBin?.rack || 'R-00';
      const shelf = primaryBin?.shelf || 'S-00';
      const binCode = primaryBin?.binCode || 'SHOP-FLOOR';

      return {
        lineId: line.id,
        productId: line.productId,
        productName: line.product.nameEn,
        skuCode: line.product.skuCode,
        quantity: Number(line.quantity),
        sellingPrice: Number(line.sellingPrice),
        lineTotal: Number(line.lineTotal),
        location: {
          aisle,
          rack,
          shelf,
          binCode,
          sortKey: `${aisle}_${rack}_${shelf}`.toUpperCase(),
        },
      };
    });

    // Sort items by walking route: Aisle ASC -> Rack ASC -> Shelf ASC
    const sortedItems = rawItems.sort((a, b) => a.location.sortKey.localeCompare(b.location.sortKey));

    return {
      orderId: deliveryOrder.id,
      orderNumber: deliveryOrder.orderNumber,
      customerName: deliveryOrder.customer.name,
      customerPhone: deliveryOrder.customer.phone,
      deliveryAddress: deliveryOrder.deliveryAddress,
      totalItemsCount: sortedItems.length,
      status: deliveryOrder.status,
      walkingSequence: sortedItems,
    };
  }

  /**
   * Update Delivery Order Status (State Machine)
   */
  async updateDeliveryStatus(orderId: string, dto: UpdateDeliveryStatusDto) {
    const order = await this.prisma.deliveryOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Delivery order ${orderId} not found`);

    const updateData: any = {
      status: dto.status,
    };

    if (dto.assignedRiderName) updateData.assignedRiderName = dto.assignedRiderName.trim();
    if (dto.assignedRiderPhone) updateData.assignedRiderPhone = dto.assignedRiderPhone.trim();
    if (dto.codAmountCollected !== undefined) {
      updateData.codAmountCollected = new Decimal(dto.codAmountCollected);
    }
    if (dto.status === DeliveryStatusEnum.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    return this.prisma.deliveryOrder.update({
      where: { id: orderId },
      data: updateData,
      include: { customer: true, invoice: true },
    });
  }

  /**
   * Delivery Boy Evening Settlement & Reconciliation
   */
  async settleRiderShift(dto: RiderSettlementDto) {
    return this.prisma.$transaction(async (tx) => {
      const orders = await tx.deliveryOrder.findMany({
        where: {
          id: { in: dto.settledOrderIds },
          tenantId: dto.tenantId,
        },
      });

      if (orders.length === 0) {
        throw new BadRequestException('No matching orders found to settle');
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const settlementNumber = `SETTLE-${dto.riderName.replace(/\s+/g, '').toUpperCase()}-${dateStr}`;

      const totalCod = orders.reduce((sum, o) => {
        return o.codAmountCollected ? sum.add(o.codAmountCollected) : sum;
      }, new Decimal(0));

      const settlement = await tx.deliveryBoySettlement.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          settlementNumber,
          riderName: dto.riderName.trim(),
          totalOrdersDelivered: orders.filter((o) => o.status === DeliveryStatusEnum.DELIVERED).length,
          totalCodCollected: totalCod,
        },
      });

      // Link settlementId to each settled order
      await tx.deliveryOrder.updateMany({
        where: { id: { in: dto.settledOrderIds } },
        data: { settlementId: settlement.id },
      });

      const cashVariance = new Decimal(dto.totalCashCollected).sub(totalCod);

      return {
        settlementId: settlement.id,
        settlementNumber: settlement.settlementNumber,
        riderName: settlement.riderName,
        totalOrdersDelivered: settlement.totalOrdersDelivered,
        expectedCodTotal: Number(totalCod),
        actualCashReceived: dto.totalCashCollected,
        upiCollected: dto.totalUpiCollected ?? 0,
        cashVariance: Number(cashVariance),
        status: cashVariance.isZero() ? 'RECONCILED' : 'DISCREPANCY_FLAGGED',
        settledAt: settlement.settledAt,
      };
    });
  }

  /**
   * List Delivery Orders by Branch & Status
   */
  async getDeliveryOrders(tenantId: string, branchId: string, status?: DeliveryStatusEnum) {
    return this.prisma.deliveryOrder.findMany({
      where: {
        tenantId,
        branchId,
        ...(status ? { status } : {}),
      },
      include: {
        customer: true,
        invoice: { select: { netPayable: true, invoiceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
