import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
} from 'class-validator';
import {
  BranchTypeEnum,
  GstRegimeEnum,
  StorageBinTypeEnum,
  TopologyModeEnum,
} from '@ti-erp/database';
import { StoreConfig } from '@ti-erp/shared-types';

export class CreateTenantDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  legalTradeName?: string;

  @IsString()
  primaryContact!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(GstRegimeEnum)
  gstRegime?: GstRegimeEnum;

  @IsOptional()
  @IsEnum(TopologyModeEnum)
  topology?: TopologyModeEnum;

  @IsOptional()
  @IsObject()
  byokAiConfig?: Record<string, unknown>;
}

export class CreateBranchDto {
  @IsString()
  tenantId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(BranchTypeEnum)
  branchType?: BranchTypeEnum;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  regionalLanguage?: string;

  @IsOptional()
  @IsString()
  localServerIp?: string;

  @IsOptional()
  @IsObject()
  branchSettings?: Partial<StoreConfig>;
}

export class CreateStorageBinDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  binCode!: string;

  @IsOptional()
  @IsEnum(StorageBinTypeEnum)
  binType?: StorageBinTypeEnum;

  @IsOptional()
  @IsString()
  aisle?: string;

  @IsOptional()
  @IsString()
  rack?: string;

  @IsOptional()
  @IsString()
  shelf?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePosTerminalDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  terminalCode!: string;

  @IsOptional()
  @IsString()
  macAddress?: string;

  @IsOptional()
  @IsBoolean()
  hardwareLocked?: boolean;

  @IsOptional()
  @IsString()
  printerIp?: string;

  @IsOptional()
  @IsString()
  scalePort?: string;

  @IsOptional()
  @IsString()
  edcTerminalId?: string;
}

export class UpdateStoreConfigDto {
  @IsObject()
  config!: Partial<StoreConfig>;
}
