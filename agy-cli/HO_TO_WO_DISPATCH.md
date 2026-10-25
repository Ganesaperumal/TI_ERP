# HO_TO_WO_DISPATCH.md
**From:** Argon (Director & CTO — Head Office / Gemini Web)
**To:** Agy CLI Execution Squad (5x Senior Devs — Flash 3.8 High)
**Repository:** `https://github.com/Ganesaperumal/TI_ERP.git`
**Last Verified Commit:** `327779a470d359db1a6047cac0357bc9b89ae978`
**Dispatch ID:** `DISPATCH-006` (`REMOD-501` Fixes + Milestone 6: GST Compliance (GSTR-1/2B/3B, E-Invoice/E-Way Bill), Automated Double-Entry Accounting, UPI/Bank MDR Reconciliation, 1-Click Tally Prime XML Bridge & HR/Payroll)
**Status:** `EXECUTE IMMEDIATELY`

---

## SECTION A: DOCUMENTATION & STATE TRACKER UPDATES (MANDATORY FIRST STEP)

1. **Update `agy-cli/02_STATE_TRACKER.md`:**
   - Mark **M4: High-Speed POS, Promotions, Shift Registers & Hardware Bridge** as `COMPLETED & VERIFIED`.
   - Mark **M5: CRM, Loyalty, Khata, Home Delivery & Queue-Buster mPOS (`WO-501` to `WO-505`)** as `COMPLETED — PENDING REMOD-501 PATCH (Commit: 327779a470d359db1a6047cac0357bc9b89ae978)`.
   - Mark **M6: GST, Double-Entry Accounting, Bank Recon, Tally Bridge & HR/Payroll (`WO-601` to `WO-605`)** as `IN_PROGRESS`.

---

## SECTION B: CTO CODE AUDIT & RE-MODIFICATION ORDERS (`REMOD-501`)

Fix these 2 production bugs caught during Argon CTO's inspection of Commit `327779a470d359db1a6047cac0357bc9b89ae978`:

### 1. `[REMOD-501A]` Assigned to `DEV-2` — Remove Hardcoded UPI VPA & Store Name in `CustomerKhataService`
- **File:** `apps/api/src/modules/crm/khata-giftcards/customer-khata.service.ts`
- **Issue:** `sendWhatsappStatement` hardcoded `pa=tierp.store@okhdfcbank` and `pn=TI Supermarket` in the NPCI UPI URI.
- **Fix:** Fetch the branch's merged `StoreConfig` (via `TenantBranchService.getMergedStoreConfig`) and `Branch` record, using the configured merchant UPI VPA and branch/tenant name dynamically.

### 2. `[REMOD-501B]` Assigned to `DEV-1` & `DEV-3` — Proportionate Loyalty Point Reversal on Sales Return
- **Files:** `apps/api/src/modules/pos/billing/pos-return.service.ts` & `apps/api/src/modules/crm/loyalty/loyalty-engine.service.ts`
- **Issue:** When a customer returns items from an invoice that earned loyalty points, those earned points were not reversed, enabling point-redemption abuse.
- **Fix:** Inside `PosReturnService.processSalesReturn()`, if the original `PosInvoice` has a `customerId` and `loyaltyPointsEarned > 0`, calculate the proportionate points to claw back:
  $$\text{Points to Claw Back} = \text{round}\left(\text{Original Points Earned} \times \frac{\text{Total Refund Amount}}{\text{Original Invoice Net Payable}}\right)$$
  Deduct those points from `Customer.loyaltyPointsBalance` and record a `POINTS_REVERSED_ON_RETURN` entry in `LoyaltyLedger`.

---

## SECTION C: NEW MODULAR WORK ORDERS — MILESTONE 6 (`WO-601` TO `WO-605`)

Milestone 6 builds the complete **Auditor-Ready GST Compliance Suite, Automated Double-Entry Accounting Engine, Bank/UPI MDR Settlement Reconciliation, 1-Click Tally Prime XML Exporter, and Supermarket HR/Attendance/Payroll Module**.

