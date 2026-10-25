import React, { useState } from 'react';

type SubTab = 'AGING' | 'DEBIT_NOTES' | 'CONSIGNMENT';

export interface SupplierBill {
  id: string;
  supplierName: string;
  invoiceNo: string;
  billDate: string;
  netPayable: number;
  paymentTermsDays: number;
  ageDays: number;
  daysUntilDue: number;
  isDueSoon: boolean;
  isOverdue: boolean;
  isEarlyCdEligible: boolean;
  earlyDiscountAmount: number;
}

export interface DamagedItem {
  id: string;
  supplierName: string;
  supplierId: string;
  productName: string;
  skuCode: string;
  batchNumber: string;
  expiryDate?: string;
  returnReason: 'DAMAGED' | 'EXPIRED';
  quantity: number;
  unitCost: number;
  claimableAmount: number;
}

const DEMO_BILLS: SupplierBill[] = [
  {
    id: 'b-1',
    supplierName: 'Hindustan Unilever Distributor Ltd',
    invoiceNo: 'INV-HUL-9812',
    billDate: '2026-10-22',
    netPayable: 45200,
    paymentTermsDays: 30,
    ageDays: 3,
    daysUntilDue: 27,
    isDueSoon: false,
    isOverdue: false,
    isEarlyCdEligible: true,
    earlyDiscountAmount: 904, // 2% CD
  },
  {
    id: 'b-2',
    supplierName: 'ITC Regional Trade Ltd',
    invoiceNo: 'INV-ITC-4412',
    billDate: '2026-09-27',
    netPayable: 28400,
    paymentTermsDays: 30,
    ageDays: 28,
    daysUntilDue: 2,
    isDueSoon: true,
    isOverdue: false,
    isEarlyCdEligible: false,
    earlyDiscountAmount: 0,
  },
  {
    id: 'b-3',
    supplierName: 'Nestle India Wholesale',
    invoiceNo: 'INV-NES-1029',
    billDate: '2026-09-20',
    netPayable: 16800,
    paymentTermsDays: 30,
    ageDays: 35,
    daysUntilDue: -5,
    isDueSoon: false,
    isOverdue: true,
    isEarlyCdEligible: false,
    earlyDiscountAmount: 0,
  },
];

const DEMO_DAMAGED_ITEMS: DamagedItem[] = [
  {
    id: 'd-1',
    supplierName: 'Hindustan Unilever Distributor Ltd',
    supplierId: 'supp-1',
    productName: 'Dove Cream Beauty Bar 100g (Pushed/Leaked)',
    skuCode: 'SKU-FMCG-DOVE',
    batchNumber: 'HUL-B600',
    expiryDate: '2026-11-15',
    returnReason: 'DAMAGED',
    quantity: 6,
    unitCost: 46.5,
    claimableAmount: 279.0,
  },
  {
    id: 'd-2',
    supplierName: 'Nestle India Wholesale',
    supplierId: 'supp-3',
    productName: 'Maggi 2-Minute Noodles 280g (Expired)',
    skuCode: 'SKU-MAGGI-280',
    batchNumber: 'NES-X88',
    expiryDate: '2026-10-10',
    returnReason: 'EXPIRED',
    quantity: 14,
    unitCost: 32.0,
    claimableAmount: 448.0,
  },
];

