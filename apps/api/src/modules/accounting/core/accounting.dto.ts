import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherTypeEnum } from '@ti-erp/database';

export class VoucherLineDto {
  @IsString()
  @IsNotEmpty()
  ledgerAccountId!: string;

  @IsNumber()
  @Min(0)
  debitAmount!: number;

  @IsNumber()
  @Min(0)
  creditAmount!: number;

  @IsString()
  @IsOptional()
  narration?: string;
}

export class CreateJournalVoucherDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsOptional()
  voucherNumber?: string;

  @IsString()
  @IsOptional()
  voucherDate?: string;

  @IsEnum(VoucherTypeEnum)
  voucherType!: VoucherTypeEnum;

  @IsString()
  @IsNotEmpty()
  narration!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoucherLineDto)
  lines!: VoucherLineDto[];
}

export class PostStoreExpenseDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  expenseAccountCode!: string; // e.g. EXP_STORE_RENT, EXP_ELECTRICITY_BILL

  @IsNumber()
  @Min(0.01)
  amount!: number; // Net/Gross amount

  @IsString()
  @IsOptional()
  paymentAccountCode?: string; // Default 'ASSET_CASH_DRAWER'

  @IsNumber()
  @IsOptional()
  gstRatePct?: number; // e.g. 18 for 18% GST (9% CGST + 9% SGST)

  @IsBoolean()
  @IsOptional()
  isGstClaimable?: boolean;

  @IsString()
  @IsOptional()
  vendorGstin?: string;

  @IsString()
  @IsOptional()
  vendorInvoiceNo?: string;

  @IsString()
  @IsNotEmpty()
  narration!: string;
}

export class PostWastageWriteOffDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class FinancialReportFilterDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  date?: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  fromDate?: string;

  @IsString()
  @IsOptional()
  toDate?: string;
}
