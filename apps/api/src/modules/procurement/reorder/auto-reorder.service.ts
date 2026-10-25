import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@ti-erp/database';
import { GetReorderSuggestionsQueryDto } from './reorder.dto';

export interface RecommendedSupplier {
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  lastPurchaseRate: number;
  lastNetLandingCost: number;
  totalHistoricalFreeQty: number;
  lastSuppliedDate?: Date;
  isLowestCost: boolean;
}

export interface ReorderSuggestion {
  productId: string;
  skuCode: string;
  productName: string;
  baseUom: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  dailySalesVelocity: number;
  daysOfStockRemaining: number;
  suggestedReorderQty: number;
  triggerReason: string;
  algorithm: 'MIN_MAX' | 'SALES_VELOCITY' | 'HYBRID';
  recommendedSuppliers: RecommendedSupplier[];
  bestSupplier?: RecommendedSupplier;
}

@Injectable()
export class AutoReorderService {
  constructor(private readonly prisma: PrismaService) {}

  async getReorderSuggestions(
    query: GetReorderSuggestionsQueryDto,
  ): Promise<{ branchId: string; totalSuggestions: number; items: ReorderSuggestion[] }> {
    const { branchId, rule = 'HYBRID', velocityDays = 14 } = query;

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }

    const tenantId = branch.tenantId;
    const velocityWindowStartDate = new Date(Date.now() - velocityDays * 24 * 60 * 60 * 1000);

    // Fetch active products with bin balances and recent POS sales
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        binStockBalances: {
          where: {
            branchId,
            bin: {
              binType: {
                in: ['SHOP_FLOOR', 'GODOWN'],
              },
            },
          },
        },
        invoiceLines: {
          where: {
            invoice: {
              branchId,
              cancelledAt: null,
              createdAt: { gte: velocityWindowStartDate },
            },
          },
          select: {
            quantity: true,
          },
        },
        grnLines: {
          take: 20,
          orderBy: { grn: { createdAt: 'desc' } },
          include: {
            grn: {
              include: {
                supplier: true,
              },
            },
          },
        },
      },
    });

    const suggestions: ReorderSuggestion[] = [];

    for (const prod of products) {
      // 1. Current available stock in SHOP_FLOOR + GODOWN
      const currentStockDec = prod.binStockBalances.reduce(
        (acc, b) => acc.add(b.quantity),
        new Decimal(0),
      );
      const currentStock = Number(currentStockDec);
      const minStock = Number(prod.minStock);
      const maxStock = Number(prod.maxStock);

      // 2. Sales velocity computation
      const totalSoldInWindowDec = prod.invoiceLines.reduce(
        (acc, line) => acc.add(line.quantity),
        new Decimal(0),
      );
      const totalSoldInWindow = Number(totalSoldInWindowDec);
      const dailySalesVelocity = totalSoldInWindow / velocityDays;
      const daysOfStockRemaining =
        dailySalesVelocity > 0 ? currentStock / dailySalesVelocity : 999;

      const leadTimeDays = 3; // Standard 3 days reorder lead time
      const targetCoverDays = 7; // Maintain 7 days buffer stock

      let shouldReorder = false;
      let suggestedQty = 0;
      let triggerReason = '';
      let algoUsed: 'MIN_MAX' | 'SALES_VELOCITY' | 'HYBRID' = rule;

      // Evaluation based on rules
      const minMaxTriggered = minStock > 0 && currentStock <= minStock;
      const velocityTriggered = dailySalesVelocity > 0 && daysOfStockRemaining <= leadTimeDays;

      if (rule === 'MIN_MAX' || rule === 'HYBRID') {
        if (minMaxTriggered) {
          shouldReorder = true;
          suggestedQty = maxStock > currentStock ? maxStock - currentStock : minStock;
          triggerReason = `BELOW_MIN_STOCK (Current: ${currentStock.toFixed(2)}, Min: ${minStock.toFixed(2)})`;
          algoUsed = 'MIN_MAX';
        }
      }

      if ((rule === 'SALES_VELOCITY' || rule === 'HYBRID') && (!shouldReorder || rule === 'SALES_VELOCITY')) {
        if (velocityTriggered) {
          shouldReorder = true;
          const neededCover = dailySalesVelocity * (leadTimeDays + targetCoverDays);
          suggestedQty = Math.max(suggestedQty, Math.ceil(neededCover - currentStock));
          triggerReason = `HIGH_SALES_VELOCITY (Stock runs out in ${daysOfStockRemaining.toFixed(1)} days; Daily sales: ${dailySalesVelocity.toFixed(2)})`;
          algoUsed = 'SALES_VELOCITY';
        }
      }

      if (shouldReorder && suggestedQty > 0) {
        // Find best historical suppliers
        const supplierMap = new Map<
          string,
          {
            supplierId: string;
            supplierName: string;
            supplierPhone: string;
            minNetLandingCost: Decimal;
            lastPurchaseRate: Decimal;
            totalFreeQty: Decimal;
            lastDate?: Date;
          }
        >();

        for (const line of prod.grnLines) {
          const supp = line.grn.supplier;
          if (!supp) continue;

          const existing = supplierMap.get(supp.id);
          if (!existing) {
            supplierMap.set(supp.id, {
              supplierId: supp.id,
              supplierName: supp.name,
              supplierPhone: supp.phone,
              minNetLandingCost: line.netLandingCost,
              lastPurchaseRate: line.purchaseRate,
              totalFreeQty: line.freeSchemeQty,
              lastDate: line.grn.createdAt,
            });
          } else {
            if (line.netLandingCost.lessThan(existing.minNetLandingCost)) {
              existing.minNetLandingCost = line.netLandingCost;
              existing.lastPurchaseRate = line.purchaseRate;
            }
            existing.totalFreeQty = existing.totalFreeQty.add(line.freeSchemeQty);
          }
        }

        const sortedSuppliers = Array.from(supplierMap.values()).sort((a, b) =>
          a.minNetLandingCost.comparedTo(b.minNetLandingCost),
        );

        const recommendedSuppliers: RecommendedSupplier[] = sortedSuppliers
          .slice(0, 2)
          .map((s, idx) => ({
            supplierId: s.supplierId,
            supplierName: s.supplierName,
            supplierPhone: s.supplierPhone,
            lastPurchaseRate: Number(s.lastPurchaseRate),
            lastNetLandingCost: Number(s.minNetLandingCost),
            totalHistoricalFreeQty: Number(s.totalFreeQty),
            lastSuppliedDate: s.lastDate,
            isLowestCost: idx === 0,
          }));

        suggestions.push({
          productId: prod.id,
          skuCode: prod.skuCode,
          productName: prod.nameEn,
          baseUom: prod.baseUom,
          currentStock,
          minStock,
          maxStock,
          dailySalesVelocity: Number(dailySalesVelocity.toFixed(2)),
          daysOfStockRemaining: Number(daysOfStockRemaining.toFixed(1)),
          suggestedReorderQty: suggestedQty,
          triggerReason,
          algorithm: algoUsed,
          recommendedSuppliers,
          bestSupplier: recommendedSuppliers[0],
        });
      }
    }

    return {
      branchId,
      totalSuggestions: suggestions.length,
      items: suggestions,
    };
  }
}
