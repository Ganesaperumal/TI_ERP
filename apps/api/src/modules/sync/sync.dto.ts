import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
} from 'class-validator';
import { SyncOperationEnum } from '@ti-erp/database';

export class QueueMutationDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  entityName!: string; // 'PosInvoice', 'Product', 'Customer', 'StockLedger'

  @IsString()
  @IsNotEmpty()
  recordId!: string;

  @IsEnum(SyncOperationEnum)
  operation!: SyncOperationEnum;

  @IsObject()
  payload!: Record<string, any>;
}

export class PushToCloudDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  batchSize?: number; // default 250
}

export class PullFromCloudDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsOptional()
  sinceVersion?: string; // BigInt as string
}
