# HO_TO_WO_DISPATCH.md
**From:** Argon (Director & CTO — Head Office / Gemini Web)
**To:** Agy CLI Execution Squad (5x Senior Devs — Flash 3.8 High)
**Repository:** `https://github.com/Ganesaperumal/TI_ERP.git`
**Last Verified Commit:** `886203dd6baca82125af004a730ce2b6103a703c` (`aa4dc15ed4e2b0602677c29f47c6ac301cd0ab97`)
**Dispatch ID:** `DISPATCH-008` (Milestone 8 — Production V1.0 Release Gate: Live E2E "Day-in-the-Life of a Supermarket" Integration Test Suite, Frontend-to-Backend Live API Client Wiring & 1-Click Demo Launcher)
**Status:** `EXECUTE IMMEDIATELY`

---

## SECTION A: DOCUMENTATION & STATE TRACKER UPDATES

1. **Update `agy-cli/02_STATE_TRACKER.md`:**
   - Confirm **M1 through M7** are `100% COMPLETED & VERIFIED`.
   - Add **M8: Production V1.0 E2E Runtime Smoke Test, Live API Wiring & 1-Click Launcher (`WO-801` to `WO-805`)** as `IN_PROGRESS`.

---

## SECTION B: NEW MODULAR WORK ORDERS — MILESTONE 8 (`WO-801` TO `WO-805`)

Every module compiled cleanly in M1–M7. Now we must verify **runtime execution** and ensure zero disconnected UI screens.

### [WO-801] Assigned to `DEV-1` (Database Migration/Push Verification, Rich Demo Seed & 1-Click Startup Script)
**Target Files:** `packages/database/prisma/seed.ts`, `package.json`, `scripts/start-demo.js`
**Tasks:**
1. Verify `packages/database/prisma/seed.ts` executes idempotently (`upsert` / clean re-seed) without foreign-key or unique-constraint crashes when run multiple times (`pnpm --filter @ti-erp/database prisma db seed`).
2. Ensure the seed data populates deterministic IDs/codes for immediate testing:
   - Tenant: `TI Supermarket Enterprise` (`REGULAR` GST Regime, `MULTI_BRANCH` topology)
   - Branches: `Main Supermarket (Tirupur)` & `Central Warehouse (HO)`
   - Bins: `GODOWN`, `SHOP_FLOOR`, `DAMAGED_RETURNABLE`, `DAMAGED_SCRAP`, `CONSIGNMENT`
   - Default Chart of Accounts (seeded via `AccountingSetupService` logic)
   - Sample Products across all 5 types (`STANDARD_FMCG`, `WEIGHED_LOOSE`, `REPACKED_BULK`, `COMBO_KIT`, `VARIANT_MATRIX`), Sample Supplier, Sample Customer with Silver/Gold tier, and Active Promotions.
3. Create `scripts/start-demo.js` (and root script `"demo:verify"` in `package.json`) so the Boss can boot and test the entire ERP with a single command.

---

