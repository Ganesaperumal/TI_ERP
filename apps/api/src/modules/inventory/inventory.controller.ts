import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { InventoryBatchService } from './inventory-batch.service';
import {
  CreateInventoryBatchDto,
  ResolveBatchForPosSaleDto,
  ApplyClearanceOfferDto,
  ExecuteRepackingJobDto,
  AssemblePrePackedComboDto,
} from './inventory.dto';

@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryBatchService) {}

  @Post('batches')
  createBatch(@Body() dto: CreateInventoryBatchDto) {
    return this.inventoryService.createBatch(dto);
  }

  // POS Batch Resolution (FEFO vs. MRP-Popup)
  @Post('resolve-pos-batch')
  resolvePosBatch(@Body() dto: ResolveBatchForPosSaleDto) {
    return this.inventoryService.resolveBatchForPosSale(dto);
  }

  // Near-Expiry Items
  @Get('near-expiry')
  getNearExpiry(
    @Query('branchId') branchId: string,
    @Query('days') days?: number,
  ) {
    return this.inventoryService.getNearExpiryBatches(branchId, days ? Number(days) : 30);
  }

  // 1-Click Clearance Offer
  @Post('clearance-offer')
  applyClearanceOffer(@Body() dto: ApplyClearanceOfferDto) {
    return this.inventoryService.applyClearanceOffer(dto);
  }

  // Bulk-to-Retail Repacking
  @Post('repacking')
  executeRepacking(@Body() dto: ExecuteRepackingJobDto) {
    return this.inventoryService.executeRepackingJob(dto);
  }

  // Pre-Packed Combo Assembly
  @Post('combos/assemble')
  assembleCombo(@Body() dto: AssemblePrePackedComboDto) {
    return this.inventoryService.assemblePrePackedCombo(dto);
  }
}
