import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal, PromotionTypeEnum } from '@ti-erp/database';
import { CreateRationComebackCouponDto } from './campaigns.dto';

export interface RfmSegmentSummary {
  championsCount: number;
  regularMonthlyCount: number;
  atRiskMissingRationCount: number;
  sleepingCount: number;
  totalCustomersAnalyzed: number;
  customers: {
    customerId: string;
    customerName: string;
    phone: string;
    tier: string;
    segment: string;
    recencyDays: number;
    frequency: number;
    monetaryTotal: number;
  }[];
}

@Injectable()
export class CustomerIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * RFM Segmentation Engine
   */
  async getRfmSegments(tenantId: string, branchId?: string): Promise<RfmSegmentSummary> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, isActive: true },
      include: {
        invoices: {
          where: {
            cancelledAt: null,
            ...(branchId ? { branchId } : {}),
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, netPayable: true, createdAt: true },
        },
      },
    });

    const now = Date.now();
    let championsCount = 0;
    let regularMonthlyCount = 0;
    let atRiskMissingRationCount = 0;
    let sleepingCount = 0;

    const classifiedList: RfmSegmentSummary['customers'] = [];

    for (const c of customers) {
      const invCount = c.invoices.length;
      let recencyDays = 999;
      let monetaryTotal = new Decimal(0);

      if (invCount > 0) {
        const lastInvDate = new Date(c.invoices[0].createdAt).getTime();
        recencyDays = Math.floor((now - lastInvDate) / (1000 * 60 * 60 * 24));
        monetaryTotal = c.invoices.reduce((sum, inv) => sum.add(inv.netPayable), new Decimal(0));
      }

      let segment = 'SLEEPING_CUSTOMERS';
      if (invCount >= 5 && recencyDays <= 14 && monetaryTotal.greaterThanOrEqualTo(15000)) {
        segment = 'CHAMPIONS';
        championsCount++;
      } else if (recencyDays <= 35 && invCount >= 2) {
        segment = 'REGULAR_MONTHLY_BUYERS';
        regularMonthlyCount++;
      } else if (recencyDays > 30 && recencyDays <= 65 && invCount >= 3) {
        segment = 'AT_RISK_MISSING_RATION';
        atRiskMissingRationCount++;
      } else {
        sleepingCount++;
      }

      // Calculate composite RFM Score (1.00 to 5.00)
      let rScore = recencyDays <= 14 ? 5 : recencyDays <= 30 ? 4 : recencyDays <= 60 ? 3 : 1;
      let fScore = invCount >= 10 ? 5 : invCount >= 5 ? 4 : invCount >= 2 ? 3 : 1;
      let mScore = monetaryTotal.greaterThanOrEqualTo(20000) ? 5 : monetaryTotal.greaterThanOrEqualTo(5000) ? 3 : 1;
      const compositeRfm = new Decimal((rScore * 0.4 + fScore * 0.3 + mScore * 0.3).toFixed(2));

      // Save RFM score asynchronously if changed
      await this.prisma.customer.update({
        where: { id: c.id },
        data: { rfmScore: compositeRfm },
      });

      classifiedList.push({
        customerId: c.id,
        customerName: c.name,
        phone: c.phone,
        tier: c.loyaltyTier,
        segment,
        recencyDays,
        frequency: invCount,
        monetaryTotal: Number(monetaryTotal),
      });
    }

    return {
      championsCount,
      regularMonthlyCount,
      atRiskMissingRationCount,
      sleepingCount,
      totalCustomersAnalyzed: customers.length,
      customers: classifiedList,
    };
  }

  /**
   * 1st-to-10th Monthly Grocery Cycle Missing Customers Detector
   */
  async getMissingMonthlyRationCustomers(tenantId: string, branchId?: string) {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Look for customers who explicitly have rationCycleDayStart (1-10)
    // or who bought in prior months but NOT in the current month
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { rationCycleDayStart: { gte: 1, lte: 10 } },
          { rfmScore: { gte: 2.5 } },
        ],
      },
      include: {
        invoices: {
          where: { cancelledAt: null },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { id: true, netPayable: true, createdAt: true },
        },
      },
    });

    const missingRationList = [];

    for (const c of customers) {
      const hasPurchasedThisMonth = c.invoices.some(
        (inv) => new Date(inv.createdAt) >= currentMonthStart,
      );

      // If already shopped this month, not missing!
      if (hasPurchasedThisMonth) continue;

      // Check if they shopped in previous months
      const pastInvoices = c.invoices.filter((inv) => new Date(inv.createdAt) < currentMonthStart);
      if (pastInvoices.length === 0) continue;

      const avgBasketSize =
        pastInvoices.reduce((sum, inv) => sum.add(inv.netPayable), new Decimal(0)).div(pastInvoices.length);

      const lastVisit = pastInvoices[0]?.createdAt;
      const daysSinceVisit = lastVisit
        ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
        : 45;

      const comebackCoupon = 'RATION100';
      const whatsappMsg = `Dear ${c.name},\nWe noticed you haven't picked up your monthly family groceries yet this month!\nWe miss you at TI Supermarket.\nUse coupon code *${comebackCoupon}* for *₹100 OFF* your monthly grocery basket of ₹1,000+ this week!\nClick here to view this week's offers: https://tierp.store/offers?code=${comebackCoupon}`;

      missingRationList.push({
        customerId: c.id,
        customerName: c.name,
        phone: c.phone,
        tier: c.loyaltyTier,
        daysSinceVisit,
        avgBasketSize: Number(avgBasketSize),
        lastVisitDate: lastVisit,
        recommendedCoupon: comebackCoupon,
        whatsappTemplate: whatsappMsg,
      });
    }

    return {
      count: missingRationList.length,
      currentMonth: today.toLocaleString('default', { month: 'long', year: 'numeric' }),
      missingShoppers: missingRationList,
    };
  }

  /**
   * 1-Click Generation of Ration Comeback Coupon in PromotionRule
   */
  async createRationComebackCoupon(dto: CreateRationComebackCouponDto) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (dto.validityDays ?? 7));

    const promo = await this.prisma.promotionRule.create({
      data: {
        tenantId: dto.tenantId,
        name: `Monthly Ration Comeback ₹${dto.discountAmount} Off`,
        promoType: PromotionTypeEnum.COUPON_CODE,
        couponCode: dto.couponCode.toUpperCase().trim(),
        conditionConfig: { minCartTotal: dto.minBillAmount },
        rewardConfig: { discountAmount: dto.discountAmount },
        startDate,
        endDate,
        isActive: true,
      },
    });

    return {
      success: true,
      promoId: promo.id,
      couponCode: promo.couponCode,
      discountAmount: dto.discountAmount,
      minBillAmount: dto.minBillAmount,
      validUntil: promo.endDate,
    };
  }
}
