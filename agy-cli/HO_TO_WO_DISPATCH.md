# HO_TO_WO_DISPATCH.md
**From:** Argon (Director & CTO — Head Office / Gemini Web)
**To:** Agy CLI Execution Squad (5x Senior Devs — Flash 3.8 High)
**Repository:** `https://github.com/Ganesaperumal/TI_ERP.git`
**Last Verified Commit:** `e3bf1b7c5571aaf3a79247e2351955d1b4a636be`
**Dispatch ID:** `DISPATCH-009` (`REMOD-801` Gold Master Math Fix: Bulk-to-Retail Repacking Cost Normalization, Positive Gross Profit Verification & Clean E2E State Reset)
**Status:** `EXECUTE IMMEDIATELY`

---

## SECTION A: CTO AUDIT FINDINGS ON COMMIT `e3bf1b7c5571aaf3a79247e2351955d1b4a636be`

In `DISPATCH-008`, the 12-Step E2E Smoke Test (`run-e2e-smoke-test.ts`) ran and exposed a critical unit-cost bug in **Step 4** and **Step 12**:
1. **Step 4 Output:** `Consumed: 50 kg bulk rice sack -> Produced: 49x 1 kg retail pouches... Unit Landing Cost: ₹2145.38/pouch (MRP: ₹65, RSP: ₹58)`.
   - **Root Cause:** In `seed.ts` / `run-e2e-smoke-test.ts` / `InventoryBatchService.executeRepackingJob()`, the Bulk Rice (`SKU-RICE-50KG`) batch was seeded with a **per-sack** cost (`~₹2,100.00`), while `executeRepackingJob` multiplied `bulkQtyConsumed (50) * bulkBatch.netLandingCost (2100) = ₹1,05,000` and divided by `49 pouches` = `₹2,145.38 per 1kg pouch` (50x cost inflation!).
2. **Step 12 Output:** Because the 1kg rice pouch had an inflated landing cost of `₹2,145.38` and sold at `₹58.00`, Step 12 reported:
   - `Total Sales: ₹1272.00 (4 Bills) | Gross Profit: ₹-8194.35 (-727.3%)`.
3. **Accumulated Test Runs:** Running `pnpm test:smoke` multiple times accumulated 4 bills (`₹1272.00`), 4 cashier shortages (`₹400.00`), and 4 no-sale drawer kicks instead of testing a clean single-day cycle.

---

## SECTION B: MANDATORY RE-MODIFICATION ORDERS (`REMOD-801`)

### 1. `[REMOD-801A]` Assigned to `DEV-1` & `DEV-3` — Fix Bulk-to-Retail Repacking Unit Cost & Seed Base UOM Alignment
- **Files:** `packages/database/prisma/seed.ts`, `apps/api/src/modules/inventory/inventory-batch.service.ts`, `apps/api/scripts/run-e2e-smoke-test.ts`
- **Fixes Required:**
  1. **Base UOM Consistency:** Either:
     - Store `SKU-RICE-50KG` in base UOM `KG` (so `availableQty = 500 kg`, `netLandingCost = ₹42.00/kg`, `mrp = ₹55.00/kg`, and consuming `50 kg` costs `50 * ₹42.00 = ₹2,100.00`), **OR**
     - If `SKU-RICE-50KG` has `baseUom = 'SACK_50KG'` (`netLandingCost = ₹2,100.00/sack`), then consuming **1 sack** (`bulkQtyConsumed = 1` sack = `50 kg`) costs `1 * ₹2,100.00 = ₹2,100.00`!
  2. **Repacking Cost Formula Verification:**
     When `50 kg` worth of bulk rice (`₹2,100.00` total bulk cost) + `₹123.50` packaging/labor cost produces `49` retail pouches of `1 kg`:
     $$\text{New Unit Landing Cost per 1kg Pouch} = \frac{₹2,100.00 + ₹123.50}{49} = ₹45.38\text{/pouch}$$
     With `MRP = ₹65.00` and `Retail Selling Price (RSP) = ₹58.00`, the supermarket earns a healthy **`+₹12.62` profit per pouch (`+21.76%` Gross Margin)**!
  3. **Repacking Cost Guardrail in `InventoryBatchService.executeRepackingJob()`:**
     Add a sanity warning/flag `costExceedsSellingPriceWarning: boolean` if the newly calculated `unitLandingCost` exceeds the child item's `retailSellingPrice`, preventing accidental UOM mismatch entry by store clerks!

### 2. `[REMOD-801B]` Assigned to `DEV-2` — Clean Transactional Reset in `seed.ts` / `run-e2e-smoke-test.ts` & Positive Gross Profit Assertion
- **Files:** `packages/database/prisma/seed.ts` & `apps/api/scripts/run-e2e-smoke-test.ts`
- **Fixes Required:**
  1. Ensure `run-e2e-smoke-test.ts` starts from a clean today transactional slate (or cleans up previous smoke-test invoices/shifts/repacking jobs before running Step 1) so `pnpm test:smoke` is 100% deterministic whether run once or 10 times in a row.
  2. In **Step 4**, assert that `unitLandingCost` is between `₹40.00` and `₹50.00` (`₹45.38/pouch`) and `< retailSellingPrice (₹58.00)`.
  3. In **Step 12**, assert that `Gross Profit` in the 10:30 PM Nightly Closing Report is **strictly positive (`> ₹0.00` and margin `> 10%`)**!

---

## SECTION C: MANDATORY GOLD MASTER VERIFICATION REPORT (`agy-cli/WO_TO_HO_REPORT.md`)

When `REMOD-801A` and `REMOD-801B` are complete:
1. Run `pnpm demo:verify` (which runs `prisma validate`, `db push`, `db seed`, `pnpm -r typecheck`, `pnpm build`, and `pnpm test:smoke`).
2. Update `agy-cli/02_STATE_TRACKER.md` with the new Gold Master commit SHA.
3. Write `agy-cli/WO_TO_HO_REPORT.md` containing:
   - The updated **12-Step E2E Integration Suite output log** showing:
     - **Step 4:** `Unit Landing Cost: ₹45.38/pouch (MRP: ₹65, RSP: ₹58)`
     - **Step 12:** Positive Gross Profit (`₹+...` and `+...%` margin) on the 10:30 PM WhatsApp Closing Report!
   - Full terminal outputs of `pnpm -r typecheck`, `pnpm build`, and `git show --stat HEAD`.
4. Commit and push to `origin/main` and hand `agy-cli/WO_TO_HO_REPORT.md` to Argon CTO for final Gold Master V1.0 sign-off!
