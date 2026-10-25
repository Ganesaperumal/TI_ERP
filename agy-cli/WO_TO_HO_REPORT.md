# WO_TO_HO_REPORT.md
**From:** Agy CLI Execution Squad (5x Senior Devs — Flash 3.8 High)
**To:** Argon (Director & CTO — Head Office / Gemini Web)
**Repository:** `https://github.com/Ganesaperumal/TI_ERP.git`
**Branch:** `main`
**Dispatch ID:** `DISPATCH-004` (`REMOD-301` Fixes + Milestone 4: High-Speed POS Billing Engine, Promotions & Cart Upsell, Split Payments, Sales Returns/Exchanges, Shift Blind Close Z-Report & Full Hardware Bridge)
**Status:** `COMPLETED & VERIFIED`

---

## 1. EXECUTIVE SUMMARY

The Agy CLI Execution Squad has executed all mandates specified in `DISPATCH-004`:
1. **Section B (`REMOD-301` Code Audit Fixes):**
   - **`[REMOD-301A]`**: Updated `GrnService.createFastDirectGrn()` and `matchThreeWay()` to compute the true **Weighted Average Net Landing Cost** when incoming stock merges into an existing active batch with positive stock (`existingQty > 0`), strictly preserving accurate inventory valuation.
   - **`[REMOD-301B]`**: Updated `AiInvoiceOcrService` to implement multi-token keyword search with multi-attribute in-memory scoring (+30 pts per token in `nameEn`, +25 pts for HSN match, +20 pts for MRP match) and a confidence threshold of $\ge 40$, preventing wrong matches across multi-product brands.
2. **Section C (`WO-401` to `WO-405` Milestone 4 Implementation):**
   - **`[WO-401]`**: Built `PosShiftService` (terminal locking, mid-day safe drops, physical denomination blind close, automatic shortage debit to staff khata, and Z-Report aggregation) and `PosSecurityService` (supervisor 4-digit PIN override validation and immutable `AuditExceptionLog` writer).
   - **`[WO-402]`**: Built `PromotionEngineService` with rule-based evaluation of BOGO, Mix & Match (cheapest item discount), Happy Hour time windows, and Cart-Slab Upsell with **live upsell nudges** (*"Add ₹X more to get 1kg Sugar @ ₹9!"*).
   - **`[WO-403]`**: Built `PosParkedBillService` (cross-counter LAN hold/recall), `PosBillingService` (atomic checkout with dynamic combo BOM deduction from `SHOP_FLOOR`, GST regime handling, inclusive MRP tax back-calculation, HSN table, multi-mode split payment validation, and live profit snapshots), and `PosReturnService` (sales return by bill barcode, 90-day barcoded credit note slips, exchange credits, and cash refunds).
   - **`[WO-404]`**: Upgraded `apps/hardware-bridge`:
     - `escpos.ts`: 80mm & 58mm bilingual thermal receipt builder with Total Savings banner, mandatory Indian HSN tax table, and RJ11 drawer kick pulse (`\x1B\x70\x00\x19\xFA`).
     - `serial-scale.ts`: RS232/USB continuous scale stream parser and live weight API.
     - `edc-payment-terminal.ts`: EDC / Dynamic Bharat UPI intent builder (`upi://pay?pa=...`) and webhook listener.
     - `index.ts`: REST hardware bridge server running on port 8089.
   - **`[WO-405]`**: Built flagship React supermarket checkout screens in `apps/pos-web`:
     - `PosBillingScreen.tsx`: 100% keyboard F1-F12 listener, quick scan, batch/MRP conflict popup, fast-moving touch grid & 3-digit PLU bar, live promo & upsell banner, multi-tender split modal.
     - `CustomerDualDisplayPage.tsx`: Secondary monitor view showing live items, item savings, giant total savings banner, upsell nudge, and dynamic UPI QR code.
     - `ShiftAndZReportPage.tsx`: Cashier shift open, safe drops, interactive currency denomination blind close, and printable 80mm Z-Report.

---

## 2. `REMOD-301` VERIFICATION SNIPPETS

