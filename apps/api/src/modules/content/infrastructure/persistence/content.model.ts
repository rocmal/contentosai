import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { CampaignModel } from '@modules/campaigns/infrastructure/persistence/campaign.model';
import { ContentStatus, ContentType } from '../../domain/entities/content.entity';

@Table({ tableName: 'content_items', version: true })
export class ContentModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @ForeignKey(() => CampaignModel)
  @Column({ type: DataType.UUID, allowNull: true })
  declare campaignId: string | null;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare body: string;

  @Column({ type: DataType.ENUM(...Object.values(ContentType)), allowNull: false })
  declare type: ContentType;

  @Column({
    type: DataType.ENUM(...Object.values(ContentStatus)),
    allowNull: false,
    defaultValue: ContentStatus.DRAFT,
  })
  declare status: ContentStatus;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare aiGenerated: boolean;

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare aiProvider: string | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare metadata: Record<string, unknown> | null;
}
