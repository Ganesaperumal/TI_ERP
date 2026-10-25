import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryStatusEnum } from '@ti-erp/database';

export class DeliveryOrderItemInputDto {
  @IsString()
  productId!: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @IsOptional()
  @IsNumber()
  mrp?: number;
}

export class CreateDeliveryOrderDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  customerId!: string;

  @IsString()
  deliveryAddress!: string;

  @IsOptional()
  @IsDateString()
  expectedDeliveryTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryOrderItemInputDto)
  items!: DeliveryOrderItemInputDto[];
}

export class UpdateDeliveryStatusDto {
  @IsEnum(DeliveryStatusEnum)
  status!: DeliveryStatusEnum;

  @IsOptional()
  @IsString()
  assignedRiderName?: string;

  @IsOptional()
  @IsString()
  assignedRiderPhone?: string;

  @IsOptional()
  @IsNumber()
  codAmountCollected?: number;
}

export class RiderSettlementDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  riderName!: string;

  @IsArray()
  @IsString({ each: true })
  settledOrderIds!: string[];

  @IsNumber()
  totalCashCollected!: number;

  @IsOptional()
  @IsNumber()
  totalUpiCollected?: number;
}

export class CreateQueueTokenDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  terminalId!: string;

  @IsString()
  cashierId!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsArray()
  cartData!: any[];
}
