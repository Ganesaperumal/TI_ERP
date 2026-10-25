# HO_TO_WO_DISPATCH.md
**From:** Argon (Director & CTO — Head Office / Gemini Web)
**To:** Agy CLI Execution Wing (5x Senior Devs — Flash 3.8 High)
**Repository:** `https://github.com/Ganesaperumal/TI-ERP.git`
**Last Verified Commit:** `11613591e87e1199a51c730eb92cdb75b9316955`
**Dispatch ID:** `DISPATCH-002` (M1 Schema Hardening + Milestone 2: Core Masters, 5 Product Types, Multi-UOM, Batch/MRP Engine, Repacking & Cycle Count Audit)
**Status:** `EXECUTE IMMEDIATELY`

---

## SECTION A: DOCUMENTATION & REPO HYGIENE UPDATES (MANDATORY FIRST STEP)

1. **Remove Root-Level Duplicate Docs:**
   In commit `11613591e87e1199a51c730eb92cdb75b9316955`, control files (`00_BOOTLOADER_ARGON.md`, `01_MASTER_BLUEPRINT.md`, `02_STATE_TRACKER.md`, `03_DEV_PROTOCOL.md`, `HO_TO_WO_DISPATCH.md`, `WO_TO_HO_REPORT.md`) were placed in BOTH the repository root and `agy-cli/`.
   - **Action:** Move/consolidate `03_DEV_PROTOCOL.md` into `agy-cli/03_DEV_PROTOCOL.md` and delete the duplicate control `.md` files from the root directory (keep ONLY `README.md` in root; keep all HO/WO docs strictly inside `agy-cli/`).
2. **Update `agy-cli/02_STATE_TRACKER.md`:**
   - Mark **M1: Foundation & Database Architecture** as `COMPLETED (Commit: 11613591e87e1199a51c730eb92cdb75b9316955)`.
   - Mark **M2: Core Masters & Inventory Engine (`WO-201` to `WO-205`)** as `IN_PROGRESS`.

---

## SECTION B: AUDIT & RE-MODIFICATION OF MILESTONE 1 BUILD (`REMOD-101`)

Before writing Milestone 2 services, `DEV-1` must inspect `packages/database/prisma/schema/` (`00_datasource.prisma` through `03_pos_crm_finance_hr.prisma`) and verify/fix the following strict architectural invariants:

1. **Precision Decimal Audit:** Every single currency, tax rate, conversion factor, weight, and stock quantity column across `01`, `02`, and `03` MUST have explicit `@db.Decimal(15, 4)` (for quantities, weights, conversion factors, net landing costs) or `@db.Decimal(15, 2)` (for final invoice totals, MRPs, ledger balances). Zero `Float` types are permitted anywhere in Prisma.
2. **Offline-First Sync Columns Audit:** Verify every operational model includes `tenantId`, `branchId` (nullable only on global tenant masters), `syncVersion BigInt @default(1)`, and `lastSyncedAt DateTime?`.
3. **Database Service Export (`packages/database/src/index.ts`):**
   Currently `packages/database/src/index.ts` only has `export * from '@prisma/client';`.
   - **Action:** Upgrade `packages/database/src/index.ts` to also export a reusable `PrismaService` singleton / helper and `Decimal` utility (`Prisma.Decimal`) so `apps/api` can inject `@ti-erp/database` cleanly without duplicate PrismaClient instantiations.

---

## SECTION C: NEW MODULAR WORK ORDERS — MILESTONE 2 (`WO-201` TO `WO-205`)

Execute these 5 Work Orders in parallel across `DEV-1` through `DEV-5`. Every backend endpoint must use strict DTO validation (`class-validator` / `zod`), enforce `tenantId` + `branchId` isolation, and use `Prisma.Decimal` arithmetic.

