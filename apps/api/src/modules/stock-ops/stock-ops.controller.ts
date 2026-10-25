import { Controller, Post, Body, Param } from '@nestjs/common';
import { StockOpsService } from './stock-ops.service';
import {
  BinTransferDto,
  CreateStockTransferDto,
  ReceiveStockTransferDto,
  StartCycleCountDto,
  SubmitCycleCountsDto,
  ApproveCycleCountDto,
} from './stock-ops.dto';

@Controller('api/v1/stock-ops')
export class StockOpsController {
  constructor(private readonly stockOpsService: StockOpsService) {}

  // 1. Internal Bin Transfer
  @Post('bin-transfer')
  binTransfer(@Body() dto: BinTransferDto) {
    return this.stockOpsService.executeBinTransfer(dto);
  }

  // 2. Inter-Branch Stock Transfers
  @Post('transfers')
  createTransfer(@Body() dto: CreateStockTransferDto) {
    return this.stockOpsService.createStockTransfer(dto);
  }

  @Post('transfers/:id/receive')
  receiveTransfer(
    @Param('id') id: string,
    @Body() dto: ReceiveStockTransferDto,
  ) {
    return this.stockOpsService.receiveStockTransfer(id, dto);
  }

  // 3. Live Cycle Counting
  @Post('cycle-count/start')
  startCycleCount(@Body() dto: StartCycleCountDto) {
    return this.stockOpsService.startCycleCount(dto);
  }

  @Post('cycle-count/:id/submit-counts')
  submitCounts(
    @Param('id') id: string,
    @Body() dto: SubmitCycleCountsDto,
  ) {
    return this.stockOpsService.submitCycleCounts(id, dto);
  }

  @Post('cycle-count/:id/approve')
  approveCycleCount(
    @Param('id') id: string,
    @Body() dto: ApproveCycleCountDto,
  ) {
    return this.stockOpsService.approveCycleCount(id, dto);
  }
}
