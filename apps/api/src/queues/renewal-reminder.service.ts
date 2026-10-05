import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMailer, MAILER } from '@shared/mail/mailer.interface';
import { Subscription } from '@modules/billing/domain/entities/subscription.entity';
import { PLAN_PRICING_INR, isPurchasablePlan } from '@modules/billing/billing.constants';
import { SubscriptionsService } from '@modules/billing/application/services/subscriptions.service';
import { OrganizationsService } from '@modules/organizations/application/services/organizations.service';
import { UsersService } from '@modules/users/application/services/users.service';

const HOUR_MS = 60 * 60 * 1000;

export type ReminderStage = 3 | 1;

/**
 * Which reminder is due for a plan ending at `periodEnd`: "1" within the last
 * 24 hours, "3" within the last 72 hours, otherwise none. Already-ended
 * periods get none - the expiry notice covers those.
 */
export function reminderStageFor(periodEnd: Date, now: Date): ReminderStage | null {
  const msLeft = periodEnd.getTime() - now.getTime();
  if (msLeft <= 0) return null;
  if (msLeft <= 24 * HOUR_MS) return 1;
  if (msLeft <= 72 * HOUR_MS) return 3;
  return null;
}

/** True unless this exact reminder (or a later one) was already sent for this period. */
export function shouldSendReminder(subscription: Subscription, stage: ReminderStage): boolean {
  const sameWindow =
    subscription.renewalReminderPeriodEnd !== null &&
    subscription.currentPeriodEnd !== null &&
    subscription.renewalReminderPeriodEnd.getTime() === subscription.currentPeriodEnd.getTime();
  if (!sameWindow || subscription.renewalReminderStage === 0) return true;
  // Stages count down (3 then 1), so a smaller number is a later reminder.
  return stage < subscription.renewalReminderStage;
}

function planLabel(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** Emails the account owner before a self-serve plan lapses, and when it does. */
@Injectable()
export class RenewalReminderService {
  private readonly logger = new Logger(RenewalReminderService.name);

  constructor(
    @Inject(MAILER) private readonly mailer: IMailer,
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
  ) {}

  /** Sends the "plan ends soon" reminder if one is due and not yet sent. Never throws. */
  async remindIfDue(subscription: Subscription, now: Date): Promise<boolean> {
    if (!isPurchasablePlan(subscription.plan) || !subscription.currentPeriodEnd) return false;
    const stage = reminderStageFor(subscription.currentPeriodEnd, now);
    if (stage === null || !shouldSendReminder(subscription, stage)) return false;

    try {
      const email = await this.ownerEmail(subscription.organizationId);
      if (!email) return false;
      const daysText = stage === 1 ? 'tomorrow' : 'in 3 days';
      await this.mailer.send({
        to: email,
        subject: `Your Lumora ${planLabel(subscription.plan)} plan ends ${daysText}`,
        html: this.body(
          `Your <strong>${planLabel(subscription.plan)}</strong> plan ends on <strong>${formatDate(subscription.currentPeriodEnd)}</strong>.`,
          `Renew before then to keep your credits and keep generating without a break. Plans are paid month by month and do not renew automatically.`,
          subscription.plan,
        ),
      });
      await this.subscriptionsService.markRenewalReminderSent(subscription.id, subscription.currentPeriodEnd, stage);
      return true;
    } catch (err) {
      // Not marked as sent, so the next 6-hourly run tries again.
      this.logger.warn(`Renewal reminder failed for subscription ${subscription.id}: ${(err as Error).message}`);
      return false;
    }
  }

  /** Tells the owner the plan has lapsed. Never throws. */
  async notifyExpired(subscription: Subscription): Promise<void> {
    try {
      const email = await this.ownerEmail(subscription.organizationId);
      if (!email) return;
      await this.mailer.send({
        to: email,
        subject: `Your Lumora ${planLabel(subscription.plan)} plan has ended`,
        html: this.body(
          `Your <strong>${planLabel(subscription.plan)}</strong> plan has ended and your remaining credits were removed.`,
          `Renew from Billing to start generating again. Your Brand Brain, projects and saved content are untouched.`,
          subscription.plan,
        ),
      });
    } catch (err) {
      this.logger.warn(`Expiry notice failed for subscription ${subscription.id}: ${(err as Error).message}`);
    }
  }

  private async ownerEmail(organizationId: string): Promise<string | null> {
    const organization = await this.organizationsService.findById(organizationId);
    const owner = await this.usersService.findEntityById(organization.ownerId);
    return owner.email ?? null;
  }

  private body(headline: string, detail: string, plan: string): string {
    const appUrl = this.configService.get<string>('app.url') ?? '';
    const price = isPurchasablePlan(plan) ? ` (₹${PLAN_PRICING_INR[plan].toLocaleString('en-IN')} / month)` : '';
    return [
      `<p>${headline}</p>`,
      `<p>${detail}</p>`,
      `<p><a href="${appUrl}">Open Lumora</a> and go to Billing to renew${price}.</p>`,
      `<p style="color:#64748b;font-size:12px">You are receiving this because you own this Lumora workspace.</p>`,
    ].join('');
  }
}
