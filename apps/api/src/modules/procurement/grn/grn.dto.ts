import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GrnModeEnum } from '@ti-erp/database';

export class CalculateGrnCostingInputDto {
  @Type(() => Number)
  @IsNumber()
  billedQty!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freeSchemeQty?: number;

  @Type(() => Number)
  @IsNumber()
  grossPurchaseRate!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tradeDiscountPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tradeDiscountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cashDiscountPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gstRatePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cessRatePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  apportionedFreightAndUnloading?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  uomConversionFactor?: number;

  @IsOptional()
  @IsBoolean()
  isInterState?: boolean;

  @IsOptional()
  @IsString()
  gstRegime?: 'REGULAR' | 'COMPOSITION';

  @Type(() => Number)
  @IsNumber()
  retailSellingPrice!: number;

  @Type(() => Number)
  @IsNumber()
  targetMrp!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetMarginPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  previousNetLandingCost?: number;
}

export class FastDirectGrnLineDto {
  @IsString()
  productId!: string;

  @IsString()
  batchNumber!: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  hsnId?: string;

  @Type(() => Number)
  @IsNumber()
  billedQty!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freeSchemeQty?: number;

  @Type(() => Number)
  @IsNumber()
  purchaseRate!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tradeDiscountPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tradeDiscountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cashDiscountPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gstRatePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cessRatePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  apportionedFreight?: number;

  @Type(() => Number)
  @IsNumber()
  targetMrp!: number;

  @Type(() => Number)
  @IsNumber()
  retailSellingPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetMarginPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  uomConversionFactor?: number;
}

export class CreateFastDirectGrnDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  poId?: string;

  @IsOptional()
  @IsString()
  supplierInvoiceNo?: string;

  @IsOptional()
  @IsString()
  supplierInvoiceDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalFreightApportion?: number;

  @IsOptional()
  @IsString()
  targetBinId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FastDirectGrnLineDto)
  lines!: FastDirectGrnLineDto[];
}

export class GateEntryDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  supplierId!: string;

  @IsString()
  poId!: string;

  @IsString()
  supplierInvoiceNo!: string;

  @IsOptional()
  @IsString()
  supplierInvoiceDate?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;
}

export class BlindCountItemDto {
  @IsString()
  productId!: string;

  @IsString()
  batchNumber!: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @Type(() => Number)
  @IsNumber()
  receivedQty!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freeQty?: number;
}

export class BlindCountSubmitDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlindCountItemDto)
  items!: BlindCountItemDto[];
}

export class InvoiceLineMatchDto {
  @IsString()
  productId!: string;

  @IsString()
  batchNumber!: string;

  @Type(() => Number)
  @IsNumber()
  billedQty!: number;

  @Type(() => Number)
  @IsNumber()
  grossRate!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tradeDiscountPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gstRatePct?: number;

  @Type(() => Number)
  @IsNumber()
  retailSellingPrice!: number;

  @Type(() => Number)
  @IsNumber()
  targetMrp!: number;
}

export class ThreeWayMatchSubmitDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineMatchDto)
  invoiceLines!: InvoiceLineMatchDto[];

  @IsOptional()
  @IsBoolean()
  managerOverrideApproved?: boolean;

  @IsOptional()
  @IsString()
  approvalNotes?: string;
}
