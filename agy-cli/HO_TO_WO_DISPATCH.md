# HO_TO_WO_DISPATCH.md
**From:** Argon (Director & CTO — Head Office / Gemini Web)
**To:** Agy CLI Execution Squad (5x Senior Devs — Flash 3.8 High)
**Repository:** `https://github.com/Ganesaperumal/TI_ERP.git`
**Last Verified Commit:** `b496606bc2cdba2a014edb594face9f9f785144d`
**Dispatch ID:** `DISPATCH-005` (`REMOD-401` Fixes + Milestone 5: Customer CRM, Tiered Loyalty & OTP Redemption, Monthly Credit Khata, Ration Cycle Reminders, Gift Cards, Home Delivery Pick-Pack & Queue-Buster mPOS)
**Status:** `EXECUTE IMMEDIATELY`

---

## SECTION A: DOCUMENTATION & STATE TRACKER UPDATES (MANDATORY FIRST STEP)

1. **Update `agy-cli/02_STATE_TRACKER.md`:**
   - Mark **M3: Procurement, Supplier & AI OCR Engine** as `COMPLETED & VERIFIED`.
   - Mark **M4: High-Speed POS, Promotions, Shift Registers & Hardware Bridge (`WO-401` to `WO-405`)** as `COMPLETED — PENDING REMOD-401 PATCH (Commit: b496606bc2cdba2a014edb594face9f9f785144d)`.
   - Mark **M5: CRM, Loyalty, Khata, Home Delivery & Queue-Buster mPOS (`WO-501` to `WO-505`)** as `IN_PROGRESS`.

---

## SECTION B: CTO CODE AUDIT & RE-MODIFICATION ORDERS (`REMOD-401`)

Fix these 3 critical bugs caught during Argon CTO's inspection of Commit `b496606bc2cdba2a014edb594face9f9f785144d`:

### 1. `[REMOD-401A]` Assigned to `DEV-1` — Fix `agy-cli/verify-and-bundle.js` Post-Commit Diff Capture
- **File:** `agy-cli/verify-and-bundle.js`
- **Issue:** When `verify-and-bundle.js` runs *after* `git commit`, `git diff HEAD` is empty because changes are already committed.
- **Fix:** Update `agy-cli/verify-and-bundle.js` so it captures `git show --stat HEAD` AND `git diff HEAD~1 HEAD --apps --packages` (falling back to `git diff HEAD` if uncommitted), and always run `node agy-cli/verify-and-bundle.js` as the final step before pushing!

### 2. `[REMOD-401B]` Assigned to `DEV-3` — Fix 1-Paisa GST Back-Calculation Rounding Drift & Inter-State B2B IGST in `PosBillingService.checkout()`
- **File:** `apps/api/src/modules/pos/billing/pos-billing.service.ts`
- **Issues Found:**
  1. Rounding `lineTaxable`, `lineCgst`, `lineSgst`, and `lineCess` independently causes a `±₹0.01` mismatch where `lineTaxable + lineCgst + lineSgst + lineCess !== lineNet` (e.g., `₹100` @ 18% GST yields `84.75 + 7.63 + 7.63 = 100.01`).
  2. When a B2B customer has an inter-state GSTIN (state code != branch GSTIN state code), tax must go to `lineIgst` instead of `lineCgst + lineSgst`.
- **Fix:**
  - After computing `lineCgst`, `lineSgst` (or `lineIgst` for inter-state), and `lineCess` rounded to 2 decimal places, enforce the exact accounting identity:
    $$\text{lineTaxable} = \text{lineNet} - (\text{lineCgst} + \text{lineSgst} + \text{lineIgst} + \text{lineCess})$$
    This guarantees `Taxable + Tax === Net Line Total` to the exact paisa (`0.00`) on every single invoice and GSTR-1 export!

