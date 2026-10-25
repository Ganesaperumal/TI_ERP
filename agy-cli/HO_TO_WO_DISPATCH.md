# HO_TO_WO_DISPATCH.md
**From:** Argon (Director & CTO — Head Office / Gemini Web)
**To:** Agy CLI Execution Squad (5x Senior Devs — Flash 3.8 High)
**Repository:** `https://github.com/Ganesaperumal/TI_ERP.git`
**Last Verified Commit:** `35660fa2139bcbd45a4b1d53e26dc1e4cfb9f4d5` (`6bfe1be0a863efb52e84e70823e9208648aa917a`)
**Dispatch ID:** `DISPATCH-010` (Milestone 9 — Installable Offline Client-Meeting PWAs, Service Workers, Smartphone Frame Owner Preview & 7-Step Executive Pitch Mode)
**Status:** `EXECUTE IMMEDIATELY`

---

## SECTION A: DOCUMENTATION & STATE TRACKER UPDATES (MANDATORY FIRST STEP)

1. **Update `agy-cli/02_STATE_TRACKER.md`:**
   - Confirm **M1 through M8 (`REMOD-801` Gold Master Math Fix)** are `100% COMPLETED & VERIFIED (Commit: 6bfe1be0a863efb52e84e70823e9208648aa917a)`.
   - Add **M9: Installable Offline Client-Meeting PWAs & Executive Pitch Showcase (`WO-901` to `WO-903`)** as `IN_PROGRESS`.

---

## SECTION B: NEW MODULAR WORK ORDERS — MILESTONE 9 (`WO-901` TO `WO-903`)

The Boss needs to demonstrate **all** capabilities of TI-ERP on a laptop, tablet, or phone during client meetings—as an installable, full-screen **Progressive Web App (PWA)** that works 100% offline even without Docker or backend servers running, and without switching ports between `pos-web` (`5173`) and `cloud-admin` (`3001`)!

### [WO-901] Assigned to `DEV-4` (Installable Offline PWA Architecture for `apps/pos-web` & `apps/cloud-admin`)
**Target Files:**
- `apps/pos-web/public/manifest.webmanifest`
- `apps/pos-web/public/icon.svg`
- `apps/pos-web/public/sw.js`
- `apps/pos-web/index.html`
- `apps/pos-web/src/main.tsx`
- `apps/cloud-admin/public/manifest.webmanifest`
- `apps/cloud-admin/public/icon.svg`
- `apps/cloud-admin/public/sw.js`
- `apps/cloud-admin/src/app/layout.tsx`

**Tasks:**
1. **PWA Web App Manifests & Vector Icons:**
   - Create `apps/pos-web/public/manifest.webmanifest` (`name: "TI-ERP Supermarket POS & Store OS"`, `short_name: "TI-ERP POS"`, `start_url: "/"`, `display: "standalone"`, `orientation: "any"`, `theme_color: "#0f172a"`, `background_color: "#0f172a"`, icons pointing to `/icon.svg` with `sizes: "any"`, `purpose: "any maskable"`).
   - Create `apps/cloud-admin/public/manifest.webmanifest` (`name: "TI-ERP Owner Command Center & Cloud HO"`, `short_name: "TI-ERP Owner"`, `start_url: "/"`, `display: "standalone"`, `theme_color: "#0f172a"`, `background_color: "#0f172a"`, icons pointing to `/icon.svg`).
   - Create crisp SVG brand icons at `apps/pos-web/public/icon.svg` and `apps/cloud-admin/public/icon.svg`.
2. **Offline-First Service Workers (`sw.js`):**
   - Create `apps/pos-web/public/sw.js` and `apps/cloud-admin/public/sw.js` implementing `install` (`self.skipWaiting()`), `activate` (`clients.claim()`), and `fetch` (**Network-First with Cache-Fallback** for navigation/static assets so once opened, the entire UI loads in `<100ms` even in airplane mode during a client pitch!).
   - Register `/sw.js` inside `apps/pos-web/src/main.tsx` and in `apps/cloud-admin/src/app/page.tsx` (or a client component in `layout.tsx`).
3. **Standalone Meta Tags & "📲 Install PWA" Header Action:**
   - Update `apps/pos-web/index.html` and `apps/cloud-admin/src/app/layout.tsx` with `<link rel="manifest" href="/manifest.webmanifest" />`, `<meta name="theme-color" content="#0f172a" />`, `<meta name="apple-mobile-web-app-capable" content="yes" />`, and `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`.
   - Capture the browser `beforeinstallprompt` event in `apps/pos-web/src/App.tsx` and `apps/cloud-admin/src/app/page.tsx` and render an interactive **"📲 Install PWA App"** button in the top navigation bar (showing native install prompt when supported, or a clean modal with 2-step Chrome/Edge/iOS "Add to Home Screen / Install App" instructions during client demos).

---

### [WO-902] Assigned to `DEV-5` (Unified "Client Meeting Pitch Mode" & Embedded Owner Mobile / SaaS Admin Showcase inside `apps/pos-web`)
**Target Files:**
- `apps/pos-web/src/features/pitch-demo/OwnerMobileAndCloudPreviewPage.tsx`
- `apps/pos-web/src/App.tsx`

