# HO_TO_WO_DISPATCH.md
**From:** Argon (Director & CTO — Head Office / Gemini Web)
**To:** Agy CLI Execution Squad (5x Senior Devs — Flash 3.8 High)
**Repository:** `https://github.com/Ganesaperumal/TI_ERP.git`
**Last Verified Commit:** `594dae17c99c253b00f79c4d956b8138045524ae`
**Dispatch ID:** `DISPATCH-007` (`REMOD-601` Fixes + Final Milestone 7: LAN-to-Cloud Sync Engine, BYOK AI "Ask My Supermarket" Copilot & Dead-Stock Cleanser, Regional Transliteration, Owner Mobile Command Center, 10:30 PM Nightly Closing Report & Super-Admin SaaS License Portal)
**Status:** `EXECUTE IMMEDIATELY`

---

## SECTION A: DOCUMENTATION & STATE TRACKER UPDATES (MANDATORY FIRST STEP)

1. **Update `agy-cli/02_STATE_TRACKER.md`:**
   - Mark **M5: CRM, Loyalty, Khata, Home Delivery & Queue-Buster mPOS** as `COMPLETED & VERIFIED`.
   - Mark **M6: GST, Double-Entry Accounting, Bank Recon, Tally Bridge & HR/Payroll (`WO-601` to `WO-605`)** as `COMPLETED — PENDING REMOD-601 PATCH (Commit: 594dae17c99c253b00f79c4d956b8138045524ae)`.
   - Mark **M7: LAN-to-Cloud Sync Engine, AI Copilot, Owner Mobile Command Center & SaaS License Portal (`WO-701` to `WO-705`)** as `IN_PROGRESS`.

---

## SECTION B: CTO CODE AUDIT & RE-MODIFICATION ORDERS (`REMOD-601`)

Fix these 2 accounting/tax edge cases caught during Argon CTO's inspection of Commit `594dae17c99c253b00f79c4d956b8138045524ae`:

### 1. `[REMOD-601A]` Assigned to `DEV-2` — Include `cessAmount` in `booksTax` during GSTR-2B Reconciliation
- **File:** `apps/api/src/modules/accounting/gst/gstr2b-reconciliation.service.ts`
- **Issue:** When aggregating `booksTax` from `grn.lineItems`, `l.cessAmount` was omitted (`booksTax.add(l.cgstAmount).add(l.sgstAmount).add(l.igstAmount)`), causing false mismatches on aerated drinks and sin goods carrying GST Compensation Cess.
- **Fix:** Include `.add(l.cessAmount ?? 0)` in `booksTax` across both matched and unmatched GRN loops.

### 2. `[REMOD-601B]` Assigned to `DEV-3` — Handle Negative MDR / Excess Settlement Credit in `BankReconciliationService`
- **File:** `apps/api/src/modules/accounting/reconciliation-tally/bank-reconciliation.service.ts`
- **Issue:** If `actualCredited > expectedGross` (`mdrFee < 0`, e.g., gateway incentive or rounding excess), the voucher only debited `actualCredited` and credited `expectedGross`, causing `AccountingVoucherService` to throw an unbalanced voucher exception.
- **Fix:** If `mdrFee.lessThan(0)`, add a Credit line for `mdrFee.abs()` to Other Store/Settlement Income (`INCOME`) so $\sum \text{Debit} === \sum \text{Credit}$ always holds.

---

## SECTION C: NEW MODULAR WORK ORDERS — FINAL MILESTONE 7 (`WO-701` TO `WO-705`)

Milestone 7 completes the commercial SaaS & Model-B hybrid architecture: **Conflict-Free LAN-to-Cloud Delta Sync Engine, BYOK AI "Ask My Supermarket" Copilot & Dead-Stock Offer Designer, Regional Bilingual Transliteration & Legacy ERP Migrator, Owner Mobile Live Command Center + 10:30 PM Nightly WhatsApp Report, and the Software Vendor Super-Admin License Control Portal (`apps/cloud-admin`)**.

