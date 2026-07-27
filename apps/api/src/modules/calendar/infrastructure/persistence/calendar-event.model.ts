import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { ContentModel } from '@modules/content/infrastructure/persistence/content.model';
import { CampaignModel } from '@modules/campaigns/infrastructure/persistence/campaign.model';

@Table({ tableName: 'calendar_events', version: true })
export class CalendarEventModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare startAt: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  declare endAt: Date | null;

  @ForeignKey(() => ContentModel)
  @Column({ type: DataType.UUID, allowNull: true })
  declare contentId: string | null;

  @ForeignKey(() => CampaignModel)
  @Column({ type: DataType.UUID, allowNull: true })
  declare campaignId: string | null;
}
