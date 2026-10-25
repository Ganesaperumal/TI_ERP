import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { StaffHrService } from './staff-hr.service';
import { AttendanceService } from './attendance.service';
import { StaffKhataAndCommissionService } from './staff-khata-commission.service';
import { PayrollService } from './payroll.service';
import { HrController } from './hr.controller';

@Module({
  imports: [AccountingModule],
  controllers: [HrController],
  providers: [
    StaffHrService,
    AttendanceService,
    StaffKhataAndCommissionService,
    PayrollService,
  ],
  exports: [
    StaffHrService,
    AttendanceService,
    StaffKhataAndCommissionService,
    PayrollService,
  ],
})
export class HrModule {}
