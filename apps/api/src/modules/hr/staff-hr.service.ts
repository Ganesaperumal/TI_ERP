import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateStaffMasterDto } from './hr.dto';
import { Decimal } from '@ti-erp/database';

@Injectable()
export class StaffHrService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all Staff Members for a Branch with HR Profiles
   */
  async listStaff(tenantId: string, branchId?: string) {
    const whereUser: any = { tenantId };
    if (branchId) whereUser.branchId = branchId;

    const users = await this.prisma.user.findMany({
      where: whereUser,
      include: {
        role: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email,
      roleName: u.role.roleName,
      roleId: u.roleId,
      maskCostAndMargin: u.role.maskCostAndMargin,
      baseSalary: Number(u.baseSalary),
      overtimeHourlyRate: Number(u.overtimeHourlyRate),
      salesmanCommissionRate: Number(u.salesmanCommissionRate),
      shiftRoster: u.shiftRoster || 'FULL_DAY',
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  }

  /**
   * Update Staff Master Profile & Compensation Settings
   */
  async updateStaff(dto: UpdateStaffMasterDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

    const updateData: any = {};
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.roleId !== undefined) updateData.roleId = dto.roleId;
    if (dto.baseSalary !== undefined) updateData.baseSalary = new Decimal(dto.baseSalary);
    if (dto.overtimeHourlyRate !== undefined) updateData.overtimeHourlyRate = new Decimal(dto.overtimeHourlyRate);
    if (dto.salesmanCommissionRate !== undefined) updateData.salesmanCommissionRate = new Decimal(dto.salesmanCommissionRate);
    if (dto.shiftRoster !== undefined) updateData.shiftRoster = dto.shiftRoster;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.user.update({
      where: { id: dto.userId },
      data: updateData,
      include: { role: true },
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      roleName: updated.role.roleName,
      baseSalary: Number(updated.baseSalary),
      overtimeHourlyRate: Number(updated.overtimeHourlyRate),
      salesmanCommissionRate: Number(updated.salesmanCommissionRate),
      shiftRoster: updated.shiftRoster,
      isActive: updated.isActive,
    };
  }

  /**
   * Reusable RBAC Cost & Margin Masking Helper
   * Deeply sanitizes objects by stripping purchaseRate, netLandingCost, actualMarginPct
   * when the requesting staff member's role has maskCostAndMargin === true
   */
  maskCostAndMargin<T>(data: T, maskCost: boolean): T {
    if (!maskCost || !data) return data;

    const sensitiveFields = new Set([
      'purchaseRate',
      'netLandingCost',
      'actualMarginPct',
      'netLandingCostSnapshot',
    ]);

    const sanitize = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      if (obj !== null && typeof obj === 'object') {
        const cleaned: Record<string, any> = {};
        for (const [key, val] of Object.entries(obj)) {
          if (sensitiveFields.has(key)) {
            cleaned[key] = null; // Masked for cashiers / floor salesmen
          } else {
            cleaned[key] = sanitize(val);
          }
        }
        return cleaned;
      }
      return obj;
    };

    return sanitize(data);
  }
}
