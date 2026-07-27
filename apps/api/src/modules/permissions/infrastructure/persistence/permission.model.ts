import { Column, DataType, Table, Unique } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';

@Table({ tableName: 'permissions', version: true })
export class PermissionModel extends BaseModel {
  @Column({ type: DataType.STRING(150), allowNull: false })
  declare name: string;

  @Unique
  @Column({ type: DataType.STRING(150), allowNull: false })
  declare slug: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare module: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;
}
