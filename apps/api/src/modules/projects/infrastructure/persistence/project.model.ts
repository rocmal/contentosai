import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { CampaignModel } from '@modules/campaigns/infrastructure/persistence/campaign.model';
import { ProjectStatus } from '../../domain/entities/project.entity';

@Table({ tableName: 'projects', version: true })
export class ProjectModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @ForeignKey(() => CampaignModel)
  @Column({ type: DataType.UUID, allowNull: true })
  declare campaignId: string | null;

  @Column({ type: DataType.STRING(200), allowNull: false })
  declare title: string;

  @Column({ type: DataType.STRING(100), allowNull: false, defaultValue: 'General' })
  declare category: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column({
    type: DataType.ENUM(...Object.values(ProjectStatus)),
    allowNull: false,
    defaultValue: ProjectStatus.IN_PROGRESS,
  })
  declare status: ProjectStatus;
}
