import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { StaffHrService } from './staff-hr.service';
import { AttendanceService } from './attendance.service';
import { StaffKhataAndCommissionService } from './staff-khata-commission.service';
import { PayrollService } from './payroll.service';
import {
  UpdateStaffMasterDto,
  StaffCheckInDto,
  StaffCheckOutDto,
  RecordStaffKhataDto,
  GeneratePayrollDto,
} from './hr.dto';

@Controller('hr')
export class HrController {
  constructor(
    private readonly staffService: StaffHrService,
    private readonly attendanceService: AttendanceService,
    private readonly khataService: StaffKhataAndCommissionService,
    private readonly payrollService: PayrollService,
  ) {}

  @Get('staff')
  async listStaff(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.staffService.listStaff(tenantId, branchId);
  }

  @Put('staff')
  async updateStaff(@Body() dto: UpdateStaffMasterDto) {
    return this.staffService.updateStaff(dto);
  }

  @Post('attendance/check-in')
  async checkIn(@Body() dto: StaffCheckInDto) {
    return this.attendanceService.checkIn(dto);
  }

  @Post('attendance/check-out')
  async checkOut(@Body() dto: StaffCheckOutDto) {
    return this.attendanceService.checkOut(dto);
  }

  @Get('attendance')
  async getDailyAttendance(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('date') date?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.attendanceService.getDailyAttendance(tenantId, branchId, date);
  }

  @Post('staff-khata')
  async recordStaffKhata(@Body() dto: RecordStaffKhataDto) {
    return this.khataService.recordStaffKhata(dto);
  }

  @Get('staff-khata/:userId')
  async getStaffKhataHistory(
    @Param('userId') userId: string,
    @Query('monthYear') monthYear?: string,
  ) {
    return this.khataService.getStaffKhataHistory(userId, monthYear);
  }

  @Get('commissions')
  async getCommissions(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.khataService.getSalesmanCommissions(
      tenantId,
      branchId,
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Post('payroll/generate-monthly')
  async generateMonthlyPayroll(@Body() dto: GeneratePayrollDto) {
    return this.payrollService.generateMonthlyPayroll(dto);
  }
}