### [WO-802] Assigned to `DEV-2` & `DEV-3` (Automated End-to-End "Day-in-the-Life of a Supermarket" Integration Test Suite)
**Target File:** `apps/api/src/e2e-supermarket-flow.spec.ts` (or `apps/api/scripts/run-e2e-smoke-test.ts`)
**Tasks:**
Write and execute an automated E2E verification script that boots the NestJS `AppModule` (or hits the live services/controllers) and asserts **all 12 core supermarket workflows in sequence**:
1. **StoreConfig & Onboarding:** Fetch merged `StoreConfig` for the main branch and verify default plug-and-play flags.
2. **Catalog & Scale Prefix Lookup:** Test `CatalogService.lookup()` with (a) standard EAN barcode, (b) Multi-UOM Carton barcode, and (c) Weighing Scale prefix barcode (`2010001007505` $\rightarrow$ resolves item + `0.750 kg`).
3. **Fast Direct GRN & Weighted-Average Costing:** Post a multi-item distributor GRN with Free Scheme Qty + Trade Discount + Cash Discount + Freight $\rightarrow$ verify `netLandingCost`, `InventoryBatch`, `BinStockBalance`, and Margin Guardrail output.
4. **Bulk-to-Retail Repacking:** Convert 50 kg Bulk Rice sack from `GODOWN` $\rightarrow$ 49 packets of 1 kg Retail Rice on `SHOP_FLOOR` + 0.5 kg wastage + packaging cost $\rightarrow$ verify exact new unit landing cost and 2-up ZPL sticker generation.
5. **Cashier Shift Open:** Open a shift on Counter 1 with `₹5,000.00` opening float.
6. **Promotions & Upsell Nudge:** Run `evaluateCartPromotions` and verify live Cart-Slab Upsell nudge (*"Add ₹X more..."*).
7. **High-Speed POS Split-Pay Checkout:** Bill a multi-item cart using Split Tender (`CASH` + `UPI` + `CUSTOMER_KHATA`), verifying `Taxable + CGST + SGST + Cess === NetLineTotal` (0.00 paisa drift), `SHOP_FLOOR` stock deduction, and loyalty points earned.
8. **Sales Return & Loyalty Point Clawback:** Return 1 item from the invoice $\rightarrow$ verify barcoded `CreditNoteSlip` generation, stock restoration, and proportionate `POINTS_REVERSED_ON_RETURN` clawback!
9. **Cashier Blind Close & Shortage Auto-Debit:** Perform a Safe Drop and Blind Close with a deliberate `₹100` physical cash shortage $\rightarrow$ verify Z-Report generation and automatic `-₹100.00` debit in `StaffAdvanceAndGroceryKhata`.
10. **Double-Entry Accounting & Bank Recon:** Post the Z-Report Journal Voucher, run `FinancialReportService.getProfitAndLoss()` & `getTrialBalance()` (asserting `Total Debit === Total Credit`), and settle the UPI batch via `BankReconciliationService`.
11. **GST & Tally Prime XML Export:** Generate GSTR-1 JSON, run GSTR-2B reconciliation (verifying `ITC AT RISK` detection), and generate Tally Prime `<ENVELOPE>` XML.
12. **HR Payroll, AI Copilot & Nightly Closing Report:** Run `PayrollService.generateMonthlyPayroll()` (verifying the ₹100 cashier shortage is deducted from net pay), test `AiCopilotAnalyticsService.transliterateProduct()` (`"Toor Dal 1kg"` $\rightarrow$ Tamil), and generate the 10:30 PM Nightly Closing Report!

---

### [WO-803] Assigned to `DEV-4` (Frontend-to-Backend API Client Layer & CORS/Port Configuration)
**Target Directory:** `apps/pos-web/src/lib/api-client.ts`, `apps/cloud-admin/src/lib/api-client.ts`, `apps/api/src/main.ts`
**Tasks:**
1. In `apps/api/src/main.ts`, ensure CORS is enabled (`app.enableCors()`) and Global ValidationPipe + BigInt/Decimal JSON serialization interceptor is registered (so `BigInt` `syncVersion` and `Prisma.Decimal` fields serialize cleanly to JSON without throwing `TypeError: Do not know how to serialize a BigInt`!).
2. Create a typed API client (`api-client.ts`) in both `apps/pos-web` and `apps/cloud-admin` with graceful fallback to seeded demo state if the user opens the UI while offline, plus a live **"Backend Connected / Offline Demo Mode"** status pill in the top header.

---

### [WO-804] Assigned to `DEV-5` (Hardware Bridge Client Integration in `apps/pos-web`)
**Target Directory:** `apps/pos-web/src/lib/hardware-bridge-client.ts`
**Tasks:**
Connect `PosBillingScreen.tsx`, `RepackingStudioPage.tsx`, and `ShiftAndZReportPage.tsx` to `apps/hardware-bridge` (`http://localhost:8089`) so clicking:
- **"Print Receipt / Kick Drawer"** calls `POST http://localhost:8089/print-receipt` (and falls back to an on-screen 80mm thermal receipt preview modal if no physical USB printer is plugged in!).
- **"Read Scale Weight (F3)"** calls `GET http://localhost:8089/scale/weight`.
- **"Print 2-Up Barcode Stickers"** calls `POST http://localhost:8089/print-zpl` (and displays the rendered ZPL preview modal).

---

## SECTION C: MANDATORY FINAL REPORT (`agy-cli/WO_TO_HO_REPORT.md`)

When `WO-801` through `WO-804` are complete:
1. Run the E2E verification suite (`run-e2e-smoke-test.ts` / `e2e-supermarket-flow.spec.ts`), `prisma validate`, `pnpm -r typecheck`, and `pnpm build`.
2. Update `agy-cli/02_STATE_TRACKER.md` marking **Milestone 8 (Production V1.0 Release Gate)** as `COMPLETED & VERIFIED`.
3. Write `agy-cli/WO_TO_HO_REPORT.md` containing:
   - Full step-by-step pass log of all 12 E2E Supermarket workflows (`[PASS] Step 1` through `[PASS] Step 12`).
   - Verification of BigInt/Decimal JSON serialization in `apps/api/src/main.ts`.
   - Exact terminal outputs of `prisma validate`, `pnpm -r typecheck`, `pnpm build`, and `git show --stat HEAD`.
4. Commit and push to `origin/main` and hand `agy-cli/WO_TO_HO_REPORT.md` to Argon CTO!
