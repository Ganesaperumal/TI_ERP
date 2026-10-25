import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { CustomerKhataService } from './customer-khata.service';
import { GiftCardService } from './gift-card.service';
import {
  RecordKhataRepaymentDto,
  ValidateKhataCheckoutDto,
  IssueGiftCardDto,
} from './khata-giftcard.dto';

@Controller('api/v1/crm')
export class KhataGiftCardController {
  constructor(
    private readonly khataService: CustomerKhataService,
    private readonly giftCardService: GiftCardService,
  ) {}

  @Post('khata/validate')
  validateKhataCheckout(@Body() dto: ValidateKhataCheckoutDto) {
    return this.khataService.validateKhataCheckout(dto);
  }

  @Post('khata/repayment')
  recordRepayment(@Body() dto: RecordKhataRepaymentDto) {
    return this.khataService.recordRepayment(dto);
  }

  @Get('khata/monthly-statements')
  getMonthlyStatements(
    @Query('tenantId') tenantId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.khataService.getMonthlyStatements(
      tenantId,
      month !== undefined ? Number(month) : undefined,
      year !== undefined ? Number(year) : undefined,
    );
  }

  @Post('khata/:customerId/send-whatsapp-statement')
  sendWhatsAppStatement(
    @Param('customerId') customerId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.khataService.sendWhatsAppStatement(tenantId, customerId);
  }

  @Post('gift-cards/issue')
  issueGiftCard(@Body() dto: IssueGiftCardDto) {
    return this.giftCardService.issueGiftCard(dto);
  }

  @Get('gift-cards/validate/:cardBarcode')
  validateGiftCard(
    @Param('cardBarcode') cardBarcode: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.giftCardService.validateGiftCard(tenantId, cardBarcode);
  }

  @Get('gift-cards')
  getGiftCards(@Query('tenantId') tenantId: string, @Query('limit') limit?: number) {
    return this.giftCardService.getGiftCards(tenantId, limit ? Number(limit) : 50);
  }
}
