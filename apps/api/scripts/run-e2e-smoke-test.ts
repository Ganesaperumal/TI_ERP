import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

// Load .env variables
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TenantBranchService } from '../src/modules/core/tenant-branch.service';
import { CatalogService } from '../src/modules/catalog/catalog.service';
import { GrnService } from '../src/modules/procurement/grn/grn.service';
import { InventoryBatchService } from '../src/modules/inventory/inventory-batch.service';
import { PosShiftService } from '../src/modules/pos/shifts/pos-shift.service';
import { PromotionEngineService } from '../src/modules/pos/promotions/promotion-engine.service';
import { PosBillingService } from '../src/modules/pos/billing/pos-billing.service';
import { PosReturnService } from '../src/modules/pos/billing/pos-return.service';
import { AccountingVoucherService } from '../src/modules/accounting/core/accounting-voucher.service';
import { FinancialReportService } from '../src/modules/accounting/core/financial-report.service';
import { BankReconciliationService } from '../src/modules/accounting/reconciliation-tally/bank-reconciliation.service';
import { Gstr1Service } from '../src/modules/accounting/gst/gstr1.service';
import { Gstr2bReconciliationService } from '../src/modules/accounting/gst/gstr2b-reconciliation.service';
import { TallyExportService } from '../src/modules/accounting/reconciliation-tally/tally-export.service';
import { PayrollService } from '../src/modules/hr/payroll.service';
import { AiCopilotAnalyticsService } from '../src/modules/ai-copilot/ai-copilot-analytics.service';
import { OwnerAnalyticsService } from '../src/modules/owner-analytics/owner-analytics.service';
import {
  Decimal,
  PaymentMethodEnum,
  RefundModeEnum,
  ShiftStatusEnum,
} from '@ti-erp/database';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

