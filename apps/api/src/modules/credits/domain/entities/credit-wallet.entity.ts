import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export interface CreditWallet extends BaseTenantEntity {
  /** null = unlimited (Enterprise plan). */
  balance: number | null;
  cycleStartAt: Date | null;
  cycleEndAt: Date | null;
}
