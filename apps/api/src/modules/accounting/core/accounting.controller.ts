import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AccountingSetupService } from './accounting-setup.service';
import { AccountingVoucherService } from './accounting-voucher.service';
import { FinancialReportService } from './financial-report.service';
import {
  CreateJournalVoucherDto,
  PostStoreExpenseDto,
  PostWastageWriteOffDto,
} from './accounting.dto';
import { Decimal } from '@ti-erp/database';

@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly setupService: AccountingSetupService,
    private readonly voucherService: AccountingVoucherService,
    private readonly reportService: FinancialReportService,
  ) {}

  @Post('setup-coa')
  async setupChartOfAccounts(@Body() body: { tenantId: string }) {
    if (!body.tenantId) throw new BadRequestException('tenantId is required');
    const accounts = await this.setupService.ensureStandardChartOfAccounts(body.tenantId);
    return { success: true, count: accounts.length, accounts };
  }

  @Post('vouchers')
  async createVoucher(@Body() dto: CreateJournalVoucherDto) {
    return this.voucherService.createVoucher(dto);
  }

  @Post('expenses')
  async postStoreExpense(@Body() dto: PostStoreExpenseDto) {
    return this.voucherService.postStoreExpenseVoucher(dto.tenantId, dto.branchId, dto);
  }

  @Post('wastage')
  async postWastageWriteOff(@Body() dto: PostWastageWriteOffDto) {
    return this.voucherService.postWastageOrDamageWriteOff(
      dto.tenantId,
      dto.branchId,
      new Decimal(dto.amount),
      dto.reason,
    );
  }

  @Get('reports/day-book')
  async getDayBook(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('date') date?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.reportService.getDayBook(tenantId, branchId, date);
  }

  @Get('reports/cash-bank-book')
  async getCashBankBook(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.reportService.getCashBankBook(tenantId, branchId, fromDate, toDate);
  }

  @Get('reports/trial-balance')
  async getTrialBalance(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.reportService.getTrialBalance(tenantId, branchId, asOfDate);
  }

  @Get('reports/profit-and-loss')
  async getProfitAndLoss(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.reportService.getProfitAndLoss(tenantId, branchId, fromDate, toDate);
  }

  @Get('reports/balance-sheet')
  async getBalanceSheet(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.reportService.getBalanceSheet(tenantId, branchId, asOfDate);
  }
}
