import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_STORE_CONFIG } from '@ti-erp/shared-types';

export interface PosCartItem {
  id: string;
  productId: string;
  skuCode: string;
  nameEn: string;
  nameRegional?: string;
  batchNumber: string;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  uom: string;
  discount: number;
  lineTotal: number;
}

const FAST_MOVING_ITEMS = [
  { id: 'fm-1', nameEn: 'Potato (Loose)', nameRegional: 'உருளைக்கிழங்கு', plu: '201', price: 36, mrp: 40, uom: 'KG' },
  { id: 'fm-2', nameEn: 'Tomato Country (Loose)', nameRegional: 'நாட்டு தக்காளி', plu: '202', price: 28, mrp: 32, uom: 'KG' },
  { id: 'fm-3', nameEn: 'Small Onion (Shallots)', nameRegional: 'சின்ன வெங்காயம்', plu: '203', price: 75, mrp: 85, uom: 'KG' },
  { id: 'fm-4', nameEn: 'Aavin Toned Milk 500ml', nameRegional: 'ஆவின் பால் 500மிலி', plu: '301', price: 22.5, mrp: 22.5, uom: 'PKT' },
  { id: 'fm-5', nameEn: 'Farm Fresh Eggs (6 Pcs)', nameRegional: 'பண்ணை முட்டை 6', plu: '302', price: 42, mrp: 48, uom: 'BOX' },
  { id: 'fm-6', nameEn: 'Shimla Apple Royal Gala', nameRegional: 'சிம்லா ஆப்பிள்', plu: '204', price: 160, mrp: 190, uom: 'KG' },
];

