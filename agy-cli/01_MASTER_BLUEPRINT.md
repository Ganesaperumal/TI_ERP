# 01_MASTER_BLUEPRINT.md
# TI-ERP Master Enterprise Specification (Sections 1 through 8.5)

## SECTION 1: ARCHITECTURAL TOPOLOGY & HARDWARE ECOSYSTEM
### 1.1 Model B Architecture (Local LAN Store Server + Cloud Sync)
- **Local LAN Topology:** A dedicated mini-PC / POS server running on-premise PostgreSQL 16 + Redis + Node.js/NestJS API. Multiple LAN billing terminals connect seamlessly via local Wi-Fi / Ethernet without internet dependency.
- **Bi-directional Cloud Replication:** High-frequency, transactional sync outbox/inbox mechanism replicating master data (products, prices, promotions) down to stores, and sales invoices, stock movements, and shift audits up to Cloud Head Office.
- **BYOK AI Key Engine:** Bring-Your-Own-Key integration (OpenAI, Google Gemini, Anthropic Claude, and Local Ollama) for document parsing, intelligent invoice OCR, conversational POS search, and automated executive insights.

### 1.2 Peripheral Hardware Ecosystem
1. **Silent ESC/POS Thermal Printing & Cash Drawer Kick:**
   - Raw binary ESC/POS formatting over USB, Network/Ethernet (TCP port 9100), and Bluetooth.
   - Standard drawer pulse command `[0x1B, 0x70, 0x00, 0x19, 0xFA]` kicked automatically on cash settlement or supervisor manual kick.
2. **Industrial Barcode Sticker & Gondola Shelf Tag Engine:**
   - Native ZPL-II / TSPL printer driver support for TSC, Zebra, and TVS desktop label printers.
   - Dynamic label designer supporting 50x25mm, 38x25mm 2-up, and gondola rack shelf-edge tags with MRP, Offer Price, Unit Cost, and EAN-13/Code128 barcodes.
3. **Electronic Weighing Scale Integration:**
   - **Live RS232 / USB Serial Streaming:** Continuous parsing of weight strings (`ST,GS,+001.250kg`) from Essae, Avery, Phoenix, and Mettler Toledo scales.
   - **Barcode Prefix Parsing:** Automated parsing of scale-generated barcodes (e.g., Prefix `20` + 5-digit PLU + 5-digit Weight in grams + Check digit).
4. **Customer-Facing Dual Display:**
   - Secondary screen mirroring real-time cart items, savings breakdown, and dynamic Bharat QR / UPI payment QR code generated on the fly with sound confirmation.
5. **EDC & Smart Payment Soundbox Hooks:**
   - Protocol bridges for Pine Labs, Paytm, PhonePe, and Razorpay POS terminals, plus webhook/WebSocket listeners for instant audio receipt confirmations.

---

## SECTION 2: MULTI-LOCATION TOPOLOGY, BINS & CASHIER CONTROLS
### 2.1 Topology & Internal Bin Management
- **Topology Toggle:** Instant switch between `SINGLE_STORE` mode (simplified UI, direct stock ledger) and `MULTI_BRANCH` mode (Central Warehouse, Regional Hubs, Retail Outlets).
- **Physical Internal Bins:**
  - `GODOWN` (Bulk receiving & backroom reserve)
  - `SHOP_FLOOR` (Front-facing retail shelves and gondolas)
  - `DAMAGED_RETURNABLE` (Damaged goods pending supplier debit note)
  - `DAMAGED_SCRAP` (Written-off wastage and unsalvageable stock)
  - `CONSIGNMENT` (Third-party vendor stock held on pay-on-sale terms)
- **Goods-in-Transit (GIT) Stock Transfers:** Inter-branch transfer indents with dispatch validation, E-Way Bill and Delivery Challan tracking, receiving discrepancy handling, and in-transit loss ledger.

### 2.2 Cash Drawer, Terminal Security & Shift Closes
- **Terminal Hardware Lock:** Terminals locked to MAC address and unique Terminal ID.
- **Shift Lifecycle:**
  - `Opening Float`: Cashier mandatory opening cash declaration.
  - `Mid-Day Safe Drops`: Timed or threshold-based skimming of high denomination currency into the master store safe.
  - `Blind Cash Close`: Cashiers count physical denominations without seeing system expected cash, preventing opportunistic skimming.
  - `X-Report & Z-Report`: Instant mid-shift audit (X-Report) and permanent end-of-day register closure (Z-Report).
  - `Shortage/Excess Ledger`: Auto-posts shift variances directly to cashier liability or store expense ledger.

---

## SECTION 3: PRODUCT CATALOG, MULTI-UOM & INVENTORY CONTROL
### 3.1 5 Core Product Classifications
1. **Standard FMCG:** Branded packaged goods with multiple barcode aliases (different vendor EANs mapping to a single SKU).
2. **Weighed Loose Goods:** Fresh produce, grains, pulses sold by net weight with tare weight deduction.
3. **Bulk-to-Retail Repacking:** 50kg wholesale sacks repacked into 500g/1kg retail pouches with packaging cost and wastage allocation.
4. **Combos & Bill of Materials (BOM):**
   - `Pre-Packed Combos`: Assembled ahead of time with dedicated batch tracking.
   - `Dynamic POS Combos`: Bundles evaluated in real time at checkout based on cart contents.
5. **Apparel & Footwear Matrix:** Variant grids based on Size, Color, Fit, and Style with centralized parent SKU analytics.

