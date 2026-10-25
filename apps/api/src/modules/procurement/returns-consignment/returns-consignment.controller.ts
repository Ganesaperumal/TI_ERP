import {
  Controller,
  Get,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { ReturnsConsignmentService } from './returns-consignment.service';
import {
  ReturnableDamagesQueryDto,
  CreateDebitNoteDto,
  ConsignmentSettlementPreviewQueryDto,
  CreateConsignmentSettlementDto,
} from './returns-consignment.dto';

@Controller('api/v1/procurement')
export class ReturnsConsignmentController {
  constructor(private readonly service: ReturnsConsignmentService) {}

  @Get('returns/returnable-damages')
  async getReturnableDamages(@Query() query: ReturnableDamagesQueryDto) {
    return this.service.getReturnableDamages(query);
  }

  @Post('returns/debit-note')
  async createDebitNote(@Body() dto: CreateDebitNoteDto) {
    return this.service.createDebitNote(dto);
  }

  @Get('returns/debit-notes')
  async listDebitNotes(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.service.listDebitNotes(tenantId, branchId, supplierId);
  }

  @Get('consignment/settlement-preview')
  async getConsignmentPreview(@Query() query: ConsignmentSettlementPreviewQueryDto) {
    return this.service.getConsignmentSettlementPreview(query);
  }

  @Post('consignment/settle')
  async settleConsignment(@Body() dto: CreateConsignmentSettlementDto) {
    return this.service.settleConsignment(dto);
  }

  @Get('consignment/settlements')
  async listSettlements(
    @Query('tenantId') tenantId: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.service.listConsignmentSettlements(tenantId, supplierId);
  }
}
