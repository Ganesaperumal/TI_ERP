import React, { useState } from 'react';

export const StockAuditAndExpiryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EXPIRY' | 'REFILL' | 'CYCLE_COUNT'>('EXPIRY');
  const [expiryDays, setExpiryDays] = useState<30 | 60 | 90>(30);
  const [clearanceApplied, setClearanceApplied] = useState<string | null>(null);

  const [cycleCountFrozen, setCycleCountFrozen] = useState(false);
  const [scannedCounts, setScannedCounts] = useState<{ [key: string]: number }>({
    'SKU-FMCG-001': 42,
    'SKU-PROD-002': 85.0,
  });
  const [auditApproved, setAuditApproved] = useState(false);

  const handleApplyClearance = (itemName: string, discount: number) => {
    setClearanceApplied(`Applied ${discount}% 1-click clearance discount to ${itemName}!`);
    setTimeout(() => setClearanceApplied(null), 3000);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#38bdf8' }}>Stock Audit, Expiry & Refill Hub</h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Near-expiry clearance, Godown-to-Shelf restocking, and live Rack cycle counting without closing the store
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('EXPIRY')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'EXPIRY' ? '#2563eb' : '#1e293b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Near-Expiry Clearance
          </button>
          <button
            onClick={() => setActiveTab('REFILL')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'REFILL' ? '#2563eb' : '#1e293b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Godown Refill Alerts
          </button>
          <button
            onClick={() => setActiveTab('CYCLE_COUNT')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'CYCLE_COUNT' ? '#2563eb' : '#1e293b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Live Cycle Counting
          </button>
        </div>
      </div>

      {clearanceApplied && (
        <div style={{ backgroundColor: '#065f46', color: '#6ee7b7', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
          ✓ {clearanceApplied}
        </div>
      )}

      {/* Tab A: Near-Expiry Clearance */}
      {activeTab === 'EXPIRY' && (
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#f1f5f9' }}>Expiring Batches Alert</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setExpiryDays(d as 30 | 60 | 90)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: expiryDays === d ? '#38bdf8' : '#0f172a',
                    color: expiryDays === d ? '#0f172a' : '#fff',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Within {d} Days
                </button>
              ))}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '12px' }}>Product & SKU</th>
                <th style={{ padding: '12px' }}>Batch Number</th>
                <th style={{ padding: '12px' }}>Expiry Date</th>
                <th style={{ padding: '12px' }}>On-Shelf Stock</th>
                <th style={{ padding: '12px' }}>Current Price</th>
                <th style={{ padding: '12px' }}>1-Click Clearance Action</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '12px' }}>
                  <b>Amul Butter Pasteurized 500g</b>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>SKU-DAIRY-001</div>
                </td>
                <td style={{ padding: '12px', color: '#f59e0b', fontFamily: 'monospace' }}>B-AMUL-NOV26</td>
                <td style={{ padding: '12px', color: '#ef4444', fontWeight: 'bold' }}>15/11/2026 (21 days left)</td>
                <td style={{ padding: '12px' }}>18 Packs</td>
                <td style={{ padding: '12px' }}>MRP ₹285 | Selling ₹275</td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => handleApplyClearance('Amul Butter 500g', 25)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#e11d48',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Apply 25% Off
                  </button>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '12px' }}>
                  <b>Farm Fresh Potato</b>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>SKU-PROD-002</div>
                </td>
                <td style={{ padding: '12px', color: '#f59e0b', fontFamily: 'monospace' }}>B-POTATO-TODAY</td>
                <td style={{ padding: '12px', color: '#f59e0b' }}>05/11/2026 (11 days left)</td>
                <td style={{ padding: '12px' }}>85.5 KG</td>
                <td style={{ padding: '12px' }}>MRP ₹40 | Selling ₹36</td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => handleApplyClearance('Farm Fresh Potato', 20)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#e11d48',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Apply 20% Off
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tab B: Godown Refill Alerts */}
      {activeTab === 'REFILL' && (
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#f1f5f9' }}>
            Shelf-Edge Low Stock Alerts (Refill from Godown)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '12px' }}>Item</th>
                <th style={{ padding: '12px' }}>Shop Floor Balance</th>
                <th style={{ padding: '12px' }}>Min Threshold</th>
                <th style={{ padding: '12px' }}>Godown Reserve</th>
                <th style={{ padding: '12px' }}>Recommended Restock</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '12px' }}>
                  <b>Parle-G Gold Glucose Biscuit 1kg</b>
                </td>
                <td style={{ padding: '12px', color: '#ef4444', fontWeight: 'bold' }}>4 Packs</td>
                <td style={{ padding: '12px' }}>20 Packs</td>
                <td style={{ padding: '12px', color: '#10b981', fontWeight: 'bold' }}>120 Packs</td>
                <td style={{ padding: '12px', color: '#38bdf8' }}>+24 Packs (1 Carton)</td>
                <td style={{ padding: '12px' }}>
                  <button
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#0284c7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Transfer to Floor
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tab C: Live Cycle Counting */}
      {activeTab === 'CYCLE_COUNT' && (
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#f1f5f9' }}>
                Rack-Wise Live Cycle Count (Audit Without Store Closure)
              </h3>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                Takes an instant snapshot of system stock while billing terminals remain 100% active.
              </p>
            </div>
            {!cycleCountFrozen ? (
              <button
                onClick={() => setCycleCountFrozen(true)}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  padding: '10px 18px',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                📸 Start Cycle Count & Freeze Snapshot
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold' }}>
                  ● Snapshot Frozen: CC-SESSION-001
                </span>
                <button
                  disabled={auditApproved}
                  onClick={() => setAuditApproved(true)}
                  style={{
                    backgroundColor: auditApproved ? '#334155' : '#16a34a',
                    color: '#fff',
                    padding: '10px 18px',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: auditApproved ? 'not-allowed' : 'pointer',
                  }}
                >
                  {auditApproved ? '✓ Audit Approved & Adjusted' : 'Approve & Adjust Stock'}
                </button>
              </div>
            )}
          </div>

          {cycleCountFrozen && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px' }}>Product</th>
                  <th style={{ padding: '12px' }}>Rack / Bin</th>
                  <th style={{ padding: '12px' }}>System Frozen Qty</th>
                  <th style={{ padding: '12px' }}>Scanned Physical Qty</th>
                  <th style={{ padding: '12px' }}>Variance</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '12px' }}>Parle-G Gold Biscuit 1kg</td>
                  <td style={{ padding: '12px' }}>FLOOR-RACK-A1</td>
                  <td style={{ padding: '12px' }}>45 Packs</td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="number"
                      value={scannedCounts['SKU-FMCG-001']}
                      onChange={(e) =>
                        setScannedCounts({ ...scannedCounts, 'SKU-FMCG-001': Number(e.target.value) })
                      }
                      style={{ width: '80px', padding: '6px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '12px', color: '#ef4444', fontWeight: 'bold' }}>-3 Packs (Shortage)</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: auditApproved ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                      {auditApproved ? 'ADJUSTED' : 'PENDING APPROVAL'}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '12px' }}>Farm Fresh Potato</td>
                  <td style={{ padding: '12px' }}>FLOOR-BIN-PROD</td>
                  <td style={{ padding: '12px' }}>85.5 KG</td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="number"
                      value={scannedCounts['SKU-PROD-002']}
                      onChange={(e) =>
                        setScannedCounts({ ...scannedCounts, 'SKU-PROD-002': Number(e.target.value) })
                      }
                      style={{ width: '80px', padding: '6px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '12px', color: '#10b981', fontWeight: 'bold' }}>-0.5 KG (Normal Loss)</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: auditApproved ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                      {auditApproved ? 'ADJUSTED' : 'PENDING APPROVAL'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
