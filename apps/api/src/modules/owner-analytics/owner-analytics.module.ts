import { Module } from '@nestjs/common';
import { OwnerAnalyticsController } from './owner-analytics.controller';
import { OwnerAnalyticsService } from './owner-analytics.service';

@Module({
  controllers: [OwnerAnalyticsController],
  providers: [OwnerAnalyticsService],
  exports: [OwnerAnalyticsService],
})
export class OwnerAnalyticsModule {}
