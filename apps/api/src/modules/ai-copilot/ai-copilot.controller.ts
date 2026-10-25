import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AiInvoiceOcrService } from './ai-invoice-ocr.service';
import { AiProviderService } from './ai-provider.service';
import { OcrPurchaseInvoiceDto } from './ai-copilot.dto';

@Controller('api/v1/ai-copilot')
export class AiCopilotController {
  constructor(
    private readonly ocrService: AiInvoiceOcrService,
    private readonly providerService: AiProviderService,
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
