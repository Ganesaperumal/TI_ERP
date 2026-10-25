#!/usr/bin/env node
/**
 * TI-ERP 1-Click Demo & Verification Launcher
 * Milestone 8 Production V1.0 Release Gate
 */

const { execSync } = require('child_process');
const path = require('path');

function execute(cmd, stepName) {
  console.log(`\n======================================================`);
  console.log(`▶ Step: ${stepName}`);
  console.log(`  Executing: ${cmd}`);
  console.log(`======================================================`);
  try {
    const out = execSync(cmd, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      encoding: 'utf8',
    });
    return true;
  } catch (err) {
    console.error(`\n✖ FAILED: ${stepName}`);
    process.exit(1);
  }
}

console.log(`
┌──────────────────────────────────────────────────────────────┐
│  TI-ERP: Enterprise Supermarket Retail Operating System      │
│  Milestone 8 Production V1.0 Release Gate & Live Launcher    │
└──────────────────────────────────────────────────────────────┘
`);

// Step 1: Prisma Schema Validation
execute('pnpm --filter @ti-erp/database prisma validate', 'Prisma Multi-File Schema Validation');

// Step 2: Database Schema Sync
execute('pnpm --filter @ti-erp/database prisma db push', 'PostgreSQL Schema Push');

// Step 3: Master Data Idempotent Seed
execute('pnpm --filter @ti-erp/database prisma db seed', 'Enterprise Master Data Seeding (16 Domains)');

// Step 4: Recursive Monorepo Typecheck
execute('pnpm -r typecheck', 'Recursive TypeScript Compilation Check');

// Step 5: Full Turbo Monorepo Build
execute('pnpm build', 'Production Package & App Bundling (Turbo)');

// Step 6: 12-Step Supermarket Lifecycle E2E Smoke Test
execute('pnpm --filter @ti-erp/api run test:smoke', 'Day-in-the-Life Supermarket Integration Test Suite');

console.log(`
====================================================================
✔ ALL 12 SUPERMARKET WORKFLOWS PASSED VERIFICATION!
====================================================================
Production Services Ready for Deployment:
  🛒 Cashier POS & Dual Display: http://localhost:5173
  📱 Cloud Admin & SaaS Portal:  http://localhost:3001
  ⚡ Core Enterprise API:         http://localhost:3000/api/v1
  🔌 Hardware Bridge Daemon:     http://localhost:8089

Default Demo Credentials:
  Tenant: TI Supermarket Enterprise (Code: TI_CORP)
  Branch: Main Supermarket (Tirupur) (Code: BR_MAIN)
  Cashier: cashier1 (PIN: 1234)
  Admin: admin (PIN: 1234)
====================================================================
`);
