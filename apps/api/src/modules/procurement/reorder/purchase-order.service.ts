import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal, PoStatusEnum } from '@ti-erp/database';
import { CreatePurchaseOrderDto, UpdatePoStatusDto, DispatchWhatsAppDto } from './reorder.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async createPo(dto: CreatePurchaseOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Purchase Order must contain at least one line item');
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

    // Auto-generate PO number: PO-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const poNumber = `PO-${dateStr}-${randomSuffix}`;

    // Calculate line totals and PO total using Decimal
    let poTotal = new Decimal(0);
    const itemRecords = dto.items.map((item) => {
      const qty = new Decimal(item.orderedQty);
      const rate = new Decimal(item.unitPrice);
      const taxPct = new Decimal(item.taxPct);

      const baseAmount = qty.mul(rate);
      const taxAmount = baseAmount.mul(taxPct).div(100);
      const lineTotal = baseAmount.add(taxAmount).toDecimalPlaces(2);
      poTotal = poTotal.add(lineTotal);

      return {
        productId: item.productId,
        orderedQty: qty,
        unitPrice: rate,
        taxPct,
        totalAmount: lineTotal,
      };
    });

    return this.prisma.purchaseOrder.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        supplierId: dto.supplierId,
        poNumber,
        status: PoStatusEnum.DRAFT,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        totalAmount: poTotal,
        notes: dto.notes,
        items: {
          create: itemRecords,
        },
      },
      include: {
        supplier: true,
        branch: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async list(tenantId: string, branchId?: string, supplierId?: string, status?: PoStatusEnum) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        supplier: true,
        branch: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: {
          include: { tenant: true },
        },
        items: {
          include: {
            product: {
              include: { hsn: true },
            },
          },
        },
        goodsReceipts: {
          include: { lineItems: true },
        },
      },
    });
    if (!po) {
      throw new NotFoundException(`Purchase Order ${id} not found`);
    }
    return po;
  }

  async updateStatus(id: string, dto: UpdatePoStatusDto) {
    const po = await this.findOne(id);
    return this.prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: dto.status,
        notes: dto.notes ?? po.notes,
      },
      include: {
        supplier: true,
        branch: true,
        items: { include: { product: true } },
      },
    });
  }

  // 1-Click WhatsApp PO Generator
  async dispatchWhatsApp(id: string, dto?: DispatchWhatsAppDto) {
    const po = await this.findOne(id);

    // If status was DRAFT or APPROVED, advance to SENT_TO_VENDOR
    if (po.status === PoStatusEnum.DRAFT || po.status === PoStatusEnum.APPROVED) {
      await this.prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: PoStatusEnum.SENT_TO_VENDOR },
      });
    }

    const storeName = po.branch.name;
    const phone = dto?.targetPhoneNumber || po.supplier.phone;
    const cleanedPhone = phone.replace(/[^0-9]/g, '');

    const lines = po.items.map((item, idx) => {
      return `${idx + 1}. *${item.product.nameEn}*\n   Qty: ${Number(item.orderedQty)} ${item.product.baseUom} @ ₹${Number(item.unitPrice).toFixed(2)}`;
    });

    const expectedDateText = po.expectedDate
      ? `\nExpected Delivery: *${po.expectedDate.toISOString().slice(0, 10)}*`
      : '';

    const message = [
      `📦 *PURCHASE ORDER: ${po.poNumber}*`,
      `🏢 *Store:* ${storeName}`,
      `👤 *Supplier:* ${po.supplier.name}`,
      `📅 *Date:* ${po.createdAt.toISOString().slice(0, 10)}${expectedDateText}`,
      `---------------------------------`,
      `*ORDER ITEMS:*`,
      ...lines,
      `---------------------------------`,
      `💰 *Estimated Total: ₹${Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*`,
      dto?.customNote ? `\n📝 Note: ${dto.customNote}` : '',
      `\nPlease confirm delivery date and attach invoice upon dispatch. Thank you!`,
    ].filter(Boolean).join('\n');

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;

    return {
      poId: po.id,
      poNumber: po.poNumber,
      status: PoStatusEnum.SENT_TO_VENDOR,
      supplierName: po.supplier.name,
      supplierPhone: phone,
      formattedText: message,
      whatsappUrl,
    };
  }
}
