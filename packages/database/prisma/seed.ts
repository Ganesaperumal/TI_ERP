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
  PromotionTypeEnum,
  LoyaltyTierEnum,
  Prisma,
} from '@prisma/client';

const prisma = new PrismaClient();

const STANDARD_CHART_OF_ACCOUNTS = [
  // Assets
  { code: 'ASSET_CASH_DRAWER', name: 'Cash-in-Hand (Counter Drawers)', groupType: AccountTypeEnum.ASSET, groupName: 'Current Assets' },
  { code: 'ASSET_SAFE_CASH', name: 'Main Safe Cash', groupType: AccountTypeEnum.ASSET, groupName: 'Current Assets' },
  { code: 'ASSET_BANK_MAIN', name: 'Bank Accounts (HDFC / SBI / ICICI)', groupType: AccountTypeEnum.ASSET, groupName: 'Bank Accounts' },
  { code: 'ASSET_UPI_CARD_CLEARING', name: 'UPI/Card Pending Settlement Clearing', groupType: AccountTypeEnum.ASSET, groupName: 'Current Assets' },
  { code: 'ASSET_INVENTORY_STOCK', name: 'Inventory Asset (Closing Stock)', groupType: AccountTypeEnum.ASSET, groupName: 'Inventory Stock' },
  { code: 'ASSET_ACCOUNTS_RECEIVABLE', name: 'Accounts Receivable (Customer Khata)', groupType: AccountTypeEnum.ASSET, groupName: 'Sundry Debtors' },
  { code: 'ASSET_GST_INPUT_CGST', name: 'GST Input Tax Credit - CGST', groupType: AccountTypeEnum.ASSET, groupName: 'Duties and Taxes' },
  { code: 'ASSET_GST_INPUT_SGST', name: 'GST Input Tax Credit - SGST', groupType: AccountTypeEnum.ASSET, groupName: 'Duties and Taxes' },
  { code: 'ASSET_GST_INPUT_IGST', name: 'GST Input Tax Credit - IGST', groupType: AccountTypeEnum.ASSET, groupName: 'Duties and Taxes' },
  { code: 'ASSET_GST_INPUT_CESS', name: 'GST Input Tax Credit - Cess', groupType: AccountTypeEnum.ASSET, groupName: 'Duties and Taxes' },
  { code: 'ASSET_STAFF_ADVANCES', name: 'Staff Salary Advances', groupType: AccountTypeEnum.ASSET, groupName: 'Loans and Advances' },

  // Liabilities
  { code: 'LIAB_ACCOUNTS_PAYABLE', name: 'Accounts Payable (Sundry Creditors / Suppliers)', groupType: AccountTypeEnum.LIABILITY, groupName: 'Sundry Creditors' },
  { code: 'LIAB_GST_OUTPUT_CGST', name: 'GST Output Tax Liability - CGST', groupType: AccountTypeEnum.LIABILITY, groupName: 'Duties and Taxes' },
  { code: 'LIAB_GST_OUTPUT_SGST', name: 'GST Output Tax Liability - SGST', groupType: AccountTypeEnum.LIABILITY, groupName: 'Duties and Taxes' },
  { code: 'LIAB_GST_OUTPUT_IGST', name: 'GST Output Tax Liability - IGST', groupType: AccountTypeEnum.LIABILITY, groupName: 'Duties and Taxes' },
  { code: 'LIAB_GST_OUTPUT_CESS', name: 'GST Output Tax Liability - Cess', groupType: AccountTypeEnum.LIABILITY, groupName: 'Duties and Taxes' },
  { code: 'LIAB_PREPAID_GIFT_CARDS', name: 'Customer Prepaid Gift Cards', groupType: AccountTypeEnum.LIABILITY, groupName: 'Current Liabilities' },
  { code: 'LIAB_CREDIT_NOTES', name: 'Customer Credit Note Liability', groupType: AccountTypeEnum.LIABILITY, groupName: 'Current Liabilities' },
  { code: 'LIAB_SALARY_PAYABLE', name: 'Staff Salaries Payable', groupType: AccountTypeEnum.LIABILITY, groupName: 'Current Liabilities' },

  // Income
  { code: 'INC_RETAIL_SALES', name: 'Retail POS Sales', groupType: AccountTypeEnum.INCOME, groupName: 'Sales Accounts' },
  { code: 'INC_WHOLESALE_SALES', name: 'Wholesale B2B Sales', groupType: AccountTypeEnum.INCOME, groupName: 'Sales Accounts' },
  { code: 'INC_OTHER_STORE_INCOME', name: 'Other Store Income (Brand Display & End-Cap Rentals)', groupType: AccountTypeEnum.INCOME, groupName: 'Direct Income' },
  { code: 'INC_ROUNDOFF', name: 'Round-Off Gain', groupType: AccountTypeEnum.INCOME, groupName: 'Direct Income' },

  // Expenses
  { code: 'EXP_COGS', name: 'Cost of Goods Sold (COGS)', groupType: AccountTypeEnum.EXPENSE, groupName: 'Direct Expenses' },
  { code: 'EXP_SHRINKAGE_WRITE_OFF', name: 'Inventory Shrinkage/Wastage/Damage Write-Off', groupType: AccountTypeEnum.EXPENSE, groupName: 'Direct Expenses' },
  { code: 'EXP_BANK_MDR_CHARGES', name: 'Bank MDR & Payment Gateway Charges', groupType: AccountTypeEnum.EXPENSE, groupName: 'Indirect Expenses' },
  { code: 'EXP_STORE_RENT', name: 'Store Rent', groupType: AccountTypeEnum.EXPENSE, groupName: 'Indirect Expenses' },
  { code: 'EXP_ELECTRICITY_BILL', name: 'Electricity & EB Bill', groupType: AccountTypeEnum.EXPENSE, groupName: 'Indirect Expenses' },
  { code: 'EXP_PACKAGING_MATERIALS', name: 'Packaging Materials & Carry Bags', groupType: AccountTypeEnum.EXPENSE, groupName: 'Direct Expenses' },
  { code: 'EXP_STAFF_SALARIES', name: 'Staff Salaries & Incentives', groupType: AccountTypeEnum.EXPENSE, groupName: 'Indirect Expenses' },
  { code: 'EXP_FREIGHT_DELIVERY_FUEL', name: 'Freight Inward & Delivery Fuel', groupType: AccountTypeEnum.EXPENSE, groupName: 'Direct Expenses' },
  { code: 'EXP_ROUNDOFF', name: 'Round-Off Expense', groupType: AccountTypeEnum.EXPENSE, groupName: 'Indirect Expenses' },

  // Equity
  { code: 'EQ_OPENING_CAPITAL', name: 'Store Owner Opening Capital', groupType: AccountTypeEnum.EQUITY, groupName: 'Capital Account' },
  { code: 'EQ_RETAINED_EARNINGS', name: 'Retained Earnings', groupType: AccountTypeEnum.EQUITY, groupName: 'Reserves and Surplus' },
];

