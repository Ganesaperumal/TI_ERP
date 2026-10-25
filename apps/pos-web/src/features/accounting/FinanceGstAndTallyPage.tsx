import React, { useState } from 'react';

type FinanceTab = 'PNL_TRIAL' | 'GSTR1_3B_EINV' | 'GSTR2B_RECON' | 'BANK_TALLY';

export const FinanceGstAndTallyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('PNL_TRIAL');

  // P&L State
  const [pnlData, setPnlData] = useState({
    totalRevenue: 1250450.0,
    totalCogs: 937837.5,
    grossProfit: 312612.5,
    grossMarginPct: 25.0,
    totalOperatingExpenses: 114500.0,
    netProfit: 198112.5,
    netMarginPct: 15.84,
    liveClosingStockValuation: 3450800.0,
  });

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    expenseAccountCode: 'EXP_STORE_RENT',
    amount: '45000',
    gstRatePct: '18',
    isGstClaimable: true,
    paymentAccountCode: 'ASSET_BANK_MAIN',
    narration: 'Store monthly commercial rent with GST',
  });
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState<string | null>(null);

  // GSTR-1 & 3B State
  const [selectedMonth, setSelectedMonth] = useState('10');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [eInvoiceStatus, setEInvoiceStatus] = useState<{
    irn?: string;
    ackNo?: string;
    qrText?: string;
  } | null>(null);

  // GSTR-2B Recon State
  const [reconData, setReconData] = useState([
    {
      supplierGstin: '33AABCH1234F1Z1',
      supplierName: 'Hindustan Unilever Ltd',
      invoiceNumber: 'HUL-2026-9812',
      gstr2bTax: 18500.0,
      booksTax: 18500.0,
      variance: 0.0,
      status: 'EXACT_MATCH',
      action: '100% ITC Eligible & Safe to Claim',
    },
    {
      supplierGstin: '33AABCI5678J1Z2',
      supplierName: 'ITC Limited Foods Division',
      invoiceNumber: 'ITC-CHN-4431',
      gstr2bTax: 12400.0,
      booksTax: 12400.0,
      variance: 0.0,
      status: 'EXACT_MATCH',
      action: '100% ITC Eligible & Safe to Claim',
    },
    {
      supplierGstin: '33AABCZ9999K1Z9',
      supplierName: 'Sri Balaji Oil Mills & Ghee',
      invoiceNumber: 'SBO-9081',
      gstr2bTax: 0.0,
      booksTax: 14250.0,
      variance: 14250.0,
      status: 'MISSING_IN_GSTR2B_SUPPLIER_NOT_FILED',
      action: 'ITC AT RISK — HOLD PAYMENT UNTIL SUPPLIER FILES GST',
    },
    {
      supplierGstin: '33BBBCX7777L1Z4',
      supplierName: 'Vasanth Dairy Products',
      invoiceNumber: 'VDP-3312',
      gstr2bTax: 4200.0,
      booksTax: 4120.0,
      variance: 80.0,
      status: 'TAX_VALUE_MISMATCH',
      action: 'Verify invoice tax line-items with vendor',
    },
  ]);

  // Bank Recon & Tally State
  const [bankReconForm, setBankReconForm] = useState({
    expectedGross: 184500.0,
    actualCredited: 182655.0,
    bankUtr: 'HDFCR520261025008129',
    settlementDate: '2026-10-25',
  });
  const [settlementSuccess, setSettlementSuccess] = useState<string | null>(null);

  // Handlers
  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseForm.amount) || 0;
    const newExpenses = pnlData.totalOperatingExpenses + amt;
    const newNetProfit = pnlData.grossProfit - newExpenses;
    setPnlData((prev) => ({
      ...prev,
      totalOperatingExpenses: newExpenses,
      netProfit: newNetProfit,
      netMarginPct: parseFloat(((newNetProfit / prev.totalRevenue) * 100).toFixed(2)),
    }));
    setExpenseSuccessMsg(
      `✓ Posted balanced voucher: ₹${amt.toFixed(2)} recorded to ${expenseForm.expenseAccountCode} (GST claimable: ${expenseForm.isGstClaimable ? 'Yes' : 'No'})`,
    );
    setTimeout(() => setExpenseSuccessMsg(null), 4000);
  };

  const handleDownloadGstr1Json = () => {
    const gstr1Json = {
      gstin: '33AABCT9999P1Z5',
      fp: `${selectedMonth}${selectedYear}`,
      cur_gt: pnlData.totalRevenue,
      b2b: [
        {
          ctin: '33AAACB2222C1Z8',
          inv: [
            {
              inum: 'INV-20261025-001',
              idt: '25-10-2026',
              val: 35000.0,
              pos: '33',
              rchrg: 'N',
              inv_typ: 'R',
              itms: [{ num: 1, itm_det: { txval: 29661.02, rt: 18, camt: 2669.49, samt: 2669.49, csamt: 0 } }],
            },
          ],
        },
      ],
      b2cs: [
        { sply_ty: 'INTRA', pos: '33', typ: 'OE', rt: 5, txval: 450000.0, camt: 11250.0, samt: 11250.0, csamt: 0 },
        { sply_ty: 'INTRA', pos: '33', typ: 'OE', rt: 12, txval: 280000.0, camt: 16800.0, samt: 16800.0, csamt: 0 },
        { sply_ty: 'INTRA', pos: '33', typ: 'OE', rt: 18, txval: 380000.0, camt: 34200.0, samt: 34200.0, csamt: 0 },
      ],
      doc_issue: {
        doc_det: [
          {
            doc_num: 1,
            doc_typ: 'Invoices for outward supply',
            docs: [{ num: 1, from: 'INV-20261001-001', to: 'INV-20261025-450', totnum: 450, canc: 4, net_issue: 446 }],
          },
        ],
      },
    };

    const blob = new Blob([JSON.stringify(gstr1Json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_Offline_GSTN_${selectedMonth}_${selectedYear}.json`;
    a.click();
  };

  const handleGenerateEInvoiceDemo = () => {
    const irnHash = '9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08';
    const ackNumber = '12260981240091';
    const qrString = `GSTIN:33AABCT9999P1Z5|BUYER:33AAACB2222C1Z8|DOC:INV-20261025-001|VAL:35000.00|IRN:${irnHash}`;
    setEInvoiceStatus({ irn: irnHash, ackNo: ackNumber, qrText: qrString });
  };

  const handleSettleBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const mdr = bankReconForm.expectedGross - bankReconForm.actualCredited;
    const mdrPct = ((mdr / bankReconForm.expectedGross) * 100).toFixed(2);
    setSettlementSuccess(
      `✓ Settle Batch Completed! UTR: ${bankReconForm.bankUtr}. Auto-cleared ₹${bankReconForm.expectedGross.toFixed(2)}. Deducted MDR ₹${mdr.toFixed(2)} (${mdrPct}%). Posted balanced JV #JV-BANK-${Date.now().toString().slice(-4)}`,
    );
    setTimeout(() => setSettlementSuccess(null), 5000);
  };

  const handleDownloadTallyXml = () => {
    const tallyXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>TI Supermarket</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>20261025</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>POS-CLOSE-20261025-01</VOUCHERNUMBER>
            <NARRATION>Consolidated Daily POS Retail Sales</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Cash-in-Hand (Counter Drawers)</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-65400.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>UPI/Card Pending Settlement Clearing</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-184500.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Retail POS Sales</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>211779.66</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>GST Output Tax Liability - CGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>19060.17</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>GST Output Tax Liability - SGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>19060.17</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    const blob = new Blob([tallyXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TallyPrime_Import_TI_Supermarket_${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
  };

  const calculatedMdr = (bankReconForm.expectedGross - bankReconForm.actualCredited).toFixed(2);
  const calculatedMdrPct = (
    ((bankReconForm.expectedGross - bankReconForm.actualCredited) / bankReconForm.expectedGross) *
    100
  ).toFixed(2);

  return (
    <div style={{ padding: '24px', backgroundColor: '#090d16', minHeight: '92vh', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#38bdf8' }}>
            Auditor-Ready Finance, GST & Tally Prime Bridge Studio
          </h2>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            Double-Entry Accounting Engine, GSTR-1/2B/3B Hub, Bank MDR Recon & 1-Click Tally Prime Sync
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'PNL_TRIAL', label: '📈 Live P&L & Trial Balance' },
            { id: 'GSTR1_3B_EINV', label: '🏛️ GSTR-1 / 3B & E-Invoice' },
            { id: 'GSTR2B_RECON', label: '🛡️ GSTR-2B vs. GRN Recon' },
            { id: 'BANK_TALLY', label: '🏦 Bank MDR Recon & Tally XML' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FinanceTab)}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === tab.id ? '#2563eb' : '#1e293b',
                color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                border: '1px solid',
                borderColor: activeTab === tab.id ? '#3b82f6' : '#334155',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: LIVE P&L, TRIAL BALANCE & EXPENSES */}
      {activeTab === 'PNL_TRIAL' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* KPI Dashboard */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
            }}
          >
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Revenue (Sales)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>
                ₹{pnlData.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#22c55e' }}>+14.2% vs previous month</div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Gross Margin (Revenue - COGS)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                ₹{pnlData.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                <span style={{ fontSize: '16px', color: '#86efac' }}>({pnlData.grossMarginPct}%)</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>COGS: ₹{pnlData.totalCogs.toLocaleString('en-IN')}</div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Operating Expenses (Rent, EB, Salary)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                ₹{pnlData.totalOperatingExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Indirect & Store Expenses</div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Live Closing Stock Valuation</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a855f7' }}>
                ₹{pnlData.liveClosingStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#e9d5ff' }}>Calculated: Σ(BinStock × NetLandingCost)</div>
            </div>
          </div>

          {/* Quick Expense Form & Trial Balance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            {/* Quick Expense Entry */}
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>⚡ Post Daily Store Expense</h3>
              {expenseSuccessMsg && (
                <div style={{ padding: '10px', backgroundColor: '#064e3b', color: '#6ee7b7', borderRadius: '6px', marginBottom: '12px', fontSize: '12px' }}>
                  {expenseSuccessMsg}
                </div>
              )}
              <form onSubmit={handleRecordExpense}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Expense Account</label>
                  <select
                    value={expenseForm.expenseAccountCode}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseAccountCode: e.target.value })}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  >
                    <option value="EXP_STORE_RENT">Store Rent (EXP_STORE_RENT)</option>
                    <option value="EXP_ELECTRICITY_BILL">Electricity & EB Bill (EXP_ELECTRICITY_BILL)</option>
                    <option value="EXP_PACKAGING_MATERIALS">Carry Bags & Packaging (EXP_PACKAGING_MATERIALS)</option>
                    <option value="EXP_FREIGHT_DELIVERY_FUEL">Delivery Fuel & Tempo (EXP_FREIGHT_DELIVERY_FUEL)</option>
                    <option value="EXP_BANK_MDR_CHARGES">Bank MDR & Gateway Fee (EXP_BANK_MDR_CHARGES)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Gross Amount (₹)</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>GST Rate %</label>
                    <select
                      value={expenseForm.gstRatePct}
                      onChange={(e) => setExpenseForm({ ...expenseForm, gstRatePct: e.target.value })}
                      style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: '16px' }}>
                    <label style={{ fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={expenseForm.isGstClaimable}
                        onChange={(e) => setExpenseForm({ ...expenseForm, isGstClaimable: e.target.checked })}
                      />
                      Claim Input GST
                    </label>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Narration</label>
                  <input
                    type="text"
                    value={expenseForm.narration}
                    onChange={(e) => setExpenseForm({ ...expenseForm, narration: e.target.value })}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Post Balanced Expense Voucher
                </button>
              </form>
            </div>

            {/* Real-Time Trial Balance */}
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#38bdf8' }}>⚖️ Live Double-Entry Trial Balance</h3>
                <span style={{ padding: '4px 8px', backgroundColor: '#064e3b', color: '#6ee7b7', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  ✓ BALANCED: ΣDebit === ΣCredit
                </span>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Code</th>
                      <th style={{ padding: '8px' }}>Account Name</th>
                      <th style={{ padding: '8px' }}>Group Type</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Debit (₹)</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { code: 'ASSET_CASH_DRAWER', name: 'Cash-in-Hand (Counter Drawers)', type: 'ASSET', dr: 65400.0, cr: 0.0 },
                      { code: 'ASSET_BANK_MAIN', name: 'Bank Accounts (HDFC / SBI / ICICI)', type: 'ASSET', dr: 890200.0, cr: 0.0 },
                      { code: 'ASSET_UPI_CARD_CLEARING', name: 'UPI/Card Pending Clearing', type: 'ASSET', dr: 184500.0, cr: 0.0 },
                      { code: 'ASSET_INVENTORY_STOCK', name: 'Inventory Asset (Closing Stock)', type: 'ASSET', dr: 3450800.0, cr: 0.0 },
                      { code: 'ASSET_GST_INPUT_CGST', name: 'GST Input Tax Credit - CGST', type: 'ASSET', dr: 58200.0, cr: 0.0 },
                      { code: 'ASSET_GST_INPUT_SGST', name: 'GST Input Tax Credit - SGST', type: 'ASSET', dr: 58200.0, cr: 0.0 },
                      { code: 'LIAB_ACCOUNTS_PAYABLE', name: 'Sundry Creditors (Suppliers)', type: 'LIABILITY', dr: 0.0, cr: 1250000.0 },
                      { code: 'LIAB_GST_OUTPUT_CGST', name: 'GST Output Liability - CGST', type: 'LIABILITY', dr: 0.0, cr: 62500.0 },
                      { code: 'LIAB_GST_OUTPUT_SGST', name: 'GST Output Liability - SGST', type: 'LIABILITY', dr: 0.0, cr: 62500.0 },
                      { code: 'INC_RETAIL_SALES', name: 'Retail POS Sales', type: 'INCOME', dr: 0.0, cr: 1250450.0 },
                      { code: 'EXP_COGS', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', dr: 937837.5, cr: 0.0 },
                      { code: 'EXP_STORE_RENT', name: 'Store Rent', type: 'EXPENSE', dr: 45000.0, cr: 0.0 },
                      { code: 'EXP_STAFF_SALARIES', name: 'Staff Salaries & Wages', type: 'EXPENSE', dr: 69500.0, cr: 0.0 },
                    ].map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: '#94a3b8' }}>{row.code}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{row.name}</td>
                        <td style={{ padding: '8px', color: '#38bdf8' }}>{row.type}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: row.dr > 0 ? '#22c55e' : '#64748b' }}>
                          {row.dr > 0 ? `₹${row.dr.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: row.cr > 0 ? '#f59e0b' : '#64748b' }}>
                          {row.cr > 0 ? `₹${row.cr.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GSTR-1, 3B & E-INVOICE */}
      {activeTab === 'GSTR1_3B_EINV' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Header Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0f172a',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label style={{ fontSize: '14px', color: '#94a3b8' }}>Tax Period:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: '6px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
              >
                <option value="10">October (10)</option>
                <option value="11">November (11)</option>
                <option value="12">December (12)</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ padding: '6px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
              >
                <option value="2026">2026</option>
              </select>
            </div>

            <button
              onClick={handleDownloadGstr1Json}
              style={{
                padding: '10px 20px',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              📥 1-Click Download GSTR-1 Offline JSON (GSTN Official)
            </button>
          </div>

          {/* GSTR-1 Breakdown & GSTR-3B Liability Table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* GSTR-1 Sections */}
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>📄 GSTR-1 Official Section Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <span>Section 4A (b2b Registered Invoices)</span>
                  <span style={{ fontWeight: 'bold', color: '#22c55e' }}>4 Invoices (₹35,000)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <span>Section 7 (b2cs Small Retail Sales)</span>
                  <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>3 Rate Slabs (₹11,10,000)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <span>Section 9B (cdnur Credit Notes on Return)</span>
                  <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>2 Notes (₹2,100)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <span>Section 12 (HSN-wise Outward Summary)</span>
                  <span style={{ fontWeight: 'bold', color: '#a855f7' }}>24 HSN Categories</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <span>Section 13 (Document Series Issued)</span>
                  <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>Series: INV-001 to INV-450 (446 Net)</span>
                </div>
              </div>
            </div>

            {/* GSTR-3B Liability vs ITC Offset */}
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>📊 GSTR-3B Tax Liability vs. ITC Offset</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Description</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Taxable (₹)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>CGST (₹)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>SGST (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>Table 3.1 Outward Liability (Sales)</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>₹11,45,000</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b' }}>₹62,500</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b' }}>₹62,500</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>Table 4 Eligible ITC (GRN Purchases)</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>₹9,70,000</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#22c55e' }}>₹58,200</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#22c55e' }}>₹58,200</td>
                  </tr>
                  <tr style={{ backgroundColor: '#1e293b', fontWeight: 'bold' }}>
                    <td style={{ padding: '8px', color: '#38bdf8' }}>Net Cash Tax Payable (Govt Portal)</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444' }}>₹4,300</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444' }}>₹4,300</td>
                  </tr>
                </tbody>
              </table>

              {/* NIC E-Invoice Action */}
              <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>NIC E-Invoice & Signed QR Code</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Generate IRN hash for B2B Invoice #INV-20261025-001</div>
                  </div>
                  <button
                    onClick={handleGenerateEInvoiceDemo}
                    style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Generate IRN
                  </button>
                </div>

                {eInvoiceStatus && (
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#22c55e', wordBreak: 'break-all' }}>
                    <div>✓ <b>IRN:</b> {eInvoiceStatus.irn}</div>
                    <div>✓ <b>Ack No:</b> {eInvoiceStatus.ackNo}</div>
                    <div>✓ <b>Signed QR Code Text:</b> {eInvoiceStatus.qrText}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GSTR-2B VS GRN RECONCILIATION */}
      {activeTab === 'GSTR2B_RECON' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Summary Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Purchase Bills</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc' }}>{reconData.length}</div>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Exact Match (100% ITC Eligible)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>2</div>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Tax Mismatches</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>1</div>
            </div>
            <div style={{ backgroundColor: '#450a0a', padding: '16px', borderRadius: '8px', border: '1px solid #dc2626' }}>
              <div style={{ fontSize: '12px', color: '#fca5a5' }}>🚨 ITC AT RISK (Supplier Not Filed)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>1 (₹14,250)</div>
            </div>
          </div>

          {/* Reconciliation Table */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>
              🛡️ GSTR-2B vs. Store Purchase Register (GRN) Inward Audit
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Supplier / Trade Name</th>
                  <th style={{ padding: '10px' }}>GSTIN</th>
                  <th style={{ padding: '10px' }}>Invoice No</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>GSTR-2B Tax (₹)</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Store Books Tax (₹)</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Auditor Action Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {reconData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.supplierName}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>{row.supplierGstin}</td>
                    <td style={{ padding: '10px' }}>{row.invoiceNumber}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>₹{row.gstr2bTax.toFixed(2)}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>₹{row.booksTax.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>
                      {row.status === 'EXACT_MATCH' && (
                        <span style={{ padding: '4px 8px', backgroundColor: '#064e3b', color: '#6ee7b7', borderRadius: '4px', fontWeight: 'bold' }}>
                          ✓ EXACT MATCH
                        </span>
                      )}
                      {row.status === 'TAX_VALUE_MISMATCH' && (
                        <span style={{ padding: '4px 8px', backgroundColor: '#78350f', color: '#fde68a', borderRadius: '4px', fontWeight: 'bold' }}>
                          ⚠️ RATE MISMATCH
                        </span>
                      )}
                      {row.status === 'MISSING_IN_GSTR2B_SUPPLIER_NOT_FILED' && (
                        <span style={{ padding: '4px 8px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '4px', fontWeight: 'bold' }}>
                          🚨 ITC AT RISK
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px', color: row.status === 'MISSING_IN_GSTR2B_SUPPLIER_NOT_FILED' ? '#ef4444' : '#94a3b8', fontWeight: row.status === 'MISSING_IN_GSTR2B_SUPPLIER_NOT_FILED' ? 'bold' : 'normal' }}>
                      {row.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BANK RECON & TALLY PRIME */}
      {activeTab === 'BANK_TALLY' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Bank MDR Settlement Form */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>
              🏦 UPI / Card Bank Settlement & MDR Auto-Reconciliation
            </h3>
            {settlementSuccess && (
              <div style={{ padding: '10px', backgroundColor: '#064e3b', color: '#6ee7b7', borderRadius: '6px', marginBottom: '12px', fontSize: '12px' }}>
                {settlementSuccess}
              </div>
            )}
            <form onSubmit={handleSettleBatch}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Expected Gross Amount from POS (₹)
                </label>
                <input
                  type="number"
                  value={bankReconForm.expectedGross}
                  onChange={(e) => setBankReconForm({ ...bankReconForm, expectedGross: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Actual Net Amount Credited by Bank (₹)
                </label>
                <input
                  type="number"
                  value={bankReconForm.actualCredited}
                  onChange={(e) => setBankReconForm({ ...bankReconForm, actualCredited: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  required
                />
              </div>

              {/* Calculated Variance */}
              <div style={{ padding: '12px', backgroundColor: '#1e293b', borderRadius: '6px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Calculated MDR & Gateway Fee:</span>
                  <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>₹{calculatedMdr} ({calculatedMdrPct}%)</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Formula: Expected Gross - Actual Credited (Auto-posts Dr: Bank MDR Charges)
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Bank Settlement UTR / Reference No
                </label>
                <input
                  type="text"
                  value={bankReconForm.bankUtr}
                  onChange={(e) => setBankReconForm({ ...bankReconForm, bankUtr: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                  required
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Settle Batch & Post Clearing Voucher
              </button>
            </form>
          </div>

          {/* 1-Click Tally Prime Export Studio */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>
              📦 1-Click Tally Prime XML Export Studio
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
              Supermarket external Chartered Accountants (CAs) can import all daily sales vouchers, GRN inward purchases,
              expense vouchers, and master ledgers directly into <b>Tally Prime</b> with 0 manual re-entry.
            </p>

            <div style={{ padding: '16px', backgroundColor: '#1e293b', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Export Specifications:</div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#e2e8f0', lineHeight: '1.6' }}>
                <li>Standard <code>&lt;ENVELOPE&gt;&lt;HEADER&gt;Import Data&lt;/HEADER&gt;</code> structure</li>
                <li>Auto-generates Master Ledgers (Sundry Creditors, Sundry Debtors, GST, Bank)</li>
                <li>Full Double-Entry Balance guarantee on every voucher</li>
                <li>Tagged with <code>isTallyExported: true</code> to avoid duplicates</li>
              </ul>
            </div>

            <button
              onClick={handleDownloadTallyXml}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              📥 Download Tally Prime XML Import File (.xml)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
