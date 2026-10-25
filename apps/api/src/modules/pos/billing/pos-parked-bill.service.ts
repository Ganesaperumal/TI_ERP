import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ParkBillDto } from './billing.dto';

@Injectable()
export class PosParkedBillService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Park in-progress bill on LAN
   */
  async parkBill(dto: ParkBillDto) {
    if (!dto.cartData || dto.cartData.length === 0) {
      throw new BadRequestException('Cannot park an empty cart');
    }

    return this.prisma.posParkedBill.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        terminalId: dto.terminalId,
        cashierId: dto.cashierId,
        parkReference: dto.parkReference,
        customerPhone: dto.customerPhone,
        cartData: JSON.parse(JSON.stringify(dto.cartData)),
        isRecalled: false,
      },
      include: {
        terminal: true,
      },
    });
  }

  /**
   * List active un-recalled parked bills across all counters in the branch
   */
  async listParkedBills(branchId: string) {
    return this.prisma.posParkedBill.findMany({
      where: {
        branchId,
        isRecalled: false,
      },
      include: {
        terminal: true,
      },
      orderBy: { parkedAt: 'desc' },
    });
  }

  /**
   * Recall parked bill from any counter on the LAN
   */
  async recallParkedBill(id: string) {
    const parked = await this.prisma.posParkedBill.findUnique({
      where: { id },
      include: { terminal: true },
    });
    if (!parked) throw new NotFoundException(`Parked bill ${id} not found`);
    if (parked.isRecalled) {
      throw new BadRequestException(`Parked bill ${parked.parkReference} was already recalled`);
    }

    return this.prisma.posParkedBill.update({
      where: { id },
      data: {
        isRecalled: true,
        recalledAt: new Date(),
      },
      include: { terminal: true },
    });
  }
}
