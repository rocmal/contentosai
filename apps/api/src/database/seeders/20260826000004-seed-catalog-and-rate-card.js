'use strict';

const { randomUUID } = require('crypto');

const FROM = new Date('2026-01-01T00:00:00Z');

/**
 * MODEL CATALOG
 * -------------
 * Rows with isEnabled = false are seeded but not routable. They are kept
 * rather than omitted so that re-enabling a model is a flag flip, and so that
 * historical credit_transactions referencing them still resolve to a name.
 *
 * Disabled on purpose right now:
 *   runway-gen4     - no capability the enabled set lacks; ~4x Omni's price
 *   pika-2          - superseded; kept only for legacy job rows
 *   veo-3.1-fal     - same model as veo-3.1 but via fal at 4x Google's rate.
 *                     Re-enable only if a customer needs fal-side billing.
 *   seedance-2.0    - pricing not yet confirmed. Fill unitCostUsd from the
 *                     vendor invoice and flip isEnabled before routing to it;
 *                     it is the likely replacement for veo-3.1 in Studio.
 *   hailuo-2.6      - candidate Character default. Benchmark against Kling
 *                     for character consistency before enabling.
 */
const CATALOG = [
  {
    provider: 'fal',
    modelId: 'wan-2.5',
    displayName: 'Economy Video',
    tier: 'economy',
    supportedModes: ['text_to_video', 'image_to_video', 'video_to_video'],
    supportedStyles: [],
    maxDurationSeconds: 10,
    supportsNativeAudio: false,
    supportsStatefulEditing: false,
    isEnabled: true,
    priority: 100,
    notes: 'Draft tier and free-plan previews.',
    price: { unit: 'per_second', unitCostUsd: '0.050000', min: 1, successRate: '0.950' },
  },
  {
    provider: 'gemini-omni',
    modelId: 'gemini-omni-flash-preview',
    displayName: 'Fast Video',
    tier: 'fast',
    supportedModes: ['text_to_video', 'image_to_video', 'video_to_video'],
    supportedStyles: [],
    maxDurationSeconds: 10,
    supportsNativeAudio: true,
    supportsStatefulEditing: true,
    isEnabled: true,
    priority: 100,
    notes: 'Default Fast tier. Only model with conversational refine.',
    price: { unit: 'per_second', unitCostUsd: '0.101400', min: 3, successRate: '0.926' },
  },
  {
    provider: 'google-vertex',
    modelId: 'veo-3.1',
    displayName: 'Studio Video',
    tier: 'studio',
    supportedModes: ['text_to_video', 'image_to_video'],
    supportedStyles: [],
    maxDurationSeconds: 8,
    supportsNativeAudio: true,
    supportsStatefulEditing: false,
    isEnabled: true,
    priority: 100,
    notes: 'Studio tier. Expensive - review against Seedance before scaling.',
    price: { unit: 'per_second', unitCostUsd: '0.500000', min: 1, successRate: '0.930' },
  },
  {
    provider: 'fal',
    modelId: 'kling-3.0',
    displayName: 'Character Video',
    tier: 'fast',
    supportedModes: ['character', 'image_to_video'],
    supportedStyles: [],
    maxDurationSeconds: 10,
    supportsNativeAudio: false,
    supportsStatefulEditing: false,
    isEnabled: true,
    priority: 90,
    notes: 'Character mode default pending a Hailuo benchmark.',
    price: { unit: 'per_second', unitCostUsd: '0.280000', min: 5, successRate: '0.920' },
  },
  {
    provider: 'elevenlabs',
    modelId: 'eleven-music-v1',
    displayName: 'Music',
    tier: 'fast',
    supportedModes: ['music'],
    supportedStyles: [],
    maxDurationSeconds: null,
    supportsNativeAudio: true,
    supportsStatefulEditing: false,
    isEnabled: true,
    priority: 100,
    // License clarity, not output quality, decides this one: Suno and Udio
    // have unsettled commercial terms and no public API.
    notes: 'Chosen for clean commercial licensing. Reuses the Voice Studio account.',
    price: { unit: 'per_second', unitCostUsd: '0.013333', min: 30, successRate: '0.980' },
  },
  {
    provider: 'elevenlabs',
    modelId: 'eleven-multilingual-v2',
    displayName: 'Voice',
    tier: 'fast',
    supportedModes: ['voice'],
    supportedStyles: [],
    maxDurationSeconds: null,
    supportsNativeAudio: true,
    supportsStatefulEditing: false,
    isEnabled: true,
    priority: 100,
    notes: 'Existing Voice Studio provider.',
    price: { unit: 'per_second', unitCostUsd: '0.003333', min: 10, successRate: '0.980' },
  },

  // ---------- disabled: retained for re-enablement, not routable ----------
  {
    provider: 'fal',
    modelId: 'runway-gen4',
    displayName: 'Runway Gen-4',
    tier: 'studio',
    supportedModes: ['text_to_video', 'image_to_video', 'video_to_video'],
    supportedStyles: [],
    maxDurationSeconds: 10,
    supportsNativeAudio: false,
    supportsStatefulEditing: false,
    isEnabled: false,
    priority: 10,
    notes: 'DISABLED: no capability the enabled set lacks, at roughly 4x the cost.',
    price: { unit: 'per_second', unitCostUsd: '0.400000', min: 1, successRate: '0.900' },
  },
  {
    provider: 'fal',
    modelId: 'pika-2',
    displayName: 'Pika 2',
    tier: 'economy',
    supportedModes: ['text_to_video', 'image_to_video'],
    supportedStyles: [],
    maxDurationSeconds: 5,
    supportsNativeAudio: false,
    supportsStatefulEditing: false,
    isEnabled: false,
    priority: 0,
    notes: 'DISABLED: superseded by Wan 2.5. Retained so legacy jobs resolve.',
    price: { unit: 'per_second', unitCostUsd: '0.090000', min: 1, successRate: '0.880' },
  },
  {
    provider: 'fal',
    modelId: 'veo-3.1-fal',
    displayName: 'Veo 3.1 (via fal)',
    tier: 'studio',
    supportedModes: ['text_to_video', 'image_to_video'],
    supportedStyles: [],
    maxDurationSeconds: 8,
    supportsNativeAudio: true,
    supportsStatefulEditing: false,
    isEnabled: false,
    priority: 0,
    notes: 'DISABLED: same model as veo-3.1 at a gateway markup. Direct is cheaper.',
    price: { unit: 'per_second', unitCostUsd: '0.400000', min: 1, successRate: '0.930' },
  },
  {
    provider: 'fal',
    modelId: 'seedance-2.0',
    displayName: 'Seedance 2.0',
    tier: 'studio',
    supportedModes: ['text_to_video', 'image_to_video'],
    supportedStyles: [],
    maxDurationSeconds: 12,
    supportsNativeAudio: true,
    supportsStatefulEditing: false,
    isEnabled: false,
    priority: 110,
    notes:
      'DISABLED: pricing unconfirmed. Set unitCostUsd from a real invoice, then enable - likely Studio replacement for veo-3.1.',
    price: { unit: 'per_second', unitCostUsd: '0.000000', min: 1, successRate: '0.930' },
  },
  {
    provider: 'fal',
    modelId: 'hailuo-2.6',
    displayName: 'Hailuo 2.6',
    tier: 'fast',
    supportedModes: ['character', 'text_to_video'],
    supportedStyles: ['anime', 'cartoon', 'three_d'],
    maxDurationSeconds: 10,
    supportsNativeAudio: false,
    supportsStatefulEditing: false,
    isEnabled: false,
    priority: 95,
    notes: 'DISABLED: benchmark against Kling for character consistency, then enable.',
    price: { unit: 'per_second', unitCostUsd: '0.045000', min: 5, successRate: '0.910' },
  },
];

