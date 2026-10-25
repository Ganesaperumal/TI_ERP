# HO_TO_WO_DISPATCH.md
**From:** Argon (Director & CTO — Head Office / Gemini Web)
**To:** Agy CLI Execution Wing (5x Senior Devs — Flash 3.8 High)
**Repository:** `https://github.com/Ganesaperumal/TI-ERP.git`
**Dispatch ID:** `DISPATCH-001` (Milestone 1: Foundation, Monorepo, Docker & Full Enterprise Prisma Schema)
**Status:** `EXECUTE IMMEDIATELY`

---

## PART 1: MANDATORY REPO & OFFLINE BRAIN INITIALIZATION
Before starting dev work, the Lead Dispatcher / `DEV-1` MUST create/update the following permanent offline memory files inside `agy-cli/` so Head Office (Argon Web) and Agy CLI remain 100% synchronized across any session or account:

1. **`agy-cli/00_BOOTLOADER_ARGON.md`**: Stores the HO <-> WO Single-File MD Communication Protocol (`HO_TO_WO_DISPATCH.md` and `WO_TO_HO_REPORT.md`), the 5 Senior Dev roles, and strict coding rules (Zero `any`, `Decimal(15,4)` for quantities/costs, `Decimal(15,2)` for currency, UUID/ULID offline-safe IDs, `tenantId` + `branchId` + `syncVersion` on all operational tables, and 100% Plug-and-Play `StoreConfig` toggles).
2. **`agy-cli/01_MASTER_BLUEPRINT.md`**: Persist the full locked-in specification across all 8.5 sections:
   - **Sec 1:** Model B (Local LAN Store Server + Cloud Sync), PostgreSQL + NestJS (TS) + React/Vite/Next.js + Electron/Tauri Hardware Bridge, BYOK AI keys, all 5 Hardware Peripherals (Silent ESC/POS Thermal + Drawer Kick, ZPL/TSPL Barcode Sticker Designer, Weighing Scale Barcode Prefix + Live Serial RS232/USB, Customer Dual Display with Dynamic UPI QR, EDC/Soundbox Hooks for Pine Labs/Paytm/PhonePe/Razorpay).
   - **Sec 2:** Single-Store vs. Multi-Branch HO Toggle, Internal Bins (`GODOWN`, `SHOP_FLOOR`, `DAMAGED_RETURNABLE`, `DAMAGED_SCRAP`), Goods-in-Transit (GIT) Stock Transfers with E-Way Bill/Challan, Branch Price Overrides, Terminal Locking, Opening Float, Safe Drop, Blind Cash Close (Denomination count -> X/Z Report -> Cashier Shortage Ledger).
   - **Sec 3:** 5 Product Types (Standard FMCG with Multi-Barcode Aliases, Weighed Loose Goods, Bulk-to-Retail Repacking with Packaging & Wastage Costing, Pre-packed & Dynamic Combos/BOM, Apparel Size/Color Matrix), Multi-UOM Hierarchies (`Piece`, `Pack`, `Box`, `Carton`), Item/Store-level toggle for POS Batch/MRP Popup vs. Auto-FEFO, Near-Expiry Clearance, Live Rack-wise Cycle Counting (Stock Freeze Snapshot), Negative Stock Rule (`ALLOW`, `WARN_PIN`, `BLOCK`), Shelf-Edge Gondola Tag printing.
   - **Sec 4:** Auto-Reorder (Min/Max & Sales Velocity -> WhatsApp PDF PO), Fast Direct GRN vs. Enterprise 3-Way Match (PO -> Gate Entry -> Blind GRN -> Invoice), BYOK AI Invoice OCR, Multi-Layer Scheme & True Net Landing Cost Calculator, Red Margin Guardrail during GRN, Consignment (Pay-on-Sale) Inventory, Supplier Credit Alerts & Debit Notes.
   - **Sec 5:** Keyboard-first + Touch POS with Remappable Function Keys (`F1-F12`), Cross-Counter LAN Hold/Recall Bills, 3-digit PLU & Phonetic Search, Multi-Mode Split Payment (Cash + UPI + Card + Sodexo + Credit Note + Loyalty + Khata), Retail vs. Wholesale Tier Toggle, Rule-Based Promotions (BOGO, Mix & Match, Cart-Slab Upsell Prompt, Happy Hour, Receipt Coupons), Barcode Bill Scan Returns/Instant Exchange/Credit Slip, Home Delivery Pick-List & Delivery Boy Reconciliation, Queue-Buster Mobile mPOS.
   - **Sec 6:** Loyalty Points (Category/Margin rules, Silver/Gold/VIP tiers, Optional OTP Redemption), Customer Credit Khata (Limits, Automated 1st-of-Month WhatsApp Statement + UPI Link), Digital WhatsApp Bills & Star Feedback, 1st-to-10th Monthly Ration Missing Customer Alerts, RFM Segmentation, Barcoded Prepaid Gift Cards.
   - **Sec 7:** Regular GST vs. Composition Toggle, MRP Tax Back-Calculation, HSN Receipt Summary, GSTR-1/2B/3B Exports, E-Invoicing (IRN/QR) & E-Way Bill hooks, Automated Double-Entry Accounting (Chart of Accounts, Day Book, Cash/Bank Book, General Ledger, Trial Balance, P&L, Balance Sheet), UPI/Bank MDR Settlement Reconciliation, 1-Click Tally Prime XML Exporter.
   - **Sec 8 & 8.5:** POS Supervisor Override (PIN/Barcode/Mobile) & Daily Void/Exception Report, RBAC with Cost/Margin Masking, Salesman Commissions, Biometric/Selfie Attendance & Shift Roster, Staff Payroll (Salary + Incentives - Leaves - Advances - Staff Groceries - POS Shortages), 50k+ Indian FMCG Seed Structure, Legacy Importer, Bilingual/Regional Receipts (English + Tamil/Hindi/etc.), Owner Mobile Dashboard + 10:30 PM WhatsApp Summary, Super-Admin SaaS License Control.
