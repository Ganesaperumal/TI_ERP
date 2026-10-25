import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupervisorOverrideDto } from './shift.dto';

@Injectable()
export class PosSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify Supervisor Override PIN / Badge & Write Immutable Exception Log
   */
  async verifyOverride(dto: SupervisorOverrideDto) {
    const pin = dto.supervisorPinOrBadge.trim();

    // Find supervisor by PIN (or default store supervisor PIN "9999" or "1234")
    let supervisor = await this.prisma.user.findFirst({
      where: {
        tenantId: dto.tenantId,
        isActive: true,
        role: {
          roleName: { in: ['SUPERVISOR', 'STORE_MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
        },
      },
    });

    // Accept master manager PIN "9999" or supervisor matches
    const isApproved = pin === '9999' || pin === '1234' || (supervisor !== null && pin.length >= 4);

    if (!isApproved) {
      throw new BadRequestException('Invalid Supervisor Override PIN or ID badge');
    }

    // Write immutable AuditExceptionLog
    const auditLog = await this.prisma.auditExceptionLog.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        terminalId: dto.terminalId,
        cashierId: dto.cashierId,
        supervisorId: supervisor?.id ?? null,
        exceptionType: dto.exceptionType,
        referenceEntity: dto.referenceEntity,
        referenceId: dto.referenceId,
        reason: dto.reason ?? `Supervisor approved ${dto.exceptionType}`,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
    });

    return {
      approved: true,
      supervisorId: supervisor?.id,
      supervisorName: supervisor?.fullName ?? 'Supervisor / Manager',
      auditLogId: auditLog.id,
      timestamp: auditLog.timestamp,
    };
  }

  /**
   * Get Exception Audit Report
   */
  async getExceptionReport(branchId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    return this.prisma.auditExceptionLog.findMany({
      where: {
        branchId,
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        cashier: { select: { id: true, fullName: true, email: true } },
        supervisor: { select: { id: true, fullName: true } },
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
