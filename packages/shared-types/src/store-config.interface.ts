import {
  TopologyMode,
  GstRegime,
  BatchTrackingMode,
  NegativeStockRule,
  GrnMode,
  AiProvider,
} from './enums';

export interface ThermalPrinterConfig {
  enabled: boolean;
  type: 'NETWORK_TCP' | 'USB_RAW' | 'BLUETOOTH';
  ipAddress: string;
  port: number;
  paperWidthMm: 58 | 80;
  autoCut: boolean;
  drawerKickPulse: boolean;
  pulseCommandHex: string;
  headerLines: string[];
  footerLines: string[];
  printBilingual: boolean;
  secondaryLanguageCode: 'ta-IN' | 'hi-IN' | 'te-IN' | 'kn-IN' | 'ml-IN' | 'mr-IN';
}

export interface BarcodeLabelPrinterConfig {
  enabled: boolean;
  language: 'ZPL' | 'TSPL' | 'EPL';
  connectionType: 'USB' | 'NETWORK';
  ipAddress?: string;
  port?: number;
  dpi: 203 | 300;
  defaultWidthMm: number;
  defaultHeightMm: number;
  gapMm: number;
  printGondolaShelfTags: boolean;
}

export interface WeighingScaleConfig {
  enabled: boolean;
  connectionType: 'RS232_SERIAL' | 'USB_VCP' | 'BARCODE_PREFIX';
  serialPort: string;
  baudRate: 1200 | 2400 | 4800 | 9600 | 19200 | 38400 | 115200;
  dataBits: 7 | 8;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  streamingFormat: 'ESSAE' | 'AVERY' | 'PHOENIX' | 'METTLER_TOLEDO' | 'CUSTOM';
  barcodePrefixRule: {
    enabled: boolean;
    prefix: string; // e.g. "20" or "21"
    skuLength: number; // e.g. 5
    weightLength: number; // e.g. 5
    weightDecimals: number; // e.g. 3 (grams to kg)
  };
}

export interface DualDisplayConfig {
  enabled: boolean;
  showDynamicUpiQr: boolean;
  showItemSavingsBreakdown: boolean;
  showPromotionalSlideshow: boolean;
  slideshowImageUrls: string[];
  audioConfirmationOnPayment: boolean;
}

export interface EdcPaymentConfig {
  enabled: boolean;
  provider: 'PINE_LABS' | 'PAYTM' | 'PHONEPE' | 'RAZORPAY' | 'MOSAMBEE';
  merchantId: string;
  terminalId: string;
  ipAddress?: string;
  port?: number;
  autoPushBillAmount: boolean;
  soundboxWebhookEnabled: boolean;
}

export interface HardwarePeripheralsConfig {
  receiptPrinter: ThermalPrinterConfig;
  labelPrinter: BarcodeLabelPrinterConfig;
  weighingScale: WeighingScaleConfig;
  dualDisplay: DualDisplayConfig;
  edcTerminal: EdcPaymentConfig;
}

export interface CashRegisterConfig {
  blindCashClose: boolean;
  requirePhysicalDenominationBreakdown: boolean;
  allowMidDaySafeDrops: boolean;
  safeDropThresholdAmount: number;
  autoPostShortageToCashierLedger: boolean;
  maxAllowedShortageWithoutSupervisorApproval: number;
  terminalHardwareLock: boolean;
}

export interface InventoryPolicyConfig {
  defaultBatchTrackingMode: BatchTrackingMode;
  nearExpiryThresholdDays: number;
  clearanceDiscountPct: number;
  negativeStockRule: NegativeStockRule;
  negativeStockSupervisorPinRequired: boolean;
  autoCalcBulkRepackWastage: boolean;
  cycleCountFreezeStock: boolean;
}

export interface ProcurementPolicyConfig {
  defaultGrnMode: GrnMode;
  enable3WayMatch: boolean;
  redMarginGuardrailPct: number; // e.g., Alert if gross margin < 5%
  blockGrnOnNegativeMargin: boolean;
  allowPoQuantityTolerancePct: number; // e.g., 5%
  enableAiInvoiceOcr: boolean;
}

export interface PosKeyboardShortcutsConfig {
  f1: string; // "HELP_OR_SHORT_PLU"
  f2: string; // "SEARCH_PRODUCT"
  f3: string; // "EDIT_QUANTITY"
  f4: string; // "SELECT_BATCH_MRP"
  f5: string; // "HOLD_BILL"
  f6: string; // "RECALL_BILL"
  f7: string; // "APPLY_PROMO_COUPON"
  f8: string; // "CUSTOMER_KHATA_LOOKUP"
  f9: string; // "LINE_VOID_SUPERVISOR"
  f10: string; // "SETTLE_CASH"
  f11: string; // "SETTLE_DYNAMIC_UPI"
  f12: string; // "SETTLE_SPLIT_PAYMENT"
}

export interface LoyaltyKhataConfig {
  loyaltyEnabled: boolean;
  pointsEarnedPerHundredRupees: number;
  rupeeValuePerPoint: number;
  requireOtpForRedemption: boolean;
  otpThresholdPoints: number;
  khataEnabled: boolean;
  defaultCreditLimit: number;
  autoFirstOfMonthWhatsAppStatement: boolean;
  sendUpiPaymentLinkInStatement: boolean;
}

export interface GstTaxConfig {
  regime: GstRegime;
  mrpTaxBackCalculation: boolean;
  printHsnSummaryOnThermalReceipt: boolean;
  eInvoicingEnabled: boolean;
  eWayBillEnabled: boolean;
  eInvoiceGspProvider?: string;
}

