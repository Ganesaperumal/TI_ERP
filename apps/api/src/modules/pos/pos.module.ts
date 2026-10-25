import { Module } from '@nestjs/common';
import { ShiftController } from './shifts/shift.controller';
import { PosShiftService } from './shifts/pos-shift.service';
import { PosSecurityService } from './shifts/pos-security.service';
import { PromotionController } from './promotions/promotion.controller';
import { PromotionEngineService } from './promotions/promotion-engine.service';
import { BillingController } from './billing/billing.controller';
import { PosBillingService } from './billing/pos-billing.service';
import { PosParkedBillService } from './billing/pos-parked-bill.service';
import { PosReturnService } from './billing/pos-return.service';
import { FulfillmentController } from './fulfillment/fulfillment.controller';
import { HomeDeliveryService } from './fulfillment/home-delivery.service';
import { QueueBusterService } from './fulfillment/queue-buster.service';

@Module({
  controllers: [
    ShiftController,
    PromotionController,
    BillingController,
    FulfillmentController,
  ],
  providers: [
    PosShiftService,
    PosSecurityService,
    PromotionEngineService,
    PosBillingService,
    PosParkedBillService,
    PosReturnService,
    HomeDeliveryService,
    QueueBusterService,
  ],
  exports: [
    PosShiftService,
    PosSecurityService,
    PromotionEngineService,
    PosBillingService,
    PosParkedBillService,
    PosReturnService,
    HomeDeliveryService,
    QueueBusterService,
  ],
})
export class PosModule {}
