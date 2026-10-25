# HO_TO_WO_DISPATCH.md
**From:** Argon (Director & CTO — Head Office / Gemini Web)
**To:** Agy CLI Execution Squad (5x Senior Devs — Flash 3.8 High)
**Repository:** `https://github.com/Ganesaperumal/TI_ERP.git`
**Last Verified Commit:** `ff1e4fb80f2d9fdfc41a37a1c726ee9aa7cbb3eb`
**Dispatch ID:** `DISPATCH-003` (`REMOD-201` Bug Fixes + Milestone 3: Procurement, Auto-Reorder, Fast & 3-Way Match GRN, Net Landing Cost & Margin Guardrail, Consignment & BYOK AI Invoice OCR)
**Status:** `EXECUTE IMMEDIATELY`

---

## SECTION A: DOCUMENTATION & STATE TRACKER UPDATES (MANDATORY FIRST STEP)

1. **Update `agy-cli/02_STATE_TRACKER.md`:**
   - Mark **M2: Core Masters & Inventory Engine (`WO-201` to `WO-205`)** as `COMPLETED — PENDING REMOD-201 PATCH (Commit: ff1e4fb80f2d9fdfc41a37a1c726ee9aa7cbb3eb)`.
   - Mark **M3: Procurement, Supplier & AI OCR Engine (`WO-301` to `WO-305`)** as `IN_PROGRESS`.

---

## SECTION B: CTO CODE AUDIT & RE-MODIFICATION ORDERS (`REMOD-201`)

During Argon CTO's line-by-line inspection of the embedded code in `WO_TO_HO_REPORT.md` (Commit `ff1e4fb80f2d9fdfc41a37a1c726ee9aa7cbb3eb`), 3 critical runtime/business-logic bugs were caught. Fix these BEFORE merging Milestone 3:

### 1. `[REMOD-201A]` Assigned to `DEV-2` — Fix Multi-UOM Barcode Resolution in `CatalogService.lookup()`
- **File:** `apps/api/src/modules/catalog/catalog.service.ts`
- **Issue:** `lookup()` checks `ProductBarcode` and `shortPluCode`/`skuCode`, plus `scaleRule`, but does NOT check `ProductUomConversion.barcode` (e.g., when a cashier scans a Master Carton or Box barcode). Also replace `parseFloat(weightRaw) / Math.pow(...)` with `new Decimal(weightRaw).div(new Decimal(10).pow(scaleRule.weightDecimals))`.
- **Fix:** Add a lookup against `prisma.productUomConversion.findFirst({ where: { barcode: trimmedCode, product: { tenantId: branch.tenantId } }, include: { product: { include: { hsn: true, uomConversions: true, barcodes: true } } } })` returning `resolvedBy: 'UOM_CONVERSION_BARCODE'`, the matched `uomConversion` (`uomName`, `conversionFactor`, tier price), and `product`.

### 2. `[REMOD-201B]` Assigned to `DEV-3` — Fix Crash on Zero-Stock `ALLOW` & Floating-Point Math in `InventoryBatchService.resolveBatchForPosSale()`
- **File:** `apps/api/src/modules/inventory/inventory-batch.service.ts`
- **Issues Found:**
  1. When `balances.length === 0` and `negativeStockRule === ALLOW` (or `WARN_PIN` with a valid `supervisorPin`), execution continues to `const bestBatchBalance = balances[0]; const resolvedBatch = bestBatchBalance.batch;`, which crashes with `TypeError: Cannot read properties of undefined (reading 'batch')`!
  2. It queries `binStockBalance` across all bins instead of prioritizing `SHOP_FLOOR` (and excluding `DAMAGED_RETURNABLE` / `DAMAGED_SCRAP`).
  3. It uses `Number(resolvedBatch.retailSellingPrice)` float math instead of `Decimal` arithmetic.
- **Fix:**
  - Filter `binStockBalance` to `bin: { binType: { in: ['SHOP_FLOOR', 'CONSIGNMENT'] } }` (never sell from `DAMAGED_RETURNABLE` or `DAMAGED_SCRAP`!).
  - When `balances.length === 0` and negative stock is permitted (`ALLOW` or `WARN_PIN` verified), fallback to fetching the latest `InventoryBatch` for that `branchId` + `productId` (ordered by `createdAt: 'desc'`) so the POS can bill using the latest known MRP/Selling Price and record a negative balance in `SHOP_FLOOR`!
  - Use `Decimal` for all clearance discount calculations (`effectivePrice = retailSellingPrice.sub(retailSellingPrice.mul(clearanceDiscountPct).div(100)).toDecimalPlaces(2)`).

