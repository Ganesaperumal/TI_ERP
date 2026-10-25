import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SyncEngineService } from './sync-engine.service';
import { QueueMutationDto, PushToCloudDto, PullFromCloudDto } from './sync.dto';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncEngineService) {}

  @Post('outbox/queue')
  async queueMutation(@Body() dto: QueueMutationDto) {
    return this.syncService.queueOutboxMutation(dto);
  }

  @Post('push-to-cloud')
  async pushToCloud(@Body() dto: PushToCloudDto) {
    return this.syncService.pushToCloud(dto);
  }

  @Get('pull-from-cloud')
  async pullFromCloud(@Query() query: PullFromCloudDto) {
    if (!query.tenantId || !query.branchId) {
      throw new BadRequestException('tenantId and branchId are required');
    }
    return this.syncService.pullFromCloud(query.tenantId, query.branchId, query.sinceVersion);
  }

  @Get('status')
  async getStatus(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId: string,
  ) {
    if (!tenantId || !branchId) {
      throw new BadRequestException('tenantId and branchId are required');
    }
    return this.syncService.getSyncHealth(tenantId, branchId);
  }

  @Post('retry-failed')
  async retryFailed(
    @Body('tenantId') tenantId: string,
    @Body('branchId') branchId: string,
  ) {
    if (!tenantId || !branchId) {
      throw new BadRequestException('tenantId and branchId are required');
    }
    return this.syncService.retryFailedOutbox(tenantId, branchId);
  }
}
