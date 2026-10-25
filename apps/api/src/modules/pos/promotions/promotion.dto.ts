import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PromotionTypeEnum } from '@ti-erp/database';

export class CreatePromotionDto {
  @IsString()
  tenantId!: string;

  @IsString()
  name!: string;

  @IsEnum(PromotionTypeEnum)
  promoType!: PromotionTypeEnum;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @IsOptional()
  @IsArray()
  activeDaysOfWeek?: number[]; // [1, 2, 3, 4, 5, 6, 7]

  @IsOptional()
  @IsString()
  startHourTime?: string; // e.g. "16:00"

  @IsOptional()
  @IsString()
  endHourTime?: string; // e.g. "20:00"

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsObject()
  conditionConfig!: Record<string, any>;

  @IsObject()
  rewardConfig!: Record<string, any>;
}

export class CartLineDto {
  @IsString()
  productId!: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  unitPrice!: number;

  @Type(() => Number)
  @IsNumber()
  lineTotal!: number;
}

export class EvaluateCartDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  customerTier?: 'SILVER' | 'GOLD' | 'VIP';

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartLineDto)
  cartLines!: CartLineDto[];
}
