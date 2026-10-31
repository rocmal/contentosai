import { NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { IOrganizationMembersRepository } from '@modules/organizations/domain/repositories/organization-member-repository.interface';
import { UsersService } from '../application/services/users.service';
import { UsersController } from './users.controller';

describe('UsersController - you, your team, or a platform admin', () => {
  const me: AuthenticatedUser = {
    id: 'u1',
    email: 'owner@shop.in',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    roles: ['super-admin'],
    permissions: [],
  };
  const memberships: Record<string, { organizationId: string }[]> = {
    u1: [{ organizationId: 'org-1' }],
    teammate: [{ organizationId: 'org-1' }],
    stranger: [{ organizationId: 'org-2' }],
  };
  let users: jest.Mocked<UsersService>;
  let controller: UsersController;

  beforeEach(() => {
    users = {
      findById: jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve({ id, email: `${id}@x.in` })),
      update: jest.fn().mockImplementation((id: string) => Promise.resolve({ id })),
    } as unknown as jest.Mocked<UsersService>;
    const members = {
      listByUser: jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve(memberships[id] ?? [])),
    } as unknown as IOrganizationMembersRepository;
    controller = new UsersController(users, members);
  });

  it('shows yourself and your teammates', async () => {
    await expect(controller.findOne('u1', me)).resolves.toEqual(
      expect.objectContaining({ id: 'u1' }),
    );
    await expect(controller.findOne('teammate', me)).resolves.toEqual(
      expect.objectContaining({ id: 'teammate' }),
    );
  });

  it('treats anyone else as not found', async () => {
    await expect(controller.findOne('stranger', me)).rejects.toBeInstanceOf(NotFoundException);
    expect(users.findById).not.toHaveBeenCalledWith('stranger');
  });

  it('lets you change only your own name and picture', async () => {
    await controller.update('u1', { firstName: 'Me' } as never, me);
    expect(users.update).toHaveBeenCalledWith('u1', { firstName: 'Me' }, 'u1');
    await expect(
      controller.update('teammate', { firstName: 'X' } as never, me),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets a platform admin see and change anyone', async () => {
    const admin = { ...me, isPlatformAdmin: true };
    await expect(controller.findOne('stranger', admin)).resolves.toEqual(
      expect.objectContaining({ id: 'stranger' }),
    );
    await controller.update('stranger', { firstName: 'Fixed' } as never, admin);
    expect(users.update).toHaveBeenCalledWith('stranger', { firstName: 'Fixed' }, 'u1');
  });
});
