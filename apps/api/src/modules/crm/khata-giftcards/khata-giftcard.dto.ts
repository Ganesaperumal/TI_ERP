import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';

export class RecordKhataRepaymentDto {
  @IsString()
  tenantId!: string;

  @IsString()
  customerId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  paymentMethod!: string; // CASH, UPI, NEFT, CHEQUE

  @IsOptional()
  @IsString()
  receiptRef?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  cashierId?: string;
}

export class ValidateKhataCheckoutDto {
  @IsString()
  tenantId!: string;

  @IsString()
  customerId!: string;

  @IsNumber()
  khataAmount!: number;

  @IsOptional()
  @IsString()
  supervisorPin?: string;
}

export class IssueGiftCardDto {
  @IsString()
  tenantId!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  cardBarcode?: string; // Auto-generated if not supplied

  @IsOptional()
  @IsNumber()
  expiryDays?: number; // Defaults to 365 days
}

export class CheckGiftCardBalanceDto {
  @IsString()
  tenantId!: string;

  @IsString()
  cardBarcode!: string;
}
