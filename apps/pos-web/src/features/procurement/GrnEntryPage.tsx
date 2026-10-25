import React, { useState } from 'react';

export interface GrnLineItemRow {
  id: string;
  productId: string;
  productName: string;
  skuCode: string;
  uom: string;
  batchNumber: string;
  expiryDate: string;
  billedQty: number;
  freeQty: number;
  grossRate: number;
  tradeDiscountPct: number;
  cashDiscountPct: number;
  gstRatePct: number;
  targetMrp: number;
  retailSellingPrice: number;
  oldNetLandingCost: number;
  apportionedFreight: number;
  uomConversionFactor: number;
}

const INITIAL_GRN_LINES: GrnLineItemRow[] = [
  {
    id: '1',
    productId: 'p-1',
    productName: 'Dove Cream Beauty Bar 100g',
    skuCode: 'SKU-FMCG-DOVE',
    uom: 'PCS',
    batchNumber: 'HUL-B701',
    expiryDate: '2027-04-30',
    billedQty: 24,
    freeQty: 2, // 24+2 free scheme
    grossRate: 58.0,
    tradeDiscountPct: 5.0,
    cashDiscountPct: 2.0,
    gstRatePct: 18.0,
    targetMrp: 75.0,
    retailSellingPrice: 65.0,
    oldNetLandingCost: 46.5,
    apportionedFreight: 15.0,
    uomConversionFactor: 1,
  },
  {
    id: '2',
    productId: 'p-2',
    productName: 'Surf Excel Quick Wash 1kg',
    skuCode: 'SKU-FMCG-SURF',
    uom: 'PACK',
    batchNumber: 'SX-0992',
    expiryDate: '2027-08-31',
    billedQty: 12,
    freeQty: 0,
    grossRate: 152.0, // Cost increased from 135
    tradeDiscountPct: 3.0,
    cashDiscountPct: 0.0,
    gstRatePct: 18.0,
    targetMrp: 180.0,
    retailSellingPrice: 155.0, // Margin will dip below 15%
    oldNetLandingCost: 135.0,
    apportionedFreight: 20.0,
    uomConversionFactor: 1,
  },
];

