import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Avatar, AvatarAgeGroup, AvatarCategory, AvatarGender, AvatarUsage } from '../../domain/entities/avatar.entity';
import {
  AVATAR_USAGE_REPOSITORY,
  AVATARS_REPOSITORY,
  IAvatarUsageRepository,
  IAvatarsRepository,
} from '../../domain/repositories/avatar-repository.interface';
import { AvatarProviderFactory } from '../../infrastructure/avatar-provider.factory';
import { CreateAvatarDto } from '../dto/create-avatar.dto';
import { FindAvatarsQueryDto } from '../dto/find-avatars-query.dto';
import { RecordAvatarUsageDto } from '../dto/record-avatar-usage.dto';
import { UpdateAvatarDto } from '../dto/update-avatar.dto';
import { AvatarCreatedEvent, AvatarUsedEvent } from '../events/avatar-events';

@Injectable()
export class AvatarsService {
  constructor(
    @Inject(AVATARS_REPOSITORY) private readonly avatarsRepository: IAvatarsRepository,
    @Inject(AVATAR_USAGE_REPOSITORY) private readonly avatarUsageRepository: IAvatarUsageRepository,
    private readonly providerFactory: AvatarProviderFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateAvatarDto, userId: string): Promise<Avatar> {
    this.validateImageUrl(dto.imageUrl);
    const avatar = await this.avatarsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        userId,
        name: dto.name,
        slug: await this.uniqueSlug(dto.workspaceId, dto.name),
        description: dto.description ?? null,
        imageUrl: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl ?? dto.imageUrl,
        category: dto.category ?? AvatarCategory.CUSTOM,
        gender: dto.gender ?? AvatarGender.UNKNOWN,
        language: dto.language ?? null,
        tags: dto.tags ?? [],
        voiceId: dto.voiceId ?? null,
        emotionDefault: dto.emotionDefault ?? null,
        ageGroup: dto.ageGroup ?? AvatarAgeGroup.UNKNOWN,
        isFavorite: false,
        isPublic: dto.isPublic ?? false,
        isArchived: false,
        qualityScore: dto.qualityScore ?? null,
        provider: dto.provider ?? 'mock',
        providerAvatarId: null,
        metadata: dto.metadata ?? {},
      },
      userId,
    );

    const providerRecord = await this.providerFactory.getProvider(avatar.provider).createAvatar({ avatar });
    const saved = await this.avatarsRepository.update(
      avatar.id,
      { providerAvatarId: providerRecord.providerAvatarId },
      userId,
    );
    this.eventEmitter.emit('avatar.created', new AvatarCreatedEvent(saved.id, saved.workspaceId));
    return saved;
  }

  findAll(query: FindAvatarsQueryDto, workspaceId: string): Promise<PaginatedResult<Avatar>> {
    const favorite = query.favorite === undefined ? query.filter === 'favorites' : query.favorite === 'true';
    return this.avatarsRepository.findLibrary({
      page: query.page,
      limit: query.limit,
      sortBy: this.resolveSortBy(query.sortBy),
      sortOrder: query.sortBy === 'oldest' ? 'ASC' : query.sortOrder,
      search: query.search,
      category: query.category,
      favorite: favorite || undefined,
      archived: query.archived === undefined ? undefined : query.archived === 'true',
      recentlyUsed: query.filter === 'recently_used',
      filters: { workspaceId },
    });
  }

  async findById(id: string): Promise<Avatar> {
    const avatar = await this.avatarsRepository.findById(id);
    if (!avatar) {
      throw new NotFoundException(`Avatar with id "${id}" not found`);
    }
    return avatar;
  }

  async update(id: string, dto: UpdateAvatarDto, userId: string): Promise<Avatar> {
    const avatar = await this.findById(id);
    if (dto.imageUrl) this.validateImageUrl(dto.imageUrl);
    const updated = await this.avatarsRepository.update(
      id,
      {
        name: dto.name,
        slug: dto.name ? await this.uniqueSlug(avatar.workspaceId, dto.name, id) : undefined,
        description: dto.description,
        imageUrl: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl,
        category: dto.category,
        gender: dto.gender,
        language: dto.language,
        tags: dto.tags,
        voiceId: dto.voiceId,
        emotionDefault: dto.emotionDefault,
        ageGroup: dto.ageGroup,
        isPublic: dto.isPublic,
        qualityScore: dto.qualityScore,
        provider: dto.provider,
        metadata: dto.metadata,
      },
      userId,
    );
    await this.providerFactory.getProvider(updated.provider).updateAvatar({ avatar: updated });
    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const avatar = await this.findById(id);
    if (avatar.providerAvatarId) {
      await this.providerFactory.getProvider(avatar.provider).deleteAvatar(avatar.providerAvatarId);
    }
    await this.avatarsRepository.delete(id, userId);
  }

  async duplicate(id: string, userId: string): Promise<Avatar> {
    const avatar = await this.findById(id);
    return this.create(
      {
        organizationId: avatar.organizationId,
        workspaceId: avatar.workspaceId,
        name: `${avatar.name} Copy`,
        description: avatar.description ?? undefined,
        imageUrl: avatar.imageUrl,
        thumbnailUrl: avatar.thumbnailUrl ?? undefined,
        category: avatar.category,
        gender: avatar.gender,
        language: avatar.language ?? undefined,
        tags: avatar.tags,
        voiceId: avatar.voiceId ?? undefined,
        emotionDefault: avatar.emotionDefault ?? undefined,
        ageGroup: avatar.ageGroup,
        isPublic: avatar.isPublic,
        qualityScore: avatar.qualityScore ?? undefined,
        provider: avatar.provider,
        metadata: avatar.metadata,
      },
      userId,
    );
  }

  async setFavorite(id: string, isFavorite: boolean, userId: string): Promise<Avatar> {
    await this.findById(id);
    return this.avatarsRepository.update(id, { isFavorite }, userId);
  }

  async archive(id: string, isArchived: boolean, userId: string): Promise<Avatar> {
    await this.findById(id);
    return this.avatarsRepository.update(id, { isArchived }, userId);
  }

  async recordUsage(id: string, dto: RecordAvatarUsageDto, userId: string): Promise<AvatarUsage> {
    const avatar = await this.findById(id);
    const existing = await this.avatarUsageRepository.findByAvatarId(id);
    const usage = existing
      ? await this.avatarUsageRepository.update(
          existing.id,
          {
            projectId: dto.projectId ?? existing.projectId,
            campaignId: dto.campaignId ?? existing.campaignId,
            videoId: dto.videoId ?? existing.videoId,
            lastUsed: new Date(),
            usageCount: existing.usageCount + 1,
          },
          userId,
        )
      : await this.avatarUsageRepository.create(
          {
            organizationId: avatar.organizationId,
            workspaceId: avatar.workspaceId,
            avatarId: id,
            projectId: dto.projectId ?? null,
            campaignId: dto.campaignId ?? null,
            videoId: dto.videoId ?? null,
            lastUsed: new Date(),
            usageCount: 1,
          },
          userId,
        );
    this.eventEmitter.emit('avatar.used', new AvatarUsedEvent(id, avatar.workspaceId));
    return usage;
  }

  findCategories(workspaceId: string): Promise<string[]> {
    return this.avatarsRepository.findCategories(workspaceId);
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
  }

  private validateImageUrl(imageUrl: string): void {
    if (!/^https?:\/\/|^\//.test(imageUrl)) {
      throw new BadRequestException('Avatar imageUrl must be an HTTP(S) URL or local storage path');
    }
  }

  private async uniqueSlug(workspaceId: string, name: string, ignoreId?: string): Promise<string> {
    const base = this.slugify(name);
    let slug = base;
    let suffix = 2;
    for (;;) {
      const existing = await this.avatarsRepository.findOne({ workspaceId, slug });
      if (!existing || existing.id === ignoreId) return slug;
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  private slugify(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'avatar';
  }

  private resolveSortBy(sortBy?: string): string | undefined {
    if (!sortBy) return undefined;
    if (sortBy === 'name') return 'name';
    if (sortBy === 'oldest' || sortBy === 'newest') return 'createdAt';
    return sortBy;
  }
}
