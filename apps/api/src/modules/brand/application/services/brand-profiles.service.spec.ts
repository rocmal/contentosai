import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BrandProfilesService } from './brand-profiles.service';
import { IBrandProfilesRepository } from '../../domain/repositories/brand-profile-repository.interface';
import { BrandProfile } from '../../domain/entities/brand-profile.entity';

describe('BrandProfilesService', () => {
  let service: BrandProfilesService;
  let repository: jest.Mocked<IBrandProfilesRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const brandProfile: BrandProfile = {
    id: 'brand-1',
    organizationId: 'org-1',
    workspaceId: 'workspace-1',
    name: 'Acme Corp',
    industry: 'Retail',
    tagline: null,
    toneOfVoice: ['Friendly', 'Confident'],
    brandColors: ['#111111', '#FFFFFF'],
    logoUrl: 'https://cdn.example.com/logo.png',
    guidelines: 'Always lead with the customer benefit.',
    websiteUrl: null,
    primaryFont: null,
    productsAndServices: null,
    mission: null,
    vision: null,
    primaryCTA: null,
    targetAudience: null,
    competitors: null,
    keywords: null,
    socialAccounts: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    version: 0,
  };

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
      listByWorkspace: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    service = new BrandProfilesService(repository, eventEmitter);
  });

  describe('create', () => {
    it('creates a brand profile and emits brand.created', async () => {
      repository.create.mockResolvedValue(brandProfile);

      const result = await service.create(
        {
          organizationId: 'org-1',
          workspaceId: 'workspace-1',
          name: 'Acme Corp',
          industry: 'Retail',
          toneOfVoice: ['Friendly', 'Confident'],
          brandColors: ['#111111', '#FFFFFF'],
          logoUrl: 'https://cdn.example.com/logo.png',
          guidelines: 'Always lead with the customer benefit.',
        },
        'user-1',
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org-1', workspaceId: 'workspace-1', name: 'Acme Corp' }),
        'user-1',
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'brand.created',
        expect.objectContaining({ brandProfileId: 'brand-1', workspaceId: 'workspace-1' }),
      );
      expect(result).toEqual(brandProfile);
    });

    it('defaults optional fields to null when omitted', async () => {
      repository.create.mockResolvedValue(brandProfile);

      await service.create({
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
        name: 'Acme Corp',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: null,
          toneOfVoice: null,
          brandColors: null,
          logoUrl: null,
          guidelines: null,
        }),
        undefined,
      );
    });
  });

  describe('findById', () => {
    it('returns the brand profile when found', async () => {
      repository.findById.mockResolvedValue(brandProfile);
      await expect(service.findById('brand-1')).resolves.toEqual(brandProfile);
    });

    it('throws NotFoundException when missing', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByWorkspace', () => {
    it('delegates to the repository', async () => {
      repository.listByWorkspace.mockResolvedValue([brandProfile]);
      await expect(service.findByWorkspace('workspace-1')).resolves.toEqual([brandProfile]);
      expect(repository.listByWorkspace).toHaveBeenCalledWith('workspace-1');
    });
  });

  describe('update', () => {
    it('updates an existing brand profile', async () => {
      repository.findById.mockResolvedValue(brandProfile);
      repository.update.mockResolvedValue({ ...brandProfile, name: 'Acme Inc' });

      const result = await service.update('brand-1', { name: 'Acme Inc' }, 'user-1');

      expect(repository.update).toHaveBeenCalledWith(
        'brand-1',
        expect.objectContaining({ name: 'Acme Inc' }),
        'user-1',
      );
      expect(result.name).toBe('Acme Inc');
    });

    it('throws NotFoundException instead of updating when missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'Acme Inc' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing brand profile', async () => {
      repository.findById.mockResolvedValue(brandProfile);
      await service.remove('brand-1', 'user-1');
      expect(repository.delete).toHaveBeenCalledWith('brand-1', 'user-1');
    });

    it('throws NotFoundException instead of deleting when missing', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