### 3.2 Multi-UOM & Batch Management
- **Multi-UOM Hierarchies:** Flexible nested conversions (e.g., 1 Box = 24 Packs; 1 Pack = 10 Pieces) with tiered pricing per UOM.
- **Batch & Expiry Modes:**
  - `AUTO_FEFO`: First-Expired First-Out automated batch selection.
  - `POPUP_ON_MRP_DIFF`: Automatic popup when multiple MRPs or batches exist on shelf.
  - `Near-Expiry Clearance`: Configurable discount thresholds for batches approaching expiration.
- **Stock Policies:**
  - `Negative Stock Rules`: Configurable per store/item as `ALLOW`, `WARN_PIN` (supervisor override required), or `BLOCK`.
  - `Cycle Counting`: Live rack-wise audits with frozen system stock snapshots and variance approvals.

---

## SECTION 4: PROCUREMENT, 3-WAY MATCH & VENDOR MANAGEMENT
### 4.1 Procurement & GRN Workflows
- **Dual GRN Engine:**
  - `Fast Direct GRN`: Rapid entry for trusted daily deliveries.
  - `Enterprise 3-Way Match`: Strict gate entry -> blind warehouse receiving -> PO match -> invoice verification.
- **BYOK AI Invoice OCR:** Automatically extracts line items, HSN codes, batch numbers, expiry dates, and tax breakdowns from supplier PDF/scanned invoices.
- **Multi-Layer Scheme & True Landing Cost Calculator:**
  - Accounts for Trade Discounts, Cash Discounts, Scheme Free Goods (e.g., 10+1 free), Apportioned Inward Freight, and Non-creditable Cess.
  - Determines exact unit net landing cost before retail pricing.
- **Red Margin Guardrail:** Real-time alert preventing GRN finalization if purchase cost exceeds target retail price or margin falls below minimum threshold.
- **Consignment Stock & Debit Notes:** Pay-on-sale vendor inventory tracking, automated supplier debit notes for expired/damaged returns.

---

## SECTION 5: ULTRA-FAST POS BILLING & PROMOTIONS
### 5.1 Billing Interface & Mechanics
- **Keyboard-First Design:** Optimized for 100% mouse-free high-speed cashier operation with remappable `F1-F12` hotkeys.
- **Hold & Recall Bills:** Cross-counter LAN held bills via distributed in-memory sync (Redis/Local DB) allowing customers to step aside without blocking queues.
- **Phonetic & Short PLU Search:** 3-digit PLU codes and transliterated search for rapid loose item lookup.
- **Split Multi-Tender Payments:** Combine Cash, UPI, Card, Sodexo/Meal Vouchers, Customer Khata, Loyalty Points, and Credit Slips on a single bill.
- **Wholesale & Retail Toggling:** Instant tier price recalculation for B2B wholesale buyers with GSTIN entry.

### 5.2 Promotional Engine
- Real-time cart rule evaluation:
  - BOGO (Buy X Get Y Free)
  - Mix & Match Category Combos
  - Cart-Slab Tiered Discounts (e.g., Spend ₹2000 get ₹200 off)
  - Happy Hour timed pricing
  - Next-visit receipt coupon codes

---

## SECTION 6: CRM, LOYALTY, KHATA & CUSTOMER ENGAGEMENT
- **Tiered Loyalty:** Configurable earn rates per product category or margin slab, Silver/Gold/VIP tiers, and optional SMS/WhatsApp OTP redemption verification.
- **Customer Khata (Store Credit):** Credit limits, grace periods, automated 1st-of-month WhatsApp statements with embedded instant UPI payment links.
- **Digital Receipts:** Paperless WhatsApp and SMS bill dispatch with interactive 5-star feedback rating collection.
- **Customer Retention & RFM Analytics:** Automated alerts for missing 1st-to-10th monthly ration shoppers and predictive churn indicators.

---

## SECTION 7: GST COMPLIANCE, E-INVOICING & ACCOUNTING
- **GST Engine:** Regular vs. Composition scheme toggle, reverse charge mechanism (RCM), MRP tax back-calculation, and HSN summary tables.
- **Govt E-Invoicing & E-Way Bill:** Direct API integration hooks for IRN generation, Signed QR codes, and E-Way Bill JSON generation.
- **Automated Double-Entry Bookkeeping:**
  - Native Chart of Accounts, Day Book, Cash/Bank Book, General Ledger, Trial Balance, Profit & Loss, and Balance Sheet.
  - Automated journal voucher creation from POS Z-reports, inventory adjustments, and GRN vendor payables.
  - 1-Click Tally Prime XML export for chartered accountants.

---

## SECTION 8 & 8.5: SECURITY, AUDIT, HR & ENTERPRISE FOUNDATION
- **Supervisor PIN Overrides & Exception Logs:** Strict audit log for line voids, cart cancellations, manual price drops, and duplicate receipt prints.
- **Role-Based Access Control (RBAC):** Granular permissions with cost and margin masking for cashiers.
- **HR, Biometrics & Payroll:**
  - Shift roster, biometric/selfie attendance tracking.
  - Automated payroll calculation factoring in base salary, salesman line-item commissions, leaves, advances, staff grocery khata deductions, and cashier register shortages.
- **FMCG Starter Pack:** Comprehensive seed structure for 50,000+ Indian FMCG products with standard HSN, tax rates, and pack sizes.
- **Multilingual Support:** Multi-language receipt printing (English, Tamil, Hindi, Telugu, Kannada, etc.).
- **Executive Mobile Dashboard:** Real-time store performance KPIs and automated 10:30 PM WhatsApp daily summary report for store owners.
