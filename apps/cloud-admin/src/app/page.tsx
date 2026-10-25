import React from 'react';
import { TopologyMode } from '@ti-erp/shared-types';

export default function CloudAdminHome() {
  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ borderBottom: '1px solid #1e293b', paddingBottom: '20px', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', color: '#60a5fa', margin: 0 }}>TI-ERP Cloud Command Center</h1>
        <p style={{ color: '#94a3b8', margin: '8px 0 0' }}>Multi-Branch Head Office, Master Catalog & SaaS Governance</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: '#131b2e', padding: '24px', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <h3 style={{ color: '#93c5fd', margin: '0 0 10px' }}>Active Branches</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff' }}>1 Online</div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0' }}>Mode: {TopologyMode.SINGLE_STORE}</p>
        </div>

        <div style={{ backgroundColor: '#131b2e', padding: '24px', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <h3 style={{ color: '#93c5fd', margin: '0 0 10px' }}>LAN Sync Queue</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>Healthy</div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0' }}>0 Conflicts / 0 Pending Failures</p>
        </div>

        <div style={{ backgroundColor: '#131b2e', padding: '24px', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <h3 style={{ color: '#93c5fd', margin: '0 0 10px' }}>Master Catalog</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff' }}>50,000+ SKUs</div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0' }}>Indian FMCG & Weighed Produce Ready</p>
        </div>

        <div style={{ backgroundColor: '#131b2e', padding: '24px', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <h3 style={{ color: '#93c5fd', margin: '0 0 10px' }}>BYOK AI Provider</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>Gemini 1.5</div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0' }}>Invoice OCR & POS Intelligence Active</p>
        </div>
      </section>
    </div>
  );
}