### 3. `[REMOD-201C]` Assigned to `DEV-4` — Fix 2-Up Sticker Layout & Regional Name in `ZplLabelGenerator`
- **File:** `apps/hardware-bridge/src/zpl-label.ts`
- **Issue:** `generateRepackStickerZpl()` sets `^PW800` (100mm wide 2-up roll) but only prints 1 sticker on the left (`X=20`), wasting the right-hand sticker (`X=420`), and omits `nameRegional`.
- **Fix:** Support true 2-up pair printing (`leftSticker` at `X=20` and optional `rightSticker` at `X=420` on a 50x25mm 2-up roll) and print `nameRegional` alongside `nameEn`.

---

## SECTION C: NEW MODULAR WORK ORDERS — MILESTONE 3 (`WO-301` TO `WO-305`)

Milestone 3 builds the entire **Procurement, Supplier Ledger, Auto-Reorder, Fast vs. 3-Way Match GRN, Multi-Layer Scheme Net Landing Cost Calculator, Red Margin Guardrail, Consignment Payouts, and BYOK AI Invoice OCR Engine**.

### [WO-301] Assigned to `DEV-1` (Supplier Master, Auto-Reorder Engine & 1-Click WhatsApp/PDF Purchase Order Generator)
**Target Directory:** `apps/api/src/modules/procurement/suppliers/` & `apps/api/src/modules/procurement/reorder/`
**Tasks:**
1. **`SupplierService` & Controller (`/api/v1/procurement/suppliers`):**
   - Full CRUD for `Supplier` (GSTIN validation, credit days e.g. 14/30 days, early-payment cash discount % & days, consignment vendor flag, WhatsApp phone number, bank/NEFT details, opening balance).
   - Supplier Ledger & Payable Aging endpoint (`GET /api/v1/procurement/suppliers/:id/ledger`): Returns bill-by-bill outstanding payables, flagging bills due within 2 days and bills eligible for early-payment Cash Discount!
2. **Smart Auto-Reorder & Velocity Engine (`GET /api/v1/procurement/reorder/suggestions?branchId=...`):**
   - Evaluates all products in the branch using TWO algorithms (selectable by query/config):
     - **Rule 1 (Min/Max Stock):** Current total stock (`SHOP_FLOOR` + `GODOWN`) $\le$ `minStock` $\rightarrow$ Suggest order qty = `maxStock - currentStock`.
     - **Rule 2 (Sales Velocity):** Calculates average daily POS sales over the last $N$ days (`reorderVelocityDays`, e.g., 14 days). If `daysOfStockRemaining <= leadTimeDays`, suggests quantity needed for the next cycle.
   - **Best Supplier Recommender:** For each suggested item, inspects historical `GrnLineItem` records to attach the top 2 suppliers who provided the **lowest `netLandingCost`** and best free-scheme history!
3. **Purchase Order (PO) Lifecycle & WhatsApp Payload (`PurchaseOrderService`):**
   - Create PO (`DRAFT` -> `APPROVED` -> `SENT_TO_VENDOR` -> `PARTIALLY_RECEIVED` -> `COMPLETED`) and generate a structured WhatsApp/PDF dispatch payload (`POST /api/v1/procurement/purchase-orders/:id/dispatch-whatsapp`).

---

### [WO-302] Assigned to `DEV-2` (Multi-Layer Scheme Net Landing Cost Engine, Fast Direct GRN vs. Enterprise 3-Way Match GRN & Margin Guardrail)
**Target Directory:** `apps/api/src/modules/procurement/grn/`
**Tasks:**
1. **True Net Landing Cost & Margin Guardrail Calculator (`calculateGrnLineCosting`):**
   - Must use strict `Decimal(15,4)` arithmetic to handle Indian FMCG distributor bills with all 5 layers of schemes and charges:
     - Given: `billedQty`, `freeSchemeQty`, `grossPurchaseRate`, `tradeDiscountPct`, `tradeDiscountAmount`, `cashDiscountPct`, `gstRatePct`, `cessRatePct`, `apportionedFreightAndUnloading`.
     - Step 1: $\text{Gross Line Value} = \text{billedQty} \times \text{grossPurchaseRate}$
     - Step 2: Subtract Trade Discount (% and flat) and Cash Discount (%) to get $\text{Taxable Line Value}$.
     - Step 3: Compute GST (`CGST + SGST` if supplier GSTIN state matches branch state, else `IGST`) + `Cess`.
     - Step 4: Total Received Units = $\text{totalUnits} = (\text{billedQty} + \text{freeSchemeQty}) \times \text{uomConversionFactor}$.
     - Step 5: Compute `netLandingCostPerBaseUnit`:
       - If tenant GST Regime is `REGULAR` (ITC eligible):
         $$\text{Net Landing Cost (Excl. ITC GST)} = \frac{\text{Taxable Line Value} + \text{Apportioned Freight}}{\text{totalUnits}}$$
       - If tenant GST Regime is `COMPOSITION` (or non-creditable): include GST in the numerator!
   - **Smart Margin Guardrail Check:**
     - Compare `newNetLandingCost` against `previousBatch.netLandingCost` and current `retailSellingPrice`:
       $$\text{Actual Margin \%} = \frac{\text{retailSellingPrice} - \text{newNetLandingCost}}{\text{retailSellingPrice}} \times 100$$
     - If `Actual Margin % < targetMarginPct` (or `newNetLandingCost > previousNetLandingCost`), set `marginGuardrailTriggered: true`, `alertColor: 'RED'`, and compute `suggestedRetailSellingPrice`!
