import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganizationsService } from './organizations.service';
import { IOrganizationsRepository } from '../../domain/repositories/organization-repository.interface';
import { IOrganizationMembersRepository } from '../../domain/repositories/organization-member-repository.interface';
import { Organization, OrganizationStatus } from '../../domain/entities/organization.entity';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationsRepository: jest.Mocked<IOrganizationsRepository>;
  let membersRepository: jest.Mocked<IOrganizationMembersRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const organization: Organization = {
    id: 'org-1',
    name: 'Acme',
    slug: 'acme',
    ownerId: 'user-1',
    status: OrganizationStatus.ACTIVE,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    version: 0,
  };

  beforeEach(() => {
    organizationsRepository = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
      findBySlug: jest.fn(),
    };
    membersRepository = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
      findMembership: jest.fn(),
      listByOrganization: jest.fn(),
      listByUser: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    service = new OrganizationsService(organizationsRepository, membersRepository, eventEmitter);
  });

  describe('create', () => {
    it('creates an organization and emits organization.created', async () => {
      organizationsRepository.findBySlug.mockResolvedValue(null);
      organizationsRepository.create.mockResolvedValue(organization);

      const result = await service.create({ name: 'Acme', slug: 'acme' }, 'user-1');

      expect(result).toEqual(organization);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'organization.created',
        expect.objectContaining({ organizationId: 'org-1', ownerId: 'user-1' }),
      );
    });

    it('rejects a slug that is already taken', async () => {
      organizationsRepository.findBySlug.mockResolvedValue(organization);

      await expect(service.create({ name: 'Acme', slug: 'acme' }, 'user-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('addMember', () => {
    it('adds a member when the organization exists and no membership already does', async () => {
      organizationsRepository.findById.mockResolvedValue(organization);
      membersRepository.findMembership.mockResolvedValue(null);
      membersRepository.create.mockResolvedValue({
        id: 'member-1',
        organizationId: 'org-1',
        userId: 'user-2',
        roleId: 'role-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        version: 0,
      });

      const result = await service.addMember(
        'org-1',
        { userId: 'user-2', roleId: 'role-1' },
        'user-1',
      );

      expect(result.userId).toBe('user-2');
    });

    it('rejects adding a member that already belongs to the organization', async () => {
      organizationsRepository.findById.mockResolvedValue(organization);
      membersRepository.findMembership.mockResolvedValue({
        id: 'member-1',
        organizationId: 'org-1',
        userId: 'user-2',
        roleId: 'role-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        version: 0,
      });

      await expect(
        service.addMember('org-1', { userId: 'user-2', roleId: 'role-1' }, 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when the organization does not exist', async () => {
      organizationsRepository.findById.mockResolvedValue(null);

      await expect(
        service.addMember('missing-org', { userId: 'user-2', roleId: 'role-1' }, 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
