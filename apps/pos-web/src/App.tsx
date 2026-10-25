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
import { CrmLoyaltyAndKhataPage } from './features/crm/CrmLoyaltyAndKhataPage';
import { DeliveryAndQueueBusterPage } from './features/fulfillment/DeliveryAndQueueBusterPage';
import { FinanceGstAndTallyPage } from './features/accounting/FinanceGstAndTallyPage';
import { HrAttendanceAndPayrollPage } from './features/hr/HrAttendanceAndPayrollPage';
import { AiCopilotAndSyncPage } from './features/ai-sync/AiCopilotAndSyncPage';

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
  | 'STORE_CONFIG';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('POS');

  const tabs: Array<{ id: AppTab; label: string }> = [
    { id: 'POS', label: '🛒 Cashier POS (F1-F12)' },
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

  return (
    <div style={{ backgroundColor: '#090d16', minHeight: '100vh', color: '#f8fafc' }}>
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
            <h1 style={{ margin: 0, fontSize: '20px', color: '#38bdf8', letterSpacing: '-0.5px' }}>
              TI-ERP POS & RETAIL OS
            </h1>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Terminal: POS-01 | Branch: Flagship Hypermarket (Model B LAN)
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
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

      <main>
        {activeTab === 'POS' && <PosBillingScreen />}
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
    </div>
  );
};