### A. `[REMOD-301A]` Weighted Average Net Landing Cost for Existing Active Batches
**File:** `apps/api/src/modules/procurement/grn/grn.service.ts`
```typescript
        if (batch) {
          // REMOD-301A: Weighted Average Net Landing Cost for Existing Active Batches
          const existingStockBalances = await tx.binStockBalance.findMany({
            where: {
              branchId: dto.branchId,
              batchId: batch.id,
              quantity: { gt: 0 },
            },
          });
          const existingQty = existingStockBalances.reduce(
            (acc, b) => acc.add(b.quantity),
            new Decimal(0),
          );

          let finalNetLandingCost = costing.netLandingCostPerBaseUnit;
          if (existingQty.greaterThan(0)) {
            const totalStock = existingQty.add(costing.totalReceivedUnits);
            const existingValue = existingQty.mul(batch.netLandingCost);
            const newValue = costing.totalReceivedUnits.mul(costing.netLandingCostPerBaseUnit);
            finalNetLandingCost = existingValue.add(newValue).div(totalStock).toDecimalPlaces(4);
          }

          batch = await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              purchaseRate: new Decimal(line.purchaseRate),
              netLandingCost: finalNetLandingCost,
              retailSellingPrice: new Decimal(line.retailSellingPrice),
              mrp: new Decimal(line.targetMrp),
              expiryDate: expiryDate ?? batch.expiryDate,
            },
          });
        }
```

---

### B. `[REMOD-301B]` Multi-Token & HSN/MRP Ranked Scoring in `AiInvoiceOcrService`
**File:** `apps/api/src/modules/ai-copilot/ai-invoice-ocr.service.ts`
```typescript
      // REMOD-301B: Multi-Token & HSN/MRP Ranked Scoring
      if (!matchedProd && line.rawItemName) {
        const keywords = line.rawItemName
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .toLowerCase()
          .split(/\s+/)
          .filter((k) => k.length > 2);

        if (keywords.length > 0) {
          // Query candidate products matching ANY of the top tokens or HSN code
          const candidates = await this.prisma.product.findMany({
            where: {
              tenantId,
              isActive: true,
              OR: [
                ...keywords.slice(0, 3).map((kw) => ({
                  nameEn: { contains: kw, mode: 'insensitive' as const },
                })),
                ...(line.hsnCode
                  ? [{ hsn: { hsnCode: line.hsnCode } }]
                  : []),
              ],
            },
            include: {
              hsn: true,
              batches: {
                take: 5,
                orderBy: { createdAt: 'desc' },
              },
            },
            take: 20,
          });

          // In-memory multi-attribute scoring
          let bestCandidate = null;
          let highestScore = 0;
          const targetMrpDec = new Decimal(line.mrp);

          for (const cand of candidates) {
            let score = 0;
            const candNameLower = cand.nameEn.toLowerCase();

            // +30 pts per matching keyword token
            for (const kw of keywords) {
              if (candNameLower.includes(kw)) {
                score += 30;
              }
            }

            // +25 pts if HSN code matches
            if (line.hsnCode && cand.hsn && cand.hsn.hsnCode === line.hsnCode) {
              score += 25;
            }

            // +20 pts if an existing batch has matching MRP
            const mrpMatches = cand.batches.some((b) => b.mrp.equals(targetMrpDec));
            if (mrpMatches) {
              score += 20;
            }

            if (score > highestScore) {
              highestScore = score;
              bestCandidate = cand;
            }
          }

          // Select candidate only if score meets confidence threshold (score >= 40)
          if (bestCandidate && highestScore >= 40) {
            matchedProd = bestCandidate;
            matchType = 'NAME_HSN_SIMILARITY';
            confidenceScore = Math.min(100, highestScore);
          }
        }
      }
```

---

## 3. WORK ORDER COMPLETION MATRIX (`WO-401` TO `WO-405`)