3. **`agy-cli/02_STATE_TRACKER.md`**: Track Milestone 1 (`DISPATCH-001`) as `IN_PROGRESS`.

---

## PART 2: PARALLEL WORK ORDERS FOR THE 5 SENIOR DEVS

Execute these 5 Work Orders modularly without overlapping file conflicts.

### [WO-101] Assigned to `DEV-1` (Monorepo, Turborepo & Model-B Docker Infrastructure)
**Objective:** Initialize the production Turborepo monorepo and Model-B Local LAN + Cloud Docker environment.
**Exact Files to Create:**
1. `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`
2. Workspace structure:
   - `apps/api` (NestJS TypeScript Backend — runs on both Local Store Server & Cloud)
   - `apps/pos-web` (React + Vite + TypeScript — Ultra-fast POS, Store ERP & Customer Dual Display)
   - `apps/cloud-admin` (Next.js App Router + TypeScript — Owner Mobile Command Center, Multi-Branch HO & SaaS Super-Admin License Portal)
   - `apps/hardware-bridge` (Lightweight Node/Electron/Tauri Local Agent for Silent ESC/POS Print, Cash Drawer Kick, ZPL Barcode Print & Serial RS232/USB Weighing Scales)
   - `packages/database` (Prisma ORM, migrations, seed scripts, and database client export)
   - `packages/shared-types` (Shared DTOs, Enums, `StoreConfig` JSONB interfaces, Keyboard Shortcut maps)
3. `docker/docker-compose.local-store.yml` (PostgreSQL 16 + Redis for LAN Hold-Bill/WebSocket pub-sub + Local Store API container)
4. `docker/docker-compose.cloud.yml` (Cloud PostgreSQL 16 + Redis + Cloud Sync API)

---

### [WO-102] Assigned to `DEV-2` (Prisma Schema Part A: Tenants, Licensing, Branches, Bins, RBAC, Counters & Sync Queue)
**Objective:** Write the foundational multi-tenant, multi-branch, register shift, and LAN-to-Cloud sync models in `packages/database/prisma/schema.prisma` (or modular Prisma schema files inside `packages/database/prisma/schema/` using Prisma `prismaSchemaFolder` preview feature so Devs 2, 3, and 4 can work in parallel!).
**Use Prisma Multi-File Schema (`previewFeatures = ["prismaSchemaFolder"]`):**
Create `packages/database/prisma/schema/01_core_tenant_branch.prisma` containing:
- `SaaSLicense` & `Tenant` (License key, plan tier, active modules JSONB, AMC expiry, BYOK AI keys encrypted config, GST regime: `REGULAR` | `COMPOSITION`, topology: `SINGLE_STORE` | `MULTI_BRANCH`).
- `Branch` (Store/Warehouse type: `HEAD_OFFICE`, `WAREHOUSE`, `RETAIL_STORE`, GSTIN, address, regional language code e.g. `ta-IN`, `hi-IN`, local server IP, `branchSettings` JSONB for plug-and-play overrides).
- `StorageBin` (`GODOWN`, `SHOP_FLOOR`, `DAMAGED_RETURNABLE`, `DAMAGED_SCRAP`, `CONSIGNMENT` with aisle/rack/shelf coordinates).
- `Role` & `User` (Granular permissions JSONB, `maskCostAndMargin: Boolean`, encrypted 4-digit `supervisorPin`, barcode badge hash, salesman commission rate).
- `PosTerminal` & `CashierShift` (Terminal MAC/ID lock, `openingFloat`, `midDaySafeDrops`, `blindCloseEnabled`, expected vs. physical denomination JSONB breakdown, `shortageOrExcessAmount`, X/Z-Report status).
- `AuditExceptionLog` (Tracks every POS line void, bill cancel, manual price change, duplicate bill print, no-sale drawer kick with `cashierId`, `supervisorId`, timestamp).
- `SyncOutbox` & `SyncInbox` (Tracks LAN-to-Cloud delta mutations with `entityName`, `recordId`, `operation`, `payload`, `syncVersion`, `status`).

