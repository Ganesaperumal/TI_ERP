import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './loyalty.dto';
import { LoyaltyTierEnum } from '@ti-erp/database';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fast Customer Phone Lookup with POS Auto-Registration
   */
  async findByPhone(tenantId: string, phone: string, autoRegisterName?: string) {
    const trimmedPhone = phone.trim().replace(/[^0-9]/g, '').slice(-10); // Standard 10-digit Indian mobile
    if (!trimmedPhone || trimmedPhone.length < 10) {
      throw new BadRequestException('Valid 10-digit mobile number required');
    }

    let customer = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        phone: trimmedPhone,
      },
      include: {
        loyaltyLedgers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        khataLedgers: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer && autoRegisterName) {
      // Auto-register customer at POS counter
      customer = await this.prisma.customer.create({
        data: {
          tenantId,
          phone: trimmedPhone,
          name: autoRegisterName.trim() || `Customer ${trimmedPhone.slice(-4)}`,
          loyaltyTier: LoyaltyTierEnum.SILVER,
        },
        include: {
          loyaltyLedgers: true,
          khataLedgers: true,
        },
      });
    }

    return customer;
  }

  /**
   * Create New Customer Profile
   */
  async createCustomer(dto: CreateCustomerDto) {
    const phone = dto.phone.trim().replace(/[^0-9]/g, '').slice(-10);
    const existing = await this.prisma.customer.findFirst({
      where: { tenantId: dto.tenantId, phone },
    });
    if (existing) {
      throw new BadRequestException(`Customer with phone ${phone} already exists`);
    }

    return this.prisma.customer.create({
      data: {
        tenantId: dto.tenantId,
        phone,
        name: dto.name.trim(),
        email: dto.email?.trim() || null,
        gstin: dto.gstin?.trim() || null,
        address: dto.address?.trim() || null,
        rationCycleDayStart: dto.rationCycleDayStart ?? null,
        loyaltyTier: LoyaltyTierEnum.SILVER,
      },
    });
  }

  /**
   * Update Existing Customer Profile
   */
  async updateCustomer(customerId: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException(`Customer ${customerId} not found`);

    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        name: dto.name?.trim() ?? customer.name,
        email: dto.email?.trim() ?? customer.email,
        gstin: dto.gstin?.trim() ?? customer.gstin,
        address: dto.address?.trim() ?? customer.address,
        loyaltyTier: dto.loyaltyTier ?? customer.loyaltyTier,
        khataCreditLimit: dto.khataCreditLimit !== undefined ? dto.khataCreditLimit : customer.khataCreditLimit,
        rationCycleDayStart: dto.rationCycleDayStart !== undefined ? dto.rationCycleDayStart : customer.rationCycleDayStart,
      },
    });
  }

  /**
   * List Customers with Search & Tier Filters
   */
  async getCustomers(tenantId: string, search?: string, tier?: LoyaltyTierEnum, limit = 50) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        ...(tier ? { loyaltyTier: tier } : {}),
        ...(search
          ? {
              OR: [
                { phone: { contains: search } },
                { name: { contains: search, mode: 'insensitive' } },
                { gstin: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { invoices: true, loyaltyLedgers: true },
        },
      },
    });
  }
}
