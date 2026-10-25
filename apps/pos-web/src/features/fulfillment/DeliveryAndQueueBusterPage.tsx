import React, { useState } from 'react';

type FulfillmentView = 'DELIVERY_BOARD' | 'QUEUE_BUSTER_MPOS' | 'RIDER_SETTLEMENT';

interface DeliveryOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  status: 'PICK_LIST_GENERATED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  totalAmount: number;
  codAmount?: number;
  riderName?: string;
  items: {
    name: string;
    qty: number;
    aisle: string;
    rack: string;
    shelf: string;
  }[];
}

interface CartItem {
  sku: string;
  name: string;
  price: number;
  qty: number;
}

export const DeliveryAndQueueBusterPage: React.FC = () => {
  const [activeView, setActiveView] = useState<FulfillmentView>('DELIVERY_BOARD');

  // Home Delivery Orders State
  const [orders, setOrders] = useState<DeliveryOrderItem[]>([
    {
      id: 'del-1',
      orderNumber: 'DEL-20261025-4102',
      customerName: 'Suresh Kumar',
      phone: '9840112233',
      address: 'Plot 42, 3rd Cross St, Gandhi Nagar, Adyar',
      status: 'PICK_LIST_GENERATED',
      totalAmount: 1840,
      codAmount: 1840,
      riderName: 'Muthu (Rider 1)',
      items: [
        { name: 'Aashirvaad Shudh Chakki Atta 5kg', qty: 1, aisle: 'Aisle-01', rack: 'R-02', shelf: 'S-01' },
        { name: 'Tata Salt 1kg Pack', qty: 2, aisle: 'Aisle-01', rack: 'R-03', shelf: 'S-02' },
        { name: 'Fortune Sunlite Sunflower Oil 1L', qty: 2, aisle: 'Aisle-02', rack: 'R-01', shelf: 'S-01' },
        { name: 'Cadbury Dairy Milk Silk 150g', qty: 3, aisle: 'Aisle-04', rack: 'R-05', shelf: 'S-03' },
      ],
    },
    {
      id: 'del-2',
      orderNumber: 'DEL-20261025-4103',
      customerName: 'Meenakshi Sundaram',
      phone: '9444155667',
      address: 'Flat 3B, Ceebros Heights, Velachery',
      status: 'OUT_FOR_DELIVERY',
      totalAmount: 3420,
      codAmount: 3420,
      riderName: 'Karthik (Rider 2)',
      items: [
        { name: 'India Gate Basmati Rice Feast 5kg', qty: 1, aisle: 'Aisle-01', rack: 'R-01', shelf: 'S-02' },
        { name: 'Surf Excel Matic Liquid 2L', qty: 1, aisle: 'Aisle-03', rack: 'R-04', shelf: 'S-01' },
      ],
    },
  ]);

  // Pick-List Modal
  const [selectedPickListOrder, setSelectedPickListOrder] = useState<DeliveryOrderItem | null>(null);

  // Queue-Buster mPOS State
  const [mposCart, setMposCart] = useState<CartItem[]>([
    { sku: 'FMCG-RICE-01', name: 'India Gate Basmati Rice Feast 5kg', price: 460, qty: 1 },
    { sku: 'FMCG-OIL-02', name: 'Fortune Sunlite Sunflower Oil 1L', price: 145, qty: 2 },
  ]);
  const [customerPhone, setCustomerPhone] = useState('9840199887');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Rider Settlement State
  const [riderCashInput, setRiderCashInput] = useState(5260);
  const [riderUpiInput, setRiderUpiInput] = useState(0);
  const [settlementSuccess, setSettlementSuccess] = useState<string | null>(null);

  const handleUpdateStatus = (orderId: string, nextStatus: DeliveryOrderItem['status']) => {
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)),
    );
  };

  const handleGenerateQueueToken = () => {
    const randomCode = `QB-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedToken(randomCode);
  };

  const handleClearMposCart = () => {
    setMposCart([]);
    setGeneratedToken(null);
  };

  const handleSettleRiders = (e: React.FormEvent) => {
    e.preventDefault();
    const totalExpected = orders.reduce((acc, o) => acc + (o.codAmount || 0), 0);
    const variance = riderCashInput + riderUpiInput - totalExpected;
    setSettlementSuccess(
      `Rider Shift Settled! Expected COD: ₹${totalExpected.toLocaleString()} | Collected: ₹${(
        riderCashInput + riderUpiInput
      ).toLocaleString()} (Variance: ₹${variance})`,
    );
    setTimeout(() => setSettlementSuccess(null), 4000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#38bdf8' }}>
            🚀 Home Delivery Pick-Pack & Queue-Buster Mobile mPOS
          </h1>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Aisle-Sorted Supermarket Pick-Lists, Rider Cash Reconciliation & Instant Trolley Pre-Billing
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveView('DELIVERY_BOARD')}
            style={{
              padding: '10px 18px',
              backgroundColor: activeView === 'DELIVERY_BOARD' ? '#2563eb' : '#0f172a',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            📦 Home Delivery Dispatch ({orders.length})
          </button>

          <button
            onClick={() => setActiveView('QUEUE_BUSTER_MPOS')}
            style={{
              padding: '10px 18px',
              backgroundColor: activeView === 'QUEUE_BUSTER_MPOS' ? '#10b981' : '#0f172a',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            📱 Queue-Buster mPOS Scanner
          </button>

          <button
            onClick={() => setActiveView('RIDER_SETTLEMENT')}
            style={{
              padding: '10px 18px',
              backgroundColor: activeView === 'RIDER_SETTLEMENT' ? '#8b5cf6' : '#0f172a',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            🛵 Rider Evening Settlement
          </button>
        </div>
      </div>

      {/* VIEW 1: Home Delivery Dispatch Board */}
      {activeView === 'DELIVERY_BOARD' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>1. PICK-LIST GENERATED</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>
                {orders.filter((o) => o.status === 'PICK_LIST_GENERATED').length} Orders
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Aisle-walking pick required</div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>2. PACKED & BILLED</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>
                {orders.filter((o) => o.status === 'PACKED').length} Orders
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Awaiting Rider Assignment</div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>3. OUT FOR DELIVERY</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#8b5cf6', marginTop: '4px' }}>
                {orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length} Orders
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>With Delivery Boys</div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>4. DELIVERED / SETTLED</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                {orders.filter((o) => o.status === 'DELIVERED').length} Orders
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Cash & UPI Collected</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px' }}>Order Number</th>
                  <th style={{ padding: '12px 16px' }}>Customer & Address</th>
                  <th style={{ padding: '12px 16px' }}>Items Count</th>
                  <th style={{ padding: '12px 16px' }}>Order Total</th>
                  <th style={{ padding: '12px 16px' }}>Rider</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Pipeline Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>
                      {o.orderNumber}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 'bold' }}>{o.customerName} (+91 {o.phone})</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{o.address}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => setSelectedPickListOrder(o)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        📋 {o.items.length} Items (View Walking Pick-List)
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#10b981' }}>
                      ₹{o.totalAmount.toLocaleString()} (COD)
                    </td>
                    <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{o.riderName || 'Unassigned'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor:
                            o.status === 'PICK_LIST_GENERATED'
                              ? '#0369a1'
                              : o.status === 'PACKED'
                              ? '#d97706'
                              : o.status === 'OUT_FOR_DELIVERY'
                              ? '#6d28d9'
                              : '#059669',
                          color: '#fff',
                        }}
                      >
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', display: 'flex', gap: '6px' }}>
                      {o.status === 'PICK_LIST_GENERATED' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'PACKED')}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f59e0b',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          Mark Packed
                        </button>
                      )}
                      {o.status === 'PACKED' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'OUT_FOR_DELIVERY')}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#8b5cf6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          Dispatch with Rider
                        </button>
                      )}
                      {o.status === 'OUT_FOR_DELIVERY' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'DELIVERED')}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          Confirm Delivery & Cash
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Queue-Buster Mobile mPOS Screen */}
      {activeView === 'QUEUE_BUSTER_MPOS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Trolley Scanner */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#10b981' }}>
                🛒 Trolley Queue-Buster Scanner (mPOS)
              </h3>
              <button
                onClick={handleClearMposCart}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#334155',
                  color: '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Reset Cart
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                Customer Mobile Phone (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. 9840123456"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#fff',
                }}
              />
            </div>

            {/* Quick Add Demo Item Buttons */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>Fast-Add Demo Grocery Items:</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { sku: 'FMCG-SUGAR-01', name: 'Madhur Pure Sugar 1kg', price: 48 },
                  { sku: 'FMCG-SALT-01', name: 'Tata Salt 1kg Pack', price: 28 },
                  { sku: 'FMCG-ATTA-01', name: 'Aashirvaad Atta 5kg', price: 245 },
                  { sku: 'FMCG-TEA-01', name: 'Red Label Tea 500g', price: 210 },
                ].map((item) => (
                  <button
                    key={item.sku}
                    onClick={() => setMposCart([...mposCart, { ...item, qty: 1 }])}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    + {item.name} (₹{item.price})
                  </button>
                ))}
              </div>
            </div>

            {/* Scanned Cart Table */}
            <div style={{ border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '8px 12px' }}>Item</th>
                    <th style={{ padding: '8px 12px' }}>Qty</th>
                    <th style={{ padding: '8px 12px' }}>Price</th>
                    <th style={{ padding: '8px 12px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {mposCart.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{item.name}</td>
                      <td style={{ padding: '8px 12px' }}>{item.qty}</td>
                      <td style={{ padding: '8px 12px' }}>₹{item.price}</td>
                      <td style={{ padding: '8px 12px', color: '#10b981', fontWeight: 'bold' }}>
                        ₹{item.qty * item.price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>Estimated Total:</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                ₹{mposCart.reduce((acc, i) => acc + i.qty * i.price, 0).toLocaleString()}
              </div>
            </div>

            <button
              onClick={handleGenerateQueueToken}
              disabled={mposCart.length === 0}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: mposCart.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              🏷️ Generate Scannable Queue Token (QB-XXXX)
            </button>
          </div>

          {/* Token Card Output */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {generatedToken ? (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ backgroundColor: '#064e3b', color: '#a7f3d0', padding: '8px 16px', borderRadius: '20px', display: 'inline-block', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px' }}>
                  ✓ CART TOKEN GENERATED
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', color: '#000000', margin: '0 auto', maxWidth: '320px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>TI SUPERMARKET EXPRESS</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>QUEUE-BUSTER mPOS TOKEN</div>

                  {/* Simulated 1D Barcode */}
                  <div style={{ fontSize: '32px', letterSpacing: '6px', fontWeight: '900', fontFamily: 'monospace', margin: '12px 0' }}>
                    |||| | ||||| | ||
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '2px' }}>
                    {generatedToken}
                  </div>

                  <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '16px', paddingTop: '12px', fontSize: '12px', textAlign: 'left' }}>
                    <div>Items Scanned: <strong>{mposCart.length}</strong></div>
                    <div>Est. Total: <strong>₹{mposCart.reduce((acc, i) => acc + i.qty * i.price, 0)}</strong></div>
                    <div>Customer: <strong>+91 {customerPhone}</strong></div>
                  </div>

                  <div style={{ marginTop: '12px', fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>
                    Hand to Cashier at counter for instant 5-second payment!
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📲</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>No Queue Token Generated Yet</div>
                <div style={{ fontSize: '12px', marginTop: '6px' }}>
                  Scan products in customer trolley and click &quot;Generate Scannable Queue Token&quot;.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Rider Evening Settlement */}
      {activeView === 'RIDER_SETTLEMENT' && (
        <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '8px', border: '1px solid #1e293b', maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#8b5cf6' }}>
            🛵 End-of-Shift Delivery Boy Settlement & Reconciliation
          </h3>

          {settlementSuccess && (
            <div style={{ backgroundColor: '#065f46', color: '#a7f3d0', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
              ✅ {settlementSuccess}
            </div>
          )}

          <form onSubmit={handleSettleRiders}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Delivery Boy / Rider Name:</label>
                <input
                  type="text"
                  readOnly
                  value="Muthu (Rider 1)"
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Assigned Shift Orders:</label>
                <input
                  type="text"
                  readOnly
                  value={`${orders.length} Orders Delivered`}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>
            </div>

            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Expected Cash On Delivery (COD):</span>
                <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>
                  ₹{orders.reduce((acc, o) => acc + (o.codAmount || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Physical Cash Handed In (₹):</label>
                <input
                  type="number"
                  value={riderCashInput}
                  onChange={(e) => setRiderCashInput(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '16px', fontWeight: 'bold' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Dynamic UPI QR Collected on Doorstep (₹):</label>
                <input
                  type="number"
                  value={riderUpiInput}
                  onChange={(e) => setRiderUpiInput(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '16px', fontWeight: 'bold' }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✓ Complete Evening Settlement & Reconcile Cash
            </button>
          </form>
        </div>
      )}

      {/* Modal: Aisle-Sorted Walking Pick-List */}
      {selectedPickListOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '8px', border: '1px solid #334155', width: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#38bdf8' }}>
                  🚶 Supermarket Walking Pick-List
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Order: {selectedPickListOrder.orderNumber} | Customer: {selectedPickListOrder.customerName}
                </div>
              </div>
              <button
                onClick={() => setSelectedPickListOrder(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: '#064e3b', color: '#a7f3d0', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '14px' }}>
              📍 <strong>Optimal Walking Sequence:</strong> Items sorted strictly by Aisle ASC &rarr; Rack ASC &rarr; Shelf ASC to minimize floor transit time.
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '8px 10px' }}>Aisle</th>
                  <th style={{ padding: '8px 10px' }}>Rack</th>
                  <th style={{ padding: '8px 10px' }}>Shelf</th>
                  <th style={{ padding: '8px 10px' }}>Item Name</th>
                  <th style={{ padding: '8px 10px' }}>Pick Qty</th>
                </tr>
              </thead>
              <tbody>
                {selectedPickListOrder.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', color: '#38bdf8', fontWeight: 'bold' }}>{item.aisle}</td>
                    <td style={{ padding: '10px' }}>{item.rack}</td>
                    <td style={{ padding: '10px' }}>{item.shelf}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ padding: '10px', color: '#10b981', fontWeight: 'bold' }}>{item.qty} Qty</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedPickListOrder(null)}
                style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🖨️ Print 80mm Walking Pick Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
