// ESC/POS Bilingual Thermal Printing & Cash Drawer Helper for TI-ERP
// Supports standard 80mm (48 cols) and 58mm (32 cols) thermal printers

export interface ReceiptItemLine {
  nameEn: string;
  nameRegional?: string;
  mrp: number;
  rate: number;
  qty: number;
  uom: string;
  total: number;
  discountAmount?: number;
}

export interface ReceiptHsnLine {
  hsnCode: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount?: number;
  totalTax: number;
}

export interface ReceiptPaymentLine {
  method: string;
  amount: number;
  cashTendered?: number;
  changeReturned?: number;
}

export interface ReceiptParams {
  storeName: string;
  legalTradeName?: string;
  branchAddress?: string;
  gstin: string;
  fssaiNumber?: string;
  billNumber: string;
  billDate: string;
  terminalCode: string;
  cashierName: string;
  customerPhone?: string;
  items: ReceiptItemLine[];
  subTotal: number;
  discountTotal: number;
  totalSavings: number;
  netPayable: number;
  hsnSummary: ReceiptHsnLine[];
  payments: ReceiptPaymentLine[];
  printerWidthMm?: 80 | 58; // default 80mm (48 cols), 58mm (32 cols)
  printBilingual?: boolean;
  upiQrString?: string;
  returnBarcode?: string;
  footerNotes?: string[];
  kickDrawer?: boolean;
}

export class EscPosHelper {
  // ESC p m t1 t2 (Kick drawer 1: pin 2)
  public static readonly DRAWER_KICK_PULSE = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  
  // Cut paper command (GS V 66 0)
  public static readonly PAPER_CUT = Buffer.from([0x1d, 0x56, 0x42, 0x00]);

  // Initialize printer (ESC @)
  public static readonly INIT = Buffer.from([0x1b, 0x40]);

  // Alignment
  public static readonly ALIGN_LEFT = Buffer.from([0x1b, 0x61, 0x00]);
  public static readonly ALIGN_CENTER = Buffer.from([0x1b, 0x61, 0x01]);
  public static readonly ALIGN_RIGHT = Buffer.from([0x1b, 0x61, 0x02]);

  // Text modes
  public static readonly BOLD_ON = Buffer.from([0x1b, 0x45, 0x01]);
  public static readonly BOLD_OFF = Buffer.from([0x1b, 0x45, 0x00]);
  public static readonly DOUBLE_HEIGHT = Buffer.from([0x1b, 0x21, 0x10]);
  public static readonly NORMAL_TEXT = Buffer.from([0x1b, 0x21, 0x00]);