### [WO-701] Assigned to `DEV-1` (Model-B LAN-to-Cloud Delta Sync Engine, Conflict Resolver & Offline Outbox Worker)
**Target Directory:** `apps/api/src/modules/sync/`
**Tasks:**
1. **Transactional Sync Outbox & Inbox Engine (`SyncEngineService` & Controller `/api/v1/sync`):**
   - **Outbox Capture & Batch Push (`POST /api/v1/sync/outbox/queue` & `POST /api/v1/sync/push-to-cloud`):**
     - Collects pending `SyncOutbox` mutations (`PENDING`, `FAILED`) ordered by `createdAt ASC`, batches them (up to 250 records per batch), and pushes them to the Cloud Sync endpoint with idempotency keys and `syncVersion`.
   - **Cloud-to-Branch Pull (`GET /api/v1/sync/pull-from-cloud?branchId=...&sinceVersion=...`):**
     - Allows a local store server to pull new master catalog items, price overrides, promotion rules, and inter-branch stock transfer dispatches (`GOODS_IN_TRANSIT`) created at Head Office.
   - **Deterministic Conflict Resolution:**
     - For append-only ledgers (`PosInvoice`, `StockLedger`, `JournalVoucher`, `LoyaltyLedger`), enforces idempotent upsert by UUID.
     - For mutable masters (`Product`, `Customer`, `StoreConfig`), resolves conflicts using `[syncVersion DESC, updatedAt DESC]` and updates `lastSyncedAt`.
   - **Sync Health & Diagnostics Endpoint (`GET /api/v1/sync/status?branchId=...`):**
     - Returns `pendingOutboxCount`, `failedOutboxCount`, `lastSuccessfulSyncAt`, `isCloudReachable`, and a 1-click `POST /api/v1/sync/retry-failed` trigger.

---

### [WO-702] Assigned to `DEV-2` (BYOK AI Copilot: "Ask My Supermarket" Natural Language Analytics, AI Dead-Stock & Expiry Offer Designer, and Bilingual Regional Name Transliterator)
**Target Directory:** `apps/api/src/modules/ai-copilot/`
**Tasks:**
Expand `AiCopilotModule` with the remaining Section 8.5 commercial intelligence tools:
1. **AI "Ask My Supermarket" Natural Language Query Copilot (`POST /api/v1/ai-copilot/ask-supermarket`):**
   - Allows the owner to ask questions in English or Tamil/Hindi/regional language (e.g., *"Which 10 items gave me the highest profit this month?"*, *"Why did Counter 2 have bill voids yesterday?"*, *"Which suppliers have GST ITC at risk?"*).
   - Safely classifies intent across live store metrics (`TOP_PROFIT_ITEMS`, `CASHIER_VOIDS_AUDIT`, `LOW_STOCK_REORDER`, `EXPIRING_BATCHES`, `DAILY_SALES_TENDER_BREAKUP`, `SUPPLIER_ITC_RISK`), queries the exact real-time PostgreSQL data for `branchId`, and synthesizes a clear, executive answer + structured data table using `AiProviderService`.
2. **AI Dead-Stock & Near-Expiry Combo/Discount Cleanser (`POST /api/v1/ai-copilot/design-clearance-combos`):**
   - Scans slow-moving batches (0 sales in last 30 days) and near-expiry batches (expiring in $\le 45$ days).
   - Pairs slow-moving high-margin items with fast-moving anchor staples (like Sugar, Atta, or Oil) to automatically suggest profitable **Weekend Combo Kits** or **Clearance Promotion Rules**, with a 1-click **"Activate Promotion Rule"** endpoint!
3. **Bilingual Regional Transliteration & Translation Helper (`POST /api/v1/ai-copilot/transliterate-product`):**
   - Given an English product name (`"Ponni Boiled Rice 5kg"`, `"Toor Dal 1kg"`, `"Idhayam Gingelly Oil 1L"`) and target language (`ta-IN` Tamil, `hi-IN` Hindi, `kn-IN` Kannada, `te-IN` Telugu, `ml-IN` Malayalam), automatically returns the accurate regional script name (`"பொன்னி புழுங்கல் அரிசி 5 கிலோ"`, `"துவரம் பருப்பு 1 கிலோ"`) using a built-in Indian grocery dictionary + BYOK AI fallback so thermal receipts and shelf tags print bilingually out of the box!

