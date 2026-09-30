import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { Content } from '../../domain/entities/content.entity';
import {
  CreateContentData,
  IContentRepository,
  UpdateContentData,
} from '../../domain/repositories/content-repository.interface';
import { ContentModel } from './content.model';

@Injectable()
export class ContentRepository
  extends BaseRepository<ContentModel, Content, CreateContentData, UpdateContentData>
  implements IContentRepository
{
  constructor(@InjectModel(ContentModel) model: typeof ContentModel) {
    super(model);
  }

  async listByCampaign(campaignId: string): Promise<Content[]> {
    const instances = await this.model.findAll({ where: { campaignId } });
    return instances.map((instance) => this.toEntity(instance));
  }

  async countByProject(projectIds: string[]): Promise<Record<string, number>> {
    if (projectIds.length === 0) return {};
    const rows = (await this.model.findAll({
      attributes: ['projectId', [fn('COUNT', col('id')), 'itemCount']],
      where: { projectId: projectIds },
      group: ['projectId'],
      raw: true,
    })) as unknown as { projectId: string; itemCount: string | number }[];
    return Object.fromEntries(rows.map((row) => [row.projectId, Number(row.itemCount)]));
  }

  protected toEntity(instance: ContentModel): Content {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      campaignId: plain.campaignId,
      projectId: plain.projectId,
      title: plain.title,
      body: plain.body,
      type: plain.type,
      status: plain.status,
      aiGenerated: plain.aiGenerated,
      aiProvider: plain.aiProvider,
      metadata: plain.metadata,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
