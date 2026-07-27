import { BelongsToMany, Column, DataType, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { PermissionModel } from '@modules/permissions/infrastructure/persistence/permission.model';
import { RolePermissionModel } from './role-permission.model';

@Table({ tableName: 'roles', version: true })
export class RoleModel extends BaseModel {
  @Column({ type: DataType.UUID, allowNull: true })
  declare organizationId: string | null;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare slug: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isSystem: boolean;

  @BelongsToMany(() => PermissionModel, () => RolePermissionModel)
  declare permissions: PermissionModel[];
}
