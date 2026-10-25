import { Module } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';
import { AiInvoiceOcrService } from './ai-invoice-ocr.service';
import { AiCopilotController } from './ai-copilot.controller';
import { ProcurementModule } from '../procurement/procurement.module';

@Module({
  imports: [ProcurementModule],
  controllers: [AiCopilotController],
  providers: [AiProviderService, AiInvoiceOcrService],
  exports: [AiProviderService, AiInvoiceOcrService],
})
export class AiCopilotModule {}
