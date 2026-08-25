import { ModelPrice, PricedUnit } from '../entities/model-price.entity';
import { TierPrice } from '../entities/tier-price.entity';
import { BillingUnit, GenerationMode, GenerationTier } from '../enums/generation.enums';
import {
  CREDIT_UNIT_USD,
  InvalidQuantityError,
  estimateVendorCost,
  isActive,
  marginOf,
  quoteCharge,
  quoteRefine,
} from './credit-calculator';

const base = {
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  createdBy: null,
  updatedBy: null,
  version: 0,
};

function modelPrice(overrides: Partial<ModelPrice> = {}): ModelPrice {
  return {
    id: 'p-1',
    provider: 'gemini-omni',
    modelId: 'gemini-omni-flash-preview',
    unit: PricedUnit.PER_SECOND,
    unitCostUsd: '0.101400',
    minimumBillableUnits: 3,
    expectedSuccessRate: '0.926',
    effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    effectiveTo: null,
    ...base,
    ...overrides,
  };
}

function tierPrice(overrides: Partial<TierPrice> = {}): TierPrice {
  return {
    id: 't-1',
    tier: GenerationTier.FAST,
    mode: GenerationMode.TEXT_TO_VIDEO,
    unit: BillingUnit.PER_SECOND,
    creditsPerUnit: 25,
    minimumBillableUnits: 3,
    effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    effectiveTo: null,
    ...base,
    ...overrides,
  };
}

describe('quoteCharge', () => {
  it('charges the published tier rate for an 8-second Fast clip', () => {
    expect(quoteCharge(tierPrice(), 8).credits).toBe(200);
  });

  it('keeps a Pro subscriber above fifty Fast clips per period', () => {
    // Sanity check on plan economics: 10,000 credits must not collapse to a
    // handful of clips, or the plan is mispriced rather than the model.
    const perClip = quoteCharge(tierPrice(), 8).credits;

    expect(Math.floor(10_000 / perClip)).toBeGreaterThanOrEqual(50);
  });

  it('applies the tier minimum to very short requests', () => {
    expect(quoteCharge(tierPrice(), 1).billableUnits).toBe(3);
    expect(quoteCharge(tierPrice(), 1).credits).toBe(75);
  });

  it('prices Economy well below Studio for the same clip', () => {
    const economy = quoteCharge(
      tierPrice({ tier: GenerationTier.ECONOMY, creditsPerUnit: 12 }),
      8,
    ).credits;
    const studio = quoteCharge(
      tierPrice({ tier: GenerationTier.STUDIO, creditsPerUnit: 120 }),
      8,
    ).credits;

    expect(economy).toBe(96);
    expect(studio).toBe(960);
  });

  it('charges a refine turn the same as a first generation', () => {
    // The vendor gives no discount for reusing server-side conversation state.
    expect(quoteRefine(tierPrice(), 8).credits).toBe(quoteCharge(tierPrice(), 8).credits);
  });

  it('rejects a non-positive quantity', () => {
    expect(() => quoteCharge(tierPrice(), 0)).toThrow(InvalidQuantityError);
    expect(() => quoteCharge(tierPrice(), -4)).toThrow(InvalidQuantityError);
  });
});

describe('estimateVendorCost', () => {
  it('computes risk-adjusted vendor spend for an 8-second Omni clip', () => {
    const cost = estimateVendorCost(modelPrice(), 8);

    // 8s x $0.1014 = $0.8112, / 0.926 success = $0.8760, / $0.0045 = 195 credits
    expect(cost.vendorCostUsd).toBeCloseTo(0.8112, 4);
    expect(cost.costCredits).toBe(195);
  });

  it('applies the vendor per-request floor', () => {
    expect(estimateVendorCost(modelPrice(), 2).billableUnits).toBe(3);
    expect(estimateVendorCost(modelPrice(), 4).billableUnits).toBe(4);
  });

  it('inflates cost by the failure rate so margin survives retries', () => {
    const reliable = estimateVendorCost(modelPrice({ expectedSuccessRate: '1' }), 8);
    const flaky = estimateVendorCost(modelPrice({ expectedSuccessRate: '0.5' }), 8);

    expect(flaky.costCredits).toBeGreaterThan(reliable.costCredits);
    expect(flaky.riskAdjustedCostUsd).toBeCloseTo(reliable.vendorCostUsd * 2, 4);
  });

  it('rejects an out-of-range success rate', () => {
    expect(() => estimateVendorCost(modelPrice({ expectedSuccessRate: '0' }), 8)).toThrow(
      InvalidQuantityError,
    );
    expect(() => estimateVendorCost(modelPrice({ expectedSuccessRate: '1.4' }), 8)).toThrow(
      InvalidQuantityError,
    );
  });

  it('pegs one credit to the documented vendor spend', () => {
    expect(CREDIT_UNIT_USD).toBeCloseTo(0.0045, 6);
  });
});

describe('marginOf', () => {
  it('flags a thin margin without failing', () => {
    const report = marginOf(quoteCharge(tierPrice(), 8), estimateVendorCost(modelPrice(), 8));

    expect(report.chargedCredits).toBe(200);
    expect(report.costCredits).toBe(195);
    expect(report.belowFloor).toBe(true);
  });

  it('reports a healthy margin when vendor cost is well under the charge', () => {
    // Synthetic vendor cost, not the real seeded wan-2.5 price: at the actual
    // seeded Economy-tier numbers (12 credits/s vs wan-2.5's $0.05/s @ 95%
    // success) the margin is ~2%, same as the Fast-tier case above - both are
    // below MARGIN_ALERT_FLOOR today. This case exists to exercise the
    // healthy-margin branch of marginOf() itself.
    const charge = quoteCharge(tierPrice({ creditsPerUnit: 12 }), 8);
    const cost = estimateVendorCost(
      modelPrice({
        modelId: 'hypothetical-cheap-model',
        unitCostUsd: '0.010000',
        minimumBillableUnits: 1,
        expectedSuccessRate: '0.95',
      }),
      8,
    );
    const report = marginOf(charge, cost);

    expect(report.marginRatio).toBeGreaterThan(0);
    expect(report.belowFloor).toBe(false);
  });

  it('returns a negative ratio when a route is loss-making', () => {
    const charge = quoteCharge(tierPrice({ creditsPerUnit: 1 }), 8);
    const report = marginOf(charge, estimateVendorCost(modelPrice(), 8));

    expect(report.marginRatio).toBeLessThan(0);
  });
});

describe('isActive', () => {
  const at = new Date('2026-06-01T00:00:00Z');

  it('accepts an open-ended window that has started', () => {
    expect(isActive(modelPrice(), at)).toBe(true);
  });

  it('rejects a window that has not started yet', () => {
    expect(isActive(modelPrice({ effectiveFrom: new Date('2026-09-01T00:00:00Z') }), at)).toBe(
      false,
    );
  });

  it('rejects a superseded window', () => {
    expect(isActive(modelPrice({ effectiveTo: new Date('2026-05-01T00:00:00Z') }), at)).toBe(false);
  });
});