### 3. `[REMOD-401C]` Assigned to `DEV-3` — Prevent Double Stock Deduction on `PRE_PACKED` vs. `DYNAMIC_POS` Combos
- **File:** `apps/api/src/modules/pos/billing/pos-billing.service.ts`
- **Issue:** `checkout()` currently deducts child `comboAsParent` BOM items for all `COMBO_KIT` products without checking whether the combo is `DYNAMIC_POS` or `PRE_PACKED`. For a `PRE_PACKED` hamper that already has its own assembled batch stock on the shelf, deducting child items again at POS causes double inventory deduction.
- **Fix:** Only deduct child `ComboBomItem` stock at POS checkout when the combo is configured as dynamic (`isDynamicPosCombo` / no pre-assembled parent batch stock deducted); if it is `PRE_PACKED`, deduct only the parent combo batch from `SHOP_FLOOR` (and provide a back-office `assemblePrePackedCombo` endpoint in `InventoryBatchService` that consumes child BOM items to create the pre-packed parent batch).

---

## SECTION C: NEW MODULAR WORK ORDERS — MILESTONE 5 (`WO-501` TO `WO-505`)

Milestone 5 builds the complete **Customer Retention, Loyalty Points (with Anti-Fraud OTP), Monthly Credit Khata, 1st-to-10th Monthly Ration Reminders, Gift Cards, Home Delivery Pick-Pack, and Queue-Buster Mobile mPOS Engine**.

### [WO-501] Assigned to `DEV-1` (Customer CRM, Tiered Loyalty Engine, Category/Margin Point Rules & Anti-Fraud OTP Redemption)
**Target Directory:** `apps/api/src/modules/crm/loyalty/`
**Tasks:**
1. **`CustomerService` & `LoyaltyEngineService` (`/api/v1/crm/customers` & `/api/v1/crm/loyalty`):**
   - Fast phone-number lookup (`GET /api/v1/crm/customers/by-phone/:phone`), auto-registration at POS, GSTIN storage for B2B buyers, and family/anniversary dates.
   - **Configurable Loyalty Earning Calculator (`calculatePointsEarnedForInvoice`):**
     - Supports rule-based earning configured in `StoreConfig` (e.g., `1 point per ₹100 spent`, or category/margin-based multipliers where low-margin staples earn `0.25x` and high-margin repacked/apparel items earn `2x` points).
     - **Automatic Tier Upgrade Engine:** Tracks cumulative / monthly spend to auto-upgrade customers across `SILVER` $\rightarrow$ `GOLD` (e.g., $\ge ₹10,000$/mo $\rightarrow$ `1.5x` points) $\rightarrow$ `VIP` ($\ge ₹25,000$/mo $\rightarrow$ `2x` points + special tier pricing).
   - **Anti-Fraud Point Redemption with Configurable OTP (`POST /api/v1/crm/loyalty/request-redemption-otp` & `verify-redemption`):**
     - Checks `StoreConfig.crm.requireOtpForLoyaltyRedemption`.
     - If `false`: allows instant point redemption at POS.
     - If `true`: generates a 4-digit time-bound OTP, dispatches via WhatsApp/SMS gateway hook, and requires verification before `PosBillingService.checkout()` accepts a `LOYALTY_POINTS` payment split (stopping cashier point theft!).

---

### [WO-502] Assigned to `DEV-2` (Customer Credit Khata, Credit Limit Guardrails, 1-Click Monthly WhatsApp Statements & Prepaid Gift Cards)
**Target Directory:** `apps/api/src/modules/crm/khata-giftcards/`
**Tasks:**
1. **Customer Credit (Khata) & Institutional Billing Engine (`CustomerKhataService`):**
   - Enforces per-customer `creditLimit` (e.g., `₹15,000`) and `creditDays` (e.g., `30 days`) during POS checkout when `CUSTOMER_KHATA` tender is used.
   - If `currentBalance + billKhataAmount > creditLimit` or overdue bills exist past `creditDays`, blocks checkout unless a verified `supervisorPin` override is provided!
   - `POST /api/v1/crm/khata/repayment`: Records part or full Khata settlement (`CASH`, `UPI`, `NEFT`, `CHEQUE`), updates `CustomerKhataLedger` and `Customer.creditBalance`, and generates a payment receipt.
   - **Automated 1st-of-Month WhatsApp Statement & UPI Payment Link (`GET /api/v1/crm/khata/monthly-statements?branchId=...` & `POST /api/v1/crm/khata/:customerId/send-whatsapp-statement`):**
     - Aggregates all credit bills and repayments for the month, generates a structured statement summary + NPCI Dynamic UPI collection link (`upi://pay?pa=...&am=OUTSTANDING_BALANCE`), and logs dispatch.