export const SuppliersAndReturnsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SubTab>('AGING');
  const [bills, setBills] = useState<SupplierBill[]>(DEMO_BILLS);
  const [damagedItems, setDamagedItems] = useState<DamagedItem[]>(DEMO_DAMAGED_ITEMS);
  const [settlementMode, setSettlementMode] = useState<'DEDUCT_FROM_NEXT_PAYMENT' | 'FREE_REPLACEMENT_TRACKER'>('DEDUCT_FROM_NEXT_PAYMENT');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Consignment state
  const [consignmentVendor, setConsignmentVendor] = useState('Organic Farmers Collective (Consignment)');
  const [commissionPct, setCommissionPct] = useState(15);
  const [consignmentSales] = useState([
    { item: 'Cold Pressed Sesame Oil 500ml', soldQty: 18, sellingPrice: 220, total: 3960 },
    { item: 'A2 Vedic Desi Ghee 500ml', soldQty: 12, sellingPrice: 650, total: 7800 },
    { item: 'Raw Forest Wild Honey 250g', soldQty: 25, sellingPrice: 180, total: 4500 },
  ]);

  const totalConsignmentSales = consignmentSales.reduce((acc, i) => acc + i.total, 0);
  const storeCommissionAmount = totalConsignmentSales * (commissionPct / 100);
  const netVendorPayout = totalConsignmentSales - storeCommissionAmount;

  const handleCreateDebitNote = (item: DamagedItem) => {
    setActionMessage(
      `GST Debit Note DN-${Date.now().toString().slice(-6)} created for ₹${item.claimableAmount.toFixed(2)} to ${item.supplierName}! Mode: ${settlementMode}. Stock removed from DAMAGED_RETURNABLE bin.`,
    );
    setDamagedItems((prev) => prev.filter((d) => d.id !== item.id));
  };

  const handleSettleConsignment = () => {
    setActionMessage(
      `Consignment Settlement CS-${Date.now().toString().slice(-6)} approved! Vendor Payout: ₹${netVendorPayout.toFixed(2)} (Store commission: ₹${storeCommissionAmount.toFixed(2)} @ ${commissionPct}%).`,
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', margin: 0, color: '#38bdf8' }}>
            Supplier Ledger, GST Debit Notes & Consignment Payouts
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Payable Aging, 7-Day Early Cash Discount Alerts & Vendor-Managed Inventory Settlements
          </p>
        </div>

        {/* Sub Tabs */}
        <div style={{ display: 'flex', backgroundColor: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
          <button
            onClick={() => setActiveTab('AGING')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'AGING' ? '#2563eb' : 'transparent',
              color: activeTab === 'AGING' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            📊 Payables & Cash Discount
          </button>
          <button
            onClick={() => setActiveTab('DEBIT_NOTES')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'DEBIT_NOTES' ? '#2563eb' : 'transparent',
              color: activeTab === 'DEBIT_NOTES' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            📦 Damaged / Expired Returns
          </button>
          <button
            onClick={() => setActiveTab('CONSIGNMENT')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'CONSIGNMENT' ? '#2563eb' : 'transparent',
              color: activeTab === 'CONSIGNMENT' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            🤝 Consignment Pay-On-Sale
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#064e3b',
            border: '1px solid #10b981',
            borderRadius: '8px',
            color: '#a7f3d0',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', color: '#a7f3d0', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: PAYABLES & CASH DISCOUNT */}
      {activeTab === 'AGING' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Outstanding Payables</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>
                ₹{bills.reduce((acc, b) => acc + b.netPayable, 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Eligible for 2% Early Cash Discount</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                Save ₹{bills.reduce((acc, b) => acc + b.earlyDiscountAmount, 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Bills Due Within 2 Days</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24', marginTop: '4px' }}>
                {bills.filter((b) => b.isDueSoon).length} Bills
              </div>
            </div>
            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Overdue Bills</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444', marginTop: '4px' }}>
                {bills.filter((b) => b.isOverdue).length} Overdue
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflowX: 'auto', border: '1px solid #334155' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px' }}>Supplier</th>
                  <th style={{ padding: '12px' }}>Invoice No</th>
                  <th style={{ padding: '12px' }}>Bill Date</th>
                  <th style={{ padding: '12px' }}>Age (Days)</th>
                  <th style={{ padding: '12px' }}>Due In</th>
                  <th style={{ padding: '12px' }}>Amount (₹)</th>
                  <th style={{ padding: '12px', color: '#10b981' }}>Early Cash Disc (2%)</th>
                  <th style={{ padding: '12px' }}>Net If Paid Today</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#f1f5f9' }}>{bill.supplierName}</td>
                    <td style={{ padding: '12px' }}>{bill.invoiceNo}</td>
                    <td style={{ padding: '12px' }}>{bill.billDate}</td>
                    <td style={{ padding: '12px' }}>{bill.ageDays} Days</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          color: bill.isOverdue ? '#ef4444' : bill.isDueSoon ? '#fbbf24' : '#94a3b8',
                          fontWeight: 'bold',
                        }}
                      >
                        {bill.isOverdue ? `Overdue by ${Math.abs(bill.daysUntilDue)}d` : `${bill.daysUntilDue} days`}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>₹{bill.netPayable.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px' }}>
                      {bill.isEarlyCdEligible ? (
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                          Save ₹{bill.earlyDiscountAmount}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b' }}>Expired</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: '#38bdf8', fontWeight: 'bold' }}>
                      ₹{(bill.netPayable - bill.earlyDiscountAmount).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {bill.isEarlyCdEligible && (
                        <span style={{ padding: '3px 8px', backgroundColor: '#064e3b', color: '#a7f3d0', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                          ⚡ CD ELIGIBLE
                        </span>
                      )}
                      {bill.isDueSoon && (
                        <span style={{ padding: '3px 8px', backgroundColor: '#854d0e', color: '#fef08a', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                          ⚠️ DUE IN 2 DAYS
                        </span>
                      )}
                      {bill.isOverdue && (
                        <span style={{ padding: '3px 8px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                          ⛔ OVERDUE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DAMAGED / EXPIRED RETURNS */}
      {activeTab === 'DEBIT_NOTES' && (
        <div>
          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #334155',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#38bdf8' }}>
                Unclaimed Returnable Stock Tracker (Bin: DAMAGED_RETURNABLE)
              </h3>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>
                Items automatically detected from customer returns or expired batches mapped to supplier.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Settlement Mode:</label>
              <select
                value={settlementMode}
                onChange={(e) => setSettlementMode(e.target.value as any)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                <option value="DEDUCT_FROM_NEXT_PAYMENT">Deduct From Next Payment (Reduces Payable)</option>
                <option value="FREE_REPLACEMENT_TRACKER">Free Physical Replacement Tracker</option>
              </select>
            </div>
          </div>

          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflowX: 'auto', border: '1px solid #334155' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px' }}>Product & SKU</th>
                  <th style={{ padding: '12px' }}>Supplier</th>
                  <th style={{ padding: '12px' }}>Batch / Exp</th>
                  <th style={{ padding: '12px' }}>Reason</th>
                  <th style={{ padding: '12px' }}>Qty in Bin</th>
                  <th style={{ padding: '12px' }}>Unit Landed Cost (₹)</th>
                  <th style={{ padding: '12px', color: '#ef4444' }}>Claimable Amount (₹)</th>
                  <th style={{ padding: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {damagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No damaged or expired goods currently pending return.
                    </td>
                  </tr>
                ) : (
                  damagedItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{item.productName}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.skuCode}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#cbd5e1' }}>{item.supplierName}</td>
                      <td style={{ padding: '12px' }}>
                        <div>{item.batchNumber}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.expiryDate}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            backgroundColor: item.returnReason === 'DAMAGED' ? '#7f1d1d' : '#854d0e',
                            color: item.returnReason === 'DAMAGED' ? '#fca5a5' : '#fef08a',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '11px',
                          }}
                        >
                          {item.returnReason}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.quantity} Units</td>
                      <td style={{ padding: '12px' }}>₹{item.unitCost.toFixed(2)}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#ef4444' }}>
                        ₹{item.claimableAmount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => handleCreateDebitNote(item)}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          ⚡ 1-Click Debit Note
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONSIGNMENT PAYOUTS */}
      {activeTab === 'CONSIGNMENT' && (
        <div>
          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #334155',
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}
          >
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Consignment Vendor
              </label>
              <input
                type="text"
                value={consignmentVendor}
                onChange={(e) => setConsignmentVendor(e.target.value)}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Store Commission %
              </label>
              <input
                type="number"
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value))}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Settlement Cycle
              </label>
              <div style={{ padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#a7f3d0', fontSize: '12px' }}>
                Last 30 Days POS Sold Units
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflowX: 'auto', border: '1px solid #334155', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px' }}>Consignment Product</th>
                  <th style={{ padding: '12px' }}>POS Units Sold</th>
                  <th style={{ padding: '12px' }}>Retail Selling Price (₹)</th>
                  <th style={{ padding: '12px' }}>Total Sales Value (₹)</th>
                  <th style={{ padding: '12px' }}>Store Commission ({commissionPct}%)</th>
                  <th style={{ padding: '12px', color: '#10b981' }}>Vendor Net Payout (₹)</th>
                </tr>
              </thead>
              <tbody>
                {consignmentSales.map((c, idx) => {
                  const comm = c.total * (commissionPct / 100);
                  const payout = c.total - comm;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.item}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.soldQty} Units</td>
                      <td style={{ padding: '12px' }}>₹{c.sellingPrice.toFixed(2)}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>₹{c.total.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', color: '#38bdf8' }}>₹{comm.toFixed(2)}</td>
                      <td style={{ padding: '12px', color: '#10b981', fontWeight: 'bold' }}>₹{payout.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0f172a',
              padding: '20px 24px',
              borderRadius: '8px',
              border: '1px solid #334155',
            }}
          >
            <div style={{ display: 'flex', gap: '30px', fontSize: '14px' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Total Sales: </span>
                <strong style={{ color: '#fff' }}>₹{totalConsignmentSales.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Store Profit ({commissionPct}%): </span>
                <strong style={{ color: '#38bdf8' }}>₹{storeCommissionAmount.toFixed(2)}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Net Vendor Payout: </span>
                <strong style={{ color: '#10b981', fontSize: '18px' }}>₹{netVendorPayout.toFixed(2)}</strong>
              </div>
            </div>

            <button
              onClick={handleSettleConsignment}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✓ Generate Consignment Settlement Voucher
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