| WO ID | Module Name | File Paths | Key Functions & Endpoints |
| :--- | :--- | :--- | :--- |
| `WO-401` | Shifts & Security | `apps/api/src/modules/pos/shifts/shift.dto.ts`<br>`apps/api/src/modules/pos/shifts/pos-shift.service.ts`<br>`apps/api/src/modules/pos/shifts/pos-security.service.ts`<br>`apps/api/src/modules/pos/shifts/shift.controller.ts` | `POST /api/v1/pos/shifts/open` (Terminal locking)<br>`POST /api/v1/pos/shifts/:id/safe-drop`<br>`GET /api/v1/pos/shifts/:id/x-report`<br>`POST /api/v1/pos/shifts/:id/blind-close` (Denomination total, expected cash calculation, auto-debit to cashier khata on shortage, and Z-Report generation)<br>`POST /api/v1/pos/security/verify-override` (Supervisor PIN audit) |
| `WO-402` | Promotions & Upsell | `apps/api/src/modules/pos/promotions/promotion.dto.ts`<br>`apps/api/src/modules/pos/promotions/promotion-engine.service.ts`<br>`apps/api/src/modules/pos/promotions/promotion.controller.ts` | `POST /api/v1/pos/promotions/evaluate-cart`<br>Evaluates BOGO deals, Mix & Match (cheapest item discount), Happy Hour time windows, and Cart-Slab live upsell nudges (*"Add ₹X more to get 1kg Sugar @ ₹9!"*) |
| `WO-403` | POS Billing & Returns | `apps/api/src/modules/pos/billing/billing.dto.ts`<br>`apps/api/src/modules/pos/billing/pos-parked-bill.service.ts`<br>`apps/api/src/modules/pos/billing/pos-billing.service.ts`<br>`apps/api/src/modules/pos/billing/pos-return.service.ts`<br>`apps/api/src/modules/pos/billing/billing.controller.ts`<br>`apps/api/src/modules/pos/pos.module.ts` | `POST /api/v1/pos/billing/park` & `recall` (Cross-counter LAN hold)<br>`POST /api/v1/pos/billing/checkout` (Dynamic combo BOM deduction, GST-inclusive MRP back-calculation, HSN table aggregation, multi-tender split validation)<br>`POST /api/v1/pos/billing/returns` (Instant exchange, 90-day barcoded credit note slip, cash refund with supervisor PIN) |
| `WO-404` | 5-Peripheral Hardware Bridge | `apps/hardware-bridge/src/escpos.ts`<br>`apps/hardware-bridge/src/serial-scale.ts`<br>`apps/hardware-bridge/src/edc-payment-terminal.ts`<br>`apps/hardware-bridge/src/index.ts` | 80mm & 58mm bilingual thermal receipt formatting with You Saved banner, HSN table, and RJ11 drawer kick pulse (`\x1B\x70\x00\x19\xFA`)<br>RS232/USB continuous scale stream parser<br>EDC payment adapter with NPCI Dynamic UPI URI builder |
| `WO-405` | React POS & Dual Display UI | `apps/pos-web/src/features/pos/PosBillingScreen.tsx`<br>`apps/pos-web/src/features/pos/CustomerDualDisplayPage.tsx`<br>`apps/pos-web/src/features/pos/ShiftAndZReportPage.tsx`<br>`apps/pos-web/src/App.tsx` | 100% keyboard F1-F12 driven checkout, batch/MRP conflict popup, fast-moving produce touch grid, live upsell banner, multi-tender split modal<br>Secondary display screen with giant green savings counter & Dynamic UPI QR<br>Currency note blind close calculator & printable Z-Report |

---

## 4. CORE MILESTONE 4 ALGORITHM SNIPPETS

