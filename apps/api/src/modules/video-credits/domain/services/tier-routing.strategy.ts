import { CatalogModel, servesMode, servesStyle } from '../entities/catalog-model.entity';
import { ModelPrice } from '../entities/model-price.entity';
import { TierPrice } from '../entities/tier-price.entity';
import { GenerationMode, GenerationTier, StylePreset } from '../enums/generation.enums';
import {
  ChargeQuote,
  MarginReport,
  VendorCostEstimate,
  estimateVendorCost,
  marginOf,
  quoteCharge,
} from './credit-calculator';

export interface RoutingIntent {
  readonly tier: GenerationTier;
  readonly mode: GenerationMode;
  readonly style: StylePreset;
  readonly quantity: number;
  /** Filters out models that cannot produce a clip this long. */
  readonly durationSeconds: number | null;
  readonly requiresNativeAudio: boolean;
  readonly requiresStatefulEditing: boolean;
}

export interface RoutableCandidate {
  readonly model: CatalogModel;
  readonly price: ModelPrice;
}

export interface RoutingDecision {
  readonly model: CatalogModel;
  readonly charge: ChargeQuote;
  readonly cost: VendorCostEstimate;
  readonly margin: MarginReport;
  /** Models that qualified but lost, cheapest-first. Useful for failover. */
  readonly alternates: readonly CatalogModel[];
}

export class NoEligibleModelError extends Error {
  constructor(intent: RoutingIntent) {
    super(
      `No enabled model serves tier="${intent.tier}" mode="${intent.mode}" style="${intent.style}"`,
    );
    this.name = 'NoEligibleModelError';
  }
}

export interface ITierRouter {
  resolve(
    intent: RoutingIntent,
    tierPrice: TierPrice,
    candidates: readonly RoutableCandidate[],
  ): RoutingDecision;
}

export const TIER_ROUTER = Symbol('TIER_ROUTER');

/**
 * Picks the cheapest model that satisfies the intent, then reports the margin
 * against the published tier price.
 *
 * The decision is cost-first because within a tier every candidate is, by
 * definition, acceptable quality - that is what putting it in the tier means.
 * Margin never vetoes: a loss-making route still serves the user and raises a
 * flag instead, because failing a paid request to protect our own margin is
 * our pricing error landing on the customer.
 */
export class CheapestEligibleTierRouter implements ITierRouter {
  resolve(
    intent: RoutingIntent,
    tierPrice: TierPrice,
    candidates: readonly RoutableCandidate[],
  ): RoutingDecision {
    const eligible = candidates
      .filter(({ model }) => model.isEnabled)
      .filter(({ model }) => model.tier === intent.tier)
      .filter(({ model }) => servesMode(model, intent.mode))
      .filter(({ model }) => servesStyle(model, intent.style))
      .filter(({ model }) => this.satisfiesDuration(model, intent))
      .filter(({ model }) => !intent.requiresNativeAudio || model.supportsNativeAudio)
      .filter(({ model }) => !intent.requiresStatefulEditing || model.supportsStatefulEditing)
      .map((candidate) => ({
        candidate,
        cost: estimateVendorCost(candidate.price, intent.quantity),
      }))
      .sort((a, b) => {
        const byCost = a.cost.riskAdjustedCostUsd - b.cost.riskAdjustedCostUsd;
        return byCost !== 0 ? byCost : b.candidate.model.priority - a.candidate.model.priority;
      });

    const winner = eligible[0];
    if (!winner) {
      throw new NoEligibleModelError(intent);
    }

    const charge = quoteCharge(tierPrice, intent.quantity);

    return {
      model: winner.candidate.model,
      charge,
      cost: winner.cost,
      margin: marginOf(charge, winner.cost),
      alternates: eligible.slice(1).map((entry) => entry.candidate.model),
    };
  }

  private satisfiesDuration(model: CatalogModel, intent: RoutingIntent): boolean {
    if (intent.durationSeconds === null || model.maxDurationSeconds === null) {
      return true;
    }
    return model.maxDurationSeconds >= intent.durationSeconds;
  }
}
