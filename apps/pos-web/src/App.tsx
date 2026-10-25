import React, { useState } from 'react';
import { DEFAULT_STORE_CONFIG } from '@ti-erp/shared-types';
import { StoreConfigPage } from './features/settings/StoreConfigPage';
import { ProductMasterPage } from './features/inventory/ProductMasterPage';
import { RepackingStudioPage } from './features/inventory/RepackingStudioPage';
import { StockAuditAndExpiryPage } from './features/inventory/StockAuditAndExpiryPage';
import { GrnEntryPage } from './features/procurement/GrnEntryPage';
import { AutoReorderAndPoPage } from './features/procurement/AutoReorderAndPoPage';
import { SuppliersAndReturnsPage } from './features/procurement/SuppliersAndReturnsPage';

type AppTab =
  | 'POS'
  | 'DUAL_DISPLAY'
  | 'PRODUCT_MASTER'
  | 'REPACKING'
  | 'STOCK_AUDIT'
  | 'GRN_ENTRY'
  | 'AUTO_REORDER'
  | 'SUPPLIERS_RETURNS'
  | 'STORE_CONFIG';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('POS');
  const shortcuts = DEFAULT_STORE_CONFIG.keyboardShortcuts;

  const tabs: Array<{ id: AppTab; label: string }> = [
    { id: 'POS', label: 'Cashier POS (F1-F12)' },
    { id: 'GRN_ENTRY', label: '⚡ Smart GRN & Costing' },
    { id: 'AUTO_REORDER', label: '🤖 Auto-Reorder & PO' },
    { id: 'SUPPLIERS_RETURNS', label: '🤝 Suppliers & Debits' },
    { id: 'PRODUCT_MASTER', label: 'Product Master' },
    { id: 'REPACKING', label: 'Repacking Studio' },
    { id: 'STOCK_AUDIT', label: 'Audit & Expiry' },
    { id: 'DUAL_DISPLAY', label: 'Dual Display' },
    { id: 'STORE_CONFIG', label: 'Store Settings' },
  ];

  return (
    <div style={{ backgroundColor: '#090d16', minHeight: '100vh', color: '#f8fafc' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          padding: '12px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#38bdf8', letterSpacing: '-0.5px' }}>
              TI-ERP POS & RETAIL OS
            </h1>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Terminal: POS-01 | Branch: Flagship Hypermarket (Model B LAN)
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '6px' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 14px',
                backgroundColor: activeTab === t.id ? '#2563eb' : '#1e293b',
                color: activeTab === t.id ? '#ffffff' : '#94a3b8',
                border: '1px solid',
                borderColor: activeTab === t.id ? '#3b82f6' : '#334155',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: activeTab === t.id ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {activeTab === 'POS' && (
          <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '20px' }}>
              <section style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '18px', marginTop: 0, color: '#f1f5f9' }}>
                  Ultra-Fast Barcode, Scale & 3-Digit PLU Entry
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Scan Barcode / Scale Sticker (Prefix 20) or Enter 3-digit PLU..."
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '14px',
                      fontSize: '16px',
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                    }}
                  />
                  <button
                    style={{
                      padding: '0 20px',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    Enter [F2]
                  </button>
                </div>
                <div style={{ marginTop: '20px', padding: '40px 20px', textAlign: 'center', border: '1px dashed #334155', borderRadius: '6px', color: '#64748b' }}>
                  Cart is currently empty. Ready for continuous high-speed scanning.
                </div>
              </section>

              <section style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '16px', marginTop: 0, color: '#38bdf8' }}>Function Key Map (F1 - F12)</h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', lineHeight: '2.2' }}>
                  <li><b style={{ color: '#38bdf8' }}>F1:</b> {shortcuts.f1}</li>
                  <li><b style={{ color: '#38bdf8' }}>F2:</b> {shortcuts.f2}</li>
                  <li><b style={{ color: '#38bdf8' }}>F3:</b> {shortcuts.f3}</li>
                  <li><b style={{ color: '#38bdf8' }}>F4:</b> {shortcuts.f4}</li>
                  <li><b style={{ color: '#38bdf8' }}>F5:</b> {shortcuts.f5}</li>
                  <li><b style={{ color: '#38bdf8' }}>F6:</b> {shortcuts.f6}</li>
                  <li><b style={{ color: '#38bdf8' }}>F7:</b> {shortcuts.f7}</li>
                  <li><b style={{ color: '#38bdf8' }}>F8:</b> {shortcuts.f8}</li>
                  <li><b style={{ color: '#38bdf8' }}>F9:</b> {shortcuts.f9}</li>
                  <li><b style={{ color: '#38bdf8' }}>F10:</b> {shortcuts.f10}</li>
                  <li><b style={{ color: '#38bdf8' }}>F11:</b> {shortcuts.f11}</li>
                  <li><b style={{ color: '#38bdf8' }}>F12:</b> {shortcuts.f12}</li>
                </ul>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'DUAL_DISPLAY' && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1e293b', padding: '40px', borderRadius: '12px' }}>
              <h2 style={{ color: '#38bdf8', fontSize: '28px', margin: 0 }}>Welcome to TI Supermarket</h2>
              <p style={{ color: '#94a3b8', fontSize: '16px', margin: '8px 0 24px' }}>Customer Secondary Display Screen</p>
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '8px', border: '1px dashed #38bdf8' }}>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>Dynamic Bharat QR / Instant UPI Settlement</div>
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontWeight: 'bold', fontSize: '20px' }}>
                  [ DYNAMIC UPI QR CODE ]
                </div>
                <div style={{ color: '#10b981', fontWeight: 'bold' }}>Scan with Any UPI App to Pay</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'GRN_ENTRY' && <GrnEntryPage />}
        {activeTab === 'AUTO_REORDER' && <AutoReorderAndPoPage />}
        {activeTab === 'SUPPLIERS_RETURNS' && <SuppliersAndReturnsPage />}
        {activeTab === 'PRODUCT_MASTER' && <ProductMasterPage />}
        {activeTab === 'REPACKING' && <RepackingStudioPage />}
        {activeTab === 'STOCK_AUDIT' && <StockAuditAndExpiryPage />}
        {activeTab === 'STORE_CONFIG' && <StoreConfigPage />}
      </main>
    </div>
  );
};
