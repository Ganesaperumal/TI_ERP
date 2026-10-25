import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import {
  CreateCategoryDto,
  CreateBrandDto,
  CreateHsnDto,
  CreateProductDto,
  BulkImportProductsDto,
} from './catalog.dto';

@Controller('api/v1/catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // Categories
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Get('categories')
  listCategories(@Query('tenantId') tenantId: string) {
    return this.catalogService.listCategories(tenantId);
  }

  // Brands
  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.catalogService.createBrand(dto);
  }

  @Get('brands')
  listBrands(@Query('tenantId') tenantId: string) {
    return this.catalogService.listBrands(tenantId);
  }

  // HSN Master
  @Post('hsn')
  createHsn(@Body() dto: CreateHsnDto) {
    return this.catalogService.createHsn(dto);
  }

  @Get('hsn')
  listHsn(@Query('tenantId') tenantId: string) {
    return this.catalogService.listHsn(tenantId);
  }

  // Products
  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto);
  }

  @Get('products')
  listProducts(
    @Query('tenantId') tenantId: string,
    @Query('search') search?: string,
  ) {
    return this.catalogService.listProducts(tenantId, search);
  }

  // Ultra-Fast POS Barcode & PLU Resolver
  @Get('lookup')
  lookup(
    @Query('code') code: string,
    @Query('branchId') branchId: string,
  ) {
    return this.catalogService.lookup(code, branchId);
  }

  // Bulk FMCG / CSV Import
  @Post('import')
  importBulk(@Body() dto: BulkImportProductsDto) {
    return this.catalogService.importBulk(dto);
  }
}
