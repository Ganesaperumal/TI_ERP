import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CoreModule } from './modules/core/core.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StockOpsModule } from './modules/stock-ops/stock-ops.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { AiCopilotModule } from './modules/ai-copilot/ai-copilot.module';

@Module({
  imports: [
    PrismaModule,
    CoreModule,
    CatalogModule,
    InventoryModule,
    StockOpsModule,
    ProcurementModule,
    AiCopilotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
