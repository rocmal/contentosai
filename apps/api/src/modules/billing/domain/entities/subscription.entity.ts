import { BaseEntity } from '@shared/domain/base.entity';

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
}
