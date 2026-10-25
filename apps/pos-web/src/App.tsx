import React, { useState, useEffect } from 'react';
import { StoreConfigPage } from './features/settings/StoreConfigPage';
import { ProductMasterPage } from './features/inventory/ProductMasterPage';
import { RepackingStudioPage } from './features/inventory/RepackingStudioPage';
import { StockAuditAndExpiryPage } from './features/inventory/StockAuditAndExpiryPage';
import { GrnEntryPage } from './features/procurement/GrnEntryPage';
import { AutoReorderAndPoPage } from './features/procurement/AutoReorderAndPoPage';
import { SuppliersAndReturnsPage } from './features/procurement/SuppliersAndReturnsPage';
import { PosBillingScreen } from './features/pos/PosBillingScreen';
import { CustomerDualDisplayPage } from './features/pos/CustomerDualDisplayPage';
import { ShiftAndZReportPage } from './features/pos/ShiftAndZReportPage';
import { CrmLoyaltyAndKhataPage } from './features/crm/CrmLoyaltyAndKhataPage';
import { DeliveryAndQueueBusterPage } from './features/fulfillment/DeliveryAndQueueBusterPage';
import { FinanceGstAndTallyPage } from './features/accounting/FinanceGstAndTallyPage';
import { HrAttendanceAndPayrollPage } from './features/hr/HrAttendanceAndPayrollPage';
import { AiCopilotAndSyncPage } from './features/ai-sync/AiCopilotAndSyncPage';
import { OwnerMobileAndCloudPreviewPage } from './features/pitch-demo/OwnerMobileAndCloudPreviewPage';
import { posApiClient } from './lib/api-client';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type AppTab =
  | 'POS'
  | 'AI_SYNC'
  | 'CRM_LOYALTY'
  | 'DELIVERY_MPOS'
  | 'FINANCE_GST'
  | 'HR_PAYROLL'
  | 'SHIFT_REGISTER'
  | 'GRN_ENTRY'
  | 'AUTO_REORDER'
  | 'SUPPLIERS_RETURNS'
  | 'PRODUCT_MASTER'
  | 'REPACKING'
  | 'STOCK_AUDIT'
  | 'DUAL_DISPLAY'
  | 'STORE_CONFIG'
  | 'OWNER_CLOUD_PREVIEW';

interface PitchStep {
  step: number;
  id: AppTab;
  title: string;
  badge: string;
  talkingPoint: string;
}