### [WO-601] Assigned to `DEV-1` (Automated Double-Entry Accounting Engine, Chart of Accounts & Financial Statements)
**Target Directory:** `apps/api/src/modules/accounting/core/`
**Tasks:**
1. **Default Supermarket Chart of Accounts Auto-Seeder (`AccountingSetupService`):**
   - Ensures every tenant has the standard Indian retail `AccountGroup` & `LedgerAccount` hierarchy across `ASSET`, `LIABILITY`, `INCOME`, and `EXPENSE`:
     - *Assets:* Cash-in-Hand (Counter Drawers), Main Safe Cash, Bank Accounts (HDFC/SBI/ICICI), UPI/Card Pending Settlement Clearing Account, Inventory Asset (Closing Stock), Accounts Receivable (Customer Khata), GST Input Tax Credit (`CGST Input`, `SGST Input`, `IGST Input`, `Cess Input`), Staff Salary Advances.
     - *Liabilities:* Accounts Payable (Sundry Creditors / Suppliers), GST Output Tax Liability (`CGST Output`, `SGST Output`, `IGST Output`, `Cess Output`), Customer Prepaid Gift Cards & Credit Note Liability.
     - *Income:* Retail POS Sales, Wholesale B2B Sales, Other Store Income (Brand Display/End-Cap Rentals).
     - *Expenses:* Cost of Goods Sold (COGS), Inventory Shrinkage/Wastage/Damage Write-off, Bank MDR & Payment Gateway Charges, Store Rent, Electricity/EB Bill, Packaging Materials, Staff Salaries & Incentives, Tempo Freight & Delivery Fuel.
2. **Automated Double-Entry Journal Posting Engine (`AccountingVoucherService`):**
   - Enforces the strict invariant: $\sum \text{Debit} === \sum \text{Credit}$ (`Decimal(15,2)`) on every `JournalVoucher` (`SALES`, `PURCHASE`, `RECEIPT`, `PAYMENT`, `CONTRA`, `JOURNAL`, `DEBIT_NOTE`, `CREDIT_NOTE`).
   - **Auto-Posting Hooks (Zero Manual Bookkeeping):**
     - `postPosZReportJournal(shiftId)`: Summarizes the shift's sales, COGS, GST Output, and tender splits into a balanced Double-Entry voucher.
     - `postGrnPurchaseJournal(grnId)`: Posts Inventory Asset + GST Input Credit Dr $\rightarrow$ Supplier Payable Cr.
     - `postWastageOrDamageWriteOff(ledgerId)`: Posts Inventory Shrinkage Expense Dr $\rightarrow$ Inventory Asset Cr.
     - `postStoreExpenseVoucher(dto)`: Allows recording daily shop petty cash / rent / EB expenses with optional GST input credit.
3. **Real-Time Financial Reports (`FinancialReportService`):**
   - `GET /api/v1/accounting/reports/day-book` & `cash-bank-book`
   - `GET /api/v1/accounting/reports/trial-balance`
   - `GET /api/v1/accounting/reports/profit-and-loss`: Computes live Revenue, COGS (from `PosInvoiceLine.netLandingCostSnapshot`), Gross Profit, Operating Expenses, Shrinkage, and Net Profit, plus Live Closing Stock valuation from `BinStockBalance × InventoryBatch.netLandingCost`!
   - `GET /api/v1/accounting/reports/balance-sheet`

---

### [WO-602] Assigned to `DEV-2` (Auditor-Ready GST Compliance Engine: GSTR-1 JSON/CSV, GSTR-2B ITC Reconciliation, GSTR-3B & E-Invoice / E-Way Bill)
**Target Directory:** `apps/api/src/modules/accounting/gst/`
**Tasks:**
1. **GSTR-1 Government Portal Offline JSON & Summary Generator (`Gstr1Service`):**
   - `GET /api/v1/accounting/gst/gstr1?branchId=...&month=...&year=...`:
     - Aggregates all `PosInvoice` and `SalesReturn` records for the period into the exact official Indian GSTN sections:
       1. **`b2b`**: Invoices where customer has a valid 15-digit `gstin` (grouped by GSTIN, invoice level, taxable value, CGST, SGST, IGST, Cess).
       2. **`b2cl`**: Inter-state B2C invoices with value $> ₹2,50,000$.
       3. **`b2cs`**: Consolidated B2C Small retail sales grouped by State Code + GST Rate Slab (`0%`, `5%`, `12%`, `18%`, `28%`).
       4. **`cdnr` / `cdnur`**: Credit/Debit notes from `SalesReturn`.
       5. **`hsn`**: Consolidated HSN-wise summary (`hsn_sc`, `uqc`, `qty`, `val`, `txval`, `iamt`, `camt`, `samt`, `csamt`).
       6. **`doc_issue`**: Document series summary (First Invoice No, Last Invoice No, Total Issued, Cancelled/Voided Count, Net Issued).
