import { IsString, IsOptional, IsNotEmpty, IsDateString } from 'class-validator';

export class LiveDashboardQueryDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}

export class NightlyClosingReportDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsDateString()
  @IsOptional()
  date?: string;
}
