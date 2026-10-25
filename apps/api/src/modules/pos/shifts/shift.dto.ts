import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuditExceptionTypeEnum } from '@ti-erp/database';

export class OpenShiftDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  terminalId!: string;

  @IsString()
  cashierId!: string;

  @Type(() => Number)
  @IsNumber()
  openingFloat!: number;

  @IsOptional()
  @IsBoolean()
  blindCloseEnabled?: boolean;
}

export class SafeDropDto {
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  supervisorId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BlindCloseDto {
  @IsObject()
  denominations!: Record<string, number>; // e.g. { "500": 20, "200": 10, "100": 15, "50": 8, "20": 5, "10": 10, "coins": 45 }

  @IsOptional()
  @IsString()
  supervisorApprovedId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SupervisorOverrideDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  terminalId?: string;

  @IsString()
  cashierId!: string;

  @IsString()
  supervisorPinOrBadge!: string; // 4-digit PIN e.g. "9999" or encrypted badge barcode

  @IsEnum(AuditExceptionTypeEnum)
  exceptionType!: AuditExceptionTypeEnum;

  @IsOptional()
  @IsString()
  referenceEntity?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
