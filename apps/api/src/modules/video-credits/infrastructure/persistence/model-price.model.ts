import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { PricedUnit } from '../../domain/entities/model-price.entity';

@Table({ tableName: 'model_prices' })
export class ModelPriceModel extends BaseModel {
  @Column({ type: DataType.STRING(100), allowNull: false })
  declare provider: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare modelId: string;

  @Column({ type: DataType.ENUM(...Object.values(PricedUnit)), allowNull: false })
  declare unit: PricedUnit;

  // DECIMAL, not FLOAT: sub-cent rates compound across thousands of calls.
  @Column({ type: DataType.DECIMAL(12, 6), allowNull: false })
  declare unitCostUsd: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  declare minimumBillableUnits: number;

  @Column({ type: DataType.DECIMAL(4, 3), allowNull: false, defaultValue: '1.000' })
  declare expectedSuccessRate: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare effectiveFrom: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  declare effectiveTo: Date | null;
}
