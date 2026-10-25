import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { OwnerAnalyticsService } from './owner-analytics.service';
import { LiveDashboardQueryDto, NightlyClosingReportDto } from './owner-analytics.dto';

@Controller('api/v1/owner')
export class OwnerAnalyticsController {
  constructor(private readonly analyticsService: OwnerAnalyticsService) {}

  @Get('live-dashboard')
  async getLiveDashboard(@Query() query: LiveDashboardQueryDto) {
    return this.analyticsService.getLiveDashboard(query.tenantId, query.branchId);
  }

  @Post('generate-nightly-closing-report')
  async generateNightlyClosingReport(@Body() dto: NightlyClosingReportDto) {
    return this.analyticsService.generateNightlyClosingReport(
      dto.tenantId,
      dto.branchId,
      dto.date,
    );
  }
}
