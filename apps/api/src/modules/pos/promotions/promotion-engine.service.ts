import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal, PromotionTypeEnum } from '@ti-erp/database';
import { CreatePromotionDto, EvaluateCartDto } from './promotion.dto';

export interface AppliedPromotionResult {
  promoId: string;
  name: string;
  promoType: PromotionTypeEnum;
  discountAmount: number;
  description: string;
}

export interface UpsellNudge {
  targetThreshold: number;
  amountNeeded: number;
  rewardDescription: string;
  message: string;
}

export interface CartEvaluationOutput {
  totalCartGross: number;
  totalDiscountApplied: number;
  netCartTotal: number;
  appliedPromotions: AppliedPromotionResult[];
  lineDiscounts: Record<string, number>;
  upsellNudges: UpsellNudge[];
}

@Injectable()
export class PromotionEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async createPromotion(dto: CreatePromotionDto) {
    return this.prisma.promotionRule.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        promoType: dto.promoType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        activeDaysOfWeek: dto.activeDaysOfWeek ?? [1, 2, 3, 4, 5, 6, 7],
        startHourTime: dto.startHourTime,
        endHourTime: dto.endHourTime,
        priority: dto.priority ?? 100,
        couponCode: dto.couponCode ? dto.couponCode.toUpperCase() : null,
        conditionConfig: JSON.parse(JSON.stringify(dto.conditionConfig)),
        rewardConfig: JSON.parse(JSON.stringify(dto.rewardConfig)),
        isActive: true,
      },
    });
  }

  async listPromotions(tenantId: string) {
    return this.prisma.promotionRule.findMany({
      where: { tenantId },
      orderBy: { priority: 'asc' },
    });
  }

  /**
   * Evaluate Cart Promotions, BOGO, Mix & Match, Happy Hour & Live Upsell Nudges
   */
  async evaluateCartPromotions(dto: EvaluateCartDto): Promise<CartEvaluationOutput> {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1 = Mon, 7 = Sun
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Fetch active rules within valid date range
    const rules = await this.prisma.promotionRule.findMany({
      where: {
        tenantId: dto.tenantId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { priority: 'asc' },
    });

    let totalCartGross = new Decimal(0);
    for (const line of dto.cartLines) {
      totalCartGross = totalCartGross.add(new Decimal(line.lineTotal));
    }

    let totalDiscountApplied = new Decimal(0);
    const appliedPromos: AppliedPromotionResult[] = [];
    const lineDiscounts: Record<string, Decimal> = {};
    const upsellNudges: UpsellNudge[] = [];

    // Filter rules applicable today and this hour
    const activeRules = rules.filter((rule) => {
      // Days of week check
      if (Array.isArray(rule.activeDaysOfWeek) && rule.activeDaysOfWeek.length > 0) {
        if (!rule.activeDaysOfWeek.includes(dayOfWeek)) return false;
      }
      // Time window check (Happy hour)
      if (rule.startHourTime && rule.endHourTime) {
        if (currentHourMin < rule.startHourTime || currentHourMin > rule.endHourTime) {
          return false;
        }
      }
      // Coupon code check
      if (rule.couponCode && (!dto.couponCode || dto.couponCode.toUpperCase() !== rule.couponCode)) {
        return false;
      }
      return true;
    });

    // 1. Evaluate Item-Level Promotions (BOGO, Mix & Match, Happy Hour)
    for (const rule of activeRules) {
      const cond = rule.conditionConfig as any;
      const reward = rule.rewardConfig as any;

      if (rule.promoType === PromotionTypeEnum.BOGO) {
        // e.g., buyQty: 1, freeQty: 1 (Buy 1 Get 1) or discountOnSecondPct: 50
        const buyProductIds = (cond.productIds as string[]) || [];
        for (const line of dto.cartLines) {
          if (buyProductIds.length === 0 || buyProductIds.includes(line.productId)) {
            const buyQty = cond.buyQty || 1;
            const freeQty = cond.freeQty || 1;
            const dealPackSize = buyQty + freeQty;

            if (line.quantity >= dealPackSize) {
              const eligibleDeals = Math.floor(line.quantity / dealPackSize);
              const freeUnitsCount = eligibleDeals * freeQty;
              const discountPerFreeUnit = reward.discountPct
                ? new Decimal(line.unitPrice).mul(new Decimal(reward.discountPct)).div(100)
                : new Decimal(line.unitPrice);

              const promoDisc = discountPerFreeUnit.mul(new Decimal(freeUnitsCount)).toDecimalPlaces(2);
              if (promoDisc.greaterThan(0)) {
                totalDiscountApplied = totalDiscountApplied.add(promoDisc);
                lineDiscounts[line.productId] = (lineDiscounts[line.productId] || new Decimal(0)).add(promoDisc);
                appliedPromos.push({
                  promoId: rule.id,
                  name: rule.name,
                  promoType: rule.promoType,
                  discountAmount: Number(promoDisc),
                  description: `${rule.name}: ${freeUnitsCount} units discounted on ${line.productName}`,
                });
              }
            }
          }
        }
      } else if (rule.promoType === PromotionTypeEnum.MIX_AND_MATCH) {
        // e.g., Buy any 3 from Category -> Discount cheapest item
        const catId = cond.categoryId;
        const brandId = cond.brandId;
        const requiredCount = cond.minItemsCount || 3;

        const matchingLines = dto.cartLines.filter((l) => {
          if (catId && l.categoryId === catId) return true;
          if (brandId && l.brandId === brandId) return true;
          return false;
        });

        const totalMatchingUnits = matchingLines.reduce((acc, l) => acc + l.quantity, 0);
        if (totalMatchingUnits >= requiredCount) {
          // Sort by unit price ascending to find cheapest
          const sorted = [...matchingLines].sort((a, b) => a.unitPrice - b.unitPrice);
          const cheapest = sorted[0];
          const discountPct = reward.discountPct || 100;
          const promoDisc = new Decimal(cheapest.unitPrice).mul(new Decimal(discountPct)).div(100).toDecimalPlaces(2);

          totalDiscountApplied = totalDiscountApplied.add(promoDisc);
          lineDiscounts[cheapest.productId] = (lineDiscounts[cheapest.productId] || new Decimal(0)).add(promoDisc);
          appliedPromos.push({
            promoId: rule.id,
            name: rule.name,
            promoType: rule.promoType,
            discountAmount: Number(promoDisc),
            description: `${rule.name}: Discounted cheapest item (${cheapest.productName})`,
          });
        }
      } else if (rule.promoType === PromotionTypeEnum.HAPPY_HOUR) {
        // Time window already validated in filter
        const discountPct = reward.discountPct || 10;
        const eligibleCats = cond.categoryIds as string[] | undefined;

        for (const line of dto.cartLines) {
          if (!eligibleCats || (line.categoryId && eligibleCats.includes(line.categoryId))) {
            const lineGross = new Decimal(line.lineTotal);
            const disc = lineGross.mul(new Decimal(discountPct)).div(100).toDecimalPlaces(2);
            totalDiscountApplied = totalDiscountApplied.add(disc);
            lineDiscounts[line.productId] = (lineDiscounts[line.productId] || new Decimal(0)).add(disc);
            appliedPromos.push({
              promoId: rule.id,
              name: rule.name,
              promoType: rule.promoType,
              discountAmount: Number(disc),
              description: `Happy Hour ${discountPct}% off on ${line.productName}`,
            });
          }
        }
      }
    }

    // 2. Evaluate Cart-Slab Promotions & Live Upsell Nudges
    const cartGrossNum = Number(totalCartGross);
    const slabRules = rules.filter((r) => r.promoType === PromotionTypeEnum.CART_SLAB_UPSELL);

    for (const rule of slabRules) {
      const cond = rule.conditionConfig as any;
      const reward = rule.rewardConfig as any;
      const threshold = cond.minCartTotal || 2000;
      const rewardDesc = reward.description || (reward.discountAmount ? `Flat ₹${reward.discountAmount} Off` : 'Special Reward');

      if (cartGrossNum >= threshold) {
        // Qualified! Apply slab discount
        const disc = reward.discountAmount
          ? new Decimal(reward.discountAmount)
          : reward.discountPct
            ? totalCartGross.mul(new Decimal(reward.discountPct)).div(100)
            : new Decimal(0);

        if (disc.greaterThan(0)) {
          totalDiscountApplied = totalDiscountApplied.add(disc);
          appliedPromos.push({
            promoId: rule.id,
            name: rule.name,
            promoType: rule.promoType,
            discountAmount: Number(disc),
            description: `Cart Slab Qualified (≥ ₹${threshold}): ${rewardDesc}`,
          });
        }
      } else if (cartGrossNum >= threshold * 0.8 && cartGrossNum < threshold) {
        // CRUCIAL UPSELL NUDGE: Cart is between 80% and 99.9% of slab!
        const amountNeeded = Number((threshold - cartGrossNum).toFixed(2));
        upsellNudges.push({
          targetThreshold: threshold,
          amountNeeded,
          rewardDescription: rewardDesc,
          message: `Add ₹${amountNeeded.toFixed(2)} more to reach ₹${threshold} and unlock: ${rewardDesc}!`,
        });
      }
    }

    const netCartTotal = totalCartGross.sub(totalDiscountApplied).toDecimalPlaces(2);

    // Convert lineDiscounts from Decimal to number
    const lineDiscountsNum: Record<string, number> = {};
    for (const [k, v] of Object.entries(lineDiscounts)) {
      lineDiscountsNum[k] = Number(v);
    }

    return {
      totalCartGross: Number(totalCartGross),
      totalDiscountApplied: Number(totalDiscountApplied),
      netCartTotal: Number(netCartTotal),
      appliedPromotions: appliedPromos,
      lineDiscounts: lineDiscountsNum,
      upsellNudges,
    };
  }
}
