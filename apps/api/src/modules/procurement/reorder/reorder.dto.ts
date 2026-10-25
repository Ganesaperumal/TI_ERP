import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PoStatusEnum } from '@ti-erp/database';

export class GetReorderSuggestionsQueryDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  rule?: 'MIN_MAX' | 'SALES_VELOCITY' | 'HYBRID';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  velocityDays?: number;
}

export class PurchaseOrderItemInputDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsNumber()
  orderedQty!: number;

  @Type(() => Number)
  @IsNumber()
  unitPrice!: number;

  @Type(() => Number)
  @IsNumber()
  taxPct!: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items!: PurchaseOrderItemInputDto[];
}

export class UpdatePoStatusDto {
  @IsEnum(PoStatusEnum)
  status!: PoStatusEnum;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class DispatchWhatsAppDto {
  @IsOptional()
  @IsString()
  targetPhoneNumber?: string;

  @IsOptional()
  @IsString()
  customNote?: string;
}
