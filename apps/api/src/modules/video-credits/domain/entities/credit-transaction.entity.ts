import { BaseEntity } from '@shared/domain/base.entity';

export enum CreditTransactionType {
  /** Period allowance added to the wallet. */
  GRANT = 'grant',
  /** Credits held before a vendor call. Increases reservedCredits. */
  RESERVE = 'reserve',
  /** Reservation settled. Moves credits from reserved to consumed. */
  COMMIT = 'commit',
  /** Reservation released without charge, e.g. the generation failed. */
  REFUND = 'refund',
  /** Unused allowance removed at period end. */
  EXPIRE = 'expire',
}

/**
 * Append-only ledger. Rows are never updated or deleted; wallet counters are a
 * denormalised projection of this table, which is what makes the balance
 * auditable and reconstructable after an incident.
 */
export interface VideoCreditTransaction extends BaseEntity {
  walletId: string;
  organizationId: string;
  type: CreditTransactionType;
  /** Always positive. The type determines which counter it moves. */
  credits: number;
  /** Correlates RESERVE with its later COMMIT or REFUND. Null for GRANT/EXPIRE. */
  reservationId: string | null;
  /** What the credits were spent on, e.g. 'video.omni-session'. */
  feature: string | null;
  modelId: string | null;
  /** Vendor spend this row represents, kept for margin reporting. */
  vendorCostUsd: string | null;
  reason: string | null;
}
