# HO_TO_WO_DISPATCH.md
**From:** Argon (Director & CTO — Head Office / Gemini Web)
**To:** Agy CLI Execution Squad (5x Senior Devs — Flash 3.8 High)
**Repository:** `https://github.com/Ganesaperumal/TI_ERP.git`
**Last Verified Commit:** `b2d7739a53faa6f2089bf640297a7ae2654ab7ff`
**Dispatch ID:** `DISPATCH-004` (`REMOD-301` Fixes + Milestone 4: High-Speed POS Billing Engine, Promotions & Cart Upsell, Split Payments, Sales Returns/Exchanges, Shift Blind Close Z-Report & Full Hardware Bridge)
**Status:** `EXECUTE IMMEDIATELY`

---

## SECTION A: DOCUMENTATION & STATE TRACKER UPDATES (MANDATORY FIRST STEP)

1. **Update `agy-cli/02_STATE_TRACKER.md`:**
   - Mark **M2: Core Masters & Inventory Engine** as `COMPLETED & VERIFIED`.
   - Mark **M3: Procurement, Supplier & AI OCR Engine (`WO-301` to `WO-305`)** as `COMPLETED — PENDING REMOD-301 PATCH (Commit: b2d7739a53faa6f2089bf640297a7ae2654ab7ff)`.
   - Mark **M4: High-Speed POS, Promotions, Shift Registers & Hardware Bridge (`WO-401` to `WO-405`)** as `IN_PROGRESS`.

---

## SECTION B: CTO CODE AUDIT & RE-MODIFICATION ORDERS (`REMOD-301`)

Fix these 2 production edge cases caught during Argon CTO's audit of Commit `b2d7739a53faa6f2089bf640297a7ae2654ab7ff`:

### 1. `[REMOD-301A]` Assigned to `DEV-2` — Weighted Average Net Landing Cost When Merging Into an Existing Active Batch
- **File:** `apps/api/src/modules/procurement/grn/grn.service.ts`
- **Issue:** In `createFastDirectGrn()`, if `batch` already exists, `netLandingCost` is overwritten with `costing.netLandingCostPerBaseUnit`. If that batch already had positive stock (`existingQty > 0`), overwriting its unit cost corrupts inventory valuation.
- **Fix:** Query total existing positive stock for `batch.id` across the branch (`existingQty`). If `existingQty.greaterThan(0)`, compute weighted average landing cost using `Decimal`:
  $$\text{Weighted Net Landing Cost} = \frac{(\text{existingQty} \times \text{batch.netLandingCost}) + (\text{costing.totalReceivedUnits} \times \text{costing.netLandingCostPerBaseUnit})}{\text{existingQty} + \text{costing.totalReceivedUnits}}$$
  Otherwise, use `costing.netLandingCostPerBaseUnit`.

### 2. `[REMOD-301B]` Assigned to `DEV-4` — Multi-Token & HSN/MRP Ranked Scoring in `AiInvoiceOcrService`
- **File:** `apps/api/src/modules/ai-copilot/ai-invoice-ocr.service.ts`
- **Issue:** Fuzzy matching currently queries `nameEn: { contains: keywords[0] }`, which matches the wrong item when a brand name is shared across dozens of SKUs (e.g., `"Aashirvaad"`).
- **Fix:** Query candidate products matching ANY of the top tokens or `hsnCode`, then score each candidate in-memory:
  - `+30 pts` per matching keyword token in `nameEn`
  - `+25 pts` if `hsn.hsnCode === line.hsnCode`
  - `+20 pts` if an existing batch has `mrp.equals(new Decimal(line.mrp))`
  Select the highest-scoring candidate (only if `score >= 40`), returning `confidenceScore` alongside `matchType: 'NAME_HSN_SIMILARITY'`.

---

## SECTION C: NEW MODULAR WORK ORDERS — MILESTONE 4 (`WO-401` TO `WO-405`)

