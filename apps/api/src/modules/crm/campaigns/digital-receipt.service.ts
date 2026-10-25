import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerFeedbackDto } from './campaigns.dto';
import { Decimal } from '@ti-erp/database';

@Injectable()
export class DigitalReceiptService {
  // In-memory feedback store for ratings and manager alerts
  private readonly feedbackStore: {
    invoiceId: string;
    rating: number;
    comments?: string;
    createdAt: Date;
    managerAlert: boolean;
  }[] = [];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Format Paperless Digital Bill for WhatsApp / SMS Dispatch
   */
  async sendDigitalReceipt(tenantId: string, invoiceId: string, phoneOverride?: string) {
    const invoice = await this.prisma.posInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        branch: true,
        customer: true,
        lines: { include: { product: true } },
        payments: true,
      },
    });

    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);

    const recipientPhone = phoneOverride || invoice.customer?.phone;
    if (!recipientPhone) {
      throw new BadRequestException('Recipient mobile number not available on invoice or customer profile');
    }

    const totalSavings = invoice.totalDiscountAmount.add(
      invoice.lines.reduce((acc, l) => {
        const itemSave = l.mrp.sub(l.sellingPrice).mul(l.quantity);
        return itemSave.greaterThan(0) ? acc.add(itemSave) : acc;
      }, new Decimal(0)),
    );

    const feedbackUrl = `https://tierp.store/feedback?inv=${invoice.id}&phone=${recipientPhone}`;

    const itemsText = invoice.lines
      .slice(0, 10)
      .map(
        (l) =>
          `• ${l.product.nameEn} x ${l.quantity} = ₹${l.lineTotal.toFixed(2)}${
            l.mrp.greaterThan(l.sellingPrice) ? ` (MRP ₹${l.mrp.toFixed(2)})` : ''
          }`,
      )
      .join('\n');

    const whatsappMessage = `*🧾 DIGITAL BILL — ${invoice.branch.name.toUpperCase()}*\nInvoice: ${
      invoice.invoiceNumber
    }\nDate: ${invoice.createdAt.toISOString().slice(0, 10)}\n\n${itemsText}${
      invoice.lines.length > 10 ? `\n...and ${invoice.lines.length - 10} more items` : ''
    }\n\n*Total Amount:* ₹${invoice.netPayable.toFixed(
      2,
    )}\n*🎉 YOU SAVED TODAY:* ₹${totalSavings.toFixed(
      2,
    )}\n\nHow was your shopping experience? Rate us (1-5★):\n${feedbackUrl}\n\nThank you for shopping green & paperless with us!`;

    const encodedMsg = encodeURIComponent(whatsappMessage);
    const whatsappWebLink = `https://wa.me/91${recipientPhone}?text=${encodedMsg}`;

    return {
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      recipientPhone,
      totalAmount: Number(invoice.netPayable),
      totalSavings: Number(totalSavings),
      whatsappMessage,
      whatsappWebLink,
      feedbackUrl,
      dispatchedAt: new Date(),
    };
  }

  /**
   * Record Customer 1–5 Star Rating & Manager Low-Rating Alert Hook
   */
  async recordCustomerFeedback(dto: CustomerFeedbackDto) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5 stars');
    }

    const isLowRating = dto.rating <= 3;
    const entry = {
      invoiceId: dto.invoiceId,
      rating: dto.rating,
      comments: dto.comments,
      createdAt: new Date(),
      managerAlert: isLowRating,
    };

    this.feedbackStore.push(entry);

    return {
      success: true,
      invoiceId: dto.invoiceId,
      rating: dto.rating,
      managerAlertTriggered: isLowRating,
      alertMessage: isLowRating
        ? `⚠️ MANAGER ALERT: Customer submitted low rating (${dto.rating}★) for Invoice ${dto.invoiceId}. Reason: "${dto.comments || 'No comment provided'}"`
        : 'Thank you for your 5-star positive review!',
    };
  }

  /**
   * List Recent Customer Feedbacks & Active Alerts
   */
  async getRecentFeedbacks() {
    return this.feedbackStore.slice(-50).reverse();
  }
}
