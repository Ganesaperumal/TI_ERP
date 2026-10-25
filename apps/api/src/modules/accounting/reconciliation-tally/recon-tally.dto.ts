import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
} from 'class-validator';

export class SettleBankBatchDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsArray()
  @IsString({ each: true })
  splitIds!: string[];

  @IsNumber()
  @Min(0.01)
  expectedGrossAmount!: number;

  @IsNumber()
  @Min(0.01)
  actualBankCreditedAmount!: number;

  @IsString()
  @IsNotEmpty()
  bankUtrNumber!: string;

  @IsString()
  @IsNotEmpty()
  settlementDate!: string; // YYYY-MM-DD

  @IsNumber()
  @IsOptional()
  discrepancyThresholdPct?: number; // default 2.5%
}

export class TallyExportFilterDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  to?: string;

  @IsOptional()
  includeAlreadyExported?: boolean;
}