---

### [WO-703] Assigned to `DEV-3` (Owner Mobile Live Command Center API, 10:30 PM Nightly WhatsApp Closing Summary Generator & SaaS Vendor License Control Engine)
**Target Directory:** `apps/api/src/modules/owner-analytics/` & `apps/api/src/modules/saas-admin/`
**Tasks:**
1. **Owner Live Command Center Aggregator (`GET /api/v1/owner/live-dashboard?tenantId=...&branchId=...`):**
   - Returns real-time supermarket KPIs in a single fast payload:
     - **Today's Live Revenue, Bill Count, Average Basket Value, and Live Gross Profit (₹ and %)** (computed from `PosInvoiceLine.netLandingCostSnapshot`).
     - **Tender Split Breakup:** Cash vs. UPI vs. Card vs. Sodexo vs. Customer Khata vs. Loyalty Points.
     - **Live Counter Status:** Active cashiers, terminal status, current shift cash in drawer, and Safe Drops.
     - **Top 20 Selling SKUs & Categories Today.**
     - **Security & Shrinkage Alerts:** Today's voided lines, cancelled bills, manual price overrides, negative stock sales, and low-rating customer feedback ($\le 3$ stars).
2. **Automated 10:30 PM Nightly Store Closing Report (`POST /api/v1/owner/generate-nightly-closing-report`):**
   - Compiles the complete **1-Page Executive Daily Closing Report** (Sales, Gross Profit, Cash in Safe, UPI Pending Bank Settlement, Purchase GRNs Entered, Stock-Outs, Near-Expiry Value, and Cashier Shift Shortages) formatted for instant WhatsApp PDF/message dispatch at 10:30 PM!
3. **Software Vendor Super-Admin License & AMC Control API (`SaasLicenseAdminService` — `/api/v1/saas-admin/licenses`):**
   - For YOU (the Software Owner selling TI-ERP to 100+ supermarkets):
   - Create/Activate/Suspend client `SaaSLicense` & `Tenant` accounts.
   - Toggle enabled modules per client (`BASIC_POS`, `MULTI_BRANCH`, `AI_COPILOT`, `TALLY_BRIDGE`, `HR_PAYROLL`, `WHATSAPP_CRM`).
   - Track Annual Maintenance Contract (`amcExpiryDate`) renewals, client branch/counter limits, and issue license keys.

---

### [WO-704] Assigned to `DEV-4` (Next.js Cloud Portal in `apps/cloud-admin`: Owner Mobile Command Center PWA + Software Vendor Super-Admin License Control Panel)
**Target Directory:** `apps/cloud-admin/src/app/`
**Tasks:**
Transform `apps/cloud-admin` (Next.js 14 App Router) from a placeholder into the complete dual-mode Cloud Portal:
1. **View 1 — Owner Mobile Live Command Center (`/owner-dashboard` & integrated in `/`):**
   - Mobile-first, executive dark/light dashboard showing:
     - Multi-Branch switcher (`All Branches (Consolidated HO)` vs. `Main Supermarket` vs. `Branch 2`).
     - Live Sales, Real-Time Gross Profit Margin %, Cash vs. UPI vs. Khata meters, Active POS Terminal status cards, Red Anti-Theft Exception/Void alerts, Top Selling Items, and 1-click **"Send 10:30 PM Nightly WhatsApp Closing Summary"**.
     - Embedded **"Ask My Supermarket" AI Copilot Chat Drawer** where the owner can tap or type questions on their phone!
