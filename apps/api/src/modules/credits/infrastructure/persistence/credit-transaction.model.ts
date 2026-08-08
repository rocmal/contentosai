import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { UserModel } from '@modules/users/infrastructure/persistence/user.model';
import { CreditTransactionReason } from '../../domain/entities/credit-transaction.entity';

@Table({ tableName: 'credit_transactions', version: true })
export class CreditTransactionModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: true })
  declare userId: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare amount: number;

  @Column({
    type: DataType.ENUM(...Object.values(CreditTransactionReason)),
    allowNull: false,
  })
  declare reason: CreditTransactionReason;

  @Column({ type: DataType.UUID, allowNull: true })
  declare relatedEntityId: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare balanceAfter: number | null;
}
