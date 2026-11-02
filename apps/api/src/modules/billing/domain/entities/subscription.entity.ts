import { BaseEntity } from '@shared/domain/base.entity';
import { BILLING_PERIOD_DAYS } from '@modules/credits/credits.constants';

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
}

export interface Subscription extends BaseEntity {
  organizationId: string;
  plan: string;
  status: SubscriptionStatus;
  /** Payment gateway that owns this subscription, e.g. 'razorpay' - see
   * PaymentProviderFactory. Null until a real checkout has run. */
  gatewayProvider: string | null;
  gatewayCustomerId: string | null;
  gatewaySubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  /** Period end the last renewal reminder was sent for (see RenewalReminderService). */
  renewalReminderPeriodEnd: Date | null;
  /** Days-before-expiry of the last reminder sent for that period: 3, 1, or 0 for none. */
  renewalReminderStage: number;
  /** 30-day periods already given after the current one (a platform admin can give several months at once). The
   * renewal job starts the next one - with fresh credits - while any are left, instead of letting the plan lapse. */
  prepaidPeriods: number;
}

/** The last day of access: the current period plus the periods already given after it. */
export function accessUntil(
  subscription: Pick<Subscription, 'currentPeriodEnd' | 'prepaidPeriods'>,
): Date | null {
  if (!subscription.currentPeriodEnd) return null;
  return new Date(
    subscription.currentPeriodEnd.getTime() +
      subscription.prepaidPeriods * BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );
}
