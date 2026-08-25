import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { GenerationTier } from '../../domain/enums/generation.enums';

@Table({ tableName: 'catalog_models' })
export class CatalogModelModel extends BaseModel {
  @Column({ type: DataType.STRING(100), allowNull: false })
  declare provider: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare modelId: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare displayName: string;

  @Column({ type: DataType.ENUM(...Object.values(GenerationTier)), allowNull: false })
  declare tier: GenerationTier;

  // JSON rather than a join table: these arrays are read on every routing
  // decision and never queried independently.
  @Column({ type: DataType.JSON, allowNull: false })
  declare supportedModes: string[];

  @Column({ type: DataType.JSON, allowNull: false })
  declare supportedStyles: string[];

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare maxDurationSeconds: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare supportsNativeAudio: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare supportsStatefulEditing: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare isEnabled: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare priority: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare notes: string | null;
}
