/**
 * Hardware Bridge Client for POS Web
 * Interfaces with native localhost:8089 daemon with graceful on-screen modal fallbacks
 */

export interface ReceiptPrintPayload {
  storeName?: string;
  branchName?: string;
  gstin?: string;
  billNumber: string;
  date?: string;
  cashierName?: string;
  customerPhone?: string;
  customerName?: string;
  items: Array<{
    name: string;
    qty: number;
    uom?: string;
    mrp?: number;
    rate: number;
    amount: number;
  }>;
  totalGross?: number;
  totalDiscount?: number;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  roundOff?: number;
  netPayable: number;
  payments?: Array<{
    method: string;
    amount: number;
  }>;
  qrPayload?: string;
  loyaltyEarned?: number;
  loyaltyBalance?: number;
}

export interface ScaleWeightReading {
  weightKg: number;
  isStable: boolean;
  tareWeightKg: number;
  unit: string;
  rawAscii: string;
  isSimulated?: boolean;
}

const BRIDGE_URL = 'http://localhost:8089';

export const hardwareBridgeClient = {
  /**
   * Check if physical hardware bridge daemon is running on localhost:8089
   */
  async checkBridgeHealth(): Promise<{ online: boolean; peripherals?: string[] }> {
    try {
      const res = await fetch(`${BRIDGE_URL}/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const json = await res.json();
        return { online: true, peripherals: json.supportedPeripherals };
      }
      return { online: false };
    } catch {
      return { online: false };
    }
  },

  /**
   * Print 80mm/58mm ESC/POS Thermal Receipt & Pulse Cash Drawer
   */
  async printReceipt(payload: ReceiptPrintPayload): Promise<{
    success: boolean;
    preview: string;
    hardwarePrinted: boolean;
  }> {
    const formattedFallbackPreview = [
      `==========================================`,
      `       ${payload.storeName || 'TI SUPERMARKET ENTERPRISE'}`,
      `          ${payload.branchName || 'Main Supermarket - Tirupur'}`,
      `              GSTIN: ${payload.gstin || '33AAAAA0000A1Z5'}`,
      `==========================================`,
      `Bill: ${payload.billNumber} | Date: ${payload.date || new Date().toLocaleString()}`,
      `Cashier: ${payload.cashierName || 'Cashier 1'}`,
      payload.customerPhone ? `Customer: ${payload.customerName || 'Loyalty Member'} (${payload.customerPhone})` : '',
      `------------------------------------------`,
      `ITEM                    QTY   RATE  AMOUNT`,
      `------------------------------------------`,
      ...payload.items.map(
        (it) =>
          `${it.name.substring(0, 18).padEnd(18)} ` +
          `${it.qty.toString().padStart(4)} ` +
          `₹${it.rate.toFixed(0).padStart(4)} ` +
          `₹${it.amount.toFixed(2).padStart(7)}`,
      ),
      `------------------------------------------`,
      `Subtotal:                    ₹${(payload.totalGross || payload.netPayable).toFixed(2)}`,
      payload.totalDiscount ? `Total Discount:             -₹${payload.totalDiscount.toFixed(2)}` : '',
      payload.cgst ? `CGST (Taxes):                ₹${payload.cgst.toFixed(2)}` : '',
      payload.sgst ? `SGST (Taxes):                ₹${payload.sgst.toFixed(2)}` : '',
      `------------------------------------------`,
      `NET PAYABLE:                 ₹${payload.netPayable.toFixed(2)}`,
      `==========================================`,
      payload.payments
        ? `TENDER: ` + payload.payments.map((p) => `${p.method} ₹${p.amount.toFixed(2)}`).join(' | ')
        : '',
      payload.loyaltyEarned ? `★ Points Earned: ${payload.loyaltyEarned} | Total Balance: ${payload.loyaltyBalance || payload.loyaltyEarned}` : '',
      `==========================================`,
      `      Thank You for Shopping with Us!     `,
      `       Software Powered by TI-ERP OS      `,
      `==========================================`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const res = await fetch(`${BRIDGE_URL}/print-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(2000),
      });

      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          preview: json.preview || formattedFallbackPreview,
          hardwarePrinted: true,
        };
      }
    } catch {
      // Fallback to on-screen preview
    }

    return {
      success: true,
      preview: formattedFallbackPreview,
      hardwarePrinted: false,
    };
  },

  /**
   * Pulse RJ11 24V Cash Drawer
   */
  async kickCashDrawer(): Promise<{ success: boolean; hardwarePulsed: boolean }> {
    try {
      const res = await fetch(`${BRIDGE_URL}/kick-drawer`, {
        method: 'POST',
        signal: AbortSignal.timeout(1500),
      });
      return { success: true, hardwarePulsed: res.ok };
    } catch {
      return { success: true, hardwarePulsed: false };
    }
  },

  /**
   * Read Live Scale Weight (F3 Shortcut)
   */
  async readScaleWeight(simulatedWeightKg = 0.75): Promise<ScaleWeightReading> {
    try {
      const res = await fetch(`${BRIDGE_URL}/scale/weight?weight=${simulatedWeightKg}`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const json = await res.json();
        return {
          weightKg: json.weightKg,
          isStable: json.isStable ?? true,
          tareWeightKg: json.tareWeightKg ?? 0,
          unit: json.unit ?? 'kg',
          rawAscii: json.rawAscii ?? `ST,GS,+  ${simulatedWeightKg.toFixed(3)}kg`,
          isSimulated: false,
        };
      }
    } catch {
      // Fallback
    }

    return {
      weightKg: simulatedWeightKg,
      isStable: true,
      tareWeightKg: 0,
      unit: 'kg',
      rawAscii: `SIM_ST,GS,+  ${simulatedWeightKg.toFixed(3)}kg`,
      isSimulated: true,
    };
  },

  /**
   * Print 2-Up Repacking ZPL Labels
   */
  async printZplLabels(leftSticker: any, rightSticker?: any): Promise<{
    success: boolean;
    zplCode: string;
    hardwarePrinted: boolean;
  }> {
    const fallbackZpl = `^XA
^PW800
^LL300
^FO50,30^A0N,28,28^FD${leftSticker?.productNameEn || 'Sona Masoori Rice 1kg'}^FS
^FO50,65^A0N,22,22^FD${leftSticker?.productNameRegional || 'அரிசி 1கிலோ'}^FS
^FO50,95^A0N,20,20^FDNet Wt: ${leftSticker?.netWeight || '1.000 kg'} | Pkd: ${leftSticker?.packedDate || '25/10/2026'}^FS
^FO50,130^BY2,2.5,60^BCN,60,Y,N,N^FD${leftSticker?.barcode || '8901234567011'}^FS
^FO50,225^A0N,26,26^FDMRP: Rs. ${leftSticker?.mrp || '65.00'}  OUR PRICE: Rs. ${leftSticker?.sellingPrice || '58.00'}^FS
^XZ`;

    try {
      const res = await fetch(`${BRIDGE_URL}/print-zpl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left: leftSticker, right: rightSticker }),
        signal: AbortSignal.timeout(2000),
      });

      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          zplCode: json.zplCode || fallbackZpl,
          hardwarePrinted: true,
        };
      }
    } catch {
      // Fallback
    }

    return {
      success: true,
      zplCode: fallbackZpl,
      hardwarePrinted: false,
    };
  },
};
