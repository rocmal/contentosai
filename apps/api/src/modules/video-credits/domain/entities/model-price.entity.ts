import { BaseEntity } from '@shared/domain/base.entity';

export enum PricedUnit {
  PER_SECOND = 'per_second',
  PER_IMAGE = 'per_image',
  PER_1K_TOKENS = 'per_1k_tokens',
}

/**
 * The price book, stored as data rather than compiled into the calculator.
 * Vendors change rates without notice, so repricing must be a row insert with
 * a new effectiveFrom - never a deploy. Rows are immutable; a change is a new
 * row and the previous one gets an effectiveTo.
 */
export interface ModelPrice extends BaseEntity {
  provider: string;
  modelId: string;
  unit: PricedUnit;
  /** DECIMAL held as string to avoid float drift on money. */
  unitCostUsd: string;
  /** Vendors bill a floor per request; below this, cost is charged as this. */
  minimumBillableUnits: number;
  /**
   * Share of requests that produce a usable result (0 < rate <= 1). Vendor
   * failures are not billed but still consume the attempt, so quoted credits
   * are divided by this to keep the margin honest.
   */
  expectedSuccessRate: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}