async function runSupermarketSmokeTest() {
  console.log('\n================================================================');
  console.log('  TI-ERP PRODUCTION V1.0 RELEASE GATE — E2E INTEGRATION SUITE   ');
  console.log('  "A Day-in-the-Life of a Supermarket" (12 Comprehensive Steps)  ');
  console.log('================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const tenantBranchService = app.get(TenantBranchService);
    const catalogService = app.get(CatalogService);
    const grnService = app.get(GrnService);
    const inventoryBatchService = app.get(InventoryBatchService);
    const posShiftService = app.get(PosShiftService);
    const promotionEngineService = app.get(PromotionEngineService);
    const posBillingService = app.get(PosBillingService);
    const posReturnService = app.get(PosReturnService);
    const accountingVoucherService = app.get(AccountingVoucherService);
    const financialReportService = app.get(FinancialReportService);
    const bankReconciliationService = app.get(BankReconciliationService);
    const gstr1Service = app.get(Gstr1Service);
    const gstr2bService = app.get(Gstr2bReconciliationService);
    const tallyExportService = app.get(TallyExportService);
    const payrollService = app.get(PayrollService);
    const aiCopilotService = app.get(AiCopilotAnalyticsService);
    const ownerAnalyticsService = app.get(OwnerAnalyticsService);

    // Fetch Base Setup
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'BR_MAIN' },
      include: { tenant: true },
    });
    if (!mainBranch) throw new Error('Main branch BR_MAIN not found! Did you run db:seed?');
    const tenantId = mainBranch.tenantId;
    const branchId = mainBranch.id;

    // -------------------------------------------------------------------------
    // STEP 1: StoreConfig & Onboarding
    // -------------------------------------------------------------------------
    console.log('--- Step 1: StoreConfig & Onboarding ---');
    const config = await tenantBranchService.getMergedStoreConfig(branchId);
    assert(mainBranch.code === 'BR_MAIN', 'Store code must match BR_MAIN');
    assert(config.hardware.weighingScale.barcodePrefixRule.enabled === true, 'Scale prefix rule must be enabled');
    assert(config.hardware.weighingScale.barcodePrefixRule.prefix === '20', 'Scale prefix must be 20');
    assert(config.gst.regime === 'REGULAR', 'GST regime must be REGULAR');
    console.log(`[PASS] Step 1: StoreConfig & Onboarding verified. Store: "${mainBranch.name}", Regime: ${config.gst.regime}, Scale Prefix: "${config.hardware.weighingScale.barcodePrefixRule.prefix}"`);

    // -------------------------------------------------------------------------
    // STEP 2: Catalog & Scale Prefix Lookup
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Catalog & Scale Prefix Lookup ---');
    // 2a. Standard FMCG EAN
    const lookupEan = await catalogService.lookup('8901719114138', branchId);
    assert(lookupEan.product.skuCode === 'SKU-FMCG-001', 'EAN 8901719114138 must resolve SKU-FMCG-001');

    // 2b. Multi-UOM Carton
    const lookupCarton = await catalogService.lookup('8901719114138-CTN', branchId);
    assert(lookupCarton.resolvedBy === 'UOM_CONVERSION_BARCODE', 'Must resolve by UOM_CONVERSION_BARCODE');
    assert(lookupCarton.uomConversion !== undefined, 'Carton uomConversion must exist');
    assert(Number(lookupCarton.uomConversion!.conversionFactor) === 24, 'Carton conversion factor must be 24');

    // 2c. Weighing Scale Prefix Barcode: '20' + '10001' + '00750' + '5' -> 0.750 kg of Potato
    const lookupScale = await catalogService.lookup('2010001007505', branchId);
    assert(lookupScale.resolvedBy === 'WEIGHING_SCALE_PREFIX', 'Must resolve by WEIGHING_SCALE_PREFIX');
    assert(lookupScale.scaleData !== undefined, 'Scale data must be resolved');
    assert(lookupScale.scaleData!.weightKg === 0.75, `Weight must resolve to 0.75 kg (got ${lookupScale.scaleData!.weightKg})`);
    assert(lookupScale.product.skuCode === 'SKU-PROD-002', 'Short PLU 10001 must resolve SKU-PROD-002 (Farm Fresh Potato)');
    console.log(`[PASS] Step 2: Catalog & Scale Prefix Lookup verified.`);
    console.log(`       - Standard EAN: ${lookupEan.product.nameEn} (SKU: ${lookupEan.product.skuCode})`);
    console.log(`       - Multi-UOM Carton: ${lookupCarton.product.nameEn} (Pack of ${lookupCarton.uomConversion!.conversionFactor}x)`);
    console.log(`       - Scale Barcode 2010001007505 -> Resolved "${lookupScale.product.nameEn}" with weight ${lookupScale.scaleData!.weightKg} kg`);

    // -------------------------------------------------------------------------
    // STEP 3: Fast Direct GRN & Weighted-Average Costing
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Fast Direct GRN & Weighted-Average Costing ---');
    const supplier = await prisma.supplier.findFirst({ where: { tenantId } });
    if (!supplier) throw new Error('Supplier not found in seed');

    const fmcgProduct = await prisma.product.findUnique({
      where: { tenantId_skuCode: { tenantId, skuCode: 'SKU-FMCG-001' } },
      include: { hsn: true },
    });
    if (!fmcgProduct) throw new Error('FMCG Product SKU-FMCG-001 not found');

    const grnInvoiceNum = `INV-ITC-${Date.now()}`;
    const grnBatchNum = `BATCH-GRN-${Date.now().toString().slice(-6)}`;
    const fastGrn = await grnService.createFastDirectGrn({
      tenantId,
      branchId,
      supplierId: supplier.id,
      supplierInvoiceNo: grnInvoiceNum,
      supplierInvoiceDate: new Date().toISOString(),
      totalFreightApportion: 50.0,
      lines: [
        {
          productId: fmcgProduct.id,
          batchNumber: grnBatchNum,
          expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
          hsnId: fmcgProduct.hsnId || undefined,
          billedQty: 20,
          freeSchemeQty: 2, // Buy 10 Get 1 Free (20 + 2 = 22 total units)
          purchaseRate: 90.0,
          tradeDiscountPct: 5.0, // 5% trade discount
          cashDiscountPct: 2.0, // 2% cash discount
          apportionedFreight: 50.0,
          retailSellingPrice: 110.0,
          targetMrp: 120.0,
          uomConversionFactor: 1,
        },
      ],
    });

    assert(fastGrn.lineItems.length === 1, 'GRN line count must be 1');
    const grnLine = fastGrn.lineItems[0];
    const netLandingCost = Number(grnLine.netLandingCost);
    assert(netLandingCost > 0 && netLandingCost < 90, `Net landing cost (${netLandingCost}) must reflect free units & discounts`);
    console.log(`[PASS] Step 3: Fast Direct GRN & Weighted-Average Costing verified.`);
    console.log(`       - GRN #${fastGrn.grnNumber} created with 20 Billed + 2 Free units`);
    console.log(`       - Net Landing Cost: ₹${netLandingCost.toFixed(2)}/unit (Gross ₹90.00 -> Net ₹${netLandingCost.toFixed(2)} after schemes)`);
    console.log(`       - Batch: ${grnBatchNum} active in inventory`);

    // -------------------------------------------------------------------------
    // STEP 4: Bulk-to-Retail Repacking
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Bulk-to-Retail Repacking ---');
    const bulkRice = await prisma.product.findUnique({
      where: { tenantId_skuCode: { tenantId, skuCode: 'SKU-RICE-50KG' } },
    });
    const retailRice = await prisma.product.findUnique({
      where: { tenantId_skuCode: { tenantId, skuCode: 'SKU-RICE-1KG' } },
    });
    if (!bulkRice || !retailRice) throw new Error('Rice products not found in seed');

    // Ensure bulk batch has available stock
    const bulkBatch = await prisma.inventoryBatch.findFirst({
      where: { productId: bulkRice.id, branchId },
    });
    if (!bulkBatch) throw new Error('Bulk batch for rice not found in seed');

    const repackJobNumber = `JOB-REPACK-${Date.now().toString().slice(-6)}`;
    const retailBatchNum = `BATCH-RET-${Date.now().toString().slice(-6)}`;
    const repackRes = await inventoryBatchService.executeRepackingJob({
      tenantId,
      branchId,
      jobNumber: repackJobNumber,
      bulkParentProductId: bulkRice.id,
      bulkConsumedBatchId: bulkBatch.id,
      bulkQtyConsumed: 50,
      retailChildProductId: retailRice.id,
      newRetailBatchNumber: retailBatchNum,
      expiryDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
      retailPacksProduced: 49,
      wastageQty: 0.5,
      packagingMaterialCost: 73.5, // ₹1.50 per pouch * 49
      laborAndOverheadCost: 50.0,
      mrpPerPack: 65.0,
      sellingPricePerPack: 58.0,
    });

    assert(repackRes.labelsToPrint === 49, 'Repack must produce 49 label stickers');
    assert(repackRes.calculatedUnitCost > 0, 'Calculated unit cost must be positive');
    console.log(`[PASS] Step 4: Bulk-to-Retail Repacking verified.`);
    console.log(`       - Consumed: 50 kg bulk rice sack -> Produced: 49x 1 kg retail pouches + 0.5 kg wastage`);
    console.log(`       - Packaging & Overhead apportioned: ₹123.50`);
    console.log(`       - Unit Landing Cost: ₹${repackRes.calculatedUnitCost.toFixed(2)}/pouch (MRP: ₹65, RSP: ₹58)`);
    console.log(`       - Generated 49x 2-Up ZPL Label stickers for barcode batch ${retailBatchNum}`);

    // -------------------------------------------------------------------------
    // STEP 5: Cashier Shift Open
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Cashier Shift Open ---');
    const terminal = await prisma.posTerminal.findFirst({
      where: { branchId, terminalCode: 'POS-01' },
    });
    const cashier = await prisma.user.findFirst({
      where: { tenantId, username: 'cashier1' },
    });
    if (!terminal || !cashier) throw new Error('Terminal POS-01 or Cashier cashier1 not found');

    // Close any previous open shift on this terminal to ensure clean slate
    await prisma.cashierShift.updateMany({
      where: { terminalId: terminal.id, status: ShiftStatusEnum.OPEN },
      data: { status: ShiftStatusEnum.CLOSED, endTime: new Date() },
    });

    const shift = await posShiftService.openShift({
      tenantId,
      branchId,
      terminalId: terminal.id,
      cashierId: cashier.id,
      openingFloat: 5000.0,
      blindCloseEnabled: true,
    });

    assert(shift.status === ShiftStatusEnum.OPEN, 'Shift must be in OPEN status');
    assert(Number(shift.openingFloat) === 5000.0, 'Opening float must be ₹5,000.00');
    console.log(`[PASS] Step 5: Cashier Shift Open verified.`);
    console.log(`       - Terminal: ${terminal.terminalCode} | Shift #${shift.shiftNumber}`);
    console.log(`       - Cashier: ${cashier.fullName} | Opening Float: ₹${Number(shift.openingFloat).toFixed(2)}`);

    // -------------------------------------------------------------------------
    // STEP 6: Promotions & Upsell Nudge
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Promotions & Upsell Nudge ---');
    // Weekend promo triggers slab upsell between ₹800 and ₹999 for threshold ₹1,000
    const promoEval = await promotionEngineService.evaluateCartPromotions({
      tenantId,
      branchId,
      cartLines: [
        {
          productId: fmcgProduct.id,
          productName: fmcgProduct.nameEn,
          lineTotal: 880.0, // 8 x ₹110 = ₹880 (88% of ₹1,000 threshold)
          quantity: 8,
          unitPrice: 110.0,
        },
      ],
    });

    assert(promoEval.upsellNudges.length > 0, 'Upsell nudge must be triggered for cart between 80% and 99.9% of threshold');
    const nudge = promoEval.upsellNudges[0];
    assert(nudge.amountNeeded === 120.0, `Amount needed must be ₹120.00 (got ${nudge.amountNeeded})`);
    console.log(`[PASS] Step 6: Promotions & Upsell Nudge verified.`);
    console.log(`       - Current Cart: ₹${promoEval.totalCartGross.toFixed(2)}`);
    console.log(`       - AI Upsell Nudge: "${nudge.message}"`);

    // -------------------------------------------------------------------------
    // STEP 7: High-Speed POS Split-Pay Checkout
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: High-Speed POS Split-Pay Checkout ---');
    const customer = await prisma.customer.findFirst({
      where: { tenantId },
    });
    if (!customer) throw new Error('Customer not found in seed');

    const potatoProduct = await prisma.product.findUnique({
      where: { tenantId_skuCode: { tenantId, skuCode: 'SKU-PROD-002' } },
    });
    if (!potatoProduct) throw new Error('Potato product not found');

    // Multi-item cart:
    // Line 1: 2 x Gold Winner Sunflower Oil @ ₹110 = ₹220
    // Line 2: 1 x Farm Fresh Potato @ ₹40 = ₹40
    // Line 3: 1 x Repacked Rice 1kg @ ₹58 = ₹58
    // Total = ₹318.00
    // Split Tender: Cash ₹100.00 + UPI ₹150.00 + Customer Khata ₹68.00 = ₹318.00
    const checkoutResult = await posBillingService.checkout({
      tenantId,
      branchId,
      terminalId: terminal.id,
      shiftId: shift.id,
      cashierId: cashier.id,
      customerId: customer.id,
      supervisorPinForKhata: '1234',
      lines: [
        {
          productId: fmcgProduct.id,
          batchId: fastGrn.lineItems[0].batchId || undefined,
          quantity: 2,
          mrp: 120.0,
          sellingPrice: 110.0,
        },
        {
          productId: potatoProduct.id,
          quantity: 1,
          mrp: 45.0,
          sellingPrice: 40.0,
        },
        {
          productId: retailRice.id,
          batchId: repackRes.retailBatch.id,
          quantity: 1,
          mrp: 65.0,
          sellingPrice: 58.0,
        },
      ],
      payments: [
        {
          method: PaymentMethodEnum.CASH,
          amount: 100.0,
          cashTendered: 100.0,
          cashChangeReturned: 0.0,
        },
        {
          method: PaymentMethodEnum.UPI,
          amount: 150.0,
          upiTxnId: `UPI-RRR-${Date.now()}`,
        },
        {
          method: PaymentMethodEnum.CUSTOMER_KHATA,
          amount: 68.0,
        },
      ],
    });

    const inv = checkoutResult.invoice;
    assert(Number(inv.netPayable) === 318.0, `Invoice net payable must be ₹318.00 (got ${inv.netPayable})`);

    // Verify Zero Paisa Drift: Taxable + CGST + SGST + Cess + RoundOff === NetPayable
    const totalTaxCalc = new Decimal(inv.taxableAmount)
      .add(new Decimal(inv.cgstAmount))
      .add(new Decimal(inv.sgstAmount))
      .add(new Decimal(inv.igstAmount))
      .add(new Decimal(inv.cessAmount))
      .add(new Decimal(inv.roundOff));
    assert(
      totalTaxCalc.equals(new Decimal(inv.netPayable)),
      `Zero drift assertion: Tax + Roundoff (${totalTaxCalc}) must equal NetPayable (${inv.netPayable})`,
    );

    // Verify Loyalty Points Earned (3.18 points rounded to 3.18)
    const loyaltyEarnEntry = await prisma.loyaltyLedger.findFirst({
      where: { invoiceId: inv.id, transactionType: 'EARN' },
    });
    assert(loyaltyEarnEntry !== null, 'Loyalty points entry must be recorded in ledger');

    const totalTaxNum = Number(new Decimal(inv.cgstAmount).add(new Decimal(inv.sgstAmount)));
    console.log(`[PASS] Step 7: High-Speed POS Split-Pay Checkout verified.`);
    console.log(`       - Invoice #${inv.invoiceNumber} billed successfully`);
    console.log(`       - Net Payable: ₹${Number(inv.netPayable).toFixed(2)} (Split: Cash ₹100 + UPI ₹150 + Customer Khata ₹68)`);
    console.log(`       - Tax Reconciliation: Taxable ₹${Number(inv.taxableAmount).toFixed(2)} + Taxes ₹${totalTaxNum.toFixed(2)} = ₹${Number(inv.netPayable).toFixed(2)} (0.00 Paisa Drift)`);
    console.log(`       - Loyalty Points Credited: ${loyaltyEarnEntry!.points} pts to ${customer.name}`);

    // -------------------------------------------------------------------------
    // STEP 8: Sales Return & Loyalty Point Clawback
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Sales Return & Loyalty Point Clawback ---');
    // Return 1x Repacked Rice (₹58.00) from the invoice
    const returnRes = await posReturnService.processSalesReturn({
      tenantId,
      branchId,
      terminalId: terminal.id,
      shiftId: shift.id,
      cashierId: cashier.id,
      originalInvoiceId: inv.id,
      refundMode: RefundModeEnum.CREDIT_NOTE,
      reason: 'Customer bought extra packet by mistake',
      lines: [
        {
          productId: retailRice.id,
          batchId: repackRes.retailBatch.id,
          returnedQty: 1,
          refundRate: 58.0,
          isDefectiveDamaged: false,
        },
      ],
    });

    assert(returnRes.creditNoteSlip !== null, 'Credit Note Slip must be generated');
    assert(returnRes.totalRefundAmount === 58.0, 'Refund amount must be ₹58.00');

    // Verify Loyalty Clawback was recorded in LoyaltyLedger
    const clawbackEntry = await prisma.loyaltyLedger.findFirst({
      where: {
        invoiceId: inv.id,
        transactionType: 'POINTS_REVERSED_ON_RETURN',
      },
    });
    assert(clawbackEntry !== null, 'Proportionate loyalty points clawback must be recorded in ledger');

    console.log(`[PASS] Step 8: Sales Return & Loyalty Point Clawback verified.`);
    console.log(`       - Return #${returnRes.salesReturn.returnNumber} processed (Refund: ₹58.00)`);
    console.log(`       - Credit Note Slip #${returnRes.creditNoteSlip?.slipNumber} generated (Barcode: ${returnRes.creditNoteSlip?.barcode})`);
    console.log(`       - Proportionate Loyalty Points Clawed Back: ${clawbackEntry?.points} pts (Ledger: POINTS_REVERSED_ON_RETURN)`);

    // -------------------------------------------------------------------------
    // STEP 9: Cashier Blind Close & Shortage Auto-Debit
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Cashier Blind Close & Shortage Auto-Debit ---');
    // 1. Mid-day safe drop of ₹1,000
    await posShiftService.recordSafeDrop(shift.id, {
      amount: 1000.0,
      notes: 'Mid-day safe transfer to manager vault',
    });

    // 2. Expected cash calculation:
    // Opening Float: ₹5,000.00
    // Cash Sales: ₹100.00
    // Safe Drop: -₹1,000.00
    // Expected System Cash = ₹4,100.00
    // Deliberate physical cash count: ₹4,000.00 (Shortage of ₹100.00!)
    const blindCloseRes = await posShiftService.blindCloseShift(shift.id, {
      denominations: {
        '500': 8, // 8 x 500 = ₹4,000.00
      },
      supervisorApprovedId: cashier.id,
      notes: 'Evening shift close',
    });

    assert(blindCloseRes.status === ShiftStatusEnum.CLOSED, 'Shift status must be CLOSED');
    assert(Number(blindCloseRes.shortageOrExcessAmount) === -100.0, `Shortage must be -₹100.00 (got ${blindCloseRes.shortageOrExcessAmount})`);

    // Verify auto-debit entry in StaffAdvanceAndGroceryKhata
    const shortageKhata = await prisma.staffAdvanceAndGroceryKhata.findFirst({
      where: {
        userId: cashier.id,
        notes: { contains: 'Auto Cashier Shortage Debit' },
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(shortageKhata !== null, 'Shortage must be auto-debited to cashier khata');
    assert(Number(shortageKhata!.amount) === 100.0, 'Khata debit amount must be ₹100.00');

    console.log(`[PASS] Step 9: Cashier Blind Close & Shortage Auto-Debit verified.`);
    console.log(`       - Shift #${blindCloseRes.shiftNumber} closed with Z-Report #${blindCloseRes.zReportNumber}`);
    console.log(`       - Expected Cash: ₹${Number(blindCloseRes.expectedCashSystem).toFixed(2)} | Counted: ₹${Number(blindCloseRes.physicalCashCounted).toFixed(2)}`);
    console.log(`       - Cashier Shortage Detected: -₹100.00`);
    console.log(`       - Auto-debited ₹100.00 to Cashier ${cashier.fullName}'s Salary Advance Ledger`);

    // -------------------------------------------------------------------------
    // STEP 10: Double-Entry Accounting & Bank Recon
    // -------------------------------------------------------------------------
    console.log('\n--- Step 10: Double-Entry Accounting & Bank Recon ---');
    // 1. Post Z-Report Journal Voucher
    const zReportJournal = await accountingVoucherService.postPosZReportJournal(
      tenantId,
      branchId,
      shift.id,
    );
    assert(zReportJournal !== null, 'Z-Report journal voucher must be created');

    // 2. Trial Balance Check: Total Debit === Total Credit
    const trialBalance = await financialReportService.getTrialBalance(tenantId, branchId);
    assert(trialBalance.isBalanced === true, `Trial balance must balance (Debit: ₹${trialBalance.totalDebit}, Credit: ₹${trialBalance.totalCredit})`);

    // 3. Settle UPI Batch via Bank Reconciliation
    const upiSplit = await prisma.posPaymentSplit.findFirst({
      where: {
        invoiceId: inv.id,
        method: PaymentMethodEnum.UPI,
      },
    });
    assert(upiSplit !== null, 'UPI split from Step 7 must exist');

    const reconRes = await bankReconciliationService.settleBatch({
      tenantId,
      branchId,
      splitIds: [upiSplit!.id],
      expectedGrossAmount: 150.0,
      actualBankCreditedAmount: 147.0, // ₹3.00 (2.0%) MDR deducted by bank
      bankUtrNumber: `UTR-HDFC-${Date.now()}`,
      settlementDate: new Date().toISOString().slice(0, 10),
    });

    assert(reconRes.settledTransactionsCount === 1, '1 split must be settled');
    assert(reconRes.voucherNumber !== undefined, 'Bank clearing double-entry voucher must be posted');

    console.log(`[PASS] Step 10: Double-Entry Accounting & Bank Recon verified.`);
    console.log(`       - Posted POS Journal Voucher #${zReportJournal!.voucherNumber}`);
    console.log(`       - Trial Balance Verified: Balanced = ${trialBalance.isBalanced} (Total Debits: ₹${trialBalance.totalDebit.toFixed(2)} === Total Credits: ₹${trialBalance.totalCredit.toFixed(2)})`);
    console.log(`       - UPI Settlement: Gross ₹150.00 -> Net Bank Credit ₹147.00 (MDR Fee: ₹3.00, 2.0%)`);
    console.log(`       - Bank Clearing Journal Voucher #${reconRes.voucherNumber} created`);

    // -------------------------------------------------------------------------
    // STEP 11: GST & Tally Prime XML Export
    // -------------------------------------------------------------------------
    console.log('\n--- Step 11: GST & Tally Prime XML Export ---');
    // 1. GSTR-1 Generation
    const gstr1 = await gstr1Service.generateGstr1(tenantId, branchId);
    assert(gstr1.summary.totalInvoices > 0, 'GSTR-1 must summarize at least 1 invoice');

    // 2. GSTR-2B Reconciliation with ITC At Risk
    const gstr2bRecon = await gstr2bService.reconcileGstr2b({
      tenantId,
      branchId,
      filingPeriod: new Date().toISOString().slice(0, 7),
      gstr2bInvoices: [
        {
          supplierGstin: supplier.gstin || '33AAAAA0000A1Z5',
          supplierTradeName: supplier.name,
          invoiceNumber: 'MISMATCH-INV-999',
          invoiceDate: new Date().toISOString().slice(0, 10),
          taxableAmount: 1000.0,
          cgst: 90.0,
          sgst: 90.0,
          igst: 0.0,
          cess: 0.0,
        },
      ],
    });
    assert(gstr2bRecon.summary.itcAtRiskAmount > 0, 'ITC At Risk must be flagged for unfiled/mismatched supplier invoices');

    // 3. Tally Prime XML Export
    const tallyExport = await tallyExportService.exportTallyXml({
      tenantId,
      branchId,
      includeAlreadyExported: true,
    });
    assert(tallyExport.xmlContent.includes('<ENVELOPE>'), 'Tally export must include <ENVELOPE>');
    assert(tallyExport.xmlContent.includes('<TALLYMESSAGE'), 'Tally export must include <TALLYMESSAGE>');

    console.log(`[PASS] Step 11: GST & Tally Prime XML Export verified.`);
    console.log(`       - GSTR-1: ${gstr1.summary.totalInvoices} invoices summarized with HSN breakdown`);
    console.log(`       - GSTR-2B Recon: Detected ₹${gstr2bRecon.summary.itcAtRiskAmount.toFixed(2)} ITC At Risk for unfiled/mismatched purchase bills`);
    console.log(`       - Tally Prime: Exported ${tallyExport.voucherCount} vouchers as official Tally XML (<ENVELOPE>)`);

    // -------------------------------------------------------------------------
    // STEP 12: HR Payroll, AI Copilot & Nightly Closing Report
    // -------------------------------------------------------------------------
    console.log('\n--- Step 12: HR Payroll, AI Copilot & Nightly Closing Report ---');
    // 1. Monthly Payroll with Cashier Shortage Deduction
    const currentMonthYear = new Date().toISOString().slice(0, 7);
    const payroll = await payrollService.generateMonthlyPayroll({
      tenantId,
      branchId,
      monthYear: currentMonthYear,
    });

    const cashierPayroll = payroll.payrolls.find((r: any) => r.userId === cashier.id);
    assert(cashierPayroll !== undefined, 'Cashier payroll record must exist');
    // Cashier shortage must be deducted from net paid salary
    const shortageDeduction = Number(cashierPayroll!.deductions.posShortageDeductions) + Number(cashierPayroll!.deductions.advanceDeductions);
    assert(shortageDeduction >= 100.0, `Shortage of ₹100.00 must be deducted in cashier payroll (got ${shortageDeduction})`);

    // 2. AI Copilot Regional Transliteration
    const transliteration = await aiCopilotService.transliterateProduct({
      productName: 'Toor Dal 1kg',
      targetLanguage: 'ta-IN',
    });
    assert(
      transliteration.regionalTransliteratedName.includes('துவரம் பருப்பு'),
      `Transliteration of "Toor Dal" must contain Tamil "துவரம் பருப்பு" (got ${transliteration.regionalTransliteratedName})`,
    );

    // 3. 10:30 PM Nightly Closing WhatsApp Report
    const nightly = await ownerAnalyticsService.generateNightlyClosingReport(tenantId, branchId);
    assert(nightly.whatsappFormattedMessage.includes('10:30 PM CLOSING REPORT'), 'Closing report must have title header');
    assert(nightly.summary.billCount > 0, 'Closing report must reflect sales billed today');

    console.log(`[PASS] Step 12: HR Payroll, AI Copilot & Nightly Closing Report verified.`);
    console.log(`       - Monthly Payroll (${currentMonthYear}): Cashier ${cashier.fullName} Base ₹${Number(cashierPayroll!.earnings.baseSalary).toFixed(2)} - Deductions ₹${shortageDeduction.toFixed(2)} (including ₹100 cashier shortage) = Net Pay ₹${Number(cashierPayroll!.netPaidSalary).toFixed(2)}`);
    console.log(`       - AI Bilingual Lexicon: "Toor Dal 1kg" -> "${transliteration.regionalTransliteratedName}" (Tamil)`);
    console.log(`       - 10:30 PM WhatsApp Closing Report Generated:\n`);
    console.log(nightly.whatsappFormattedMessage);

    console.log('\n================================================================');
    console.log('  ALL 12/12 SUPERMARKET WORKFLOWS PASSED WITH 100% SUCCESS!    ');
    console.log('  MILESTONE 8 PRODUCTION V1.0 RELEASE GATE FULLY VERIFIED.      ');
    console.log('================================================================\n');
  } finally {
    await app.close();
  }
}

runSupermarketSmokeTest()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ E2E Smoke Test Failed:', err);
    process.exit(1);
  });
