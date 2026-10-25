import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { BankReconciliationService } from './bank-reconciliation.service';
import { TallyExportService } from './tally-export.service';
import { SettleBankBatchDto, TallyExportFilterDto } from './recon-tally.dto';

@Controller('accounting')
export class ReconTallyController {
  constructor(
    private readonly bankReconService: BankReconciliationService,
    private readonly tallyExportService: TallyExportService,
  ) {}

  @Get('recon/pending-settlements')
  async getPendingSettlements(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.bankReconService.getPendingSettlements(tenantId, branchId);
  }

  @Post('recon/settle-batch')
  async settleBatch(@Body() dto: SettleBankBatchDto) {
    return this.bankReconService.settleBatch(dto);
  }

  @Get('tally/export-xml')
  async exportTallyXml(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeAlreadyExported') includeAlreadyExported?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.tallyExportService.exportTallyXml({
      tenantId,
      branchId,
      from,
      to,
      includeAlreadyExported: includeAlreadyExported === 'true',
    });
  }
}
