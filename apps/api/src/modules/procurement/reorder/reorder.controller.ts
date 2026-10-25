import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { AutoReorderService } from './auto-reorder.service';
import { PurchaseOrderService } from './purchase-order.service';
import {
  GetReorderSuggestionsQueryDto,
  CreatePurchaseOrderDto,
  UpdatePoStatusDto,
  DispatchWhatsAppDto,
} from './reorder.dto';
import { PoStatusEnum } from '@ti-erp/database';

@Controller('api/v1/procurement')
export class ReorderController {
  constructor(
    private readonly reorderService: AutoReorderService,
    private readonly poService: PurchaseOrderService,
  ) {}

  @Get('reorder/suggestions')
  async getSuggestions(@Query() query: GetReorderSuggestionsQueryDto) {
    return this.reorderService.getReorderSuggestions(query);
  }

  @Post('purchase-orders')
  async createPo(@Body() dto: CreatePurchaseOrderDto) {
    return this.poService.createPo(dto);
  }

  @Get('purchase-orders')
  async listPos(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: PoStatusEnum,
  ) {
    return this.poService.list(tenantId, branchId, supplierId, status);
  }

  @Get('purchase-orders/:id')
  async getPo(@Param('id') id: string) {
    return this.poService.findOne(id);
  }

  @Put('purchase-orders/:id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdatePoStatusDto) {
    return this.poService.updateStatus(id, dto);
  }

  @Post('purchase-orders/:id/dispatch-whatsapp')
  async dispatchWhatsApp(
    @Param('id') id: string,
    @Body() dto?: DispatchWhatsAppDto,
  ) {
    return this.poService.dispatchWhatsApp(id, dto);
  }
}
