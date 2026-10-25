import React, { useState } from 'react';

export interface ReorderItemRow {
  productId: string;
  skuCode: string;
  productName: string;
  baseUom: string;
  currentStock: number;
  minStock: number;
  dailyVelocity: number;
  daysRemaining: number;
  suggestedQty: number;
  triggerReason: string;
  selected: boolean;
  bestSupplier: {
    id: string;
    name: string;
    phone: string;
    netCost: number;
    freeScheme: string;
    isLowest: boolean;
  };
  altSupplier?: {
    id: string;
    name: string;
    phone: string;
    netCost: number;
  };
}

const INITIAL_REORDER_ITEMS: ReorderItemRow[] = [
  {
    productId: 'p-101',
    skuCode: 'SKU-FMCG-PARLE',
    productName: 'Parle-G Gold Glucose Biscuit 1kg',
    baseUom: 'PACK',
    currentStock: 12,
    minStock: 25,
    dailyVelocity: 8.5,
    daysRemaining: 1.4,
    suggestedQty: 50,
    triggerReason: 'High Velocity (Stock runs out in 1.4 days)',
    selected: true,
    bestSupplier: {
      id: 'supp-1',
      name: 'Parle Regional Depo Ltd',
      phone: '+919876543210',
      netCost: 92.0,
      freeScheme: '20+1 Free',
      isLowest: true,
    },
    altSupplier: {
      id: 'supp-2',
      name: 'Sri Krishna Wholesale Traders',
      phone: '+919876543211',
      netCost: 96.5,
    },
  },
  {
    productId: 'p-102',
    skuCode: 'SKU-FMCG-SUGAR',
    productName: 'Madhur Pure & Hygienic Sugar 1kg',
    baseUom: 'PACK',
    currentStock: 18,
    minStock: 40,
    dailyVelocity: 14.0,
    daysRemaining: 1.3,
    suggestedQty: 100,
    triggerReason: 'Below Min Stock & High Run Rate',
    selected: true,
    bestSupplier: {
      id: 'supp-3',
      name: 'Shree Renuka Sugars Agency',
      phone: '+919876543212',
      netCost: 44.5,
      freeScheme: 'Flat 3% Cash Disc',
      isLowest: true,
    },
    altSupplier: {
      id: 'supp-2',
      name: 'Sri Krishna Wholesale Traders',
      phone: '+919876543211',
      netCost: 47.0,
    },
  },
  {
    productId: 'p-103',
    skuCode: 'SKU-OIL-01',
    productName: 'Fortune Sunlite Refined Sunflower Oil 1L',
    baseUom: 'POUCH',
    currentStock: 8,
    minStock: 20,
    dailyVelocity: 5.2,
    daysRemaining: 1.5,
    suggestedQty: 40,
    triggerReason: 'Stock runs out in 1.5 days',
    selected: true,
    bestSupplier: {
      id: 'supp-4',
      name: 'Adani Wilmar Direct Depot',
      phone: '+919876543213',
      netCost: 118.0,
      freeScheme: 'Free Unloading',
      isLowest: true,
    },
    altSupplier: {
      id: 'supp-2',
      name: 'Sri Krishna Wholesale Traders',
      phone: '+919876543211',
      netCost: 122.5,
    },
  },
];

