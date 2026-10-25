# TI-ERP EXECUTION STATE TRACKER
**Current Phase:** Phase 5 — Customer CRM, Tiered Loyalty & OTP Redemption, Monthly Credit Khata, Ration Cycle Reminders, Gift Cards, Home Delivery Pick-Pack & Queue-Buster mPOS
**Active Milestone:** DISPATCH-005 (Milestone 5)
**Status:** `IN_PROGRESS`
**Last Verified Commit:** `b496606bc2cdba2a014edb594face9f9f785144d`
**Last Updated:** 2026-10-25T12:45:00+05:30

---

## Milestone Roadmap
- [x] **M1: Foundation & Database Architecture** (Monorepo, Docker LAN/Cloud Setup, Full Prisma Schema, Config Engine) — `COMPLETED (Commit: 11613591e87e1199a51c730eb92cdb75b9316955)`
- [x] **M2: Core Masters & Inventory Engine** (Tenants, Branches, Bins, Multi-UOM, Products, Batches/MRP, Barcodes, Repacking, Combos) — `COMPLETED & VERIFIED`
- [x] **M3: Procurement, Supplier & AI OCR Engine** (PO, Auto-Reorder, GRN Fast & 3-Way Match, Net Landing Cost, Debit Notes, Consignment, BYOK AI OCR) — `COMPLETED & VERIFIED`
- [x] **M4: High-Speed POS, Promotions, Shift Registers & Hardware Bridge** (Keyboard POS, LAN Hold/Recall, Split Pay, Schemes, EscPOS/Scale/ZPL Bridge) — `COMPLETED — PENDING REMOD-401 PATCH (Commit: b496606bc2cdba2a014edb594face9f9f785144d)`
- [ ] **M5: CRM, Loyalty, Khata, Home Delivery & Queue-Buster mPOS** (Points, OTP, Credit Ledger, Pick-Pack, Queue-Buster mPOS) — `IN_PROGRESS`
- [ ] **M6: GST, Double-Entry Accounting & HR/Payroll** (Auto-Vouchers, GSTR-1/2B/3B, Tally XML, Attendance, Payroll)
- [ ] **M7: Sync Engine, AI Copilot, Owner Mobile & SaaS License Portal** (LAN-to-Cloud Sync, BYOK AI, Super-Admin)

---

## Active Work Orders (`DISPATCH-005` / Milestone 5)

| WO ID | Assigned Dev | Module & Scope | Status | Deliverables |
| :--- | :--- | :--- | :--- | :--- |
| `REMOD-401A` | `DEV-1` | Automated Diff Capture in `verify-and-bundle.js` | `IN_PROGRESS` | `agy-cli/verify-and-bundle.js` capturing `git show --stat HEAD` and `git diff HEAD~1 HEAD` post-commit. |
| `REMOD-401B` | `DEV-3` | 1-Paisa GST Back-Calculation Accounting Identity & Inter-State B2B IGST | `IN_PROGRESS` | `PosBillingService.checkout()` enforcing `lineTaxable = lineNet - (lineCgst + lineSgst + lineIgst + lineCess)` and customer GSTIN state check. |
| `REMOD-401C` | `DEV-3` | Prevent Double Stock Deduction on `PRE_PACKED` vs. `DYNAMIC_POS` Combos | `IN_PROGRESS` | `PosBillingService.checkout()` checking `comboMode === DYNAMIC_POS` before deducting child BOM items, plus `assemblePrePackedCombo` in `InventoryBatchService`. |
| `WO-501` | `DEV-1` | Customer CRM, Tiered Loyalty Engine, Margin Points & Anti-Fraud OTP | `IN_PROGRESS` | `apps/api/src/modules/crm/loyalty/`: Customer lookup/register, category/margin point calculation, tier auto-upgrades (`SILVER`/`GOLD`/`VIP`), time-bound OTP generation & verification. |
| `WO-502` | `DEV-2` | Customer Credit Khata, Credit Limit Guardrails, Monthly WhatsApp & Gift Cards | `IN_PROGRESS` | `apps/api/src/modules/crm/khata-giftcards/`: Khata credit limit/days enforcement, supervisor PIN override, repayments, monthly WhatsApp statements with UPI link, prepaid gift cards issue/validate/deduct. |
| `WO-503` | `DEV-3` | 1st-to-10th Monthly Ration Cycle Tracker, RFM Segmentation & Digital WhatsApp Receipts | `IN_PROGRESS` | `apps/api/src/modules/crm/campaigns/`: RFM segmentation (`CHAMPIONS`, `AT_RISK_MISSING_RATION`, etc.), 1st-to-10th cycle detector, comeback coupons, digital receipt dispatch & 1-5 star feedback. |
| `WO-504` | `DEV-4` | Home Delivery Pick-Pack-Dispatch, Aisle-Sorted Pick-Lists & Queue-Buster Mobile mPOS | `IN_PROGRESS` | `apps/pos/fulfillment/`: WhatsApp/phone delivery orders, aisle/rack walking order pick-lists, rider evening cash/UPI reconciliation, mobile mPOS queue-token generation (`QB-XXXX`) & cart recall. |
| `WO-505` | `DEV-5` | React Frontend in `apps/pos-web`: CRM/Loyalty/Khata/Ration UI & Delivery/Queue-Buster UI | `IN_PROGRESS` | `apps/pos-web/src/features/crm/CrmLoyaltyAndKhataPage.tsx`, `apps/pos-web/src/features/fulfillment/DeliveryAndQueueBusterPage.tsx`, wired into `App.tsx` and `PosBillingScreen.tsx`. |
