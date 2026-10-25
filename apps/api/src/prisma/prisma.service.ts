import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '@ti-erp/database';

@Injectable()
export class PrismaService extends DatabaseService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();

    // Middleware: Automatic syncVersion increment on mutations
    this.$use(async (params, next) => {
      const mutationActions = ['create', 'update', 'upsert', 'updateMany'];
      if (mutationActions.includes(params.action) && params.args?.data) {
        if (params.action === 'update' || params.action === 'upsert') {
          if (params.args.data && typeof params.args.data === 'object') {
            // Increment syncVersion on update
            const current = params.args.data.syncVersion;
            if (typeof current === 'bigint') {
              params.args.data.syncVersion = current + BigInt(1);
            } else if (typeof current === 'number') {
              params.args.data.syncVersion = BigInt(current + 1);
            }
          }
        }
      }
      return next(params);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