Milestone 4 builds the heart of daily store operations: **Cashier Shift & Blind Close Z-Report, Automated Promotion & Upsell Engine, High-Speed POS Billing & Cross-Counter Hold/Recall, Sales Returns/Exchanges, and the Complete 5-Peripheral Hardware Bridge**.

### [WO-401] Assigned to `DEV-1` (POS Terminal Locking, Cashier Shifts, Safe Drops, Blind Cash Declaration & POS Anti-Theft Exception Audit)
**Target Directory:** `apps/api/src/modules/pos/shifts/`
**Tasks:**
1. **Cashier Shift & Register Lifecycle (`PosShiftService` & Controller `/api/v1/pos/shifts`):**
   - `POST /api/v1/pos/shifts/open`: Locks `PosTerminal` to the cashier (`userId`), records `openingFloat` (`Decimal(15,2)`), verifies no other active shift exists on that terminal.
   - `POST /api/v1/pos/shifts/:id/safe-drop`: Records mid-day cash handovers from the counter drawer to the owner/manager safe (`midDaySafeDrops` increment + audit log).
   - `GET /api/v1/pos/shifts/:id/x-report`: Mid-shift snapshot (only accessible if role permits or `blindCloseEnabled === false`).
   - `POST /api/v1/pos/shifts/:id/blind-close`:
     - Cashier submits physical currency denomination counts (`{ "500": 42, "200": 15, "100": 19, "50": 10, "20": 5, "10": 8, "coins": 45 }`).
     - Backend computes `physicalCashTotal` from denominations using `Decimal`.
     - Backend computes `expectedSystemCash`:
       $$\text{Expected Cash} = \text{Opening Float} + \text{Total Cash Sales} - \text{Total Cash Refunds} - \text{Mid-Day Safe Drops}$$
     - Computes `shortageOrExcessAmount = physicalCashTotal.sub(expectedSystemCash)`.
     - If `shortageOrExcessAmount.lessThan(0)`, automatically records a **Cashier Shortage Debit** entry against the cashier's `StaffAdvanceAndGroceryKhata` so it links directly to their monthly payroll!
     - Generates the complete **Z-Report payload** (Sales by Payment Mode, GST Slab Breakup, Void/Cancelled Bill Count, Net Profit Margin Summary, and Cash Variance).
2. **POS Anti-Theft Supervisor Override & Exception Logger (`PosSecurityService`):**
   - `POST /api/v1/pos/security/verify-override`: Validates a Supervisor's 4-digit PIN or encrypted ID badge barcode for sensitive actions (`LINE_ITEM_DELETE`, `BILL_VOID`, `MANUAL_PRICE_OVERRIDE`, `NO_SALE_DRAWER_OPEN`, `CASH_REFUND`, `NEGATIVE_STOCK_BILL`).
   - Writes an immutable record to `AuditExceptionLog` and exposes `GET /api/v1/pos/security/exception-report?branchId=...&date=...`.

---

