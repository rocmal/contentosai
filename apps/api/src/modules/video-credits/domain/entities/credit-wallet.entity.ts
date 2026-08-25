import { BaseEntity } from '@shared/domain/base.entity';

/**
 * One wallet per organization per billing period. Balances are stored as three
 * separate counters rather than a single number so that money in flight
 * (reserved) is distinguishable from money spent (consumed) - a generation that
 * fails must return credits, and that is only possible if the two are tracked
 * apart.
 *
 *   available = grantedCredits - reservedCredits - consumedCredits
 */
export interface VideoCreditWallet extends BaseEntity {
  organizationId: string;
  /** Plan slug snapshotted at grant time; plan changes mid-period do not
   *  retroactively alter what was already granted. */
  plan: string;
  periodStart: Date;
  periodEnd: Date;
  grantedCredits: number;
  reservedCredits: number;
  consumedCredits: number;
}

export function availableCredits(wallet: VideoCreditWallet): number {
  return wallet.grantedCredits - wallet.reservedCredits - wallet.consumedCredits;
}
