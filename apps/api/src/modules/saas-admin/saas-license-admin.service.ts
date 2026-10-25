import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSaaSLicenseDto,
  UpdateLicenseModulesDto,
  RenewLicenseDto,
  ToggleLicenseStatusDto,
} from './saas-admin.dto';
import * as crypto from 'crypto';
import { Prisma } from '@ti-erp/database';

export const DEFAULT_SAAS_MODULES = [
  'BASIC_POS',
  'MULTI_BRANCH',
  'AI_COPILOT',
  'TALLY_BRIDGE',
  'HR_PAYROLL',
  'WHATSAPP_CRM',
];

@Injectable()
export class SaasLicenseAdminService {
  private readonly logger = new Logger(SaasLicenseAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a 20-character formatted license key: TIERP-XXXX-XXXX-XXXX-XXXX
   */
  private generateLicenseKey(): string {
    const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `TIERP-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
  }

  /**
   * Provision a brand-new supermarket Tenant with SaaSLicense, Default Branch, Terminal and Starter Catalog
   */
  async createLicenseAndTenant(dto: CreateSaaSLicenseDto) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { code: dto.tenantCode },
    });
    if (existingTenant) {
      throw new BadRequestException(`Tenant code '${dto.tenantCode}' is already registered.`);
    }

    const licenseKey = this.generateLicenseKey();
    const months = dto.amcMonths ?? 12;
    const amcExpiryDate = new Date();
    amcExpiryDate.setMonth(amcExpiryDate.getMonth() + months);

    const activeModules = dto.activeModules && dto.activeModules.length > 0
      ? dto.activeModules
      : DEFAULT_SAAS_MODULES;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create SaaSLicense
      const license = await tx.saaSLicense.create({
        data: {
          licenseKey,
          customerName: dto.customerName,
          planTier: dto.planTier ?? 'ENTERPRISE',
          maxBranches: dto.maxBranches ?? 1,
          maxTerminals: dto.maxTerminals ?? 5,
          activeModules: activeModules as Prisma.InputJsonValue,
          amcExpiryDate,
          isActive: true,
        },
      });

      // 2. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          licenseId: license.id,
          code: dto.tenantCode,
          name: dto.tenantName,
          legalTradeName: dto.tenantName,
          primaryContact: dto.primaryContact,
          email: dto.email,
        },
      });

      // 3. Create Default Branch (HQ Store)
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          code: 'MAIN',
          name: `${dto.tenantName} - Main Store`,
          phone: dto.primaryContact,
          regionalLanguage: 'ta-IN',
        },
      });

      // 4. Create Default Storage Bin
      const bin = await tx.storageBin.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          binCode: 'MAIN-FL-A1',
          aisle: 'A1',
          rack: 'R1',
          shelf: 'S1',
          description: 'Main Floor Shelf A1',
        },
      });

      // 5. Create Default POS Terminal
      const terminal = await tx.posTerminal.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          terminalCode: 'TERM-01',
          hardwareLocked: false,
        },
      });

      // 6. Optional Starter FMCG Catalog
      let seededProductsCount = 0;
      if (dto.seedDemoCatalog !== false) {
        const catGrocery = await tx.category.create({
          data: {
            tenantId: tenant.id,
            code: 'GROC',
            name: 'Staples & Grocery',
          },
        });

        const catDairy = await tx.category.create({
          data: {
            tenantId: tenant.id,
            code: 'DAIRY',
            name: 'Dairy & Beverages',
          },
        });

        const starterItems = [
          {
            sku: 'SKU-SUGAR-1KG',
            name: 'Refined White Sugar 1kg',
            catId: catGrocery.id,
            mrp: 46.0,
            cost: 38.0,
            sell: 42.0,
            uom: 'KG',
          },
          {
            sku: 'SKU-TOOR-1KG',
            name: 'Premium Toor Dal 1kg',
            catId: catGrocery.id,
            mrp: 180.0,
            cost: 142.0,
            sell: 165.0,
            uom: 'KG',
          },
          {
            sku: 'SKU-RICE-5KG',
            name: 'Ponni Boiled Rice 5kg Bag',
            catId: catGrocery.id,
            mrp: 340.0,
            cost: 275.0,
            sell: 310.0,
            uom: 'PACK',
          },
          {
            sku: 'SKU-OIL-1L',
            name: 'Gold Winner Sunflower Oil 1L Pouch',
            catId: catGrocery.id,
            mrp: 145.0,
            cost: 118.0,
            sell: 132.0,
            uom: 'PACK',
          },
          {
            sku: 'SKU-AMUL-BUTTER-500G',
            name: 'Amul Butter 500g',
            catId: catDairy.id,
            mrp: 275.0,
            cost: 240.0,
            sell: 265.0,
            uom: 'PACK',
          },
        ];

        for (const item of starterItems) {
          const product = await tx.product.create({
            data: {
              tenantId: tenant.id,
              skuCode: item.sku,
              nameEn: item.name,
              categoryId: item.catId,
              baseUom: item.uom,
            },
          });

          // Create initial opening inventory batch
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 9);

          const batch = await tx.inventoryBatch.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              productId: product.id,
              batchNumber: `BATCH-INIT-${Date.now().toString().slice(-4)}`,
              expiryDate,
              mrp: new Prisma.Decimal(item.mrp),
              purchaseRate: new Prisma.Decimal(item.cost),
              netLandingCost: new Prisma.Decimal(item.cost),
              retailSellingPrice: new Prisma.Decimal(item.sell),
            },
          });

          // Stock balance
          await tx.binStockBalance.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              productId: product.id,
              binId: bin.id,
              batchId: batch.id,
              quantity: new Prisma.Decimal(100),
            },
          });

          seededProductsCount += 1;
        }
      }

      this.logger.log(
        `Successfully provisioned Tenant '${tenant.code}' with License '${license.licenseKey}' and ${seededProductsCount} starter SKUs.`,
      );

      return {
        success: true,
        licenseId: license.id,
        licenseKey: license.licenseKey,
        tenantId: tenant.id,
        tenantCode: tenant.code,
        branchId: branch.id,
        terminalId: terminal.id,
        amcExpiryDate: license.amcExpiryDate,
        activeModules: license.activeModules,
        seededProductsCount,
      };
    });
  }

  /**
   * List all licenses with client stats and AMC health status
   */
  async getAllLicenses() {
    const licenses = await this.prisma.saaSLicense.findMany({
      include: {
        tenants: {
          include: {
            branches: {
              select: { id: true, code: true, name: true, isActive: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return licenses.map((lic) => {
      const daysUntilExpiry = Math.ceil(
        (lic.amcExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      let amcStatus: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' = 'ACTIVE';
      if (daysUntilExpiry <= 0) {
        amcStatus = 'EXPIRED';
      } else if (daysUntilExpiry <= 30) {
        amcStatus = 'EXPIRING_SOON';
      }

      const totalBranches = lic.tenants.reduce((acc, t) => acc + t.branches.length, 0);

      return {
        id: lic.id,
        licenseKey: lic.licenseKey,
        customerName: lic.customerName,
        planTier: lic.planTier,
        maxBranches: lic.maxBranches,
        maxTerminals: lic.maxTerminals,
        activeModules: lic.activeModules,
        amcExpiryDate: lic.amcExpiryDate,
        daysUntilExpiry,
        amcStatus,
        isActive: lic.isActive,
        tenantsCount: lic.tenants.length,
        totalBranches,
        tenants: lic.tenants.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          primaryContact: t.primaryContact,
          email: t.email,
          branches: t.branches,
        })),
        createdAt: lic.createdAt,
        updatedAt: lic.updatedAt,
      };
    });
  }

  /**
   * Get single license details
   */
  async getLicenseById(id: string) {
    const license = await this.prisma.saaSLicense.findUnique({
      where: { id },
      include: {
        tenants: {
          include: {
            branches: {
              include: {
                posTerminals: true,
              },
            },
          },
        },
      },
    });

    if (!license) {
      throw new NotFoundException(`SaaSLicense with ID '${id}' not found`);
    }

    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (license.amcExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      ...license,
      daysUntilExpiry,
      amcStatus: daysUntilExpiry <= 0 ? 'EXPIRED' : daysUntilExpiry <= 30 ? 'EXPIRING_SOON' : 'ACTIVE',
    };
  }

  /**
   * Update active modules toggle for a license
   */
  async updateLicenseModules(id: string, dto: UpdateLicenseModulesDto) {
    const lic = await this.prisma.saaSLicense.findUnique({ where: { id } });
    if (!lic) {
      throw new NotFoundException(`License not found with ID ${id}`);
    }

    const updated = await this.prisma.saaSLicense.update({
      where: { id },
      data: {
        activeModules: dto.activeModules as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      id: updated.id,
      customerName: updated.customerName,
      activeModules: updated.activeModules,
    };
  }

  /**
   * Renew AMC for an existing license
   */
  async renewLicense(id: string, dto: RenewLicenseDto) {
    const lic = await this.prisma.saaSLicense.findUnique({ where: { id } });
    if (!lic) {
      throw new NotFoundException(`License not found with ID ${id}`);
    }

    const now = new Date();
    const baseDate = lic.amcExpiryDate > now ? lic.amcExpiryDate : now;
    const newExpiryDate = new Date(baseDate);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + dto.extensionMonths);

    const updated = await this.prisma.saaSLicense.update({
      where: { id },
      data: {
        amcExpiryDate: newExpiryDate,
        isActive: true,
      },
    });

    return {
      success: true,
      id: updated.id,
      customerName: updated.customerName,
      oldExpiryDate: lic.amcExpiryDate,
      newExpiryDate: updated.amcExpiryDate,
      isActive: updated.isActive,
    };
  }

  /**
   * Toggle license active status (activate / suspend)
   */
  async toggleLicenseStatus(id: string, dto: ToggleLicenseStatusDto) {
    const lic = await this.prisma.saaSLicense.findUnique({ where: { id } });
    if (!lic) {
      throw new NotFoundException(`License not found with ID ${id}`);
    }

    const updated = await this.prisma.saaSLicense.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    return {
      success: true,
      id: updated.id,
      customerName: updated.customerName,
      isActive: updated.isActive,
    };
  }

  /**
   * Client Boot / Handshake Verification
   */
  async verifyLicenseKey(licenseKey: string) {
    const license = await this.prisma.saaSLicense.findUnique({
      where: { licenseKey },
      include: {
        tenants: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!license) {
      return {
        valid: false,
        reason: 'INVALID_LICENSE_KEY',
      };
    }

    if (!license.isActive) {
      return {
        valid: false,
        reason: 'LICENSE_SUSPENDED',
      };
    }

    const now = new Date();
    if (license.amcExpiryDate < now) {
      return {
        valid: false,
        reason: 'AMC_EXPIRED',
        amcExpiryDate: license.amcExpiryDate,
      };
    }

    return {
      valid: true,
      licenseId: license.id,
      customerName: license.customerName,
      planTier: license.planTier,
      maxBranches: license.maxBranches,
      maxTerminals: license.maxTerminals,
      activeModules: license.activeModules,
      amcExpiryDate: license.amcExpiryDate,
      tenants: license.tenants,
    };
  }
}
