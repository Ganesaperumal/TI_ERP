import React, { useState } from 'react';

export const CustomerDualDisplayPage: React.FC = () => {
  const [items] = useState([
    { name: 'Parle-G Gold Glucose Biscuit 1kg', qty: 2, mrp: 120, price: 110, total: 220, saved: 20 },
    { name: 'Surf Excel Quick Wash Detergent 1kg', qty: 1, mrp: 180, price: 155, total: 155, saved: 25 },
    { name: 'Farm Fresh Potatoes (Loose 1.25kg)', qty: 1, mrp: 50, price: 45, total: 45, saved: 5 },
  ]);

  const totalMrp = items.reduce((acc, i) => acc + i.mrp * i.qty, 0);
  const totalDue = items.reduce((acc, i) => acc + i.total, 0);
  const totalSaved = items.reduce((acc, i) => acc + i.saved, 0);

  return (
    <div style={{ padding: '30px', minHeight: '90vh', backgroundColor: '#090d16', color: '#f8fafc' }}>
      {/* Dual Display Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#38bdf8', letterSpacing: '-0.5px' }}>
            TI SUPERMARKET
          </h1>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            Flagship Store | Counter 01 Customer Display
          </div>
        </div>

        {/* Total Savings Giant Counter */}
        <div
          style={{
            backgroundColor: '#064e3b',
            border: '2px solid #10b981',
            borderRadius: '12px',
            padding: '12px 24px',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '12px', color: '#a7f3d0', fontWeight: 'bold' }}>YOU ARE SAVING</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#34d399' }}>
            ₹{totalSaved.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Upsell Nudge Banner */}
      <div
        style={{
          backgroundColor: '#78350f',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '12px 20px',
          marginBottom: '24px',
          fontSize: '15px',
          color: '#fef3c7',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '22px' }}>🎁</span>
        <span>
          Add ₹80.00 more to reach ₹500 and get 1kg Madhur Pure Sugar for only ₹9!
        </span>
      </div>

      {/* Two Column Layout: Cart Items & Dynamic UPI QR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '30px' }}>
        {/* Left: Live Scanned Items */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#94a3b8' }}>CURRENT ITEMS IN YOUR CART</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.name}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                    Qty: {item.qty} × ₹{item.price} (MRP: ₹{item.mrp})
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>
                    ₹{item.total.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>
                    Saved ₹{item.saved}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid #334155', marginTop: '24px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>Total MRP: ₹{totalMrp.toFixed(2)}</div>
              <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>Total Savings: -₹{totalSaved.toFixed(2)}</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>NET TOTAL AMOUNT</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#38bdf8' }}>
                ₹{totalDue.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Dynamic Bharat UPI QR Code */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#38bdf8' }}>SCAN TO PAY VIA UPI</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px' }}>
            Google Pay / PhonePe / Paytm / Any UPI App
          </p>

          {/* QR Code Container */}
          <div
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '12px',
              display: 'inline-block',
              margin: '0 auto 20px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* SVG Dynamic UPI QR Simulation */}
            <svg width="220" height="220" viewBox="0 0 100 100" style={{ display: 'block' }}>
              {/* Corner markers */}
              <rect x="5" y="5" width="25" height="25" fill="#000" rx="2" />
              <rect x="9" y="9" width="17" height="17" fill="#fff" rx="1" />
              <rect x="13" y="13" width="9" height="9" fill="#000" />

              <rect x="70" y="5" width="25" height="25" fill="#000" rx="2" />
              <rect x="74" y="9" width="17" height="17" fill="#fff" rx="1" />
              <rect x="78" y="13" width="9" height="9" fill="#000" />

              <rect x="5" y="70" width="25" height="25" fill="#000" rx="2" />
              <rect x="9" y="74" width="17" height="17" fill="#fff" rx="1" />
              <rect x="13" y="78" width="9" height="9" fill="#000" />

              {/* Data blocks */}
              <rect x="35" y="8" width="8" height="8" fill="#000" />
              <rect x="48" y="15" width="12" height="6" fill="#000" />
              <rect x="8" y="38" width="16" height="8" fill="#000" />
              <rect x="35" y="35" width="30" height="30" fill="#2563eb" rx="4" />
              <text x="50" y="53" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">UPI</text>
              <rect x="72" y="42" width="18" height="12" fill="#000" />
              <rect x="42" y="72" width="15" height="8" fill="#000" />
              <rect x="68" y="75" width="24" height="16" fill="#000" />
            </svg>
            <div style={{ marginTop: '8px', color: '#000', fontWeight: 'bold', fontSize: '13px' }}>
              Amount: ₹{totalDue.toFixed(2)}
            </div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Dynamic Bharat QR VPA</div>
            <div style={{ fontSize: '13px', color: '#a7f3d0', fontWeight: 'bold' }}>tisupermarket@icici</div>
          </div>
        </div>
      </div>
    </div>
  );
};
