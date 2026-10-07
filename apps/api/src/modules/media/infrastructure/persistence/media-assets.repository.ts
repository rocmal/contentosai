import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { UserModel } from '@modules/users/infrastructure/persistence/user.model';
import { BaseRepository } from '@database/repositories/base.repository';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import {
  CreateMediaAssetData,
  IMediaAssetsRepository,
  MediaLibraryQuery,
  UpdateMediaAssetData,
} from '../../domain/repositories/media-asset-repository.interface';
import { MediaAssetModel } from './media-asset.model';

@Injectable()
export class MediaAssetsRepository
  extends BaseRepository<MediaAssetModel, MediaAsset, CreateMediaAssetData, UpdateMediaAssetData>
  implements IMediaAssetsRepository
{
  constructor(
    @InjectModel(MediaAssetModel) model: typeof MediaAssetModel,
    @InjectModel(UserModel) private readonly userModel: typeof UserModel,
  ) {
    super(model);
  }

  async searchLibrary(query: MediaLibraryQuery): Promise<PaginatedResult<MediaAsset>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 24;

    const where: WhereOptions[] = [{ workspaceId: query.workspaceId }];
    if (query.createdBy) where.push({ createdBy: query.createdBy });
    if (query.type) where.push({ type: query.type });
    if (query.generatedOnly) where.push({ provider: { [Op.ne]: null } });
    const term = query.search?.trim().slice(0, 100);
    if (term) {
      // Escape LIKE wildcards so a search for "50%" matches the text, not everything.
      const like = `%${term.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
      where.push({ [Op.or]: [{ fileName: { [Op.like]: like } }, { prompt: { [Op.like]: like } }] });
    }

    const { rows, count } = await this.model.findAndCountAll({
      where: { [Op.and]: where },
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
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

  async findCreatorNames(userIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (ids.length === 0) return new Map();
    const users = await this.userModel.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'firstName', 'lastName'],
    });
    return new Map(
      users.map((u) => [u.id, `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'Team member']),
    );
  }

  protected toEntity(instance: MediaAssetModel): MediaAsset {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      fileName: plain.fileName,
      storageKey: plain.storageKey,
      url: plain.url,
      mimeType: plain.mimeType,
      sizeBytes: plain.sizeBytes,
      type: plain.type,
      prompt: plain.prompt,
      provider: plain.provider,
      model: plain.model,
      voiceId: plain.voiceId,
      cacheKeyHash: plain.cacheKeyHash,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
