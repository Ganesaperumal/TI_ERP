import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountTypeEnum, Decimal } from '@ti-erp/database';

export interface StandardAccountDef {
  code: string;
  name: string;
  groupType: AccountTypeEnum;
  groupName: string;
}

export const STANDARD_CHART_OF_ACCOUNTS: StandardAccountDef[] = [
  // Assets
  { code: 'ASSET_CASH_DRAWER', name: 'Cash-in-Hand (Counter Drawers)', groupType: AccountTypeEnum.ASSET, groupName: 'Current Assets' },
  { code: 'ASSET_SAFE_CASH', name: 'Main Safe Cash', groupType: AccountTypeEnum.ASSET, groupName: 'Current Assets' },
  { code: 'ASSET_BANK_MAIN', name: 'Bank Accounts (HDFC / SBI / ICICI)', groupType: AccountTypeEnum.ASSET, groupName: 'Bank Accounts' },
  { code: 'ASSET_UPI_CARD_CLEARING', name: 'UPI/Card Pending Settlement Clearing', groupType: AccountTypeEnum.ASSET, groupName: 'Current Assets' },
  { code: 'ASSET_INVENTORY_STOCK', name: 'Inventory Asset (Closing Stock)', groupType: AccountTypeEnum.ASSET, groupName: 'Inventory Stock' },
  { code: 'ASSET_ACCOUNTS_RECEIVABLE', name: 'Accounts Receivable (Customer Khata)', groupType: AccountTypeEnum.ASSET, groupName: 'Sundry Debtors' },
  { code: 'ASSET_GST_INPUT_CGST', name: 'GST Input Tax Credit - CGST', groupType: AccountTypeEnum.ASSET, groupName: 'Duties and Taxes' },
  { code: 'ASSET_GST_INPUT_SGST', name: 'GST Input Tax Credit - SGST', groupType: AccountTypeEnum.ASSET, groupName: 'Duties and Taxes' },
  { code: 'ASSET_GST_INPUT_IGST', name: 'GST Input Tax Credit - IGST', groupType: AccountTypeEnum.ASSET, groupName: 'Duties and Taxes' },
  { code: 'ASSET_GST_INPUT_CESS', name: 'GST Input Tax Credit - Cess', groupType: AccountTypeEnum.ASSET, groupName: 'Duties and Taxes' },
  { code: 'ASSET_STAFF_ADVANCES', name: 'Staff Salary Advances', groupType: AccountTypeEnum.ASSET, groupName: 'Loans and Advances' },

  // Liabilities
  { code: 'LIAB_ACCOUNTS_PAYABLE', name: 'Accounts Payable (Sundry Creditors / Suppliers)', groupType: AccountTypeEnum.LIABILITY, groupName: 'Sundry Creditors' },
  { code: 'LIAB_GST_OUTPUT_CGST', name: 'GST Output Tax Liability - CGST', groupType: AccountTypeEnum.LIABILITY, groupName: 'Duties and Taxes' },
  { code: 'LIAB_GST_OUTPUT_SGST', name: 'GST Output Tax Liability - SGST', groupType: AccountTypeEnum.LIABILITY, groupName: 'Duties and Taxes' },
  { code: 'LIAB_GST_OUTPUT_IGST', name: 'GST Output Tax Liability - IGST', groupType: AccountTypeEnum.LIABILITY, groupName: 'Duties and Taxes' },
  { code: 'LIAB_GST_OUTPUT_CESS', name: 'GST Output Tax Liability - Cess', groupType: AccountTypeEnum.LIABILITY, groupName: 'Duties and Taxes' },
  { code: 'LIAB_PREPAID_GIFT_CARDS', name: 'Customer Prepaid Gift Cards', groupType: AccountTypeEnum.LIABILITY, groupName: 'Current Liabilities' },
  { code: 'LIAB_CREDIT_NOTES', name: 'Customer Credit Note Liability', groupType: AccountTypeEnum.LIABILITY, groupName: 'Current Liabilities' },
  { code: 'LIAB_SALARY_PAYABLE', name: 'Staff Salaries Payable', groupType: AccountTypeEnum.LIABILITY, groupName: 'Current Liabilities' },

  // Income
  { code: 'INC_RETAIL_SALES', name: 'Retail POS Sales', groupType: AccountTypeEnum.INCOME, groupName: 'Sales Accounts' },
  { code: 'INC_WHOLESALE_SALES', name: 'Wholesale B2B Sales', groupType: AccountTypeEnum.INCOME, groupName: 'Sales Accounts' },
  { code: 'INC_OTHER_STORE_INCOME', name: 'Other Store Income (Brand Display & End-Cap Rentals)', groupType: AccountTypeEnum.INCOME, groupName: 'Direct Income' },
  { code: 'INC_ROUNDOFF', name: 'Round-Off Gain', groupType: AccountTypeEnum.INCOME, groupName: 'Direct Income' },

  // Expenses
  { code: 'EXP_COGS', name: 'Cost of Goods Sold (COGS)', groupType: AccountTypeEnum.EXPENSE, groupName: 'Direct Expenses' },
  { code: 'EXP_SHRINKAGE_WRITE_OFF', name: 'Inventory Shrinkage/Wastage/Damage Write-Off', groupType: AccountTypeEnum.EXPENSE, groupName: 'Direct Expenses' },
  { code: 'EXP_BANK_MDR_CHARGES', name: 'Bank MDR & Payment Gateway Charges', groupType: AccountTypeEnum.EXPENSE, groupName: 'Indirect Expenses' },
  { code: 'EXP_STORE_RENT', name: 'Store Rent', groupType: AccountTypeEnum.EXPENSE, groupName: 'Indirect Expenses' },
  { code: 'EXP_ELECTRICITY_BILL', name: 'Electricity & EB Bill', groupType: AccountTypeEnum.EXPENSE, groupName: 'Indirect Expenses' },
  { code: 'EXP_PACKAGING_MATERIALS', name: 'Packaging Materials & Carry Bags', groupType: AccountTypeEnum.EXPENSE, groupName: 'Direct Expenses' },
  { code: 'EXP_STAFF_SALARIES', name: 'Staff Salaries & Incentives', groupType: AccountTypeEnum.EXPENSE, groupName: 'Indirect Expenses' },
  { code: 'EXP_FREIGHT_DELIVERY_FUEL', name: 'Freight Inward & Delivery Fuel', groupType: AccountTypeEnum.EXPENSE, groupName: 'Direct Expenses' },
  { code: 'EXP_ROUNDOFF', name: 'Round-Off Expense', groupType: AccountTypeEnum.EXPENSE, groupName: 'Indirect Expenses' },

  // Equity
  { code: 'EQ_OPENING_CAPITAL', name: 'Store Owner Opening Capital', groupType: AccountTypeEnum.EQUITY, groupName: 'Capital Account' },
  { code: 'EQ_RETAINED_EARNINGS', name: 'Retained Earnings', groupType: AccountTypeEnum.EQUITY, groupName: 'Reserves and Surplus' },
];

