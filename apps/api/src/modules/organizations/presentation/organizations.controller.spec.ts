import { NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { OrganizationsService } from '../application/services/organizations.service';
import { OrganizationsController } from './organizations.controller';

describe('OrganizationsController - only your own organization', () => {
  const me: AuthenticatedUser = {
    id: 'u1',
    email: 'owner@shop.in',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    roles: ['super-admin'],
    permissions: [],
  };
  let service: jest.Mocked<OrganizationsService>;
  let controller: OrganizationsController;

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue({ items: [], meta: {} }),
      findById: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Shop' }),
      update: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Shop' }),
      addMember: jest.fn(),
      listMembers: jest.fn().mockResolvedValue([]),
      removeMember: jest.fn(),
      findMemberCandidateByEmail: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;
    controller = new OrganizationsController(service);
  });

  it('cannot join, read, change or list the members of another organization', async () => {
    await expect(
      controller.addMember('org-2', { userId: 'u1' } as never, me),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.findOne('org-2', me)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.update('org-2', { name: 'x' } as never, me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.listMembers('org-2', me)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.removeMember('org-2', 'u7', me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.lookupMemberCandidate('org-2', 'a@b.in', me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(service.addMember).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.removeMember).not.toHaveBeenCalled();
  });

  it('manages its own organization as before', async () => {
    await controller.addMember('org-1', { userId: 'u2' } as never, me);
    expect(service.addMember).toHaveBeenCalledWith('org-1', { userId: 'u2' }, 'u1');
    await expect(controller.listMembers('org-1', me)).resolves.toEqual([]);
  });

  it('lists only its own organization; a platform admin sees all', async () => {
    await controller.findAll({ page: 1, limit: 20 } as never, me);
    expect(service.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: { id: 'org-1' } }),
    );
    await controller.findAll({ page: 1, limit: 20 } as never, { ...me, isPlatformAdmin: true });
    expect(service.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: undefined }),
    );
  });
});
