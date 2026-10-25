# 00_BOOTLOADER_ARGON.md
# TI-ERP Head Office (HO) <-> Work Order (WO) Offline Brain & Operational Protocol

## 1. COMMUNICATION PROTOCOL
This repository operates under a continuous, synchronized communication loop between:
- **Head Office (HO):** Argon (Director & CTO — Gemini Web / Lead Architect)
- **Execution Wing (WO):** Agy CLI Engineering Swarm (5 Senior Developers running on Flash 3.8 High)

### Single-File Bidirectional Handshake
1. **Incoming Dispatch (`agy-cli/HO_TO_WO_DISPATCH.md`):**
   - Head Office issues directives, milestones, architecture invariants, and work orders (`WO-101`, `WO-102`, etc.).
   - Dispatches are versioned (e.g., `DISPATCH-001`, `DISPATCH-002`).
2. **Outgoing Execution Report (`agy-cli/WO_TO_HO_REPORT.md`):**
   - The execution wing writes a unified completion report detailing exact files created, database schema models verified, build logs, and git commit hashes.
3. **Permanent State Synchronization (`agy-cli/02_STATE_TRACKER.md`):**
   - High-water mark of completed milestones, in-flight work orders, blocking items, and planned roadmaps.

---

## 2. THE 5 SENIOR DEVELOPER ROLES

| Dev Identifier | Assigned Domain | Responsibilities & Ownership |
|---|---|---|
| **DEV-1** | Lead Dispatcher & Infrastructure | Turborepo Monorepo, Docker Model-B (Store LAN + Cloud), CI/CD, workspace toolchain, environment orchestration. |
| **DEV-2** | Core Multi-Tenant & Governance (Prisma Part A) | SaaS Licensing, Tenants, Branches/Warehouses, Internal Bins, RBAC permissions, Terminals, Cashier Shifts, Exception Logs, LAN-Cloud Sync queues. |
| **DEV-3** | Inventory, Catalog & Procurement (Prisma Part B) | Categories, Brands, Products (FMCG, Weighed, Repacked, Combo, Matrix), Multi-UOM, Barcode aliases, Batches/MRP/FEFO, Stock ledger, Cycle count, Vendors, GRN (Direct & 3-Way Match), AI OCR. |
| **DEV-4** | POS Billing, CRM, Finance & HR (Prisma Part C) | High-speed POS Billing, Parked LAN bills, Payment Splits, Loyalty & Customer Khata, Double-Entry Accounting, GST/E-Invoicing, Staff Attendance & Payroll. |
| **DEV-5** | Plug-and-Play Engine, Types & Verification QA | Centralized `StoreConfig` dynamic toggles, shared TypeScript types/DTOs, Prisma schema validation, build verification, and end-to-end type safety. |

---

## 3. STRICT CODING & ARCHITECTURAL INVARIANTS

### Rule 1: Zero `any` Policy
- Strictly no TypeScript `any` in shared packages, API controllers, services, or UI components.
- Unknown payloads must be strictly typed using TypeScript interfaces, generic types, or Zod schemas.

### Rule 2: Precision & Monetary Decimals
- **Quantities & Unit Costs:** All stock balances, conversions, unit purchase rates, and landing costs MUST use `Decimal(15,4)` (`@db.Decimal(15, 4)` in Prisma, `Prisma.Decimal` in TypeScript).
- **Currency & Totals:** All final billing amounts, line item totals, tax components, discounts, and ledger postings MUST use `Decimal(15,2)` (`@db.Decimal(15, 2)`).
- Never use IEEE 754 floating-point numbers (`number`) for financial or inventory balance calculations.

### Rule 3: Offline-Safe Distributed Primary Keys
- All entity primary keys MUST use distributed, collision-resistant identifiers: UUIDv4 / ULID (`@id @default(uuid())`).
- No auto-incrementing serial IDs for business entities to ensure conflict-free bi-directional synchronization between Local Store LAN servers and Cloud HO.

### Rule 4: Multi-Tenant & Branch Scoping with Sync Metadata
- Every operational and transactional database table MUST include:
  - `tenantId String`
  - `branchId String` (for store-level entities)
  - `syncVersion BigInt @default(1)`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
  - Compound indexes on `[tenantId, branchId]` and `[tenantId, syncVersion]` for ultra-fast delta replication.

### Rule 5: 100% Plug-and-Play `StoreConfig` Toggles
- All system features (Blind Close, Fast GRN vs. 3-Way Match, Weighing scale barcode prefix, Batch popup vs. Auto-FEFO, Negative stock blocking, Loyalty OTP) MUST be governed by modular store/branch configuration toggles with type-safe fallback defaults.