### [WO-402] Assigned to `DEV-2` (Automated Rule-Based Promotion, Mix & Match, Happy Hour & Live Cart-Slab Upsell Engine)
**Target Directory:** `apps/api/src/modules/pos/promotions/`
**Tasks:**
1. **`PromotionEngineService` (`/api/v1/pos/promotions`):**
   - CRUD for `PromotionRule` (`BOGO`, `MIX_AND_MATCH`, `CART_SLAB_UPSELL`, `HAPPY_HOUR`, `COUPON_CODE`).
   - **`evaluateCartPromotions(dto: EvaluateCartDto)` (`POST /api/v1/pos/promotions/evaluate-cart`):**
     - Takes current cart lines, customer tier (`SILVER`, `GOLD`, `VIP`), price tier (`WALK_IN_RETAIL` vs `WHOLESALE_B2B`), timestamp, and optional `couponCode`.
     - Evaluates all active rules for the branch using `Decimal(15,2)`:
       1. **`BOGO` & Quantity Deals:** E.g., Buy 1 Get 1 Free, Buy 2 Get 1 at 50% Off on matching SKUs/batches.
       2. **`MIX_AND_MATCH`:** E.g., Buy any 3 items from a Category/Brand group -> discount the cheapest item automatically.
       3. **`HAPPY_HOUR`:** Checks current day-of-week and `HH:mm` window (e.g., 16:00–20:00 Veggie Market 20% off) and applies time-bound price drop.
       4. **`CART_SLAB_UPSELL` (With Live Upsell Nudge!):**
          - If Cart Subtotal qualifies for a slab (e.g., `>= ₹2,000` -> Get 1kg Sugar @ ₹9 or Flat ₹150 off), applies the reward.
          - **Crucial Upsell Nudge:** If Cart Subtotal is within `80%–99.9%` of a slab threshold (e.g., Cart is `₹1,850` and threshold is `₹2,000`), returns `upsellNudges: [{ amountNeeded: 150.00, message: "Add ₹150.00 more to get 1kg Sugar @ ₹9!" }]` so the POS Cashier & Customer Dual Display show a live banner!

---

### [WO-403] Assigned to `DEV-3` (High-Speed POS Billing Engine, MRP Tax Back-Calculation, Cross-Counter LAN Hold/Recall, Split Tenders & Sales Returns/Exchanges)
**Target Directory:** `apps/api/src/modules/pos/billing/`
**Tasks:**
1. **Cross-Counter LAN Hold & Recall (`PosParkedBillService`):**
   - `POST /api/v1/pos/billing/park`: Parks an in-progress cart (`PosParkedBill`) with terminal ID, customer phone, and cashier note so any counter on the LAN can view and resume it via `GET /api/v1/pos/billing/parked?branchId=...` and `POST /api/v1/pos/billing/parked/:id/recall`.
2. **Atomic POS Checkout & Invoice Engine (`POST /api/v1/pos/billing/checkout`):**
   - Runs inside a strict Prisma `$transaction`:
     - Supports `WALK_IN_RETAIL`, `WHOLESALE_B2B`, `HOME_DELIVERY`, and `MPOS_QUEUE_TOKEN`.
     - **Dynamic Combo (`COMBO_KIT`) Handling:** If a cart item is a `DYNAMIC_POS` combo, automatically deducts the underlying child `ComboBomItem` quantities from `SHOP_FLOOR` stock while billing the combo parent price!
     - **GST Regime & Inclusive MRP Tax Back-Calculation:**
       - Checks `Tenant.gstRegime` (`REGULAR` vs `COMPOSITION`).
       - If `COMPOSITION`: sets `cgstAmount = 0`, `sgstAmount = 0`, `igstAmount = 0`, `cessAmount = 0` (`Bill of Supply` mode).
       - If `REGULAR`: for GST-inclusive retail prices, back-calculates exact taxable value using `Decimal`:
         $$\text{Taxable Value} = \frac{\text{Net Line Total (After Promo/Discount)}}{1 + \frac{\text{GST Rate \%} + \text{Cess Rate \%}}{100}}$$
         Splits GST into `CGST + SGST` (intra-state) or `IGST` (inter-state B2B) + `Cess`, and aggregates the **HSN-wise Tax Summary table** required on Indian supermarket receipts!
     - **Live Gross Profit Snapshot:** Stores `netLandingCostSnapshot` on every `PosInvoiceLine` so the owner's dashboard knows the exact real-time profit on every bill.
     - **Multi-Mode Split Payment Validator (`PosPaymentSplit`):**
       - Validates that the sum of splits (`CASH`, `UPI`, `CARD`, `SODEXO`, `CREDIT_NOTE_SLIP`, `LOYALTY_POINTS`, `CUSTOMER_KHATA`, `GIFT_CARD`) equals `netPayable` (or if `CASH` tendered > due, computes exact `changeReturned`).
       - If `CREDIT_NOTE_SLIP` is used, verifies the slip barcode is unredeemed and marks it redeemed.
     - Deducts stock from `BinStockBalance` (`SHOP_FLOOR`), writes `StockLedger` (`OUTWARD_POS_SALE`), and returns the full invoice + ESC/POS thermal receipt payload.