  /**
   * Generates formatted ESC/POS byte buffers for 80mm or 58mm thermal printers
   */
  public static generateReceiptBuffer(params: ReceiptParams): Buffer {
    const is80mm = (params.printerWidthMm ?? 80) === 80;
    const colWidth = is80mm ? 48 : 32;
    const divider = '-'.repeat(colWidth) + '\n';
    const doubleDivider = '='.repeat(colWidth) + '\n';

    const buffers: Buffer[] = [this.INIT];

    // Optional Drawer Kick
    if (params.kickDrawer) {
      buffers.push(this.DRAWER_KICK_PULSE);
    }

    // --- STORE HEADER (Centered) ---
    buffers.push(this.ALIGN_CENTER);
    buffers.push(this.BOLD_ON);
    buffers.push(this.DOUBLE_HEIGHT);
    buffers.push(Buffer.from(`${params.storeName}\n`, 'utf-8'));
    buffers.push(this.NORMAL_TEXT);
    buffers.push(this.BOLD_OFF);

    if (params.legalTradeName) {
      buffers.push(Buffer.from(`(${params.legalTradeName})\n`, 'utf-8'));
    }
    if (params.branchAddress) {
      buffers.push(Buffer.from(`${params.branchAddress.slice(0, colWidth)}\n`, 'utf-8'));
    }
    buffers.push(Buffer.from(`GSTIN: ${params.gstin}\n`, 'utf-8'));
    if (params.fssaiNumber) {
      buffers.push(Buffer.from(`FSSAI Lic: ${params.fssaiNumber}\n`, 'utf-8'));
    }

    buffers.push(Buffer.from(doubleDivider, 'utf-8'));

    // --- BILL METADATA (Left) ---
    buffers.push(this.ALIGN_LEFT);
    buffers.push(Buffer.from(`Bill No: ${params.billNumber.padEnd(20)} Date: ${params.billDate}\n`, 'utf-8'));
    buffers.push(Buffer.from(`Counter: ${params.terminalCode.padEnd(19)} Cashier: ${params.cashierName}\n`, 'utf-8'));
    if (params.customerPhone) {
      buffers.push(Buffer.from(`Customer: ${params.customerPhone}\n`, 'utf-8'));
    }

    buffers.push(Buffer.from(divider, 'utf-8'));

    // --- ITEM HEADER & LINES ---
    if (is80mm) {
      // 80mm (48 cols): Item Description (20) | MRP (7) | Rate (7) | Qty (5) | Total (7)
      buffers.push(Buffer.from('Item Name            MRP    Rate   Qty   Amount\n', 'utf-8'));
      buffers.push(Buffer.from(divider, 'utf-8'));

      for (const item of params.items) {
        const namePart = item.nameEn.slice(0, 19).padEnd(20);
        const mrpPart = item.mrp.toFixed(2).padStart(7);
        const ratePart = item.rate.toFixed(2).padStart(7);
        const qtyPart = `${item.qty}`.padStart(5);
        const totalPart = item.total.toFixed(2).padStart(8);

        buffers.push(Buffer.from(`${namePart}${mrpPart}${ratePart}${qtyPart}${totalPart}\n`, 'utf-8'));

        if (params.printBilingual && item.nameRegional) {
          buffers.push(Buffer.from(`  ${item.nameRegional.slice(0, 42)}\n`, 'utf-8'));
        }
        if (item.discountAmount && item.discountAmount > 0) {
          buffers.push(Buffer.from(`  (Disc: -Rs.${item.discountAmount.toFixed(2)})\n`, 'utf-8'));
        }
      }
    } else {
      // 58mm (32 cols): Item (14) | Rate (6) | Qty (4) | Total (6)
      buffers.push(Buffer.from('Item          Rate  Qty   Amount\n', 'utf-8'));
      buffers.push(Buffer.from(divider, 'utf-8'));

      for (const item of params.items) {
        const namePart = item.nameEn.slice(0, 13).padEnd(14);
        const ratePart = item.rate.toFixed(2).padStart(6);
        const qtyPart = `${item.qty}`.padStart(4);
        const totalPart = item.total.toFixed(2).padStart(7);

        buffers.push(Buffer.from(`${namePart}${ratePart}${qtyPart}${totalPart}\n`, 'utf-8'));
        if (params.printBilingual && item.nameRegional) {
          buffers.push(Buffer.from(` ${item.nameRegional.slice(0, 28)}\n`, 'utf-8'));
        }
      }
    }

    buffers.push(Buffer.from(divider, 'utf-8'));

    // --- TOTALS & NET PAYABLE ---
    buffers.push(this.ALIGN_RIGHT);
    buffers.push(Buffer.from(`Sub Total: Rs. ${params.subTotal.toFixed(2)}\n`, 'utf-8'));
    if (params.discountTotal > 0) {
      buffers.push(Buffer.from(`Promotions / Discounts: -Rs. ${params.discountTotal.toFixed(2)}\n`, 'utf-8'));
    }

    buffers.push(this.BOLD_ON);
    buffers.push(this.DOUBLE_HEIGHT);
    buffers.push(Buffer.from(`NET PAYABLE: Rs. ${params.netPayable.toFixed(2)}\n`, 'utf-8'));
    buffers.push(this.NORMAL_TEXT);
    buffers.push(this.BOLD_OFF);

    buffers.push(Buffer.from(divider, 'utf-8'));

    // --- SAVINGS BANNER (Centered, Inverted / Bold) ---
    if (params.totalSavings > 0) {
      buffers.push(this.ALIGN_CENTER);
      buffers.push(this.BOLD_ON);
      buffers.push(Buffer.from(`*** YOU SAVED Rs. ${params.totalSavings.toFixed(2)} TODAY! ***\n`, 'utf-8'));
      buffers.push(this.BOLD_OFF);
      buffers.push(Buffer.from(divider, 'utf-8'));
    }

    // --- PAYMENT TENDERS ---
    buffers.push(this.ALIGN_LEFT);
    buffers.push(Buffer.from('PAYMENT DETAILS:\n', 'utf-8'));
    for (const p of params.payments) {
      buffers.push(Buffer.from(`  ${p.method.padEnd(16)}: Rs. ${p.amount.toFixed(2)}\n`, 'utf-8'));
      if (p.cashTendered) {
        buffers.push(Buffer.from(`    Cash Tendered  : Rs. ${p.cashTendered.toFixed(2)}\n`, 'utf-8'));
        buffers.push(Buffer.from(`    Change Returned: Rs. ${(p.changeReturned ?? 0).toFixed(2)}\n`, 'utf-8'));
      }
    }

    buffers.push(Buffer.from(divider, 'utf-8'));

    // --- HSN-WISE GST BREAKUP TABLE (Mandatory in India) ---
    if (params.hsnSummary && params.hsnSummary.length > 0) {
      buffers.push(this.ALIGN_LEFT);
      buffers.push(Buffer.from('HSN TAX BREAKUP SUMMARY:\n', 'utf-8'));
      if (is80mm) {
        buffers.push(Buffer.from('HSN       Taxable    CGST     SGST    Total Tax\n', 'utf-8'));
        for (const h of params.hsnSummary) {
          const hPart = h.hsnCode.slice(0, 8).padEnd(9);
          const tPart = h.taxableAmount.toFixed(2).padStart(10);
          const cPart = h.cgstAmount.toFixed(2).padStart(8);
          const sPart = h.sgstAmount.toFixed(2).padStart(8);
          const totPart = h.totalTax.toFixed(2).padStart(11);
          buffers.push(Buffer.from(`${hPart}${tPart}${cPart}${sPart}${totPart}\n`, 'utf-8'));
        }
      } else {
        buffers.push(Buffer.from('HSN       Taxable      Tax\n', 'utf-8'));
        for (const h of params.hsnSummary) {
          const hPart = h.hsnCode.slice(0, 8).padEnd(9);
          const tPart = h.taxableAmount.toFixed(2).padStart(11);
          const totPart = h.totalTax.toFixed(2).padStart(10);
          buffers.push(Buffer.from(`${hPart}${tPart}${totPart}\n`, 'utf-8'));
        }
      }
      buffers.push(Buffer.from(divider, 'utf-8'));
    }

    // --- FOOTER & QR / BARCODE ---
    buffers.push(this.ALIGN_CENTER);
    if (params.footerNotes && params.footerNotes.length > 0) {
      for (const note of params.footerNotes) {
        buffers.push(Buffer.from(`${note}\n`, 'utf-8'));
      }
    } else {
      buffers.push(Buffer.from('Goods once sold can be exchanged within 7 days.\n', 'utf-8'));
      buffers.push(Buffer.from('Thank you for shopping with us! Visit again!\n', 'utf-8'));
    }

    // Print Barcode for Bill return lookup
    const barcodeVal = params.returnBarcode || params.billNumber;
    buffers.push(Buffer.from('\n', 'utf-8'));
    buffers.push(Buffer.from([0x1d, 0x6b, 0x49, barcodeVal.length])); // Code128
    buffers.push(Buffer.from(barcodeVal, 'utf-8'));
    buffers.push(Buffer.from('\n', 'utf-8'));

    // Feed and cut
    buffers.push(Buffer.from('\n\n\n\n'));
    buffers.push(this.PAPER_CUT);

    return Buffer.concat(buffers);
  }

