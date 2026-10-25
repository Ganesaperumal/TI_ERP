import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { LoyaltyEngineService } from './loyalty-engine.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CalculatePointsDto,
  RequestRedemptionOtpDto,
  VerifyRedemptionOtpDto,
} from './loyalty.dto';
import { LoyaltyTierEnum } from '@ti-erp/database';

@Controller('api/v1/crm')
export class LoyaltyController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly loyaltyEngine: LoyaltyEngineService,
  ) {}

  @Get('customers/by-phone/:phone')
  findByPhone(
    @Param('phone') phone: string,
    @Query('tenantId') tenantId: string,
    @Query('autoRegisterName') autoRegisterName?: string,
  ) {
    return this.customerService.findByPhone(tenantId, phone, autoRegisterName);
  }

  @Post('customers')
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.customerService.createCustomer(dto);
  }

  @Put('customers/:id')
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customerService.updateCustomer(id, dto);
  }

  @Get('customers')
  getCustomers(
    @Query('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('tier') tier?: LoyaltyTierEnum,
    @Query('limit') limit?: number,
  ) {
    return this.customerService.getCustomers(tenantId, search, tier, limit ? Number(limit) : 50);
  }

  @Post('loyalty/calculate-points')
  calculatePoints(@Body() dto: CalculatePointsDto) {
    return this.loyaltyEngine.calculatePointsEarned(dto);
  }

  @Post('loyalty/request-redemption-otp')
  requestRedemptionOtp(@Body() dto: RequestRedemptionOtpDto) {
    return this.loyaltyEngine.requestRedemptionOtp(dto);
  }

  @Post('loyalty/verify-redemption')
  verifyRedemptionOtp(@Body() dto: VerifyRedemptionOtpDto) {
    return this.loyaltyEngine.verifyRedemptionOtp(dto);
  }
}
