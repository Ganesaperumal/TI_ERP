import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEmail,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  tenantId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  legalTradeName?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  paymentTermsDays?: number; // e.g. 14 or 30 days

  @IsOptional()
  @IsNumber()
  earlyPaymentCashDiscountPct?: number; // e.g. 2.0%

  @IsOptional()
  @IsNumber()
  cashDiscountEligibilityDays?: number; // e.g. within 7 days

  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @IsOptional()
  @IsNumber()
  openingBalance?: number;

  @IsOptional()
  @IsBoolean()
  isConsignmentVendor?: boolean;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankIfscCode?: string;
}

export class UpdateSupplierDto extends CreateSupplierDto {}