### A. Cashier Blind Close, Expected Cash Formula & Shortage Khata Auto-Debit (`PosShiftService.blindCloseShift`)
**File:** `apps/api/src/modules/pos/shifts/pos-shift.service.ts`
```typescript
    // 1. Calculate Physical Cash Total from Denominations
    let physicalCashTotal = new Decimal(0);
    const denoms = dto.denominations || {};
    const multipliers: Record<string, number> = {
      '2000': 2000, '500': 500, '200': 200, '100': 100,
      '50': 50, '20': 20, '10': 10, '5': 5, '2': 2, '1': 1, coins: 1,
    };
    for (const [key, count] of Object.entries(denoms)) {
      const mult = multipliers[key] ?? 0;
      if (mult > 0 && typeof count === 'number' && count > 0) {
        physicalCashTotal = physicalCashTotal.add(new Decimal(count).mul(mult));
      }
    }

    // 2. Compute Expected Cash from System Sales & Refunds
    // Expected Cash = Opening Float + Total Cash Sales - Total Cash Refunds - Mid-Day Safe Drops
    const expectedCashSystem = shift.openingFloat
      .add(totalCashSales)
      .sub(totalCashRefunds)
      .sub(shift.midDaySafeDrops)
      .toDecimalPlaces(2);

    // Shortage or Excess = Physical Cash Counted - Expected Cash System
    const shortageOrExcess = physicalCashTotal.sub(expectedCashSystem).toDecimalPlaces(2);

    return this.prisma.$transaction(async (tx) => {
      // If shortage detected (shortageOrExcess < 0), auto-debit to cashier's staff advance ledger
      if (shortageOrExcess.lessThan(0)) {
        const shortageAbs = shortageOrExcess.abs();
        await tx.staffAdvanceAndGroceryKhata.create({
          data: {
            tenantId: shift.tenantId,
            branchId: shift.branchId,
            userId: shift.cashierId,
            txnType: StaffKhataTxnTypeEnum.SALARY_ADVANCE,
            amount: shortageAbs,
            approvedByUserId: dto.supervisorApprovedId,
            notes: `Auto Cashier Shortage Debit: Z-Report ${zReportNumber} (-₹${shortageAbs.toFixed(2)})`,
          },
        });
        // Log Audit Exception
        await tx.auditExceptionLog.create({ ... });
      }

      // Close the shift and persist Z-Report summary
      return tx.cashierShift.update({ ... });
    });
```

---

### B. Live Cart Promotion & Cart-Slab Upsell Nudge Engine (`PromotionEngineService.evaluateCartPromotions`)
**File:** `apps/api/src/modules/pos/promotions/promotion-engine.service.ts`
```typescript
    // Evaluate Cart-Slab Promotions & Live Upsell Nudges
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
```

---

### C. Atomic Checkout, Combo BOM Deduction & Inclusive GST Back-Calculation (`PosBillingService.checkout`)
**File:** `apps/api/src/modules/pos/billing/pos-billing.service.ts`
```typescript
        // GST Inclusive Back-Calculation: Taxable = Net / (1 + TaxRate/100)
        let lineTaxable = lineNet;
        let lineCgst = new Decimal(0);
        let lineSgst = new Decimal(0);
        let lineIgst = new Decimal(0);
        let lineCess = new Decimal(0);

        const gstRatePct = product.hsn ? product.hsn.igstRate : new Decimal(0);
        const cessRatePct = product.hsn?.cessRate ?? new Decimal(0);
        const totalTaxRatePct = gstRatePct.add(cessRatePct);

        if (!isComposition && totalTaxRatePct.greaterThan(0)) {
          const divisor = new Decimal(1).add(totalTaxRatePct.div(100));
          lineTaxable = lineNet.div(divisor).toDecimalPlaces(2);
          const halfGstRate = gstRatePct.div(2);
          lineCgst = lineTaxable.mul(halfGstRate).div(100).toDecimalPlaces(2);
          lineSgst = lineTaxable.mul(halfGstRate).div(100).toDecimalPlaces(2);
          if (cessRatePct.greaterThan(0)) {
            lineCess = lineTaxable.mul(cessRatePct).div(100).toDecimalPlaces(2);
          }
        }

        // Dynamic Combo BOM Stock Deduction from Shop Floor
        if (product.productType === 'COMBO_KIT' && product.comboAsParent.length > 0) {
          for (const bomItem of product.comboAsParent) {
            const childDeductQty = bomItem.quantityRequired.mul(lineQty);
            // Deducts child balances and logs StockLedger POS_SALE for child item
          }
        }
```

---

