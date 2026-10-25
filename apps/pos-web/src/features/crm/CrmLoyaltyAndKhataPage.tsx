import React, { useState } from 'react';

type CrmTab = 'CUSTOMERS' | 'KHATA' | 'RATION_RFM' | 'GIFT_CARDS';

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  gstin?: string;
  loyaltyTier: 'SILVER' | 'GOLD' | 'VIP';
  points: number;
  khataLimit: number;
  khataBalance: number;
  lastPurchaseDate?: string;
  overdueDays?: number;
}

export const CrmLoyaltyAndKhataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CrmTab>('CUSTOMERS');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock Customers
  const [customers, setCustomers] = useState<CustomerItem[]>([
    {
      id: 'cust-1',
      name: 'Ramesh Sundaram (Family Shopper)',
      phone: '9840123456',
      loyaltyTier: 'VIP',
      points: 480,
      khataLimit: 20000,
      khataBalance: 12450,
      lastPurchaseDate: '2026-09-08',
      overdueDays: 47,
    },
    {
      id: 'cust-2',
      name: 'Priya Narayanan',
      phone: '9444987654',
      loyaltyTier: 'GOLD',
      points: 210,
      khataLimit: 10000,
      khataBalance: 3200,
      lastPurchaseDate: '2026-10-18',
      overdueDays: 7,
    },
    {
      id: 'cust-3',
      name: 'Sri Krishna Hotel & Bakery',
      phone: '9884011223',
      gstin: '33AABCS1429B1Z2',
      loyaltyTier: 'VIP',
      points: 1250,
      khataLimit: 50000,
      khataBalance: 42100,
      lastPurchaseDate: '2026-10-24',
      overdueDays: 1,
    },
    {
      id: 'cust-4',
      name: 'Anand Kumar',
      phone: '9841055667',
      loyaltyTier: 'SILVER',
      points: 35,
      khataLimit: 5000,
      khataBalance: 0,
      lastPurchaseDate: '2026-09-03',
      overdueDays: 52,
    },
  ]);

  // Modals & Forms
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [newCustLimit, setNewCustLimit] = useState(5000);

  // Repayment Modal
  const [repayCustomer, setRepayCustomer] = useState<CustomerItem | null>(null);
  const [repayAmount, setRepayAmount] = useState(0);
  const [repayMethod, setRepayMethod] = useState('UPI');
  const [repaymentSuccess, setRepaymentSuccess] = useState<string | null>(null);

  // Statement WhatsApp preview
  const [statementSuccess, setStatementSuccess] = useState<string | null>(null);

  // Gift Card State
  const [giftCards, setGiftCards] = useState([
    { code: 'GC-FESTIVAL-500', balance: 500, original: 500, expiry: '2027-10-25' },
    { code: 'GC-DIWALI-2000', balance: 1450, original: 2000, expiry: '2027-10-25' },
  ]);
  const [newGcAmount, setNewGcAmount] = useState(1000);
  const [newGcCode, setNewGcCode] = useState('');

  // Ration Comeback Coupon Status
  const [rationCouponSuccess, setRationCouponSuccess] = useState<string | null>(null);

  // Filtered
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const missingRationCustomers = customers.filter(
    (c) => (c.overdueDays && c.overdueDays > 30) || (c.lastPurchaseDate && c.lastPurchaseDate < '2026-10-01'),
  );

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustPhone || !newCustName) return;
    const newCust: CustomerItem = {
      id: `cust-${Date.now()}`,
      name: newCustName,
      phone: newCustPhone.replace(/[^0-9]/g, '').slice(-10),
      gstin: newCustGstin.trim() || undefined,
      loyaltyTier: 'SILVER',
      points: 0,
      khataLimit: newCustLimit,
      khataBalance: 0,
    };
    setCustomers([newCust, ...customers]);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustGstin('');
  };

  const handleRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayCustomer || repayAmount <= 0) return;
    const newBal = Math.max(0, repayCustomer.khataBalance - repayAmount);
    setCustomers(
      customers.map((c) => (c.id === repayCustomer.id ? { ...c, khataBalance: newBal } : c)),
    );
    setRepaymentSuccess(
      `Repayment of ₹${repayAmount} received for ${repayCustomer.name}. Outstanding Balance: ₹${newBal}`,
    );
    setTimeout(() => {
      setRepayCustomer(null);
      setRepaymentSuccess(null);
    }, 2000);
  };

  const handleSendStatement = (c: CustomerItem) => {
    const upiUri = `upi://pay?pa=tierp.store@okhdfcbank&pn=TI_Supermarket&am=${c.khataBalance}&cu=INR&tn=Khata_Settlement`;
    setStatementSuccess(
      `WhatsApp Statement sent to +91 ${c.phone} with NPCI Dynamic UPI Link:\n${upiUri}`,
    );
    setTimeout(() => setStatementSuccess(null), 4000);
  };

  const handleSendRationCoupon = (c: CustomerItem) => {
    setRationCouponSuccess(
      `Comeback Coupon "RATION100" (₹100 Off on ₹1,000+) sent to ${c.name} (+91 ${c.phone})!`,
    );
    setTimeout(() => setRationCouponSuccess(null), 3000);
  };

  const handleIssueGiftCard = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newGcCode.trim() || `GC-${Math.floor(100000 + Math.random() * 900000)}`;
    setGiftCards([{ code, balance: newGcAmount, original: newGcAmount, expiry: '2027-10-25' }, ...giftCards]);
    setNewGcCode('');
    setNewGcAmount(1000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#38bdf8' }}>
            👑 Customer CRM, Tiered Loyalty & Credit Khata
          </h1>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Unified Customer Intelligence, Anti-Fraud Points, Institutional Ledger & 1st-to-10th Ration Tracker
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowAddCustomerModal(true)}
            style={{
              padding: '10px 18px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            + Register New Customer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('CUSTOMERS')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'CUSTOMERS' ? '#2563eb' : '#0f172a',
            color: activeTab === 'CUSTOMERS' ? '#fff' : '#94a3b8',
            border: '1px solid #334155',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          👥 Customers & Loyalty Tiers
        </button>

        <button
          onClick={() => setActiveTab('KHATA')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'KHATA' ? '#2563eb' : '#0f172a',
            color: activeTab === 'KHATA' ? '#fff' : '#94a3b8',
            border: '1px solid #334155',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          📖 Monthly Credit Khata ({customers.filter((c) => c.khataBalance > 0).length})
        </button>

        <button
          onClick={() => setActiveTab('RATION_RFM')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'RATION_RFM' ? '#2563eb' : '#0f172a',
            color: activeTab === 'RATION_RFM' ? '#fff' : '#94a3b8',
            border: '1px solid #334155',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🛒 1st–10th Missing Ration & RFM ({missingRationCustomers.length})
        </button>

        <button
          onClick={() => setActiveTab('GIFT_CARDS')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'GIFT_CARDS' ? '#2563eb' : '#0f172a',
            color: activeTab === 'GIFT_CARDS' ? '#fff' : '#94a3b8',
            border: '1px solid #334155',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🎁 Prepaid Gift Cards ({giftCards.length})
        </button>
      </div>

      {/* Success Notification Banners */}
      {statementSuccess && (
        <div style={{ backgroundColor: '#065f46', padding: '12px 18px', borderRadius: '8px', marginBottom: '16px', color: '#a7f3d0', whiteSpace: 'pre-line' }}>
          ✅ {statementSuccess}
        </div>
      )}
      {rationCouponSuccess && (
        <div style={{ backgroundColor: '#854d0e', padding: '12px 18px', borderRadius: '8px', marginBottom: '16px', color: '#fef08a' }}>
          🎉 {rationCouponSuccess}
        </div>
      )}

      {/* Tab 1: Customers & Loyalty Tiers */}
      {activeTab === 'CUSTOMERS' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="🔍 Search customer by name, 10-digit phone, or GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px' }}>Customer Name</th>
                  <th style={{ padding: '12px 16px' }}>Phone / Mobile</th>
                  <th style={{ padding: '12px 16px' }}>GSTIN</th>
                  <th style={{ padding: '12px 16px' }}>Loyalty Tier</th>
                  <th style={{ padding: '12px 16px' }}>Points Balance</th>
                  <th style={{ padding: '12px 16px' }}>Khata Credit Balance</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 'bold' }}>{c.name}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>+91 {c.phone}</td>
                    <td style={{ padding: '14px 16px', color: '#38bdf8' }}>{c.gstin || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor:
                            c.loyaltyTier === 'VIP'
                              ? '#7c3aed'
                              : c.loyaltyTier === 'GOLD'
                              ? '#d97706'
                              : '#475569',
                          color: '#fff',
                        }}
                      >
                        {c.loyaltyTier} {c.loyaltyTier === 'VIP' ? '★ 2.0x' : c.loyaltyTier === 'GOLD' ? '★ 1.5x' : '1.0x'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: 'bold' }}>
                      {c.points} pts (₹{c.points})
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {c.khataBalance > 0 ? (
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                          ₹{c.khataBalance.toLocaleString()} / ₹{c.khataLimit.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: '#10b981' }}>₹0 (Clear)</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => {
                          setRepayCustomer(c);
                          setRepayAmount(c.khataBalance);
                        }}
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
                        Khata Repayment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Credit Khata Ledger */}
      {activeTab === 'KHATA' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>TOTAL KHATA RECEIVABLES</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444', marginTop: '6px' }}>
                ₹{customers.reduce((acc, c) => acc + c.khataBalance, 0).toLocaleString()}
              </div>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>ACTIVE CREDIT ACCOUNTS</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', marginTop: '6px' }}>
                {customers.filter((c) => c.khataBalance > 0).length} Families / B2B
              </div>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>OVERDUE ACCOUNTS (&gt; 30 DAYS)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginTop: '6px' }}>
                {customers.filter((c) => c.overdueDays && c.overdueDays > 30).length} Need Supervisor PIN
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px' }}>Customer</th>
                  <th style={{ padding: '12px 16px' }}>Phone</th>
                  <th style={{ padding: '12px 16px' }}>Credit Limit</th>
                  <th style={{ padding: '12px 16px' }}>Current Outstanding</th>
                  <th style={{ padding: '12px 16px' }}>Aging / Overdue</th>
                  <th style={{ padding: '12px 16px' }}>1-Click Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers
                  .filter((c) => c.khataBalance > 0)
                  .map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 'bold' }}>{c.name}</td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>+91 {c.phone}</td>
                      <td style={{ padding: '14px 16px' }}>₹{c.khataLimit.toLocaleString()}</td>
                      <td style={{ padding: '14px 16px', color: '#ef4444', fontWeight: 'bold' }}>
                        ₹{c.khataBalance.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {c.overdueDays && c.overdueDays > 30 ? (
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                            ⚠️ {c.overdueDays} Days Overdue (PIN Lock)
                          </span>
                        ) : (
                          <span style={{ color: '#10b981' }}>Within 30-Day Cycle</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setRepayCustomer(c);
                            setRepayAmount(c.khataBalance);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Record Payment
                        </button>
                        <button
                          onClick={() => handleSendStatement(c)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          📲 WhatsApp Statement + UPI
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: 1st–10th Missing Ration & RFM */}
      {activeTab === 'RATION_RFM' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>CHAMPIONS (R5 F5 M5)</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                {customers.filter((c) => c.loyaltyTier === 'VIP').length} Shoppers
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Weekly regular grocery buyers</div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>REGULAR MONTHLY BUYERS</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>
                {customers.filter((c) => c.loyaltyTier === 'GOLD').length} Families
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Visits 1st to 10th of every month</div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '11px', color: '#f59e0b' }}>AT-RISK (MISSING RATION)</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>
                {missingRationCustomers.length} Regulars
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>No visit yet this month!</div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '11px', color: '#ef4444' }}>SLEEPING CUSTOMERS</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginTop: '4px' }}>
                {customers.filter((c) => c.loyaltyTier === 'SILVER').length} Accounts
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Last purchase &gt; 60 days</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f59e0b' }}>
              🚨 Missing 1st–10th Monthly Grocery Shoppers (Immediate Re-Engagement)
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px 14px' }}>Customer Name</th>
                  <th style={{ padding: '10px 14px' }}>Phone</th>
                  <th style={{ padding: '10px 14px' }}>Last Monthly Visit</th>
                  <th style={{ padding: '10px 14px' }}>Days Since Visit</th>
                  <th style={{ padding: '10px 14px' }}>Automated Comeback Offer</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {missingRationCustomers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 'bold' }}>{c.name}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>+91 {c.phone}</td>
                    <td style={{ padding: '12px 14px' }}>{c.lastPurchaseDate || 'Over a month ago'}</td>
                    <td style={{ padding: '12px 14px', color: '#ef4444', fontWeight: 'bold' }}>
                      {c.overdueDays || 45} days ago
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ backgroundColor: '#854d0e', padding: '4px 8px', borderRadius: '4px', color: '#fef08a' }}>
                        Coupon: RATION100 (₹100 Off)
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => handleSendRationCoupon(c)}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#059669',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        📲 Send WhatsApp Comeback Offer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Prepaid Gift Cards */}
      {activeTab === 'GIFT_CARDS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Issue Gift Card Form */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>
              🎁 Issue New Prepaid Gift Card
            </h3>
            <form onSubmit={handleIssueGiftCard}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Card Barcode (Leave empty for auto-generated):
                </label>
                <input
                  type="text"
                  placeholder="e.g. GC-DIWALI-2026"
                  value={newGcCode}
                  onChange={(e) => setNewGcCode(e.target.value)}
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

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Denomination (₹ Amount):
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setNewGcAmount(amt)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: newGcAmount === amt ? '#2563eb' : '#1e293b',
                        color: '#fff',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={newGcAmount}
                  onChange={(e) => setNewGcAmount(Number(e.target.value))}
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

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                + Issue & Print Barcode Voucher
              </button>
            </form>
          </div>

          {/* Active Gift Cards Table */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>
              Active Gift Cards & Available Balances
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px 14px' }}>Card Barcode</th>
                  <th style={{ padding: '10px 14px' }}>Initial Value</th>
                  <th style={{ padding: '10px 14px' }}>Current Balance</th>
                  <th style={{ padding: '10px 14px' }}>Expiry Date</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {giftCards.map((g) => (
                  <tr key={g.code} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 'bold' }}>
                      {g.code}
                    </td>
                    <td style={{ padding: '12px 14px' }}>₹{g.original}</td>
                    <td style={{ padding: '12px 14px', color: '#10b981', fontWeight: 'bold' }}>₹{g.balance}</td>
                    <td style={{ padding: '12px 14px' }}>{g.expiry}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ backgroundColor: '#065f46', color: '#a7f3d0', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Customer */}
      {showAddCustomerModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '8px', border: '1px solid #334155', width: '450px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#38bdf8' }}>Register New Customer</h3>
            <form onSubmit={handleAddCustomer}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Full Name:</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>10-Digit Mobile Phone:</label>
                <input
                  type="text"
                  required
                  placeholder="9840123456"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>GSTIN (Optional, for B2B buyer):</label>
                <input
                  type="text"
                  placeholder="33AAAAA0000A1Z5"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Khata Credit Limit (₹):</label>
                <input
                  type="number"
                  value={newCustLimit}
                  onChange={(e) => setNewCustLimit(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Khata Repayment */}
      {repayCustomer && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '8px', border: '1px solid #334155', width: '420px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#38bdf8' }}>Khata Credit Repayment</h3>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
              Customer: <strong style={{ color: '#fff' }}>{repayCustomer.name}</strong> (+91 {repayCustomer.phone})
              <br />
              Current Outstanding: <strong style={{ color: '#ef4444' }}>₹{repayCustomer.khataBalance.toLocaleString()}</strong>
            </div>

            {repaymentSuccess ? (
              <div style={{ backgroundColor: '#065f46', color: '#a7f3d0', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                {repaymentSuccess}
              </div>
            ) : (
              <form onSubmit={handleRepay}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Amount to Pay (₹):</label>
                  <input
                    type="number"
                    required
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '16px', fontWeight: 'bold' }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Payment Mode:</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['CASH', 'UPI', 'NEFT', 'CHEQUE'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setRepayMethod(m)}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          backgroundColor: repayMethod === m ? '#2563eb' : '#1e293b',
                          color: '#fff',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setRepayCustomer(null)}
                    style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '8px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Confirm Settlement
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
