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

@Module({
  controllers: [
    ShiftController,
    PromotionController,
    BillingController,
  ],
  providers: [
    PosShiftService,
    PosSecurityService,
    PromotionEngineService,
    PosBillingService,
    PosParkedBillService,
    PosReturnService,
  ],
  exports: [
    PosShiftService,
    PosSecurityService,
    PromotionEngineService,
    PosBillingService,
    PosParkedBillService,
    PosReturnService,
  ],
})
export class PosModule {}
