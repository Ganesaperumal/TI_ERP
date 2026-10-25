import { Module } from '@nestjs/common';
import { AccountingSetupService } from './core/accounting-setup.service';
import { AccountingVoucherService } from './core/accounting-voucher.service';
import { FinancialReportService } from './core/financial-report.service';
import { AccountingController } from './core/accounting.controller';

import { Gstr1Service } from './gst/gstr1.service';
import { Gstr2bReconciliationService } from './gst/gstr2b-reconciliation.service';
import { Gstr3bService } from './gst/gstr3b.service';
import { EInvoiceService } from './gst/e-invoice.service';
import { GstController } from './gst/gst.controller';

import { BankReconciliationService } from './reconciliation-tally/bank-reconciliation.service';
import { TallyExportService } from './reconciliation-tally/tally-export.service';
import { ReconTallyController } from './reconciliation-tally/recon-tally.controller';

@Module({
  controllers: [
    AccountingController,
    GstController,
    ReconTallyController,
  ],
  providers: [
    AccountingSetupService,
    AccountingVoucherService,
    FinancialReportService,
    Gstr1Service,
    Gstr2bReconciliationService,
    Gstr3bService,
    EInvoiceService,
    BankReconciliationService,
    TallyExportService,
  ],
  exports: [
    AccountingSetupService,
    AccountingVoucherService,
    FinancialReportService,
    Gstr1Service,
    Gstr2bReconciliationService,
    Gstr3bService,
    EInvoiceService,
    BankReconciliationService,
    TallyExportService,
  ],
})
export class AccountingModule {}
