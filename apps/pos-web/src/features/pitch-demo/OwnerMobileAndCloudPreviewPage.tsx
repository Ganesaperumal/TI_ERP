import React, { useState } from 'react';

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
    storeName: 'Kalaignar Supermarket (Tirupur Flagship)',
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
    licenseKey: 'TIERP-22C1-77BA-44EF-99B2',
    planTier: 'PROFESSIONAL',
    branchesUsed: 1,
    maxBranches: 3,
    terminalsUsed: 3,
    maxTerminals: 6,
    amcExpiryDate: '2027-04-15',
    daysRemaining: 172,
    status: 'ACTIVE',
    modules: {
      multiBranch: true,
      aiCopilot: false,
      tallyBridge: true,
      hrPayroll: false,
      whatsappCrm: true,
    },
  },
  {
    id: 'lic-003',
    customerName: 'Annamalai Fresh Mart',
    tenantCode: 'ANNAMALAI_CBE',
    storeName: 'Annamalai Fresh - Coimbatore RS Puram',
    primaryContact: '+91 94432 11223',
    licenseKey: 'TIERP-99A1-33DD-11FF-77E5',
    planTier: 'STARTER',
    branchesUsed: 1,
    maxBranches: 1,
    terminalsUsed: 2,
    maxTerminals: 2,
    amcExpiryDate: '2026-11-10',
    daysRemaining: 16,
    status: 'EXPIRING_SOON',
    modules: {
      multiBranch: false,
      aiCopilot: false,
      tallyBridge: true,
      hrPayroll: false,
      whatsappCrm: false,
    },
  },
];

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  source?: string;
}

export const OwnerMobileAndCloudPreviewPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'PHONE_SIMULATOR' | 'CLOUD_HO_PORTAL'>('PHONE_SIMULATOR');
  const [selectedBranch, setSelectedBranch] = useState<'ALL' | 'MAIN' | 'WAREHOUSE'>('ALL');
  const [pushStatusToast, setPushStatusToast] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Clients state for Mode 2
  const [clients, setClients] = useState<SupermarketClient[]>(INITIAL_CLIENTS);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newTenantCode, setNewTenantCode] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPlan, setNewPlan] = useState<'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'>('ENTERPRISE');
  const [provisionSuccessMsg, setProvisionSuccessMsg] = useState<string | null>(null);

  // AI Drawer state for Phone Frame
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiChat, setAiChat] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: "Vanakkam Boss! I'm your TI-ERP AI Supermarket Copilot. Ask me about today's live sales, gross profit margin, cashier cash tally, or supplier debit notes.",
    },
  ]);

  // Branch data
  const branchData = {
    ALL: {
      name: 'All Branches (Consolidated)',
      sales: '₹1,48,920.00',
      profit: '₹32,460.00',
      margin: '21.8%',
      bills: '284',
      avgBasket: '₹524',
      cash: '₹64,200',
      upi: '₹72,400',
      khata: '₹12,320',
      activeCounters: '3 / 3 Active',
      voidCount: '1 void (₹450 supervisor approved)',
    },
    MAIN: {
      name: 'Main Supermarket Tirupur',
      sales: '₹1,12,450.00',
      profit: '₹24,520.00',
      margin: '21.8%',
      bills: '218',
      avgBasket: '₹515',
      cash: '₹48,150',
      upi: '₹55,300',
      khata: '₹9,000',
      activeCounters: '2 / 2 Active',
      voidCount: '1 void (₹450 supervisor approved)',
    },
    WAREHOUSE: {
      name: 'Central Warehouse & Hub',
      sales: '₹36,470.00',
      profit: '₹7,940.00',
      margin: '21.7%',
      bills: '66',
      avgBasket: '₹552',
      cash: '₹16,050',
      upi: '₹17,100',
      khata: '₹3,320',
      activeCounters: '1 / 1 Active',
      voidCount: '0 voids',
    },
  };

  const currentData = branchData[selectedBranch];

  const handleSimulatePush = () => {
    setPushStatusToast('🚀 10:30 PM WhatsApp closing report delivered to Owner phone (+91 98401 22334) via Cloud Gateway!');
    setTimeout(() => {
      setPushStatusToast(null);
    }, 4500);
  };

  const handleSendAi = (text?: string) => {
    const q = text || aiInput;
    if (!q.trim()) return;

    setAiChat((prev) => [...prev, { role: 'user', text: q }]);
    if (!text) setAiInput('');

    setTimeout(() => {
      let reply = '';
      let src = '';
      const lower = q.toLowerCase();

      if (lower.includes('margin') || lower.includes('rice') || lower.includes('profit')) {
        reply =
          'Royal Basmati Rice 1kg repacked pouch net landing cost is ₹45.38/pouch and selling price is ₹58.00. Your gross margin is +21.76% (+₹12.62/pouch). Total batch gross profit today is +₹51.41!';
        src = 'Source: Batch B-RICE-POUCH-01 • Repacking Studio & Daily P&L';
      } else if (lower.includes('shortage') || lower.includes('cashier') || lower.includes('karthik')) {
        reply =
          'Zero cashier cash shortage recorded for shift today! Both Counter 1 (Karthik R) and Counter 2 (Priya S) physical cash tally matches system tender totals to ₹0.00.';
        src = 'Source: Shift Register SR-2026-1025 • Cashier Drawer Audit';
      } else if (lower.includes('credit') || lower.includes('debit') || lower.includes('supplier')) {
        reply =
          'Pending Debit Note DN-2026-003 for ₹780.00 with Sri Lakshmi Wholesalers is ready for adjustment in next invoice settlement.';
        src = 'Source: Procurement & Debit Note Engine';
      } else {
        reply = `Today's net sales stand at ${currentData.sales} across ${currentData.bills} customer invoices with a solid ${currentData.margin} gross profit margin (${currentData.profit}). Store operations are running at 100% capacity.`;
        src = 'Source: Real-time Consolidated Cloud Sync Ledger';
      }

      setAiChat((prev) => [...prev, { role: 'assistant', text: reply, source: src }]);
    }, 400);
  };

  const handleToggleModule = (clientId: string, moduleKey: keyof SupermarketClient['modules']) => {
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

  const handleProvisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newStoreName || !newTenantCode) return;

    const randomKey = `TIERP-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-99A2`;
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);

    const client: SupermarketClient = {
      id: `lic-${Date.now().toString().slice(-4)}`,
      customerName: newCustomerName,
      tenantCode: newTenantCode.toUpperCase(),
      storeName: newStoreName,
      primaryContact: newContact || '+91 98000 11223',
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

    setClients([client, ...clients]);
    setProvisionSuccessMsg(`✅ Successfully provisioned ${newStoreName} with License Key ${randomKey}!`);
    setNewCustomerName('');
    setNewStoreName('');
    setNewTenantCode('');
    setNewContact('');

    setTimeout(() => {
      setProvisionSuccessMsg(null);
    }, 5000);
  };

  const copyKey = (key: string) => {
    navigator.clipboard?.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div style={{ padding: '20px', minHeight: 'calc(100vh - 70px)', backgroundColor: '#090d16', color: '#f8fafc' }}>
      {/* Top Showcase Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          padding: '14px 20px',
          borderRadius: '12px',
          border: '1px solid #1e293b',
          marginBottom: '24px',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>👑</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
              Owner Mobile PWA & Cloud Head Office Showcase
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Pitch TI-ERP to supermarket owners as a mobile-first command center with automatic 10:30 PM WhatsApp closing summaries and instant SaaS multi-store onboarding.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', backgroundColor: '#1e293b', borderRadius: '8px', padding: '4px', gap: '4px' }}>
          <button
            onClick={() => setViewMode('PHONE_SIMULATOR')}
            style={{
              padding: '8px 16px',
              backgroundColor: viewMode === 'PHONE_SIMULATOR' ? '#2563eb' : 'transparent',
              color: viewMode === 'PHONE_SIMULATOR' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📱</span> Phone Frame Simulator
          </button>
          <button
            onClick={() => setViewMode('CLOUD_HO_PORTAL')}
            style={{
              padding: '8px 16px',
              backgroundColor: viewMode === 'CLOUD_HO_PORTAL' ? '#2563eb' : 'transparent',
              color: viewMode === 'CLOUD_HO_PORTAL' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🏢</span> Multi-Branch Cloud HO Portal
          </button>
        </div>
      </div>

      {/* Global Toast Alert */}
      {pushStatusToast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#064e3b',
            border: '1px solid #10b981',
            color: '#34d399',
            padding: '14px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '13px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {pushStatusToast}
        </div>
      )}

      {/* MODE 1: SMARTPHONE BEZEL SIMULATOR */}
      {viewMode === 'PHONE_SIMULATOR' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '10px 0 40px' }}>
          {/* Smartphone Hardware Frame */}
          <div
            style={{
              width: '390px',
              height: '810px',
              backgroundColor: '#020617',
              borderRadius: '48px',
              border: '10px solid #1e293b',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 2px #334155',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Dynamic Island / Speaker Pill */}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '110px',
                height: '24px',
                backgroundColor: '#000000',
                borderRadius: '16px',
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px',
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0f172a' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#1e293b' }} />
            </div>

            {/* Mobile Status Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 22px 6px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#f8fafc',
                zIndex: 20,
              }}
            >
              <span>10:30 PM</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <span>5G</span>
                <span>🛜</span>
                <span>🔋 98%</span>
              </div>
            </div>

            {/* Phone Screen App Content (Scrollable) */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 16px 70px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* App Brand Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#38bdf8', letterSpacing: '1px' }}>
                    TI-ERP OWNER OS
                  </span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                    Store Live Pulse
                  </h3>
                </div>
                <span
                  style={{
                    backgroundColor: '#064e3b',
                    color: '#34d399',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#34d399' }} />
                  Live Sync
                </span>
              </div>

              {/* Branch Selector Pills */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {(['ALL', 'MAIN', 'WAREHOUSE'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBranch(b)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: selectedBranch === b ? 700 : 500,
                      backgroundColor: selectedBranch === b ? '#2563eb' : '#1e293b',
                      color: selectedBranch === b ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {b === 'ALL' ? '🌐 All Consolidated' : b === 'MAIN' ? '🏪 Tirupur Store' : '📦 Central WH'}
                  </button>
                ))}
              </div>

              {/* Key KPI Hero Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    padding: '12px',
                    borderRadius: '14px',
                    border: '1px solid #1e293b',
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Today's Net Sales
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
                    {currentData.sales}
                  </div>
                  <div style={{ fontSize: '10px', color: '#34d399', marginTop: '2px', fontWeight: 600 }}>
                    ↑ +14.2% vs yesterday
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#0f172a',
                    padding: '12px',
                    borderRadius: '14px',
                    border: '1px solid #1e293b',
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Gross Profit (+Margin)
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>
                    {currentData.profit}
                  </div>
                  <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
                    {currentData.margin} Gross Margin
                  </div>
                </div>
              </div>

              {/* Secondary Metrics Grid */}
              <div
                style={{
                  backgroundColor: '#0f172a',
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1px solid #1e293b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Footfall / Bills</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>{currentData.bills} Invoices</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Avg Basket Size</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>{currentData.avgBasket}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>POS Counters</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#34d399' }}>{currentData.activeCounters}</div>
                </div>
              </div>

              {/* Tender Breakdown Bar */}
              <div
                style={{
                  backgroundColor: '#0f172a',
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1px solid #1e293b',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                  Tender Distribution
                </div>
                <div style={{ height: '8px', borderRadius: '4px', display: 'flex', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ width: '43%', backgroundColor: '#10b981' }} title="Cash 43%" />
                  <div style={{ width: '49%', backgroundColor: '#38bdf8' }} title="UPI 49%" />
                  <div style={{ width: '8%', backgroundColor: '#f59e0b' }} title="Khata 8%" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                  <span style={{ color: '#34d399' }}>● Cash: {currentData.cash}</span>
                  <span style={{ color: '#38bdf8' }}>● UPI: {currentData.upi}</span>
                  <span style={{ color: '#fbbf24' }}>● Khata: {currentData.khata}</span>
                </div>
              </div>

              {/* INTERACTIVE 10:30 PM WHATSAPP CLOSING REPORT PREVIEW */}
              <div
                style={{
                  backgroundColor: '#064e3b',
                  borderRadius: '16px',
                  border: '1px solid #059669',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                }}
              >
                {/* WhatsApp Chat Bar */}
                <div
                  style={{
                    backgroundColor: '#065f46',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                      }}
                    >
                      💬
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff' }}>
                        TI-ERP Nightly Bot ✓✓
                      </div>
                      <div style={{ fontSize: '9px', color: '#a7f3d0' }}>WhatsApp Business API</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '9px', color: '#a7f3d0' }}>10:30 PM</span>
                </div>

                {/* WhatsApp Message Bubble */}
                <div style={{ padding: '12px' }}>
                  <div
                    style={{
                      backgroundColor: '#042f2e',
                      border: '1px solid #115e59',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '11px',
                      lineHeight: '1.45',
                      color: '#ccfbf1',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#5eead4', marginBottom: '4px' }}>
                      📊 TI-ERP 10:30 PM CLOSING REPORT
                    </div>
                    <div>📅 <strong>Date:</strong> 25/10/2026 | <strong>Store:</strong> {currentData.name}</div>
                    <div style={{ margin: '4px 0', borderTop: '1px dashed #134e4a' }} />
                    <div>💰 <strong>Net Sales:</strong> {currentData.sales} ({currentData.bills} bills)</div>
                    <div>📈 <strong>Gross Margin:</strong> {currentData.profit} ({currentData.margin})</div>
                    <div>💵 <strong>Cash In Safe:</strong> {currentData.cash}</div>
                    <div>📱 <strong>UPI Settlement:</strong> {currentData.upi}</div>
                    <div>⚖️ <strong>Cashier Shortage:</strong> ₹0.00 (Tallied)</div>
                    <div>🚨 <strong>Void Alerts:</strong> {currentData.voidCount}</div>
                    <div style={{ margin: '4px 0', borderTop: '1px dashed #134e4a' }} />
                    <div style={{ color: '#fde047', fontSize: '10px' }}>
                      ⚠️ <strong>Missing Ration:</strong> 18 customers missed Toor Dal & Sunflower Oil this cycle.
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '9px', color: '#5eead4', marginTop: '4px' }}>
                      10:30 PM <span style={{ color: '#38bdf8' }}>✓✓</span>
                    </div>
                  </div>

                  {/* 1-Click Simulate Push Button */}
                  <button
                    onClick={handleSimulatePush}
                    style={{
                      marginTop: '10px',
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#10b981',
                      color: '#022c22',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🔔</span> Simulate 10:30 PM WhatsApp Push
                  </button>
                </div>
              </div>

              {/* SECURITY / VOID WATCHDOG */}
              <div
                style={{
                  backgroundColor: '#0f172a',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛡️</span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
                      Security & Loss Prevention
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {currentData.voidCount}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700 }}>Pass</span>
              </div>
            </div>

            {/* EMBEDDED "ASK MY SUPERMARKET" AI DRAWER */}
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: 0,
                right: 0,
                backgroundColor: '#0f172a',
                borderTop: '2px solid #38bdf8',
                borderRadius: '20px 20px 0 0',
                transition: 'max-height 0.3s ease',
                maxHeight: isAiOpen ? '420px' : '48px',
                boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.7)',
                zIndex: 40,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Drawer Handle / Title */}
              <div
                onClick={() => setIsAiOpen(!isAiOpen)}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: '#1e293b',
                  borderRadius: '20px 20px 0 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✨</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8' }}>
                    Ask My Supermarket AI Copilot
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{isAiOpen ? '▼ Close' : '▲ Ask AI'}</span>
              </div>

              {/* Chat Body */}
              {isAiOpen && (
                <div
                  style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    flex: 1,
                    overflowY: 'auto',
                  }}
                >
                  {/* Preset Question Pills */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    <button
                      onClick={() => handleSendAi('What is my Basmati Rice gross margin?')}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#1e293b',
                        color: '#38bdf8',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Basmati Rice Margin?
                    </button>
                    <button
                      onClick={() => handleSendAi('Any cashier cash shortages today?')}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#1e293b',
                        color: '#34d399',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Cashier Shortages?
                    </button>
                    <button
                      onClick={() => handleSendAi('Pending supplier debit notes?')}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#1e293b',
                        color: '#fbbf24',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Debit Notes?
                    </button>
                  </div>

                  {/* Messages list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {aiChat.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                          backgroundColor: m.role === 'user' ? '#2563eb' : '#1e293b',
                          color: '#ffffff',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          lineHeight: '1.4',
                          maxWidth: '90%',
                        }}
                      >
                        <div>{m.text}</div>
                        {m.source && (
                          <div style={{ marginTop: '4px', fontSize: '9px', color: '#38bdf8', fontStyle: 'italic' }}>
                            {m.source}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Chat Input Box */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                    <input
                      type="text"
                      placeholder="Ask sales, stock, margin..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendAi();
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: '#ffffff',
                        fontSize: '11px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleSendAi()}
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Ask
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Home Indicator Bar */}
            <div
              style={{
                position: 'absolute',
                bottom: '6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '120px',
                height: '4px',
                backgroundColor: '#475569',
                borderRadius: '2px',
                zIndex: 50,
              }}
            />
          </div>
        </div>
      )}

      {/* MODE 2: MULTI-BRANCH CLOUD HO & SAAS VENDOR LICENSE PORTAL */}
      {viewMode === 'CLOUD_HO_PORTAL' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Onboarding Provisioning Card */}
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '14px',
              border: '1px solid #1e293b',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>
                  🚀 10-Second Supermarket Client License Onboarding
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Instantly provision new supermarket accounts, issue cryptographic license keys, and activate enterprise modules during sales demonstrations.
                </p>
              </div>
            </div>

            {provisionSuccessMsg && (
              <div
                style={{
                  backgroundColor: '#064e3b',
                  color: '#34d399',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '16px',
                  border: '1px solid #059669',
                }}
              >
                {provisionSuccessMsg}
              </div>
            )}

            <form onSubmit={handleProvisionSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Client / Owner Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meenakshi Hypermarket"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Store Name & Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meenakshi Fresh - Trichy Main"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Tenant Code (Uppercase)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MEENAKSHI_TRY"
                  value={newTenantCode}
                  onChange={(e) => setNewTenantCode(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Owner Mobile
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98412 34567"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  SaaS Plan Tier
                </label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE')}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="STARTER">Starter (Single Store / 2 Counters)</option>
                  <option value="PROFESSIONAL">Professional (3 Stores / 6 Counters)</option>
                  <option value="ENTERPRISE">Enterprise (10 Stores / 20 Counters + All Modules)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '9px 16px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Provision & Issue License
                </button>
              </div>
            </form>
          </div>

          {/* Active Supermarket Clients Management Table */}
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '14px',
              border: '1px solid #1e293b',
              padding: '20px',
              overflowX: 'auto',
            }}
          >
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                Client Tenancy & Module Feature Flags
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Click module badges to toggle feature access on/off in real-time across branch LAN gateways.
              </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px 12px' }}>Store & Tenant</th>
                  <th style={{ padding: '10px 12px' }}>License Key</th>
                  <th style={{ padding: '10px 12px' }}>Plan</th>
                  <th style={{ padding: '10px 12px' }}>Branches & Terminals</th>
                  <th style={{ padding: '10px 12px' }}>AMC Expiry</th>
                  <th style={{ padding: '10px 12px' }}>Module Entitlements (Toggleable)</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1e293b', color: '#cbd5e1' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>{c.storeName}</div>
                      <div style={{ fontSize: '10px', color: '#38bdf8' }}>Code: {c.tenantCode} • {c.primaryContact}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <code style={{ backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          {c.licenseKey}
                        </code>
                        <button
                          onClick={() => copyKey(c.licenseKey)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: copiedKey === c.licenseKey ? '#34d399' : '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          {copiedKey === c.licenseKey ? '✓' : '📋'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor:
                            c.planTier === 'ENTERPRISE'
                              ? '#3b0764'
                              : c.planTier === 'PROFESSIONAL'
                              ? '#082f49'
                              : '#1e293b',
                          color:
                            c.planTier === 'ENTERPRISE'
                              ? '#d8b4fe'
                              : c.planTier === 'PROFESSIONAL'
                              ? '#7dd3fc'
                              : '#cbd5e1',
                        }}
                      >
                        {c.planTier}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>{c.branchesUsed} / {c.maxBranches} Branches</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{c.terminalsUsed} / {c.maxTerminals} POS Terminals</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>{c.amcExpiryDate}</div>
                      <div style={{ fontSize: '10px', color: c.daysRemaining < 30 ? '#f87171' : '#34d399' }}>
                        {c.daysRemaining} days left
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <button
                          onClick={() => handleToggleModule(c.id, 'multiBranch')}
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: c.modules.multiBranch ? '#064e3b' : '#334155',
                            color: c.modules.multiBranch ? '#34d399' : '#94a3b8',
                          }}
                        >
                          Multi-Branch {c.modules.multiBranch ? '✓' : '✕'}
                        </button>
                        <button
                          onClick={() => handleToggleModule(c.id, 'aiCopilot')}
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: c.modules.aiCopilot ? '#064e3b' : '#334155',
                            color: c.modules.aiCopilot ? '#34d399' : '#94a3b8',
                          }}
                        >
                          AI Copilot {c.modules.aiCopilot ? '✓' : '✕'}
                        </button>
                        <button
                          onClick={() => handleToggleModule(c.id, 'tallyBridge')}
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: c.modules.tallyBridge ? '#064e3b' : '#334155',
                            color: c.modules.tallyBridge ? '#34d399' : '#94a3b8',
                          }}
                        >
                          Tally Prime {c.modules.tallyBridge ? '✓' : '✕'}
                        </button>
                        <button
                          onClick={() => handleToggleModule(c.id, 'hrPayroll')}
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: c.modules.hrPayroll ? '#064e3b' : '#334155',
                            color: c.modules.hrPayroll ? '#34d399' : '#94a3b8',
                          }}
                        >
                          HR Payroll {c.modules.hrPayroll ? '✓' : '✕'}
                        </button>
                        <button
                          onClick={() => handleToggleModule(c.id, 'whatsappCrm')}
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: c.modules.whatsappCrm ? '#064e3b' : '#334155',
                            color: c.modules.whatsappCrm ? '#34d399' : '#94a3b8',
                          }}
                        >
                          WhatsApp {c.modules.whatsappCrm ? '✓' : '✕'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: c.status === 'ACTIVE' ? '#064e3b' : '#78350f',
                          color: c.status === 'ACTIVE' ? '#34d399' : '#fbbf24',
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
