import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { TenantBranchService } from './tenant-branch.service';
import {
  CreateTenantDto,
  CreateBranchDto,
  CreateStorageBinDto,
  CreatePosTerminalDto,
  UpdateStoreConfigDto,
} from './tenant-branch.dto';

@Controller('api/v1/core')
export class TenantBranchController {
  constructor(private readonly tenantBranchService: TenantBranchService) {}

  // Tenants
  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.tenantBranchService.createTenant(dto);
  }

  @Get('tenants')
  listTenants() {
    return this.tenantBranchService.listTenants();
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.tenantBranchService.getTenant(id);
  }

  // Branches
  @Post('branches')
  createBranch(@Body() dto: CreateBranchDto) {
    return this.tenantBranchService.createBranch(dto);
  }

  @Get('branches')
  listBranches(@Query('tenantId') tenantId?: string) {
    return this.tenantBranchService.listBranches(tenantId);
  }

  @Get('branches/:id')
  getBranch(@Param('id') id: string) {
    return this.tenantBranchService.getBranch(id);
  }

  // Storage Bins
  @Post('bins')
  createStorageBin(@Body() dto: CreateStorageBinDto) {
    return this.tenantBranchService.createStorageBin(dto);
  }

  @Get('bins')
  listBins(@Query('branchId') branchId: string) {
    return this.tenantBranchService.listBinsByBranch(branchId);
  }

  // Terminals
  @Post('terminals')
  createTerminal(@Body() dto: CreatePosTerminalDto) {
    return this.tenantBranchService.createPosTerminal(dto);
  }

  @Get('terminals')
  listTerminals(@Query('branchId') branchId: string) {
    return this.tenantBranchService.listTerminalsByBranch(branchId);
  }

  // Merged Plug-and-Play StoreConfig API
  @Get('store-config/:branchId')
  getStoreConfig(@Param('branchId') branchId: string) {
    return this.tenantBranchService.getMergedStoreConfig(branchId);
  }

  @Put('store-config/:branchId')
  updateStoreConfig(
    @Param('branchId') branchId: string,
    @Body() dto: UpdateStoreConfigDto,
  ) {
    return this.tenantBranchService.updateStoreConfig(branchId, dto);
  }
}
