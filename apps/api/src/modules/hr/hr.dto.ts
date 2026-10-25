import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { AttendanceStatusEnum, StaffKhataTxnTypeEnum } from '@ti-erp/database';

export class UpdateStaffMasterDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseSalary?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  overtimeHourlyRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salesmanCommissionRate?: number;

  @IsString()
  @IsOptional()
  shiftRoster?: string; // 'MORNING', 'EVENING', 'FULL_DAY'

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class StaffCheckInDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsOptional()
  workDate?: string; // YYYY-MM-DD

  @IsBoolean()
  @IsOptional()
  biometricVerified?: boolean;

  @IsString()
  @IsOptional()
  selfiePhotoUrl?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class StaffCheckOutDto {
  @IsString()
  @IsNotEmpty()
  attendanceId!: string;

  @IsNumber()
  @IsOptional()
  overtimeHours?: number;

  @IsEnum(AttendanceStatusEnum)
  @IsOptional()
  status?: AttendanceStatusEnum;
}

export class RecordStaffKhataDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(StaffKhataTxnTypeEnum)
  txnType!: StaffKhataTxnTypeEnum;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsString()
  @IsOptional()
  approvedByUserId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GeneratePayrollDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  monthYear!: string; // e.g. "2026-10"

  @IsBoolean()
  @IsOptional()
  postSalaryVoucher?: boolean;
}
