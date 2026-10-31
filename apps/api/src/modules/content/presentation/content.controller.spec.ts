import { NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { ContentService } from '../application/services/content.service';
import { CreateContentDto } from '../application/dto/create-content.dto';
import { ContentController } from './content.controller';

const userOf = (
  organizationId: string,
  workspaceId: string,
  isPlatformAdmin = false,
): AuthenticatedUser => ({
  id: `user-${workspaceId}`,
  email: `${workspaceId}@shop.in`,
  organizationId,
  workspaceId,
  roles: ['super-admin'],
  permissions: [],
  isPlatformAdmin,
});

describe('ContentController - one customer cannot reach another', () => {
  const theirs = {
    id: 'c2',
    organizationId: 'org-2',
    workspaceId: 'ws-2',
    title: 'Their post',
    body: '',
  };
  const mine = {
    id: 'c1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    title: 'My post',
    body: '',
  };
  const me = userOf('org-1', 'ws-1');
  let service: jest.Mocked<ContentService>;
  let controller: ContentController;

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue({ items: [], meta: {} }),
      findById: jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve(id === 'c1' ? mine : theirs)),
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 'new', ...dto })),
      update: jest.fn().mockResolvedValue(mine),
      remove: jest.fn(),
    } as unknown as jest.Mocked<ContentService>;
    controller = new ContentController(service);
  });

  it("lists only the caller's workspace, even when another is asked for", async () => {
    await controller.findAll({ page: 1, limit: 50 } as never, me, 'project-1');
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { projectId: 'project-1', workspaceId: 'ws-1' } }),
    );
  });

  it("treats another customer's item as not found - to read, change or delete", async () => {
    await expect(controller.findOne('c2', me)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.update('c2', { title: 'x' } as never, me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.remove('c2', me)).rejects.toBeInstanceOf(NotFoundException);
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it("still serves the caller's own item", async () => {
    await expect(controller.findOne('c1', me)).resolves.toEqual(
      expect.objectContaining({ id: 'c1' }),
    );
    await controller.remove('c1', me);
    expect(service.remove).toHaveBeenCalledWith('c1', me.id);
  });

  it("creates in the caller's workspace, whatever the body names", async () => {
    await controller.create(
      { title: 'Post', organizationId: 'org-2', workspaceId: 'ws-2' } as CreateContentDto,
      me,
    );
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', workspaceId: 'ws-1' }),
      me.id,
    );
  });

  it('lets a platform admin read any item', async () => {
    await expect(controller.findOne('c2', userOf('org-9', 'ws-9', true))).resolves.toEqual(
      expect.objectContaining({ id: 'c2' }),
    );
  });
});
