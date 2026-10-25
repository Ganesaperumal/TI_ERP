import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { StoreConfig } from '@ti-erp/shared-types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): { status: string; timestamp: string; role: string } {
    return this.appService.getHealth();
  }

  @Get('config/default')
  getDefaultConfig(): StoreConfig {
    return this.appService.getDefaultConfig();
  }
}
