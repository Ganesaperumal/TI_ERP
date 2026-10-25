import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CreateSaaSLicenseDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  tenantCode!: string;

  @IsString()
  @IsNotEmpty()
  tenantName!: string;

  @IsString()
  @IsNotEmpty()
  primaryContact!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  planTier?: string; // e.g. "STARTER", "STANDARD", "ENTERPRISE"

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  maxBranches?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  maxTerminals?: number;

  @IsArray()
  @IsOptional()
  activeModules?: string[];

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(60)
  amcMonths?: number;

  @IsBoolean()
  @IsOptional()
  seedDemoCatalog?: boolean;
}

export class UpdateLicenseModulesDto {
  @IsArray()
  @IsNotEmpty()
  activeModules!: string[];
}

export class RenewLicenseDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(60)
  extensionMonths!: number;
}

export class ToggleLicenseStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}