2. **GSTR-2B vs. Purchase Register Reconciliation (`Gstr2bReconciliationService`):**
   - `POST /api/v1/accounting/gst/gstr2b-reconcile`:
     - Accepts uploaded GSTR-2B JSON lines from the GST portal and matches them against the store's `GoodsReceiptNote` records by `Supplier GSTIN` + `Invoice Number` + `Taxable/Tax Value`.
     - Categorizes every bill into:
       - `EXACT_MATCH` (100% ITC Safe)
       - `TAX_VALUE_MISMATCH` (Rounding or rate difference)
       - `MISSING_IN_GSTR2B_SUPPLIER_NOT_FILED` (**ITC AT RISK!** Flags the supplier so the supermarket owner can hold their payment until they file GST!)
       - `MISSING_IN_BOOKS` (Supplier filed an invoice not yet entered in GRN).
3. **GSTR-3B Liability vs. ITC Offset Table (`GET /api/v1/accounting/gst/gstr3b`) & E-Invoice / E-Way Bill Generator (`POST /api/v1/accounting/gst/e-invoice/:invoiceId` & `e-way-bill`):**
   - Computes Output Tax Liability (Table 3.1) minus Eligible ITC from GRNs (Table 4) = Net Tax Payable in Cash/Credit Ledger.
   - Generates NIC E-Invoice JSON payload, simulated/live IRN hash, AckNo, Signed QR Code, and E-Way Bill Part-A/Part-B for B2B invoices and inter-branch stock transfers $> ₹50,000$.

---

### [WO-603] Assigned to `DEV-3` (UPI/Card Bank Settlement & MDR Reconciliation + 1-Click Tally Prime XML Voucher Bridge)
**Target Directory:** `apps/api/src/modules/accounting/reconciliation-tally/`
**Tasks:**
1. **Bank & UPI/Card MDR Settlement Reconciliation Engine (`BankReconciliationService`):**
   - Supermarkets process thousands of UPI (PhonePe, Paytm, GPay, Pine Labs) and Card transactions daily, while banks settle T+1 after deducting MDR/gateway charges.
   - `GET /api/v1/accounting/recon/pending-settlements?branchId=...`: Lists unsettled `PosPaymentSplit` records grouped by payment mode/provider and date.
   - `POST /api/v1/accounting/recon/settle-batch`:
     - Accepts the bank/gateway settlement statement (`expectedGrossAmount`, `actualBankCreditedAmount`, `bankUtrNumber`, `settlementDate`).
     - Automatically calculates the variance:
       $$\text{MDR & Gateway Fee} = \text{Expected Gross Amount} - \text{Actual Bank Credited Amount}$$
     - Atomically marks the `PosPaymentSplit` records as `SETTLED`, flags any abnormal shortage if variance exceeds configured MDR threshold %, and posts a balanced Double-Entry Journal Voucher (`Bank Account Dr`, `Bank MDR Charges Dr` $\rightarrow$ `UPI/Card Pending Clearing Account Cr`)!
2. **1-Click Tally Prime XML & Excel Export Bridge (`TallyExportService`):**
   - `GET /api/v1/accounting/tally/export-xml?branchId=...&from=...&to=...`:
     - Generates a valid **Tally Prime `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA>...` XML payload** containing:
       - Master Ledgers (Suppliers, Customers, GST Ledgers, Sales/Purchase Accounts)
       - All Sales Vouchers (or Consolidated Daily POS Z-Report Sales Vouchers), Purchase GRN Vouchers, Receipt/Payment Vouchers, and Debit/Credit Notes.
     - Marks exported vouchers with `isSyncedToTally: true` so external Chartered Accountants can import the entire month into Tally Prime in 1 click with zero manual typing!

---

### [WO-604] Assigned to `DEV-4` (Supermarket HR, Salesman Line-Item Commissions, Biometric/Selfie Attendance & Automated Monthly Payroll Engine)
**Target Directory:** `apps/api/src/modules/hr/`
**Tasks:**
1. **Staff Master, RBAC Cost-Masking Guard & Shift Roster (`StaffHrService`):**
   - Manage employees, roles, shift rosters (`MORNING`, `EVENING`, `FULL_DAY`), base salary, overtime hourly rate, and salesman commission %.
   - Provide a reusable `CostMaskingInterceptor` or helper that strips `purchaseRate`, `netLandingCost`, and `actualMarginPct` from API responses if the requesting user's `Role.maskCostAndMargin === true`.
2. **Biometric Webhook & Geo-Fenced Selfie Attendance (`AttendanceService`):**
   - `POST /api/v1/hr/attendance/check-in` & `check-out`: Records staff attendance (`PRESENT`, `HALF_DAY`, `LATE`, `ABSENT`, `WEEKLY_OFF`), calculates `overtimeHours` using `Decimal`, and supports both Biometric device webhooks and POS/Mobile Selfie + GPS coordinates.
