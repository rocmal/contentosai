import { ConflictException, NotFoundException } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { IPermissionsRepository } from '../../domain/repositories/permission-repository.interface';
import { Permission } from '../../domain/entities/permission.entity';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let repository: jest.Mocked<IPermissionsRepository>;

  const permission: Permission = {
    id: 'perm-1',
    name: 'Create Campaign',
    slug: 'campaigns.create',
    module: 'campaigns',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
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
      findBySlug: jest.fn(),
      findBySlugs: jest.fn(),
    };
    service = new PermissionsService(repository);
  });

  describe('create', () => {
    it('creates a permission when the slug is not already taken', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(permission);

      const result = await service.create({
        name: 'Create Campaign',
        slug: 'campaigns.create',
        module: 'campaigns',
      });

      expect(repository.findBySlug).toHaveBeenCalledWith('campaigns.create');
      expect(repository.create).toHaveBeenCalled();
      expect(result).toEqual(permission);
    });

    it('rejects a duplicate slug', async () => {
      repository.findBySlug.mockResolvedValue(permission);

      await expect(
        service.create({ name: 'Create Campaign', slug: 'campaigns.create', module: 'campaigns' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns the permission when found', async () => {
      repository.findById.mockResolvedValue(permission);
      await expect(service.findById('perm-1')).resolves.toEqual(permission);
    });

    it('throws NotFoundException when missing', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes an existing permission', async () => {
      repository.findById.mockResolvedValue(permission);
      await service.remove('perm-1', 'actor-1');
      expect(repository.delete).toHaveBeenCalledWith('perm-1', 'actor-1');
    });

    it('throws NotFoundException instead of deleting when missing', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
