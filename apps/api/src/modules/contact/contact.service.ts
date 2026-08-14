import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMailer, MAILER } from '@shared/mail/mailer.interface';
import { CreateSalesInquiryDto } from './dto/create-sales-inquiry.dto';

const SALES_INBOX = 'sales@lumoraos.in';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Enterprise "Contact Sales" inquiries - sent straight to the sales inbox via
 * the existing mailer rather than persisted, since this is a one-off lead
 * capture with no in-app follow-up flow yet (no CRM/leads table exists).
 * That also means there is NO fallback if SMTP isn't configured - unlike
 * password-reset/verification emails (where a user can just retry), a lost
 * sales lead here is invisible unless this fails loudly, so this
 * deliberately errors instead of the mailer's normal silent no-op. */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(MAILER) private readonly mailer: IMailer,
    private readonly configService: ConfigService,
  ) {}

  async submitSalesInquiry(dto: CreateSalesInquiryDto): Promise<void> {
    if (!this.configService.get<string>('mail.host')) {
      this.logger.error(
        `Dropped sales inquiry from ${dto.workEmail} (${dto.companyName}) - SMTP_HOST is not configured, cannot deliver.`,
      );
      throw new ServiceUnavailableException(
        'Sales inquiries are temporarily unavailable. Please email sales@lumoraos.in directly.',
      );
    }

    const rows = [
      ['Name', dto.fullName],
      ['Work email', dto.workEmail],
      ['Company', dto.companyName],
      ['Company size', dto.companySize],
      ['Phone', dto.phone || '-'],
    ]
      .map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">${label}</td><td>${escapeHtml(value)}</td></tr>`)
      .join('');

    await this.mailer.send({
      to: SALES_INBOX,
      subject: `Enterprise inquiry: ${dto.companyName}`,
      html: `
        <table>${rows}</table>
        <p style="margin-top:16px;color:#64748b;">Message</p>
        <p>${escapeHtml(dto.message).replace(/\n/g, '<br/>')}</p>
      `,
    });

    // Best-effort confirmation to the submitter - a delivery failure here
    // shouldn't fail the whole request, the sales team already has the lead.
    try {
      await this.mailer.send({
        to: dto.workEmail,
        subject: "We've received your Lumora OS enterprise inquiry",
        html: `<p>Hi ${escapeHtml(dto.fullName)},</p><p>Thanks for reaching out about Lumora OS for ${escapeHtml(dto.companyName)}. Our sales team will get back to you shortly.</p>`,
      });
    } catch {
      // Swallowed deliberately - see comment above.
    }
  }
}
