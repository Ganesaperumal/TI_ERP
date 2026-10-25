import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class SendDigitalReceiptDto {
  @IsString()
  tenantId!: string;

  @IsOptional()
  @IsString()
  phoneOverride?: string;
}

export class CustomerFeedbackDto {
  @IsString()
  invoiceId!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number; // 1 to 5 stars

  @IsOptional()
  @IsString()
  comments?: string;
}

export class CreateRationComebackCouponDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  couponCode!: string; // e.g. "RATION100"

  @IsNumber()
  discountAmount!: number; // e.g. 100

  @IsNumber()
  minBillAmount!: number; // e.g. 1000

  @IsOptional()
  @IsNumber()
  validityDays?: number; // e.g. 7 days
}