export interface ByokAiConfig {
  activeProvider: AiProvider;
  geminiApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
  ollamaBaseUrl?: string;
  preferredModel: string;
  ocrConfidenceThreshold: number;
}

export interface NotificationGatewaysConfig {
  whatsAppEnabled: boolean;
  whatsAppProvider: 'META_CLOUD_API' | 'GUPSHUP' | 'PINNACLE';
  whatsAppPhoneNumberId?: string;
  whatsAppAccessToken?: string;
  smsEnabled: boolean;
  smsProvider: 'DLT_FAST2SMS' | 'MSG91' | 'TWILIO';
}

export interface StoreConfig {
  topology: TopologyMode;
  hardware: HardwarePeripheralsConfig;
  cashRegister: CashRegisterConfig;
  inventory: InventoryPolicyConfig;
  procurement: ProcurementPolicyConfig;
  keyboardShortcuts: PosKeyboardShortcutsConfig;
  loyaltyKhata: LoyaltyKhataConfig;
  gst: GstTaxConfig;
  ai: ByokAiConfig;
  notifications: NotificationGatewaysConfig;
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  topology: TopologyMode.SINGLE_STORE,
  hardware: {
    receiptPrinter: {
      enabled: true,
      type: 'NETWORK_TCP',
      ipAddress: '192.168.1.200',
      port: 9100,
      paperWidthMm: 80,
      autoCut: true,
      drawerKickPulse: true,
      pulseCommandHex: '1B700019FA',
      headerLines: ['TI SUPERMARKET', '123 Main Road, GSTIN: 33AAAAA0000A1Z5'],
      footerLines: ['Thank You! Visit Again.', 'Items sold are inclusive of GST.'],
      printBilingual: true,
      secondaryLanguageCode: 'ta-IN',
    },
    labelPrinter: {
      enabled: true,
      language: 'TSPL',
      connectionType: 'USB',
      dpi: 203,
      defaultWidthMm: 50,
      defaultHeightMm: 25,
      gapMm: 2,
      printGondolaShelfTags: true,
    },
    weighingScale: {
      enabled: true,
      connectionType: 'BARCODE_PREFIX',
      serialPort: '/dev/ttyUSB0',
      baudRate: 9600,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      streamingFormat: 'ESSAE',
      barcodePrefixRule: {
        enabled: true,
        prefix: '20',
        skuLength: 5,
        weightLength: 5,
        weightDecimals: 3,
      },
    },
    dualDisplay: {
      enabled: true,
      showDynamicUpiQr: true,
      showItemSavingsBreakdown: true,
      showPromotionalSlideshow: true,
      slideshowImageUrls: [],
      audioConfirmationOnPayment: true,
    },
    edcTerminal: {
      enabled: true,
      provider: 'PAYTM',
      merchantId: 'MERC_TIERP_001',
      terminalId: 'TERM_POS_01',
      autoPushBillAmount: true,
      soundboxWebhookEnabled: true,
    },
  },
  cashRegister: {
    blindCashClose: true,
    requirePhysicalDenominationBreakdown: true,
    allowMidDaySafeDrops: true,
    safeDropThresholdAmount: 20000,
    autoPostShortageToCashierLedger: true,
    maxAllowedShortageWithoutSupervisorApproval: 50,
    terminalHardwareLock: true,
  },
  inventory: {
    defaultBatchTrackingMode: BatchTrackingMode.POPUP_ON_MRP_DIFF,
    nearExpiryThresholdDays: 30,
    clearanceDiscountPct: 25,
    negativeStockRule: NegativeStockRule.WARN_PIN,
    negativeStockSupervisorPinRequired: true,
    autoCalcBulkRepackWastage: true,
    cycleCountFreezeStock: true,
  },
  procurement: {
    defaultGrnMode: GrnMode.FAST_DIRECT,
    enable3WayMatch: true,
    redMarginGuardrailPct: 8.0,
    blockGrnOnNegativeMargin: true,
    allowPoQuantityTolerancePct: 5.0,
    enableAiInvoiceOcr: true,
  },
  keyboardShortcuts: {
    f1: 'HELP_OR_SHORT_PLU',
    f2: 'SEARCH_PRODUCT',
    f3: 'EDIT_QUANTITY',
    f4: 'SELECT_BATCH_MRP',
    f5: 'HOLD_BILL',
    f6: 'RECALL_BILL',
    f7: 'APPLY_PROMO_COUPON',
    f8: 'CUSTOMER_KHATA_LOOKUP',
    f9: 'LINE_VOID_SUPERVISOR',
    f10: 'SETTLE_CASH',
    f11: 'SETTLE_DYNAMIC_UPI',
    f12: 'SETTLE_SPLIT_PAYMENT',
  },
  loyaltyKhata: {
    loyaltyEnabled: true,
    pointsEarnedPerHundredRupees: 1.0,
    rupeeValuePerPoint: 0.5,
    requireOtpForRedemption: true,
    otpThresholdPoints: 100,
    khataEnabled: true,
    defaultCreditLimit: 5000,
    autoFirstOfMonthWhatsAppStatement: true,
    sendUpiPaymentLinkInStatement: true,
  },
  gst: {
    regime: GstRegime.REGULAR,
    mrpTaxBackCalculation: true,
    printHsnSummaryOnThermalReceipt: true,
    eInvoicingEnabled: false,
    eWayBillEnabled: false,
  },
  ai: {
    activeProvider: AiProvider.GEMINI,
    preferredModel: 'gemini-1.5-flash',
    ocrConfidenceThreshold: 0.85,
  },
  notifications: {
    whatsAppEnabled: true,
    whatsAppProvider: 'META_CLOUD_API',
    smsEnabled: false,
    smsProvider: 'DLT_FAST2SMS',
  },
};
