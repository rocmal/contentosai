import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { TierPrice } from '../../domain/entities/tier-price.entity';
import {
  CreateTierPriceData,
  ITierPricesRepository,
} from '../../domain/repositories/catalog-repository.interface';
import { GenerationMode, GenerationTier } from '../../domain/enums/generation.enums';
import { TierPriceModel } from './tier-price.model';

@Injectable()
export class TierPricesRepository
  extends BaseRepository<
    TierPriceModel,
    TierPrice,
    CreateTierPriceData,
    Pick<CreateTierPriceData, 'effectiveTo'>
  >
  implements ITierPricesRepository
{
  constructor(@InjectModel(TierPriceModel) model: typeof TierPriceModel) {
    super(model);
  }

  async findActive(
    tier: GenerationTier,
    mode: GenerationMode,
    at: Date,
  ): Promise<TierPrice | null> {
    const instance = await this.model.findOne({
      where: {
        tier,
        mode,
        effectiveFrom: { [Op.lte]: at },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gt]: at } }],
      },
      order: [['effectiveFrom', 'DESC']],
    });
    return instance ? this.toEntity(instance) : null;
  }

  async listActive(at: Date): Promise<TierPrice[]> {
    const instances = await this.model.findAll({
      where: {
        effectiveFrom: { [Op.lte]: at },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gt]: at } }],
      },
      order: [['mode', 'ASC'], ['tier', 'ASC']],
    });
    return instances.map((instance) => this.toEntity(instance));
  }

  protected toEntity(instance: TierPriceModel): TierPrice {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      tier: plain.tier,
      mode: plain.mode,
      unit: plain.unit,
      creditsPerUnit: plain.creditsPerUnit,
      minimumBillableUnits: plain.minimumBillableUnits,
      effectiveFrom: plain.effectiveFrom,
      effectiveTo: plain.effectiveTo,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
