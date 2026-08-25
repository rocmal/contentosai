import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { ModelPrice } from '../../domain/entities/model-price.entity';
import {
  CreateModelPriceData,
  IModelPricesRepository,
  UpdateModelPriceData,
} from '../../domain/repositories/model-price-repository.interface';
import { ModelPriceModel } from './model-price.model';

@Injectable()
export class ModelPricesRepository
  extends BaseRepository<ModelPriceModel, ModelPrice, CreateModelPriceData, UpdateModelPriceData>
  implements IModelPricesRepository
{
  constructor(@InjectModel(ModelPriceModel) model: typeof ModelPriceModel) {
    super(model);
  }

  async findActive(modelId: string, at: Date): Promise<ModelPrice | null> {
    const instance = await this.model.findOne({
      where: {
        modelId,
        effectiveFrom: { [Op.lte]: at },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gt]: at } }],
      },
      order: [['effectiveFrom', 'DESC']],
    });
    return instance ? this.toEntity(instance) : null;
  }

  async listActive(at: Date): Promise<ModelPrice[]> {
    const instances = await this.model.findAll({
      where: {
        effectiveFrom: { [Op.lte]: at },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gt]: at } }],
      },
      order: [['provider', 'ASC'], ['modelId', 'ASC']],
    });
    return instances.map((instance) => this.toEntity(instance));
  }

  protected toEntity(instance: ModelPriceModel): ModelPrice {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      provider: plain.provider,
      modelId: plain.modelId,
      unit: plain.unit,
      unitCostUsd: String(plain.unitCostUsd),
      minimumBillableUnits: plain.minimumBillableUnits,
      expectedSuccessRate: String(plain.expectedSuccessRate),
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