@Injectable()
export class AccountingSetupService {
  private readonly logger = new Logger(AccountingSetupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-Seed Default Indian Supermarket Chart of Accounts for a Tenant
   */
  async ensureStandardChartOfAccounts(tenantId: string) {
    // 1. Group names needed
    const uniqueGroups = Array.from(
      new Map(
        STANDARD_CHART_OF_ACCOUNTS.map((a) => [
          `${a.groupName}_${a.groupType}`,
          { groupName: a.groupName, groupType: a.groupType },
        ]),
      ).values(),
    );

    const groupMap = new Map<string, string>(); // groupName -> groupId

    for (const g of uniqueGroups) {
      let group = await this.prisma.accountGroup.findUnique({
        where: {
          tenantId_groupName: {
            tenantId,
            groupName: g.groupName,
          },
        },
      });

      if (!group) {
        group = await this.prisma.accountGroup.create({
          data: {
            tenantId,
            groupName: g.groupName,
            groupType: g.groupType,
          },
        });
      }
      groupMap.set(g.groupName, group.id);
    }

    // 2. Ensure each ledger account exists
    const accounts = [];
    for (const accDef of STANDARD_CHART_OF_ACCOUNTS) {
      const groupId = groupMap.get(accDef.groupName);
      if (!groupId) continue;

      let account = await this.prisma.ledgerAccount.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: accDef.code,
          },
        },
      });

      if (!account) {
        account = await this.prisma.ledgerAccount.create({
          data: {
            tenantId,
            groupId,
            code: accDef.code,
            accountName: accDef.name,
            openingBalance: new Decimal(0),
            currentBalance: new Decimal(0),
          },
        });
      }
      accounts.push(account);
    }

    this.logger.log(`Verified/Seeded ${accounts.length} standard accounts for tenant ${tenantId}`);
    return accounts;
  }

  /**
   * Get Ledger Account by deterministic code (auto-seeding if missing)
   */
  async getLedgerByCode(tenantId: string, code: string) {
    let account = await this.prisma.ledgerAccount.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code,
        },
      },
      include: { group: true },
    });

    if (!account) {
      await this.ensureStandardChartOfAccounts(tenantId);
      account = await this.prisma.ledgerAccount.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code,
          },
        },
        include: { group: true },
      });
    }

    return account;
  }
}
