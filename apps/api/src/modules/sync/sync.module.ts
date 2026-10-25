import { Module } from '@nestjs/common';
import { SyncEngineService } from './sync-engine.service';
import { SyncController } from './sync.controller';

@Module({
  controllers: [SyncController],
  providers: [SyncEngineService],
  exports: [SyncEngineService],
})
export class SyncModule {}
