import { IsString, IsOptional } from 'class-validator';

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
