# TI-ERP (Retail Operating System)

> **Enterprise Supermarket & Hypermarket Retail Operating System**
> Engineered for High-Throughput Indian FMCG & Grocery Retail: Model-B Topology (Local LAN Offline-First Store Server + Real-Time Cloud Head Office Sync).

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-blue.svg)](#)
[![TypeScript: 5.6](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](#)
[![Prisma: 5.22](https://img.shields.io/badge/Prisma-5.22-green.svg)](#)
[![NestJS: 10](https://img.shields.io/badge/NestJS-10-red.svg)](#)
[![React: 18](https://img.shields.io/badge/React-18-cyan.svg)](#)
[![Next.js: 14](https://img.shields.io/badge/Next.js-14-black.svg)](#)

---

## 🏛️ System Architecture

TI-ERP implements a battle-tested **Model-B Retail Topology** designed specifically for high-density Indian supermarkets and hypermarkets where internet connectivity can be intermittent, but checkout counters cannot afford a single millisecond of downtime:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CENTRAL CLOUD HEAD OFFICE (HO)                        │
│             Next.js SaaS Portal (apps/cloud-admin) + AWS Aurora DB           │
│         Multi-Store Governance • SaasLicense Engine • AI Copilot HO         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▲  Bi-Directional Sync
                                       │  (syncVersion DESC + Idempotent UUID)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOCAL STORE LAN SERVER (ON-PREMISE)                      │
│             PostgreSQL 16 + Redis 7 + NestJS API (apps/api)                 │
│      100% Offline Autonomous Billing • Sync Outbox • Local Master Cache     │
└──────┬───────────────────────────────┬───────────────────────────────┬──────┘
       │ WebSocket / LAN               │ WebSocket / LAN               │
       ▼                               ▼                               ▼
┌──────────────┐               ┌──────────────┐               ┌──────────────┐
│  POS LANE 01 │               │  POS LANE 02 │               │  mPOS TABLET │
│ Fast Billing │               │ Fast Billing │               │ Queue Buster │
│ Hardware Brg │               │ Hardware Brg │               │ Home Delivery│
└──────────────┘               └──────────────┘               └──────────────┘
```

1. **Local LAN Offline First:** Every retail store runs on an on-premise local micro-server. Cashier lanes communicate with the local server over LAN via sub-15ms HTTP/WebSocket connections. Cash counters continue scanning and billing at full speed even during complete internet fiber cuts.
2. **Bi-Directional Cloud Outbox Engine:** Every transaction, inventory movement, shift audit, and price change is logged to an immutable transactional `SyncOutbox`. When cloud connectivity is restored, records push up to Cloud HO in batches of 250 with deterministic conflict resolution `[syncVersion DESC, updatedAt DESC]`.
3. **Peripheral Hardware Bridge (`apps/hardware-bridge`):** Standalone local daemon interfacing via raw OS ports to:
   - ESC/POS 80mm/58mm thermal receipt printers (USB / Network IP).
   - RS232 serial weighing scales (Continuous stream parsing tare, gross, and net weight).
   - 24V Cash drawer solenoid kick pulses (fired strictly on cash receipt print).
   - Customer-facing dual displays (rendering cart itemization and dynamic UPI QR).
   - ZPL barcode label printers (50mm x 25mm shelf tags and packaging stickers).
4. **Zero-Floating-Point Precision:** All monetary amounts, taxes, discounts, and landing costs strictly utilize `Decimal(15,2)` and `Decimal(15,4)` arithmetic (`@ti-erp/database` / `Prisma.Decimal`). No IEEE-754 floating-point rounding errors.

---

## 📦 Monorepo Layout

```
├── agy-cli/               # HO <-> WO Dispatch, Protocols & State Trackers
├── apps/
│   ├── api/               # NestJS Enterprise Modular Backend (All 12 Modules)
│   ├── pos-web/           # React 18 + Vite High-Speed Cashier POS (15 Core Tabs)
│   ├── cloud-admin/       # Next.js 14 App Router SaaS & Owner Mobile Portal
│   └── hardware-bridge/   # Local Peripheral Driver Daemon (ESC/POS, RS232, ZPL)
├── packages/
│   ├── database/          # Multi-File Prisma Schema & Auto-Generated Client
│   └── shared-types/      # Master Enums, StoreConfig Schema & Universal DTOs
└── docker/                # Local Store Server & Cloud Production Compose Files
```

---

## ⚡ Core Feature Modules (Milestones 1–7)

| Module | Key Capabilities |
| :--- | :--- |
| **Cashier POS Billing** | Keyboard-only fast billing (F1-F12 shortcuts), PLU speed codes, parked bills, multi-split tenders (Cash, UPI, Card, Sodexo, Khata, Loyalty), returns with credit notes. |
| **Customer Dual Display** | Second screen customer cart mirror + Dynamic UPI QR generation with auto-polling settlement. |
| **Repacking & Weighing** | Bulk gunny bag consumption to pre-pack pouches, EAN-13 variable weight barcode generation (`20-XXXXX-WWWWW-C`), RS232 scale live polling. |
| **Smart Procurement & GRN** | Fast Direct GRN, Landed Cost Apportionment (Freight/Loading per SKU), AI Purchase Invoice OCR via Gemini 1.5, GSTR-2B ITC reconciliation guardrails. |
| **Inventory & Expiry Control** | Bin-level stock balances (Godown vs Floor Shelf), automated velocity reordering, FIFO/FEFO batch allocation, $\le 45$-day near-expiry clearance designer. |
| **CRM, Loyalty & Khata** | Tiered loyalty points (Silver/Gold/Platinum), Customer Monthly Grocery Khata with credit limits, WhatsApp digital invoice dispatch, birthday promo triggers. |
| **Delivery & Queue Buster** | Home delivery phone orders, packing slip generation, delivery boy COD bag settlements, wireless mPOS queue-buster carts. |
| **Double-Entry Accounting** | 100% compliant Indian Chart of Accounts (Ledgers, Cash/Bank Books, P&L, Balance Sheet, GST compensation cess, negative MDR excess handling). |
| **Statutory GST & Tally** | GSTR-1 B2B/B2C JSON export, GSTR-2B invoice-level automated reconciliation, GSTR-3B tax offset engine, 1-click Tally Prime XML voucher sync. |
| **Indian HR & Grocery Payroll**| Biometric fingerprint / RFID attendance roster, Staff Monthly Advance & Grocery Khata salary deductions, automated PF / ESI / Professional Tax calculation. |
| **Model-B LAN Cloud Sync** | Atomic outbox queuing, batch sync to central cloud, deterministic master conflict resolution, cloud-to-branch master pull. |
| **BYOK AI Copilot** | Natural language "Ask My Supermarket" store intelligence, Dead-Stock combo cleanser, bilingual regional transliteration (Tamil, Hindi, Kannada, Telugu, Malayalam). |
| **Owner Mobile Command** | Real-time KPI gauges (Sales, Bills, Basket, GP Margin %), live counter cash meters, anti-theft void alerts, automated 10:30 PM WhatsApp closing summary. |
| **SaaS Vendor Admin Portal** | Multi-tenant supermarket licensing, module feature-flag matrix, Annual Maintenance Contract (AMC) renewal tracking, 1-click 50k+ catalog provisioner. |

---

## 🚀 Quick Start & Development

### Prerequisites
- Node.js `v20.x` or higher
- PNPM `v9.x` (`corepack enable pnpm`)
- Docker & Docker Compose
- PostgreSQL 16 & Redis 7

### 1. Installation
```bash
git clone https://github.com/Ganesaperumal/TI_ERP.git
cd TI_ERP
pnpm install
```

### 2. Database Schema Generation
```bash
pnpm --filter @ti-erp/database prisma validate
pnpm --filter @ti-erp/database prisma generate
pnpm --filter @ti-erp/database build
```

### 3. Verification & Typecheck
```bash
# Typecheck all 6 packages & apps with 0 errors
pnpm -r typecheck

# Build all packages & apps
pnpm build
```

### 4. Running the Development Stack
```bash
# Start local store infrastructure (Postgres + Redis)
docker compose -f docker/docker-compose.local-store.yml up -d

# Run API backend (Port 3000)
pnpm --filter @ti-erp/api dev

# Run POS Web & Dual Display Frontend (Port 5173)
pnpm --filter @ti-erp/pos-web dev

# Run Cloud Admin & Owner Mobile Portal (Port 3001)
pnpm --filter @ti-erp/cloud-admin dev
```

---

## 🔌 Hardware Bridge Peripheral Setup

The hardware bridge daemon runs as a native background service on each checkout terminal:

```bash
# Start Hardware Bridge Agent (Port 8088)
pnpm --filter @ti-erp/hardware-bridge start
```

### Configuration (`hardware-config.json`):
```json
{
  "printer": {
    "type": "ESC/POS",
    "interface": "USB",
    "paperWidth": 80,
    "cutFeedLines": 3,
    "cashDrawerKick": true
  },
  "scale": {
    "port": "/dev/ttyUSB0",
    "baudRate": 9600,
    "protocol": "TOLEDO_8217"
  },
  "barcodePrinter": {
    "type": "ZPL",
    "port": "/dev/usb/lp0",
    "labelWidthMm": 50,
    "labelHeightMm": 25
  }
}
```

---

## 🎯 Client Meeting PWA & Offline Pitch Guide

TI-ERP is engineered with an installable **Progressive Web App (PWA)** architecture and **Network-First with Cache-Fallback Service Workers** (`sw.js`). You can demonstrate every single capability of TI-ERP on a laptop, tablet, or smartphone during client meetings—**100% offline**, without Docker or local servers running, and without switching browser ports!

### 1. 1-Click Launch for Client Demos
```bash
# Build production bundles
pnpm build

# Launch the production PWA server on local network
pnpm pwa:preview
# Open http://localhost:5173 on your laptop, or open via local Wi-Fi IP on an iPad / Android tablet!
```

### 2. Installing TI-ERP as a Native Desktop / Tablet App
Click the **"📲 Install App"** button in the top navigation bar:
- **Desktop Chrome / Edge / Brave:** Click the **Install** icon in the URL address bar or select menu `⋮` &rarr; `Install TI-ERP POS`.
- **Apple iPad / iPhone (Safari):** Tap the **Share** button (`⎋`) &rarr; tap **"Add to Home Screen"**.
- **Android Tablet / Phone:** Tap `⋮` &rarr; tap **"Install app"** or **"Add to Home screen"**.

### 3. Running the 7-Step Executive Sales Pitch Tour
Click the golden **"🎯 Client Pitch Mode: ON"** button in the header of `apps/pos-web` to activate the guided sales tour ribbon. Use **Next ➡** or click any step to showcase the exact competitive differentiator to supermarket owners:

1. **Step 1: 3-Sec POS & Scale Barcode (`POS Billing`)**
   - *Pitch:* Sub-second keyboard billing (`F1`-`F12`), weighing scale barcode prefix `99`, LAN hold/recall, split tender, and dual customer display.
2. **Step 2: AI Bill OCR & Margin Guardrail (`Smart GRN & Costing`)**
   - *Pitch:* Zero manual data entry. AI invoice OCR auto-extracts lines, computes true Net Landing Cost (apportioning freight/loading), and alerts if selling price yields negative margin before invoice approval.
3. **Step 3: 50kg->1kg Repack & 2-Up Labels (`Repacking Studio`)**
   - *Pitch:* Zero unit cost inflation (`₹45.38/pouch`, `+21.8%` gross margin). Generates 2-up barcode stickers and automatically converts bulk stock to retail bags in the immutable stock ledger.
4. **Step 4: Khata WhatsApp & Missing Ration (`CRM & Khata`)**
   - *Pitch:* Zero bad debt. WhatsApp automated payment links, customer OTP points redemption, and discovery of monthly missing ration baskets.
5. **Step 5: GSTR-2B ITC Risk & Tally XML (`Finance, GST & Tally`)**
   - *Pitch:* Reconcile supplier GSTR-2B against GRNs to eliminate tax credit leakage, and 1-click XML export to Tally Prime double-entry accounting.
6. **Step 6: Cashier Shortage->Payroll Link (`HR & Payroll`)**
   - *Pitch:* End-of-shift register cash shortages automatically link to biometric staff salary deductions without manual HR reconciliation.
7. **Step 7: Owner Mobile App & 10:30PM WhatsApp (`Owner Mobile & Cloud PWA`)**
   - *Pitch:* Interactive smartphone bezel frame showing live sales, gross profit (`+21.8%`), cash/UPI/Khata split, 1-click **10:30 PM WhatsApp closing report push simulation**, interactive **"Ask My Supermarket" AI Copilot**, and 10-second SaaS tenant provisioning.

---

## 🔒 Security, Compliance & Anti-Theft Guardrails

- **Zero Unrecorded Drawer Kicks:** Every drawer open signal is cross-referenced with a finalized `PosPaymentSplit`. Unmatched manual key openings generate an immediate `NO_SALE_DRAWER_KICK` exception in the Owner Command Center.
- **Supervisor PIN Thresholds:** Line voids > ₹500, manual price overrides, and negative stock override sales trigger supervisor PIN authorization.
- **Cryptographic SaaSLicense Keys:** Terminal boot sequences validate against local and cloud license registry (`TIERP-XXXX-XXXX-XXXX-XXXX`) checking AMC validity and branch limits.

---

## 📄 License & Attribution

Copyright © 2026 TI-ERP Retail Operating Systems. All rights reserved.
Developed for high-throughput enterprise supermarket deployments across India.
