import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';

/** Whose data a request may touch: the caller's organization and workspace, or everything for a platform admin. */
export interface TenantScope {
  organizationId: string | null;
  workspaceId: string | null;
  isPlatformAdmin: boolean;
}

export function tenantScope(user: AuthenticatedUser): TenantScope {
  return {
    organizationId: user.organizationId,
    workspaceId: user.workspaceId,
    isPlatformAdmin: user.isPlatformAdmin === true,
  };
}

/** A record of another customer looks exactly like one that does not exist - no hint that the id is real. */
export function assertInWorkspace<T extends { workspaceId?: string | null }>(
  record: T,
  scope: TenantScope,
  what = 'Item',
): T {
  if (scope.isPlatformAdmin) return record;
  if (!scope.workspaceId || record.workspaceId !== scope.workspaceId) {
    throw new NotFoundException(`${what} not found`);
  }
  return record;
}

export function assertInOrganization<T extends { organizationId?: string | null }>(
  record: T,
  scope: TenantScope,
  what = 'Item',
): T {
  if (scope.isPlatformAdmin) return record;
  if (!scope.organizationId || record.organizationId !== scope.organizationId) {
    throw new NotFoundException(`${what} not found`);
  }
  return record;
}

/** A list's filters, narrowed to the caller's workspace (a platform admin gets what was asked for). */
export function workspaceFilters(
  scope: TenantScope,
  requested: Record<string, unknown> = {},
): Record<string, unknown> {
  if (scope.isPlatformAdmin) return requested;
  if (!scope.workspaceId)
    throw new ForbiddenException('Your account is not attached to a workspace yet.');
  return { ...requested, workspaceId: scope.workspaceId };
}

export function organizationFilters(
  scope: TenantScope,
  requested: Record<string, unknown> = {},
): Record<string, unknown> {
  if (scope.isPlatformAdmin) return requested;
  if (!scope.organizationId) {
    throw new ForbiddenException('Your account is not attached to an organization yet.');
  }
  return { ...requested, organizationId: scope.organizationId };
}

/** The organization and workspace a new record belongs to: always the caller's - whatever the request body says -
 * unless a platform admin names others. */
export function ownedBy<T extends { organizationId?: string; workspaceId?: string }>(
  body: T,
  scope: TenantScope,
): T & { organizationId: string; workspaceId: string } {
  if (scope.isPlatformAdmin && body.organizationId && body.workspaceId) {
    return body as T & { organizationId: string; workspaceId: string };
  }
  if (!scope.organizationId || !scope.workspaceId) {
    throw new ForbiddenException('Your account is not attached to a workspace yet.');
  }
  return { ...body, organizationId: scope.organizationId, workspaceId: scope.workspaceId };
}

/** An organization id from the address must be the caller's own (a platform admin may name any). */
export function assertOwnOrganization(organizationId: string, scope: TenantScope): void {
  if (scope.isPlatformAdmin) return;
  if (!scope.organizationId || organizationId !== scope.organizationId) {
    throw new NotFoundException('Organization not found');
  }
}
