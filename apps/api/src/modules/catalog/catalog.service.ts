import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantBranchService } from '../core/tenant-branch.service';
import {
  CreateCategoryDto,
  CreateBrandDto,
  CreateHsnDto,
  CreateProductDto,
  BulkImportProductsDto,
} from './catalog.dto';
import { Decimal } from '@ti-erp/database';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantBranchService: TenantBranchService,
  ) {}

  // 1. Categories
  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        tenantId: dto.tenantId,
        code: dto.code,
        name: dto.name,
        parentCategoryId: dto.parentCategoryId,
      },
    });
  }

  async listCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      include: { subCategories: true },
    });
  }

  // 2. Brands
  async createBrand(dto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: {
        tenantId: dto.tenantId,
        code: dto.code,
        name: dto.name,
      },
    });
  }

  async listBrands(tenantId: string) {
    return this.prisma.brand.findMany({ where: { tenantId } });
  }

  // 3. HSN Master
  async createHsn(dto: CreateHsnDto) {
    return this.prisma.hsnTaxMaster.create({
      data: {
        tenantId: dto.tenantId,
        hsnCode: dto.hsnCode,
        description: dto.description,
        cgstRate: new Decimal(dto.cgstRate),
        sgstRate: new Decimal(dto.sgstRate),
        igstRate: new Decimal(dto.igstRate),
        cessRate: dto.cessRate ? new Decimal(dto.cessRate) : new Decimal(0),
      },
    });
  }

  async listHsn(tenantId: string) {
    return this.prisma.hsnTaxMaster.findMany({ where: { tenantId } });
  }

  // 4. Products (Supporting all 5 types: STANDARD_FMCG, WEIGHED_LOOSE, REPACKED_BULK, COMBO_KIT, VARIANT_MATRIX)
  async createProduct(dto: CreateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          tenantId: dto.tenantId,
          skuCode: dto.skuCode,
          nameEn: dto.nameEn,
          nameRegional: dto.nameRegional,
          shortPluCode: dto.shortPluCode,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          hsnId: dto.hsnId,
          productType: dto.productType,
          baseUom: dto.baseUom || 'PCS',
          batchTrackingMode: dto.batchTrackingMode,
          negativeStockRule: dto.negativeStockRule,
          minStock: dto.minStock ? new Decimal(dto.minStock) : new Decimal(0),
          maxStock: dto.maxStock ? new Decimal(dto.maxStock) : new Decimal(0),
        },
      });

      // Barcode aliases
      if (dto.barcodes && dto.barcodes.length > 0) {
        for (const b of dto.barcodes) {
          await tx.productBarcode.create({
            data: {
              tenantId: dto.tenantId,
              productId: product.id,
              barcode: b.barcode,
              isPrimary: b.isPrimary ?? false,
              uomId: b.uomId,
            },
          });
        }
      }

      // Multi-UOM conversions (Pack, Box, Carton)
      if (dto.uomConversions && dto.uomConversions.length > 0) {
        for (const u of dto.uomConversions) {
          await tx.productUomConversion.create({
            data: {
              tenantId: dto.tenantId,
              productId: product.id,
              uomName: u.uomName,
              conversionFactor: new Decimal(u.conversionFactor),
              barcode: u.barcode,
              retailPrice: u.retailPrice ? new Decimal(u.retailPrice) : null,
              wholesalePrice: u.wholesalePrice ? new Decimal(u.wholesalePrice) : null,
            },
          });
        }
      }

      // Combo kit BOM children
      if (dto.comboItems && dto.comboItems.length > 0) {
        for (const c of dto.comboItems) {
          await tx.comboBomItem.create({
            data: {
              tenantId: dto.tenantId,
              parentComboProductId: product.id,
              childProductId: c.childProductId,
              comboMode: c.comboMode,
              quantityRequired: new Decimal(c.quantityRequired),
              priceApportionmentPct: c.priceApportionmentPct ? new Decimal(c.priceApportionmentPct) : new Decimal(100),
            },
          });
        }
      }

      // Variant matrix (Size × Color child SKUs)
      if (dto.variantMatrix) {
        const { sizes, colors } = dto.variantMatrix;
        for (const size of sizes) {
          for (const color of colors) {
            const variantSku = `${dto.skuCode}-${size}-${color.toUpperCase().replace(/\s+/g, '')}`;
            await tx.productVariant.create({
              data: {
                tenantId: dto.tenantId,
                productId: product.id,
                variantSku,
                size,
                color,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          barcodes: true,
          uomConversions: true,
          comboAsParent: true,
          variants: true,
          category: true,
          brand: true,
          hsn: true,
        },
      });
    });
  }

  async listProducts(tenantId: string, search?: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { skuCode: { contains: search, mode: 'insensitive' } },
                { nameEn: { contains: search, mode: 'insensitive' } },
                { nameRegional: { contains: search, mode: 'insensitive' } },
                { shortPluCode: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        barcodes: true,
        uomConversions: true,
        variants: true,
        category: true,
        hsn: true,
      },
      take: 100,
    });
  }

  // 5. Ultra-Fast POS Barcode & PLU Resolver (<5ms)
  async lookup(code: string, branchId: string) {
    const config = await this.tenantBranchService.getMergedStoreConfig(branchId);
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`Branch ${branchId} not found`);

    const trimmedCode = code.trim();

    // CASE C: Weighing Scale Prefix Barcode (e.g., '20' + 5-digit PLU + 5-digit Weight in grams + check digit)
    const scaleRule = config.hardware.weighingScale.barcodePrefixRule;
    if (
      scaleRule.enabled &&
      trimmedCode.startsWith(scaleRule.prefix) &&
      trimmedCode.length >= scaleRule.prefix.length + scaleRule.skuLength + scaleRule.weightLength
    ) {
      const startSku = scaleRule.prefix.length;
      const skuOrPlu = trimmedCode.substring(startSku, startSku + scaleRule.skuLength);
      const startWeight = startSku + scaleRule.skuLength;
      const weightRaw = trimmedCode.substring(startWeight, startWeight + scaleRule.weightLength);
      const weightKg = new Decimal(weightRaw).div(new Decimal(10).pow(scaleRule.weightDecimals));

      // Find product by short PLU code (trimmed of leading zeroes) or SKU code
      const cleanPlu = parseInt(skuOrPlu, 10).toString();
      const product = await this.prisma.product.findFirst({
        where: {
          tenantId: branch.tenantId,
          OR: [
            { shortPluCode: cleanPlu },
            { shortPluCode: skuOrPlu },
            { skuCode: skuOrPlu },
            { barcodes: { some: { barcode: skuOrPlu } } },
          ],
        },
        include: { hsn: true, uomConversions: true, barcodes: true },
      });

      if (product) {
        return {
          resolvedBy: 'WEIGHING_SCALE_PREFIX',
          product,
          scaleData: {
            prefix: scaleRule.prefix,
            rawWeight: weightRaw,
            weightKg: Number(weightKg),
            weightKgDecimal: weightKg,
          },
        };
      }
    }

    // Check Multi-UOM Carton / Box Specific Barcode (REMOD-201A)
    const uomConversion = await this.prisma.productUomConversion.findFirst({
      where: {
        barcode: trimmedCode,
        product: { tenantId: branch.tenantId },
      },
      include: {
        product: {
          include: { hsn: true, uomConversions: true, barcodes: true },
        },
      },
    });

    if (uomConversion) {
      return {
        resolvedBy: 'UOM_CONVERSION_BARCODE',
        product: uomConversion.product,
        uomConversion: {
          id: uomConversion.id,
          uomName: uomConversion.uomName,
          conversionFactor: uomConversion.conversionFactor,
          barcode: uomConversion.barcode,
          retailPrice: uomConversion.retailPrice,
          wholesalePrice: uomConversion.wholesalePrice,
        },
      };
    }

    // CASE A: Standard EAN-13, UPC, or Internal Barcode Match
    const barcodeEntry = await this.prisma.productBarcode.findFirst({
      where: {
        tenantId: branch.tenantId,
        barcode: trimmedCode,
      },
      include: {
        product: {
          include: { hsn: true, uomConversions: true, barcodes: true },
        },
      },
    });

    if (barcodeEntry) {
      return {
        resolvedBy: 'BARCODE_ALIAS',
        product: barcodeEntry.product,
        matchedBarcode: barcodeEntry.barcode,
      };
    }

    // CASE B: 3-Digit Rapid PLU or Direct SKU Code
    const productByPlu = await this.prisma.product.findFirst({
      where: {
        tenantId: branch.tenantId,
        OR: [
          { shortPluCode: trimmedCode },
          { skuCode: trimmedCode },
        ],
      },
      include: { hsn: true, uomConversions: true, barcodes: true },
    });

    if (productByPlu) {
      return {
        resolvedBy: 'SHORT_PLU_OR_SKU',
        product: productByPlu,
      };
    }

    // Fallback: Phonetic / Bilingual Name Substring Search
    const productByName = await this.prisma.product.findFirst({
      where: {
        tenantId: branch.tenantId,
        OR: [
          { nameEn: { contains: trimmedCode, mode: 'insensitive' } },
          { nameRegional: { contains: trimmedCode } },
        ],
      },
      include: { hsn: true, uomConversions: true, barcodes: true },
    });

    if (productByName) {
      return {
        resolvedBy: 'NAME_SEARCH',
        product: productByName,
      };
    }

    throw new NotFoundException(`Item with code/barcode '${trimmedCode}' not found`);
  }

  // 6. Bulk Importer for 50k FMCG Seed / Legacy CSV
  async importBulk(dto: BulkImportProductsDto) {
    let importedCount = 0;
    for (const item of dto.items) {
      const product = await this.prisma.product.upsert({
        where: {
          tenantId_skuCode: {
            tenantId: dto.tenantId,
            skuCode: item.skuCode,
          },
        },
        update: {
          nameEn: item.nameEn,
          nameRegional: item.nameRegional,
          shortPluCode: item.shortPluCode,
        },
        create: {
          tenantId: dto.tenantId,
          skuCode: item.skuCode,
          nameEn: item.nameEn,
          nameRegional: item.nameRegional,
          shortPluCode: item.shortPluCode,
          productType: item.productType || 'STANDARD_FMCG',
          baseUom: item.baseUom || 'PCS',
        },
      });

      if (item.barcode) {
        await this.prisma.productBarcode.upsert({
          where: {
            tenantId_barcode: {
              tenantId: dto.tenantId,
              barcode: item.barcode,
            },
          },
          update: {},
          create: {
            tenantId: dto.tenantId,
            productId: product.id,
            barcode: item.barcode,
            isPrimary: true,
          },
        });
      }

      importedCount++;
    }

    return { success: true, importedCount };
  }
}
