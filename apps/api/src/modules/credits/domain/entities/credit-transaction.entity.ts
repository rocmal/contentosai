import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum CreditTransactionReason {
  GENERATION_IMAGE = 'generation.image',
  GENERATION_VOICE = 'generation.voice',
  GENERATION_VIDEO = 'generation.video',
  GENERATION_CHARACTER = 'generation.character',
  PLAN_INITIAL_GRANT = 'plan.initial_grant',
  PLAN_MONTHLY_GRANT = 'plan.monthly_grant',
  REFUND = 'refund',
  ADMIN_ADJUSTMENT = 'admin.adjustment',
}

export interface CreditTransaction extends BaseTenantEntity {
  userId: string | null;
  /** Negative = consumed, positive = granted/refunded. */
  amount: number;
  reason: CreditTransactionReason;
  relatedEntityId: string | null;
  /** Wallet balance immediately after this transaction; null when the wallet is unlimited. */
  balanceAfter: number | null;
}
