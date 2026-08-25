import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { CatalogModel } from '../entities/catalog-model.entity';
import { TierPrice } from '../entities/tier-price.entity';
import { GenerationMode, GenerationTier } from '../enums/generation.enums';

export interface CreateCatalogModelData {
  provider: string;
  modelId: string;
  displayName: string;
  tier: GenerationTier;
  supportedModes: GenerationMode[];
  supportedStyles: string[];
  maxDurationSeconds?: number | null;
  supportsNativeAudio: boolean;
  supportsStatefulEditing: boolean;
  isEnabled: boolean;
  priority: number;
  notes?: string | null;
}

export type UpdateCatalogModelData = Partial<
  Pick<CreateCatalogModelData, 'isEnabled' | 'priority' | 'notes' | 'displayName'>
>;

export interface ICatalogModelsRepository
  extends IBaseRepository<CatalogModel, CreateCatalogModelData, UpdateCatalogModelData> {
  /** Enabled models for a tier, regardless of mode - filtering is the router's job. */
  findEnabledByTier(tier: GenerationTier): Promise<CatalogModel[]>;
  findByModelId(modelId: string): Promise<CatalogModel | null>;
}

export interface CreateTierPriceData {
  tier: GenerationTier;
  mode: GenerationMode;
  unit: string;
  creditsPerUnit: number;
  minimumBillableUnits: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

export interface ITierPricesRepository
  extends IBaseRepository<TierPrice, CreateTierPriceData, Pick<CreateTierPriceData, 'effectiveTo'>> {
  findActive(tier: GenerationTier, mode: GenerationMode, at: Date): Promise<TierPrice | null>;
  /** The full published rate card, for the pricing page and the quote endpoint. */
  listActive(at: Date): Promise<TierPrice[]>;
}

export const CATALOG_MODELS_REPOSITORY = Symbol('CATALOG_MODELS_REPOSITORY');
export const TIER_PRICES_REPOSITORY = Symbol('TIER_PRICES_REPOSITORY');