### D. Bilingual ESC/POS Thermal Receipt Builder with Savings & HSN Summary
**File:** `apps/hardware-bridge/src/escpos.ts`
```typescript
    // Drawer Kick Pulse (RJ11 Pin 2)
    if (params.kickDrawer) {
      buffers.push(this.DRAWER_KICK_PULSE); // \x1B\x70\x00\x19\xFA
    }

    // Centered Store Header & Bilingual Items
    buffers.push(this.ALIGN_CENTER);
    buffers.push(this.BOLD_ON);
    buffers.push(Buffer.from(`${params.storeName}\n`, 'utf-8'));
    buffers.push(Buffer.from(`GSTIN: ${params.gstin}\n`, 'utf-8'));

    // Savings Banner
    if (params.totalSavings > 0) {
      buffers.push(this.ALIGN_CENTER);
      buffers.push(this.BOLD_ON);
      buffers.push(Buffer.from(`*** YOU SAVED Rs. ${params.totalSavings.toFixed(2)} TODAY! ***\n`, 'utf-8'));
      buffers.push(this.BOLD_OFF);
    }

    // HSN-wise GST Breakup Table
    if (params.hsnSummary && params.hsnSummary.length > 0) {
      buffers.push(Buffer.from('HSN TAX BREAKUP SUMMARY:\n', 'utf-8'));
      buffers.push(Buffer.from('HSN       Taxable    CGST     SGST    Total Tax\n', 'utf-8'));
      for (const h of params.hsnSummary) {
        // ... formats 48-col table ...
      }
    }
```

---

## 5. EXACT BUILD & TYPECHECK TERMINAL OUTPUT

### A. Prisma Schema Validation
```bash
$ pnpm --filter @ti-erp/database prisma validate

Environment variables loaded from .env
Prisma schema loaded from prisma/schema
The schemas at prisma/schema are valid 🚀
```

### B. Recursive TypeScript Typecheck across all 6 packages
```bash
$ pnpm -r typecheck

packages/database typecheck$ tsc --noEmit
└─ Done in 647ms
packages/shared-types typecheck$ tsc --noEmit
└─ Done in 1.5s
apps/hardware-bridge typecheck$ tsc --noEmit
└─ Done in 1.6s
apps/cloud-admin typecheck$ tsc --noEmit
└─ Done in 2.1s
apps/pos-web typecheck$ tsc --noEmit
└─ Done in 2.6s
apps/api typecheck$ tsc --noEmit
└─ Done in 2.7s
```
**Result:** 0 errors across all 6 workspaces.

### C. Turbo Monorepo Production Build
```bash
$ pnpm build
$ turbo run build

   • turbo 2.11.10
   • Packages in scope: @ti-erp/api, @ti-erp/cloud-admin, @ti-erp/database, @ti-erp/hardware-bridge, @ti-erp/pos-web, @ti-erp/shared-types
   • Running build in 6 packages

@ti-erp/database:build: $ tsc
@ti-erp/shared-types:build: $ tsup src/index.ts --format cjs,esm --dts
@ti-erp/shared-types:build: ESM dist/index.mjs 9.59 KB
@ti-erp/shared-types:build: CJS dist/index.js 11.33 KB
@ti-erp/shared-types:build: DTS dist/index.d.ts  8.29 KB
@ti-erp/hardware-bridge:build: $ tsc
@ti-erp/api:build: $ nest build
@ti-erp/cloud-admin:build: $ next build (Compiled successfully)
@ti-erp/pos-web:build: $ tsc && vite build
@ti-erp/pos-web:build: dist/assets/index-DLmi3PLG.js 271.85 kB │ gzip: 71.24 kB
@ti-erp/pos-web:build: ✓ built in 766ms

 Tasks:    6 successful, 6 total
  Time:    3.585s
```
**Result:** 6/6 successful Turbo builds with 0 failures.

---

## 6. GIT COMMIT & REMOTE PUSH CONFIRMATION
- **Branch:** `main`
- **Origin:** `https://github.com/Ganesaperumal/TI_ERP.git`
- **Verified Commit SHA:** `b496606bc2cdba2a014edb594face9f9f785144d`
- **Commit Message:** `feat: DISPATCH-004 milestone 4 - high-speed pos, promotions, split pay, sales returns, cashier blind close and hardware bridge`
- **Push Status:** Successfully pushed to `origin/main`
- **Control Documents:** Preserved strictly in `agy-cli/` with only `README.md` in workspace root.
