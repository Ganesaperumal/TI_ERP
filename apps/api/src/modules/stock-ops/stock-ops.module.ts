import { Module } from '@nestjs/common';
import { StockOpsController } from './stock-ops.controller';
import { StockOpsService } from './stock-ops.service';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [CoreModule],
  controllers: [StockOpsController],
  providers: [StockOpsService],
  exports: [StockOpsService],
})
export class StockOpsModule {}
