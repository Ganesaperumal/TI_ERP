# TI-ERP (Retail Operating System)

> **Enterprise Supermarket & Hypermarket Retail Operating System**
> Designed for High-Throughput Model-B Topology (Local LAN Offline-First Store Server + Real-Time Cloud Head Office Sync).

## Architecture Overview
- **Local LAN Offline First:** Every retail store operates autonomously on an on-premise local server running PostgreSQL 16, Redis, and NestJS API. High-speed billing terminals function 100% offline without active internet.
- **Bi-Directional Cloud Sync:** Real-time transactional mutation outbox/inbox syncing sales, stock changes, and shift audits to Cloud Head Office.
- **Hardware Integration:** Dedicated peripheral hardware bridge for ESC/POS thermal receipt printing, cash drawer kick pulses, dual-display customer screens with dynamic UPI QR, ZPL barcode printing, and RS232 weighing scale reading.
- **Strict Monetary Precision:** All quantities and unit landing costs computed at `Decimal(15,4)`; all currency transactions computed at `Decimal(15,2)`.

## Monorepo Layout
```
├── agy-cli/               # HO <-> WO Brain, Protocols & State Trackers
├── apps/
│   ├── api/               # NestJS Enterprise Backend (Local Store & Cloud HO)
│   ├── pos-web/           # React + Vite High-Speed POS & Dual Display
│   ├── cloud-admin/       # Next.js App Router Multi-Branch & SaaS Portal
│   └── hardware-bridge/   # Local Agent (ESC/POS, RS232, ZPL, Dual Display)
├── packages/
│   ├── database/          # Prisma ORM with Multi-File Enterprise Schema
│   └── shared-types/      # Plug-and-Play StoreConfig, DTOs & Master Enums
└── docker/                # Local Store & Cloud Docker Compose configs
```

## Quick Start
```bash
# Install dependencies
pnpm install

# Validate and generate Prisma client
pnpm --filter @ti-erp/database prisma validate
pnpm --filter @ti-erp/database prisma generate

# Typecheck all packages & apps
pnpm -r typecheck

# Start local store infrastructure (Postgres + Redis)
docker compose -f docker/docker-compose.local-store.yml up -d
```
