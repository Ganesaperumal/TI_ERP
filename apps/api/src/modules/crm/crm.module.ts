import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { CustomerService } from './loyalty/customer.service';
import { LoyaltyEngineService } from './loyalty/loyalty-engine.service';
import { LoyaltyController } from './loyalty/loyalty.controller';
import { CustomerKhataService } from './khata-giftcards/customer-khata.service';
import { GiftCardService } from './khata-giftcards/gift-card.service';
import { KhataGiftCardController } from './khata-giftcards/khata-giftcard.controller';
import { CustomerIntelligenceService } from './campaigns/customer-intelligence.service';
import { DigitalReceiptService } from './campaigns/digital-receipt.service';
import { CampaignsController } from './campaigns/campaigns.controller';

@Module({
  imports: [CoreModule],
  controllers: [
    LoyaltyController,
    KhataGiftCardController,
    CampaignsController,
  ],
  providers: [
    CustomerService,
    LoyaltyEngineService,
    CustomerKhataService,
    GiftCardService,
    CustomerIntelligenceService,
    DigitalReceiptService,
  ],
  exports: [
    CustomerService,
    LoyaltyEngineService,
    CustomerKhataService,
    GiftCardService,
    CustomerIntelligenceService,
    DigitalReceiptService,
  ],
})
export class CrmModule {}
