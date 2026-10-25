import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
} from '@nestjs/common';
import { SaasLicenseAdminService } from './saas-license-admin.service';
import {
  CreateSaaSLicenseDto,
  UpdateLicenseModulesDto,
  RenewLicenseDto,
  ToggleLicenseStatusDto,
} from './saas-admin.dto';

@Controller('api/v1/saas-admin/licenses')
export class SaasAdminController {
  constructor(private readonly licenseService: SaasLicenseAdminService) {}

  @Post()
  async createLicense(@Body() dto: CreateSaaSLicenseDto) {
    return this.licenseService.createLicenseAndTenant(dto);
  }

  @Get()
  async getAllLicenses() {
    return this.licenseService.getAllLicenses();
  }

  @Get('verify/:key')
  async verifyLicense(@Param('key') key: string) {
    return this.licenseService.verifyLicenseKey(key);
  }

  @Get(':id')
  async getLicenseById(@Param('id') id: string) {
    return this.licenseService.getLicenseById(id);
  }

  @Put(':id/modules')
  async updateLicenseModules(
    @Param('id') id: string,
    @Body() dto: UpdateLicenseModulesDto,
  ) {
    return this.licenseService.updateLicenseModules(id, dto);
  }

  @Post(':id/renew')
  async renewLicense(
    @Param('id') id: string,
    @Body() dto: RenewLicenseDto,
  ) {
    return this.licenseService.renewLicense(id, dto);
  }

  @Post(':id/toggle-status')
  async toggleLicenseStatus(
    @Param('id') id: string,
    @Body() dto: ToggleLicenseStatusDto,
  ) {
    return this.licenseService.toggleLicenseStatus(id, dto);
  }
}