export const PosBillingScreen: React.FC = () => {
  const [cart, setCart] = useState<PosCartItem[]>([
    {
      id: 'c-1',
      productId: 'p-1',
      skuCode: 'SKU-FMCG-PARLE',
      nameEn: 'Parle-G Gold Glucose Biscuit 1kg',
      nameRegional: 'பார்லே-ஜி பிஸ்கட் 1கிலோ',
      batchNumber: 'PGL-102',
      mrp: 120,
      sellingPrice: 110,
      quantity: 2,
      uom: 'PACK',
      discount: 10,
      lineTotal: 210,
    },
    {
      id: 'c-2',
      productId: 'p-2',
      skuCode: 'SKU-FMCG-SURF',
      nameEn: 'Surf Excel Quick Wash 1kg',
      nameRegional: 'சர்ப் எக்செல் 1கிலோ',
      batchNumber: 'SX-0992',
      mrp: 180,
      sellingPrice: 155,
      quantity: 1,
      uom: 'PACK',
      discount: 0,
      lineTotal: 155,
    },
  ]);

  const [scanInput, setScanInput] = useState('');
  const [priceTier, setPriceTier] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  const [customerPhone, setCustomerPhone] = useState('9876543210');
  const [customerName, setCustomerName] = useState('Ramanathan S. (VIP)');

  // Modals
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [parkModalOpen, setParkModalOpen] = useState(false);
  const [recallModalOpen, setRecallModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
  const [mrpConflictModalOpen, setMrpConflictModalOpen] = useState(false);
  const [receiptSuccessModal, setReceiptSuccessModal] = useState<string | null>(null);

  // Split Tender State
  const [cashTendered, setCashTendered] = useState(0);
  const [upiTendered, setUpiTendered] = useState(0);
  const [cardTendered, setCardTendered] = useState(0);
  const [creditNoteBarcode, setCreditNoteBarcode] = useState('');
  const [creditNoteAmount, setCreditNoteAmount] = useState(0);

  // Supervisor PIN State
  const [supervisorPin, setSupervisorPin] = useState('');
  const [overrideReason, setOverrideReason] = useState('Manual Price Override');

  // Input ref
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Calculations
  const grossSubTotal = cart.reduce((acc, item) => acc + item.quantity * item.sellingPrice, 0);
  const totalItemDiscounts = cart.reduce((acc, item) => acc + item.discount, 0);
  const totalMrpSavings = cart.reduce((acc, item) => acc + (item.mrp - item.sellingPrice) * item.quantity + item.discount, 0);
  const netPayable = grossSubTotal - totalItemDiscounts;

  // Live Upsell Nudge logic: e.g. Threshold ₹500 or ₹1,000
  const upsellThreshold = 500;
  const isUpsellEligible = netPayable >= upsellThreshold * 0.7 && netPayable < upsellThreshold;
  const amountNeeded = (upsellThreshold - netPayable).toFixed(2);

  // Total Paid in Split Modal
  const totalPaidInModal = cashTendered + upiTendered + cardTendered + creditNoteAmount;
  const balanceDueInModal = Math.max(0, netPayable - totalPaidInModal);
  const cashChangeToReturn = cashTendered > (netPayable - (upiTendered + cardTendered + creditNoteAmount))
    ? Math.max(0, cashTendered - (netPayable - (upiTendered + cardTendered + creditNoteAmount)))
    : 0;

  // Global Keyboard Shortcuts (F1 - F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        alert('Shortcuts Help:\nF1: Help\nF2: Focus Barcode\nF3: Read Scale Weight\nF4: Toggle Wholesale Tier\nF6: Hold/Park Cart\nF7: Recall Held Cart\nF8: Return/Exchange\nF9: Supervisor Override\nF10: Instant Cash\nF12: Split Tenders');
      } else if (e.key === 'F2') {
        e.preventDefault();
        scanInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleSimulateScale();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setPriceTier((prev) => (prev === 'RETAIL' ? 'WHOLESALE' : 'RETAIL'));
      } else if (e.key === 'F6') {
        e.preventDefault();
        setParkModalOpen(true);
      } else if (e.key === 'F7') {
        e.preventDefault();
        setRecallModalOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setReturnModalOpen(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        setSupervisorModalOpen(true);
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleInstantCashCheckout();
      } else if (e.key === 'F12') {
        e.preventDefault();
        setCashTendered(netPayable);
        setSplitModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [netPayable]);

  const handleSimulateScale = () => {
    const randomWeight = parseFloat((Math.random() * (2.5 - 0.5) + 0.5).toFixed(3));
    const item = FAST_MOVING_ITEMS[0]; // Potato
    const cost = parseFloat((item.price * randomWeight).toFixed(2));
    const newItem: PosCartItem = {
      id: Date.now().toString(),
      productId: item.id,
      skuCode: `PLU-${item.plu}`,
      nameEn: `${item.nameEn} (${randomWeight} kg)`,
      nameRegional: item.nameRegional,
      batchNumber: 'SCALE-WT',
      mrp: parseFloat((item.mrp * randomWeight).toFixed(2)),
      sellingPrice: item.price,
      quantity: randomWeight,
      uom: 'KG',
      discount: 0,
      lineTotal: cost,
    };
    setCart((prev) => [newItem, ...prev]);
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanInput.trim();
    if (!code) return;

    if (code === '240') {
      // Simulate MRP Conflict Popup
      setMrpConflictModalOpen(true);
      setScanInput('');
      return;
    }

    // Standard simulated scan
    const newItem: PosCartItem = {
      id: Date.now().toString(),
      productId: `scan-${Date.now()}`,
      skuCode: code,
      nameEn: `Scanned Item #${code}`,
      batchNumber: 'BAT-01',
      mrp: 100,
      sellingPrice: priceTier === 'WHOLESALE' ? 82 : 90,
      quantity: 1,
      uom: 'PCS',
      discount: 0,
      lineTotal: priceTier === 'WHOLESALE' ? 82 : 90,
    };

    setCart((prev) => [newItem, ...prev]);
    setScanInput('');
  };

  const handleQuickAdd = (item: typeof FAST_MOVING_ITEMS[0]) => {
    const existing = cart.find((i) => i.productId === item.id);
    if (existing) {
      setCart((prev) =>
        prev.map((i) =>
          i.productId === item.id
            ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * i.sellingPrice - i.discount }
            : i,
        ),
      );
    } else {
      setCart((prev) => [
        {
          id: Date.now().toString(),
          productId: item.id,
          skuCode: `PLU-${item.plu}`,
          nameEn: item.nameEn,
          nameRegional: item.nameRegional,
          batchNumber: 'FM-LOT',
          mrp: item.mrp,
          sellingPrice: item.price,
          quantity: 1,
          uom: item.uom,
          discount: 0,
          lineTotal: item.price,
        },
        ...prev,
      ]);
    }
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const nextQty = Math.max(0, i.quantity + delta);
            return nextQty === 0 ? null : { ...i, quantity: nextQty, lineTotal: nextQty * i.sellingPrice - i.discount };
          }
          return i;
        })
        .filter(Boolean) as PosCartItem[],
    );
  };

  const handleInstantCashCheckout = () => {
    const billNo = `INV-T01-${Date.now().toString().slice(-6)}`;
    setReceiptSuccessModal(
      `Receipt #${billNo} Completed via CASH! Total Paid: ₹${netPayable.toFixed(2)}. Cash drawer pulsed open. ESC/POS 80mm thermal receipt sent to printer.`,
    );
    setCart([]);
  };

  const handleCompleteSplitPayment = () => {
    const billNo = `INV-T01-${Date.now().toString().slice(-6)}`;
    setReceiptSuccessModal(
      `Receipt #${billNo} Completed via Multi-Tender Split! (Cash: ₹${cashTendered}, UPI: ₹${upiTendered}, Card: ₹${cardTendered}, CreditNote: ₹${creditNoteAmount}). Cash drawer pulsed. Thermal receipt printed.`,
    );
    setSplitModalOpen(false);
    setCart([]);
  };

  return (
    <div style={{ padding: '16px 24px', maxWidth: '1700px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Top POS Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          padding: '10px 18px',
          borderRadius: '8px',
          border: '1px solid #334155',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>Counter: POS-01</span>
          <span style={{ color: '#94a3b8' }}>Cashier: Shanmugam (Shift #4)</span>
          <span style={{ color: '#10b981', backgroundColor: '#064e3b', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
            ● ONLINE LAN (Model B)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <span style={{ color: '#fbbf24', fontSize: '12px' }}>
            Customer: <b>{customerName}</b> ({customerPhone})
          </span>
          <button
            onClick={() => setPriceTier((prev) => (prev === 'RETAIL' ? 'WHOLESALE' : 'RETAIL'))}
            style={{
              padding: '6px 14px',
              backgroundColor: priceTier === 'WHOLESALE' ? '#854d0e' : '#1e293b',
              color: priceTier === 'WHOLESALE' ? '#fef08a' : '#94a3b8',
              border: '1px solid #ca8a04',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '11px',
            }}
          >
            Tier: {priceTier} [F4]
          </button>
        </div>
      </div>

      {/* Live Upsell Nudge Banner */}
      {isUpsellEligible && (
        <div
          style={{
            backgroundColor: '#78350f',
            border: '1px solid #f59e0b',
            color: '#fef3c7',
            padding: '10px 16px',
            borderRadius: '8px',
            marginBottom: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
          }}
        >
          <span>
            🎁 <b>Live Upsell Nudge:</b> Add <b>₹{amountNeeded}</b> more to reach ₹{upsellThreshold} and get <b>1kg Madhur Sugar @ ₹9</b>!
          </span>
          <button
            onClick={() => handleQuickAdd(FAST_MOVING_ITEMS[0])}
            style={{
              padding: '4px 10px',
              backgroundColor: '#f59e0b',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            + Add Suggested Item
          </button>
        </div>
      )}

      {/* Main Grid: Cart & Items */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '20px' }}>
        {/* Left Column: Rapid Barcode / PLU Bar & Cart Table */}
        <div>
          {/* Scanner Input Form */}
          <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <input
              ref={scanInputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan Barcode / Scale Sticker (Prefix 20) / Enter 3-Digit PLU / '240' for Batch Conflict..."
              autoFocus
              style={{
                flex: 1,
                padding: '14px 16px',
                fontSize: '16px',
                backgroundColor: '#0f172a',
                color: '#fff',
                border: '2px solid #38bdf8',
                borderRadius: '8px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleSimulateScale}
              style={{
                padding: '0 16px',
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ⚖️ Scale [F3]
            </button>
            <button
              type="submit"
              style={{
                padding: '0 20px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Add [Enter]
            </button>
          </form>

          {/* Cart Items Table */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 14px' }}>Item Name</th>
                  <th style={{ padding: '12px' }}>Batch</th>
                  <th style={{ padding: '12px' }}>MRP</th>
                  <th style={{ padding: '12px' }}>Price</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '12px' }}>Disc</th>
                  <th style={{ padding: '12px', color: '#38bdf8' }}>Total</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Act</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      Cart is empty. Scan barcodes or tap loose items to begin.
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{item.nameEn}</div>
                        {item.nameRegional && (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.nameRegional}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#94a3b8', fontSize: '11px' }}>{item.batchNumber}</td>
                      <td style={{ padding: '12px', color: '#64748b', textDecoration: 'line-through' }}>₹{item.mrp}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>₹{item.sellingPrice}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            style={{ padding: '2px 8px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 'bold', minWidth: '30px' }}>{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQty(item.id, 1)}
                            style={{ padding: '2px 8px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: '#10b981' }}>{item.discount > 0 ? `₹${item.discount}` : '-'}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#38bdf8' }}>₹{item.lineTotal.toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => setCart((prev) => prev.filter((i) => i.id !== item.id))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Barcode / Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={() => setParkModalOpen(true)}
              style={{ flex: 1, padding: '10px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              ⏸️ Hold Cart [F6]
            </button>
            <button
              onClick={() => setRecallModalOpen(true)}
              style={{ flex: 1, padding: '10px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              🔄 Recall Held [F7]
            </button>
            <button
              onClick={() => setReturnModalOpen(true)}
              style={{ flex: 1, padding: '10px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              ↩️ Return [F8]
            </button>
            <button
              onClick={() => setSupervisorModalOpen(true)}
              style={{ flex: 1, padding: '10px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              🛡️ Supervisor [F9]
            </button>
          </div>
        </div>

        {/* Right Column: Fast-Moving Loose Items Touch Grid & Checkout Summary */}
        <div>
          {/* Fast Moving Panel */}
          <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#38bdf8' }}>
              ⚡ Fast-Moving Loose & Produce Items
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {FAST_MOVING_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleQuickAdd(item)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '10px 8px',
                    textAlign: 'left',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{item.nameEn}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>PLU: {item.plu}</div>
                  <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold', marginTop: '4px' }}>
                    ₹{item.price}/{item.uom}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Checkout Totals & Instant Buttons */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '2px solid #2563eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: '#94a3b8' }}>Gross Subtotal:</span>
              <span>₹{grossSubTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: '#94a3b8' }}>Promotions:</span>
              <span style={{ color: '#10b981' }}>-₹{totalItemDiscounts.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>Total Savings:</span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>₹{totalMrpSavings.toFixed(2)}</span>
            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>NET AMOUNT PAYABLE:</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#38bdf8' }}>
                ₹{netPayable.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleInstantCashCheckout}
                disabled={cart.length === 0}
                style={{
                  padding: '14px',
                  backgroundColor: cart.length === 0 ? '#475569' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                💵 Instant Cash [F10]
              </button>
              <button
                onClick={() => {
                  setCashTendered(netPayable);
                  setSplitModalOpen(true);
                }}
                disabled={cart.length === 0}
                style={{
                  padding: '14px',
                  backgroundColor: cart.length === 0 ? '#475569' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                💳 Split Payment [F12]
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-MODE SPLIT TENDER MODAL (F12) */}
      {splitModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '28px', borderRadius: '12px', maxWidth: '600px', width: '100%', border: '1px solid #475569' }}>
            <h3 style={{ margin: '0 0 16px', color: '#38bdf8', fontSize: '20px' }}>
              💳 Multi-Mode Split Tender Settlement
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Cash Tendered (₹):</label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Dynamic UPI (₹):</label>
                <input
                  type="number"
                  value={upiTendered}
                  onChange={(e) => setUpiTendered(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>EDC Card (₹):</label>
                <input
                  type="number"
                  value={cardTendered}
                  onChange={(e) => setCardTendered(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Credit Note Slip (₹):</label>
                <input
                  type="number"
                  value={creditNoteAmount}
                  onChange={(e) => setCreditNoteAmount(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '14px' }}
                />
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Net Bill Due:</span>
                <span style={{ fontWeight: 'bold' }}>₹{netPayable.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Total Tendered:</span>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>₹{totalPaidInModal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Balance Due:</span>
                <span style={{ color: balanceDueInModal > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                  ₹{balanceDueInModal.toFixed(2)}
                </span>
              </div>
              {cashChangeToReturn > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#10b981', fontWeight: 'bold', borderTop: '1px dashed #334155', paddingTop: '6px' }}>
                  <span>Cash Change to Return:</span>
                  <span>₹{cashChangeToReturn.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSplitModalOpen(false)}
                style={{ padding: '10px 18px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSplitPayment}
                disabled={balanceDueInModal > 0}
                style={{
                  padding: '10px 22px',
                  backgroundColor: balanceDueInModal > 0 ? '#475569' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: balanceDueInModal > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                ✓ Complete Bill & Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH/MRP CONFLICT MODAL */}
      {mrpConflictModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '100%', border: '2px solid #ef4444' }}>
            <h3 style={{ margin: '0 0 8px', color: '#ef4444', fontSize: '18px' }}>
              ⚠️ MRP Conflict Detected: Select Batch to Bill
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>
              Multiple active batches exist with differing MRPs. Select the matching sticker MRP:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <button
                onClick={() => {
                  setMrpConflictModalOpen(false);
                  setCart((prev) => [
                    { id: Date.now().toString(), productId: 'p-c1', skuCode: 'SKU-CONFLICT', nameEn: 'Aashirvaad Atta 5kg (Old Batch)', batchNumber: 'LOT-A1', mrp: 240, sellingPrice: 220, quantity: 1, uom: 'PACK', discount: 0, lineTotal: 220 },
                    ...prev,
                  ]);
                }}
                style={{ padding: '12px', backgroundColor: '#0f172a', border: '1px solid #10b981', color: '#fff', borderRadius: '6px', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 'bold' }}>[1] Batch LOT-A1: MRP ₹240.00 (Store Price: ₹220.00)</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Exp: 24/02/2027 | Shop Floor Qty: 8 Units</div>
              </button>

              <button
                onClick={() => {
                  setMrpConflictModalOpen(false);
                  setCart((prev) => [
                    { id: Date.now().toString(), productId: 'p-c2', skuCode: 'SKU-CONFLICT', nameEn: 'Aashirvaad Atta 5kg (New Batch)', batchNumber: 'LOT-B2', mrp: 255, sellingPrice: 235, quantity: 1, uom: 'PACK', discount: 0, lineTotal: 235 },
                    ...prev,
                  ]);
                }}
                style={{ padding: '12px', backgroundColor: '#0f172a', border: '1px solid #38bdf8', color: '#fff', borderRadius: '6px', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 'bold' }}>[2] Batch LOT-B2: MRP ₹255.00 (Store Price: ₹235.00)</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Exp: 15/06/2027 | Shop Floor Qty: 24 Units</div>
              </button>
            </div>

            <button
              onClick={() => setMrpConflictModalOpen(false)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* HOLD / PARK CART MODAL (F6) */}
      {parkModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', maxWidth: '450px', width: '100%', border: '1px solid #475569' }}>
            <h3 style={{ margin: '0 0 12px', color: '#38bdf8', fontSize: '18px' }}>⏸️ Park Current Cart on LAN</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>
              Holding {cart.length} items (₹{netPayable.toFixed(2)}). Any cashier terminal on this LAN can recall it.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setParkModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  setParkModalOpen(false);
                  setCart([]);
                  alert('Cart successfully held as HOLD-01 on LAN!');
                }}
                style={{ padding: '8px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Confirm Park
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECALL CART MODAL (F7) */}
      {recallModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '100%', border: '1px solid #475569' }}>
            <h3 style={{ margin: '0 0 12px', color: '#10b981', fontSize: '18px' }}>🔄 Recall Parked Cart from LAN</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>HOLD-01 (Counter 2)</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Customer: 9876543210 | 4 items</div>
                </div>
                <button
                  onClick={() => {
                    setRecallModalOpen(false);
                    setCart([
                      { id: 'rc-1', productId: 'p-1', skuCode: 'SKU-FMCG-PARLE', nameEn: 'Parle-G Gold 1kg', batchNumber: 'PGL-102', mrp: 120, sellingPrice: 110, quantity: 3, uom: 'PACK', discount: 0, lineTotal: 330 },
                    ]);
                  }}
                  style={{ padding: '6px 14px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Recall
                </button>
              </div>
            </div>
            <button onClick={() => setRecallModalOpen(false)} style={{ width: '100%', padding: '8px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* SUPERVISOR OVERRIDE MODAL (F9) */}
      {supervisorModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', maxWidth: '450px', width: '100%', border: '2px solid #fbbf24' }}>
            <h3 style={{ margin: '0 0 12px', color: '#fbbf24', fontSize: '18px' }}>🛡️ Supervisor PIN Override</h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Reason:</label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Supervisor 4-Digit PIN:</label>
              <input
                type="password"
                maxLength={4}
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value)}
                placeholder="Enter 9999 or 1234"
                style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '2px solid #fbbf24', borderRadius: '4px', color: '#fff', fontSize: '18px', textAlign: 'center', letterSpacing: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSupervisorModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  if (supervisorPin === '9999' || supervisorPin === '1234') {
                    alert('Supervisor override verified! Action recorded in immutable AuditExceptionLog.');
                    setSupervisorModalOpen(false);
                    setSupervisorPin('');
                  } else {
                    alert('Invalid PIN. Must enter 9999 or 1234.');
                  }
                }}
                style={{ padding: '8px 20px', backgroundColor: '#fbbf24', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALES RETURN MODAL (F8) */}
      {returnModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', maxWidth: '550px', width: '100%', border: '1px solid #475569' }}>
            <h3 style={{ margin: '0 0 12px', color: '#f87171', fontSize: '18px' }}>↩️ Process Sales Return / Exchange</h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Scan Original Bill Barcode / No:</label>
              <input
                type="text"
                placeholder="INV-T01-XXXX"
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '18px', padding: '12px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #334155', fontSize: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#fff' }}>Item: Parle-G Gold 1kg</div>
              <div style={{ color: '#94a3b8' }}>Sold Rate: ₹110.00 | Qty to Return: 1</div>
              <div style={{ marginTop: '8px', color: '#10b981', fontWeight: 'bold' }}>Refund Value: ₹110.00</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setReturnModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  setReturnModalOpen(false);
                  alert('Return processed! Barcoded Credit Note Slip CN-98124 issued for ₹110.00 (Valid 90 Days).');
                }}
                style={{ padding: '8px 20px', backgroundColor: '#f87171', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Issue Credit Note Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS RECEIPT BANNER */}
      {receiptSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#064e3b', padding: '28px', borderRadius: '12px', maxWidth: '550px', width: '100%', border: '2px solid #10b981', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <h3 style={{ margin: '0 0 10px', color: '#a7f3d0', fontSize: '20px' }}>Checkout Completed!</h3>
            <p style={{ fontSize: '13px', color: '#d1fae5', margin: '0 0 20px', lineHeight: '1.6' }}>
              {receiptSuccessModal}
            </p>
            <button
              onClick={() => {
                setReceiptSuccessModal(null);
                scanInputRef.current?.focus();
              }}
              style={{ padding: '10px 24px', backgroundColor: '#10b981', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
            >
              Start Next Customer [F2]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
