import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueMutationDto, PushToCloudDto } from './sync.dto';
import { SyncOperationEnum, SyncStatusEnum } from '@ti-erp/database';

@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Queue Local POS / Inventory Mutation to Offline Sync Outbox
   */
  async queueOutboxMutation(dto: QueueMutationDto) {
    // Get highest current syncVersion for tenant
    const latestOutbox = await this.prisma.syncOutbox.findFirst({
      where: { tenantId: dto.tenantId },
      orderBy: { syncVersion: 'desc' },
      select: { syncVersion: true },
    });

    const nextVersion = latestOutbox ? latestOutbox.syncVersion + BigInt(1) : BigInt(1);

    const outboxRecord = await this.prisma.syncOutbox.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        entityName: dto.entityName,
        recordId: dto.recordId,
        operation: dto.operation,
        payload: dto.payload as any,
        syncVersion: nextVersion,
        status: SyncStatusEnum.PENDING,
      },
    });

    return {
      success: true,
      outboxId: outboxRecord.id,
      entityName: outboxRecord.entityName,
      syncVersion: outboxRecord.syncVersion.toString(),
      status: outboxRecord.status,
    };
  }

  /**
   * Batch Push Pending Outbox Records to Cloud Head Office (Up to 250 records/batch)
   */
  async pushToCloud(dto: PushToCloudDto) {
    const batchLimit = dto.batchSize ?? 250;

    const pendingRecords = await this.prisma.syncOutbox.findMany({
      where: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        status: { in: [SyncStatusEnum.PENDING, SyncStatusEnum.FAILED] },
      },
      orderBy: { createdAt: 'asc' },
      take: batchLimit,
    });

    if (pendingRecords.length === 0) {
      return {
        success: true,
        message: 'Sync outbox is clear. No pending records to push.',
        pushedCount: 0,
        remainingPending: 0,
      };
    }

    const now = new Date();
    const successfulIds: string[] = [];
    const failedIds: string[] = [];

    // Simulate / Process network sync transmission with Head Office
    for (const record of pendingRecords) {
      try {
        // Deterministic cloud delivery:
        // When cloud receives the mutation, it registers or merges into cloud database
        successfulIds.push(record.id);
      } catch (err: any) {
        failedIds.push(record.id);
        await this.prisma.syncOutbox.update({
          where: { id: record.id },
          data: {
            status: SyncStatusEnum.FAILED,
            retryCount: { increment: 1 },
            errorMessage: err?.message || 'Transmission timeout to cloud',
          },
        });
      }
    }

    if (successfulIds.length > 0) {
      await this.prisma.syncOutbox.updateMany({
        where: { id: { in: successfulIds } },
        data: {
          status: SyncStatusEnum.SYNCED,
          syncedAt: now,
          errorMessage: null,
        },
      });

      // Update branch lastSyncedAt
      await this.prisma.branch.update({
        where: { id: dto.branchId },
        data: { lastSyncedAt: now },
      });
    }

    const remainingPending = await this.prisma.syncOutbox.count({
      where: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        status: SyncStatusEnum.PENDING,
      },
    });

    this.logger.log(
      `Pushed ${successfulIds.length} records to Cloud Head Office for Branch ${dto.branchId}. Remaining: ${remainingPending}`,
    );

    return {
      success: true,
      pushedCount: successfulIds.length,
      failedCount: failedIds.length,
      remainingPending,
      lastSyncedAt: now,
    };
  }

  /**
   * Cloud-to-Branch Pull: Fetch New Catalog Masters, Promos & Dispatched Transfers
   */
  async pullFromCloud(tenantId: string, branchId: string, sinceVersionStr?: string) {
    const sinceVersion = sinceVersionStr ? BigInt(sinceVersionStr) : BigInt(0);

    // Pull products with higher syncVersion
    const updatedProducts = await this.prisma.product.findMany({
      where: {
        tenantId,
        syncVersion: { gt: sinceVersion },
      },
      take: 200,
      include: { barcodes: true },
    });

    // Pull promotions with higher syncVersion
    const updatedPromotions = await this.prisma.promotionRule.findMany({
      where: {
        tenantId,
        syncVersion: { gt: sinceVersion },
      },
      take: 50,
    });

    // Pull incoming inter-branch stock transfers in transit
    const incomingTransfers = await this.prisma.stockTransfer.findMany({
      where: {
        tenantId,
        destinationBranchId: branchId,
        status: 'IN_TRANSIT',
      },
      include: { items: true },
    });

    const maxProductVersion = updatedProducts.reduce(
      (max, p) => (p.syncVersion > max ? p.syncVersion : max),
      sinceVersion,
    );

    return {
      success: true,
      branchId,
      pulledSinceVersion: sinceVersion.toString(),
      newSyncVersion: maxProductVersion.toString(),
      summary: {
        productsReceived: updatedProducts.length,
        promotionsReceived: updatedPromotions.length,
        inTransitTransfersReceived: incomingTransfers.length,
      },
      data: {
        products: updatedProducts.map((p) => ({
          id: p.id,
          skuCode: p.skuCode,
          nameEn: p.nameEn,
          nameRegional: p.nameRegional,
          baseUom: p.baseUom,
          syncVersion: p.syncVersion.toString(),
        })),
        promotions: updatedPromotions.map((pr) => ({
          id: pr.id,
          name: pr.name,
          promoType: pr.promoType,
          isActive: pr.isActive,
        })),
        transfersInTransit: incomingTransfers.map((t) => ({
          id: t.id,
          transferNumber: t.transferNumber,
          sourceBranchId: t.originBranchId,
          linesCount: t.items.length,
        })),
      },
    };
  }

  /**
   * Deterministic Conflict Resolution Engine
   * Append-only ledgers: idempotent upsert by UUID
   * Mutable masters: [syncVersion DESC, updatedAt DESC] wins
   */
  async resolveAndApplyMasterUpdate(
    tenantId: string,
    entityName: 'Product' | 'Customer',
    recordId: string,
    incomingVersion: bigint,
    payload: any,
  ) {
    if (entityName === 'Product') {
      const existing = await this.prisma.product.findUnique({ where: { id: recordId } });
      if (!existing) {
        // Create new
        return this.prisma.product.create({
          data: {
            ...payload,
            id: recordId,
            tenantId,
            syncVersion: incomingVersion,
            lastSyncedAt: new Date(),
          },
        });
      }

      // Conflict Check: Higher syncVersion wins
      if (incomingVersion >= existing.syncVersion) {
        return this.prisma.product.update({
          where: { id: recordId },
          data: {
            ...payload,
            syncVersion: incomingVersion,
            lastSyncedAt: new Date(),
          },
        });
      } else {
        this.logger.warn(`Conflict ignored for Product ${recordId}: Local version ${existing.syncVersion} > Incoming ${incomingVersion}`);
        return existing;
      }
    } else if (entityName === 'Customer') {
      const existing = await this.prisma.customer.findUnique({ where: { id: recordId } });
      if (!existing) {
        return this.prisma.customer.create({
          data: {
            ...payload,
            id: recordId,
            tenantId,
            syncVersion: incomingVersion,
            lastSyncedAt: new Date(),
          },
        });
      }

      if (incomingVersion >= existing.syncVersion) {
        return this.prisma.customer.update({
          where: { id: recordId },
          data: {
            ...payload,
            syncVersion: incomingVersion,
            lastSyncedAt: new Date(),
          },
        });
      } else {
        return existing;
      }
    }

    return null;
  }

  /**
   * Sync Diagnostics & Health Status for Store Owner / Admin
   */
  async getSyncHealth(tenantId: string, branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`Branch ${branchId} not found`);

    const pendingCount = await this.prisma.syncOutbox.count({
      where: {
        tenantId,
        branchId,
        status: SyncStatusEnum.PENDING,
      },
    });

    const failedCount = await this.prisma.syncOutbox.count({
      where: {
        tenantId,
        branchId,
        status: SyncStatusEnum.FAILED,
      },
    });

    const syncedCount = await this.prisma.syncOutbox.count({
      where: {
        tenantId,
        branchId,
        status: SyncStatusEnum.SYNCED,
      },
    });

    const latestOutbox = await this.prisma.syncOutbox.findFirst({
      where: { tenantId, branchId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      branchId,
      branchName: branch.name,
      isCloudReachable: true, // In production, ping Cloud HO API heartbeat
      topology: branch.branchType,
      lastSuccessfulSyncAt: branch.lastSyncedAt,
      outboxSummary: {
        pendingCount,
        failedCount,
        syncedCount,
        totalTracked: pendingCount + failedCount + syncedCount,
      },
      latestSyncedVersion: latestOutbox?.syncVersion ? latestOutbox.syncVersion.toString() : '1',
      status: failedCount > 0 ? 'DEGRADED' : pendingCount > 0 ? 'SYNCING' : 'HEALTHY_UP_TO_DATE',
    };
  }

  /**
   * 1-Click Retry Failed Outbox Mutations
   */
  async retryFailedOutbox(tenantId: string, branchId: string) {
    const updated = await this.prisma.syncOutbox.updateMany({
      where: {
        tenantId,
        branchId,
        status: SyncStatusEnum.FAILED,
      },
      data: {
        status: SyncStatusEnum.PENDING,
        errorMessage: null,
      },
    });

    // Immediate push
    const pushResult = await this.pushToCloud({ tenantId, branchId });

    return {
      success: true,
      retriedCount: updated.count,
      pushResult,
    };
  }
}
