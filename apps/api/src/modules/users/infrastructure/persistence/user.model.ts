import { Column, DataType, Table, Unique } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { UserStatus } from '../../domain/entities/user.entity';

@Table({ tableName: 'users', version: true })
export class UserModel extends BaseModel {
  @Unique
  @Column({ type: DataType.STRING(255), allowNull: false })
  declare email: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare passwordHash: string | null;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare firstName: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare lastName: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  declare avatarUrl: string | null;

  @Column({
    type: DataType.ENUM(...Object.values(UserStatus)),
    allowNull: false,
    defaultValue: UserStatus.INVITED,
  })
  declare status: UserStatus;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isEmailVerified: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  declare emailVerifiedAt: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare lastLoginAt: Date | null;
}
