import { Module } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';
import { AiInvoiceOcrService } from './ai-invoice-ocr.service';
import { AiCopilotAnalyticsService } from './ai-copilot-analytics.service';
import { AiCopilotController } from './ai-copilot.controller';
import { ProcurementModule } from '../procurement/procurement.module';

@Module({
  imports: [ProcurementModule],
  controllers: [AiCopilotController],
  providers: [AiProviderService, AiInvoiceOcrService, AiCopilotAnalyticsService],
  exports: [AiProviderService, AiInvoiceOcrService, AiCopilotAnalyticsService],
})
export class AiCopilotModule {}
