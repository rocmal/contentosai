import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';

@Table({ tableName: 'credit_wallets', version: true })
export class CreditWalletModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare balance: number | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare cycleStartAt: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare cycleEndAt: Date | null;
}
