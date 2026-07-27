import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { PermissionModel } from '@modules/permissions/infrastructure/persistence/permission.model';
import { RoleModel } from './role.model';

@Table({ tableName: 'role_permissions', version: true })
export class RolePermissionModel extends BaseModel {
  @ForeignKey(() => RoleModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare roleId: string;

  @ForeignKey(() => PermissionModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare permissionId: string;

  @BelongsTo(() => RoleModel)
  declare role: RoleModel;

  @BelongsTo(() => PermissionModel)
  declare permission: PermissionModel;
}
