import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateInventoryBatchDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  productId!: string;

  @IsString()
  batchNumber!: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsNumber()
  mrp!: number;

  @IsNumber()
  purchaseRate!: number;

  @IsNumber()
  netLandingCost!: number;

  @IsNumber()
  retailSellingPrice!: number;

  @IsOptional()
  @IsNumber()
  wholesalePriceTier1?: number;

  @IsOptional()
  @IsNumber()
  wholesalePriceTier2?: number;

  @IsOptional()
  @IsNumber()
  initialQuantity?: number;

  @IsOptional()
  @IsString()
  binId?: string; // Default bin to put initial stock
}

export class ResolveBatchForPosSaleDto {
  @IsString()
  branchId!: string;

  @IsString()
  productId!: string;

  @IsNumber()
  quantityRequested!: number;

  @IsOptional()
  @IsString()
  selectedBatchId?: string;

  @IsOptional()
  @IsString()
  supervisorPin?: string;
}

export class ApplyClearanceOfferDto {
  @IsString()
  batchId!: string;

  @IsNumber()
  clearanceDiscountPct!: number; // e.g. 25 for 25% off
}

export class ExecuteRepackingJobDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  jobNumber!: string;

  @IsString()
  bulkParentProductId!: string;

  @IsString()
  bulkConsumedBatchId!: string;

  @IsNumber()
  bulkQtyConsumed!: number; // e.g., 50.0000 kg

  @IsString()
  retailChildProductId!: string;

  @IsString()
  newRetailBatchNumber!: string;

  @IsDateString()
  expiryDate!: string;

  @IsNumber()
  retailPacksProduced!: number; // e.g. 49 packs

  @IsNumber()
  mrpPerPack!: number;

  @IsNumber()
  sellingPricePerPack!: number;

  @IsOptional()
  @IsNumber()
  wastageQty?: number; // e.g. 0.5000 kg

  @IsOptional()
  @IsNumber()
  packagingMaterialCost?: number; // e.g. Rs 120

  @IsOptional()
  @IsNumber()
  laborAndOverheadCost?: number;

  @IsOptional()
  @IsString()
  destinationBinId?: string; // default to SHOP_FLOOR bin
}

export class AssemblePrePackedComboDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  parentComboProductId!: string;

  @IsNumber()
  quantity!: number; // Quantity of parent combo kits to assemble

  @IsString()
  batchNumber!: string;

  @IsNumber()
  mrp!: number;

  @IsNumber()
  sellingPrice!: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  binId?: string; // Target bin, defaults to SHOP_FLOOR
}
