import {
  PrismaClient,
  TopologyModeEnum,
  GstRegimeEnum,
  BranchTypeEnum,
  StorageBinTypeEnum,
  AccountTypeEnum,
  ProductTypeEnum,
  BatchTrackingModeEnum,
  NegativeStockRuleEnum,
  ComboModeEnum,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding enterprise master data for TI-ERP (Milestone 2)...');

  // 1. SaaS License
  const license = await prisma.saaSLicense.upsert({
    where: { licenseKey: 'TIERP-ENT-2026-DEV001' },
    update: {},
    create: {
      licenseKey: 'TIERP-ENT-2026-DEV001',
      customerName: 'TI Supermarket Group',
      planTier: 'ENTERPRISE',
      maxBranches: 10,
      maxTerminals: 50,
      activeModules: {
        pos: true,
        inventory: true,
        accounting: true,
        loyalty: true,
        hardwareBridge: true,
        aiOcr: true,
      },
      amcExpiryDate: new Date('2028-12-31'),
      isActive: true,
    },
  });

  // 2. Master Tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: 'TI_CORP' },
    update: {},
    create: {
      licenseId: license.id,
      code: 'TI_CORP',
      name: 'TI Supermarkets India Pvt Ltd',
      legalTradeName: 'TI Supermarkets India Private Limited',
      primaryContact: '+91 9876543210',
      email: 'admin@tierp.local',
      gstRegime: GstRegimeEnum.REGULAR,
      topology: TopologyModeEnum.SINGLE_STORE,
    },
  });

  // 3. Branches: Main Retail Store + Central Warehouse
  const mainBranch = await prisma.branch.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'BR_MAIN',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'BR_MAIN',
      name: 'TI Supermarket Flagship Store',
      branchType: BranchTypeEnum.RETAIL_STORE,
      gstin: '33AAAAA0000A1Z5',
      address: '100 Feet Road, Indiranagar',
      city: 'Coimbatore',
      stateCode: '33',
      pincode: '641001',
      phone: '+91 422 2345678',
      regionalLanguage: 'ta-IN',
      localServerIp: '192.168.1.100',
    },
  });

  const warehouseBranch = await prisma.branch.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'BR_WH',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'BR_WH',
      name: 'TI Central Distribution Warehouse',
      branchType: BranchTypeEnum.WAREHOUSE,
      gstin: '33AAAAA0000A1Z5',
      address: 'Plot 45, SIPCOT Industrial Park',
      city: 'Perundurai',
      stateCode: '33',
      pincode: '638052',
      phone: '+91 424 9876543',
      regionalLanguage: 'ta-IN',
      localServerIp: '192.168.1.200',
    },
  });

  // 4. Physical Storage Bins per branch
  const binDefs = [
    { code: 'BIN_GODOWN', name: 'Backroom Central Godown', type: StorageBinTypeEnum.GODOWN, aisle: 'A1', rack: 'R01' },
    { code: 'BIN_SHOP_FLOOR', name: 'Main Retail Floor Gondolas', type: StorageBinTypeEnum.SHOP_FLOOR, aisle: 'F1', rack: 'R01' },
    { code: 'BIN_DAMAGED_RET', name: 'Damaged Goods (Vendor Return)', type: StorageBinTypeEnum.DAMAGED_RETURNABLE, aisle: 'D1', rack: 'R99' },
    { code: 'BIN_SCRAP', name: 'Damaged Scrap Write-off', type: StorageBinTypeEnum.DAMAGED_SCRAP, aisle: 'D2', rack: 'R99' },
  ];

  for (const branch of [mainBranch, warehouseBranch]) {
    for (const b of binDefs) {
      await prisma.storageBin.upsert({
        where: {
          branchId_binCode: {
            branchId: branch.id,
            binCode: `${branch.code}_${b.code}`,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          branchId: branch.id,
          binCode: `${branch.code}_${b.code}`,
          binType: b.type,
          aisle: b.aisle,
          rack: b.rack,
          description: `${branch.name} - ${b.name}`,
        },
      });
    }
  }

  // 5. Default Roles
  const adminRole = await prisma.role.upsert({
    where: {
      tenantId_roleName: {
        tenantId: tenant.id,
        roleName: 'SUPER_ADMIN',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      roleName: 'SUPER_ADMIN',
      permissions: ['*'],
      maskCostAndMargin: false,
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: {
      tenantId_roleName: {
        tenantId: tenant.id,
        roleName: 'CASHIER',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      roleName: 'CASHIER',
      permissions: ['pos:bill', 'pos:hold', 'pos:recall', 'pos:close_shift'],
      maskCostAndMargin: true,
    },
  });

  // 6. Users
  await prisma.user.upsert({
    where: {
      tenantId_username: {
        tenantId: tenant.id,
        username: 'admin',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      roleId: adminRole.id,
      username: 'admin',
      passwordHash: 'argon2_mock_hash_admin',
      fullName: 'System Administrator',
      email: 'admin@tierp.local',
      supervisorPinEncrypted: '1234',
    },
  });

  await prisma.user.upsert({
    where: {
      tenantId_username: {
        tenantId: tenant.id,
        username: 'cashier1',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      roleId: cashierRole.id,
      username: 'cashier1',
      passwordHash: 'argon2_mock_hash_cashier',
      fullName: 'Lead Cashier 1',
      salesmanCommissionRate: 0.5,
    },
  });

  // 7. 3 POS Counters
  const counters = ['POS-01', 'POS-02', 'POS-03'];
  for (const counter of counters) {
    await prisma.posTerminal.upsert({
      where: {
        branchId_terminalCode: {
          branchId: mainBranch.id,
          terminalCode: counter,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: mainBranch.id,
        terminalCode: counter,
        printerIp: '192.168.1.200',
        scalePort: '/dev/ttyUSB0',
        edcTerminalId: `EDC_${counter}`,
        hardwareLocked: false,
      },
    });
  }

  // 8. Standard GST HSN Master
  const hsnEntries = [
    { code: '0000', cgst: 0, sgst: 0, igst: 0, desc: 'Exempt Foodgrains / Fresh Produce' },
    { code: '1006', cgst: 2.5, sgst: 2.5, igst: 5.0, desc: 'Packaged Rice & Cereals (5% GST)' },
    { code: '0402', cgst: 6.0, sgst: 6.0, igst: 12.0, desc: 'Dairy, Butter & Cheese (12% GST)' },
    { code: '2106', cgst: 9.0, sgst: 9.0, igst: 18.0, desc: 'Branded FMCG & Packaged Snacks (18% GST)' },
    { code: '2202', cgst: 14.0, sgst: 14.0, igst: 28.0, desc: 'Aerated Drinks & Energy Drinks (28% GST)' },
  ];

  const hsnMap: Record<string, string> = {};
  for (const h of hsnEntries) {
    const record = await prisma.hsnTaxMaster.upsert({
      where: {
        tenantId_hsnCode: {
          tenantId: tenant.id,
          hsnCode: h.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        hsnCode: h.code,
        description: h.desc,
        cgstRate: h.cgst,
        sgstRate: h.sgst,
        igstRate: h.igst,
      },
    });
    hsnMap[h.code] = record.id;
  }

  // 9. Categories and Brands
  const catGrocery = await prisma.category.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CAT_GROCERY' } },
    update: {},
    create: { tenantId: tenant.id, code: 'CAT_GROCERY', name: 'Grocery & Staples' },
  });

  const catSnacks = await prisma.category.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CAT_SNACKS' } },
    update: {},
    create: { tenantId: tenant.id, code: 'CAT_SNACKS', name: 'Snacks & Biscuits' },
  });

  const catApparel = await prisma.category.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CAT_APPAREL' } },
    update: {},
    create: { tenantId: tenant.id, code: 'CAT_APPAREL', name: 'Apparel & Fashion' },
  });

  const brandParle = await prisma.brand.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'BR_PARLE' } },
    update: {},
    create: { tenantId: tenant.id, code: 'BR_PARLE', name: 'Parle' },
  });

  const brandHeritage = await prisma.brand.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'BR_HERITAGE' } },
    update: {},
    create: { tenantId: tenant.id, code: 'BR_HERITAGE', name: 'Heritage Staples' },
  });

  // 10. Sample Products Across ALL 5 Product Types
  // Type 1: STANDARD_FMCG with Multi-Barcode Aliases
  const pFmcg = await prisma.product.upsert({
    where: { tenantId_skuCode: { tenantId: tenant.id, skuCode: 'SKU-FMCG-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      skuCode: 'SKU-FMCG-001',
      nameEn: 'Parle-G Gold Glucose Biscuit 1kg',
      nameRegional: 'பார்லே-ஜி பிஸ்கட் 1கிலோ',
      shortPluCode: '101',
      categoryId: catSnacks.id,
      brandId: brandParle.id,
      hsnId: hsnMap['2106'],
      productType: ProductTypeEnum.STANDARD_FMCG,
      baseUom: 'PACK',
      batchTrackingMode: BatchTrackingModeEnum.POPUP_ON_MRP_DIFF,
      negativeStockRule: NegativeStockRuleEnum.WARN_PIN,
      minStock: 20,
      maxStock: 200,
    },
  });

  // Barcode aliases (Factory EAN + Internal Store Barcode)
  await prisma.productBarcode.upsert({
    where: { tenantId_barcode: { tenantId: tenant.id, barcode: '8901719114138' } },
    update: {},
    create: { tenantId: tenant.id, productId: pFmcg.id, barcode: '8901719114138', isPrimary: true },
  });
  await prisma.productBarcode.upsert({
    where: { tenantId_barcode: { tenantId: tenant.id, barcode: 'PARLEG1KG' } },
    update: {},
    create: { tenantId: tenant.id, productId: pFmcg.id, barcode: 'PARLEG1KG', isPrimary: false },
  });

  // Type 2: WEIGHED_LOOSE (Produce with 3-digit PLU & Scale prefix support)
  const pLoose = await prisma.product.upsert({
    where: { tenantId_skuCode: { tenantId: tenant.id, skuCode: 'SKU-PROD-002' } },
    update: {},
    create: {
      tenantId: tenant.id,
      skuCode: 'SKU-PROD-002',
      nameEn: 'Farm Fresh Potato',
      nameRegional: 'உருளைக்கிழங்கு',
      shortPluCode: '201',
      categoryId: catGrocery.id,
      hsnId: hsnMap['0000'],
      productType: ProductTypeEnum.WEIGHED_LOOSE,
      baseUom: 'KG',
      batchTrackingMode: BatchTrackingModeEnum.AUTO_FEFO,
      negativeStockRule: NegativeStockRuleEnum.ALLOW,
    },
  });

  // Barcode alias for PLU 201
  await prisma.productBarcode.upsert({
    where: { tenantId_barcode: { tenantId: tenant.id, barcode: '2000201' } },
    update: {},
    create: { tenantId: tenant.id, productId: pLoose.id, barcode: '2000201', isPrimary: true },
  });

  // Type 3: REPACKED_BULK (Bulk Rice 50kg Sack -> Retail 1kg Pouch)
  const pBulkSack = await prisma.product.upsert({
    where: { tenantId_skuCode: { tenantId: tenant.id, skuCode: 'SKU-RICE-50KG' } },
    update: {},
    create: {
      tenantId: tenant.id,
      skuCode: 'SKU-RICE-50KG',
      nameEn: 'Sona Masoori Rice Raw 50kg Sack (Bulk)',
      nameRegional: 'சோனா மசூரி அரிசி 50கிலோ மூட்டை',
      categoryId: catGrocery.id,
      brandId: brandHeritage.id,
      hsnId: hsnMap['1006'],
      productType: ProductTypeEnum.REPACKED_BULK,
      baseUom: 'KG',
      batchTrackingMode: BatchTrackingModeEnum.AUTO_FEFO,
    },
  });

  const pRetailPack = await prisma.product.upsert({
    where: { tenantId_skuCode: { tenantId: tenant.id, skuCode: 'SKU-RICE-1KG' } },
    update: {},
    create: {
      tenantId: tenant.id,
      skuCode: 'SKU-RICE-1KG',
      nameEn: 'Sona Masoori Rice 1kg Retail Pouch',
      nameRegional: 'சோனா மசூரி அரிசி 1கிலோ',
      categoryId: catGrocery.id,
      brandId: brandHeritage.id,
      hsnId: hsnMap['1006'],
      productType: ProductTypeEnum.STANDARD_FMCG,
      baseUom: 'PACK',
    },
  });

  await prisma.productBarcode.upsert({
    where: { tenantId_barcode: { tenantId: tenant.id, barcode: '8901234567011' } },
    update: {},
    create: { tenantId: tenant.id, productId: pRetailPack.id, barcode: '8901234567011', isPrimary: true },
  });

  // Type 4: COMBO_KIT (Breakfast Combo Kit with Bill-of-Materials)
  const pCombo = await prisma.product.upsert({
    where: { tenantId_skuCode: { tenantId: tenant.id, skuCode: 'SKU-COMBO-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      skuCode: 'SKU-COMBO-001',
      nameEn: 'Healthy Breakfast Combo Pack',
      nameRegional: 'காலை உணவு காம்போ',
      categoryId: catSnacks.id,
      hsnId: hsnMap['2106'],
      productType: ProductTypeEnum.COMBO_KIT,
      baseUom: 'KIT',
    },
  });

  await prisma.comboBomItem.deleteMany({ where: { parentComboProductId: pCombo.id } });
  await prisma.comboBomItem.create({
    data: {
      tenantId: tenant.id,
      parentComboProductId: pCombo.id,
      childProductId: pFmcg.id,
      comboMode: ComboModeEnum.PRE_PACKED,
      quantityRequired: 2,
      priceApportionmentPct: 50,
    },
  });

  // Type 5: VARIANT_MATRIX (Apparel Polo T-Shirt with Size and Color matrix)
  const pMatrix = await prisma.product.upsert({
    where: { tenantId_skuCode: { tenantId: tenant.id, skuCode: 'SKU-POLO-SHIRT' } },
    update: {},
    create: {
      tenantId: tenant.id,
      skuCode: 'SKU-POLO-SHIRT',
      nameEn: 'TI Classic Cotton Polo T-Shirt',
      nameRegional: 'டி-சர்ட்',
      categoryId: catApparel.id,
      hsnId: hsnMap['2106'],
      productType: ProductTypeEnum.VARIANT_MATRIX,
      baseUom: 'PCS',
    },
  });

  const variants = [
    { sku: 'POLO-M-NAVY', size: 'M', color: 'Navy Blue', barcode: '890700101' },
    { sku: 'POLO-L-NAVY', size: 'L', color: 'Navy Blue', barcode: '890700102' },
    { sku: 'POLO-XL-NAVY', size: 'XL', color: 'Navy Blue', barcode: '890700103' },
  ];

  for (const v of variants) {
    await prisma.productVariant.upsert({
      where: { tenantId_variantSku: { tenantId: tenant.id, variantSku: v.sku } },
      update: {},
      create: {
        tenantId: tenant.id,
        productId: pMatrix.id,
        variantSku: v.sku,
        size: v.size,
        color: v.color,
        barcode: v.barcode,
      },
    });
  }

  // 11. Initial Batches in Main Branch
  await prisma.inventoryBatch.upsert({
    where: {
      branchId_productId_batchNumber: {
        branchId: mainBranch.id,
        productId: pFmcg.id,
        batchNumber: 'B-PARLE-OCT26',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      productId: pFmcg.id,
      batchNumber: 'B-PARLE-OCT26',
      expiryDate: new Date('2027-04-30'),
      mrp: 120.0,
      purchaseRate: 90.0,
      netLandingCost: 95.0,
      retailSellingPrice: 110.0,
      wholesalePriceTier1: 102.0,
      wholesalePriceTier2: 98.0,
    },
  });

  await prisma.inventoryBatch.upsert({
    where: {
      branchId_productId_batchNumber: {
        branchId: mainBranch.id,
        productId: pLoose.id,
        batchNumber: 'B-POTATO-TODAY',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      productId: pLoose.id,
      batchNumber: 'B-POTATO-TODAY',
      expiryDate: new Date('2026-11-05'),
      mrp: 40.0,
      purchaseRate: 26.0,
      netLandingCost: 28.0,
      retailSellingPrice: 36.0,
    },
  });

  // Bulk Sack Batch
  await prisma.inventoryBatch.upsert({
    where: {
      branchId_productId_batchNumber: {
        branchId: mainBranch.id,
        productId: pBulkSack.id,
        batchNumber: 'B-RICE-SACK-01',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      productId: pBulkSack.id,
      batchNumber: 'B-RICE-SACK-01',
      expiryDate: new Date('2027-10-01'),
      mrp: 2600.0,
      purchaseRate: 2000.0,
      netLandingCost: 2100.0,
      retailSellingPrice: 2450.0,
    },
  });

  console.log('Master seed complete successfully across all 5 Product Types!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
