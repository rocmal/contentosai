import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { CreditTransactionType } from '../../domain/entities/credit-transaction.entity';
import { VideoCreditWalletModel } from './credit-wallet.model';

@Table({ tableName: 'credit_transactions' })
export class VideoCreditTransactionModel extends BaseModel {
  @ForeignKey(() => VideoCreditWalletModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare walletId: string;

  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @Column({ type: DataType.ENUM(...Object.values(CreditTransactionType)), allowNull: false })
  declare type: CreditTransactionType;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare credits: number;

  @Column({ type: DataType.UUID, allowNull: true })
  declare reservationId: string | null;

  @Column({ type: DataType.STRING(150), allowNull: true })
  declare feature: string | null;

  @Column({ type: DataType.STRING(150), allowNull: true })
  declare modelId: string | null;

  @Column({ type: DataType.DECIMAL(12, 6), allowNull: true })
  declare vendorCostUsd: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare reason: string | null;
}