const PITCH_STEPS: PitchStep[] = [
  {
    step: 1,
    id: 'POS',
    title: '1. 3-Sec POS & Scale Barcode',
    badge: 'Hardware & Speed',
    talkingPoint: 'Sub-second keyboard billing (F1-F12), weighing scale barcode prefix 99, LAN hold/recall & dual display.',
  },
  {
    step: 2,
    id: 'GRN_ENTRY',
    title: '2. AI Bill OCR & Margin Guardrail',
    badge: 'Zero Manual Entry',
    talkingPoint: 'AI bill OCR extracts supplier lines, calculates Net Landing Cost, and prevents unviable selling prices.',
  },
  {
    step: 3,
    id: 'REPACKING',
    title: '3. 50kg->1kg Repack & 2-Up Labels',
    badge: 'Normalized Costing',
    talkingPoint: 'Zero unit cost inflation (₹45.38/pouch, +21.8% margin), 2-up barcode printing & automatic stock conversion.',
  },
  {
    step: 4,
    id: 'CRM_LOYALTY',
    title: '4. Khata WhatsApp & Missing Ration',
    badge: 'Zero Bad Debt',
    talkingPoint: 'Customer OTP redemption, automated WhatsApp Khata payment links, and missing monthly ration basket discovery.',
  },
  {
    step: 5,
    id: 'FINANCE_GST',
    title: '5. GSTR-2B ITC Risk & Tally XML',
    badge: 'Zero Tax Leakage',
    talkingPoint: 'Reconcile supplier GSTR-2B against GRNs, prevent ITC leakage, and 1-click XML export to Tally Prime double-entry.',
  },
  {
    step: 6,
    id: 'HR_PAYROLL',
    title: '6. Cashier Shortage->Payroll Link',
    badge: 'Loss Prevention',
    talkingPoint: 'Cashier shift shortages automatically link to biometric monthly salary deductions without manual HR reconciliation.',
  },
  {
    step: 7,
    id: 'OWNER_CLOUD_PREVIEW',
    title: '7. Owner Mobile App & 10:30PM WhatsApp',
    badge: 'Executive Command',
    talkingPoint: 'Live smartphone pulse, 10:30 PM automated WhatsApp closing report push, and SaaS instant client provisioning.',
  },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('POS');
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // Pitch Mode & Guided Tour State
  const [pitchModeActive, setPitchModeActive] = useState<boolean>(true);
  const [activePitchIndex, setActivePitchIndex] = useState<number>(0);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    posApiClient.checkHealth().then((res) => {
      setBackendConnected(res.connected);
    });

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

  const tabs: Array<{ id: AppTab; label: string }> = [
    { id: 'POS', label: '🛒 Cashier POS (F1-F12)' },
    { id: 'OWNER_CLOUD_PREVIEW', label: '📱 Owner Mobile & Cloud PWA' },
    { id: 'AI_SYNC', label: '✨ AI Copilot & Sync' },
    { id: 'CRM_LOYALTY', label: '👑 CRM & Khata' },
    { id: 'DELIVERY_MPOS', label: '📦 Delivery & mPOS' },
    { id: 'FINANCE_GST', label: '📊 Finance, GST & Tally' },
    { id: 'HR_PAYROLL', label: '👥 HR & Payroll' },
    { id: 'SHIFT_REGISTER', label: '🔒 Register & Z-Report' },
    { id: 'GRN_ENTRY', label: '⚡ Smart GRN & Costing' },
    { id: 'AUTO_REORDER', label: '🤖 Auto-Reorder & PO' },
    { id: 'SUPPLIERS_RETURNS', label: '🤝 Suppliers & Debits' },
    { id: 'PRODUCT_MASTER', label: 'Product Master' },
    { id: 'REPACKING', label: 'Repacking Studio' },
    { id: 'STOCK_AUDIT', label: 'Audit & Expiry' },
    { id: 'DUAL_DISPLAY', label: 'Dual Display' },
    { id: 'STORE_CONFIG', label: 'Store Settings' },
  ];

  const handleSelectPitchStep = (idx: number) => {
    setActivePitchIndex(idx);
    setActiveTab(PITCH_STEPS[idx].id);
  };

  const handleNextPitchStep = () => {
    const nextIdx = (activePitchIndex + 1) % PITCH_STEPS.length;
    handleSelectPitchStep(nextIdx);
  };

  const handlePrevPitchStep = () => {
    const prevIdx = (activePitchIndex - 1 + PITCH_STEPS.length) % PITCH_STEPS.length;
    handleSelectPitchStep(prevIdx);
  };

  const currentPitch = PITCH_STEPS[activePitchIndex];

  return (
    <div style={{ backgroundColor: '#090d16', minHeight: '100vh', color: '#f8fafc' }}>
      {/* Top Application Header */}
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          padding: '12px 24px',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#38bdf8', letterSpacing: '-0.5px', fontWeight: 900 }}>
              TI-ERP POS & RETAIL OS
            </h1>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Terminal: POS-01 | Branch: Flagship Hypermarket (Model B LAN)
            </div>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 'bold',
              backgroundColor: backendConnected ? '#064e3b' : '#78350f',
              color: backendConnected ? '#34d399' : '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: backendConnected ? '#10b981' : '#f59e0b',
              }}
            />
            {backendConnected ? '🟢 API Online (Port 3000)' : '🟡 Offline Demo Mode (Mock Active)'}
          </span>
        </div>

        {/* Header Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Client Pitch Mode Toggle */}
          <button
            onClick={() => setPitchModeActive(!pitchModeActive)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: pitchModeActive ? '#78350f' : '#1e293b',
              color: pitchModeActive ? '#fef08a' : '#cbd5e1',
              border: `1px solid ${pitchModeActive ? '#eab308' : '#334155'}`,
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: pitchModeActive ? '0 0 12px rgba(234, 179, 8, 0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🎯</span>
            <span>Client Pitch Mode: {pitchModeActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* Install PWA Button */}
          <button
            onClick={handleInstallClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: isInstalled ? '#1e293b' : '#0284c7',
              color: '#ffffff',
              border: `1px solid ${isInstalled ? '#334155' : '#38bdf8'}`,
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: isInstalled ? 'none' : '0 2px 8px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.2s ease',
            }}
            title="Install TI-ERP as a standalone desktop or mobile Progressive Web App"
          >
            <span>{isInstalled ? '✅ PWA Installed' : '📲 Install App'}</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', width: '100%', marginTop: '6px' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                const stepIdx = PITCH_STEPS.findIndex((s) => s.id === t.id);
                if (stepIdx !== -1) setActivePitchIndex(stepIdx);
              }}
              style={{
                padding: '7px 12px',
                backgroundColor: activeTab === t.id ? '#2563eb' : '#1e293b',
                color: activeTab === t.id ? '#ffffff' : '#94a3b8',
                border: '1px solid',
                borderColor: activeTab === t.id ? '#3b82f6' : '#334155',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: activeTab === t.id ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* 7-STEP EXECUTIVE SALES PITCH RIBBON (WHEN ACTIVE) */}
      {pitchModeActive && (
        <section
          style={{
            backgroundColor: '#0a0f1d',
            borderBottom: '2px solid #eab308',
            padding: '12px 24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {/* Pitch Steps Navigator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎯</span>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#fef08a', textTransform: 'uppercase', letterSpacing: '1px' }}>
                7-Step Executive Sales Tour:
              </span>
            </div>

            {/* Stepper Buttons Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1, justifyContent: 'center' }}>
              {PITCH_STEPS.map((s, idx) => (
                <button
                  key={s.step}
                  onClick={() => handleSelectPitchStep(idx)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: activePitchIndex === idx ? 800 : 600,
                    backgroundColor: activePitchIndex === idx ? '#eab308' : '#1e293b',
                    color: activePitchIndex === idx ? '#0f172a' : '#cbd5e1',
                    border: `1px solid ${activePitchIndex === idx ? '#facc15' : '#334155'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: activePitchIndex === idx ? '0 0 10px rgba(234, 179, 8, 0.5)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{s.title}</span>
                </button>
              ))}
            </div>

            {/* Next / Prev Step Controls */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handlePrevPitchStep}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⬅ Prev
              </button>
              <button
                onClick={handleNextPitchStep}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Next ➡
              </button>
            </div>
          </div>

          {/* Current Step Pitch Talking Point Banner */}
          <div
            style={{
              backgroundColor: '#131d33',
              borderRadius: '10px',
              padding: '10px 16px',
              border: '1px solid #1e3a8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#78350f',
                  color: '#fef08a',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                Step {currentPitch.step} of 7 • {currentPitch.badge}
              </span>
              <span style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600 }}>
                💡 <strong>Owner Pitch Talking Point:</strong> {currentPitch.talkingPoint}
              </span>
            </div>

            <button
              onClick={() => setActiveTab(currentPitch.id)}
              style={{
                backgroundColor: '#38bdf8',
                color: '#0f172a',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Open Screen ↗
            </button>
          </div>
        </section>
      )}

      {/* Main Tab Views */}
      <main>
        {activeTab === 'POS' && <PosBillingScreen />}
        {activeTab === 'OWNER_CLOUD_PREVIEW' && <OwnerMobileAndCloudPreviewPage />}
        {activeTab === 'AI_SYNC' && <AiCopilotAndSyncPage />}
        {activeTab === 'CRM_LOYALTY' && <CrmLoyaltyAndKhataPage />}
        {activeTab === 'DELIVERY_MPOS' && <DeliveryAndQueueBusterPage />}
        {activeTab === 'FINANCE_GST' && <FinanceGstAndTallyPage />}
        {activeTab === 'HR_PAYROLL' && <HrAttendanceAndPayrollPage />}
        {activeTab === 'SHIFT_REGISTER' && <ShiftAndZReportPage />}
        {activeTab === 'DUAL_DISPLAY' && <CustomerDualDisplayPage />}
        {activeTab === 'GRN_ENTRY' && <GrnEntryPage />}
        {activeTab === 'AUTO_REORDER' && <AutoReorderAndPoPage />}
        {activeTab === 'SUPPLIERS_RETURNS' && <SuppliersAndReturnsPage />}
        {activeTab === 'PRODUCT_MASTER' && <ProductMasterPage />}
        {activeTab === 'REPACKING' && <RepackingStudioPage />}
        {activeTab === 'STOCK_AUDIT' && <StockAuditAndExpiryPage />}
        {activeTab === 'STORE_CONFIG' && <StoreConfigPage />}
      </main>

      {/* PWA INSTALL GUIDE MODAL */}
      {showInstallGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
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
                  Install TI-ERP POS as Native App
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
              TI-ERP POS features built-in offline Service Worker caching. Once loaded, you can install it on your laptop or tablet and run billing or client demonstrations even in 100% airplane mode!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #38bdf8' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                  💻 Chrome / Edge / Desktop Brave
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                  Click the <strong>Install</strong> icon on the right side of the URL address bar, or click browser menu (<strong>⋮</strong>) &rarr; <strong>Install TI-ERP Supermarket POS</strong>.
                </div>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #34d399' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
                  📱 Apple iPad / iPhone (Safari)
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                  Tap the <strong>Share</strong> button (box with upward arrow <span style={{ fontWeight: 'bold' }}>⎋</span>) &rarr; Scroll down and tap <strong>"Add to Home Screen"</strong>.
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
};
