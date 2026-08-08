import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { AvatarModel } from './avatar.model';

@Table({ tableName: 'avatar_usages', version: true })
export class AvatarUsageModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @ForeignKey(() => AvatarModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare avatarId: string;

  @Column({ type: DataType.UUID, allowNull: true })
  declare projectId: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  declare campaignId: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  declare videoId: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare lastUsed: Date;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare usageCount: number;
}
