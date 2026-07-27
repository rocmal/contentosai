import { Column, DataType, ForeignKey, Table, Unique } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { UserModel } from '@modules/users/infrastructure/persistence/user.model';
import { OrganizationStatus } from '../../domain/entities/organization.entity';

@Table({ tableName: 'organizations', version: true })
export class OrganizationModel extends BaseModel {
  @Column({ type: DataType.STRING(150), allowNull: false })
  declare name: string;

  @Unique
  @Column({ type: DataType.STRING(150), allowNull: false })
  declare slug: string;

  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare ownerId: string;

  @Column({
    type: DataType.ENUM(...Object.values(OrganizationStatus)),
    allowNull: false,
    defaultValue: OrganizationStatus.ACTIVE,
  })
  declare status: OrganizationStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;
}
