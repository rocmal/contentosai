import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { UserModel } from '@modules/users/infrastructure/persistence/user.model';

@Table({ tableName: 'push_tokens', version: true })
export class PushTokenModel extends BaseModel {
  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  declare token: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  declare platform: string;
}
