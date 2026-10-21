import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export interface CreditWallet extends BaseTenantEntity {
  /** null = unlimited (Enterprise plan). */
  balance: number | null;
  cycleStartAt: Date | null;
  cycleEndAt: Date | null;
  /** Set while the paid plan has lapsed: the credits are kept but cannot be spent until the plan is renewed. */
  pausedAt: Date | null;
}
