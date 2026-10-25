# AGY CLI SENIOR DEV CODING STANDARDS
1. **Strict TypeScript:** `strict: true` everywhere. Zero `any` types allowed.
2. **Decimal Precision:** NEVER use JavaScript `number` (`float`) for money, tax, or inventory quantities. Always use `Decimal` (`Prisma.Decimal` / `decimal.js`) with `DECIMAL(15,4)` in PostgreSQL for quantities/costs and `DECIMAL(15,2)` for final currency.
3. **Offline-First Sync Columns:** Every operational table MUST include:
   - `id` (UUID v7 / ULID - time-sortable for offline generation without collisions)
   - `tenantId` (UUID)
   - `branchId` (UUID, nullable for global masters)
   - `syncVersion` (BigInt, auto-incremented on change)
   - `lastSyncedAt` (DateTime, nullable)
4. **Plug-and-Play Config Rule:** Never hardcode store policies (e.g., negative stock, batch popup, blind close). Always read from `TenantSettings` / `BranchSettings`.
5. **Deliverable Format for Argon Review:** When completing a Work Order, output:
   - Exact files created/modified
   - Verification command outputs (`pnpm build`, `pnpm prisma validate`, `pnpm test`)
   - Summary of edge cases handled