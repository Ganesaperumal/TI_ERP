import React, { useState } from 'react';
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

type AppTab =
  | 'POS'
  | 'SHIFT_REGISTER'
  | 'GRN_ENTRY'
  | 'AUTO_REORDER'
  | 'SUPPLIERS_RETURNS'
  | 'PRODUCT_MASTER'
  | 'REPACKING'
  | 'STOCK_AUDIT'
  | 'DUAL_DISPLAY'
  | 'STORE_CONFIG';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('POS');

  const tabs: Array<{ id: AppTab; label: string }> = [
    { id: 'POS', label: '🛒 Cashier POS (F1-F12)' },
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
        {activeTab === 'POS' && <PosBillingScreen />}
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
    </div>
  );
};
