import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Gstr2bLineItemDto {
  @IsString()
  @IsNotEmpty()
  supplierGstin!: string;

  @IsString()
  @IsNotEmpty()
  supplierTradeName?: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber!: string;

  @IsString()
  @IsNotEmpty()
  invoiceDate!: string;

  @IsNumber()
  @Min(0)
  taxableAmount!: number;

  @IsNumber()
  @Min(0)
  cgst!: number;

  @IsNumber()
  @Min(0)
  sgst!: number;

  @IsNumber()
  @Min(0)
  igst!: number;

  @IsNumber()
  @Min(0)
  cess!: number;
}

export class ReconcileGstr2bDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  filingPeriod!: string; // e.g. "2026-10"

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Gstr2bLineItemDto)
  gstr2bInvoices!: Gstr2bLineItemDto[];
}

export class GenerateEWayBillDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  @IsString()
  @IsNotEmpty()
  transporterId!: string;

  @IsString()
  @IsNotEmpty()
  transporterName!: string;

  @IsString()
  @IsNotEmpty()
  vehicleNumber!: string;

  @IsNumber()
  @Min(1)
  distanceKm!: number;
}
