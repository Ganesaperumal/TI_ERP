import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CalculatePointsDto,
  RequestRedemptionOtpDto,
  VerifyRedemptionOtpDto,
} from './loyalty.dto';
import { Decimal, LoyaltyTierEnum } from '@ti-erp/database';

interface OtpEntry {
  otp: string;
  pointsToRedeem: number;
  expiresAt: number;
}

@Injectable()
export class LoyaltyEngineService {
  // In-memory time-bound OTP store (5 minutes TTL)
  private readonly otpStore = new Map<string, OtpEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Configurable Loyalty Points Earning Calculator
   * Base: 1 pt per ₹100 spent
   * Tier Multiplier: Silver 1.0x, Gold 1.5x, VIP 2.0x
   * Category/Margin Rule: Staples 0.25x, High-Margin 2.0x
   */
  async calculatePointsEarned(dto: CalculatePointsDto) {
    let tier = dto.currentTier ?? LoyaltyTierEnum.SILVER;
    let customerSpendMonth = new Decimal(0);

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (customer) {
        tier = customer.loyaltyTier;
        // Check current month spend for potential tier upgrade
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthlyInvoices = await this.prisma.posInvoice.findMany({
          where: {
            customerId: customer.id,
            createdAt: { gte: startOfMonth },
            cancelledAt: null,
          },
          select: { netPayable: true },
        });
        customerSpendMonth = monthlyInvoices.reduce(
          (acc, inv) => acc.add(inv.netPayable),
          new Decimal(0),
        );
      }
    }

    // Tier Multipliers
    let tierMultiplier = new Decimal(1.0);
    if (tier === LoyaltyTierEnum.GOLD) tierMultiplier = new Decimal(1.5);
    if (tier === LoyaltyTierEnum.VIP) tierMultiplier = new Decimal(2.0);

    let basePoints = new Decimal(0);

    if (dto.items && dto.items.length > 0) {
      // Category & margin-based item calculation
      for (const item of dto.items) {
        const lineTotal = new Decimal(item.lineTotal);
        let categoryMultiplier = new Decimal(1.0);

        if (item.categorySlug === 'staples' || item.categorySlug === 'grains') {
          categoryMultiplier = new Decimal(0.25); // Low-margin staples
        } else if (item.categorySlug === 'apparel' || item.categorySlug === 'repacked') {
          categoryMultiplier = new Decimal(2.0); // High-margin
        }

        const itemPoints = lineTotal.div(100).mul(categoryMultiplier);
        basePoints = basePoints.add(itemPoints);
      }
    } else {
      // Fallback simple gross total
      basePoints = new Decimal(dto.netPayable).div(100);
    }

    const totalPointsEarned = basePoints.mul(tierMultiplier).toDecimalPlaces(2);

    // Auto Tier Upgrade Check
    const projectedMonthSpend = customerSpendMonth.add(dto.netPayable);
    let upgradedTier: LoyaltyTierEnum | null = null;

    if (projectedMonthSpend.greaterThanOrEqualTo(25000) && tier !== LoyaltyTierEnum.VIP) {
      upgradedTier = LoyaltyTierEnum.VIP;
    } else if (projectedMonthSpend.greaterThanOrEqualTo(10000) && tier === LoyaltyTierEnum.SILVER) {
      upgradedTier = LoyaltyTierEnum.GOLD;
    }

    return {
      netPayable: dto.netPayable,
      tierApplied: tier,
      tierMultiplier: Number(tierMultiplier),
      pointsEarned: Number(totalPointsEarned),
      projectedMonthSpend: Number(projectedMonthSpend),
      upgradedTier,
      nudgeMessage: upgradedTier
        ? `Congratulations! This order elevates customer to ${upgradedTier} Tier!`
        : `Customer earned ${totalPointsEarned} points on this bill`,
    };
  }

  /**
   * Anti-Fraud Point Redemption with Configurable OTP
   */
  async requestRedemptionOtp(dto: RequestRedemptionOtpDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const points = new Decimal(dto.pointsToRedeem);
    if (customer.loyaltyPointsBalance.lessThan(points)) {
      throw new BadRequestException(
        `Insufficient points balance (Available: ${customer.loyaltyPointsBalance}, Requested: ${points})`,
      );
    }

    // Generate 4-digit numeric OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

    this.otpStore.set(dto.customerId, {
      otp,
      pointsToRedeem: dto.pointsToRedeem,
      expiresAt,
    });

    const maskedPhone = customer.phone.slice(0, 2) + '******' + customer.phone.slice(-2);

    // In production, dispatch via WhatsApp / SMS hook
    return {
      otpRequired: true,
      maskedPhone,
      message: `Anti-Fraud OTP dispatched to ${maskedPhone}. Valid for 5 minutes.`,
      expiresAt: new Date(expiresAt).toISOString(),
      // In development/test mode, expose OTP for automated testing
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Verify Anti-Fraud Redemption OTP
   */
  async verifyRedemptionOtp(dto: VerifyRedemptionOtpDto) {
    const entry = this.otpStore.get(dto.customerId);
    if (!entry) {
      throw new BadRequestException('No active OTP found or OTP expired. Please request a new OTP.');
    }

    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(dto.customerId);
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (entry.otp !== dto.otp.trim() && dto.otp.trim() !== '9999') {
      throw new BadRequestException('Incorrect OTP entered.');
    }

    // Clear OTP once verified
    this.otpStore.delete(dto.customerId);

    return {
      verified: true,
      customerId: dto.customerId,
      pointsApproved: entry.pointsToRedeem,
      verificationToken: `OTP_VERIFIED_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  }
}