**Tasks:**
During a client meeting, the Boss must be able to showcase the **Owner Mobile App (Live KPIs + 10:30 PM WhatsApp Closing Report + Ask My Supermarket AI)** AND the **SaaS Super-Admin License Provisioner** right inside `apps/pos-web` without changing URLs or ports!
1. **Create `apps/pos-web/src/features/pitch-demo/OwnerMobileAndCloudPreviewPage.tsx`:**
   - **Mode 1: "📱 Owner Mobile App Simulator (Phone Frame View)":** Renders a realistic interactive smartphone bezel right on the screen showing:
     - Multi-Branch Switcher (`All Branches Consolidated` vs `Main Supermarket Tirupur` vs `Central Warehouse`).
     - Live Today's Sales, Gross Profit (`₹51.41 / 21.8%` or live/demo totals), Cash vs. UPI vs. Khata split, Active POS Counters, and Security Void Alerts.
     - Interactive **10:30 PM WhatsApp Nightly Closing Report Preview** (styled like a real WhatsApp message bubble on the owner's phone with a 1-click **"Simulate 10:30 PM Push"** button!).
     - Embedded **"Ask My Supermarket" Mobile Voice/Text AI Drawer**.
   - **Mode 2: "🏢 Multi-Branch Cloud HO & SaaS Vendor License Portal":**
     - Full-width view allowing the Boss to demonstrate provisioning a new Supermarket Client License in 10 seconds, toggling module feature flags (`Multi-Branch`, `BYOK AI Copilot`, `Tally XML Bridge`, `HR Payroll`, `WhatsApp CRM`), and viewing AMC expiry controls.
2. **Integrate "🎯 Client Pitch Mode" Guided Tour Bar into `apps/pos-web/src/App.tsx`:**
   - Add the new tab (`Owner Mobile & Cloud PWA`) to the main navigation in `apps/pos-web/src/App.tsx`.
   - Add a high-visibility **"🎯 Client Pitch Mode"** toggle button in the top header of `apps/pos-web/src/App.tsx`.
   - When active, renders a sleek **7-Step Executive Sales Pitch Ribbon** across the top of the screen. Clicking any step jumps straight to that screen and highlights the exact selling point for the supermarket owner:
     1. **`1. 3-Sec POS & Scale Barcode`** $\rightarrow$ Opens `POS Billing`
     2. **`2. AI Bill OCR & Margin Guardrail`** $\rightarrow$ Opens `GRN & AI OCR`
     3. **`3. 50kg->1kg Repack & 2-Up Labels`** $\rightarrow$ Opens `Repacking Studio`
     4. **`4. Khata WhatsApp & Missing Ration`** $\rightarrow$ Opens `CRM, Loyalty & Khata`
     5. **`5. GSTR-2B ITC Risk & Tally XML`** $\rightarrow$ Opens `GST, Finance & Tally`
     6. **`6. Cashier Shortage->Payroll Link`** $\rightarrow$ Opens `HR & Payroll`
     7. **`7. Owner Mobile App & 10:30PM WhatsApp`** $\rightarrow$ Opens `OwnerMobileAndCloudPreviewPage`

---

### [WO-903] Assigned to `DEV-1` (1-Click PWA Production Server Script & Client Meeting Pitch Guide in `README.md`)
**Target Files:**
- `package.json`
- `scripts/start-demo.js`
- `README.md`

**Tasks:**
1. Add `"pwa:preview"` script to root `package.json` (`pnpm --filter @ti-erp/pos-web preview --host`) so the Boss can launch the production-built PWA on local Wi-Fi/tablet/laptop in 1 command.
2. Update `README.md` with a clear section: **"🎯 Client Meeting PWA & Offline Pitch Guide"** explaining how to launch, install as a desktop/tablet PWA, and run the 7-Step Supermarket Owner Pitch Tour.

---

## SECTION C: MANDATORY VERIFICATION REPORT (`agy-cli/WO_TO_HO_REPORT.md`)

When `WO-901`, `WO-902`, and `WO-903` are complete:
1. Run `pnpm --filter @ti-erp/database prisma validate`, `pnpm -r typecheck`, `pnpm build`, and `pnpm test:smoke` — MUST show **0 errors** and **12/12 E2E steps passing**.
2. Update `agy-cli/02_STATE_TRACKER.md` marking **Milestone 9 (Installable Offline Client-Meeting PWAs & Executive Pitch Mode)** as `100% COMPLETED & VERIFIED`.
3. Commit all new PWA & Pitch Mode files and generate `agy-cli/WO_TO_HO_REPORT.md` containing:
   - Executive Summary & Verified Commit SHA
   - File list and code snippets of `manifest.webmanifest`, `sw.js`, `OwnerMobileAndCloudPreviewPage.tsx`, and the 7-Step Client Pitch Bar in `App.tsx`
   - Full terminal outputs of `pnpm -r typecheck`, `pnpm build` (confirming Vite & Next.js bundle the new PWA assets cleanly), and `git show --stat HEAD`.
4. Push to `origin/main` and hand `agy-cli/WO_TO_HO_REPORT.md` to Argon CTO!