export const GrnEntryPage: React.FC = () => {
  const [mode, setMode] = useState<'FAST_DIRECT' | 'THREE_WAY_MATCH'>('FAST_DIRECT');
  const [lines, setLines] = useState<GrnLineItemRow[]>(INITIAL_GRN_LINES);
  const [supplierName, setSupplierName] = useState('Hindustan Unilever Distributor Ltd');
  const [supplierGstin, setSupplierGstin] = useState('33AABCH1234F1Z5');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-HUL-8891');
  const [invoiceDate, setInvoiceDate] = useState('2026-10-25');
  const [totalFreight, setTotalFreight] = useState(35);
  const [targetMarginPct] = useState(15);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [ocrTextPrompt, setOcrTextPrompt] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Line item calculation helper
  const computeLine = (row: GrnLineItemRow) => {
    const grossVal = row.billedQty * row.grossRate;
    const tradeDisc = grossVal * (row.tradeDiscountPct / 100);
    const afterTrade = grossVal - tradeDisc;
    const cashDisc = afterTrade * (row.cashDiscountPct / 100);
    const taxable = afterTrade - cashDisc;
    const gstAmount = taxable * (row.gstRatePct / 100);
    const totalUnits = (row.billedQty + row.freeQty) * row.uomConversionFactor;

    // ITC regular regime: cost = (taxable + freight) / totalUnits
    const netCost = totalUnits > 0 ? (taxable + row.apportionedFreight) / totalUnits : 0;
    const actualMarginPct =
      row.retailSellingPrice > 0
        ? ((row.retailSellingPrice - netCost) / row.retailSellingPrice) * 100
        : 0;

    const costIncreased = row.oldNetLandingCost > 0 && netCost > row.oldNetLandingCost;
    const marginDipped = actualMarginPct < targetMarginPct;
    const isRedGuardrail = marginDipped || costIncreased;

    // Suggested price = cost / (1 - targetMarginPct/100)
    const suggestedPrice = Math.min(
      row.targetMrp,
      Number((netCost / (1 - targetMarginPct / 100)).toFixed(2)),
    );

    return {
      grossVal,
      tradeDisc,
      taxable,
      gstAmount,
      totalUnits,
      netCost: Number(netCost.toFixed(2)),
      actualMarginPct: Number(actualMarginPct.toFixed(1)),
      isRedGuardrail,
      costIncreased,
      suggestedPrice,
      lineTotal: taxable + gstAmount,
    };
  };

  const handleApplySuggestedPrice = (rowId: string, suggestedPrice: number) => {
    setLines((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, retailSellingPrice: suggestedPrice } : r)),
    );
  };

  const handleFieldChange = (rowId: string, field: keyof GrnLineItemRow, val: any) => {
    setLines((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: val } : r)),
    );
  };

  const handleSimulateAiOcr = () => {
    setAiProcessing(true);
    setTimeout(() => {
      const newLine: GrnLineItemRow = {
        id: Date.now().toString(),
        productId: 'p-3',
        productName: 'Aashirvaad Superior MP Sharbati Atta 5kg',
        skuCode: 'SKU-ATTA-005',
        uom: 'PACK',
        batchNumber: 'ITC-A99',
        expiryDate: '2027-02-28',
        billedQty: 10,
        freeQty: 1,
        grossRate: 285.0,
        tradeDiscountPct: 4.0,
        cashDiscountPct: 1.5,
        gstRatePct: 5.0,
        targetMrp: 350.0,
        retailSellingPrice: 310.0,
        oldNetLandingCost: 260.0,
        apportionedFreight: 10.0,
        uomConversionFactor: 1,
      };
      setLines((prev) => [...prev, newLine]);
      setAiProcessing(false);
      setAiModalOpen(false);
      setSuccessBanner('AI Invoice Scanned Successfully! Matched 1 new item with 10+1 free scheme and computed landed costs.');
    }, 1200);
  };

  const summary = lines.reduce(
    (acc, row) => {
      const c = computeLine(row);
      return {
        totalGross: acc.totalGross + c.grossVal,
        totalTaxable: acc.totalTaxable + c.taxable,
        totalGst: acc.totalGst + c.gstAmount,
        totalUnits: acc.totalUnits + c.totalUnits,
        redCount: acc.redCount + (c.isRedGuardrail ? 1 : 0),
        netPayable: acc.netPayable + c.lineTotal,
      };
    },
    { totalGross: 0, totalTaxable: 0, totalGst: 0, totalUnits: 0, redCount: 0, netPayable: 0 },
  );

  const handleFinalizeGrn = () => {
    setSuccessBanner(
      `GRN Successfully Inwarded! Generated ${summary.totalUnits} Barcode Stickers. Supplier balance updated (+₹${summary.netPayable.toFixed(2)}).`,
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', margin: 0, color: '#38bdf8' }}>
            Smart Inward GRN & True Net Landing Cost Calculator
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            5-Layer FMCG Scheme Engine (Free Qty, Trade & Cash Disc, Freight) + Red Margin Guardrail
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', backgroundColor: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
            <button
              onClick={() => setMode('FAST_DIRECT')}
              style={{
                padding: '6px 14px',
                backgroundColor: mode === 'FAST_DIRECT' ? '#2563eb' : 'transparent',
                color: mode === 'FAST_DIRECT' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
              }}
            >
              ⚡ Fast Direct Bill
            </button>
            <button
              onClick={() => setMode('THREE_WAY_MATCH')}
              style={{
                padding: '6px 14px',
                backgroundColor: mode === 'THREE_WAY_MATCH' ? '#2563eb' : 'transparent',
                color: mode === 'THREE_WAY_MATCH' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
              }}
            >
              🏢 Enterprise 3-Way Match
            </button>
          </div>

          {/* AI Scan Button */}
          <button
            onClick={() => setAiModalOpen(true)}
            style={{
              padding: '10px 18px',
              backgroundColor: '#9333ea',
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
            <span>🤖 AI Scan Bill / CSV</span>
          </button>
        </div>
      </div>

      {successBanner && (
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
          <span>{successBanner}</span>
          <button
            onClick={() => setSuccessBanner(null)}
            style={{ background: 'none', border: 'none', color: '#a7f3d0', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Bill Header Form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          backgroundColor: '#1e293b',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #334155',
        }}
      >
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Supplier Name
          </label>
          <input
            type="text"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Supplier GSTIN
          </label>
          <input
            type="text"
            value={supplierGstin}
            onChange={(e) => setSupplierGstin(e.target.value)}
            style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Invoice No
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Invoice Date
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Freight / Unloading (₹)
          </label>
          <input
            type="number"
            value={totalFreight}
            onChange={(e) => setTotalFreight(Number(e.target.value))}
            style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
          />
        </div>
      </div>

      {/* Red Guardrail Alert Banner */}
      {summary.redCount > 0 && (
        <div
          style={{
            backgroundColor: '#7f1d1d',
            border: '1px solid #ef4444',
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <strong style={{ color: '#fca5a5' }}>
              Red Margin Guardrail Triggered ({summary.redCount} items)!
            </strong>
            <div style={{ fontSize: '12px', color: '#fecaca' }}>
              Distributor cost increases or discounts caused your gross margin to drop below {targetMarginPct}%. Click "Apply Suggested Price" to maintain your store profit margin before billing!
            </div>
          </div>
        </div>
      )}

      {/* Live Costing Table */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflowX: 'auto', border: '1px solid #334155' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
              <th style={{ padding: '12px 10px' }}>Item & SKU</th>
              <th style={{ padding: '12px 10px' }}>Batch / Exp</th>
              <th style={{ padding: '12px 10px' }}>Billed Qty</th>
              <th style={{ padding: '12px 10px' }}>Free Qty</th>
              <th style={{ padding: '12px 10px' }}>Gross Rate (₹)</th>
              <th style={{ padding: '12px 10px' }}>Trade Disc %</th>
              <th style={{ padding: '12px 10px' }}>Cash Disc %</th>
              <th style={{ padding: '12px 10px' }}>GST %</th>
              <th style={{ padding: '12px 10px', color: '#38bdf8' }}>True Net Cost (₹)</th>
              <th style={{ padding: '12px 10px' }}>Old Cost (₹)</th>
              <th style={{ padding: '12px 10px' }}>MRP (₹)</th>
              <th style={{ padding: '12px 10px' }}>Margin %</th>
              <th style={{ padding: '12px 10px', color: '#fbbf24' }}>Store Selling Price (₹)</th>
              <th style={{ padding: '12px 10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((row) => {
              const c = computeLine(row);
              const isRed = c.isRedGuardrail;

              return (
                <tr
                  key={row.id}
                  style={{
                    backgroundColor: isRed ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                    borderBottom: '1px solid #334155',
                    borderLeft: isRed ? '4px solid #ef4444' : '4px solid transparent',
                  }}
                >
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{row.productName}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{row.skuCode} | {row.uom}</div>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <input
                      type="text"
                      value={row.batchNumber}
                      onChange={(e) => handleFieldChange(row.id, 'batchNumber', e.target.value)}
                      style={{ width: '80px', padding: '4px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                    />
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{row.expiryDate}</div>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <input
                      type="number"
                      value={row.billedQty}
                      onChange={(e) => handleFieldChange(row.id, 'billedQty', Number(e.target.value))}
                      style={{ width: '60px', padding: '4px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                    />
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <input
                      type="number"
                      value={row.freeQty}
                      onChange={(e) => handleFieldChange(row.id, 'freeQty', Number(e.target.value))}
                      style={{ width: '50px', padding: '4px', backgroundColor: '#0f172a', border: '1px solid #10b981', borderRadius: '4px', color: '#10b981', fontWeight: 'bold', fontSize: '12px' }}
                    />
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <input
                      type="number"
                      value={row.grossRate}
                      onChange={(e) => handleFieldChange(row.id, 'grossRate', Number(e.target.value))}
                      style={{ width: '70px', padding: '4px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                    />
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <input
                      type="number"
                      value={row.tradeDiscountPct}
                      onChange={(e) => handleFieldChange(row.id, 'tradeDiscountPct', Number(e.target.value))}
                      style={{ width: '50px', padding: '4px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                    />
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <input
                      type="number"
                      value={row.cashDiscountPct}
                      onChange={(e) => handleFieldChange(row.id, 'cashDiscountPct', Number(e.target.value))}
                      style={{ width: '50px', padding: '4px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                    />
                  </td>
                  <td style={{ padding: '12px 10px' }}>{row.gstRatePct}%</td>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#38bdf8' }}>
                    ₹{c.netCost.toFixed(2)}
                    {c.costIncreased && (
                      <span style={{ fontSize: '10px', color: '#ef4444', display: 'block' }}>
                        ▲ +₹{(c.netCost - row.oldNetLandingCost).toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 10px', color: '#94a3b8' }}>₹{row.oldNetLandingCost.toFixed(2)}</td>
                  <td style={{ padding: '12px 10px' }}>₹{row.targetMrp.toFixed(2)}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: c.actualMarginPct < targetMarginPct ? '#7f1d1d' : '#064e3b',
                        color: c.actualMarginPct < targetMarginPct ? '#fca5a5' : '#a7f3d0',
                        fontWeight: 'bold',
                        fontSize: '11px',
                      }}
                    >
                      {c.actualMarginPct}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <input
                      type="number"
                      value={row.retailSellingPrice}
                      onChange={(e) => handleFieldChange(row.id, 'retailSellingPrice', Number(e.target.value))}
                      style={{
                        width: '80px',
                        padding: '6px',
                        backgroundColor: isRed ? '#450a0a' : '#0f172a',
                        border: isRed ? '1px solid #ef4444' : '1px solid #fbbf24',
                        borderRadius: '4px',
                        color: '#fbbf24',
                        fontWeight: 'bold',
                        fontSize: '13px',
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    {isRed && (
                      <button
                        onClick={() => handleApplySuggestedPrice(row.id, c.suggestedPrice)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⚡ Apply ₹{c.suggestedPrice}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bill Footer & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          backgroundColor: '#0f172a',
          padding: '20px 24px',
          borderRadius: '8px',
          border: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
          <div>
            <span style={{ color: '#94a3b8' }}>Total Billed Base: </span>
            <strong style={{ color: '#fff' }}>₹{summary.totalTaxable.toFixed(2)}</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>GST Total: </span>
            <strong style={{ color: '#fff' }}>₹{summary.totalGst.toFixed(2)}</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Freight: </span>
            <strong style={{ color: '#fff' }}>₹{totalFreight.toFixed(2)}</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Received Units: </span>
            <strong style={{ color: '#10b981' }}>{summary.totalUnits} Units</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Net Payable: </span>
            <strong style={{ color: '#38bdf8', fontSize: '18px' }}>
              ₹{(summary.netPayable + totalFreight).toFixed(2)}
            </strong>
          </div>
        </div>

        <button
          onClick={handleFinalizeGrn}
          style={{
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          ✓ Inward GRN & Print {summary.totalUnits} Stickers
        </button>
      </div>

      {/* AI OCR Modal */}
      {aiModalOpen && (
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
              maxWidth: '600px',
              width: '100%',
              border: '1px solid #475569',
            }}
          >
            <h3 style={{ margin: '0 0 12px', color: '#9333ea', fontSize: '20px' }}>
              🤖 BYOK AI Purchase Invoice OCR
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>
              Upload a distributor bill photo/PDF or paste invoice CSV. The AI will extract all line items, resolve scheme discounts, match your catalog, and flag red margin dips.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Invoice Image / PDF Upload:
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Or Paste Distributor CSV / Text:
              </label>
              <textarea
                rows={4}
                value={ocrTextPrompt}
                onChange={(e) => setOcrTextPrompt(e.target.value)}
                placeholder="ItemName, Barcode, BilledQty, FreeQty, Rate, MRP..."
                style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setAiModalOpen(false)}
                style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSimulateAiOcr}
                disabled={aiProcessing}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#9333ea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: aiProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {aiProcessing ? 'Extracting & Matching SKU...' : 'Run AI OCR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