### [WO-201] Assigned to `DEV-1` (Database Module, Tenant/Branch Onboarding, Storage Bins & Plug-and-Play `StoreConfig` API)
**Target Directory:** `apps/api/src/modules/core/` & `packages/database/`
**Tasks:**
1. Create `apps/api/src/prisma/prisma.module.ts` and `prisma.service.ts` (global NestJS module connecting to `@ti-erp/database` with automatic `syncVersion` increment middleware on create/update).
2. Create `apps/api/src/modules/core/tenant-branch.controller.ts` & `tenant-branch.service.ts`:
   - CRUD for `Tenant`, `Branch` (`HEAD_OFFICE`, `WAREHOUSE`, `RETAIL_STORE`), `StorageBin` (`GODOWN`, `SHOP_FLOOR`, `DAMAGED_RETURNABLE`, `DAMAGED_SCRAP`, `CONSIGNMENT`), and `PosTerminal`.
   - `GET / PUT /api/v1/core/store-config/:branchId`: Returns and updates the merged Plug-and-Play `StoreConfig` (merging Tenant-level defaults with Branch-level overrides for Topology mode, Hardware config, Scale prefix `20+SKU+Weight`, Blind close, Batch popup vs. FEFO, Negative stock policy, Remappable POS Function Keys `F1-F12`, GST Regular vs. Composition, BYOK AI keys).
3. Expand `packages/database/prisma/seed.ts` to seed a realistic demo supermarket:
   - 1 Tenant (`SINGLE_STORE` toggleable to `MULTI_BRANCH`), 2 Branches (`Main Supermarket` + `Central Warehouse`), 4 Default Bins per branch (`GODOWN`, `SHOP_FLOOR`, `DAMAGED_RETURNABLE`, `DAMAGED_SCRAP`), 3 POS Counters, standard GST HSN slabs (0%, 5%, 12%, 18%, 28% + Cess), and sample items across all 5 Product Types.

---

### [WO-202] Assigned to `DEV-2` (Product Master Engine: All 5 Product Types, Multi-Barcode Aliases, Multi-UOM & Regional Transliteration Helper)
**Target Directory:** `apps/api/src/modules/catalog/`
**Tasks:**
1. Build `CatalogModule` (`catalog.controller.ts`, `catalog.service.ts`, DTOs) supporting:
   - `Category`, `Brand`, and `HsnTaxMaster` CRUD.
   - `Product` CRUD supporting all 5 locked-in types:
     1. `STANDARD_FMCG`
     2. `WEIGHED_LOOSE`
     3. `REPACKED_BULK`
     4. `COMBO_KIT` (`PRE_PACKED` and `DYNAMIC_POS` Bill-of-Materials via `ComboBomItem`)
     5. `VARIANT_MATRIX` (Size × Color × Style automatic child SKU generator via `ProductVariant`)
   - **Multi-Barcode Alias Engine:** Map multiple factory/internal barcodes (`ProductBarcode`) to a single SKU, or map Carton/Box barcodes via `ProductUomConversion` (`Piece` -> `Pack` -> `Box` -> `Carton`).
   - **Ultra-Fast POS Barcode & PLU Resolver (`GET /api/v1/catalog/lookup?code=...&branchId=...`):**
     - Must resolve within <5ms:
       - Case A: Standard EAN/Internal barcode or Multi-UOM carton barcode.
       - Case B: 3-digit `shortPluCode` or phonetic search (`nameEn` / `nameRegional`).
       - Case C: **Weighing Scale EAN-13 Prefix Parser** (reads `StoreConfig.scaleBarcodePrefix`, e.g., `20` + `5-digit SKU/PLU` + `5-digit weight in grams` + check digit, returning the resolved Product + exact fractional weight in kg e.g., `0.750`!).
   - **Pre-Loaded FMCG Seed Importer & Legacy CSV/Excel Mapper (`POST /api/v1/catalog/import`):** Endpoint to bulk-import items from CSV/JSON or seed library with Bilingual (`nameEn` + `nameRegional` e.g. Tamil/Hindi) support.

---

