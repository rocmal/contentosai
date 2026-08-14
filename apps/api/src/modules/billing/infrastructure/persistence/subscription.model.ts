import { Column, DataType, ForeignKey, Table, Unique } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { SubscriptionStatus } from '../../domain/entities/subscription.entity';

@Table({ tableName: 'subscriptions', version: true })
export class SubscriptionModel extends BaseModel {
  @Unique
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare plan: string;

  @Column({
    type: DataType.ENUM(...Object.values(SubscriptionStatus)),
    allowNull: false,
    defaultValue: SubscriptionStatus.TRIALING,
  })
  declare status: SubscriptionStatus;

  @Column({ type: DataType.STRING(50), allowNull: true })
  declare gatewayProvider: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare gatewayCustomerId: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare gatewaySubscriptionId: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare currentPeriodEnd: Date | null;
}
