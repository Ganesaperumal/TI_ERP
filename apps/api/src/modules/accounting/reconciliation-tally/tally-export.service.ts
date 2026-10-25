import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TallyExportFilterDto } from './recon-tally.dto';
import { VoucherTypeEnum } from '@ti-erp/database';

@Injectable()
export class TallyExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1-Click Tally Prime XML Payload Generator for Supermarket External CA
   */
  async exportTallyXml(filter: TallyExportFilterDto) {
    const whereVouchers: any = {
      tenantId: filter.tenantId,
    };
    if (filter.branchId) whereVouchers.branchId = filter.branchId;

    if (!filter.includeAlreadyExported) {
      whereVouchers.isTallyExported = false;
    }

    if (filter.from || filter.to) {
      whereVouchers.voucherDate = {};
      if (filter.from) whereVouchers.voucherDate.gte = new Date(filter.from);
      if (filter.to) {
        const toD = new Date(filter.to);
        toD.setHours(23, 59, 59);
        whereVouchers.voucherDate.lte = toD;
      }
    }

    const vouchers = await this.prisma.journalVoucher.findMany({
      where: whereVouchers,
      include: {
        lines: {
          include: {
            ledgerAccount: {
              include: { group: true },
            },
          },
        },
      },
      orderBy: { voucherDate: 'asc' },
    });

    if (vouchers.length === 0) {
      return {
        success: true,
        voucherCount: 0,
        ledgerCount: 0,
        filename: `TallyExport_${new Date().toISOString().slice(0, 10)}.xml`,
        xmlContent: '<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"/></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>',
      };
    }

    // Collect all unique ledgers referenced
    const ledgerMap = new Map<string, { name: string; parentGroup: string }>();
    for (const v of vouchers) {
      for (const l of v.lines) {
        ledgerMap.set(l.ledgerAccount.accountName, {
          name: l.ledgerAccount.accountName,
          parentGroup: l.ledgerAccount.group.groupName,
        });
      }
    }

    // Map VoucherType to standard Tally Prime Voucher Type Names
    const mapTallyVoucherType = (type: VoucherTypeEnum): string => {
      switch (type) {
        case VoucherTypeEnum.POS_DAY_CLOSE:
        case VoucherTypeEnum.SALES:
          return 'Sales';
        case VoucherTypeEnum.GRN_PURCHASE:
        case VoucherTypeEnum.PURCHASE:
          return 'Purchase';
        case VoucherTypeEnum.RECEIPT:
          return 'Receipt';
        case VoucherTypeEnum.PAYMENT:
        case VoucherTypeEnum.EXPENSE:
          return 'Payment';
        case VoucherTypeEnum.CONTRA:
          return 'Contra';
        case VoucherTypeEnum.DEBIT_NOTE:
          return 'Debit Note';
        case VoucherTypeEnum.CREDIT_NOTE:
          return 'Credit Note';
        case VoucherTypeEnum.BANK_SETTLEMENT:
        case VoucherTypeEnum.SALARY_PAYROLL:
        case VoucherTypeEnum.INVENTORY_WRITEOFF:
        case VoucherTypeEnum.MANUAL:
        case VoucherTypeEnum.JOURNAL:
        default:
          return 'Journal';
      }
    };

    const escapeXml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<ENVELOPE>\n`;
    xml += `  <HEADER>\n`;
    xml += `    <TALLYREQUEST>Import Data</TALLYREQUEST>\n`;
    xml += `  </HEADER>\n`;
    xml += `  <BODY>\n`;
    xml += `    <IMPORTDATA>\n`;
    xml += `      <REQUESTDESC>\n`;
    xml += `        <REPORTNAME>Vouchers</REPORTNAME>\n`;
    xml += `        <STATICVARIABLES>\n`;
    xml += `          <SVCURRENTCOMPANY>TI Supermarket</SVCURRENTCOMPANY>\n`;
    xml += `        </STATICVARIABLES>\n`;
    xml += `      </REQUESTDESC>\n`;
    xml += `      <REQUESTDATA>\n`;

    // 1. Master Ledgers Block
    for (const [, ledger] of ledgerMap) {
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <LEDGER NAME="${escapeXml(ledger.name)}" ACTION="Create">\n`;
      xml += `            <NAME>${escapeXml(ledger.name)}</NAME>\n`;
      xml += `            <PARENT>${escapeXml(ledger.parentGroup)}</PARENT>\n`;
      xml += `            <OPENINGBALANCE>0</OPENINGBALANCE>\n`;
      xml += `            <ISBILLWISEON>No</ISBILLWISEON>\n`;
      xml += `          </LEDGER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    // 2. Vouchers Block
    for (const v of vouchers) {
      const tallyType = mapTallyVoucherType(v.voucherType);
      const dateStr = v.voucherDate.toISOString().slice(0, 10).replace(/-/g, '');

      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="${escapeXml(tallyType)}" ACTION="Create">\n`;
      xml += `            <DATE>${dateStr}</DATE>\n`;
      xml += `            <VOUCHERTYPENAME>${escapeXml(tallyType)}</VOUCHERTYPENAME>\n`;
      xml += `            <VOUCHERNUMBER>${escapeXml(v.voucherNumber)}</VOUCHERNUMBER>\n`;
      xml += `            <NARRATION>${escapeXml(v.narration)}</NARRATION>\n`;
      xml += `            <EFFECTIVEDATE>${dateStr}</EFFECTIVEDATE>\n`;

      for (const line of v.lines) {
        const isDebit = line.debitAmount.greaterThan(0);
        const amount = isDebit ? line.debitAmount : line.creditAmount;
        // In Tally Prime standard XML format:
        // Debits have ISDEEMEDPOSITIVE = Yes and AMOUNT is negative (-amt)
        // Credits have ISDEEMEDPOSITIVE = No and AMOUNT is positive (amt)
        const formattedAmount = isDebit ? `-${amount.toFixed(2)}` : `${amount.toFixed(2)}`;

        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${escapeXml(line.ledgerAccount.accountName)}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>${formattedAmount}</AMOUNT>\n`;
        if (line.narration) {
          xml += `              <NARRATION>${escapeXml(line.narration)}</NARRATION>\n`;
        }
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      }

      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    xml += `      </REQUESTDATA>\n`;
    xml += `    </IMPORTDATA>\n`;
    xml += `  </BODY>\n`;
    xml += `</ENVELOPE>\n`;

    // Mark vouchers as exported
    const voucherIds = vouchers.map((v) => v.id);
    const now = new Date();
    await this.prisma.journalVoucher.updateMany({
      where: { id: { in: voucherIds } },
      data: {
        isTallyExported: true,
        tallyExportedAt: now,
      },
    });

    const filename = `TallyPrime_Export_${new Date().toISOString().slice(0, 10)}_${voucherIds.length}Vouchers.xml`;

    return {
      success: true,
      voucherCount: vouchers.length,
      ledgerCount: ledgerMap.size,
      exportedAt: now.toISOString(),
      filename,
      xmlContent: xml,
    };
  }
}
