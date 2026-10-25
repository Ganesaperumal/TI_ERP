import React, { useState } from 'react';

export const RepackingStudioPage: React.FC = () => {
  const [bulkQty, setBulkQty] = useState(50);
  const [bulkCostPerKg, setBulkCostPerKg] = useState(42); // Rs. 2100 per 50kg sack
  const [retailPacks, setRetailPacks] = useState(49);
  const [wastageQty, setWastageQty] = useState(0.5);
  const [pkgCost, setPkgCost] = useState(120);
  const [retailMrp, setRetailMrp] = useState(65);
  const [retailSellingPrice, setRetailSellingPrice] = useState(58);
  const [printSuccess, setPrintSuccess] = useState<string | null>(null);

  // Landing cost formula: [(bulkQty * bulkCostPerKg) + pkgCost] / retailPacks
  const totalBulkCost = bulkQty * bulkCostPerKg;
  const totalProductionCost = totalBulkCost + pkgCost;
  const unitLandingCost = retailPacks > 0 ? totalProductionCost / retailPacks : 0;
  const grossMarginPerPack = retailSellingPrice - unitLandingCost;
  const grossMarginPct = retailSellingPrice > 0 ? (grossMarginPerPack / retailSellingPrice) * 100 : 0;

  const handleExecuteRepack = () => {
    setPrintSuccess(
      `Repacking Job Completed! Converted ${bulkQty}kg into ${retailPacks} retail packs. Dispatched ZPL print job for ${retailPacks} barcode stickers!`,
    );
    setTimeout(() => setPrintSuccess(null), 5000);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '80vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', color: '#38bdf8' }}>Bulk-to-Retail Repacking Studio</h2>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
          Break bulk wholesale sacks (50kg) into retail packs (500g/1kg), allocate packaging & wastage, and generate ZPL labels
        </p>
      </div>

      {printSuccess && (
        <div style={{ backgroundColor: '#065f46', color: '#6ee7b7', padding: '16px', borderRadius: '6px', marginBottom: '20px', fontWeight: 'bold' }}>
          ✓ {printSuccess}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Form Inputs */}
        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px' }}>
          <h3 style={{ color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: 0 }}>
            1. Select Bulk Parent Sack & Batch
          </h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
              Bulk Parent Item (Godown)
            </label>
            <select
              style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
            >
              <option>SKU-RICE-50KG — Sona Masoori Rice 50kg Sack (Batch: B-RICE-SACK-01, Avail: 2,500kg)</option>
              <option>SKU-TOOR-50KG — Premium Toor Dal 50kg Sack (Batch: B-TOOR-OCT26, Avail: 1,000kg)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Bulk Quantity Consumed (kg)
              </label>
              <input
                type="number"
                value={bulkQty}
                onChange={(e) => setBulkQty(Number(e.target.value))}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Wastage / Dust Loss (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={wastageQty}
                onChange={(e) => setWastageQty(Number(e.target.value))}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
              />
            </div>
          </div>

          <h3 style={{ color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: '24px' }}>
            2. Retail Child Pack Output & Packaging Cost
          </h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
              Target Retail Pack SKU
            </label>
            <select
              style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
            >
              <option>SKU-RICE-1KG — Sona Masoori Rice 1kg Retail Pouch</option>
              <option>SKU-RICE-500G — Sona Masoori Rice 500g Retail Pouch</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Packs Produced</label>
              <input
                type="number"
                value={retailPacks}
                onChange={(e) => setRetailPacks(Number(e.target.value))}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Packaging Pouch Cost (₹)</label>
              <input
                type="number"
                value={pkgCost}
                onChange={(e) => setPkgCost(Number(e.target.value))}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Selling Price (₹)</label>
              <input
                type="number"
                value={retailSellingPrice}
                onChange={(e) => setRetailSellingPrice(Number(e.target.value))}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>

        {/* Live Calculation & Sticker Print Preview */}
        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: 0 }}>
              Live Unit Landing Cost & Margin Math
            </h3>

            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Bulk Grain Cost ({bulkQty}kg @ ₹{bulkCostPerKg}/kg):</span>
                <span>₹{totalBulkCost.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Packaging Material Pouches:</span>
                <span>₹{pkgCost.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Total Production Cost:</span>
                <span style={{ fontWeight: 'bold' }}>₹{totalProductionCost.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#38bdf8', fontWeight: 'bold', marginTop: '12px' }}>
                <span>Calculated Unit Landing Cost:</span>
                <span>₹{unitLandingCost.toFixed(2)} / pack</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Gross Margin / Pack</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>₹{grossMarginPerPack.toFixed(2)}</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Gross Profit Margin</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{grossMarginPct.toFixed(1)}%</div>
              </div>
            </div>

            {/* Sticker Visual Simulation */}
            <div style={{ border: '1px dashed #64748b', padding: '14px', borderRadius: '6px', backgroundColor: '#020617', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}>ZPL 50x25mm Label Preview</div>
              <div style={{ fontWeight: 'bold', marginTop: '6px', color: '#fff' }}>TI SUPERMARKET</div>
              <div style={{ fontSize: '12px', color: '#38bdf8' }}>Sona Masoori Rice 1kg Retail Pouch</div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Net Wt: 1.000 kg | Exp: 24/04/2027</div>
              <div style={{ margin: '8px 0', fontFamily: 'monospace', letterSpacing: '2px', color: '#f59e0b', fontSize: '13px' }}>
                |||| | ||||| |||| ||| ||||
              </div>
              <div style={{ fontSize: '12px' }}>
                <span style={{ textDecoration: 'line-through', color: '#64748b' }}>MRP ₹{retailMrp}</span>{' '}
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>OUR PRICE ₹{retailSellingPrice}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleExecuteRepack}
            style={{
              marginTop: '20px',
              backgroundColor: '#16a34a',
              color: '#fff',
              padding: '14px',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            ✓ Convert & Print {retailPacks} Barcode Stickers
          </button>
        </div>
      </div>
    </div>
  );
};