2. **Prepaid Barcoded Gift Cards & Festival Vouchers (`GiftCardService`):**
   - `POST /api/v1/crm/gift-cards/issue`: Issues physical or digital barcoded gift cards (`₹500`, `₹1,000`, `₹2,000`, or custom amount) with expiry date.
   - `GET /api/v1/crm/gift-cards/validate/:cardCode` & atomic balance deduction inside `PosBillingService.checkout()` when `GIFT_CARD` payment split is used.

---

### [WO-503] Assigned to `DEV-3` (1st-to-10th Monthly Ration Cycle Tracker, RFM Segmentation, Digital WhatsApp Receipts & Star Feedback)
**Target Directory:** `apps/api/src/modules/crm/campaigns/`
**Tasks:**
1. **Smart "Monthly Ration Reminder" & RFM Segmentation Engine (`CustomerIntelligenceService`):**
   - **RFM Analysis (`GET /api/v1/crm/campaigns/rfm-segments?branchId=...`):** Segments customers into `CHAMPIONS`, `REGULAR_MONTHLY_BUYERS`, `AT_RISK_MISSING_RATION`, and `SLEEPING_CUSTOMERS` based on Recency, Frequency, and Monetary spend.
   - **1st-to-10th Monthly Grocery Cycle Detector (`GET /api/v1/crm/campaigns/missing-monthly-ration?branchId=...`):**
     - Identifies regular family buyers whose historical purchase pattern shows monthly grocery baskets between the 1st and 10th of prior months, but who have **not yet visited this month**!
     - Generates a 1-click WhatsApp re-engagement campaign with an auto-generated `PromotionRule` coupon code (*"We miss you! Use code RATION100 for ₹100 off your monthly grocery list this weekend"*).
2. **Green Paperless Digital WhatsApp Bill & 1–5 Star Feedback Hook (`DigitalReceiptService`):**
   - `POST /api/v1/crm/campaigns/send-digital-receipt/:invoiceId`: Formats the invoice + savings banner + feedback link for WhatsApp/SMS dispatch.
   - `POST /api/v1/crm/campaigns/feedback`: Records customer 1–5 star rating for an invoice and triggers an instant Manager Low-Rating Alert if `rating <= 3`.

---

### [WO-504] Assigned to `DEV-4` (Home Delivery Pick-Pack-Dispatch Engine, Aisle-Sorted Pick-Lists, Delivery Boy Reconciliation & Queue-Buster Mobile mPOS)
**Target Directory:** `apps/api/src/modules/pos/fulfillment/`
**Tasks:**
1. **Home Delivery & WhatsApp Order Pick-Pack Workflow (`HomeDeliveryService`):**
   - `POST /api/v1/pos/fulfillment/delivery-orders`: Creates a delivery order from WhatsApp/Phone/Walk-in.
   - **Aisle & Rack-Sorted Pick-List Generator (`GET /api/v1/pos/fulfillment/delivery-orders/:id/pick-list`):**
     - Joins order items with `BinStockBalance` and `StorageBin` coordinates (`aisle`, `rack`, `shelf`), sorting the pick-list in physical walking order so a floor staff member can pick 35 items in 5 minutes!
   - **Order State Machine & Rider Evening Settlement:**
     - `ORDER_RECEIVED` $\rightarrow$ `PICKING_IN_PROGRESS` $\rightarrow$ `PACKED_AND_BILLED` $\rightarrow$ `OUT_FOR_DELIVERY` (assigned to Delivery Boy with COD / Dynamic UPI QR printed on bill) $\rightarrow$ `DELIVERED` / `RETURNED`.
     - `POST /api/v1/pos/fulfillment/rider-settlement`: Reconciles all orders assigned to a Delivery Boy at the end of the shift (`Total COD Cash Collected` + `UPI Verified` + `Undelivered Returned Stock`).
