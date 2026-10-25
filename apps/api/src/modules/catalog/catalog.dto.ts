import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProductTypeEnum,
  BatchTrackingModeEnum,
  NegativeStockRuleEnum,
  ComboModeEnum,
} from '@ti-erp/database';

export class CreateCategoryDto {
  @IsString()
  tenantId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  parentCategoryId?: string;
}

export class CreateBrandDto {
  @IsString()
  tenantId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;
}

export class CreateHsnDto {
  @IsString()
  tenantId!: string;

  @IsString()
  hsnCode!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  cgstRate!: number;

  @IsNumber()
  sgstRate!: number;

  @IsNumber()
  igstRate!: number;

  @IsOptional()
  @IsNumber()
  cessRate?: number;
}

export class BarcodeEntryDto {
  @IsString()
  barcode!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  uomId?: string;
}

export class UomConversionDto {
  @IsString()
  uomName!: string; // e.g. "BOX"

  @IsNumber()
  conversionFactor!: number; // e.g. 24

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  retailPrice?: number;

  @IsOptional()
  @IsNumber()
  wholesalePrice?: number;
}

export class ComboItemDto {
  @IsString()
  childProductId!: string;

  @IsNumber()
  quantityRequired!: number;

  @IsOptional()
  @IsNumber()
  priceApportionmentPct?: number;

  @IsOptional()
  @IsEnum(ComboModeEnum)
  comboMode?: ComboModeEnum;
}

export class VariantMatrixDto {
  @IsArray()
  @IsString({ each: true })
  sizes!: string[]; // e.g. ["M", "L", "XL"]

  @IsArray()
  @IsString({ each: true })
  colors!: string[]; // e.g. ["Navy", "Black"]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styles?: string[];
}

export class CreateProductDto {
  @IsString()
  tenantId!: string;

  @IsString()
  skuCode!: string;

  @IsString()
  nameEn!: string;

  @IsOptional()
  @IsString()
  nameRegional?: string;

  @IsOptional()
  @IsString()
  shortPluCode?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  hsnId?: string;

  @IsOptional()
  @IsEnum(ProductTypeEnum)
  productType?: ProductTypeEnum;

  @IsOptional()
  @IsString()
  baseUom?: string;

  @IsOptional()
  @IsEnum(BatchTrackingModeEnum)
  batchTrackingMode?: BatchTrackingModeEnum;

  @IsOptional()
  @IsEnum(NegativeStockRuleEnum)
  negativeStockRule?: NegativeStockRuleEnum;

  @IsOptional()
  @IsNumber()
  minStock?: number;

  @IsOptional()
  @IsNumber()
  maxStock?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BarcodeEntryDto)
  barcodes?: BarcodeEntryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UomConversionDto)
  uomConversions?: UomConversionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  comboItems?: ComboItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => VariantMatrixDto)
  variantMatrix?: VariantMatrixDto;
}

export class BulkImportProductsDto {
  @IsString()
  tenantId!: string;

  @IsArray()
  items!: Array<{
    skuCode: string;
    nameEn: string;
    nameRegional?: string;
    barcode?: string;
    shortPluCode?: string;
    categoryCode?: string;
    hsnCode?: string;
    productType?: ProductTypeEnum;
    baseUom?: string;
    mrp?: number;
    purchaseRate?: number;
    sellingPrice?: number;
  }>;
}
