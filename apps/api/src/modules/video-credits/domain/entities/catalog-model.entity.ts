import { BaseEntity } from '@shared/domain/base.entity';
import { GenerationMode, GenerationTier, StylePreset } from '../enums/generation.enums';

/**
 * What a model can do and which tier it may serve. Deliberately separate from
 * ModelPrice: capabilities are stable, prices are effective-dated and change
 * without notice. One row per model; price history hangs off it.
 *
 * `isEnabled = false` is how a model is retired without deleting its rows -
 * historical transactions still reference it, and re-enabling is a flag flip
 * rather than a re-seed.
 */
export interface CatalogModel extends BaseEntity {
  provider: string;
  modelId: string;
  displayName: string;
  tier: GenerationTier;
  supportedModes: GenerationMode[];
  /** Empty means "no style constraint" - any preset may route here. */
  supportedStyles: StylePreset[];
  maxDurationSeconds: number | null;
  supportsNativeAudio: boolean;
  supportsStatefulEditing: boolean;
  isEnabled: boolean;
  /** Tie-breaker when two models cost the same. Higher wins. */
  priority: number;
  notes: string | null;
}

export function servesStyle(model: CatalogModel, style: StylePreset): boolean {
  return model.supportedStyles.length === 0 || model.supportedStyles.includes(style);
}

export function servesMode(model: CatalogModel, mode: GenerationMode): boolean {
  return model.supportedModes.includes(mode);
}
