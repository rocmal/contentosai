import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { ContentModel } from '@modules/content/infrastructure/persistence/content.model';
import { PublishingJobStatus } from '../../domain/entities/publishing-job.entity';

@Table({ tableName: 'publishing_jobs', version: true })
export class PublishingJobModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @ForeignKey(() => ContentModel)
  @Column({ type: DataType.UUID, allowNull: true })
  declare contentId: string | null;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare platform: string;

  @Column({
    type: DataType.ENUM(...Object.values(PublishingJobStatus)),
    allowNull: false,
    defaultValue: PublishingJobStatus.SCHEDULED,
  })
  declare status: PublishingJobStatus;

  @Column({ type: DataType.DATE, allowNull: true })
  declare scheduledAt: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare publishedAt: Date | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare externalPostId: string | null;
}
