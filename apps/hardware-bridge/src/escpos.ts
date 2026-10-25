// ESC/POS Thermal Printing & Cash Drawer Pulse Helper

export class EscPosHelper {
  // ESC p m t1 t2 (Kick drawer 1: pin 2)
  public static readonly DRAWER_KICK_PULSE = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  
  // Cut paper command (GS V 66 0)
  public static readonly PAPER_CUT = Buffer.from([0x1d, 0x56, 0x42, 0x00]);

  // Initialize printer (ESC @)
  public static readonly INIT = Buffer.from([0x1b, 0x40]);

  /**
   * Generates a raw ESC/POS buffer for a retail receipt
   */
  public static formatReceipt(params: {
    headerLines: string[];
    billNumber: string;
    items: Array<{ name: string; qty: number; rate: number; total: number }>;
    totalAmount: number;
    footerLines: string[];
  }): Buffer {
    const buffers: Buffer[] = [this.INIT];

    // Center header
    buffers.push(Buffer.from([0x1b, 0x61, 0x01])); // Align center
    for (const line of params.headerLines) {
      buffers.push(Buffer.from(`${line}\n`, 'utf-8'));
    }

    // Left align body
    buffers.push(Buffer.from([0x1b, 0x61, 0x00])); // Align left
    buffers.push(Buffer.from(`Bill No: ${params.billNumber}\n`, 'utf-8'));
    buffers.push(Buffer.from('--------------------------------\n', 'utf-8'));
    buffers.push(Buffer.from('Item          Qty   Rate   Total\n', 'utf-8'));
    buffers.push(Buffer.from('--------------------------------\n', 'utf-8'));

    for (const item of params.items) {
      const line = `${item.name.slice(0, 12).padEnd(13)} ${item.qty.toString().padStart(3)} ${item.rate.toFixed(2).padStart(6)} ${item.total.toFixed(2).padStart(7)}\n`;
      buffers.push(Buffer.from(line, 'utf-8'));
    }

    buffers.push(Buffer.from('--------------------------------\n', 'utf-8'));
    buffers.push(Buffer.from(`Net Total: Rs. ${params.totalAmount.toFixed(2)}\n`, 'utf-8'));
    buffers.push(Buffer.from('--------------------------------\n', 'utf-8'));

    // Center footer
    buffers.push(Buffer.from([0x1b, 0x61, 0x01]));
    for (const line of params.footerLines) {
      buffers.push(Buffer.from(`${line}\n`, 'utf-8'));
    }

    // Feed and cut
    buffers.push(Buffer.from('\n\n\n'));
    buffers.push(this.PAPER_CUT);

    return Buffer.concat(buffers);
  }
}