2. **View 2 — Software Vendor Super-Admin License Control Portal (`/super-admin` & tab in `/`):**
   - Executive SaaS control center for managing all supermarket clients:
     - Active Supermarket Clients table (Store Name, License Key, Plan Tier, Branches/Counters Used, AMC Expiry Countdown, License Status `ACTIVE` / `GRACE_PERIOD` / `SUSPENDED`).
     - **Module Feature-Flag Matrix:** 1-click switches to enable/disable `Multi-Branch`, `BYOK AI Copilot`, `Tally XML Bridge`, `HR & Payroll`, and `Home Delivery` per client!
     - **1-Click New Supermarket Tenant Provisioner:** Onboards a new supermarket client with pre-loaded 50k+ FMCG seed catalog in 30 seconds.

---

### [WO-705] Assigned to `DEV-5` (React Frontend in `apps/pos-web`: AI Copilot & Dead-Stock Cleanser Studio, LAN-to-Cloud Sync Status Monitor, Legacy ERP Migrator & Complete End-to-End Navigation Polish)
**Target Directory:** `apps/pos-web/src/features/ai-sync/` & `apps/pos-web/src/App.tsx`
**Tasks:**
1. **AI Supermarket Copilot, Dead-Stock Combo Designer & Legacy ERP Importer (`AiCopilotAndSyncPage.tsx`):**
   - **Tab 1 ("Ask My Supermarket" AI Chat & Bilingual Transliterator):** Interactive natural-language query console + instant English-to-Tamil/Hindi/Regional product name transliteration tester.
   - **Tab 2 (AI Dead-Stock & Near-Expiry Combo Cleanser):** Displays AI-recommended Weekend Combos pairing dead-stock/near-expiry items with fast-moving staples, showing projected margin recovery and 1-click **"Create & Activate Combo Offer"**.
   - **Tab 3 (Model-B LAN-to-Cloud Sync Monitor & Legacy ERP Migrator):** Live sync outbox/inbox health status, manual **"Sync Now with Cloud HO"** button, and 1-click **Legacy ERP Importer** (import templates for Tally, GoFrugal, Marg, and CSV/Excel item/customer/supplier balances).
2. **Unified Navigation & Production Readiness Polish (`apps/pos-web/src/App.tsx` & `README.md`):**
   - Ensure all 12 core screens across `apps/pos-web` are cleanly accessible from the top/side navigation bar with keyboard shortcuts, role badges, live LAN/Cloud sync indicator, and store branch switcher.
   - Update root `README.md` with the complete **TI-ERP Production Deployment, Docker Startup, Hardware Bridge Setup, and Architecture Guide**.

---

## SECTION D: MANDATORY FINAL MILESTONE REPORT (`agy-cli/WO_TO_HO_REPORT.md`)

When `REMOD-601` (`A`, `B`) and `WO-701` through `WO-705` are complete:
1. Update `agy-cli/02_STATE_TRACKER.md` marking **M1 through M7 as `100% COMPLETED & VERIFIED`**.
2. Run `pnpm --filter @ti-erp/database prisma validate`, `pnpm -r typecheck`, and `pnpm build` — MUST show **0 errors** across all 6 workspace packages (`@ti-erp/shared-types`, `@ti-erp/database`, `@ti-erp/hardware-bridge`, `@ti-erp/api`, `@ti-erp/pos-web`, `@ti-erp/cloud-admin`).
3. Commit all work to `main` and generate `agy-cli/WO_TO_HO_REPORT.md` containing:
   - Executive Summary & Final Verified Commit SHA
   - `REMOD-601` verification snippets (`cessAmount` in GSTR-2B recon + negative MDR handling in Bank Recon)
   - Work Order Completion Matrix (`WO-701` to `WO-705`)
   - Core Milestone 7 algorithm snippets (`SyncEngineService`, `AiCopilotService.askSupermarket` & `transliterateProduct`, `OwnerAnalyticsService`, and `SaasLicenseAdminService`)
   - Full M1–M7 Master Blueprint Completion Checklist
   - Exact terminal outputs of `prisma validate`, `pnpm -r typecheck`, `pnpm build`, and `git show --stat HEAD`.
4. Push to `origin/main` and hand `agy-cli/WO_TO_HO_REPORT.md` to Argon CTO for final sign-off!
