'use client';

import React, { useState, useEffect } from 'react';
import { cloudApiClient } from '../lib/api-client';

// Mock types for SaaS & Owner Dashboard
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface SupermarketClient {
  id: string;
  customerName: string;
  tenantCode: string;
  storeName: string;
  primaryContact: string;
  licenseKey: string;
  planTier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  branchesUsed: number;
  maxBranches: number;
  terminalsUsed: number;
  maxTerminals: number;
  amcExpiryDate: string;
  daysRemaining: number;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'SUSPENDED';
  modules: {
    multiBranch: boolean;
    aiCopilot: boolean;
    tallyBridge: boolean;
    hrPayroll: boolean;
    whatsappCrm: boolean;
  };
}

const INITIAL_CLIENTS: SupermarketClient[] = [
  {
    id: 'lic-001',
    customerName: 'Kalaignar Supermarket Group',
    tenantCode: 'KALAIGNAR_TN',
    storeName: 'Kalaignar Supermarket (T.Nagar & Velachery)',
    primaryContact: '+91 98401 22334',
    licenseKey: 'TIERP-8F4A-9B21-EE44-12C8',
    planTier: 'ENTERPRISE',
    branchesUsed: 2,
    maxBranches: 5,
    terminalsUsed: 6,
    maxTerminals: 10,
    amcExpiryDate: '2027-10-31',
    daysRemaining: 371,
    status: 'ACTIVE',
    modules: {
      multiBranch: true,
      aiCopilot: true,
      tallyBridge: true,
      hrPayroll: true,
      whatsappCrm: true,
    },
  },
  {
    id: 'lic-002',
    customerName: 'Sri Balaji Daily Needs',
    tenantCode: 'BALAJI_MDU',
    storeName: 'Sri Balaji Super Store - Madurai',
    primaryContact: '+91 97890 55443',
    licenseKey: 'TIERP-22DF-88AA-771B-9021',
    planTier: 'PROFESSIONAL',
    branchesUsed: 1,
    maxBranches: 2,
    terminalsUsed: 3,
    maxTerminals: 4,
    amcExpiryDate: '2026-11-15',
    daysRemaining: 21,
    status: 'EXPIRING_SOON',
    modules: {
      multiBranch: false,
      aiCopilot: true,
      tallyBridge: true,
      hrPayroll: false,
      whatsappCrm: true,
    },
  },
  {
    id: 'lic-003',
    customerName: 'Murugan Super Bazaar',
    tenantCode: 'MURUGAN_CBE',
    storeName: 'Murugan Super Bazaar - RS Puram',
    primaryContact: '+91 94432 11990',
    licenseKey: 'TIERP-AA10-55BC-33E1-4409',
    planTier: 'STARTER',
    branchesUsed: 1,
    maxBranches: 1,
    terminalsUsed: 2,
    maxTerminals: 2,
    amcExpiryDate: '2026-09-10',
    daysRemaining: -45,
    status: 'SUSPENDED',
    modules: {
      multiBranch: false,
      aiCopilot: false,
      tallyBridge: false,
      hrPayroll: false,
      whatsappCrm: false,
    },
  },
];

