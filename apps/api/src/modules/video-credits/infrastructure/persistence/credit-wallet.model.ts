import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';

/**
 * Optimistic locking is deliberately NOT enabled here. Balance changes go
 * through conditional UPDATEs in the repository, which are atomic at the
 * database level; a version check would add lost-update retries on top of a
 * guard that already cannot lose an update.
 */
@Table({ tableName: 'credit_wallets' })
export class VideoCreditWalletModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare plan: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare periodStart: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  declare periodEnd: Date;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare grantedCredits: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare reservedCredits: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare consumedCredits: number;
}