2. **Dual-Mode GRN Engine (`GrnService`):**
   - **Mode A: Fast Direct Purchase Bill (`POST /api/v1/procurement/grn/fast-direct`):** Single-step atomic `$transaction` that creates the GRN, creates/updates `InventoryBatch` (updating `retailSellingPrice` if overridden by owner during GRN), increments `BinStockBalance` (in `GODOWN` or `SHOP_FLOOR`), writes `StockLedger`, and returns barcode sticker print counts.
   - **Mode B: Enterprise 3-Way Match (`POST /api/v1/procurement/grn/gate-entry` -> `blind-count` -> `three-way-match`):**
     - Storekeeper enters `BlindGRN` quantities without seeing PO prices.
     - Accounts enters Supplier Invoice -> System compares **PO Rate/Qty vs. Blind GRN Qty vs. Supplier Invoice Rate/Qty**, automatically flagging `RATE_VARIANCE` or `SHORT_SUPPLY` discrepancies requiring Manager approval!

---

### [WO-303] Assigned to `DEV-3` (Purchase Returns / GST Debit Notes, Damaged Bin Replacement & Consignment Pay-On-Sale Engine)
**Target Directory:** `apps/api/src/modules/procurement/returns-consignment/`
**Tasks:**
1. **Purchase Return & GST Debit Note Engine (`PurchaseReturnService`):**
   - `GET /api/v1/procurement/returns/returnable-damages?branchId=...&supplierId=...`: Automatically queries `BinStockBalance` in `DAMAGED_RETURNABLE` and expired batches mapped to that supplier so the owner never forgets to claim money back for expired/damaged goods!
   - `POST /api/v1/procurement/returns/debit-note`: Atomically deducts stock from `DAMAGED_RETURNABLE` (or `GODOWN`), reverses proportionate GST (`CGST/SGST/IGST`), creates `PurchaseReturnDebitNote`, and supports two settlement modes:
     - `DEDUCT_FROM_NEXT_PAYMENT` (reduces supplier payable balance)
     - `FREE_REPLACEMENT_TRACKER` (tracks pending physical replacement units owed by the distributor).
2. **Consignment / Vendor-Managed Inventory Payout Engine (`ConsignmentService`):**
   - For items/batches where `isConsignment: true`:
   - `GET /api/v1/procurement/consignment/settlement-preview?supplierId=...&from=...&to=...`:
     - Queries actual POS sales (`PosInvoiceLine` minus `SalesReturn`) for that vendor's consignment batches during the period.
     - Computes: $\text{Vendor Payout} = \text{Total Consignment Sales Value} - \text{Store Commission \% (or agreed Net Landing Cost of sold units only)}$.
   - `POST /api/v1/procurement/consignment/settle`: Generates `ConsignmentSettlement` voucher and marks sold units as settled with the vendor.

---

### [WO-304] Assigned to `DEV-4` (BYOK AI Purchase Bill OCR & CSV/Excel Smart Invoice Importer)
**Target Directory:** `apps/api/src/modules/ai-copilot/`
**Tasks:**
1. **Modular BYOK AI Provider Service (`AiProviderService`):**
   - Reads the tenant's configured AI provider (`GEMINI`, `OPENAI`, `ANTHROPIC`) and API key from `Tenant` / `StoreConfig` (or environment fallback for testing).
   - Implements a unified structured-JSON vision/text extraction adapter (`extractStructuredJson<T>(prompt, imageOrPdfBase64, schema)`).
