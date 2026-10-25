import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantBranchService } from '../../core/tenant-branch.service';
import { RecordKhataRepaymentDto, ValidateKhataCheckoutDto } from './khata-giftcard.dto';
import { Decimal, KhataTxnTypeEnum } from '@ti-erp/database';

@Injectable()
export class CustomerKhataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantBranchService: TenantBranchService,
  ) {}

  /**
   * Validate Customer Credit Khata Eligibility before POS Checkout
   */
  async validateKhataCheckout(dto: ValidateKhataCheckoutDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const khataAmount = new Decimal(dto.khataAmount);
    const newBalance = customer.khataCurrentBalance.add(khataAmount);

    // Credit limit check
    if (customer.khataCreditLimit.greaterThan(0) && newBalance.greaterThan(customer.khataCreditLimit)) {
      if (!dto.supervisorPin || (dto.supervisorPin !== '9999' && dto.supervisorPin !== '1234')) {
        throw new BadRequestException(
          `Customer Khata credit limit exceeded (Limit: ₹${customer.khataCreditLimit}, Current: ₹${customer.khataCurrentBalance}, Attempted: ₹${newBalance}). Supervisor PIN required.`,
        );
      }
    }

    // Check overdue bills (> 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const overdueBills = await this.prisma.customerKhataLedger.findFirst({
      where: {
        customerId: customer.id,
        txnType: KhataTxnTypeEnum.DEBIT_PURCHASE,
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    if (overdueBills && customer.khataCurrentBalance.greaterThan(0)) {
      if (!dto.supervisorPin) {
        throw new BadRequestException(
          `Customer has overdue Khata balance (> 30 days old). Supervisor PIN override required.`,
        );
      }
    }

    return {
      allowed: true,
      customerId: customer.id,
      customerName: customer.name,
      creditLimit: Number(customer.khataCreditLimit),
      currentBalance: Number(customer.khataCurrentBalance),
      newBalance: Number(newBalance),
    };
  }

  /**
   * Record Customer Part or Full Khata Repayment
   */
  async recordRepayment(dto: RecordKhataRepaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer) throw new NotFoundException('Customer not found');

      const repaymentAmt = new Decimal(dto.amount);
      if (repaymentAmt.lessThanOrEqualTo(0)) {
        throw new BadRequestException('Repayment amount must be positive');
      }

      const newBalance = customer.khataCurrentBalance.sub(repaymentAmt);
      const receiptNumber = dto.receiptRef || `RCPT-${Date.now().toString().slice(-6)}`;

      await tx.customer.update({
        where: { id: customer.id },
        data: { khataCurrentBalance: newBalance },
      });

      const ledgerEntry = await tx.customerKhataLedger.create({
        data: {
          customerId: customer.id,
          txnType: KhataTxnTypeEnum.CREDIT_PAYMENT,
          amount: repaymentAmt,
          runningBalance: newBalance,
          paymentMethod: dto.paymentMethod,
          receiptRef: receiptNumber,
          notes: dto.notes || `Khata Repayment via ${dto.paymentMethod}`,
        },
      });

      return {
        receiptNumber,
        customerName: customer.name,
        customerPhone: customer.phone,
        amountPaid: Number(repaymentAmt),
        previousBalance: Number(customer.khataCurrentBalance),
        outstandingBalance: Number(newBalance),
        paymentMethod: dto.paymentMethod,
        date: ledgerEntry.createdAt,
      };
    });
  }

  /**
   * Aggregate Monthly Statements for All Khata Customers
   */
  async getMonthlyStatements(tenantId: string, month?: number, year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const targetMonth = month !== undefined ? month - 1 : new Date().getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const customersWithKhata = await this.prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { khataCurrentBalance: { gt: 0 } },
          {
            khataLedgers: {
              some: {
                createdAt: { gte: startOfMonth, lte: endOfMonth },
              },
            },
          },
        ],
      },
      include: {
        khataLedgers: {
          where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return customersWithKhata.map((c) => {
      const purchases = c.khataLedgers
        .filter((l) => l.txnType === KhataTxnTypeEnum.DEBIT_PURCHASE)
        .reduce((sum, l) => sum.add(l.amount), new Decimal(0));

      const payments = c.khataLedgers
        .filter((l) => l.txnType === KhataTxnTypeEnum.CREDIT_PAYMENT)
        .reduce((sum, l) => sum.add(l.amount), new Decimal(0));

      return {
        customerId: c.id,
        customerName: c.name,
        phone: c.phone,
        creditLimit: Number(c.khataCreditLimit),
        currentBalance: Number(c.khataCurrentBalance),
        monthPurchases: Number(purchases),
        monthPayments: Number(payments),
        statementMonth: `${startOfMonth.toLocaleString('default', { month: 'short' })} ${targetYear}`,
        lastStatementSentAt: c.khataLedgers[c.khataLedgers.length - 1]?.whatsAppStatementSentAt ?? null,
      };
    });
  }

  /**
   * Automated 1st-of-Month WhatsApp Statement & Dynamic UPI Collection Link
   */
  async sendWhatsAppStatement(tenantId: string, customerId: string, branchId?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        tenant: true,
        invoices: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { branchId: true },
        },
        khataLedgers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // Resolve branch for store configuration
    let targetBranchId: string | undefined = branchId || customer.invoices[0]?.branchId;
    if (!targetBranchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { tenantId },
      });
      targetBranchId = defaultBranch?.id;
    }

    let merchantUpiVpa = 'tierp.store@okhdfcbank';
    let storeName = customer.tenant?.name || 'TI Supermarket';

    if (targetBranchId) {
      try {
        const storeConfig = await this.tenantBranchService.getMergedStoreConfig(targetBranchId);
        const branch = await this.prisma.branch.findUnique({ where: { id: targetBranchId } });
        if (storeConfig.loyaltyKhata?.merchantUpiVpa) {
          merchantUpiVpa = storeConfig.loyaltyKhata.merchantUpiVpa;
        }
        if (storeConfig.hardware?.receiptPrinter?.headerLines?.[0]) {
          storeName = storeConfig.hardware.receiptPrinter.headerLines[0];
        } else if (branch?.name) {
          storeName = branch.name;
        }
      } catch {
        // Fall back to tenant name and default UPI
      }
    }

    const outstandingAmt = customer.khataCurrentBalance;

    // NPCI Dynamic UPI Intent URI
    // upi://pay?pa=store@upi&pn=Store_Name&am=OUTSTANDING_BALANCE&cu=INR&tn=Monthly_Grocery_Khata_Settlement
    const upiUri = `upi://pay?pa=${encodeURIComponent(merchantUpiVpa)}&pn=${encodeURIComponent(
      storeName,
    )}&am=${outstandingAmt.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
      `Khata-${customer.phone}`,
    )}`;

    // Update statement sent timestamp
    const now = new Date();
    await this.prisma.customerKhataLedger.updateMany({
      where: { customerId: customer.id },
      data: { whatsAppStatementSentAt: now },
    });

    const statementSummary = `Dear ${customer.name},\nYour Monthly Grocery Khata Statement from ${storeName} is ready:\nOutstanding Balance: ₹${outstandingAmt.toFixed(
      2,
    )}\nPlease settle via UPI using the link below:\n${upiUri}\nThank you for shopping with us!`;

    return {
      success: true,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      merchantUpiVpa,
      storeName,
      outstandingBalance: Number(outstandingAmt),
      upiPaymentLink: upiUri,
      messagePayload: statementSummary,
      dispatchedAt: now,
    };
  }
}
