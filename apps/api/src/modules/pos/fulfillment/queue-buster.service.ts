import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateQueueTokenDto } from './fulfillment.dto';

@Injectable()
export class QueueBusterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mobile mPOS Queue-Buster Cart Scanner:
   * Generates a short 6-character Token (e.g. "QB-4092") for rapid checkout
   */
  async createQueueToken(dto: CreateQueueTokenDto) {
    if (!dto.cartData || dto.cartData.length === 0) {
      throw new BadRequestException('Cart must contain at least one item to generate a Queue Token');
    }

    // Generate short 6-character scannable code: QB-XXXX
    const tokenSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const tokenCode = `QB-${tokenSuffix}`;

    // Store pre-scanned cart in PosParkedBill with parkReference = tokenCode
    const parkedBill = await this.prisma.posParkedBill.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        terminalId: dto.terminalId,
        cashierId: dto.cashierId,
        parkReference: tokenCode,
        customerPhone: dto.customerPhone || null,
        cartData: dto.cartData,
        isRecalled: false,
      },
    });

    const totalEstimate = dto.cartData.reduce((sum: number, item: any) => {
      const qty = item.quantity ?? 1;
      const price = item.sellingPrice ?? item.mrp ?? 0;
      return sum + qty * price;
    }, 0);

    return {
      success: true,
      tokenCode,
      barcode: tokenCode,
      parkedBillId: parkedBill.id,
      itemCount: dto.cartData.length,
      estimatedTotal: Number(totalEstimate.toFixed(2)),
      customerPhone: dto.customerPhone ?? null,
      generatedAt: parkedBill.parkedAt,
      instructions: 'Hand this token/barcode to customer to present at cash counter for instant billing.',
    };
  }

  /**
   * Fast Recall Queue-Buster Cart at POS Counter by Token Code (e.g. "QB-4092")
   */
  async getQueueTokenCart(tenantId: string, branchId: string, tokenCode: string) {
    const trimmedToken = tokenCode.trim().toUpperCase();

    const parkedBill = await this.prisma.posParkedBill.findFirst({
      where: {
        tenantId,
        branchId,
        parkReference: trimmedToken,
        isRecalled: false,
      },
      include: {
        terminal: true,
      },
    });

    if (!parkedBill) {
      throw new NotFoundException(
        `Queue Token "${trimmedToken}" not found or already recalled and billed.`,
      );
    }

    return {
      tokenCode: parkedBill.parkReference,
      parkedBillId: parkedBill.id,
      customerPhone: parkedBill.customerPhone,
      cartData: parkedBill.cartData,
      parkedAt: parkedBill.parkedAt,
    };
  }
}
