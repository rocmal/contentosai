import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { UserModel } from '@modules/users/infrastructure/persistence/user.model';
import { NotificationType } from '../../domain/entities/notification.entity';

@Table({ tableName: 'notifications', version: true })
export class NotificationModel extends BaseModel {
  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare message: string;

  @Column({
    type: DataType.ENUM(...Object.values(NotificationType)),
    allowNull: false,
    defaultValue: NotificationType.INFO,
  })
  declare type: NotificationType;

  @Column({ type: DataType.DATE, allowNull: true })
  declare readAt: Date | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare metadata: Record<string, unknown> | null;
}
