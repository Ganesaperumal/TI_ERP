/**
 * TI-ERP Cloud Admin & SaaS Universal API Client
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
    console.warn(`[Cloud API Client] Falling back to offline demo data for ${endpoint}:`, err?.message || err);
    return {
      success: true,
      data: fallbackData,
      isOfflineDemo: true,
      error: err?.message,
    };
  }
}

export const cloudApiClient = {
  /**
   * Health Check
   */
  async checkHealth(): Promise<{ connected: boolean }> {
    try {
      const res = await fetch('http://localhost:3000/', { method: 'GET', signal: AbortSignal.timeout(2000) });
      return { connected: res.ok };
    } catch {
      return { connected: false };
    }
  },

  /**
   * Live Owner Dashboard Aggregates
   */
  async getLiveDashboard(tenantId = 'TI_CORP', branchId?: string) {
    const q = branchId ? `?tenantId=${tenantId}&branchId=${branchId}` : `?tenantId=${tenantId}`;
    return safeFetch(
      `/owner/live-dashboard${q}`,
      { method: 'GET' },
      {
        kpis: {
          todayRevenue: 148920,
          todayTaxableSales: 132450,
          todayBillCount: 428,
          averageBasketValue: 348,
          grossProfitAmount: 31870,
          grossProfitPct: 21.4,
        },
        tenderSplits: [
          { method: 'UPI', amount: 68450, pct: 46 },
          { method: 'CASH', amount: 56120, pct: 38 },
          { method: 'CARD', amount: 14200, pct: 9 },
          { method: 'CUSTOMER_KHATA', amount: 6400, pct: 4 },
        ],
      },
    );
  },

  /**
   * Generate 10:30 PM Nightly Closing WhatsApp Report
   */
  async generateNightlyClosingReport(tenantId = 'TI_CORP', branchId?: string) {
    return safeFetch(
      `/owner/generate-nightly-closing-report`,
      {
        method: 'POST',
        body: JSON.stringify({ tenantId, branchId }),
      },
      {
        success: true,
        whatsappFormattedMessage: '📊 *TI-ERP SUPERMARKET 10:30 PM CLOSING REPORT* (Offline Demo)',
      },
    );
  },

  /**
   * SaaS Licenses List
   */
  async getLicenses() {
    return safeFetch(
      `/saas-admin/licenses`,
      { method: 'GET' },
      [
        {
          id: 'lic-001',
          customerName: 'TI Supermarket Group',
          licenseKey: 'TIERP-ENT-2026-DEV001',
          planTier: 'ENTERPRISE',
          maxBranches: 10,
          maxTerminals: 50,
          isActive: true,
        },
      ],
    );
  },
};
