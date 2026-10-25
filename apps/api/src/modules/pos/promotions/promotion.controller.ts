import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PromotionEngineService } from './promotion-engine.service';
import { CreatePromotionDto, EvaluateCartDto } from './promotion.dto';

@Controller('api/v1/pos/promotions')
export class PromotionController {
  constructor(private readonly promoService: PromotionEngineService) {}

  @Post()
  async createPromotion(@Body() dto: CreatePromotionDto) {
    return this.promoService.createPromotion(dto);
  }

  @Get()
  async listPromotions(@Query('tenantId') tenantId: string) {
    return this.promoService.listPromotions(tenantId);
  }

  @Post('evaluate-cart')
  async evaluateCart(@Body() dto: EvaluateCartDto) {
    return this.promoService.evaluateCartPromotions(dto);
  }
}
