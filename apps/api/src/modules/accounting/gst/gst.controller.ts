import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Gstr1Service } from './gstr1.service';
import { Gstr2bReconciliationService } from './gstr2b-reconciliation.service';
import { Gstr3bService } from './gstr3b.service';
import { EInvoiceService } from './e-invoice.service';
import { ReconcileGstr2bDto, GenerateEWayBillDto } from './gst.dto';

@Controller('accounting/gst')
export class GstController {
  constructor(
    private readonly gstr1Service: Gstr1Service,
    private readonly gstr2bService: Gstr2bReconciliationService,
    private readonly gstr3bService: Gstr3bService,
    private readonly eInvoiceService: EInvoiceService,
  ) {}

  @Get('gstr1')
  async getGstr1(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.gstr1Service.generateGstr1(
      tenantId,
      branchId,
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Post('gstr2b-reconcile')
  async reconcileGstr2b(@Body() dto: ReconcileGstr2bDto) {
    return this.gstr2bService.reconcileGstr2b(dto);
  }

  @Get('gstr3b')
  async getGstr3b(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.gstr3bService.computeGstr3b(
      tenantId,
      branchId,
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Post('e-invoice/:invoiceId')
  async generateEInvoice(
    @Param('invoiceId') invoiceId: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.eInvoiceService.generateEInvoice(tenantId, invoiceId);
  }

  @Post('e-way-bill')
  async generateEWayBill(@Body() dto: GenerateEWayBillDto) {
    return this.eInvoiceService.generateEWayBill(dto);
  }
}
