import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IssueGiftCardDto } from './khata-giftcard.dto';
import { Decimal } from '@ti-erp/database';

@Injectable()
export class GiftCardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Issue New Prepaid Barcoded Gift Card
   */
  async issueGiftCard(dto: IssueGiftCardDto) {
    const amount = new Decimal(dto.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Gift card amount must be positive');
    }

    // Generate unique barcode if not provided
    const cardBarcode =
      dto.cardBarcode?.trim() || `GC-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const existing = await this.prisma.giftCard.findUnique({
      where: {
        tenantId_cardBarcode: {
          tenantId: dto.tenantId,
          cardBarcode,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(`Gift card ${cardBarcode} already exists`);
    }

    const expiryDays = dto.expiryDays ?? 365;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    const giftCard = await this.prisma.giftCard.create({
      data: {
        tenantId: dto.tenantId,
        cardBarcode,
        originalValue: amount,
        currentBalance: amount,
        expiryDate,
        isActive: true,
      },
    });

    return {
      id: giftCard.id,
      cardBarcode: giftCard.cardBarcode,
      originalValue: Number(giftCard.originalValue),
      currentBalance: Number(giftCard.currentBalance),
      expiryDate: giftCard.expiryDate,
      daysValid: expiryDays,
    };
  }

  /**
   * Validate Gift Card Barcode & Check Active Balance
   */
  async validateGiftCard(tenantId: string, cardBarcode: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: {
        tenantId_cardBarcode: {
          tenantId,
          cardBarcode: cardBarcode.trim(),
        },
      },
    });

    if (!card) throw new NotFoundException(`Gift card ${cardBarcode} not found`);
    if (!card.isActive) throw new BadRequestException(`Gift card ${cardBarcode} has been deactivated`);
    if (card.expiryDate < new Date()) {
      throw new BadRequestException(
        `Gift card ${cardBarcode} expired on ${card.expiryDate.toISOString().slice(0, 10)}`,
      );
    }

    return {
      cardBarcode: card.cardBarcode,
      originalValue: Number(card.originalValue),
      currentBalance: Number(card.currentBalance),
      expiryDate: card.expiryDate,
      isUsable: card.currentBalance.greaterThan(0),
    };
  }

  /**
   * List Issued Gift Cards
   */
  async getGiftCards(tenantId: string, limit = 50) {
    return this.prisma.giftCard.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
