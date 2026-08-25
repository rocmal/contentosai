import { ModelPrice } from '../entities/model-price.entity';
import { TierPrice } from '../entities/tier-price.entity';
import { BillingUnit, GenerationMode, GenerationTier } from '../enums/generation.enums';

/**
 * How many US dollars of vendor spend one Lumora credit is allowed to buy.
 *
 * Derived from the Pro plan, the binding constraint: $149 for 10,000 credits is
 * $0.0149 of revenue per credit. At a 70% target gross margin on AI cost of
 * goods, a credit may buy $0.0149 x 0.30 = $0.00447, rounded down.
 *
 * Starter ($49 / 2,500 = $0.0196 per credit) is more forgiving, so pegging to
 * Pro keeps every plan at or above target. Changing this reprices every feature
 * at once; it is a business decision, not a tuning knob.
 */
export const CREDIT_UNIT_USD = 0.0045;

/**
 * Below this, routing still succeeds but ops is alerted. A user request is
 * never failed for a margin reason - that would be punishing the customer for
 * a pricing mistake of ours.
 */
export const MARGIN_ALERT_FLOOR = 0.4;

export class InvalidQuantityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidQuantityError';
  }
}

export interface ChargeQuote {
  readonly tier: GenerationTier;
  readonly mode: GenerationMode;
  readonly unit: BillingUnit;
  readonly billableUnits: number;
  readonly credits: number;
}

export interface VendorCostEstimate {
  readonly modelId: string;
  readonly provider: string;
  readonly billableUnits: number;
  readonly vendorCostUsd: number;
  /** Vendor spend adjusted for the share of attempts that fail. */
  readonly riskAdjustedCostUsd: number;
  /** The same spend expressed in credits, for margin comparison. */
  readonly costCredits: number;
}

export interface MarginReport {
  readonly chargedCredits: number;
  readonly costCredits: number;
  /** 0.7 means 70% of the charge is margin. Negative means loss-making. */
  readonly marginRatio: number;
  readonly belowFloor: boolean;
}

/**
 * What the user pays. Reads only the published rate card, never vendor cost -
 * this is the whole point of the tier layer.
 */
export function quoteCharge(price: TierPrice, quantity: number): ChargeQuote {
  assertQuantity(quantity);
  const billableUnits = Math.max(quantity, price.minimumBillableUnits);

  return {
    tier: price.tier,
    mode: price.mode,
    unit: price.unit,
    billableUnits,
    // Ceil so a fractional charge can never round down to a free generation.
    credits: Math.ceil(billableUnits * price.creditsPerUnit),
  };
}

/** What it costs us. Internal only; never returned to a client. */
export function estimateVendorCost(price: ModelPrice, quantity: number): VendorCostEstimate {
  assertQuantity(quantity);

  const successRate = Number(price.expectedSuccessRate);
  if (!(successRate > 0) || successRate > 1) {
    throw new InvalidQuantityError(
      `expectedSuccessRate for "${price.modelId}" must be in (0, 1], received ${price.expectedSuccessRate}`,
    );
  }

  const billableUnits = Math.max(quantity, price.minimumBillableUnits);
  const vendorCostUsd = billableUnits * Number(price.unitCostUsd);
  const riskAdjustedCostUsd = vendorCostUsd / successRate;

  return {
    modelId: price.modelId,
    provider: price.provider,
    billableUnits,
    vendorCostUsd: round(vendorCostUsd, 6),
    riskAdjustedCostUsd: round(riskAdjustedCostUsd, 6),
    costCredits: Math.ceil(riskAdjustedCostUsd / CREDIT_UNIT_USD),
  };
}

export function marginOf(charge: ChargeQuote, cost: VendorCostEstimate): MarginReport {
  const marginRatio =
    charge.credits === 0 ? 0 : (charge.credits - cost.costCredits) / charge.credits;

  return {
    chargedCredits: charge.credits,
    costCredits: cost.costCredits,
    marginRatio: round(marginRatio, 4),
    belowFloor: marginRatio < MARGIN_ALERT_FLOOR,
  };
}

/**
 * A conversational refine turn is a full generation at full vendor price - no
 * discount is given for reusing server-side state. The saving from the refine
 * loop is fewer rejected generations, not cheaper calls, so refines are charged
 * identically to a first generation.
 */
export function quoteRefine(price: TierPrice, quantity: number): ChargeQuote {
  return quoteCharge(price, quantity);
}

export function isActive(
  window: { effectiveFrom: Date; effectiveTo: Date | null },
  at: Date,
): boolean {
  if (window.effectiveFrom.getTime() > at.getTime()) {
    return false;
  }
  return window.effectiveTo === null || window.effectiveTo.getTime() > at.getTime();
}

function assertQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new InvalidQuantityError(`Quantity must be a positive number, received ${quantity}`);
  }
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