2. **Queue-Buster Mobile Billing (`mPOS` Token Engine - `QueueBusterService`):**
   - `POST /api/v1/pos/fulfillment/queue-buster/create-token`: Allows a staff member in the checkout queue with a smartphone/tablet + Bluetooth scanner to scan a customer's trolley and generate a short 6-character **Queue Token / Barcode** (e.g., `QB-4092`).
   - `GET /api/v1/pos/fulfillment/queue-buster/token/:tokenCode`: When the customer reaches the counter, the cashier scans `QB-4092` -> instantly loads the pre-scanned cart into `PosBillingScreen` for 5-second payment and receipt printing!

---

### [WO-505] Assigned to `DEV-5` (React Frontend in `apps/pos-web`: CRM & Loyalty Hub, Customer Khata & Statement Manager, Home Delivery Pick-Pack Board & Queue-Buster mPOS UI)
**Target Directory:** `apps/pos-web/src/features/crm/` & `apps/pos-web/src/features/fulfillment/` & `apps/pos-web/src/App.tsx`
**Tasks:**
Build high-density, operator-friendly React screens in `apps/pos-web` and wire them into `App.tsx`:
1. **Customer CRM, Loyalty Tiers, Missing Ration Alerts & Gift Cards (`CrmLoyaltyAndKhataPage.tsx`):**
   - **Tab 1 (Customers & Loyalty Tiers):** Search by phone, view Silver/Gold/VIP badge, points ledger, and OTP redemption toggle test.
   - **Tab 2 (Monthly Credit Khata Ledger):** Customer credit balances, overdue alerts, quick repayment entry, and 1-click **"Send Monthly WhatsApp Statement + UPI Link"**.
   - **Tab 3 (1st–10th Missing Monthly Ration Buyers & RFM):** Live list of missing regular families with 1-click **"Send ₹100 Ration Comeback Coupon on WhatsApp"**.
   - **Tab 4 (Prepaid Gift Cards):** Issue, print barcode, and check balance of store gift vouchers.
2. **Home Delivery Dispatch Board & Queue-Buster mPOS Screen (`DeliveryAndQueueBusterPage.tsx`):**
   - **Kanban / Tab View for Home Delivery:** New WhatsApp Orders $\rightarrow$ Print Aisle-Sorted Pick-List $\rightarrow$ Assign Delivery Boy $\rightarrow$ Evening Rider Cash/UPI Settlement table.
   - **Queue-Buster Mobile mPOS Mode:** Dedicated mobile-responsive trolley scanning view that generates a scannable Queue Token QR/Barcode (`QB-XXXX`), plus a **"Scan Queue Token"** button inside `PosBillingScreen.tsx`!

---

## SECTION D: MANDATORY AUTOMATED REPORT GENERATION (`agy-cli/WO_TO_HO_REPORT.md`)

When `REMOD-401` (`A`, `B`, `C`) and `WO-501` through `WO-505` are complete:
1. Run `pnpm --filter @ti-erp/database prisma validate`, `pnpm -r typecheck`, and `pnpm build` and verify **0 errors**.
2. Commit all work to `main` and run `node agy-cli/verify-and-bundle.js` (updated in `REMOD-401A` so it captures both the build verification logs, the work order summary matrix, key algorithm snippets for `REMOD-401` + `WO-501..505`, and the `git show --stat HEAD` diff report into `agy-cli/WO_TO_HO_REPORT.md`).
3. Push to `origin/main` so the Boss can hand `agy-cli/WO_TO_HO_REPORT.md` directly to Argon CTO.
