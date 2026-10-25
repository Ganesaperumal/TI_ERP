import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BinTransferDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  sourceBinId!: string;

  @IsString()
  destinationBinId!: string;

  @IsString()
  productId!: string;

  @IsString()
  batchId!: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTransferItemDto {
  @IsString()
  productId!: string;

  @IsString()
  batchId!: string;

  @IsNumber()
  dispatchedQty!: number;
}

export class CreateStockTransferDto {
  @IsString()
  tenantId!: string;

  @IsString()
  transferNumber!: string;

  @IsString()
  originBranchId!: string;

  @IsString()
  destinationBranchId!: string;

  @IsOptional()
  @IsString()
  eWayBillNo?: string;

  @IsOptional()
  @IsString()
  vehicleNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransferItemDto)
  items!: CreateTransferItemDto[];
}

export class ReceiveStockTransferItemDto {
  @IsString()
  transferItemId!: string;

  @IsNumber()
  receivedQty!: number;

  @IsOptional()
  @IsNumber()
  shortageQty?: number;

  @IsOptional()
  @IsNumber()
  damagedQty?: number;
}

export class ReceiveStockTransferDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveStockTransferItemDto)
  items!: ReceiveStockTransferItemDto[];

  @IsOptional()
  @IsString()
  destinationBinId?: string;
}

export class StartCycleCountDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  sessionNumber!: string;

  @IsString()
  rackOrCategoryZone!: string;

  @IsOptional()
  @IsString()
  binId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class CountItemDto {
  @IsString()
  cycleCountItemId!: string;

  @IsNumber()
  physicalCountedQty!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitCycleCountsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountItemDto)
  countedItems!: CountItemDto[];
}

export class ApproveCycleCountDto {
  @IsString()
  approvedByUserId!: string;
}
