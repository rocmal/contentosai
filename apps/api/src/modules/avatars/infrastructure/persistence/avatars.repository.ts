import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { Op, Order, WhereOptions } from 'sequelize';
import { Avatar } from '../../domain/entities/avatar.entity';
import {
  AvatarFindOptions,
  CreateAvatarData,
  IAvatarsRepository,
  UpdateAvatarData,
} from '../../domain/repositories/avatar-repository.interface';
import { AvatarModel } from './avatar.model';

@Injectable()
export class AvatarsRepository
  extends BaseRepository<AvatarModel, Avatar, CreateAvatarData, UpdateAvatarData>
  implements IAvatarsRepository
{
  constructor(@InjectModel(AvatarModel) model: typeof AvatarModel) {
    super(model);
  }

  async findLibrary(options: AvatarFindOptions) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 20;
    const filters: Record<string, unknown> = {
      ...(options.filters ?? {}),
      ...(options.archived === undefined ? { isArchived: false } : { isArchived: options.archived }),
    };

    if (options.category) filters.category = options.category;
    if (options.favorite !== undefined) filters.isFavorite = options.favorite;

    const where: WhereOptions = options.search
      ? {
          ...filters,
          [Op.or]: [
            { name: { [Op.like]: `%${options.search}%` } },
            { description: { [Op.like]: `%${options.search}%` } },
          ],
        }
      : (filters as WhereOptions);

    const order: Order = [[options.recentlyUsed ? 'updatedAt' : options.sortBy ?? 'createdAt', options.sortOrder ?? 'DESC']];
    const { rows, count } = await this.model.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order,
      paranoid: !options.withDeleted,
    });

    return {
      items: rows.map((row) => this.toEntity(row)),
      meta: {
        totalItems: count,
        itemCount: rows.length,
        itemsPerPage: limit,
        totalPages: Math.max(1, Math.ceil(count / limit)),
        currentPage: page,
      },
    };
  }

  async findCategories(workspaceId: string): Promise<string[]> {
    const rows = await this.model.findAll({
      attributes: ['category'],
      where: { workspaceId, isArchived: false },
      group: ['category'],
    });
    return rows.map((row) => row.category);
  }

  protected toEntity(instance: AvatarModel): Avatar {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      userId: plain.userId,
      name: plain.name,
      slug: plain.slug,
      description: plain.description,
      imageUrl: plain.imageUrl,
      thumbnailUrl: plain.thumbnailUrl,
      category: plain.category,
      gender: plain.gender,
      language: plain.language,
      tags: plain.tags ?? [],
      voiceId: plain.voiceId,
      emotionDefault: plain.emotionDefault,
      ageGroup: plain.ageGroup,
      isFavorite: plain.isFavorite,
      isPublic: plain.isPublic,
      isArchived: plain.isArchived,
      qualityScore: plain.qualityScore,
      provider: plain.provider,
      providerAvatarId: plain.providerAvatarId,
      metadata: plain.metadata ?? {},
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