export default function CloudAdminHome() {
  const [activeTab, setActiveTab] = useState<'OWNER_MOBILE' | 'SUPER_ADMIN'>('OWNER_MOBILE');
  const [selectedBranch, setSelectedBranch] = useState<'ALL' | 'BRANCH_01' | 'BRANCH_02'>('ALL');
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [showNightlyReportModal, setShowNightlyReportModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as unknown as { standalone?: boolean }).standalone)
    ) {
      setIsInstalled(true);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallGuide(true);
    }
  };

  useEffect(() => {
    let mounted = true;
    const checkConn = async () => {
      const res = await cloudApiClient.checkHealth();
      if (mounted) setIsBackendConnected(res.connected);
    };
    checkConn();
    const interval = setInterval(checkConn, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Super-admin state
  const [clients, setClients] = useState<SupermarketClient[]>(INITIAL_CLIENTS);
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newTenantCode, setNewTenantCode] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPlan, setNewPlan] = useState<'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'>('ENTERPRISE');
  const [preloadCatalog, setPreloadCatalog] = useState(true);

  // AI Copilot state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; data?: any }>>([
    {
      role: 'assistant',
      text: "Vanakkam! I'm your TI-ERP AI Supermarket Copilot. Ask me anything about today's live sales, cashier voids, top profit items, or dead-stock clearance.",
    },
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Toggle Module in Super-Admin
  const toggleClientModule = (clientId: string, moduleKey: keyof SupermarketClient['modules']) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          return {
            ...c,
            modules: {
              ...c.modules,
              [moduleKey]: !c.modules[moduleKey],
            },
          };
        }
        return c;
      }),
    );
  };

  // Toggle License Active / Suspended
  const toggleLicenseStatus = (clientId: string) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          const nextStatus = c.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
          return { ...c, status: nextStatus };
        }
        return c;
      }),
    );
  };

  // Renew AMC
  const renewClientAmc = (clientId: string) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          const nextDate = new Date();
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          return {
            ...c,
            amcExpiryDate: nextDate.toISOString().split('T')[0],
            daysRemaining: 365,
            status: 'ACTIVE',
          };
        }
        return c;
      }),
    );
  };

  // Handle New Supermarket Onboarding
  const handleProvisionNewTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newTenantCode || !newStoreName) return;

    const randomKey = `TIERP-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-77A1`;
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);

    const newClient: SupermarketClient = {
      id: `lic-${Date.now().toString().slice(-4)}`,
      customerName: newCustomerName,
      tenantCode: newTenantCode.toUpperCase(),
      storeName: newStoreName,
      primaryContact: newContact || '+91 99000 00000',
      licenseKey: randomKey,
      planTier: newPlan,
      branchesUsed: 1,
      maxBranches: newPlan === 'ENTERPRISE' ? 10 : newPlan === 'PROFESSIONAL' ? 3 : 1,
      terminalsUsed: 1,
      maxTerminals: newPlan === 'ENTERPRISE' ? 20 : newPlan === 'PROFESSIONAL' ? 6 : 2,
      amcExpiryDate: expiry.toISOString().split('T')[0],
      daysRemaining: 365,
      status: 'ACTIVE',
      modules: {
        multiBranch: newPlan !== 'STARTER',
        aiCopilot: true,
        tallyBridge: true,
        hrPayroll: newPlan === 'ENTERPRISE',
        whatsappCrm: true,
      },
    };

    setClients([newClient, ...clients]);
    setShowNewTenantModal(false);
    setNewCustomerName('');
    setNewTenantCode('');
    setNewStoreName('');
    setNewContact('');
  };

  // Handle AI Query
  const handleSendAiQuery = (queryText?: string) => {
    const q = queryText || aiQuestion;
    if (!q.trim()) return;

    setAiMessages((prev) => [...prev, { role: 'user', text: q }]);
    if (!queryText) setAiQuestion('');
    setIsAiLoading(true);

    setTimeout(() => {
      let reply = '';
      const lower = q.toLowerCase();
      if (lower.includes('profit') || lower.includes('highest')) {
        reply =
          '**Top Profit Drivers Today:**\n1. Gold Winner Sunflower Oil 1L — Margin: 24.8% (₹8,420 net profit)\n2. Premium Toor Dal 1kg — Margin: 28.2% (₹6,190 net profit)\n3. Aashirvaad Shudh Chakki Atta 5kg — Margin: 21.5% (₹4,880 net profit)\n\n*Recommendation:* Maintain end-cap positioning on Aashirvaad Atta to sustain impulse basket additions.';
      } else if (lower.includes('void') || lower.includes('theft') || lower.includes('cancel')) {
        reply =
          '**Audit Alert for Today:**\n• Counter 2 (Cashier: Priya K.): 3 Line Voids totaling ₹840 between 2:15 PM and 2:45 PM.\n• Reason recorded: "Customer changed mind at payment".\n• 0 No-Sale drawer kicks detected.';
      } else if (lower.includes('expir') || lower.includes('dead')) {
        reply =
          '**Near-Expiry Alert (<45 Days):**\n• Nestle Everyday Dairy Whitener 400g (18 packs, Exp: 12 days) — Value: ₹3,600\n• Sunfeast Dark Fantasy (24 boxes, Exp: 28 days) — Value: ₹2,160\n\n*Action Suggested:* Run a Weekend Combo pairing Nestle Whitener with Tata Tea Gold at 20% combo discount.';
      } else {
        reply = `Analysis for "${q}": Store sales are operating at +14.2% above last Saturday with healthy gross profit margins of 21.8%. LAN sync is active with 0 pending sync outbox failures.`;
      }

      setAiMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      setIsAiLoading(false);
    }, 600);
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard?.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Nightly Closing Report Text
  const nightlyReportText = `📊 *TI-ERP SUPERMARKET 10:30 PM CLOSING REPORT*
📅 *Date:* 25/10/2026 | *Store:* Kalaignar Supermarket - T.Nagar

💰 *FINANCIAL PERFORMANCE*
• *Total Sales:* ₹1,48,920.00 (428 Bills)
• *Avg Basket Size:* ₹348.00
• *Gross Profit:* ₹31,870.00 (21.4%)

💵 *CASH & SETTLEMENTS*
• *Cash In Safe (Safe Drops):* ₹45,000.00
• *UPI Pending Settlement:* ₹68,450.00 (192 txns)
• *Cashier Shortages:* ₹0.00 (All 3 counters tallied)

📦 *PROCUREMENT & INVENTORY*
• *Inward GRNs Today:* 4 Invoices (₹74,200.00)
• *Stock-Out Alerts:* 2 SKUs (Tata Salt 1kg, Nandini Milk 500ml)
• *Near-Expiry Stock (<45d):* ₹5,760.00 (2 Batches)

🚨 *STORE SECURITY AUDIT*
• *Bill / Line Voids:* 3 Events (₹840.00)
• *Manual Price Overrides:* 0
• *No-Sale Drawer Kicks:* 0

✅ _Generated automatically by TI-ERP Owner Command Center_`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Navbar */}
      <header
        style={{
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          padding: '14px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              fontWeight: '900',
              padding: '6px 12px',
              borderRadius: '6px',
              letterSpacing: '1px',
              fontSize: '14px',
            }}
          >
            TI-ERP
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
              Cloud Command Center & SaaS Portal
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              Multi-Store Central Server • LAN-to-Cloud Model-B • Super-Admin SaaS
            </p>
          </div>
        </div>

        {/* View Switcher Tabs & Connection Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: isBackendConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
              color: isBackendConnected ? '#4ade80' : '#fde047',
              border: `1px solid ${isBackendConnected ? '#22c55e' : '#eab308'}`,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isBackendConnected ? '#22c55e' : '#eab308',
                display: 'inline-block',
              }}
            />
            {isBackendConnected === null
              ? 'Checking API...'
              : isBackendConnected
              ? 'Backend Connected (Live API)'
              : 'Offline Demo Mode (Active)'}
          </div>

          <div style={{ display: 'flex', backgroundColor: '#1e293b', borderRadius: '8px', padding: '4px', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('OWNER_MOBILE')}
              style={{
                backgroundColor: activeTab === 'OWNER_MOBILE' ? '#2563eb' : 'transparent',
                color: activeTab === 'OWNER_MOBILE' ? '#fff' : '#94a3b8',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📱</span> Owner Live Dashboard
            </button>
            <button
              onClick={() => setActiveTab('SUPER_ADMIN')}
              style={{
                backgroundColor: activeTab === 'SUPER_ADMIN' ? '#2563eb' : 'transparent',
                color: activeTab === 'SUPER_ADMIN' ? '#fff' : '#94a3b8',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🛡️</span> Super-Admin SaaS Licenses
            </button>
          </div>

          <button
            onClick={handleInstallClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: isInstalled ? '#1e293b' : '#0284c7',
              color: '#ffffff',
              border: `1px solid ${isInstalled ? '#334155' : '#38bdf8'}`,
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: isInstalled ? 'none' : '0 2px 8px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.15s ease',
            }}
            title="Install TI-ERP as a standalone desktop or mobile Progressive Web App"
          >
            <span>{isInstalled ? '✅ PWA Installed' : '📲 Install App'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
        {/* ============================================================== */}
        {/* VIEW 1: OWNER MOBILE COMMAND CENTER                           */}
        {/* ============================================================== */}
        {activeTab === 'OWNER_MOBILE' && (
          <div>
            {/* Top Bar with Branch Selector and Action Buttons */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Branch View:</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as any)}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: '600',
                    outline: 'none',
                  }}
                >
                  <option value="ALL">🏢 All Branches (Consolidated HO)</option>
                  <option value="BRANCH_01">🏬 T.Nagar Main Supermarket (MAIN)</option>
                  <option value="BRANCH_02">🏬 Velachery Express Store (VLC)</option>
                </select>
                <span
                  style={{
                    backgroundColor: '#064e3b',
                    color: '#34d399',
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  Live Sync Active
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowAiDrawer(true)}
                  style={{
                    backgroundColor: '#4338ca',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>✨</span> Ask My Supermarket AI
                </button>
                <button
                  onClick={() => setShowNightlyReportModal(true)}
                  style={{
                    backgroundColor: '#059669',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📱</span> 10:30 PM WhatsApp Report
                </button>
              </div>
            </div>

            {/* Live KPI Metric Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ backgroundColor: '#131b2e', padding: '18px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>TODAY'S LIVE REVENUE</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#60a5fa', margin: '8px 0 4px' }}>
                  ₹1,48,920
                </div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>▲ +14.2% vs yesterday</div>
              </div>

              <div style={{ backgroundColor: '#131b2e', padding: '18px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>TOTAL BILLS / FOOTFALL</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#f8fafc', margin: '8px 0 4px' }}>
                  428
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Avg 38 bills/hr</div>
              </div>

              <div style={{ backgroundColor: '#131b2e', padding: '18px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>AVERAGE BASKET SIZE</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#38bdf8', margin: '8px 0 4px' }}>
                  ₹348.00
                </div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>▲ +₹22 vs store avg</div>
              </div>

              <div style={{ backgroundColor: '#131b2e', padding: '18px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>LIVE GROSS PROFIT</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#34d399', margin: '8px 0 4px' }}>
                  ₹31,870 <span style={{ fontSize: '18px', color: '#a7f3d0' }}>(21.4%)</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>COGS Snapshot: ₹1,17,050</div>
              </div>
            </div>

            {/* Split Grid: Tender Breakup & Active Counter Gauges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {/* Tender Split Meter */}
              <div style={{ backgroundColor: '#131b2e', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>
                  💳 Live Payment Tender Split
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'UPI / Dynamic QR', amt: '₹68,450', pct: 46, color: '#3b82f6' },
                    { label: 'Cash in Counter Drawer', amt: '₹56,120', pct: 38, color: '#10b981' },
                    { label: 'EDC Credit / Debit Cards', amt: '₹14,200', pct: 9, color: '#8b5cf6' },
                    { label: 'Customer Monthly Khata', amt: '₹6,400', pct: 4, color: '#f59e0b' },
                    { label: 'Sodexo Meal Pass', amt: '₹3,750', pct: 3, color: '#ec4899' },
                  ].map((t) => (
                    <div key={t.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: '#cbd5e1' }}>{t.label}</span>
                        <span style={{ fontWeight: '700', color: '#f8fafc' }}>
                          {t.amt} <span style={{ color: '#64748b', fontSize: '11px' }}>({t.pct}%)</span>
                        </span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${t.pct}%`, height: '100%', backgroundColor: t.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Counters Status */}
              <div style={{ backgroundColor: '#131b2e', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>
                  🖥️ Active POS Counter Drawers
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { code: 'TERM-01', cashier: 'Ramesh K.', cash: '₹18,450', drops: '₹15,000', status: 'ACTIVE' },
                    { code: 'TERM-02', cashier: 'Priya M.', cash: '₹22,100', drops: '₹20,000', status: 'ACTIVE' },
                    { code: 'TERM-03', cashier: 'Suresh V.', cash: '₹15,570', drops: '₹10,000', status: 'ACTIVE' },
                  ].map((c) => (
                    <div
                      key={c.code}
                      style={{
                        backgroundColor: '#0f172a',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #1e293b',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#f8fafc' }}>
                          {c.code} • <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{c.cashier}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Safe Drops: {c.drops} | Cash in Drawer: <b style={{ color: '#10b981' }}>{c.cash}</b>
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor: '#064e3b',
                          color: '#34d399',
                          fontSize: '10px',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontWeight: '700',
                        }}
                      >
                        ONLINE
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Split Grid: Top Selling Items & Anti-Theft / Security Alerts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {/* Top 5 Selling SKUs */}
              <div style={{ backgroundColor: '#131b2e', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>
                  🔥 Top Selling Items Today
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { name: 'Gold Winner Sunflower Oil 1L', qty: '64 pkts', total: '₹8,448', margin: '24.8%' },
                    { name: 'Ponni Boiled Rice 5kg Bag', qty: '24 bags', total: '₹7,440', margin: '19.2%' },
                    { name: 'Premium Toor Dal 1kg', qty: '38 pkts', total: '₹6,270', margin: '28.2%' },
                    { name: 'Aashirvaad Shudh Chakki Atta 5kg', qty: '20 bags', total: '₹5,500', margin: '21.5%' },
                    { name: 'Refined White Sugar 1kg', qty: '82 pkts', total: '₹3,444', margin: '12.4%' },
                  ].map((item, idx) => (
                    <div
                      key={item.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        backgroundColor: '#0f172a',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#64748b', fontWeight: '700' }}>#{idx + 1}</span>
                        <div>
                          <div style={{ fontWeight: '600', color: '#f1f5f9' }}>{item.name}</div>
                          <div style={{ color: '#64748b', fontSize: '11px' }}>Qty Sold: {item.qty}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '700', color: '#60a5fa' }}>{item.total}</div>
                        <div style={{ color: '#34d399', fontSize: '10px' }}>GP {item.margin}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anti-Theft & Security Alerts */}
              <div style={{ backgroundColor: '#131b2e', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#f87171' }}>
                  🚨 Security, Void & Shrinkage Alerts
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      padding: '12px',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontWeight: '700', color: '#f87171', fontSize: '13px' }}>
                      3 Line Voids at Counter 2 (₹840.00)
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                      Cashier: Priya M. • Reason: "Customer changed mind after scan" • 02:40 PM
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      padding: '12px',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontWeight: '700', color: '#fbbf24', fontSize: '13px' }}>
                      Near-Expiry Stock Warning (&lt; 45 Days)
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                      Nestle Everyday Dairy Whitener (18 units, Exp: 12d) • Value: ₹3,600
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#0f172a',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #1e293b',
                      fontSize: '12px',
                      color: '#94a3b8',
                    }}
                  >
                    <div>• <b>0 Manual Price Overrides</b> recorded today.</div>
                    <div style={{ marginTop: '4px' }}>• <b>0 No-Sale Drawer Kicks</b> recorded today.</div>
                    <div style={{ marginTop: '4px' }}>• All cash drawer locks synchronized with POS.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: SUPER-ADMIN SAAS LICENSE CONTROL PORTAL              */}
        {/* ============================================================== */}
        {activeTab === 'SUPER_ADMIN' && (
          <div>
            {/* Super Admin Top Header */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
                  Supermarket SaaS Client Licenses & AMC Control
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Manage active supermarket deployments, Annual Maintenance Contracts, and toggle module feature-flags
                </p>
              </div>

              <button
                onClick={() => setShowNewTenantModal(true)}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>➕</span> Provision New Supermarket Client
              </button>
            </div>

            {/* SaaS Metrics Summary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ backgroundColor: '#131b2e', padding: '16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>TOTAL CLIENT STORES</div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>42 Supermarkets</div>
              </div>
              <div style={{ backgroundColor: '#131b2e', padding: '16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>ACTIVE POS TERMINALS</div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>184 Lanes</div>
              </div>
              <div style={{ backgroundColor: '#131b2e', padding: '16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>AMC RENEWALS PENDING (&lt; 30d)</div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', marginTop: '6px' }}>3 Stores</div>
              </div>
              <div style={{ backgroundColor: '#131b2e', padding: '16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>ESTIMATED ANNUAL AMC MRR</div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#38bdf8', marginTop: '6px' }}>₹15,12,000</div>
              </div>
            </div>

            {/* Supermarket Clients Table */}
            <div style={{ backgroundColor: '#131b2e', borderRadius: '10px', border: '1px solid #1e293b', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '14px 16px' }}>Store & Customer</th>
                    <th style={{ padding: '14px 16px' }}>License Key</th>
                    <th style={{ padding: '14px 16px' }}>Plan / Limits</th>
                    <th style={{ padding: '14px 16px' }}>Enabled Feature Modules</th>
                    <th style={{ padding: '14px 16px' }}>AMC Expiry</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #1e293b', verticalAlign: 'middle' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#f8fafc' }}>{c.storeName}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          Code: <code style={{ color: '#38bdf8' }}>{c.tenantCode}</code> • {c.primaryContact}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <code
                            style={{
                              backgroundColor: '#0f172a',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#cbd5e1',
                              border: '1px solid #334155',
                            }}
                          >
                            {c.licenseKey}
                          </code>
                          <button
                            onClick={() => copyToClipboard(c.licenseKey)}
                            title="Copy License Key"
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: copiedKey === c.licenseKey ? '#10b981' : '#94a3b8',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            {copiedKey === c.licenseKey ? '✓' : '📋'}
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#f1f5f9' }}>{c.planTier}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Branches: {c.branchesUsed}/{c.maxBranches} • Terminals: {c.terminalsUsed}/{c.maxTerminals}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '320px' }}>
                          {[
                            { key: 'multiBranch' as const, label: 'Multi-Branch' },
                            { key: 'aiCopilot' as const, label: 'AI Copilot' },
                            { key: 'tallyBridge' as const, label: 'Tally XML' },
                            { key: 'hrPayroll' as const, label: 'HR / Payroll' },
                            { key: 'whatsappCrm' as const, label: 'WhatsApp CRM' },
                          ].map((mod) => (
                            <button
                              key={mod.key}
                              onClick={() => toggleClientModule(c.id, mod.key)}
                              style={{
                                fontSize: '10px',
                                padding: '3px 7px',
                                borderRadius: '4px',
                                border: '1px solid',
                                cursor: 'pointer',
                                fontWeight: '600',
                                backgroundColor: c.modules[mod.key] ? 'rgba(37, 99, 235, 0.2)' : 'rgba(71, 85, 105, 0.2)',
                                borderColor: c.modules[mod.key] ? '#3b82f6' : '#475569',
                                color: c.modules[mod.key] ? '#93c5fd' : '#64748b',
                              }}
                            >
                              {c.modules[mod.key] ? '✓ ' : '✕ '}
                              {mod.label}
                            </button>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>{c.amcExpiryDate}</div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: c.daysRemaining > 30 ? '#10b981' : c.daysRemaining > 0 ? '#f59e0b' : '#ef4444',
                            fontWeight: '600',
                          }}
                        >
                          {c.daysRemaining > 0 ? `${c.daysRemaining} days left` : 'Expired'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            backgroundColor:
                              c.status === 'ACTIVE'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : c.status === 'EXPIRING_SOON'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              c.status === 'ACTIVE' ? '#34d399' : c.status === 'EXPIRING_SOON' ? '#fbbf24' : '#f87171',
                          }}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => renewClientAmc(c.id)}
                            style={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              color: '#38bdf8',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: '600',
                            }}
                          >
                            Renew 1-Yr
                          </button>
                          <button
                            onClick={() => toggleLicenseStatus(c.id)}
                            style={{
                              backgroundColor: c.status === 'SUSPENDED' ? '#065f46' : '#7f1d1d',
                              border: 'none',
                              color: '#fff',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: '600',
                            }}
                          >
                            {c.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: PROVISION NEW SUPERMARKET TENANT                      */}
      {/* ============================================================== */}
      {showNewTenantModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#f8fafc' }}>
                🚀 Provision New Supermarket Client
              </h3>
              <button
                onClick={() => setShowNewTenantModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProvisionNewTenant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Customer Legal Trade Entity Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annachi Supermarket Retail Pvt Ltd"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Store Display Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annachi Supermarket"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Tenant Code (Uppercase):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ANNACHI_CHN"
                    value={newTenantCode}
                    onChange={(e) => setNewTenantCode(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Owner WhatsApp / Mobile:
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98400 11223"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    SaaS Plan Tier:
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="STARTER">STARTER (1 Branch / 2 POS)</option>
                    <option value="PROFESSIONAL">PROFESSIONAL (3 Branch / 6 POS)</option>
                    <option value="ENTERPRISE">ENTERPRISE (10 Branch / 20 POS)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="preloadCatalog"
                  checked={preloadCatalog}
                  onChange={(e) => setPreloadCatalog(e.target.checked)}
                />
                <label htmlFor="preloadCatalog" style={{ fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                  Pre-load 50,000+ Indian FMCG & Grocery barcode catalog + demo inventory
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewTenantModal(false)}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '13px',
                  }}
                >
                  Confirm & Generate License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: 10:30 PM NIGHTLY CLOSING REPORT PREVIEW               */}
      {/* ============================================================== */}
      {showNightlyReportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📱</span> 10:30 PM Nightly WhatsApp Summary
              </h3>
              <button
                onClick={() => setShowNightlyReportModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <pre
              style={{
                backgroundColor: '#0f172a',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                color: '#e2e8f0',
                fontSize: '12px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                maxHeight: '340px',
                overflowY: 'auto',
              }}
            >
              {nightlyReportText}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Auto-scheduled at 22:30 IST to owner's WhatsApp
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    copyToClipboard(nightlyReportText);
                  }}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#38bdf8',
                    border: '1px solid #334155',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {copiedKey === nightlyReportText ? '✓ Copied' : '📋 Copy Text'}
                </button>
                <button
                  onClick={() => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(nightlyReportText)}`, '_blank');
                  }}
                  style={{
                    backgroundColor: '#059669',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                >
                  🚀 Dispatch to WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DRAWER: "ASK MY SUPERMARKET" AI COPILOT CHAT                   */}
      {/* ============================================================== */}
      {showAiDrawer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '420px',
            maxWidth: '100vw',
            backgroundColor: '#0f172a',
            borderLeft: '1px solid #1e293b',
            boxShadow: '-10px 0 25px rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#131b2e',
            }}
          >
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✨</span> Ask My Supermarket AI Copilot
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Real-time PostgreSQL commercial intelligence</div>
            </div>
            <button
              onClick={() => setShowAiDrawer(false)}
              style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Quick Suggestions */}
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid #1e293b',
              backgroundColor: '#0b1120',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
            }}
          >
            {[
              'Top profit items today',
              'Why were items voided at Counter 2?',
              'Expiring stock this month',
              'Daily tender breakup',
            ].map((s) => (
              <button
                key={s}
                onClick={() => handleSendAiQuery(s)}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#93c5fd',
                  border: '1px solid #334155',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {aiMessages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: m.role === 'user' ? '#2563eb' : '#1e293b',
                  color: '#f8fafc',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
            ))}
            {isAiLoading && (
              <div style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                Analyzing real-time store database...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div style={{ padding: '14px', borderTop: '1px solid #1e293b', backgroundColor: '#131b2e' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ask in English or Tamil (e.g. Which items had high profit?)"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendAiQuery();
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handleSendAiQuery()}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: PWA INSTALL GUIDE MODAL                               */}
      {/* ============================================================== */}
      {showInstallGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowInstallGuide(false)}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #38bdf8',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📲</span>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>
                  Install TI-ERP as a Native App
                </h3>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '20px' }}>
              TI-ERP is engineered with Progressive Web App (PWA) architecture with offline Service Workers. You can install it on your laptop, tablet, or smartphone for full-screen offline execution during client pitches.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #38bdf8' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                  💻 Chrome / Edge / Desktop Brave
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                  Click the <strong>Install</strong> icon on the right side of the address bar, or click browser menu (<strong>⋮</strong>) &rarr; <strong>Install TI-ERP Cloud Command Center</strong>.
                </div>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #34d399' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
                  📱 Apple iPad / iPhone (Safari)
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                  Tap the <strong>Share</strong> button (box with upward arrow <span style={{ fontWeight: 'bold' }}>⎋</span>) at the bottom &rarr; Scroll down and tap <strong>"Add to Home Screen"</strong>.
                </div>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #fbbf24' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
                  🤖 Android (Chrome / Firefox)
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                  Tap the three dots menu (<strong>⋮</strong>) in the top-right corner &rarr; Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowInstallGuide(false)}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
