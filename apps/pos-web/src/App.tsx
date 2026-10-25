import React, { useState } from 'react';
import { DEFAULT_STORE_CONFIG } from '@ti-erp/shared-types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'POS' | 'DUAL_DISPLAY'>('POS');
  const shortcuts = DEFAULT_STORE_CONFIG.keyboardShortcuts;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#38bdf8' }}>TI-ERP POS Terminal [POS-01]</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>Model B Local LAN Mode | Offline First</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('POS')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'POS' ? '#2563eb' : '#1e293b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Cashier POS
          </button>
          <button
            onClick={() => setActiveTab('DUAL_DISPLAY')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'DUAL_DISPLAY' ? '#2563eb' : '#1e293b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Customer Dual Display
          </button>
        </div>
      </header>

      {activeTab === 'POS' ? (
        <main style={{ marginTop: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            <section style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '18px', marginTop: 0, color: '#f1f5f9' }}>Quick Item Entry & Scanner Hook</h2>
              <input
                type="text"
                placeholder="Scan Barcode (EAN-13) or Enter 3-digit PLU..."
                autoFocus
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px',
                  fontSize: '16px',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                }}
              />
              <div style={{ marginTop: '16px', color: '#94a3b8', fontSize: '13px' }}>
                Cart is currently empty. Ready to scan.
              </div>
            </section>

            <section style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '18px', marginTop: 0, color: '#f1f5f9' }}>Hotkeys (F1 - F12)</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', lineHeight: '2' }}>
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
        </main>
      ) : (
        <main style={{ marginTop: '24px', textAlign: 'center', backgroundColor: '#1e293b', padding: '40px', borderRadius: '8px' }}>
          <h2 style={{ color: '#38bdf8', fontSize: '28px' }}>Welcome to TI Supermarket</h2>
          <p style={{ color: '#94a3b8', fontSize: '18px' }}>Customer Dual Display Screen</p>
          <div style={{ margin: '30px auto', maxWidth: '300px', backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px dashed #38bdf8' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>Dynamic Bharat QR / UPI</div>
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontWeight: 'bold' }}>
              [ UPI QR CODE ]
            </div>
            <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold' }}>Ready for Customer Scan</div>
          </div>
        </main>
      )}
    </div>
  );
};
