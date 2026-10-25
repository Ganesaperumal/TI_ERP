import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryBatchService } from './inventory-batch.service';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [CoreModule],
  controllers: [InventoryController],
  providers: [InventoryBatchService],
  exports: [InventoryBatchService],
})
export class InventoryModule {}