### [WO-203] Assigned to `DEV-3` (Batch/MRP/Expiry Engine, FEFO vs. Popup Resolver, Bulk-to-Retail Repacking & Shelf Gondola Tags)
**Target Directory:** `apps/api/src/modules/inventory/`
**Tasks:**
1. Build `InventoryBatchService` & Controller:
   - Manage `InventoryBatch` (`batchNumber`, `expiryDate`, `mrp`, `purchaseRate`, `netLandingCost`, `retailSellingPrice`, `wholesalePriceTier1`, `wholesalePriceTier2`, `clearanceDiscountPct`) and `BinStockBalance` (`GODOWN` vs. `SHOP_FLOOR` vs. `DAMAGED_RETURNABLE`).
   - **POS Batch Resolution Logic (`resolveBatchForPosSale`):**
     - Checks item's `batchTrackingMode` (falling back to `StoreConfig` default).
     - If all active in-stock batches in `SHOP_FLOOR` share the same MRP & Selling Price (or mode is `AUTO_FEFO`), automatically returns the oldest expiring batch (**FEFO - First Expiry, First Out**).
     - If multiple batches in stock have *different* MRPs/Selling Prices and mode is `POPUP_ON_MRP_DIFF`, returns `requiresBatchPopup: true` with the sorted list of active batches (`MRP`, `SellingPrice`, `ExpiryDate`, `AvailableQty`) for the cashier's `1/2` key selection.
   - **Negative Stock Guardrail Check:** Enforces `ALLOW` (allows balance below 0 and flags for auto-reconciliation on next GRN), `WARN_PIN` (requires supervisor PIN token), or `BLOCK`.
   - **Near-Expiry Alert & 1-Click Clearance Offer (`GET /api/v1/inventory/near-expiry?days=30|60|90` & `POST /api/v1/inventory/clearance-offer`):** Lists batches expiring within 30/60/90 days and lets the owner apply a batch-specific clearance discount %.
2. **Bulk-to-Retail Repacking Engine (`POST /api/v1/inventory/repacking`):**
   - Executes inside a strict Prisma `$transaction`:
     - Deducts `bulkQtyConsumed` (e.g., `50.0000 kg`) from the Bulk Parent SKU's batch in `GODOWN`.
     - Records `wastageQty` (e.g., `0.5000 kg`) to the Wastage Stock Ledger.
     - Computes the exact new unit landing cost:
       $$\text{New Unit Landing Cost} = \frac{(\text{Bulk Qty Consumed} \times \text{Bulk Unit Cost}) + \text{Packaging Material Cost}}{\text{Retail Packs Produced}}$$
     - Creates/updates the Retail Child SKU's `InventoryBatch` with packed date, expiry date, new barcode, and adds `retailPacksProduced` (e.g., `49` packs of `1kg`) to `SHOP_FLOOR` (or `GODOWN`), returning a ZPL/TSPL print job payload for 49 barcode stickers!

---

### [WO-204] Assigned to `DEV-4` (Inter-Branch Transfers with GIT, Internal Godown-to-Shelf Moves, Damages & Live Rack Cycle Counting)
**Target Directory:** `apps/api/src/modules/stock-ops/` & `apps/hardware-bridge/src/`
**Tasks:**
1. **Internal Bin Transfer (`POST /api/v1/stock-ops/bin-transfer`):**
   - Move stock between `GODOWN` -> `SHOP_FLOOR` or `SHOP_FLOOR` -> `DAMAGED_RETURNABLE` / `DAMAGED_SCRAP` with full immutable `StockLedger` entries.
2. **Inter-Branch Stock Transfer (`StockTransferService`):**
   - Full state machine: `INDENT_REQUESTED` -> `DISPATCHED_GIT` (deducts from Source Branch and holds in Goods-in-Transit virtual ledger, generates Delivery Challan / E-Way Bill payload) -> `RECEIVED_AT_BRANCH` (adds received qty to Destination Branch, logs any shortage/damage discrepancy for HO approval).
3. **Live Cycle Counting (Audit Without Closing the Shop - `CycleCountService`):**
   - `POST /api/v1/stock-ops/cycle-count/start`: Takes an instant **Stock Freeze Snapshot** (`systemFrozenQty`) for a chosen Rack/Bin or Category while POS counters keep billing.
   - `POST /api/v1/stock-ops/cycle-count/:id/submit-counts`: Accepts scanned physical counts (`physicalCountedQty`), calculates `varianceQty`, and upon Manager Approval (`POST /api/v1/stock-ops/cycle-count/:id/approve`), posts adjustment entries to `BinStockBalance` and `StockLedger`.
4. **ZPL/TSPL Barcode Sticker & Shelf-Edge Gondola Tag Generator (`apps/hardware-bridge/src/zpl-label.ts`):**
   - Add ZPL/TSPL command generation to `apps/hardware-bridge` supporting:
     - **50x25mm (2-up) & 38x25mm Repacking Barcode Stickers** (Store Name, Bilingual Item Name, Weight, Packed Date, Expiry Date, MRP, Selling Price, EAN-13/Code128 barcode).
     - **Shelf-Edge Gondola Price Cards** (`MRP ₹X | Our Price ₹Y | You Save ₹Z!`).

