import React, { useState } from 'react';

type SubTab = 'AI_COPILOT' | 'DEAD_STOCK_COMBOS' | 'SYNC_AND_MIGRATION';

export const AiCopilotAndSyncPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('AI_COPILOT');

  // Tab 1: AI Copilot & Transliteration State
  const [aiQuestion, setAiQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<
    Array<{ sender: 'USER' | 'AI'; text: string; data?: any }>
  >([
    {
      sender: 'AI',
      text: 'Vanakkam! I am your TI-ERP Commercial Intelligence Copilot. Ask me questions about today\'s sales, cashier voids, supplier ITC risks, or dead-stock clearance in plain English or Tamil.',
    },
  ]);
  const [isAiQuerying, setIsAiQuerying] = useState(false);

  // Transliteration State
  const [transliterateInput, setTransliterateInput] = useState('Ponni Boiled Rice 5kg');
  const [targetLang, setTargetLang] = useState('ta-IN');
  const [transliteratedResult, setTransliteratedResult] = useState('பொன்னி புழுங்கல் அரிசி 5 கிலோ');

  // Tab 2: Clearance Combos State
  const [combos, setCombos] = useState([
    {
      id: 'COMBO-01',
      title: 'South Indian Breakfast Kit',
      slowItem: 'Nestle Everyday Dairy Whitener 400g (Exp: 18d)',
      anchorItem: 'Tata Tea Gold 500g (Fast Mover)',
      originalPrice: 420,
      comboPrice: 345,
      discountPct: 18,
      stockToClear: 32,
      marginRecovery: 4680,
      status: 'READY_TO_ACTIVATE',
    },
    {
      id: 'COMBO-02',
      title: 'Sambhar & Rice Festival Pack',
      slowItem: 'Aachi Sambar Powder 500g (Exp: 35d)',
      anchorItem: 'Ponni Boiled Rice 5kg Bag (Fast Mover)',
      originalPrice: 495,
      comboPrice: 420,
      discountPct: 15,
      stockToClear: 24,
      marginRecovery: 3240,
      status: 'READY_TO_ACTIVATE',
    },
    {
      id: 'COMBO-03',
      title: 'Baking & Sweet Treats Combo',
      slowItem: 'Bakers Cocoa Powder 100g (Exp: 25d)',
      anchorItem: 'Refined White Sugar 1kg (Fast Mover)',
      originalPrice: 175,
      comboPrice: 135,
      discountPct: 23,
      stockToClear: 45,
      marginRecovery: 2850,
      status: 'ACTIVE',
    },
  ]);
  const [promoActivatedMessage, setPromoActivatedMessage] = useState<string | null>(null);

  // Tab 3: LAN Sync & Migration State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'HEALTHY' | 'SYNCING'>('HEALTHY');
  const [lastSyncTime, setLastSyncTime] = useState('Just now (13:50 IST)');
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  // Handler for AI Queries
  const handleAskQuestion = (presetText?: string) => {
    const q = presetText || aiQuestion;
    if (!q.trim()) return;

    setChatHistory((prev) => [...prev, { sender: 'USER', text: q }]);
    if (!presetText) setAiQuestion('');
    setIsAiQuerying(true);

    setTimeout(() => {
      let answer = '';
      const lower = q.toLowerCase();

      if (lower.includes('profit') || lower.includes('margin')) {
        answer =
          '**Top 5 Gross Profit Contributors This Month:**\n' +
          '1. **Gold Winner Sunflower Oil 1L** — Gross Profit: ₹42,120 (Margin: 24.8%)\n' +
          '2. **Premium Toor Dal 1kg** — Gross Profit: ₹31,450 (Margin: 28.2%)\n' +
          '3. **Aashirvaad Shudh Chakki Atta 5kg** — Gross Profit: ₹26,800 (Margin: 21.5%)\n' +
          '4. **Tata Tea Gold 500g** — Gross Profit: ₹18,900 (Margin: 26.0%)\n' +
          '5. **Ponni Boiled Rice 5kg** — Gross Profit: ₹16,400 (Margin: 19.2%)\n\n' +
          '*Actionable Insight:* Increasing stock on Toor Dal and Sunflower Oil will optimize store margin as customer repeat velocity is highest on these staples.';
      } else if (lower.includes('void') || lower.includes('counter 2') || lower.includes('theft')) {
        answer =
          '**Cashier & Counter Audit Analysis:**\n' +
          '• **Counter 2 (Cashier: Priya M.)** recorded 3 Line Voids totaling ₹840.00.\n' +
          '• **Details:** Item "Dairy Whitener 400g" was scanned twice accidentally and voided before tender.\n' +
          '• **Supervisor Approval:** Auto-cleared under supervisor PIN threshold (< ₹1,000).\n' +
          '• **Status:** Clean — No cash discrepancy or untracked drawer open events.';
      } else if (lower.includes('itc') || lower.includes('supplier') || lower.includes('gst')) {
        answer =
          '**GSTR-2B Input Tax Credit (ITC) Risk Audit:**\n' +
          '• **Sri Meenakshi Traders:** ₹14,280 ITC at risk (GSTR-1 not filed by supplier for September).\n' +
          '• **Southern FMCG Distributors:** ₹8,450 ITC matched with 2 paise rounding variance.\n' +
          '• *Recommendation:* System has auto-held ₹14,280 on Meenakshi Traders outstanding vendor ledger until GSTR-2B reflection.';
      } else {
        answer =
          `Real-time analysis for "${q}":\n` +
          'Current Store Sales are trending +14.2% higher than weekly target. Stock velocity index is healthy at 94.2%. Zero critical stock-outs in Top 100 FMCG SKUs.';
      }

      setChatHistory((prev) => [...prev, { sender: 'AI', text: answer }]);
      setIsAiQuerying(false);
    }, 600);
  };

  // Handler for Transliteration
  const handleTransliterate = () => {
    const text = transliterateInput.trim();
    if (!text) return;

    const dictionary: Record<string, Record<string, string>> = {
      'Ponni Boiled Rice 5kg': {
        'ta-IN': 'பொன்னி புழுங்கல் அரிசி 5 கிலோ',
        'hi-IN': 'पोन्नी उबले चावल 5 किलो',
        'kn-IN': 'ಪೊನ್ನಿ ಕುದಿಸಿದ ಅಕ್ಕಿ 5 ಕೆಜಿ',
        'te-IN': 'పొన్ని ఉడికించిన బియ్యం 5 కేజీలు',
        'ml-IN': 'പൊന്നി പുഴുക്കലരി 5 കിലോഗ്രാം',
      },
      'Toor Dal 1kg': {
        'ta-IN': 'துவரம் பருப்பு 1 கிலோ',
        'hi-IN': 'अरहर / तूर दाल 1 किलो',
        'kn-IN': 'ತೊಗರಿ ಬೇಳೆ 1 ಕೆಜಿ',
        'te-IN': 'కందిపప్పు 1 కేజీ',
        'ml-IN': 'തുവര പരിപ്പ് 1 കിലോഗ്രാം',
      },
      'Idhayam Gingelly Oil 1L': {
        'ta-IN': 'இதயம் நல்லெண்ணெய் 1 லிட்டர்',
        'hi-IN': 'इधयम तिल का तेल 1 लीटर',
        'kn-IN': 'ಇದಯಂ ಎಳ್ಳೆಣ್ಣೆ 1 ಲೀಟರ್',
        'te-IN': 'ఇదయం నువ్వుల నూనె 1 లీటరు',
        'ml-IN': 'ഇദയം നല്ലെണ്ണ 1 ലിറ്റർ',
      },
      'Refined White Sugar 1kg': {
        'ta-IN': 'சுத்திகரிக்கப்பட்ட வெள்ளை சர்க்கரை 1 கிலோ',
        'hi-IN': 'सफेद चीनी 1 किलो',
        'kn-IN': 'ಸಕ್ಕರೆ 1 ಕೆಜಿ',
        'te-IN': 'తెల్ల పంచదార 1 కేజీ',
        'ml-IN': 'പഞ്ചസാര 1 കിലോഗ്രാം',
      },
    };

    const match = dictionary[text];
    if (match && match[targetLang]) {
      setTransliteratedResult(match[targetLang]);
    } else {
      // General transliteration fallback
      setTransliteratedResult(`${text} (${targetLang === 'ta-IN' ? 'தமிழில் மொழிபெயர்க்கப்பட்டது' : 'अनुवादित'})`);
    }
  };

  // Handler for Combo Activation
  const handleActivateCombo = (comboId: string) => {
    setCombos((prev) =>
      prev.map((c) => (c.id === comboId ? { ...c, status: 'ACTIVE' } : c)),
    );
    const activated = combos.find((c) => c.id === comboId);
    setPromoActivatedMessage(
      `✓ Promotion Rule "${activated?.title}" is now ACTIVE on all POS counters! Cashiers scanning these items will automatically apply ₹${(activated?.originalPrice ?? 0) - (activated?.comboPrice ?? 0)} combo discount.`,
    );
    setTimeout(() => setPromoActivatedMessage(null), 5000);
  };

  // Handler for LAN to Cloud Sync
  const handleTriggerSync = () => {
    setIsSyncing(true);
    setSyncStatus('SYNCING');
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus('HEALTHY');
      setLastSyncTime('Just now');
    }, 1200);
  };

  // Handler for Legacy ERP Migration
  const handleRunMigration = (source: string) => {
    setMigrationStatus(`Starting migration parser for ${source}... Reading sample items, vouchers and customer ledgers.`);
    setTimeout(() => {
      setMigrationStatus(`✓ Successfully migrated ${source}! Imported: 1,420 Items, 45 Suppliers, 310 Customer Khata accounts with zero balance discrepancies.`);
      setTimeout(() => setMigrationStatus(null), 6000);
    }, 1500);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
            AI Copilot, Dead-Stock Cleanser & Cloud Sync Engine
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            BYOK AI Natural Language Analytics • Clearance Combos • Bilingual Transliteration • LAN-to-Cloud Model-B
          </p>
        </div>

        {/* Sub-Tab Switcher */}
        <div style={{ display: 'flex', backgroundColor: '#1e293b', padding: '4px', borderRadius: '8px', gap: '4px' }}>
          <button
            onClick={() => setActiveSubTab('AI_COPILOT')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeSubTab === 'AI_COPILOT' ? '#2563eb' : 'transparent',
              color: activeSubTab === 'AI_COPILOT' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ✨ Ask Supermarket & Transliterate
          </button>
          <button
            onClick={() => setActiveSubTab('DEAD_STOCK_COMBOS')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeSubTab === 'DEAD_STOCK_COMBOS' ? '#2563eb' : 'transparent',
              color: activeSubTab === 'DEAD_STOCK_COMBOS' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🎯 Dead-Stock & Expiry Combos
          </button>
          <button
            onClick={() => setActiveSubTab('SYNC_AND_MIGRATION')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeSubTab === 'SYNC_AND_MIGRATION' ? '#2563eb' : 'transparent',
              color: activeSubTab === 'SYNC_AND_MIGRATION' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ☁️ LAN-Cloud Sync & ERP Migrator
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: ASK SUPERMARKET & REGIONAL TRANSLITERATOR           */}
      {/* ============================================================== */}
      {activeSubTab === 'AI_COPILOT' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
          {/* Left Column: Natural Language AI Copilot */}
          <div style={{ backgroundColor: '#131b2e', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', height: '620px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✨</span> Ask My Supermarket Natural Language Copilot
              </h3>
              <span style={{ fontSize: '11px', color: '#38bdf8', backgroundColor: '#0c4a6e', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                Live PostgreSQL Query Engine
              </span>
            </div>

            {/* Quick Suggested Queries */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '4px' }}>
              {[
                'Which items gave highest profit?',
                'Why were items voided at Counter 2?',
                'Which suppliers have GST ITC at risk?',
                'Show fast moving staples today',
              ].map((pill) => (
                <button
                  key={pill}
                  onClick={() => handleAskQuestion(pill)}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#93c5fd',
                    border: '1px solid #334155',
                    padding: '5px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Chat History View */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === 'USER' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    backgroundColor: msg.sender === 'USER' ? '#2563eb' : '#0f172a',
                    color: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: msg.sender === 'USER' ? 'none' : '1px solid #1e293b',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </div>
              ))}
              {isAiQuerying && (
                <div style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', padding: '8px' }}>
                  Querying live sales ledgers, shift drawers and GSTR data...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ask in English or Tamil (e.g., Which supplier has ITC mismatch?)"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskQuestion();
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handleAskQuestion()}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Send
              </button>
            </div>
          </div>

          {/* Right Column: Regional Language Transliterator */}
          <div style={{ backgroundColor: '#131b2e', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b', height: '620px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🌐</span> Bilingual Regional Transliterator & Tag Generator
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#94a3b8' }}>
              Instantly convert English FMCG product names to accurate regional scripts for dual-language shelf labels and thermal receipts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  English Product Name:
                </label>
                <input
                  type="text"
                  value={transliterateInput}
                  onChange={(e) => setTransliterateInput(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Ponni Boiled Rice 5kg', 'Toor Dal 1kg', 'Idhayam Gingelly Oil 1L', 'Refined White Sugar 1kg'].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setTransliterateInput(item);
                    }}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#cbd5e1',
                      border: '1px solid #334155',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Target Regional Language:
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ta-IN">🇮🇳 Tamil (தமிழ்)</option>
                  <option value="hi-IN">🇮🇳 Hindi (हिंदी)</option>
                  <option value="kn-IN">🇮🇳 Kannada (ಕನ್ನಡ)</option>
                  <option value="te-IN">🇮🇳 Telugu (తెలుగు)</option>
                  <option value="ml-IN">🇮🇳 Malayalam (മലയാളം)</option>
                </select>
              </div>

              <button
                onClick={handleTransliterate}
                style={{
                  backgroundColor: '#4338ca',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px',
                }}
              >
                Transliterate Script Now
              </button>

              {/* Transliteration Result Box */}
              <div
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  padding: '16px',
                  borderRadius: '8px',
                  marginTop: '8px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  REGIONAL SCRIPT OUTPUT:
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#38bdf8' }}>
                  {transliteratedResult}
                </div>
              </div>

              {/* Thermal Receipt Preview Box */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  padding: '14px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  border: '1px dashed #94a3b8',
                }}
              >
                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>--- SHELF TAG PREVIEW ---</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '6px' }}>{transliterateInput}</div>
                <div style={{ fontSize: '13px', color: '#334155' }}>{transliteratedResult}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  <span>MRP: ₹340.00</span>
                  <span style={{ fontWeight: 'bold', color: '#b91c1c' }}>OUR PRICE: ₹310.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: AI DEAD-STOCK & CLEARANCE COMBOS                     */}
      {/* ============================================================== */}
      {activeSubTab === 'DEAD_STOCK_COMBOS' && (
        <div>
          {promoActivatedMessage && (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#34d399',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              {promoActivatedMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {combos.map((combo) => (
              <div
                key={combo.id}
                style={{
                  backgroundColor: '#131b2e',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>{combo.id}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontWeight: '700',
                        backgroundColor: combo.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: combo.status === 'ACTIVE' ? '#34d399' : '#60a5fa',
                      }}
                    >
                      {combo.status === 'ACTIVE' ? '✓ LIVE ON POS' : 'READY TO DEPLOY'}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 14px', fontSize: '16px', color: '#f8fafc' }}>{combo.title}</h4>

                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                    <div style={{ color: '#f87171', marginBottom: '6px' }}>
                      <b>Slow / Near-Expiry:</b> {combo.slowItem}
                    </div>
                    <div style={{ color: '#34d399' }}>
                      <b>Fast Anchor Staple:</b> {combo.anchorItem}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px', fontSize: '12px' }}>
                    <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px' }}>
                      <div style={{ color: '#94a3b8' }}>ORIGINAL COMBINED</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', textDecoration: 'line-through', color: '#64748b' }}>
                        ₹{combo.originalPrice}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px' }}>
                      <div style={{ color: '#94a3b8' }}>OFFER COMBO PRICE</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8' }}>
                        ₹{combo.comboPrice} <span style={{ fontSize: '12px', color: '#10b981' }}>(-{combo.discountPct}%)</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                    <span>Target Clearance: <b>{combo.stockToClear} units</b></span>
                    <span>Est. Margin Recovery: <b style={{ color: '#10b981' }}>₹{combo.marginRecovery.toLocaleString()}</b></span>
                  </div>
                </div>

                <button
                  disabled={combo.status === 'ACTIVE'}
                  onClick={() => handleActivateCombo(combo.id)}
                  style={{
                    backgroundColor: combo.status === 'ACTIVE' ? '#1e293b' : '#059669',
                    color: combo.status === 'ACTIVE' ? '#94a3b8' : '#fff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: combo.status === 'ACTIVE' ? 'default' : 'pointer',
                  }}
                >
                  {combo.status === 'ACTIVE' ? '✓ Promo Rule Active on Terminals' : '⚡ Activate Promotion Rule'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: LAN-TO-CLOUD SYNC & LEGACY ERP MIGRATOR             */}
      {/* ============================================================== */}
      {activeSubTab === 'SYNC_AND_MIGRATION' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* LAN to Cloud Model-B Sync Panel */}
          <div style={{ backgroundColor: '#131b2e', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>☁️</span> Model-B LAN-to-Cloud Sync Engine
              </h3>
              <span
                style={{
                  backgroundColor: '#064e3b',
                  color: '#34d399',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '700',
                }}
              >
                ONLINE & SYNCED
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>LOCAL STORE LAN SERVER</div>
                <div style={{ fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>192.168.1.100:3000 (SQLite / PostgreSQL Edge)</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>CENTRAL HEAD OFFICE CLOUD</div>
                <div style={{ fontWeight: '700', color: '#38bdf8', marginTop: '2px' }}>https://cloud.tierp.in/api/v1 (AWS Mumbai Multi-AZ)</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>OUTBOX PENDING</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>0 Records</div>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>LAST PUSH / PULL</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>{lastSyncTime}</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#94a3b8' }}>
                <div>• <b>Deterministic Conflict Policy:</b> Mutable masters resolve via <code>[syncVersion DESC, updatedAt DESC]</code>.</div>
                <div style={{ marginTop: '4px' }}>• <b>Ledger Transactions:</b> Invoices, payments and inventory ledgers are append-only with idempotent UUID keys.</div>
              </div>

              <button
                disabled={isSyncing}
                onClick={handleTriggerSync}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: isSyncing ? 'default' : 'pointer',
                  marginTop: '8px',
                }}
              >
                {isSyncing ? 'Syncing Outbox with Cloud HO...' : '🔄 Force Sync Outbox & Pull Cloud Masters'}
              </button>
            </div>
          </div>

          {/* Legacy ERP Migrator Panel */}
          <div style={{ backgroundColor: '#131b2e', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📥</span> 1-Click Legacy ERP Data Importer
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#94a3b8' }}>
              Migrate master data, opening stock batches, and customer/supplier balance sheets from existing software:
            </p>

            {migrationStatus && (
              <div
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid #3b82f6',
                  color: '#93c5fd',
                  padding: '10px',
                  borderRadius: '6px',
                  marginBottom: '14px',
                  fontSize: '12px',
                }}
              >
                {migrationStatus}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { name: 'Tally Prime / ERP 9 (XML & SDF Export)', desc: 'Ledger Masters, Chart of Accounts, Party Balances', key: 'Tally' },
                { name: 'GoFrugal RPOS (CSV / Excel)', desc: 'Item Masters, Barcodes, Selling Prices, Stock Batches', key: 'GoFrugal' },
                { name: 'Marg ERP 9+ (DBF / CSV)', desc: 'Supplier Invoices, Customer Khatas, Drug / Food Licenses', key: 'Marg' },
                { name: 'Generic Excel / CSV Template', desc: 'Standard 12-column supermarket product import format', key: 'CSV' },
              ].map((template) => (
                <div
                  key={template.name}
                  style={{
                    backgroundColor: '#0f172a',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #1e293b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#f8fafc' }}>{template.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{template.desc}</div>
                  </div>
                  <button
                    onClick={() => handleRunMigration(template.key)}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#38bdf8',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: '700',
                    }}
                  >
                    Import
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
