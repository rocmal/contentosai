import { BaseEntity } from '@shared/domain/base.entity';
import { BillingUnit, GenerationMode, GenerationTier } from '../enums/generation.enums';

/**
 * The published rate card - what a user is actually charged.
 *
 * This is the layer that makes the tier abstraction hold. If credits were
 * quoted from ModelPrice, then swapping Fast from one vendor to another would
 * silently change what the same action costs, with no explanation the user
 * could see. Quoting from the tier decouples the two: vendor cost moves,
 * published price does not, and the difference is margin we monitor rather
 * than a number the customer experiences.
 */
export interface TierPrice extends BaseEntity {
  tier: GenerationTier;
  mode: GenerationMode;
  unit: BillingUnit;
  /** Whole credits charged per billable unit. */
  creditsPerUnit: number;
  minimumBillableUnits: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}