---

### [WO-205] Assigned to `DEV-5` (React Frontend in `apps/pos-web`: Back-Office Inventory, Product Master, Repacking Studio & Barcode Designer UI)
**Target Directory:** `apps/pos-web/src/features/inventory/` & `apps/pos-web/src/features/settings/`
**Tasks:**
Build clean, keyboard-friendly, high-density supermarket management screens inside `apps/pos-web`:
1. **Plug-and-Play Store Settings Page (`StoreConfigPage.tsx`):**
   - Visual toggle switches for Single-Store vs. Multi-Branch, Regular vs. Composition GST, Batch Popup vs. Auto-FEFO, Negative Stock policy, Blind Cash Close, Weighing Scale Prefix rule, and a visual **Keyboard Shortcut Remapper (`F1`–`F12`)**.
2. **Unified Product Master & Multi-UOM / Batch Drawer (`ProductMasterPage.tsx`):**
   - High-speed searchable table supporting all 5 Product Types, Bilingual name input (`English` + `Regional`), Multi-UOM conversion rows, Multi-Barcode alias list, and live Bin-wise (`Godown` vs. `Shop Floor` vs. `Damaged`) Batch/MRP stock breakdown.
3. **Bulk-to-Retail Repacking & Sticker Print Screen (`RepackingStudioPage.tsx`):**
   - Select Bulk Sack Item/Batch -> Enter Bulk Qty Used, Retail Child Pack SKU, Packs Produced, Wastage, Packaging Cost -> Live preview of calculated Net Landing Cost & Margin % -> Click **"Convert & Print 49 Barcode Labels"**.
4. **Live Cycle Count & Near-Expiry Clearance Screen (`StockAuditAndExpiryPage.tsx`):**
   - Tabs for (A) 30/60/90-day Near-Expiry items with 1-click Clearance Discount, (B) Godown-to-Shelf Refill alerts, and (C) Live Rack Cycle Count entry.

---

## SECTION D: MANDATORY RETURN REPORT FORMAT (`agy-cli/WO_TO_HO_REPORT.md`)

**CRITICAL RULE FOR BOSS'S UPLOAD TO GEMINI WEB:**
Because Gemini Web reads plain-text `.md` files directly (whereas `.zip` archives compress text into binary streams), `agy-cli/WO_TO_HO_REPORT.md` MUST be a **self-contained, detailed plain-text Markdown audit report** so the Boss only needs to upload `agy-cli/WO_TO_HO_REPORT.md` to Head Office!

When `REMOD-101` and `WO-201` through `WO-205` are complete, write `agy-cli/WO_TO_HO_REPORT.md` containing:
1. **Executive Summary & Git Commit Hash** (Branch, Commit SHA, Timestamp).
2. **Milestone 1 Re-Modification Verification (`REMOD-101`):**
   - Confirm root duplicate `.md` files were removed.
   - Paste the exact model names and `@db.Decimal` verification summary from `01_core_tenant_branch.prisma`, `02_inventory_procurement.prisma`, and `03_pos_crm_finance_hr.prisma`.
3. **Work Order Completion Matrix (`WO-201` to `WO-205`):**
   - List every created/modified file path with a summary of its implemented methods and routes.
4. **Key Code & Algorithm Snippets Embedded in Report:**
   - Paste the core implementation blocks of:
     - `CatalogService.lookup()` (showing Weighing Scale EAN-13 `20+SKU+Weight` parsing)
     - `InventoryBatchService.resolveBatchForPosSale()` (showing FEFO vs. MRP-Popup logic)
     - `InventoryBatchService.executeRepackingJob()` (showing the Prisma `$transaction` and landing cost math)
     - `zpl-label.ts` (showing 2-up sticker and Gondola tag generation)
5. **Exact Build & Validation Command Logs:**
   - Full terminal output of:
     - `pnpm --filter @ti-erp/database prisma validate`
     - `pnpm --filter @ti-erp/database prisma generate`
     - `pnpm -r build` (or `pnpm -r typecheck`) — MUST show **0 errors** across `packages/shared-types`, `packages/database`, `apps/api`, `apps/hardware-bridge`, `apps/pos-web`, and `apps/cloud-admin`.