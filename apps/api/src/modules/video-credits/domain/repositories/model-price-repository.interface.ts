import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { ModelPrice, PricedUnit } from '../entities/model-price.entity';

export interface CreateModelPriceData {
  provider: string;
  modelId: string;
  unit: PricedUnit;
  unitCostUsd: string;
  minimumBillableUnits: number;
  expectedSuccessRate: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

export type UpdateModelPriceData = Pick<CreateModelPriceData, 'effectiveTo'>;

export interface IModelPricesRepository
  extends IBaseRepository<ModelPrice, CreateModelPriceData, UpdateModelPriceData> {
  findActive(modelId: string, at: Date): Promise<ModelPrice | null>;
  listActive(at: Date): Promise<ModelPrice[]>;
}

export const MODEL_PRICES_REPOSITORY = Symbol('MODEL_PRICES_REPOSITORY');