3. **Salesman Line-Item Commission & Staff Advance / Grocery Khata (`StaffKhataAndCommissionService`):**
   - `GET /api/v1/hr/commissions?branchId=...&month=...&year=...`: Aggregates `PosInvoiceLine` records where `salesmanId` is tagged, computing exact staff incentives earned across garments/vessels/special stock.
   - `POST /api/v1/hr/staff-khata`: Records mid-month salary cash advances and staff grocery purchases.
4. **Automated Supermarket Payroll Calculator (`PayrollService`):**
   - `POST /api/v1/hr/payroll/generate-monthly`:
     - For every active employee in the branch, computes the exact locked-in supermarket payroll formula using `Decimal(15,2)`:
       $$\text{Net Monthly Payout} = (\text{Pro-Rata Base Salary} + \text{Overtime Pay} + \text{Salesman Commissions}) - (\text{Leave Deductions} + \text{Mid-Month Cash Advances} + \text{Staff Grocery Purchases} + \text{POS Counter Cash Shortages})$$
     - Persists `MonthlyPayroll` records, generates printable staff payslips, and posts the salary journal voucher to the Accounting engine!

---

### [WO-605] Assigned to `DEV-5` (React Frontend in `apps/pos-web`: GST Filing & 2B Recon Hub, Double-Entry Accounting & Tally Export Studio, Bank/UPI Settlement Recon & HR/Payroll Page)
**Target Directory:** `apps/pos-web/src/features/accounting/` & `apps/pos-web/src/features/hr/` & `apps/pos-web/src/App.tsx`
**Tasks:**
Build high-density executive finance, tax, and HR screens in `apps/pos-web` and wire them into `App.tsx`:
1. **GST Compliance, GSTR-2B Reconciliation, Accounting & Tally Prime Hub (`FinanceGstAndTallyPage.tsx`):**
   - **Tab 1 (Live P&L, Trial Balance & Expense Entry):** Shows real-time Revenue, COGS, Gross Margin %, Closing Stock Valuation, Operating Expenses, and Net Profit + quick Store Expense voucher form.
   - **Tab 2 (GSTR-1, GSTR-3B & E-Invoicing):** 1-click download of GST Portal GSTR-1 JSON, HSN Summary table, Document Series table, and E-Invoice IRN generator.
   - **Tab 3 (GSTR-2B vs. Purchase GRN Reconciliation):** Highlights suppliers who haven't filed GST (**"ITC AT RISK — HOLD PAYMENT"** badge in red!).
   - **Tab 4 (UPI/Card Bank Settlement Recon & 1-Click Tally Prime XML Export):** Reconcile T+1 UPI/Card payouts (auto-calculating bank MDR charges) and 1-click **"Download Tally Prime XML"**.
2. **Supermarket HR, Attendance, Staff Khata & Monthly Payroll Studio (`HrAttendanceAndPayrollPage.tsx`):**
   - **Tab 1 (Attendance & Shift Roster):** Daily check-in/out board, overtime hours, and biometric/selfie status.
   - **Tab 2 (Staff Advances, Grocery Khata & Cashier POS Shortages):** View mid-month salary advances, staff grocery bills, and auto-linked Z-Report counter cash shortages.
   - **Tab 3 (Salesman Incentives & 1-Click Monthly Payroll Run):** Run monthly payroll showing the full breakdown (`Base + OT + Commission - Leaves - Advances - Groceries - Counter Shortages = Net Pay`) with printable Payslip view.

---

## SECTION D: MANDATORY AUTOMATED REPORT GENERATION (`agy-cli/WO_TO_HO_REPORT.md`)

When `REMOD-501` (`A`, `B`) and `WO-601` through `WO-605` are complete:
1. Run `pnpm --filter @ti-erp/database prisma validate`, `pnpm -r typecheck`, and `pnpm build` and verify **0 errors** across all 6 packages.
2. Commit all work to `main` and generate `agy-cli/WO_TO_HO_REPORT.md` containing:
   - Executive Summary & Verified Commit SHA
   - `REMOD-501` verification snippets (Dynamic UPI VPA from `StoreConfig` + Proportionate Loyalty Point Clawback on Sales Return)
   - Work Order Completion Matrix (`WO-601` to `WO-605`)
   - Core Milestone 6 algorithm snippets (`AccountingVoucherService`, `Gstr2bReconciliationService`, `BankReconciliationService`, `TallyExportService`, and `PayrollService.generateMonthlyPayroll`)
   - Exact terminal outputs of `prisma validate`, `pnpm -r typecheck`, `pnpm build`, and `git show --stat HEAD`.
3. Push to `origin/main` so the Boss can hand `agy-cli/WO_TO_HO_REPORT.md` to Argon CTO.