export const AutoReorderAndPoPage: React.FC = () => {
  const [items, setItems] = useState<ReorderItemRow[]>(INITIAL_REORDER_ITEMS);
  const [activeSupplierId, setActiveSupplierId] = useState<string>('supp-1');
  const [poNotes, setPoNotes] = useState('Please dispatch today before 5 PM to Gate 2.');
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [targetPhone, setTargetPhone] = useState('');

  const toggleSelect = (productId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, selected: !i.selected } : i)),
    );
  };

  const selectedItems = items.filter((i) => i.selected);

  const handleGenerateWhatsAppPo = (supplierId: string) => {
    const suppItems = items.filter((i) => i.selected && i.bestSupplier.id === supplierId);
    if (suppItems.length === 0) {
      alert('Please select at least one item mapped to this supplier.');
      return;
    }

    const supp = suppItems[0].bestSupplier;
    setTargetPhone(supp.phone);

    const poNum = `PO-${Date.now().toString().slice(-6)}`;
    const dateStr = new Date().toISOString().slice(0, 10);

    const lines = suppItems.map((item, idx) => {
      const lineCost = item.suggestedQty * item.bestSupplier.netCost;
      return `${idx + 1}. *${item.productName}*\n   Qty: *${item.suggestedQty} ${item.baseUom}* @ ₹${item.bestSupplier.netCost.toFixed(2)} [Est: ₹${lineCost.toFixed(2)}]`;
    });

    const totalEst = suppItems.reduce((acc, i) => acc + i.suggestedQty * i.bestSupplier.netCost, 0);

    const msg = [
      `📦 *PURCHASE ORDER: ${poNum}*`,
      `🏢 *Store:* Flagship Hypermarket (TI Supermarket)`,
      `👤 *Supplier:* ${supp.name}`,
      `📅 *Date:* ${dateStr}`,
      `---------------------------------`,
      `*ORDER ITEMS:*`,
      ...lines,
      `---------------------------------`,
      `💰 *Estimated Total: ₹${totalEst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*`,
      `📝 *Note:* ${poNotes}`,
      `\nPlease confirm delivery date & attach invoice upon dispatch. Thank you!`,
    ].join('\n');

    setGeneratedMessage(msg);
    setWhatsAppModalOpen(true);
  };

  const handleOpenWhatsAppUrl = () => {
    const clean = targetPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(generatedMessage)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', margin: 0, color: '#38bdf8' }}>
            Smart Auto-Reorder & 1-Click WhatsApp Purchase Orders
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Velocity Run-Rate Engine + Lowest Historical Landed Cost Supplier Selector
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleGenerateWhatsAppPo(activeSupplierId)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>💬 Generate & Dispatch WhatsApp PO ({selectedItems.length} items)</span>
          </button>
        </div>
      </div>

      {/* Supplier Comparison Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>High-Velocity Critical Items</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444', marginTop: '4px' }}>
            {items.length} SKUs Running Out &lt; 2 Days
          </div>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Selected Order Units</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>
            {selectedItems.reduce((acc, i) => acc + i.suggestedQty, 0)} Units
          </div>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Estimated Total Order Value</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
            ₹{selectedItems.reduce((acc, i) => acc + i.suggestedQty * i.bestSupplier.netCost, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Reorder Suggestions Table */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflowX: 'auto', border: '1px solid #334155' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
              <th style={{ padding: '12px', width: '40px' }}>✓</th>
              <th style={{ padding: '12px' }}>Product & SKU</th>
              <th style={{ padding: '12px' }}>Stock vs Min</th>
              <th style={{ padding: '12px' }}>Daily Run Rate</th>
              <th style={{ padding: '12px', color: '#ef4444' }}>Days Left</th>
              <th style={{ padding: '12px', color: '#38bdf8' }}>Suggested Qty</th>
              <th style={{ padding: '12px', color: '#10b981' }}>Best Supplier (Lowest Cost)</th>
              <th style={{ padding: '12px', color: '#94a3b8' }}>Alternate Supplier</th>
              <th style={{ padding: '12px' }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.productId} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '12px' }}>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleSelect(item.productId)}
                    style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                  />
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{item.productName}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.skuCode} | {item.baseUom}</div>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{item.currentStock}</span>
                  <span style={{ color: '#64748b' }}> / {item.minStock} {item.baseUom}</span>
                </td>
                <td style={{ padding: '12px' }}>{item.dailyVelocity} {item.baseUom}/day</td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      backgroundColor: item.daysRemaining <= 1.5 ? '#7f1d1d' : '#854d0e',
                      color: item.daysRemaining <= 1.5 ? '#fca5a5' : '#fef08a',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                    }}
                  >
                    {item.daysRemaining} Days
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <input
                    type="number"
                    value={item.suggestedQty}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setItems((prev) =>
                        prev.map((i) => (i.productId === item.productId ? { ...i, suggestedQty: val } : i)),
                      );
                    }}
                    style={{
                      width: '70px',
                      padding: '6px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #38bdf8',
                      borderRadius: '4px',
                      color: '#38bdf8',
                      fontWeight: 'bold',
                      fontSize: '13px',
                    }}
                  />
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ color: '#10b981', fontWeight: 'bold' }}>{item.bestSupplier.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Net Landing: ₹{item.bestSupplier.netCost.toFixed(2)} | {item.bestSupplier.freeScheme}
                  </div>
                </td>
                <td style={{ padding: '12px' }}>
                  {item.altSupplier ? (
                    <div>
                      <div style={{ color: '#cbd5e1' }}>{item.altSupplier.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Net Landing: ₹{item.altSupplier.netCost.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#64748b' }}>None</span>
                  )}
                </td>
                <td style={{ padding: '12px', fontSize: '11px', color: '#cbd5e1' }}>
                  {item.triggerReason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* WhatsApp PO Dispatch Modal */}
      {whatsAppModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '28px',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              border: '1px solid #475569',
            }}
          >
            <h3 style={{ margin: '0 0 12px', color: '#10b981', fontSize: '20px' }}>
              💬 1-Click WhatsApp Purchase Order Dispatch
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>
              Review the structured WhatsApp PO payload below before sending to the distributor:
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Supplier WhatsApp Number:
              </label>
              <input
                type="text"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Message Preview:
              </label>
              <pre
                style={{
                  backgroundColor: '#0f172a',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  fontSize: '12px',
                  color: '#a7f3d0',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {generatedMessage}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setWhatsAppModalOpen(false)}
                style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={handleOpenWhatsAppUrl}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#25d366',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                🚀 Send on WhatsApp Web / Mobile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
