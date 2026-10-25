import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnableDamagesQueryDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  supplierId?: string;
}

export class DebitNoteLineDto {
  @IsString()
  productId!: string;

  @IsString()
  batchNumber!: string;

  @Type(() => Number)
  @IsNumber()
  returnedQty!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitCost?: number;

  @IsOptional()
  @IsString()
  sourceBinType?: 'DAMAGED_RETURNABLE' | 'GODOWN' | 'SHOP_FLOOR';
}

export class CreateDebitNoteDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  supplierId!: string;

  @IsString()
  reason!: 'DAMAGED' | 'EXPIRED' | 'RATE_DIFFERENCE';

  @IsString()
  settlementMode!: 'DEDUCT_FROM_NEXT_PAYMENT' | 'FREE_REPLACEMENT_TRACKER';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebitNoteLineDto)
  lines!: DebitNoteLineDto[];
}

export class ConsignmentSettlementPreviewQueryDto {
  @IsString()
  branchId!: string;

  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  storeCommissionPct?: number;
}

export class CreateConsignmentSettlementDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  supplierId!: string;

  @IsString()
  periodStart!: string;

  @IsString()
  periodEnd!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  storeCommissionPct?: number;
}
