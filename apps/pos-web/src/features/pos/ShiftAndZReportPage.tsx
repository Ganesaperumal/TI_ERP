import React, { useState } from 'react';

export const ShiftAndZReportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'BLIND_CLOSE' | 'Z_REPORT'>('BLIND_CLOSE');

  // Register state
  const [terminalCode, setTerminalCode] = useState('POS-01');
  const [cashierName, setCashierName] = useState('Shanmugam');
  const [shiftNumber, setShiftNumber] = useState(4);
  const [openingFloat, setOpeningFloat] = useState(2000);
  const [safeDropAmount, setSafeDropAmount] = useState(0);
  const [totalSafeDrops, setTotalSafeDrops] = useState(5000);

  // Blind Denominations
  const [denoms, setDenoms] = useState<Record<string, number>>({
    '500': 18, // 9,000
    '200': 15, // 3,000
    '100': 24, // 2,400
    '50': 12,  // 600
    '20': 10,  // 200
    '10': 15,  // 150
    coins: 45, // 45
  });

  const multipliers: Record<string, number> = {
    '2000': 2000,
    '500': 500,
    '200': 200,
    '100': 100,
    '50': 50,
    '20': 20,
    '10': 10,
    '5': 5,
    coins: 1,
  };

  const physicalCashCounted = Object.entries(denoms).reduce((acc, [key, count]) => {
    const mult = multipliers[key] || 1;
    return acc + (count || 0) * mult;
  }, 0);

  // System expected numbers (mocked from actual sales)
  const systemSalesCash = 18500;
  const systemCashRefunds = 150;
  const expectedSystemCash = openingFloat + systemSalesCash - systemCashRefunds - totalSafeDrops; // 2000 + 18500 - 150 - 5000 = 15350
  const shortageOrExcess = physicalCashCounted - expectedSystemCash; // 15395 - 15350 = +45 (excess)

  const [zReportData, setZReportData] = useState<any>(null);

  const handleDenomChange = (key: string, val: number) => {
    setDenoms((prev) => ({ ...prev, [key]: Math.max(0, val) }));
  };

  const handleExecuteSafeDrop = () => {
    if (safeDropAmount <= 0) return;
    setTotalSafeDrops((prev) => prev + safeDropAmount);
    alert(`₹${safeDropAmount} safely transferred to Manager Safe. Cash drawer count updated.`);
    setSafeDropAmount(0);
  };

  const handleSubmitBlindClose = () => {
    const report = {
      zReportNumber: `Z-20261025-${terminalCode}-S${shiftNumber}`,
      terminalCode,
      shiftNumber,
      cashierName,
      openedAt: '2026-10-25 08:30:00',
      closedAt: new Date().toLocaleString(),
      openingFloat,
      totalSafeDrops,
      expectedCash: expectedSystemCash,
      physicalCash: physicalCashCounted,
      variance: shortageOrExcess,
      isShortage: shortageOrExcess < 0,
      tenders: [
        { method: 'Cash (Drawer)', amount: systemSalesCash - systemCashRefunds },
        { method: 'UPI / Bharat QR', amount: 28450 },
        { method: 'EDC Credit/Debit Card', amount: 14200 },
        { method: 'Sodexo Meal Pass', amount: 3200 },
        { method: 'Credit Note Redeemed', amount: 450 },
      ],
      gstBreakup: [
        { slab: '0% (Exempt Produce)', taxable: 8400, tax: 0 },
        { slab: '5% (Staples / Spices)', taxable: 14500, tax: 725 },
        { slab: '12% (Packaged Dairy / Dry Fruits)', taxable: 18200, tax: 2184 },
        { slab: '18% (Personal Care / Detergents)', taxable: 22400, tax: 4032 },
        { slab: '28% (Beverages / Confectionery)', taxable: 3100, tax: 868 },
      ],
      totalBills: 142,
      voidCancelledBills: 2,
      grossSales: 66800,
      discounts: 2150,
      netSales: 64650,
      cogs: 51200,
      grossProfit: 13450,
      grossMarginPct: 20.8,
    };

    setZReportData(report);
    setActiveTab('Z_REPORT');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header & Sub-Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', margin: 0, color: '#38bdf8' }}>
            Cashier Register, Mid-Day Safe Drops & Blind Close Z-Report
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Anti-Theft Denomination Counter + Automatic Cashier Shortage Payroll Khata Debit
          </p>
        </div>

        <div style={{ display: 'flex', backgroundColor: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
          <button
            onClick={() => setActiveTab('REGISTER')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'REGISTER' ? '#2563eb' : 'transparent',
              color: activeTab === 'REGISTER' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            🏢 Shift Controls & Safe Drops
          </button>
          <button
            onClick={() => setActiveTab('BLIND_CLOSE')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'BLIND_CLOSE' ? '#2563eb' : 'transparent',
              color: activeTab === 'BLIND_CLOSE' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            💰 Blind Cash Denomination Close
          </button>
          {zReportData && (
            <button
              onClick={() => setActiveTab('Z_REPORT')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === 'Z_REPORT' ? '#2563eb' : 'transparent',
                color: activeTab === 'Z_REPORT' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
              }}
            >
              📄 Printable Z-Report
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: SHIFT CONTROLS & SAFE DROPS */}
      {activeTab === 'REGISTER' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Active Shift Card */}
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#38bdf8' }}>Active Shift Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Terminal ID:</span>
                <span style={{ fontWeight: 'bold' }}>{terminalCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Cashier Name:</span>
                <span style={{ fontWeight: 'bold' }}>{cashierName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Shift Number:</span>
                <span style={{ fontWeight: 'bold' }}>Shift #{shiftNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Opening Cash Float:</span>
                <span style={{ fontWeight: 'bold', color: '#10b981' }}>₹{openingFloat.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Cumulative Safe Drops:</span>
                <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>₹{totalSafeDrops.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Safe Drop Action Card */}
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#fbbf24' }}>Mid-Day Cash Safe Drop</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>
              Handover excess drawer cash to store manager safe to minimize counter theft risk.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Drop Amount (₹):
              </label>
              <input
                type="number"
                value={safeDropAmount}
                onChange={(e) => setSafeDropAmount(Number(e.target.value))}
                placeholder="e.g. 5000"
                style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
              />
            </div>
            <button
              onClick={handleExecuteSafeDrop}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#f59e0b',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Handover Cash to Safe & Log Audit
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: BLIND CASH DENOMINATION CLOSE */}
      {activeTab === 'BLIND_CLOSE' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
          {/* Denomination Note Calculator */}
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#38bdf8' }}>
              Physical Cash Denomination Counter
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px' }}>
              Cashier must enter physical note counts without seeing system totals (Blind Close policy).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {Object.keys(denoms).map((denomKey) => {
                const mult = multipliers[denomKey] || 1;
                const count = denoms[denomKey] || 0;
                const subTot = count * mult;

                return (
                  <div
                    key={denomKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#0f172a',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                    }}
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '14px', minWidth: '70px' }}>
                      {denomKey === 'coins' ? 'Coins' : `₹${denomKey}`}
                    </span>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => handleDenomChange(denomKey, Number(e.target.value))}
                      style={{
                        width: '70px',
                        padding: '6px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        color: '#fff',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}
                    />
                    <span style={{ color: '#38bdf8', fontSize: '13px', minWidth: '70px', textAlign: 'right' }}>
                      ₹{subTot.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Blind Close Submission Panel */}
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#10b981' }}>Shift Settlement Summary</h3>

              <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>PHYSICAL CASH COUNTED:</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                  ₹{physicalCashCounted.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  System will compute variance vs sales upon submission.
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.8' }}>
                <div>• Terminal: <b>{terminalCode}</b></div>
                <div>• Cashier: <b>{cashierName}</b></div>
                <div>• Shift: <b>Shift #{shiftNumber}</b></div>
                <div>• Opening Float: <b>₹{openingFloat}</b></div>
                <div>• Safe Drops Logged: <b>₹{totalSafeDrops}</b></div>
              </div>
            </div>

            <button
              onClick={handleSubmitBlindClose}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#10b981',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '24px',
              }}
            >
              🔒 Submit Blind Close & Generate Z-Report
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: PRINTABLE Z-REPORT VIEW */}
      {activeTab === 'Z_REPORT' && zReportData && (
        <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #475569', fontSize: '13px' }}>
          {/* Variance Banner */}
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              marginBottom: '20px',
              backgroundColor: zReportData.isShortage ? '#7f1d1d' : '#064e3b',
              border: `1px solid ${zReportData.isShortage ? '#ef4444' : '#10b981'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong style={{ color: zReportData.isShortage ? '#fca5a5' : '#a7f3d0' }}>
                {zReportData.isShortage ? '⚠️ CASHIER SHORTAGE DETECTED' : '✅ BALANCED / EXCESS REGISTER'}
              </strong>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                {zReportData.isShortage
                  ? `Shortage of ₹${Math.abs(zReportData.variance).toFixed(2)} automatically debited to Cashier's Grocery/Advance Khata.`
                  : `Drawer balanced with ₹${zReportData.variance.toFixed(2)} positive variance.`}
              </div>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: zReportData.isShortage ? '#fca5a5' : '#a7f3d0' }}>
              {zReportData.variance >= 0 ? `+₹${zReportData.variance}` : `-₹${Math.abs(zReportData.variance)}`}
            </div>
          </div>

          {/* Printable Receipt Layout */}
          <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '8px', border: '1px dashed #334155', fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>TI SUPERMARKET</div>
              <div>Z-REPORT #{zReportData.zReportNumber}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Terminal: {zReportData.terminalCode} | Cashier: {zReportData.cashierName} (S#{zReportData.shiftNumber})
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Closed: {zReportData.closedAt}
              </div>
            </div>

            {/* Sales Totals */}
            <div style={{ borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Gross Sales:</span>
                <span>₹{zReportData.grossSales.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discounts:</span>
                <span style={{ color: '#10b981' }}>-₹{zReportData.discounts.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', color: '#38bdf8', marginTop: '4px' }}>
                <span>NET SALES:</span>
                <span>₹{zReportData.netSales.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                <span>COGS: ₹{zReportData.cogs.toFixed(2)} | Gross Profit: ₹{zReportData.grossProfit.toFixed(2)} ({zReportData.grossMarginPct}%)</span>
              </div>
            </div>

            {/* Tenders Breakdown */}
            <div style={{ borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>TENDERS SETTLED:</div>
              {zReportData.tenders.map((t: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>{t.method}:</span>
                  <span>₹{t.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Cash Drawer Reconciliation */}
            <div style={{ borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>CASH RECONCILIATION:</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Opening Float:</span>
                <span>₹{zReportData.openingFloat.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Mid-Day Safe Drops:</span>
                <span style={{ color: '#f59e0b' }}>-₹{zReportData.totalSafeDrops.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Expected System Cash:</span>
                <span>₹{zReportData.expectedCash.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Physical Cash Counted:</span>
                <span style={{ fontWeight: 'bold', color: '#10b981' }}>₹{zReportData.physicalCash.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '4px', color: zReportData.isShortage ? '#ef4444' : '#10b981' }}>
                <span>VARIANCE:</span>
                <span>{zReportData.variance >= 0 ? `+₹${zReportData.variance}` : `-₹${Math.abs(zReportData.variance)}`}</span>
              </div>
            </div>

            {/* GST Summary */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>GST BREAKUP:</div>
              {zReportData.gstBreakup.map((g: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                  <span>{g.slab}:</span>
                  <span>Taxable: ₹{g.taxable} | Tax: ₹{g.tax}</span>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
              *** END OF Z-REPORT ***
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => window.print()}
              style={{ padding: '10px 22px', backgroundColor: '#38bdf8', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🖨️ Print 80mm ESC/POS Z-Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
