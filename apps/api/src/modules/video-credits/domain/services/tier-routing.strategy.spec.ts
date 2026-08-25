import { CatalogModel } from '../entities/catalog-model.entity';
import { ModelPrice, PricedUnit } from '../entities/model-price.entity';
import { TierPrice } from '../entities/tier-price.entity';
import {
  BillingUnit,
  GenerationMode,
  GenerationTier,
  StylePreset,
} from '../enums/generation.enums';
import {
  CheapestEligibleTierRouter,
  NoEligibleModelError,
  RoutableCandidate,
  RoutingIntent,
} from './tier-routing.strategy';

const base = {
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  createdBy: null,
  updatedBy: null,
  version: 0,
};

function model(overrides: Partial<CatalogModel> = {}): CatalogModel {
  return {
    id: 'm-1',
    provider: 'gemini-omni',
    modelId: 'gemini-omni-flash-preview',
    displayName: 'Omni Flash',
    tier: GenerationTier.FAST,
    supportedModes: [GenerationMode.TEXT_TO_VIDEO, GenerationMode.IMAGE_TO_VIDEO],
    supportedStyles: [],
    maxDurationSeconds: 10,
    supportsNativeAudio: true,
    supportsStatefulEditing: true,
    isEnabled: true,
    priority: 100,
    notes: null,
    ...base,
    ...overrides,
  };
}

function price(overrides: Partial<ModelPrice> = {}): ModelPrice {
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

function intent(overrides: Partial<RoutingIntent> = {}): RoutingIntent {
  return {
    tier: GenerationTier.FAST,
    mode: GenerationMode.TEXT_TO_VIDEO,
    style: StylePreset.REALISTIC,
    quantity: 8,
    durationSeconds: 8,
    requiresNativeAudio: false,
    requiresStatefulEditing: false,
    ...overrides,
  };
}

describe('CheapestEligibleTierRouter', () => {
  const router = new CheapestEligibleTierRouter();

  const omni: RoutableCandidate = { model: model(), price: price() };
  const cheaper: RoutableCandidate = {
    model: model({ id: 'm-2', modelId: 'cheap-fast', provider: 'fal', priority: 10 }),
    price: price({ id: 'p-2', modelId: 'cheap-fast', provider: 'fal', unitCostUsd: '0.060000' }),
  };

  it('charges the published tier rate regardless of which model wins', () => {
    // The whole point of the tier layer: swapping the underlying model must
    // not move what the user is charged.
    const viaOmni = router.resolve(intent(), tierPrice(), [omni]);
    const viaCheaper = router.resolve(intent(), tierPrice(), [omni, cheaper]);

    expect(viaOmni.charge.credits).toBe(200);
    expect(viaCheaper.charge.credits).toBe(200);
    expect(viaCheaper.model.modelId).toBe('cheap-fast');
  });

  it('picks the cheapest eligible model and keeps the rest as alternates', () => {
    const decision = router.resolve(intent(), tierPrice(), [omni, cheaper]);

    expect(decision.model.modelId).toBe('cheap-fast');
    expect(decision.alternates.map((m) => m.modelId)).toEqual(['gemini-omni-flash-preview']);
  });

  it('reports margin against the published price', () => {
    const decision = router.resolve(intent(), tierPrice(), [omni]);

    expect(decision.margin.chargedCredits).toBe(200);
    expect(decision.margin.costCredits).toBe(195);
    expect(decision.margin.belowFloor).toBe(true);
  });

  it('never vetoes a loss-making route, it only flags it', () => {
    const expensive: RoutableCandidate = {
      model: model({ id: 'm-3', modelId: 'pricey' }),
      price: price({ id: 'p-3', modelId: 'pricey', unitCostUsd: '5.000000' }),
    };

    const decision = router.resolve(intent(), tierPrice(), [expensive]);

    expect(decision.margin.marginRatio).toBeLessThan(0);
    expect(decision.margin.belowFloor).toBe(true);
    expect(decision.model.modelId).toBe('pricey');
  });

  it('skips disabled models', () => {
    const decision = router.resolve(intent(), tierPrice(), [
      { ...cheaper, model: model({ ...cheaper.model, isEnabled: false }) },
      omni,
    ]);

    expect(decision.model.modelId).toBe('gemini-omni-flash-preview');
  });

  it('skips models that cannot serve the mode', () => {
    const decision = router.resolve(
      intent({ mode: GenerationMode.VIDEO_TO_VIDEO }),
      tierPrice({ mode: GenerationMode.VIDEO_TO_VIDEO }),
      [
        omni,
        {
          model: model({
            id: 'm-4',
            modelId: 'restyler',
            supportedModes: [GenerationMode.VIDEO_TO_VIDEO],
          }),
          price: price({ id: 'p-4', modelId: 'restyler' }),
        },
      ],
    );

    expect(decision.model.modelId).toBe('restyler');
  });

  it('honours a style constraint when a model declares one', () => {
    const animeOnly: RoutableCandidate = {
      model: model({
        id: 'm-5',
        modelId: 'anime-specialist',
        supportedStyles: [StylePreset.ANIME],
      }),
      price: price({ id: 'p-5', modelId: 'anime-specialist', unitCostUsd: '0.010000' }),
    };

    // Cheapest overall, but must not win a realistic request.
    expect(router.resolve(intent(), tierPrice(), [omni, animeOnly]).model.modelId).toBe(
      'gemini-omni-flash-preview',
    );
    expect(
      router.resolve(intent({ style: StylePreset.ANIME }), tierPrice(), [omni, animeOnly]).model
        .modelId,
    ).toBe('anime-specialist');
  });

  it('skips models that cannot reach the requested duration', () => {
    const decision = router.resolve(intent({ durationSeconds: 20, quantity: 20 }), tierPrice(), [
      omni,
      {
        model: model({ id: 'm-6', modelId: 'long-form', maxDurationSeconds: 60 }),
        price: price({ id: 'p-6', modelId: 'long-form', unitCostUsd: '0.200000' }),
      },
    ]);

    expect(decision.model.modelId).toBe('long-form');
  });

  it('honours a stateful-editing requirement', () => {
    const decision = router.resolve(intent({ requiresStatefulEditing: true }), tierPrice(), [
      { ...cheaper, model: model({ ...cheaper.model, supportsStatefulEditing: false }) },
      omni,
    ]);

    expect(decision.model.modelId).toBe('gemini-omni-flash-preview');
  });

  it('throws when the tier has no eligible model', () => {
    expect(() =>
      router.resolve(intent({ tier: GenerationTier.STUDIO }), tierPrice(), [omni]),
    ).toThrow(NoEligibleModelError);
  });
});
