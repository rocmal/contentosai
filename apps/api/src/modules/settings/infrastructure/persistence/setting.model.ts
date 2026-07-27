import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';

@Table({ tableName: 'settings', version: true })
export class SettingModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare key: string;

  @Column({ type: DataType.JSON, allowNull: true })
  declare value: unknown;
}
