import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import {
  BillingUnit,
  GenerationMode,
  GenerationTier,
} from '../../domain/enums/generation.enums';

@Table({ tableName: 'tier_prices' })
export class TierPriceModel extends BaseModel {
  @Column({ type: DataType.ENUM(...Object.values(GenerationTier)), allowNull: false })
  declare tier: GenerationTier;

  @Column({ type: DataType.ENUM(...Object.values(GenerationMode)), allowNull: false })
  declare mode: GenerationMode;

  @Column({ type: DataType.ENUM(...Object.values(BillingUnit)), allowNull: false })
  declare unit: BillingUnit;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare creditsPerUnit: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  declare minimumBillableUnits: number;

  @Column({ type: DataType.DATE, allowNull: false })
  declare effectiveFrom: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  declare effectiveTo: Date | null;
}
