import { EventEmitter2 } from '@nestjs/event-emitter';
import { Avatar, AvatarAgeGroup, AvatarCategory, AvatarGender, AvatarUsage } from '../../domain/entities/avatar.entity';
import { IAvatarUsageRepository, IAvatarsRepository } from '../../domain/repositories/avatar-repository.interface';
import { AvatarProviderFactory } from '../../infrastructure/avatar-provider.factory';
import { AvatarsService } from './avatars.service';

const now = new Date('2026-07-31T00:00:00.000Z');

function makeAvatar(overrides: Partial<Avatar> = {}): Avatar {
  return {
    id: 'avatar-1',
    organizationId: 'org-1',
    workspaceId: 'workspace-1',
    userId: 'user-1',
    name: 'John Smith',
    slug: 'john-smith',
    description: null,
    imageUrl: 'https://example.com/avatar.png',
    thumbnailUrl: 'https://example.com/avatar.png',
    category: AvatarCategory.BUSINESS,
    gender: AvatarGender.UNKNOWN,
    language: null,
    tags: [],
    voiceId: null,
    emotionDefault: null,
    ageGroup: AvatarAgeGroup.UNKNOWN,
    isFavorite: false,
    isPublic: false,
    isArchived: false,
    qualityScore: null,
    provider: 'mock',
    providerAvatarId: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    version: 0,
    ...overrides,
  };
}

describe('AvatarsService', () => {
  let avatarsRepository: jest.Mocked<IAvatarsRepository>;
  let avatarUsageRepository: jest.Mocked<IAvatarUsageRepository>;
  let providerFactory: jest.Mocked<AvatarProviderFactory>;
  let service: AvatarsService;

  beforeEach(() => {
    avatarsRepository = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findLibrary: jest.fn(),
      findCategories: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
    };
    avatarUsageRepository = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByAvatarId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
    };
    providerFactory = {
      getProvider: jest.fn().mockReturnValue({
        createAvatar: jest.fn().mockResolvedValue({ provider: 'mock', providerAvatarId: 'avatar-1' }),
        updateAvatar: jest.fn(),
        deleteAvatar: jest.fn(),
      }),
      listProviders: jest.fn().mockReturnValue(['mock']),
    } as unknown as jest.Mocked<AvatarProviderFactory>;
    service = new AvatarsService(
      avatarsRepository,
      avatarUsageRepository,
      providerFactory,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );
  });

  it('creates an avatar with a unique slug and registers it with the provider', async () => {
    const avatar = makeAvatar();
    avatarsRepository.findOne.mockResolvedValue(null);
    avatarsRepository.create.mockResolvedValue(avatar);
    avatarsRepository.update.mockResolvedValue({ ...avatar, providerAvatarId: 'avatar-1' });

    const result = await service.create(
      {
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
        name: 'John Smith',
        imageUrl: 'https://example.com/avatar.png',
        category: AvatarCategory.BUSINESS,
      },
      'user-1',
    );

    expect(avatarsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'john-smith', provider: 'mock' }),
      'user-1',
    );
    expect(providerFactory.getProvider).toHaveBeenCalledWith('mock');
    expect(result.providerAvatarId).toBe('avatar-1');
  });

  it('toggles favorites', async () => {
    avatarsRepository.findById.mockResolvedValue(makeAvatar());
    avatarsRepository.update.mockResolvedValue(makeAvatar({ isFavorite: true }));

    const result = await service.setFavorite('avatar-1', true, 'user-1');

    expect(avatarsRepository.update).toHaveBeenCalledWith('avatar-1', { isFavorite: true }, 'user-1');
    expect(result.isFavorite).toBe(true);
  });

  it('records first avatar usage', async () => {
    avatarsRepository.findById.mockResolvedValue(makeAvatar());
    avatarUsageRepository.findByAvatarId.mockResolvedValue(null);
    const usage: AvatarUsage = {
      id: 'usage-1',
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      avatarId: 'avatar-1',
      projectId: null,
      campaignId: null,
      videoId: null,
      lastUsed: now,
      usageCount: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: 'user-1',
      updatedBy: 'user-1',
      version: 0,
    };
    avatarUsageRepository.create.mockResolvedValue(usage);

    const result = await service.recordUsage('avatar-1', {}, 'user-1');

    expect(avatarUsageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ avatarId: 'avatar-1', usageCount: 1 }),
      'user-1',
    );
    expect(result.usageCount).toBe(1);
  });
});
