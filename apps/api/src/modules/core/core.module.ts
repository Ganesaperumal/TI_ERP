import { Module } from '@nestjs/common';
import { TenantBranchController } from './tenant-branch.controller';
import { TenantBranchService } from './tenant-branch.service';

@Module({
  controllers: [TenantBranchController],
  providers: [TenantBranchService],
  exports: [TenantBranchService],
})
export class CoreModule {}