  /**
   * Generates a clean plain-text/HTML receipt preview for browser display
   */
  public static generateReceiptTextPreview(params: ReceiptParams): string {
    const is80mm = (params.printerWidthMm ?? 80) === 80;
    const colWidth = is80mm ? 48 : 32;
    const divider = '-'.repeat(colWidth);

    const lines: string[] = [];
    lines.push(params.storeName.toUpperCase());
    if (params.legalTradeName) lines.push(`(${params.legalTradeName})`);
    if (params.branchAddress) lines.push(params.branchAddress);
    lines.push(`GSTIN: ${params.gstin}`);
    lines.push(divider);
    lines.push(`Bill No: ${params.billNumber}  Date: ${params.billDate}`);
    lines.push(`Counter: ${params.terminalCode}  Cashier: ${params.cashierName}`);
    lines.push(divider);

    for (const item of params.items) {
      lines.push(`${item.nameEn.slice(0, 20)} x ${item.qty} = Rs. ${item.total.toFixed(2)}`);
      if (params.printBilingual && item.nameRegional) {
        lines.push(`  ${item.nameRegional}`);
      }
    }

    lines.push(divider);
    lines.push(`NET TOTAL: Rs. ${params.netPayable.toFixed(2)}`);
    if (params.totalSavings > 0) {
      lines.push(`*** YOU SAVED Rs. ${params.totalSavings.toFixed(2)} TODAY! ***`);
    }
    lines.push(divider);
    lines.push('Thank you for shopping with us!');

    return lines.join('\n');
  }
}
