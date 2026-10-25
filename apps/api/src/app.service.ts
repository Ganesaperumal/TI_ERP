import { Injectable } from '@nestjs/common';
import { DEFAULT_STORE_CONFIG, StoreConfig } from '@ti-erp/shared-types';

@Injectable()
export class AppService {
  getHealth(): { status: string; timestamp: string; role: string } {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      role: process.env.STORE_ROLE || 'LOCAL_STORE',
    };
  }

  getDefaultConfig(): StoreConfig {
    return DEFAULT_STORE_CONFIG;
  }
}