/**
 * PUBLISHED RATE CARD
 * -------------------
 * Peg: 1 credit = $0.0045 of vendor spend (70% target margin on the Pro plan,
 * which is the binding constraint at $149 / 10,000 credits).
 *
 * These are what the user is charged. They intentionally do NOT track vendor
 * cost row-for-row: swapping the model behind a tier must not move the price.
 */
const RATE_CARD = [
  // video modes - per second
  ['economy', 'text_to_video', 'per_second', 12, 3],
  ['economy', 'image_to_video', 'per_second', 12, 3],
  ['economy', 'video_to_video', 'per_second', 15, 3],
  ['fast', 'text_to_video', 'per_second', 25, 3],
  ['fast', 'image_to_video', 'per_second', 25, 3],
  ['fast', 'video_to_video', 'per_second', 30, 3],
  ['studio', 'text_to_video', 'per_second', 120, 3],
  ['studio', 'image_to_video', 'per_second', 120, 3],

  // character - own pipeline, own rate
  ['economy', 'character', 'per_second', 20, 5],
  ['fast', 'character', 'per_second', 70, 5],
  ['studio', 'character', 'per_second', 140, 5],

  // audio - per minute
  ['fast', 'voice', 'per_minute', 50, 1],
  ['studio', 'voice', 'per_minute', 80, 1],
  ['fast', 'music', 'per_minute', 200, 1],
  ['studio', 'music', 'per_minute', 260, 1],

  // stills and text
  ['economy', 'image', 'per_image', 6, 1],
  ['fast', 'image', 'per_image', 10, 1],
  ['studio', 'image', 'per_image', 30, 1],
  ['fast', 'text', 'per_1k_tokens', 1, 1],
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const select = { type: Sequelize.QueryTypes.SELECT };

    for (const entry of CATALOG) {
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM catalog_models WHERE modelId = :modelId LIMIT 1',
        { ...select, replacements: { modelId: entry.modelId } },
      );
      if (!existing) {
        await queryInterface.bulkInsert('catalog_models', [
          {
            id: randomUUID(),
            provider: entry.provider,
            modelId: entry.modelId,
            displayName: entry.displayName,
            tier: entry.tier,
            supportedModes: JSON.stringify(entry.supportedModes),
            supportedStyles: JSON.stringify(entry.supportedStyles),
            maxDurationSeconds: entry.maxDurationSeconds,
            supportsNativeAudio: entry.supportsNativeAudio,
            supportsStatefulEditing: entry.supportsStatefulEditing,
            isEnabled: entry.isEnabled,
            priority: entry.priority,
            notes: entry.notes,
            createdAt: now,
            updatedAt: now,
            version: 0,
          },
        ]);
      }

      const [existingPrice] = await queryInterface.sequelize.query(
        'SELECT id FROM model_prices WHERE modelId = :modelId AND effectiveTo IS NULL LIMIT 1',
        { ...select, replacements: { modelId: entry.modelId } },
      );
      if (!existingPrice) {
        await queryInterface.bulkInsert('model_prices', [
          {
            id: randomUUID(),
            provider: entry.provider,
            modelId: entry.modelId,
            unit: entry.price.unit,
            unitCostUsd: entry.price.unitCostUsd,
            minimumBillableUnits: entry.price.min,
            expectedSuccessRate: entry.price.successRate,
            effectiveFrom: FROM,
            effectiveTo: null,
            createdAt: now,
            updatedAt: now,
            version: 0,
          },
        ]);
      }
    }

    for (const [tier, mode, unit, creditsPerUnit, min] of RATE_CARD) {
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM tier_prices WHERE tier = :tier AND mode = :mode AND effectiveTo IS NULL LIMIT 1',
        { ...select, replacements: { tier, mode } },
      );
      if (!existing) {
        await queryInterface.bulkInsert('tier_prices', [
          {
            id: randomUUID(),
            tier,
            mode,
            unit,
            creditsPerUnit,
            minimumBillableUnits: min,
            effectiveFrom: FROM,
            effectiveTo: null,
            createdAt: now,
            updatedAt: now,
            version: 0,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    const modelIds = CATALOG.map((entry) => entry.modelId);
    await queryInterface.bulkDelete('model_prices', { modelId: modelIds });
    await queryInterface.bulkDelete('catalog_models', { modelId: modelIds });
    await queryInterface.bulkDelete('tier_prices', {});
  },
};