2. **AI Distributor GST Invoice OCR (`POST /api/v1/ai-copilot/ocr-purchase-invoice`):**
   - Accepts a photo/PDF base64 or structured text/CSV of a distributor's GST bill.
   - Extracts: `supplierName`, `supplierGstin`, `invoiceNumber`, `invoiceDate`, and line items (`rawItemName`, `hsnCode`, `batchNumber`, `expiryDate`, `mrp`, `billedQty`, `freeQty`, `grossRate`, `tradeDiscountPct`, `gstRatePct`).
   - **Smart SKU Fuzzy Matcher:** Automatically matches each extracted line item against the store's `Product` catalog (by Barcode, HSN + Name similarity, or previous supplier `GrnLineItem` mapping) and runs `calculateGrnLineCosting()` so the frontend receives a ready-to-save GRN preview with Margin Guardrail alerts pre-computed!

---

### [WO-305] Assigned to `DEV-5` (React Frontend in `apps/pos-web`: Smart GRN Entry with Red Margin Guardrail, AI Invoice Upload, Auto-Reorder & Supplier Portal)
**Target Directory:** `apps/pos-web/src/features/procurement/` & `apps/pos-web/src/App.tsx`
**Tasks:**
Build high-speed keyboard-driven procurement screens in `apps/pos-web` and wire them into the main navigation in `App.tsx`:
1. **High-Speed GRN & Purchase Bill Screen (`GrnEntryPage.tsx`):**
   - Toggle between **Fast Direct Bill Mode** and **3-Way Match PO Mode**.
   - **"AI Scan Bill / Upload CSV" Button:** Opens modal to upload a distributor invoice -> auto-populates the GRN grid.
   - **Live Costing & Red Margin Guardrail Grid:** Columns for `Item`, `UOM`, `Batch`, `Expiry`, `Billed Qty`, `Free Qty`, `Gross Rate`, `Trade Disc %`, `Cash Disc %`, `GST %`, `True Net Landing Cost (Auto)`, `Old Cost`, `MRP`, `Margin %`, and `Store Selling Price (Editable inline)`.
   - Rows where `New Landing Cost > Old Cost` or `Margin % < Target Margin` automatically glow **RED** with a 1-click **"Apply Suggested Price"** button!
2. **Smart Auto-Reorder & WhatsApp PO Screen (`AutoReorderAndPoPage.tsx`):**
   - Shows low-stock and high-velocity items running out within 3 days, side-by-side supplier comparison (`Lowest Cost Supplier` vs. `Last Supplier`), and a 1-click **"Generate & Send PO on WhatsApp"** action.
3. **Supplier Ledger, Debit Notes & Consignment Payout Screen (`SuppliersAndReturnsPage.tsx`):**
   - Tabs for: (A) Supplier Payable Aging & Early-Pay Cash Discount alerts, (B) Damaged/Expired Stock -> 1-Click GST Debit Note creator, and (C) Consignment Vendor Sold-Stock Payout calculator.

---

## SECTION D: MANDATORY SELF-CONTAINED RETURN REPORT (`agy-cli/WO_TO_HO_REPORT.md`)

When `REMOD-201` (`A`, `B`, `C`) and `WO-301` through `WO-305` are complete, write the plain-text report to `agy-cli/WO_TO_HO_REPORT.md` containing:
1. **Executive Summary & Git Commit SHA** (confirming push to `main`).
2. **`REMOD-201` Verification Snippets:**
   - Paste the updated code blocks for `CatalogService.lookup()` (showing `productUomConversion` barcode lookup), `InventoryBatchService.resolveBatchForPosSale()` (showing zero-stock `ALLOW` fallback without crashing + `SHOP_FLOOR` filter + `Decimal` math), and `ZplLabelGenerator.generateRepackStickerZpl()` (showing 2-up `X=20` and `X=420` side-by-side stickers).
3. **Work Order Completion Matrix (`WO-301` to `WO-305`):**
   - Exact file paths, controllers, services, and UI components created.
4. **Core Milestone 3 Algorithm Snippets Embedded in Report:**
   - Paste the exact implementation of `GrnService.calculateGrnLineCosting()` (showing multi-layer Free Qty + Trade/Cash Discount + Freight apportionment + Margin Guardrail red flag).
   - Paste the exact implementation of `GrnService.createFastDirectGrn()` and 3-Way Match variance detection.
   - Paste the core implementation of `AiProviderService` / `ocrPurchaseInvoice()`.
5. **Exact Build & Typecheck Terminal Output:**
   - `pnpm --filter @ti-erp/database prisma validate`
   - `pnpm -r typecheck` (must show 0 errors across all 6 packages)
   - `pnpm build` (must show 6/6 successful tasks)