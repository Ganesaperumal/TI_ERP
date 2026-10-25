import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffCheckInDto, StaffCheckOutDto } from './hr.dto';
import { AttendanceStatusEnum, Decimal } from '@ti-erp/database';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record Staff Check-In via Biometric Webhook or Mobile/POS Geo-Fenced Selfie
   */
  async checkIn(dto: StaffCheckInDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

    const now = new Date();
    const workDate = dto.workDate ? new Date(dto.workDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if late (e.g. check in after 10:00 AM local time)
    const isLate = now.getHours() >= 10 && now.getMinutes() > 15;
    const initialStatus = isLate ? AttendanceStatusEnum.LATE : AttendanceStatusEnum.PRESENT;

    const attendance = await this.prisma.staffAttendance.upsert({
      where: {
        userId_workDate: {
          userId: dto.userId,
          workDate,
        },
      },
      update: {
        checkInTime: now,
        biometricVerified: !!dto.biometricVerified,
        selfiePhotoUrl: dto.selfiePhotoUrl,
        latitude: dto.latitude !== undefined ? new Decimal(dto.latitude) : undefined,
        longitude: dto.longitude !== undefined ? new Decimal(dto.longitude) : undefined,
        status: initialStatus,
      },
      create: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        userId: dto.userId,
        workDate,
        checkInTime: now,
        biometricVerified: !!dto.biometricVerified,
        selfiePhotoUrl: dto.selfiePhotoUrl,
        latitude: dto.latitude !== undefined ? new Decimal(dto.latitude) : undefined,
        longitude: dto.longitude !== undefined ? new Decimal(dto.longitude) : undefined,
        status: initialStatus,
        overtimeHours: new Decimal(0),
      },
      include: {
        user: { select: { fullName: true, username: true } },
      },
    });

    return {
      success: true,
      attendanceId: attendance.id,
      staffName: attendance.user.fullName,
      checkInTime: attendance.checkInTime,
      status: attendance.status,
      biometricVerified: attendance.biometricVerified,
      hasSelfie: !!attendance.selfiePhotoUrl,
    };
  }

  /**
   * Record Staff Check-Out & Automatic Overtime Hours Calculation
   */
  async checkOut(dto: StaffCheckOutDto) {
    const attendance = await this.prisma.staffAttendance.findUnique({
      where: { id: dto.attendanceId },
      include: { user: true },
    });

    if (!attendance) throw new NotFoundException(`Attendance record ${dto.attendanceId} not found`);
    if (!attendance.checkInTime) throw new BadRequestException('Cannot check out without a check-in timestamp');

    const checkOutTime = new Date();
    const diffMs = checkOutTime.getTime() - attendance.checkInTime.getTime();
    const totalHoursWorked = new Decimal(diffMs / (1000 * 60 * 60)).toDecimalPlaces(2);

    // Standard supermarket shift: 8.0 hours
    const standardShiftHours = new Decimal(8.0);
    let calculatedOtHours = new Decimal(0);

    if (dto.overtimeHours !== undefined) {
      calculatedOtHours = new Decimal(dto.overtimeHours).toDecimalPlaces(2);
    } else if (totalHoursWorked.greaterThan(standardShiftHours)) {
      calculatedOtHours = totalHoursWorked.sub(standardShiftHours).toDecimalPlaces(2);
    }

    let finalStatus = dto.status || attendance.status;
    if (totalHoursWorked.lessThan(4.0) && finalStatus !== AttendanceStatusEnum.ABSENT) {
      finalStatus = AttendanceStatusEnum.HALF_DAY;
    }

    const updated = await this.prisma.staffAttendance.update({
      where: { id: dto.attendanceId },
      data: {
        checkOutTime,
        overtimeHours: calculatedOtHours,
        status: finalStatus,
      },
    });

    return {
      success: true,
      attendanceId: updated.id,
      checkInTime: updated.checkInTime,
      checkOutTime: updated.checkOutTime,
      totalHoursWorked: Number(totalHoursWorked),
      overtimeHours: Number(calculatedOtHours),
      status: updated.status,
    };
  }

  /**
   * Get Daily Attendance Board for Branch
   */
  async getDailyAttendance(tenantId: string, branchId?: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const workDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const whereClause: any = {
      tenantId,
      workDate,
    };
    if (branchId) whereClause.branchId = branchId;

    const attendances = await this.prisma.staffAttendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            shiftRoster: true,
            role: { select: { roleName: true } },
          },
        },
      },
      orderBy: { user: { fullName: 'asc' } },
    });

    return {
      workDate: workDate.toISOString().slice(0, 10),
      totalPresent: attendances.filter((a) => a.status === AttendanceStatusEnum.PRESENT || a.status === AttendanceStatusEnum.LATE).length,
      totalHalfDay: attendances.filter((a) => a.status === AttendanceStatusEnum.HALF_DAY).length,
      totalLate: attendances.filter((a) => a.status === AttendanceStatusEnum.LATE).length,
      attendances: attendances.map((a) => ({
        id: a.id,
        userId: a.userId,
        staffName: a.user.fullName,
        roleName: a.user.role.roleName,
        shiftRoster: a.user.shiftRoster || 'FULL_DAY',
        status: a.status,
        checkInTime: a.checkInTime,
        checkOutTime: a.checkOutTime,
        overtimeHours: Number(a.overtimeHours),
        biometricVerified: a.biometricVerified,
        selfiePhotoUrl: a.selfiePhotoUrl,
      })),
    };
  }
}
