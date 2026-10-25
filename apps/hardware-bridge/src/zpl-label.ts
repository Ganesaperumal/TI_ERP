// ZPL-II / TSPL Barcode Label & Gondola Tag Generator for TI-ERP

export interface RepackStickerParams {
  storeName: string;
  nameEn: string;
  nameRegional?: string;
  barcode: string;
  netWeight: string; // e.g., "1.000 kg"
  packedDate: string; // e.g., "25/10/2026"
  expiryDate: string; // e.g., "24/04/2027"
  mrp: number;
  sellingPrice: number;
  stickerWidthMm?: number; // default 50
  stickerHeightMm?: number; // default 25
  isTwoUp?: boolean; // 2 stickers per row
}

export interface GondolaTagParams {
  storeName: string;
  nameEn: string;
  nameRegional?: string;
  barcode: string;
  uom: string;
  mrp: number;
  sellingPrice: number;
}

export class ZplLabelGenerator {
  /**
   * Generates standard ZPL-II code for 50x25mm (2-up) or 38x25mm packaging stickers
   * Supports true 2-up pair printing across X=20 (left) and X=420 (right)
   */
  public static generateRepackStickerZpl(
    left: RepackStickerParams,
    right?: RepackStickerParams,
  ): string {
    const renderSingle = (params: RepackStickerParams, offsetX: number) => {
      const savings = params.mrp > params.sellingPrice ? params.mrp - params.sellingPrice : 0;
      return `
; --- Header Store Name (X=${offsetX}) ---
^FO${offsetX},15^A0N,22,22^FD${params.storeName}^FS

; --- Product Name (En + Regional) ---
^FO${offsetX},40^A0N,22,22^FD${params.nameEn.slice(0, 22)}^FS
${params.nameRegional ? `^FO${offsetX},64^A0N,20,20^FD${params.nameRegional.slice(0, 22)}^FS` : ''}

; --- Weight & Dates ---
^FO${offsetX},88^A0N,18,18^FDNet: ${params.netWeight} | Pkd: ${params.packedDate}^FS
^FO${offsetX},108^A0N,18,18^FDExp: ${params.expiryDate}^FS

; --- Barcode (Code128) ---
^FO${offsetX},130^BCN,42,Y,N,N
^FD${params.barcode}^FS

; --- Pricing Block ---
^FO${offsetX},195^A0N,18,18^FDM.R.P: Rs.${params.mrp.toFixed(2)}^FS
^FO${offsetX + 150},192^A0N,26,26^FDOUR: Rs.${params.sellingPrice.toFixed(2)}^FS
${savings > 0 ? `^FO${offsetX},225^A0N,16,16^FD(You Save Rs.${savings.toFixed(2)})^FS` : ''}`;
    };

    let zpl = `^XA
^PW800
^LL280
^PON
`;

    // Render left column sticker at X=20
    zpl += renderSingle(left, 20);

    // Render right column sticker at X=420 if 2-up is enabled
    const rightTarget = right || (left.isTwoUp ? left : undefined);
    if (rightTarget) {
      zpl += renderSingle(rightTarget, 420);
    }

    zpl += `\n^XZ`;
    return zpl;
  }

  /**
   * Generates Gondola Shelf-Edge Tag ZPL (High-Visibility Price Card)
   */
  public static generateGondolaTagZpl(params: GondolaTagParams): string {
    const savings = params.mrp > params.sellingPrice ? params.mrp - params.sellingPrice : 0;
    const savePct = params.mrp > 0 ? Math.round((savings / params.mrp) * 100) : 0;

    return `^XA
^PW800
^LL480
^PON

; Outer border
^FO10,10^GB780,460,4^FS

; Store Banner
^FO30,30^A0N,24,24^FD${params.storeName} — SHELF PRICE^FS
^FO30,60^GB740,2,2^FS

; Product Title
^FO30,80^A0N,36,36^FD${params.nameEn.slice(0, 22)}^FS
${params.nameRegional ? `^FO30,125^A0N,28,28^FD${params.nameRegional.slice(0, 22)}^FS` : ''}

; Pack UOM
^FO30,170^A0N,22,22^FDUOM: ${params.uom}^FS

; MRP
^FO30,220^A0N,28,28^FDM.R.P: Rs. ${params.mrp.toFixed(2)}^FS

; Big Discount Badge
^FO30,270^A0N,44,44^FDSPECIAL PRICE: Rs. ${params.sellingPrice.toFixed(2)}^FS
${savings > 0 ? `^FO30,330^A0N,30,30^FD>>> YOU SAVE: Rs. ${savings.toFixed(2)} (${savePct}% OFF) <<< ^FS` : ''}

; EAN-13 Barcode for Shelf Audits
^FO30,380^BCN,40,Y,N,N^FD${params.barcode}^FS

^XZ`;
  }
}
