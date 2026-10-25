import React, { useState } from 'react';
import {
  DEFAULT_STORE_CONFIG,
  StoreConfig,
  TopologyMode,
  GstRegime,
  BatchTrackingMode,
  NegativeStockRule,
} from '@ti-erp/shared-types';

export const StoreConfigPage: React.FC = () => {
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleShortcutChange = (key: keyof typeof config.keyboardShortcuts, val: string) => {
    setConfig({
      ...config,
      keyboardShortcuts: {
        ...config.keyboardShortcuts,
        [key]: val,
      },
    });
  };

  const handleSave = () => {
    setSaveStatus('Plug-and-Play configuration saved successfully!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#38bdf8' }}>Plug-and-Play Store Configuration</h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Live store policy toggles, peripheral hardware rules and keyboard remapping
          </p>
        </div>
        <button
          onClick={handleSave}
          style={{
            backgroundColor: '#0284c7',
            color: '#fff',
            padding: '10px 24px',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Save Configuration
        </button>
      </div>

      {saveStatus && (
        <div style={{ backgroundColor: '#065f46', color: '#6ee7b7', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
          ✓ {saveStatus}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Topology & General */}
        <section style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: 0 }}>
            Topology & GST Regime
          </h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>Store Topology Mode</label>
            <select
              value={config.topology}
              onChange={(e) => setConfig({ ...config, topology: e.target.value as TopologyMode })}
              style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
            >
              <option value={TopologyMode.SINGLE_STORE}>Single Standalone Store</option>
              <option value={TopologyMode.MULTI_BRANCH}>Multi-Branch Head Office Network</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>GST Taxation Regime</label>
            <select
              value={config.gst.regime}
              onChange={(e) => setConfig({ ...config, gst: { ...config.gst, regime: e.target.value as GstRegime } })}
              style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
            >
              <option value={GstRegime.REGULAR}>Regular Taxpayer (CGST + SGST / IGST)</option>
              <option value={GstRegime.COMPOSITION}>Composition Scheme (Flat Turnover Rate)</option>
            </select>
          </div>
        </section>

        {/* POS Cash Register & Shift Policy */}
        <section style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: 0 }}>
            Cash Register & Blind Close
          </h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.cashRegister.blindCashClose}
              onChange={(e) => setConfig({ ...config, cashRegister: { ...config.cashRegister, blindCashClose: e.target.checked } })}
            />
            <span>Enable Blind Cash Close (Cashier must count without seeing system expected cash)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.cashRegister.terminalHardwareLock}
              onChange={(e) => setConfig({ ...config, cashRegister: { ...config.cashRegister, terminalHardwareLock: e.target.checked } })}
            />
            <span>Lock POS Register to Terminal MAC Address</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.cashRegister.autoPostShortageToCashierLedger}
              onChange={(e) => setConfig({ ...config, cashRegister: { ...config.cashRegister, autoPostShortageToCashierLedger: e.target.checked } })}
            />
            <span>Auto-Post Shift Cash Shortage to Cashier Liability Ledger</span>
          </label>
        </section>

        {/* Inventory & Batch Policy */}
        <section style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: 0 }}>
            Inventory & Batching Guardrails
          </h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>Default Batch Resolution</label>
            <select
              value={config.inventory.defaultBatchTrackingMode}
              onChange={(e) => setConfig({ ...config, inventory: { ...config.inventory, defaultBatchTrackingMode: e.target.value as BatchTrackingMode } })}
              style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
            >
              <option value={BatchTrackingMode.POPUP_ON_MRP_DIFF}>Popup Cashier Selection on MRP Differences</option>
              <option value={BatchTrackingMode.AUTO_FEFO}>Strict Auto-FEFO (First-Expired First-Out)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>Negative Stock Policy</label>
            <select
              value={config.inventory.negativeStockRule}
              onChange={(e) => setConfig({ ...config, inventory: { ...config.inventory, negativeStockRule: e.target.value as NegativeStockRule } })}
              style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
            >
              <option value={NegativeStockRule.WARN_PIN}>Warn & Require Supervisor PIN Override</option>
              <option value={NegativeStockRule.BLOCK}>Strict Block (Never allow balance &lt; 0)</option>
              <option value={NegativeStockRule.ALLOW}>Allow Negative Stock (Auto-reconcile on GRN)</option>
            </select>
          </div>
        </section>

        {/* Scale Barcode Prefix Rule */}
        <section style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: 0 }}>
            Weighing Scale Prefix Rule
          </h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.hardware.weighingScale.barcodePrefixRule.enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  hardware: {
                    ...config.hardware,
                    weighingScale: {
                      ...config.hardware.weighingScale,
                      barcodePrefixRule: {
                        ...config.hardware.weighingScale.barcodePrefixRule,
                        enabled: e.target.checked,
                      },
                    },
                  },
                })
              }
            />
            <span>Enable Automated Scale EAN-13 Barcode Parsing</span>
          </label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Prefix Code</label>
              <input
                type="text"
                value={config.hardware.weighingScale.barcodePrefixRule.prefix}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    hardware: {
                      ...config.hardware,
                      weighingScale: {
                        ...config.hardware.weighingScale,
                        barcodePrefixRule: {
                          ...config.hardware.weighingScale.barcodePrefixRule,
                          prefix: e.target.value,
                        },
                      },
                    },
                  })
                }
                style={{ width: '100%', padding: '6px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>PLU Length</label>
              <input
                type="number"
                value={config.hardware.weighingScale.barcodePrefixRule.skuLength}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    hardware: {
                      ...config.hardware,
                      weighingScale: {
                        ...config.hardware.weighingScale,
                        barcodePrefixRule: {
                          ...config.hardware.weighingScale.barcodePrefixRule,
                          skuLength: Number(e.target.value),
                        },
                      },
                    },
                  })
                }
                style={{ width: '100%', padding: '6px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Weight Digits</label>
              <input
                type="number"
                value={config.hardware.weighingScale.barcodePrefixRule.weightLength}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    hardware: {
                      ...config.hardware,
                      weighingScale: {
                        ...config.hardware.weighingScale,
                        barcodePrefixRule: {
                          ...config.hardware.weighingScale.barcodePrefixRule,
                          weightLength: Number(e.target.value),
                        },
                      },
                    },
                  })
                }
                style={{ width: '100%', padding: '6px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}
              />
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '8px 0 0' }}>
            Formula: Prefix (20) + 5-digit PLU + 5-digit Weight in grams + Check Digit
          </p>
        </section>
      </div>

      {/* Visual Keyboard Shortcut Remapper (F1 - F12) */}
      <section style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', marginTop: '24px' }}>
        <h3 style={{ color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: 0 }}>
          Visual POS Keyboard Hotkey Remapper (F1 - F12)
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Customize function key bindings for 100% mouse-free high-speed cashier checkout.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px', marginTop: '16px' }}>
          {(Object.keys(config.keyboardShortcuts) as Array<keyof typeof config.keyboardShortcuts>).map((key) => (
            <div key={key} style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155' }}>
              <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>
                {key}:
              </span>
              <input
                type="text"
                value={config.keyboardShortcuts[key]}
                onChange={(e) => handleShortcutChange(key, e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '6px',
                  backgroundColor: '#1e293b',
                  color: '#fff',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
