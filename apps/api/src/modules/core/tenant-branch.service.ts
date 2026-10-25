import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTenantDto,
  CreateBranchDto,
  CreateStorageBinDto,
  CreatePosTerminalDto,
  UpdateStoreConfigDto,
} from './tenant-branch.dto';
import { DEFAULT_STORE_CONFIG, StoreConfig, TopologyMode, GstRegime } from '@ti-erp/shared-types';

@Injectable()
export class TenantBranchService {
  constructor(private readonly prisma: PrismaService) {}

  // Tenants
  async createTenant(dto: CreateTenantDto) {
    return this.prisma.tenant.create({
      data: {
        code: dto.code,
        name: dto.name,
        legalTradeName: dto.legalTradeName,
        primaryContact: dto.primaryContact,
        email: dto.email,
        gstRegime: dto.gstRegime,
        topology: dto.topology,
        byokAiConfig: dto.byokAiConfig as object,
      },
    });
  }

  async listTenants() {
    return this.prisma.tenant.findMany({
      include: { branches: true },
    });
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { branches: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  // Branches
  async createBranch(dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        tenantId: dto.tenantId,
        code: dto.code,
        name: dto.name,
        branchType: dto.branchType,
        gstin: dto.gstin,
        address: dto.address,
        city: dto.city,
        stateCode: dto.stateCode,
        pincode: dto.pincode,
        phone: dto.phone,
        regionalLanguage: dto.regionalLanguage || 'en-IN',
        localServerIp: dto.localServerIp,
        branchSettings: (dto.branchSettings as object) || {},
      },
    });
  }

  async listBranches(tenantId?: string) {
    return this.prisma.branch.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: { bins: true, posTerminals: true },
    });
  }

  async getBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { bins: true, posTerminals: true, tenant: true },
    });
    if (!branch) throw new NotFoundException(`Branch ${id} not found`);
    return branch;
  }

  // Storage Bins
  async createStorageBin(dto: CreateStorageBinDto) {
    return this.prisma.storageBin.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        binCode: dto.binCode,
        binType: dto.binType,
        aisle: dto.aisle,
        rack: dto.rack,
        shelf: dto.shelf,
        description: dto.description,
      },
    });
  }

  async listBinsByBranch(branchId: string) {
    return this.prisma.storageBin.findMany({
      where: { branchId },
    });
  }

  // POS Terminals
  async createPosTerminal(dto: CreatePosTerminalDto) {
    return this.prisma.posTerminal.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        terminalCode: dto.terminalCode,
        macAddress: dto.macAddress,
        hardwareLocked: dto.hardwareLocked ?? true,
        printerIp: dto.printerIp,
        scalePort: dto.scalePort,
        edcTerminalId: dto.edcTerminalId,
      },
    });
  }

  async listTerminalsByBranch(branchId: string) {
    return this.prisma.posTerminal.findMany({
      where: { branchId },
    });
  }

  // Merged Plug-and-Play StoreConfig API
  async getMergedStoreConfig(branchId: string): Promise<StoreConfig> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { tenant: true },
    });
    if (!branch) throw new NotFoundException(`Branch ${branchId} not found`);

    const tenant = branch.tenant;
    const branchSettings = (branch.branchSettings as Partial<StoreConfig>) || {};

    // Merge baseline defaults with tenant-level master topology & GST, then branch overrides
    const merged: StoreConfig = {
      ...DEFAULT_STORE_CONFIG,
      topology: (tenant.topology as TopologyMode) || DEFAULT_STORE_CONFIG.topology,
      gst: {
        ...DEFAULT_STORE_CONFIG.gst,
        regime: (tenant.gstRegime as GstRegime) || DEFAULT_STORE_CONFIG.gst.regime,
      },
      ...branchSettings,
      hardware: {
        ...DEFAULT_STORE_CONFIG.hardware,
        ...(branchSettings.hardware || {}),
        receiptPrinter: {
          ...DEFAULT_STORE_CONFIG.hardware.receiptPrinter,
          ...(branchSettings.hardware?.receiptPrinter || {}),
        },
        weighingScale: {
          ...DEFAULT_STORE_CONFIG.hardware.weighingScale,
          ...(branchSettings.hardware?.weighingScale || {}),
        },
      },
      cashRegister: {
        ...DEFAULT_STORE_CONFIG.cashRegister,
        ...(branchSettings.cashRegister || {}),
      },
      inventory: {
        ...DEFAULT_STORE_CONFIG.inventory,
        ...(branchSettings.inventory || {}),
      },
      procurement: {
        ...DEFAULT_STORE_CONFIG.procurement,
        ...(branchSettings.procurement || {}),
      },
      keyboardShortcuts: {
        ...DEFAULT_STORE_CONFIG.keyboardShortcuts,
        ...(branchSettings.keyboardShortcuts || {}),
      },
      loyaltyKhata: {
        ...DEFAULT_STORE_CONFIG.loyaltyKhata,
        ...(branchSettings.loyaltyKhata || {}),
      },
      ai: {
        ...DEFAULT_STORE_CONFIG.ai,
        ...(tenant.byokAiConfig ? (tenant.byokAiConfig as Partial<typeof DEFAULT_STORE_CONFIG.ai>) : {}),
        ...(branchSettings.ai || {}),
      },
    };

    return merged;
  }

  async updateStoreConfig(branchId: string, dto: UpdateStoreConfigDto): Promise<StoreConfig> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) throw new NotFoundException(`Branch ${branchId} not found`);

    const existingSettings = (branch.branchSettings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...existingSettings,
      ...dto.config,
    };

    await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        branchSettings: updatedSettings as object,
      },
    });

    return this.getMergedStoreConfig(branchId);
  }
}