3. **Sales Return, Instant Counter Exchange & Barcoded Credit Note Slip (`PosReturnService`):**
   - `GET /api/v1/pos/billing/invoice-by-number/:invoiceNo`: Scans original bill barcode and loads original lines with actual net price paid after discounts/BOGO (preventing return fraud).
   - `POST /api/v1/pos/billing/returns`:
     - Restores returned quantity to `SHOP_FLOOR` (if resellable) or `DAMAGED_RETURNABLE` (if defective), reverses proportionate GST, and processes one of the 3 owner-configured refund modes:
       1. `INSTANT_EXCHANGE` (applies return credit directly against replacement items on the same screen)
       2. `CREDIT_NOTE_SLIP` (generates a barcoded `CreditNoteSlip` valid for $X$ days)
       3. `CASH_OR_UPI_REFUND` (verifies Supervisor PIN override token).

---

### [WO-404] Assigned to `DEV-4` (Complete 5-Peripheral Hardware Bridge: Bilingual ESC/POS Thermal Receipt Designer, Cash Drawer Kick, Live Serial Scale, Dual Display & EDC/Soundbox Webhooks)
**Target Directory:** `apps/hardware-bridge/src/`
**Tasks:**
Upgrade `apps/hardware-bridge` to support all 5 locked-in supermarket peripherals with zero placeholders:
1. **`escpos.ts` (80mm & 58mm Bilingual Thermal Receipt Generator + RJ11 Cash Drawer Kick):**
   - Generates structured ESC/POS byte commands + plain-text/HTML preview for **80mm (48 cols)** and **58mm (32 cols)** thermal printers.
   - Prints: Store Header, GSTIN, Bill No/Date/Counter/Cashier, Bilingual Item Rows (`nameEn` + `nameRegional` when enabled in `StoreConfig`), `MRP | Rate | Qty | Amt`, **Total Savings Banner (`YOU SAVED ₹X TODAY!`)**, **HSN-wise GST Breakup Table (`HSN | Taxable | CGST | SGST | Total Tax`)**, Split Payment Summary, Dynamic UPI QR / Return Barcode, and RJ11 Cash Drawer Kick pulse (`\x1B\x70\x00\x19\xFA`).
2. **`serial-scale.ts` (Live RS232/USB Weighing Scale Stream + Prefix Generator):**
   - Parses continuous ASCII weight frames from standard Indian retail scales (Essae / Sansui / Avery format e.g. `ST,GS,+001.250kg`) and emits stable weight readings over local HTTP/WebSocket to the POS screen.
3. **`edc-payment-terminal.ts` (Pine Labs / Paytm / PhonePe / Razorpay POS Terminal & Soundbox Adapter):**
   - Implements unified payment request dispatch (`initiateTerminalPayment(amount, invoiceNo, mode: 'CARD' | 'DYNAMIC_UPI_QR')`), status polling/webhook handler, and dynamic UPI URI builder (`upi://pay?pa=...&am=...&tr=...`) for the Customer Dual Display.
4. **`index.ts` (Hardware Bridge Local Server):**
   - Exposes clean local REST/event endpoints (`/print-receipt`, `/kick-drawer`, `/print-zpl`, `/scale/weight`, `/edc/initiate`) consumed by `apps/pos-web`.

---