async function main() {
  console.log('Seeding enterprise master data for TI-ERP (Milestone 8 V1.0)...');

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
        multiBranch: true,
      },
      amcExpiryDate: new Date('2028-12-31'),
      isActive: true,
    },
  });

  // 2. Master Tenant: TI Supermarket Enterprise
  const tenant = await prisma.tenant.upsert({
    where: { code: 'TI_CORP' },
    update: {
      name: 'TI Supermarket Enterprise',
      topology: TopologyModeEnum.MULTI_BRANCH,
    },
    create: {
      licenseId: license.id,
      code: 'TI_CORP',
      name: 'TI Supermarket Enterprise',
      legalTradeName: 'TI Supermarkets India Private Limited',
      primaryContact: '+91 9876543210',
      email: 'admin@tierp.local',
      gstRegime: GstRegimeEnum.REGULAR,
      topology: TopologyModeEnum.MULTI_BRANCH,
    },
  });

  // 3. Branches: Main Supermarket (Tirupur) & Central Warehouse (HO)
  const mainBranch = await prisma.branch.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'BR_MAIN',
      },
    },
    update: {
      name: 'Main Supermarket (Tirupur)',
      city: 'Tirupur',
    },
    create: {
      tenantId: tenant.id,
      code: 'BR_MAIN',
      name: 'Main Supermarket (Tirupur)',
      branchType: BranchTypeEnum.RETAIL_STORE,
      gstin: '33AAAAA0000A1Z5',
      address: '100 Feet Road, Avinashi Road',
      city: 'Tirupur',
      stateCode: '33',
      pincode: '641602',
      phone: '+91 421 2345678',
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
    update: {
      name: 'Central Warehouse (HO)',
      city: 'Tirupur',
    },
    create: {
      tenantId: tenant.id,
      code: 'BR_WH',
      name: 'Central Warehouse (HO)',
      branchType: BranchTypeEnum.WAREHOUSE,
      gstin: '33AAAAA0000A1Z5',
      address: 'Plot 45, SIPCOT Industrial Park',
      city: 'Tirupur',
      stateCode: '33',
      pincode: '641603',
      phone: '+91 421 9876543',
      regionalLanguage: 'ta-IN',
      localServerIp: '192.168.1.200',
    },
  });

  // 4. Physical Storage Bins per branch (including CONSIGNMENT)
  const binDefs = [
    { code: 'BIN_GODOWN', name: 'Backroom Central Godown', type: StorageBinTypeEnum.GODOWN, aisle: 'A1', rack: 'R01' },
    { code: 'BIN_SHOP_FLOOR', name: 'Main Retail Floor Gondolas', type: StorageBinTypeEnum.SHOP_FLOOR, aisle: 'F1', rack: 'R01' },
    { code: 'BIN_DAMAGED_RET', name: 'Damaged Goods (Vendor Return)', type: StorageBinTypeEnum.DAMAGED_RETURNABLE, aisle: 'D1', rack: 'R99' },
    { code: 'BIN_SCRAP', name: 'Damaged Scrap Write-off', type: StorageBinTypeEnum.DAMAGED_SCRAP, aisle: 'D2', rack: 'R99' },
    { code: 'BIN_CONSIGNMENT', name: 'Consignment Vendor Display', type: StorageBinTypeEnum.CONSIGNMENT, aisle: 'C1', rack: 'R10' },
  ];

  const binMap: Record<string, string> = {};
  for (const branch of [mainBranch, warehouseBranch]) {
    for (const b of binDefs) {
      const binCode = `${branch.code}_${b.code}`;
      const bin = await prisma.storageBin.upsert({
        where: {
          branchId_binCode: {
            branchId: branch.id,
            binCode,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          branchId: branch.id,
          binCode,
          binType: b.type,
          aisle: b.aisle,
          rack: b.rack,
          description: `${branch.name} - ${b.name}`,
        },
      });
      binMap[binCode] = bin.id;
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

  const cashierUser = await prisma.user.upsert({
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
      baseSalary: new Prisma.Decimal(18000),
      salesmanCommissionRate: new Prisma.Decimal(0.5),
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
  // Type 1: STANDARD_FMCG with Multi-Barcode Aliases & Multi-UOM Carton
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

  // Barcode aliases
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

  // Multi-UOM Carton Conversion (1 CARTON = 24 PACKs)
  await prisma.productUomConversion.upsert({
    where: { productId_uomName: { productId: pFmcg.id, uomName: 'CARTON' } },
    update: {},
    create: {
      tenantId: tenant.id,
      productId: pFmcg.id,
      uomName: 'CARTON',
      conversionFactor: new Prisma.Decimal(24),
      barcode: '8901719114138-CTN',
      retailPrice: new Prisma.Decimal(2600.0),
      wholesalePrice: new Prisma.Decimal(2400.0),
    },
  });

  // Type 2: WEIGHED_LOOSE (Produce with PLU '10001' / '201' for scale prefix barcode 2010001007505)
  const pLoose = await prisma.product.upsert({
    where: { tenantId_skuCode: { tenantId: tenant.id, skuCode: 'SKU-PROD-002' } },
    update: {
      shortPluCode: '10001',
    },
    create: {
      tenantId: tenant.id,
      skuCode: 'SKU-PROD-002',
      nameEn: 'Farm Fresh Potato',
      nameRegional: 'உருளைக்கிழங்கு',
      shortPluCode: '10001',
      categoryId: catGrocery.id,
      hsnId: hsnMap['0000'],
      productType: ProductTypeEnum.WEIGHED_LOOSE,
      baseUom: 'KG',
      batchTrackingMode: BatchTrackingModeEnum.AUTO_FEFO,
      negativeStockRule: NegativeStockRuleEnum.ALLOW,
    },
  });

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

  const existingBom = await prisma.comboBomItem.findFirst({
    where: { parentComboProductId: pCombo.id, childProductId: pFmcg.id },
  });
  if (!existingBom) {
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
  }

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
  const batchFmcg = await prisma.inventoryBatch.upsert({
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
      mrp: new Prisma.Decimal(120.0),
      purchaseRate: new Prisma.Decimal(90.0),
      netLandingCost: new Prisma.Decimal(95.0),
      retailSellingPrice: new Prisma.Decimal(110.0),
      wholesalePriceTier1: new Prisma.Decimal(102.0),
      wholesalePriceTier2: new Prisma.Decimal(98.0),
    },
  });

  const batchLoose = await prisma.inventoryBatch.upsert({
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
      mrp: new Prisma.Decimal(40.0),
      purchaseRate: new Prisma.Decimal(26.0),
      netLandingCost: new Prisma.Decimal(28.0),
      retailSellingPrice: new Prisma.Decimal(36.0),
    },
  });

  const batchBulkSack = await prisma.inventoryBatch.upsert({
    where: {
      branchId_productId_batchNumber: {
        branchId: mainBranch.id,
        productId: pBulkSack.id,
        batchNumber: 'B-RICE-SACK-01',
      },
    },
    update: {
      mrp: new Prisma.Decimal(52.0),
      purchaseRate: new Prisma.Decimal(40.0),
      netLandingCost: new Prisma.Decimal(42.0), // ₹42.00/kg (50kg sack = ₹2,100.00)
      retailSellingPrice: new Prisma.Decimal(49.0),
    },
    create: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      productId: pBulkSack.id,
      batchNumber: 'B-RICE-SACK-01',
      expiryDate: new Date('2027-10-01'),
      mrp: new Prisma.Decimal(52.0),
      purchaseRate: new Prisma.Decimal(40.0),
      netLandingCost: new Prisma.Decimal(42.0), // ₹42.00/kg (50kg sack = ₹2,100.00)
      retailSellingPrice: new Prisma.Decimal(49.0),
    },
  });

  // 12. Seed Bin Stock Balances for Immediate Testing
  const shopFloorBinId = binMap[`${mainBranch.code}_BIN_SHOP_FLOOR`];
  const godownBinId = binMap[`${mainBranch.code}_BIN_GODOWN`];

  if (shopFloorBinId) {
    await prisma.binStockBalance.upsert({
      where: {
        branchId_binId_batchId: {
          branchId: mainBranch.id,
          binId: shopFloorBinId,
          batchId: batchFmcg.id,
        },
      },
      update: { quantity: new Prisma.Decimal(100) },
      create: {
        tenantId: tenant.id,
        branchId: mainBranch.id,
        productId: pFmcg.id,
        binId: shopFloorBinId,
        batchId: batchFmcg.id,
        quantity: new Prisma.Decimal(100),
      },
    });

    await prisma.binStockBalance.upsert({
      where: {
        branchId_binId_batchId: {
          branchId: mainBranch.id,
          binId: shopFloorBinId,
          batchId: batchLoose.id,
        },
      },
      update: { quantity: new Prisma.Decimal(250) },
      create: {
        tenantId: tenant.id,
        branchId: mainBranch.id,
        productId: pLoose.id,
        binId: shopFloorBinId,
        batchId: batchLoose.id,
        quantity: new Prisma.Decimal(250),
      },
    });
  }

  if (godownBinId) {
    await prisma.binStockBalance.upsert({
      where: {
        branchId_binId_batchId: {
          branchId: mainBranch.id,
          binId: godownBinId,
          batchId: batchBulkSack.id,
        },
      },
      update: { quantity: new Prisma.Decimal(500) },
      create: {
        tenantId: tenant.id,
        branchId: mainBranch.id,
        productId: pBulkSack.id,
        binId: godownBinId,
        batchId: batchBulkSack.id,
        quantity: new Prisma.Decimal(500),
      },
    });
  }

  // 13. Standard Indian Chart of Accounts (COA)
  const uniqueGroups = Array.from(
    new Map(
      STANDARD_CHART_OF_ACCOUNTS.map((a) => [
        `${a.groupName}_${a.groupType}`,
        { groupName: a.groupName, groupType: a.groupType },
      ]),
    ).values(),
  );

  const groupMap = new Map<string, string>();
  for (const g of uniqueGroups) {
    const group = await prisma.accountGroup.upsert({
      where: {
        tenantId_groupName: {
          tenantId: tenant.id,
          groupName: g.groupName,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        groupName: g.groupName,
        groupType: g.groupType,
      },
    });
    groupMap.set(g.groupName, group.id);
  }

  for (const acc of STANDARD_CHART_OF_ACCOUNTS) {
    const groupId = groupMap.get(acc.groupName);
    if (!groupId) continue;

    await prisma.ledgerAccount.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: acc.code,
        },
      },
      update: {
        accountName: acc.name,
      },
      create: {
        tenantId: tenant.id,
        code: acc.code,
        accountName: acc.name,
        groupId,
        openingBalance: new Prisma.Decimal(0),
        currentBalance: new Prisma.Decimal(0),
      },
    });
  }

  // 14. Sample Suppliers
  await prisma.supplier.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SUPP_SOUTHERN' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'SUPP_SOUTHERN',
      name: 'Southern FMCG Distributors',
      legalTradeName: 'Southern FMCG Wholesale Pvt Ltd',
      gstin: '33ABCDE1234F1Z5',
      phone: '+91 98401 22334',
      email: 'orders@southernfmcg.com',
      paymentTermsDays: 30,
      creditLimit: new Prisma.Decimal(500000),
      outstandingBalance: new Prisma.Decimal(45000),
    },
  });

  await prisma.supplier.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SUPP_MEENAKSHI' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'SUPP_MEENAKSHI',
      name: 'Sri Meenakshi Traders',
      legalTradeName: 'Sri Meenakshi Agro Traders',
      gstin: '33XYZAB9876C1Z2',
      phone: '+91 94432 55667',
      paymentTermsDays: 15,
      creditLimit: new Prisma.Decimal(200000),
      outstandingBalance: new Prisma.Decimal(14280),
    },
  });

  // 15. Sample Customers (Silver and Gold Tier)
  await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: '9876543210' } },
    update: {},
    create: {
      tenantId: tenant.id,
      phone: '9876543210',
      name: 'Senthil Kumar',
      email: 'senthil@gmail.com',
      loyaltyTier: LoyaltyTierEnum.SILVER,
      loyaltyPointsBalance: new Prisma.Decimal(150),
      khataCreditLimit: new Prisma.Decimal(10000),
      khataCurrentBalance: new Prisma.Decimal(1250),
      rationCycleDayStart: 1,
    },
  });

  await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: '9841099887' } },
    update: {},
    create: {
      tenantId: tenant.id,
      phone: '9841099887',
      name: 'Lakshmi Narayanan',
      email: 'lakshmi@yahoo.com',
      loyaltyTier: LoyaltyTierEnum.GOLD,
      loyaltyPointsBalance: new Prisma.Decimal(850),
      khataCreditLimit: new Prisma.Decimal(25000),
      khataCurrentBalance: new Prisma.Decimal(0),
      rationCycleDayStart: 5,
    },
  });

  // 16. Active Promotion Rules
  const existingPromo = await prisma.promotionRule.findFirst({
    where: { tenantId: tenant.id, name: 'Weekend Super Saver — Flat ₹100 Off on ₹1,000+' },
  });

  if (!existingPromo) {
    const now = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(now.getFullYear() + 1);

    await prisma.promotionRule.create({
      data: {
        tenantId: tenant.id,
        name: 'Weekend Super Saver — Flat ₹100 Off on ₹1,000+',
        promoType: PromotionTypeEnum.CART_SLAB_UPSELL,
        startDate: now,
        endDate: nextYear,
        priority: 10,
        conditionConfig: {
          minCartTotal: 1000,
        },
        rewardConfig: {
          discountAmount: 100,
        },
        isActive: true,
      },
    });
  }

  console.log('✓ Master seed complete successfully across all 16 domains!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
