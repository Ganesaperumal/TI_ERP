import { Module } from '@nestjs/common';
import { SupplierController } from './suppliers/supplier.controller';
import { SupplierService } from './suppliers/supplier.service';
import { ReorderController } from './reorder/reorder.controller';
import { AutoReorderService } from './reorder/auto-reorder.service';
import { PurchaseOrderService } from './reorder/purchase-order.service';
import { GrnController } from './grn/grn.controller';
import { GrnService } from './grn/grn.service';
import { ReturnsConsignmentController } from './returns-consignment/returns-consignment.controller';
import { ReturnsConsignmentService } from './returns-consignment/returns-consignment.service';

@Module({
  controllers: [
    SupplierController,
    ReorderController,
    GrnController,
    ReturnsConsignmentController,
  ],
  providers: [
    SupplierService,
    AutoReorderService,
    PurchaseOrderService,
    GrnService,
    ReturnsConsignmentService,
  ],
  exports: [
    SupplierService,
    AutoReorderService,
    PurchaseOrderService,
    GrnService,
    ReturnsConsignmentService,
  ],
})
export class ProcurementModule {}
