/**
 * TI-ERP Universal API Client for POS Web & Retail Terminal
 * Features auto-fallback to seeded demo data when backend is offline
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  isOfflineDemo?: boolean;
  error?: string;
}

const API_BASE = 'http://localhost:3000/api/v1';

async function safeFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackData: T,
): Promise<ApiResponse<T>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    return {
      success: true,
      data: json,
      isOfflineDemo: false,
    };
  } catch (err: any) {
    console.warn(`[API Client] Falling back to offline demo data for ${endpoint}:`, err?.message || err);
    return {
      success: true,
      data: fallbackData,
      isOfflineDemo: true,
      error: err?.message,
    };
  }
}

export const posApiClient = {
  /**
   * Health Check
   */
  async checkHealth(): Promise<{ connected: boolean; role?: string }> {
    try {
      const res = await fetch('http://localhost:3000/', { method: 'GET', signal: AbortSignal.timeout(2000) });
      return { connected: res.ok };
    } catch {
      return { connected: false };
    }
  },

  /**
   * Barcode & Scale PLU Lookup
   */
  async lookupProduct(code: string, branchId = 'BR_MAIN') {
    return safeFetch(
      `/catalog/lookup?code=${encodeURIComponent(code)}&branchId=${encodeURIComponent(branchId)}`,
      { method: 'GET' },
      {
        resolvedBy: 'LOCAL_OFFLINE_CACHE',
        product: {
          id: 'prod-mock-1',
          skuCode: 'SKU-FMCG-001',
          nameEn: 'Parle-G Gold Glucose Biscuit 1kg',
          nameRegional: 'பார்லே-ஜி பிஸ்கட் 1கிலோ',
          baseUom: 'PACK',
        },
      },
    );
  },

  /**
   * Evaluate Cart Promotions & Upsell Slab Nudges
   */
  async evaluatePromotions(cartTotal: number, items: any[] = []) {
    return safeFetch(
      `/pos/promotions/evaluate`,
      {
        method: 'POST',
        body: JSON.stringify({ cartTotal, items }),
      },
      {
        appliedDiscount: cartTotal >= 1000 ? 100 : 0,
        nudgeText:
          cartTotal < 1000
            ? `Add ₹${(1000 - cartTotal).toFixed(2)} more to unlock flat ₹100 Weekend Super Saver!`
            : '✓ Weekend Super Saver Applied (-₹100.00)',
      },
    );
  },

  /**
   * Complete POS Bill Checkout
   */
  async completeCheckout(payload: any) {
    return safeFetch(
      `/pos/billing/checkout`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      {
        invoiceId: `INV-${Date.now().toString().slice(-6)}`,
        invoiceNumber: `BILL-${Math.floor(1000 + Math.random() * 9000)}`,
        netPayable: payload?.netPayable ?? 345.0,
        status: 'PAID',
        createdAt: new Date().toISOString(),
      },
    );
  },

  /**
   * Cashier Shifts: Open Shift
   */
  async openShift(terminalId: string, cashierId: string, openingFloat: number) {
    return safeFetch(
      `/pos/shifts/open`,
      {
        method: 'POST',
        body: JSON.stringify({ terminalId, cashierId, openingFloat }),
      },
      {
        shiftId: `SHIFT-${Date.now().toString().slice(-4)}`,
        status: 'OPEN',
        openingFloat,
      },
    );
  },

  /**
   * Cashier Shifts: Blind Close
   */
  async blindCloseShift(shiftId: string, physicalCount: number) {
    return safeFetch(
      `/pos/shifts/blind-close`,
      {
        method: 'POST',
        body: JSON.stringify({ shiftId, physicalCount }),
      },
      {
        shiftId,
        status: 'CLOSED',
        variance: physicalCount - 5000,
      },
    );
  },

  /**
   * AI Copilot: Natural Language Query
   */
  async askAiCopilot(question: string, branchId = 'BR_MAIN') {
    return safeFetch(
      `/ai-copilot/ask-supermarket`,
      {
        method: 'POST',
        body: JSON.stringify({ tenantId: 'TI_CORP', branchId, question }),
      },
      {
        answer: `AI Analysis for "${question}": Today's sales run at +14.2% with zero stock-out events across Top 100 FMCG lines.`,
      },
    );
  },
};
