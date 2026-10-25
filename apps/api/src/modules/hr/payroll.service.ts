import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffKhataAndCommissionService } from './staff-khata-commission.service';
import { AccountingVoucherService } from '../accounting/core/accounting-voucher.service';
import { AccountingSetupService } from '../accounting/core/accounting-setup.service';
import { GeneratePayrollDto } from './hr.dto';
import {
  Decimal,
  AttendanceStatusEnum,
  StaffKhataTxnTypeEnum,
  VoucherTypeEnum,
} from '@ti-erp/database';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: StaffKhataAndCommissionService,
    private readonly voucherService: AccountingVoucherService,
    private readonly setupService: AccountingSetupService,
  ) {}

  /**
   * Run Automated Supermarket Monthly Payroll Calculation
   * Formula: Net Pay = (Base + OT + Commission) - (Leaves + Advances + Groceries + Shortages)
   */
  async generateMonthlyPayroll(dto: GeneratePayrollDto) {
    const [yearStr, monthStr] = dto.monthYear.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Fetch all active employees in branch
    const employees = await this.prisma.user.findMany({
      where: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    if (employees.length === 0) {
      throw new NotFoundException(`No active staff found for branch ${dto.branchId}`);
    }

    // Get commissions for the month
    const commissionData = await this.commissionService.getSalesmanCommissions(
      dto.tenantId,
      dto.branchId,
      month,
      year,
    );
    const commissionMap = new Map(commissionData.salesmen.map((c) => [c.salesmanId, c.commissionEarned]));

    const payrollResults = [];
    let totalGrossSalaries = new Decimal(0);
    let totalAdvancesRecovered = new Decimal(0);
    let totalNetPayout = new Decimal(0);

    for (const emp of employees) {
      const baseSalary = emp.baseSalary ?? new Decimal(0);

      // 1. Attendance & Overtime Calculation
      const attendances = await this.prisma.staffAttendance.findMany({
        where: {
          userId: emp.id,
          workDate: { gte: startOfMonth, lte: endOfMonth },
        },
      });

      let totalOtHours = new Decimal(0);
      let paidDays = new Decimal(0);

      for (const a of attendances) {
        totalOtHours = totalOtHours.add(a.overtimeHours);

        if (
          a.status === AttendanceStatusEnum.PRESENT ||
          a.status === AttendanceStatusEnum.LATE ||
          a.status === AttendanceStatusEnum.WEEKLY_OFF
        ) {
          paidDays = paidDays.add(1);
        } else if (a.status === AttendanceStatusEnum.HALF_DAY) {
          paidDays = paidDays.add(0.5);
        }
      }

      // If no attendance entered, default to standard full month (30 days)
      const effectivePaidDays = attendances.length > 0 ? paidDays : new Decimal(30);
      const absentDays = Decimal.max(0, new Decimal(30).sub(effectivePaidDays));

      // Leave Deductions = (baseSalary / 30) * absentDays
      const perDayRate = baseSalary.div(30).toDecimalPlaces(2);
      const leaveDeductions = perDayRate.mul(absentDays).toDecimalPlaces(2);

      // Overtime Pay = totalOtHours * overtimeHourlyRate
      const otHourlyRate = emp.overtimeHourlyRate ?? new Decimal(0);
      const overtimePay = totalOtHours.mul(otHourlyRate).toDecimalPlaces(2);

      // Salesman Commission
      const salesCommission = new Decimal(commissionMap.get(emp.id) ?? 0).toDecimalPlaces(2);

      // 2. Mid-Month Cash Advances & Grocery Khata Deductions
      const khatas = await this.prisma.staffAdvanceAndGroceryKhata.findMany({
        where: {
          userId: emp.id,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      });

      const advanceDeductions = khatas
        .filter((k) => k.txnType === StaffKhataTxnTypeEnum.SALARY_ADVANCE)
        .reduce((s, k) => s.add(k.amount), new Decimal(0));

      const groceryKhataDeductions = khatas
        .filter((k) => k.txnType === StaffKhataTxnTypeEnum.GROCERY_PURCHASE)
        .reduce((s, k) => s.add(k.amount), new Decimal(0));

      // 3. POS Counter Cash Shortages
      const shifts = await this.prisma.cashierShift.findMany({
        where: {
          cashierId: emp.id,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      });

      let posShortageDeductions = new Decimal(0);
      for (const s of shifts) {
        if (s.shortageOrExcessAmount && s.shortageOrExcessAmount.lessThan(0)) {
          posShortageDeductions = posShortageDeductions.add(s.shortageOrExcessAmount.abs());
        }
      }

      // 4. Net Monthly Supermarket Payout Formula:
      // (Base + OT + Commission) - (Leaves + Advances + Groceries + Shortages)
      const earnings = baseSalary.add(overtimePay).add(salesCommission);
      const totalDeductions = leaveDeductions
        .add(advanceDeductions)
        .add(groceryKhataDeductions)
        .add(posShortageDeductions);

      const netPaidSalary = Decimal.max(0, earnings.sub(totalDeductions)).toDecimalPlaces(2);

      totalGrossSalaries = totalGrossSalaries.add(earnings);
      totalAdvancesRecovered = totalAdvancesRecovered.add(advanceDeductions).add(groceryKhataDeductions);
      totalNetPayout = totalNetPayout.add(netPaidSalary);

      // Persist MonthlyPayroll
      const payrollRecord = await this.prisma.monthlyPayroll.upsert({
        where: {
          userId_monthYear: {
            userId: emp.id,
            monthYear: dto.monthYear,
          },
        },
        update: {
          baseSalary,
          overtimePay,
          salesCommission,
          leaveDeductions,
          advanceDeductions,
          groceryKhataDeductions,
          posShortageDeductions,
          netPaidSalary,
          paidAt: new Date(),
        },
        create: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          userId: emp.id,
          monthYear: dto.monthYear,
          baseSalary,
          overtimePay,
          salesCommission,
          leaveDeductions,
          advanceDeductions,
          groceryKhataDeductions,
          posShortageDeductions,
          netPaidSalary,
          paidAt: new Date(),
        },
      });

      payrollResults.push({
        id: payrollRecord.id,
        userId: emp.id,
        staffName: emp.fullName,
        username: emp.username,
        roleName: emp.role.roleName,
        monthYear: dto.monthYear,
        earnings: {
          baseSalary: Number(baseSalary),
          overtimeHours: Number(totalOtHours),
          overtimeHourlyRate: Number(otHourlyRate),
          overtimePay: Number(overtimePay),
          salesCommission: Number(salesCommission),
          grossEarnings: Number(earnings),
        },
        deductions: {
          paidDays: Number(effectivePaidDays),
          absentDays: Number(absentDays),
          leaveDeductions: Number(leaveDeductions),
          advanceDeductions: Number(advanceDeductions),
          groceryKhataDeductions: Number(groceryKhataDeductions),
          posShortageDeductions: Number(posShortageDeductions),
          totalDeductions: Number(totalDeductions),
        },
        netPaidSalary: Number(netPaidSalary),
        payslipNumber: `PAY-${dto.monthYear.replace('-', '')}-${emp.username.toUpperCase()}`,
      });
    }

    // Optional Auto-Posting of Salary Journal to Double-Entry Ledger
    let journalVoucher = null;
    if (dto.postSalaryVoucher !== false && totalGrossSalaries.greaterThan(0)) {
      await this.setupService.ensureStandardChartOfAccounts(dto.tenantId);
      const getAccount = async (code: string) => {
        const acc = await this.setupService.getLedgerByCode(dto.tenantId, code);
        if (!acc) throw new NotFoundException(`Account ${code} not found`);
        return acc;
      };

      const salaryExpAcc = await getAccount('EXP_STAFF_SALARIES');
      const staffAdvancesAcc = await getAccount('ASSET_STAFF_ADVANCES');
      const bankOrPayableAcc = await getAccount('LIAB_SALARY_PAYABLE');

      const lines = [
        {
          ledgerAccountId: salaryExpAcc.id,
          debitAmount: totalGrossSalaries,
          creditAmount: new Decimal(0),
          narration: `Gross Staff Salaries & Incentives - ${dto.monthYear}`,
        },
      ];

      if (totalAdvancesRecovered.greaterThan(0)) {
        lines.push({
          ledgerAccountId: staffAdvancesAcc.id,
          debitAmount: new Decimal(0),
          creditAmount: totalAdvancesRecovered,
          narration: `Salary Advances & Grocery Khata Recovery - ${dto.monthYear}`,
        });
      }

      const netCreditToPayable = totalGrossSalaries.sub(totalAdvancesRecovered);
      if (netCreditToPayable.greaterThan(0)) {
        lines.push({
          ledgerAccountId: bankOrPayableAcc.id,
          debitAmount: new Decimal(0),
          creditAmount: netCreditToPayable,
          narration: `Net Salaries Payable - ${dto.monthYear}`,
        });
      }

      journalVoucher = await this.voucherService.postBalancedVoucherInternal({
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        voucherType: VoucherTypeEnum.SALARY_PAYROLL,
        voucherDate: new Date(),
        narration: `Monthly Supermarket Payroll Journal for Period ${dto.monthYear}`,
        lines,
      });

      this.logger.log(`Posted Payroll Voucher for ${dto.monthYear} (Gross: ₹${totalGrossSalaries.toFixed(2)})`);
    }

    return {
      success: true,
      monthYear: dto.monthYear,
      totalEmployeesProcessed: payrollResults.length,
      summary: {
        totalGrossSalaries: Number(totalGrossSalaries.toDecimalPlaces(2)),
        totalAdvancesRecovered: Number(totalAdvancesRecovered.toDecimalPlaces(2)),
        totalNetPayout: Number(totalNetPayout.toDecimalPlaces(2)),
      },
      voucherId: journalVoucher?.id,
      voucherNumber: journalVoucher?.voucherNumber,
      payrolls: payrollResults,
    };
  }
}
