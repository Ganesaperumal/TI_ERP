import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PosBillingService } from './pos-billing.service';
import { PosParkedBillService } from './pos-parked-bill.service';
import { PosReturnService } from './pos-return.service';
import {
  ParkBillDto,
  PosCheckoutDto,
  ProcessSalesReturnDto,
} from './billing.dto';

@Controller('api/v1/pos/billing')
export class BillingController {
  constructor(
    private readonly billingService: PosBillingService,
    private readonly parkedService: PosParkedBillService,
    private readonly returnService: PosReturnService,
  ) {}

  @Post('park')
  async parkBill(@Body() dto: ParkBillDto) {
    return this.parkedService.parkBill(dto);
  }

  @Get('parked')
  async listParkedBills(@Query('branchId') branchId: string) {
    return this.parkedService.listParkedBills(branchId);
  }

  @Post('parked/:id/recall')
  async recallParkedBill(@Param('id') id: string) {
    return this.parkedService.recallParkedBill(id);
  }

  @Post('checkout')
  async checkout(@Body() dto: PosCheckoutDto) {
    return this.billingService.checkout(dto);
  }

  @Get('invoice-by-number/:invoiceNo')
  async getInvoiceByNumber(@Param('invoiceNo') invoiceNo: string) {
    return this.billingService.getInvoiceByNumber(invoiceNo);
  }

  @Post('returns')
  async processReturn(@Body() dto: ProcessSalesReturnDto) {
    return this.returnService.processSalesReturn(dto);
  }
}
