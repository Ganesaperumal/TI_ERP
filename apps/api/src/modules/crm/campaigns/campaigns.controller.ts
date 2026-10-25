import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { CustomerIntelligenceService } from './customer-intelligence.service';
import { DigitalReceiptService } from './digital-receipt.service';
import {
  CustomerFeedbackDto,
  CreateRationComebackCouponDto,
  SendDigitalReceiptDto,
} from './campaigns.dto';

@Controller('api/v1/crm/campaigns')
export class CampaignsController {
  constructor(
    private readonly intelligenceService: CustomerIntelligenceService,
    private readonly digitalReceiptService: DigitalReceiptService,
  ) {}

  @Get('rfm-segments')
  getRfmSegments(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.intelligenceService.getRfmSegments(tenantId, branchId);
  }

  @Get('missing-monthly-ration')
  getMissingMonthlyRation(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.intelligenceService.getMissingMonthlyRationCustomers(tenantId, branchId);
  }

  @Post('ration-comeback-coupon')
  createRationComebackCoupon(@Body() dto: CreateRationComebackCouponDto) {
    return this.intelligenceService.createRationComebackCoupon(dto);
  }

  @Post('send-digital-receipt/:invoiceId')
  sendDigitalReceipt(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: SendDigitalReceiptDto,
  ) {
    return this.digitalReceiptService.sendDigitalReceipt(
      dto.tenantId,
      invoiceId,
      dto.phoneOverride,
    );
  }

  @Post('feedback')
  recordFeedback(@Body() dto: CustomerFeedbackDto) {
    return this.digitalReceiptService.recordCustomerFeedback(dto);
  }

  @Get('feedbacks')
  getRecentFeedbacks() {
    return this.digitalReceiptService.getRecentFeedbacks();
  }
}
