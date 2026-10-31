import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLATFORM_ADMIN_KEY } from '@common/decorators/platform-admin.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { PlatformAdminGuard } from './platform-admin.guard';

/** Every route that acts across customers. If one loses @PlatformAdminOnly(), any sign-up could use it again. */
import { CreditsController } from '@modules/credits/presentation/credits.controller';
import { UsersController } from '@modules/users/presentation/users.controller';
import { OrganizationsController } from '@modules/organizations/presentation/organizations.controller';
import { WorkspacesController } from '@modules/workspaces/presentation/workspaces.controller';
import { SubscriptionsController } from '@modules/billing/presentation/subscriptions.controller';
import { PermissionsController } from '@modules/permissions/presentation/permissions.controller';
import { IntegrationsController } from '@modules/integrations/presentation/integrations.controller';
import { AuditLogsController } from '@modules/audit/presentation/audit-logs.controller';
import { StorageController } from '@modules/storage/presentation/storage.controller';
import { VideoCreditsController } from '@modules/video-credits/presentation/credits.controller';

const ADMIN_ONLY: [string, { prototype: object }, string[]][] = [
  ['credits', CreditsController, ['adjust']],
  ['users', UsersController, ['create', 'findAll', 'remove']],
  ['organizations', OrganizationsController, ['create', 'remove']],
  ['workspaces', WorkspacesController, ['create', 'remove']],
  ['subscriptions', SubscriptionsController, ['create', 'update', 'remove']],
  ['permissions', PermissionsController, ['create', 'update', 'remove']],
  ['integrations', IntegrationsController, ['create', 'findAll', 'findOne', 'update', 'remove']],
  ['audit logs', AuditLogsController, ['findAll', 'findOne']],
  ['storage', StorageController, ['remove']],
  ['video credits', VideoCreditsController, ['wallet', 'quote']],
];

const contextFor = (user: Partial<AuthenticatedUser> | undefined, adminOnly: boolean) =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    adminOnly,
  }) as unknown as ExecutionContext & { adminOnly: boolean };

describe('PlatformAdminGuard', () => {
  const reflectorFor = (adminOnly: boolean) =>
    ({ getAllAndOverride: jest.fn().mockReturnValue(adminOnly) }) as unknown as Reflector;

  it('lets every signed-in user through ordinary routes', () => {
    expect(
      new PlatformAdminGuard(reflectorFor(false)).canActivate(contextFor({ id: 'u1' }, false)),
    ).toBe(true);
  });

  it('refuses a workspace super-admin on a platform-admin route', () => {
    const owner = { id: 'u1', roles: ['super-admin'], permissions: ['credits.manage'] };
    expect(() =>
      new PlatformAdminGuard(reflectorFor(true)).canActivate(contextFor(owner, true)),
    ).toThrow(new ForbiddenException('Only Lumora platform admins can do this.'));
  });

  it('lets a platform admin through', () => {
    expect(
      new PlatformAdminGuard(reflectorFor(true)).canActivate(
        contextFor({ id: 'u9', isPlatformAdmin: true }, true),
      ),
    ).toBe(true);
  });
});

describe('routes that act across customers are platform-admin only', () => {
  it.each(ADMIN_ONLY)('%s', (_name, controller, methods) => {
    for (const method of methods) {
      const handler = (controller.prototype as Record<string, unknown>)[method];
      expect(typeof handler).toBe('function');
      expect([method, Reflect.getMetadata(PLATFORM_ADMIN_KEY, handler as object)]).toEqual([
        method,
        true,
      ]);
    }
  });
});
