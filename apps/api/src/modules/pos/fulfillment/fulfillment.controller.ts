import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { HomeDeliveryService } from './home-delivery.service';
import { QueueBusterService } from './queue-buster.service';
import {
  CreateDeliveryOrderDto,
  UpdateDeliveryStatusDto,
  RiderSettlementDto,
  CreateQueueTokenDto,
} from './fulfillment.dto';
import { DeliveryStatusEnum } from '@ti-erp/database';

@Controller('api/v1/pos/fulfillment')
export class FulfillmentController {
  constructor(
    private readonly deliveryService: HomeDeliveryService,
    private readonly queueBusterService: QueueBusterService,
  ) {}

  @Post('delivery-orders')
  createDeliveryOrder(@Body() dto: CreateDeliveryOrderDto) {
    return this.deliveryService.createDeliveryOrder(dto);
  }

  @Get('delivery-orders')
  getDeliveryOrders(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId: string,
    @Query('status') status?: DeliveryStatusEnum,
  ) {
    return this.deliveryService.getDeliveryOrders(tenantId, branchId, status);
  }

  @Get('delivery-orders/:id/pick-list')
  getAisleSortedPickList(@Param('id') id: string) {
    return this.deliveryService.getAisleSortedPickList(id);
  }

  @Put('delivery-orders/:id/status')
  updateDeliveryStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.deliveryService.updateDeliveryStatus(id, dto);
  }

  @Post('rider-settlement')
  settleRiderShift(@Body() dto: RiderSettlementDto) {
    return this.deliveryService.settleRiderShift(dto);
  }

  @Post('queue-buster/create-token')
  createQueueToken(@Body() dto: CreateQueueTokenDto) {
    return this.queueBusterService.createQueueToken(dto);
  }

  @Get('queue-buster/token/:tokenCode')
  getQueueTokenCart(
    @Param('tokenCode') tokenCode: string,
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.queueBusterService.getQueueTokenCart(tenantId, branchId, tokenCode);
  }
}
