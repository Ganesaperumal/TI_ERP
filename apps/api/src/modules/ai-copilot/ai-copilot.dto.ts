import { IsString, IsOptional, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class OcrPurchaseInvoiceDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  fileBase64?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  rawTextOrCsv?: string;
}

export class AskSupermarketDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsOptional()
  language?: string; // 'en', 'ta', 'hi'
}

export class DesignClearanceCombosDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsNumber()
  @IsOptional()
  @Min(7)
  @Max(90)
  expiryThresholdDays?: number; // default 45 days

  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(75)
  discountPct?: number; // default 25%
}

export class TransliterateProductDto {
  @IsString()
  @IsNotEmpty()
  productName!: string;

  @IsString()
  @IsNotEmpty()
  targetLanguage!: string; // 'ta-IN' (Tamil), 'hi-IN' (Hindi), 'kn-IN', 'te-IN', 'ml-IN'

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  tenantId?: string;
}

export class ActivateClearancePromoDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  promoName!: string;

  @IsString()
  @IsNotEmpty()
  slowProductId!: string;

  @IsString()
  @IsNotEmpty()
  anchorProductId!: string;

  @IsNumber()
  @Min(5)
  @Max(90)
  discountPct!: number;
}