### [WO-405] Assigned to `DEV-5` (React Frontend in `apps/pos-web`: Ultra-Fast Keyboard POS Screen, Cross-Counter Hold/Recall, Split-Pay Modal, Customer Dual Display & Shift Blind Close UI)
**Target Directory:** `apps/pos-web/src/features/pos/` & `apps/pos-web/src/App.tsx`
**Tasks:**
Build the flagship supermarket checkout experience inside `apps/pos-web`:
1. **100% Keyboard-Driven + Touch POS Checkout Screen (`PosBillingScreen.tsx`):**
   - **Live Global Function Key Listener:** Reads remappable shortcuts from `StoreConfig` (`F1` Help/PLU Search, `F2` Qty Change, `F3` Weight Read from Scale, `F4` Price Tier Toggle Retail/Wholesale, `F6` Hold/Park Bill, `F7` Recall Held Bill across LAN Counters, `F8` Sales Return/Exchange Modal, `F9` Supervisor PIN Override, `F10` Instant Cash Checkout, `F12` Split Payment Modal).
   - **Batch/MRP Conflict Popup:** When `resolveBatchForPosSale` returns `requiresBatchPopup: true`, displays a lightning-fast numbered modal (`Press 1 for MRP ₹240 | Press 2 for MRP ₹255`).
   - **Fast-Moving Loose Items Touch Grid & 3-Digit PLU Bar:** Right-side touch panel for vegetables, fruits, milk, and loose staples.
   - **Live Promotion & Cart-Slab Upsell Banner:** Highlights applied BOGO/Mix-and-Match savings and flashes the amber upsell nudge (*"Add ₹150 more to get 1kg Sugar @ ₹9!"*).
   - **Multi-Mode Split Tender Modal:** Lets cashier combine Cash + UPI + Card + Sodexo + Credit Note Slip + Loyalty Points + Customer Khata on one bill, showing live `Balance Remaining` and `Cash Change to Return`.
2. **Customer-Facing Secondary Display View (`CustomerDualDisplayPage.tsx`):**
   - Clean second-monitor view showing live scanned items, item MRP vs. Store Price, a giant green **"TOTAL SAVED: ₹X"** counter, Upsell nudge banner, and **Dynamic UPI QR Code** during payment.
3. **Cashier Shift Open, Safe Drop & Blind Cash Denomination Close Screen (`ShiftAndZReportPage.tsx`):**
   - Interactive currency note calculator (`₹500 x ___`, `₹200 x ___`, `₹100 x ___`, etc.) -> Submits Blind Close -> Displays printable Z-Report & Cashier Exception Log.

---

## SECTION D: MANDATORY SELF-CONTAINED RETURN REPORT (`agy-cli/WO_TO_HO_REPORT.md`)

When `REMOD-301` (`A`, `B`) and `WO-401` through `WO-405` are complete, write the plain-text report to `agy-cli/WO_TO_HO_REPORT.md` containing:
1. **Executive Summary & Git Commit SHA** (confirming push to `main`).
2. **`REMOD-301` Verification Snippets:**
   - Paste the updated weighted-average batch landing cost calculation in `GrnService.createFastDirectGrn()` and the multi-token + HSN/MRP scored matcher in `AiInvoiceOcrService`.
3. **Work Order Completion Matrix (`WO-401` to `WO-405`):**
   - Exact file paths, controllers, services, and React UI screens created.
4. **Core Milestone 4 Algorithm Snippets Embedded in Report:**
   - Paste `PosShiftService.blindCloseShift()` (showing denomination total, expected cash formula, and automatic shortage posting to staff ledger).
   - Paste `PromotionEngineService.evaluateCartPromotions()` (showing BOGO, Mix & Match, and Cart-Slab Upsell nudge calculation).
   - Paste `PosBillingService.checkout()` (showing Dynamic Combo BOM deduction, GST-inclusive MRP tax back-calculation, HSN summary aggregation, and Split Payment validation).
   - Paste `escpos.ts` receipt builder (showing Bilingual line items, You Saved banner, HSN GST table, and drawer kick command).
5. **Exact Build & Typecheck Terminal Output:**
   - `pnpm --filter @ti-erp/database prisma validate`
   - `pnpm -r typecheck` (must show 0 errors across all 6 packages)
   - `pnpm build` (must show 6/6 successful tasks)