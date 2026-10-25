import { Module } from '@nestjs/common';
import { SaasAdminController } from './saas-admin.controller';
import { SaasLicenseAdminService } from './saas-license-admin.service';

@Module({
  controllers: [SaasAdminController],
  providers: [SaasLicenseAdminService],
  exports: [SaasLicenseAdminService],
})
export class SaasAdminModule {}
