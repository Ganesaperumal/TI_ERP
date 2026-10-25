import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoyaltyTierEnum } from '@ti-erp/database';

export class CreateCustomerDto {
  @IsString()
  tenantId!: string;

  @IsString()
  phone!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  rationCycleDayStart?: number; // 1 to 10
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(LoyaltyTierEnum)
  loyaltyTier?: LoyaltyTierEnum;

  @IsOptional()
  @IsNumber()
  khataCreditLimit?: number;

  @IsOptional()
  @IsNumber()
  rationCycleDayStart?: number;
}

export class RequestRedemptionOtpDto {
  @IsString()
  tenantId!: string;

  @IsString()
  customerId!: string;

  @IsNumber()
  pointsToRedeem!: number;
}

export class VerifyRedemptionOtpDto {
  @IsString()
  customerId!: string;

  @IsString()
  otp!: string;
}

export class LoyaltyCartItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  lineTotal!: number;

  @IsOptional()
  @IsString()
  categorySlug?: string; // e.g. 'staples' (0.25x), 'apparel' (2.0x)
}

export class CalculatePointsDto {
  @IsString()
  tenantId!: string;

  @IsNumber()
  netPayable!: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(LoyaltyTierEnum)
  currentTier?: LoyaltyTierEnum;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoyaltyCartItemDto)
  items?: LoyaltyCartItemDto[];
}