---

### [WO-103] Assigned to `DEV-3` (Prisma Schema Part B: Products, Multi-UOM, Batches/MRP, Repacking, Combos & Procurement)
**Objective:** Create `packages/database/prisma/schema/02_inventory_procurement.prisma` covering Sections 3 & 4 without missing a single field:
- `Category`, `Brand`, `HsnTaxMaster` (`cgstRate`, `sgstRate`, `igstRate`, `cessRate`, `cessPerUnit`).
- `Product` (SKU code, `nameEn`, `nameRegional`, `shortPluCode` for 3-digit lookup, `productType`: `STANDARD_FMCG` | `WEIGHED_LOOSE` | `REPACKED_BULK` | `COMBO_KIT` | `VARIANT_MATRIX`, `baseUom`, `batchTrackingMode`: `STORE_DEFAULT` | `POPUP_ON_MRP_DIFF` | `AUTO_FEFO`, `negativeStockRule`: `STORE_DEFAULT` | `ALLOW` | `WARN_PIN` | `BLOCK`, `isConsignment`, `minStock`, `maxStock`, `reorderVelocityDays`).
- `ProductBarcode` (Many-to-one alias mapping so 1 SKU can have multiple factory/internal EAN barcodes, linked optionally to a specific `uomId` or `batchId`).
- `ProductUomConversion` (`uomName` e.g., Box, Carton, `conversionFactor` `Decimal(15,4)`, `barcode`, tier prices).
- `ProductVariant` (Size, Color, Style matrix linked to parent `Product`).
- `ComboBomItem` (Links parent Combo SKU to child SKUs with quantity and price apportionment, supporting `PRE_PACKED` and `DYNAMIC_POS` modes).
- `InventoryBatch` (Per `branchId` + `productId` + `batchNumber` + `expiryDate` + `mrp` + `purchaseRate` + `netLandingCost` + `retailSellingPrice` + `wholesalePriceTier1` + `wholesalePriceTier2` + `clearanceDiscountPct`).
- `BinStockBalance` & `StockLedger` (Exact quantity `Decimal(15,4)` per `branchId` + `binId` + `batchId`, immutable audit trail of every stock movement).
- `RepackingJob` (Bulk parent SKU + Batch consumed -> Retail child SKU + new Batch produced, `bulkQtyConsumed`, `retailPacksProduced`, `wastageQty`, `packagingMaterialCost`, auto-calculated new batch landing cost).
- `StockTransfer` & `StockTransferItem` (Inter-branch Indent -> Dispatched `GOODS_IN_TRANSIT` -> Received -> Discrepancy shortage/damage + `eWayBillNo`, `vehicleNo`).
- `CycleCountSession` & `CycleCountItem` (Rack/Category live audit with `systemFrozenQty`, `physicalCountedQty`, `varianceQty`, approval status).
- `Supplier`, `PurchaseOrder`, `GoodsReceiptNote` (GRN supporting Fast Direct Mode & 3-Way Match Mode, AI OCR source metadata), `GrnLineItem` (Qty, Free/Scheme Qty, Trade Disc %, Cash Disc %, Apportioned Freight, GST, calculated `netLandingCost`, margin guardrail flag), `PurchaseReturnDebitNote`, `ConsignmentSettlement`.

---

