import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { GrnService } from './grn.service';
import {
  CalculateGrnCostingInputDto,
  CreateFastDirectGrnDto,
  GateEntryDto,
  BlindCountSubmitDto,
  ThreeWayMatchSubmitDto,
} from './grn.dto';

@Controller('api/v1/procurement/grn')
export class GrnController {
  constructor(private readonly grnService: GrnService) {}

  @Post('calculate-costing')
  calculateCosting(@Body() dto: CalculateGrnCostingInputDto) {
    const res = this.grnService.calculateGrnLineCosting(dto);
    return {
      grossLineValue: Number(res.grossLineValue),
      tradeDiscountValue: Number(res.tradeDiscountValue),
      cashDiscountValue: Number(res.cashDiscountValue),
      taxableAmount: Number(res.taxableAmount),
      cgstAmount: Number(res.cgstAmount),
      sgstAmount: Number(res.sgstAmount),
      igstAmount: Number(res.igstAmount),
      cessAmount: Number(res.cessAmount),
      totalGstAmount: Number(res.totalGstAmount),
      lineTotal: Number(res.lineTotal),
      totalReceivedUnits: Number(res.totalReceivedUnits),
      netLandingCostPerBaseUnit: Number(res.netLandingCostPerBaseUnit),
      actualMarginPct: Number(res.actualMarginPct),
      marginGuardrailTriggered: res.marginGuardrailTriggered,
      alertColor: res.alertColor,
      suggestedRetailSellingPrice: Number(res.suggestedRetailSellingPrice),
      currentRetailSellingPrice: Number(res.currentRetailSellingPrice),
      costIncreased: res.costIncreased,
    };
  }

  @Post('fast-direct')
  async createFastDirect(@Body() dto: CreateFastDirectGrnDto) {
    return this.grnService.createFastDirectGrn(dto);
  }

  @Post('gate-entry')
  async gateEntry(@Body() dto: GateEntryDto) {
    return this.grnService.gateEntry(dto);
  }

  @Post(':id/blind-count')
  async submitBlindCount(
    @Param('id') id: string,
    @Body() dto: BlindCountSubmitDto,
  ) {
    return this.grnService.blindCount(id, dto);
  }

  @Post(':id/three-way-match')
  async matchThreeWay(
    @Param('id') id: string,
    @Body() dto: ThreeWayMatchSubmitDto,
  ) {
    return this.grnService.matchThreeWay(id, dto);
  }

  @Get()
  async list(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.grnService.list(tenantId, branchId, supplierId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.grnService.findOne(id);
  }
}
