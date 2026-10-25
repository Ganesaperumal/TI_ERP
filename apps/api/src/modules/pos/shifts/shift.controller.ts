import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PosShiftService } from './pos-shift.service';
import { PosSecurityService } from './pos-security.service';
import {
  OpenShiftDto,
  SafeDropDto,
  BlindCloseDto,
  SupervisorOverrideDto,
} from './shift.dto';

@Controller('api/v1/pos')
export class ShiftController {
  constructor(
    private readonly shiftService: PosShiftService,
    private readonly securityService: PosSecurityService,
  ) {}

  @Post('shifts/open')
  async openShift(@Body() dto: OpenShiftDto) {
    return this.shiftService.openShift(dto);
  }

  @Post('shifts/:id/safe-drop')
  async recordSafeDrop(@Param('id') id: string, @Body() dto: SafeDropDto) {
    return this.shiftService.recordSafeDrop(id, dto);
  }

  @Get('shifts/:id/x-report')
  async getXReport(@Param('id') id: string) {
    return this.shiftService.getXReport(id);
  }

  @Post('shifts/:id/blind-close')
  async blindCloseShift(
    @Param('id') id: string,
    @Body() dto: BlindCloseDto,
  ) {
    return this.shiftService.blindCloseShift(id, dto);
  }

  @Get('shifts/:id')
  async getShift(@Param('id') id: string) {
    return this.shiftService.getShiftById(id);
  }

  @Post('security/verify-override')
  async verifyOverride(@Body() dto: SupervisorOverrideDto) {
    return this.securityService.verifyOverride(dto);
  }

  @Get('security/exception-report')
  async getExceptionReport(
    @Query('branchId') branchId: string,
    @Query('date') date?: string,
  ) {
    return this.securityService.getExceptionReport(branchId, date);
  }
}