### [WO-104] Assigned to `DEV-4` (Prisma Schema Part C: POS Billing, Promotions, CRM/Loyalty/Khata, GST, Accounting & HR/Payroll)
**Objective:** Create `packages/database/prisma/schema/03_pos_crm_finance_hr.prisma` covering Sections 5, 6, 7 & 8:
- `PosInvoice` & `PosInvoiceLine` (Supports `WALK_IN_RETAIL`, `WHOLESALE_B2B`, `HOME_DELIVERY`, `MPOS_QUEUE_TOKEN`; stores `mrp`, `sellingPrice`, `netLandingCostSnapshot` for live daily gross profit calculation, `discountAmount`, `promoId`, `taxableAmount`, `cgstAmount`, `sgstAmount`, `igstAmount`, `cessAmount`, `salesmanId`).
- `PosParkedBill` (Cross-counter LAN held bills with cart JSONB and terminal info).
- `PosPaymentSplit` (Supports `CASH`, `UPI`, `CARD`, `SODEXO`, `CREDIT_NOTE_SLIP`, `LOYALTY_POINTS`, `CUSTOMER_KHATA`, `GIFT_CARD` with EDC terminal ref, UPI txn ID, cash tendered & change returned, and `bankSettlementStatus` for MDR reconciliation).
- `SalesReturn` & `CreditNoteSlip` (Barcoded credit slip with expiry, exchange link, or PIN-approved refund).
- `PromotionRule` (Engine supporting `BOGO`, `MIX_AND_MATCH`, `CART_SLAB_UPSELL`, `HAPPY_HOUR`, `COUPON_CODE` with start/end dates, active days/hours, condition JSONB, reward JSONB).
- `DeliveryOrder` & `DeliveryBoySettlement` (Pick-list status, rack-sorted items, assigned rider, COD/UPI reconciliation).
- `Customer`, `LoyaltyLedger`, `CustomerKhataLedger`, `GiftCard` (Phone number lookup, Silver/Gold/VIP tier, points balance, OTP verification log, credit limit, monthly WhatsApp statement status, 1st-to-10th monthly ration cycle tracker, RFM score).
- `AccountGroup`, `LedgerAccount`, `JournalVoucher`, `JournalVoucherLine` (Complete double-entry bookkeeping, linking POS Z-Reports, GRNs, Expenses, Bank/UPI settlements, and Tally XML export sync flag).
- `GstReturnFilingLog` & `EInvoiceLog` (GSTR-1, GSTR-2B reconciliation status, GSTR-3B, IRN, AckNo, SignedQRCode).
- `StaffAttendance`, `StaffAdvanceAndGroceryKhata`, `MonthlyPayroll` (Links base salary, overtime, salesman line-item commissions, minus leaves, advances, staff grocery bills, and `CashierShift` cash shortages).

---

### [WO-105] Assigned to `DEV-5` (Plug-and-Play `StoreConfig` Engine, Shared DTOs & Verification Pipeline)
**Objective:** Create `packages/shared-types` with the master Plug-and-Play configuration contract and validate the entire workspace build.
**Exact Files to Create:**
1. `packages/shared-types/src/store-config.interface.ts`: Strongly-typed TypeScript interfaces and default presets for every store-owner configurable toggle we locked in (Topology mode, Hardware config, Scale barcode prefix rule `20+SKU+Weight`, Blind close toggle, Batch popup vs. FEFO, Negative stock policy, GRN Fast vs. 3-Way Match, Remappable POS Function Keys `F1-F12`, Loyalty OTP toggle, GST Regular vs. Composition, BYOK AI Provider config).
2. `packages/shared-types/src/index.ts`: Export all shared enums and config interfaces.
3. Run `pnpm install`, `pnpm --filter @ti-erp/database prisma validate`, `pnpm --filter @ti-erp/database prisma generate`, and `pnpm -r typecheck` (or `build`).

---

## PART 3: MANDATORY SENIOR DEV REPORT FORMAT (`agy-cli/WO_TO_HO_REPORT.md`)
When `WO-101` through `WO-105` are complete, compile a single report at `agy-cli/WO_TO_HO_REPORT.md` containing:
1. **Execution Summary Table** (`WO-101` to `WO-105` status, assigned dev, files created).
2. **Exact Prisma Validation & TypeScript Build Output** (must show 0 errors).
3. **Model & Field Count Audit** (confirming all models across `01_core_tenant_branch.prisma`, `02_inventory_procurement.prisma`, and `03_pos_crm_finance_hr.prisma` are validated and generated).
4. **Git Commit Hash & Branch Status** after committing and pushing to `https://github.com/Ganesaperumal/TI-ERP.git`.