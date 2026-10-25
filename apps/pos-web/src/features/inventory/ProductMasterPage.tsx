import React, { useState } from 'react';
import { ProductType } from '@ti-erp/shared-types';

interface DemoProduct {
  id: string;
  sku: string;
  nameEn: string;
  nameRegional: string;
  plu: string;
  type: ProductType;
  baseUom: string;
  barcodes: string[];
  stockShopFloor: number;
  stockGodown: number;
  stockDamaged: number;
  mrp: number;
  sellingPrice: number;
}

const INITIAL_PRODUCTS: DemoProduct[] = [
  {
    id: '1',
    sku: 'SKU-FMCG-001',
    nameEn: 'Parle-G Gold Glucose Biscuit 1kg',
    nameRegional: 'பார்லே-ஜி பிஸ்கட் 1கிலோ',
    plu: '101',
    type: ProductType.STANDARD_FMCG,
    baseUom: 'PACK',
    barcodes: ['8901719114138', 'PARLEG1KG'],
    stockShopFloor: 45,
    stockGodown: 120,
    stockDamaged: 2,
    mrp: 120,
    sellingPrice: 110,
  },
  {
    id: '2',
    sku: 'SKU-PROD-002',
    nameEn: 'Farm Fresh Potato',
    nameRegional: 'உருளைக்கிழங்கு',
    plu: '201',
    type: ProductType.WEIGHED_LOOSE,
    baseUom: 'KG',
    barcodes: ['2000201'],
    stockShopFloor: 85.5,
    stockGodown: 350.0,
    stockDamaged: 5.0,
    mrp: 40,
    sellingPrice: 36,
  },
  {
    id: '3',
    sku: 'SKU-RICE-50KG',
    nameEn: 'Sona Masoori Rice 50kg Sack (Bulk)',
    nameRegional: 'சோனா மசூரி அரிசி 50கிலோ மூட்டை',
    plu: '301',
    type: ProductType.REPACKED_BULK,
    baseUom: 'KG',
    barcodes: ['8905500001'],
    stockShopFloor: 0,
    stockGodown: 2500,
    stockDamaged: 0,
    mrp: 2600,
    sellingPrice: 2450,
  },
  {
    id: '4',
    sku: 'SKU-COMBO-001',
    nameEn: 'Healthy Breakfast Combo Pack',
    nameRegional: 'காலை உணவு காம்போ',
    plu: '401',
    type: ProductType.COMBO_KIT,
    baseUom: 'KIT',
    barcodes: ['890990001'],
    stockShopFloor: 12,
    stockGodown: 30,
    stockDamaged: 0,
    mrp: 350,
    sellingPrice: 299,
  },
  {
    id: '5',
    sku: 'SKU-POLO-SHIRT',
    nameEn: 'TI Classic Cotton Polo T-Shirt',
    nameRegional: 'டி-சர்ட்',
    plu: '501',
    type: ProductType.VARIANT_MATRIX,
    baseUom: 'PCS',
    barcodes: ['890700101', '890700102', '890700103'],
    stockShopFloor: 28,
    stockGodown: 60,
    stockDamaged: 0,
    mrp: 499,
    sellingPrice: 399,
  },
];

export const ProductMasterPage: React.FC = () => {
  const [products] = useState<DemoProduct[]>(INITIAL_PRODUCTS);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);

  const filtered = products.filter(
    (p) =>
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.plu.includes(search) ||
      p.barcodes.some((b) => b.includes(search)),
  );

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#38bdf8' }}>Unified Product Master & Multi-UOM</h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
            All 5 Product Classifications, Barcode Aliases & Live Bin Stock Breakdown
          </p>
        </div>
        <input
          type="text"
          placeholder="Search by SKU, Name, 3-digit PLU or Barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '360px',
            padding: '10px 14px',
            backgroundColor: '#1e293b',
            color: '#fff',
            border: '1px solid #475569',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedProduct ? '2fr 1fr' : '1fr', gap: '20px' }}>
        {/* Product Table */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '12px 16px' }}>SKU & Name</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>PLU / Barcodes</th>
                <th style={{ padding: '12px 16px' }}>Shop Floor</th>
                <th style={{ padding: '12px 16px' }}>Godown</th>
                <th style={{ padding: '12px 16px' }}>MRP / Selling</th>
                <th style={{ padding: '12px 16px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid #334155',
                    backgroundColor: selectedProduct?.id === item.id ? '#1e293b' : 'transparent',
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{item.nameEn}</div>
                    <div style={{ fontSize: '11px', color: '#38bdf8' }}>{item.nameRegional}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{item.sku}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        backgroundColor: '#334155',
                        color: '#38bdf8',
                      }}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>PLU: {item.plu}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.barcodes.join(', ')}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 'bold' }}>
                    {item.stockShopFloor} {item.baseUom}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                    {item.stockGodown} {item.baseUom}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '11px' }}>
                      ₹{item.mrp.toFixed(2)}
                    </div>
                    <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>₹{item.sellingPrice.toFixed(2)}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => setSelectedProduct(item)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      View Batches
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Batch & Bin Drawer */}
        {selectedProduct && (
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#38bdf8' }}>Batch & Bin Inventory Breakdown</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>{selectedProduct.nameEn}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>SKU: {selectedProduct.sku}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Shop Floor</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{selectedProduct.stockShopFloor}</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Godown</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>{selectedProduct.stockGodown}</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Damaged</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>{selectedProduct.stockDamaged}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '13px', color: '#f1f5f9', marginBottom: '8px' }}>Active MRP Batches on Shelf</h4>
            <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Batch: B-2026-OCT</span>
                <span style={{ color: '#10b981' }}>Exp: 04/2027</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>MRP: ₹{selectedProduct.mrp}</span>
                <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>Selling: ₹{selectedProduct.sellingPrice}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
