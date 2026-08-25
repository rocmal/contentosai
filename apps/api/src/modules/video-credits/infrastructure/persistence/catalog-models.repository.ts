import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { CatalogModel } from '../../domain/entities/catalog-model.entity';
import {
  CreateCatalogModelData,
  ICatalogModelsRepository,
  UpdateCatalogModelData,
} from '../../domain/repositories/catalog-repository.interface';
import {
  GenerationMode,
  GenerationTier,
  StylePreset,
} from '../../domain/enums/generation.enums';
import { CatalogModelModel } from './catalog-model.model';

@Injectable()
export class CatalogModelsRepository
  extends BaseRepository<
    CatalogModelModel,
    CatalogModel,
    CreateCatalogModelData,
    UpdateCatalogModelData
  >
  implements ICatalogModelsRepository
{
  constructor(@InjectModel(CatalogModelModel) model: typeof CatalogModelModel) {
    super(model);
  }

  async findEnabledByTier(tier: GenerationTier): Promise<CatalogModel[]> {
    const instances = await this.model.findAll({
      where: { tier, isEnabled: true },
      order: [['priority', 'DESC']],
    });
    return instances.map((instance) => this.toEntity(instance));
  }

  async findByModelId(modelId: string): Promise<CatalogModel | null> {
    return this.findOne({ modelId });
  }

  protected toEntity(instance: CatalogModelModel): CatalogModel {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      provider: plain.provider,
      modelId: plain.modelId,
      displayName: plain.displayName,
      tier: plain.tier,
      // JSON columns come back untyped; narrow through the enum values rather
      // than casting, so a stale row cannot inject an unknown mode.
      supportedModes: this.narrow(plain.supportedModes, Object.values(GenerationMode)),
      supportedStyles: this.narrow(plain.supportedStyles, Object.values(StylePreset)),
      maxDurationSeconds: plain.maxDurationSeconds,
      supportsNativeAudio: plain.supportsNativeAudio,
      supportsStatefulEditing: plain.supportsStatefulEditing,
      isEnabled: plain.isEnabled,
      priority: plain.priority,
      notes: plain.notes,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }

  private narrow<T extends string>(values: unknown, allowed: T[]): T[] {
    if (!Array.isArray(values)) {
      return [];
    }
    return values.filter((value): value is T =>
      typeof value === 'string' && (allowed as string[]).includes(value),
    );
  }
}
