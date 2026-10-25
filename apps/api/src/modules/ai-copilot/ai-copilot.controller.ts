import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AiInvoiceOcrService } from './ai-invoice-ocr.service';
import { AiProviderService } from './ai-provider.service';
import { AiCopilotAnalyticsService } from './ai-copilot-analytics.service';
import {
  OcrPurchaseInvoiceDto,
  AskSupermarketDto,
  DesignClearanceCombosDto,
  TransliterateProductDto,
  ActivateClearancePromoDto,
} from './ai-copilot.dto';

@Controller('api/v1/ai-copilot')
export class AiCopilotController {
  constructor(
    private readonly ocrService: AiInvoiceOcrService,
    private readonly providerService: AiProviderService,
    private readonly analyticsService: AiCopilotAnalyticsService,
  ) {}

  @Post('ocr-purchase-invoice')
  async ocrPurchaseInvoice(@Body() dto: OcrPurchaseInvoiceDto) {
    return this.ocrService.ocrPurchaseInvoice(
      dto.tenantId,
      dto.branchId,
      dto.fileBase64,
      dto.mimeType,
      dto.rawTextOrCsv,
    );
  }

  @Post('ask-supermarket')
  async askSupermarket(@Body() dto: AskSupermarketDto) {
    return this.analyticsService.askSupermarket(dto);
  }

  @Post('design-clearance-combos')
  async designClearanceCombos(@Body() dto: DesignClearanceCombosDto) {
    return this.analyticsService.designClearanceCombos(dto);
  }

  @Post('activate-clearance-promo')
  async activateClearancePromo(@Body() dto: ActivateClearancePromoDto) {
    return this.analyticsService.activateClearancePromotion(dto);
  }

  @Post('transliterate-product')
  async transliterateProduct(@Body() dto: TransliterateProductDto) {
    return this.analyticsService.transliterateProduct(dto);
  }

  @Get('provider-status')
  async getProviderStatus(@Query('tenantId') tenantId: string) {
    const config = await this.providerService.getTenantAiConfig(tenantId);
    return {
      configured: !!config?.apiKey,
      provider: config?.provider ?? 'NONE',
      model: config?.model ?? 'default',
    };
  }
}
