import { PrismaClient, TopologyModeEnum, GstRegimeEnum, BranchTypeEnum, StorageBinTypeEnum, AccountTypeEnum } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding enterprise master data for TI-ERP...');

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

  // 3. Master Branch
  const branch = await prisma.branch.upsert({
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

  // 4. Physical Storage Bins
  const bins = [
    { code: 'BIN_GODOWN', name: 'Backroom Central Godown', type: StorageBinTypeEnum.GODOWN, aisle: 'A1', rack: 'R01' },
    { code: 'BIN_SHOP_FLOOR', name: 'Main Retail Floor Gondolas', type: StorageBinTypeEnum.SHOP_FLOOR, aisle: 'F1', rack: 'R01' },
    { code: 'BIN_DAMAGED_RET', name: 'Damaged Goods (Vendor Return)', type: StorageBinTypeEnum.DAMAGED_RETURNABLE, aisle: 'D1', rack: 'R99' },
    { code: 'BIN_SCRAP', name: 'Damaged Scrap Write-off', type: StorageBinTypeEnum.DAMAGED_SCRAP, aisle: 'D2', rack: 'R99' },
  ];

  for (const b of bins) {
    await prisma.storageBin.upsert({
      where: {
        branchId_binCode: {
          branchId: branch.id,
          binCode: b.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        binCode: b.code,
        binType: b.type,
        aisle: b.aisle,
        rack: b.rack,
        description: b.name,
      },
    });
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
      branchId: branch.id,
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
      branchId: branch.id,
      roleId: cashierRole.id,
      username: 'cashier1',
      passwordHash: 'argon2_mock_hash_cashier',
      fullName: 'Lead Cashier 1',
      salesmanCommissionRate: 0.5,
    },
  });

  // 7. Master POS Terminal
  await prisma.posTerminal.upsert({
    where: {
      branchId_terminalCode: {
        branchId: branch.id,
        terminalCode: 'POS-01',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      terminalCode: 'POS-01',
      printerIp: '192.168.1.200',
      scalePort: '/dev/ttyUSB0',
      edcTerminalId: 'TERM_POS_01',
      hardwareLocked: false,
    },
  });

  // 8. Standard GST HSN Master
  const hsnEntries = [
    { code: '0000', cgst: 0, sgst: 0, igst: 0, desc: 'Exempt Foodgrains / Fresh Produce' },
    { code: '1006', cgst: 2.5, sgst: 2.5, igst: 5.0, desc: 'Packaged Rice & Cereals (5% GST)' },
    { code: '0402', cgst: 6.0, sgst: 6.0, igst: 12.0, desc: 'Dairy, Butter & Cheese (12% GST)' },
    { code: '2106', cgst: 9.0, sgst: 9.0, igst: 18.0, desc: 'Branded FMCG & Packaged Snacks (18% GST)' },
    { code: '2202', cgst: 14.0, sgst: 14.0, igst: 28.0, desc: 'Aerated Drinks & Energy Drinks (28% GST)' },
  ];

  for (const h of hsnEntries) {
    await prisma.hsnTaxMaster.upsert({
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
  }

  // 9. Standard Chart of Accounts Groups
  const groupAssets = await prisma.accountGroup.upsert({
    where: { tenantId_groupName: { tenantId: tenant.id, groupName: 'Current Assets' } },
    update: {},
    create: { tenantId: tenant.id, groupName: 'Current Assets', groupType: AccountTypeEnum.ASSET },
  });

  const groupLiabilities = await prisma.accountGroup.upsert({
    where: { tenantId_groupName: { tenantId: tenant.id, groupName: 'Current Liabilities' } },
    update: {},
    create: { tenantId: tenant.id, groupName: 'Current Liabilities', groupType: AccountTypeEnum.LIABILITY },
  });

  const groupRevenue = await prisma.accountGroup.upsert({
    where: { tenantId_groupName: { tenantId: tenant.id, groupName: 'Operating Revenue' } },
    update: {},
    create: { tenantId: tenant.id, groupName: 'Operating Revenue', groupType: AccountTypeEnum.INCOME },
  });

  // 10. Ledger Accounts
  await prisma.ledgerAccount.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: '1001' } },
    update: {},
    create: { tenantId: tenant.id, groupId: groupAssets.id, code: '1001', accountName: 'Cash In Hand (Store Till)' },
  });

  await prisma.ledgerAccount.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: '1002' } },
    update: {},
    create: { tenantId: tenant.id, groupId: groupAssets.id, code: '1002', accountName: 'HDFC Bank Settlement Account' },
  });

  await prisma.ledgerAccount.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: '3001' } },
    update: {},
    create: { tenantId: tenant.id, groupId: groupRevenue.id, code: '3001', accountName: 'Retail POS Sales Account' },
  });

  await prisma.ledgerAccount.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: '2001' } },
    update: {},
    create: { tenantId: tenant.id, groupId: groupLiabilities.id, code: '2001', accountName: 'GST Output Liability' },
  });

  console.log('Master seed complete successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
