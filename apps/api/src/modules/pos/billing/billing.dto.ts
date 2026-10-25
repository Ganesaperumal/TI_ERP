import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PosInvoiceTypeEnum,
  PaymentMethodEnum,
  RefundModeEnum,
} from '@ti-erp/database';

export class ParkBillDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  terminalId!: string;

  @IsString()
  cashierId!: string;

  @IsString()
  parkReference!: string; // e.g. "HOLD-01"

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsArray()
  cartData!: any[];
}

export class CheckoutLineItemDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  barcodeScanned?: string;

  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  mrp!: number;

  @Type(() => Number)
  @IsNumber()
  sellingPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  promoId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customSellingPriceOverride?: number;
}

export class PaymentSplitInputDto {
  @IsEnum(PaymentMethodEnum)
  method!: PaymentMethodEnum;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cashTendered?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cashChangeReturned?: number;

  @IsOptional()
  @IsString()
  edcTerminalRef?: string;

  @IsOptional()
  @IsString()
  upiTxnId?: string;

  @IsOptional()
  @IsString()
  creditNoteSlipBarcode?: string;

  @IsOptional()
  @IsString()
  giftCardNumber?: string;
}

export class PosCheckoutDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  terminalId!: string;

  @IsString()
  shiftId!: string;

  @IsString()
  cashierId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(PosInvoiceTypeEnum)
  invoiceType?: PosInvoiceTypeEnum;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineItemDto)
  lines!: CheckoutLineItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentSplitInputDto)
  payments!: PaymentSplitInputDto[];

  @IsOptional()
  @IsString()
  parkedBillIdToClear?: string;

  @IsOptional()
  @IsString()
  loyaltyRedemptionOtp?: string;

  @IsOptional()
  @IsString()
  supervisorPinForKhata?: string;
}

export class ReturnLineItemDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @Type(() => Number)
  @IsNumber()
  returnedQty!: number;

  @Type(() => Number)
  @IsNumber()
  refundRate!: number;

  @IsOptional()
  @IsBoolean()
  isDefectiveDamaged?: boolean; // If true, returned into DAMAGED_RETURNABLE bin
}

export class ProcessSalesReturnDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  terminalId!: string;

  @IsString()
  shiftId!: string;

  @IsString()
  cashierId!: string;

  @IsOptional()
  @IsString()
  originalInvoiceId?: string;

  @IsEnum(RefundModeEnum)
  refundMode!: RefundModeEnum; // EXCHANGE, CREDIT_NOTE, CASH_REFUND

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  supervisorPin?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnLineItemDto)
  lines!: ReturnLineItemDto[];

  // For instant exchange: optional replacement checkout
  @IsOptional()
  @ValidateNested()
  @Type(() => PosCheckoutDto)
  exchangeCheckout?: PosCheckoutDto;
}
