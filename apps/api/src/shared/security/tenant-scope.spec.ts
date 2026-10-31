import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  assertInOrganization,
  assertInWorkspace,
  assertOwnOrganization,
  organizationFilters,
  ownedBy,
  tenantScope,
  workspaceFilters,
} from './tenant-scope';

const customer = tenantScope({
  id: 'u1',
  email: 'owner@shop.in',
  organizationId: 'org-1',
  workspaceId: 'ws-1',
  roles: ['super-admin'],
  permissions: ['credits.manage'],
});
const admin = { ...customer, isPlatformAdmin: true };
const homeless = { organizationId: null, workspaceId: null, isPlatformAdmin: false };

describe('tenant scope', () => {
  it('lets a customer reach their own records only - others look "not found"', () => {
    const mine = { id: 'c1', organizationId: 'org-1', workspaceId: 'ws-1' };
    const theirs = { id: 'c2', organizationId: 'org-2', workspaceId: 'ws-2' };

    expect(assertInWorkspace(mine, customer)).toBe(mine);
    expect(() => assertInWorkspace(theirs, customer, 'Content')).toThrow(
      new NotFoundException('Content not found'),
    );
    expect(assertInOrganization(mine, customer)).toBe(mine);
    expect(() => assertInOrganization(theirs, customer)).toThrow(NotFoundException);
  });

  it('lets a platform admin reach every record', () => {
    expect(() => assertInWorkspace({ workspaceId: 'ws-2' }, admin)).not.toThrow();
    expect(() => assertOwnOrganization('org-2', admin)).not.toThrow();
  });

  it('refuses a record that has no workspace, and an account without one', () => {
    expect(() => assertInWorkspace({ workspaceId: null }, customer)).toThrow(NotFoundException);
    expect(() => assertInWorkspace({ workspaceId: 'ws-1' }, homeless)).toThrow(NotFoundException);
  });

  it('checks an organization id from the address', () => {
    expect(() => assertOwnOrganization('org-1', customer)).not.toThrow();
    expect(() => assertOwnOrganization('org-2', customer)).toThrow(NotFoundException);
  });

  it("narrows a list to the customer's workspace, overriding any workspace they asked for", () => {
    expect(workspaceFilters(customer, { projectId: 'p1', workspaceId: 'ws-2' })).toEqual({
      projectId: 'p1',
      workspaceId: 'ws-1',
    });
    expect(organizationFilters(customer, { organizationId: 'org-2' })).toEqual({
      organizationId: 'org-1',
    });
    expect(workspaceFilters(admin, { workspaceId: 'ws-2' })).toEqual({ workspaceId: 'ws-2' });
    expect(() => workspaceFilters(homeless)).toThrow(ForbiddenException);
  });

  it("puts new records in the caller's workspace, whatever the body says", () => {
    expect(ownedBy({ title: 'x', organizationId: 'org-2', workspaceId: 'ws-2' }, customer)).toEqual(
      {
        title: 'x',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
      },
    );
    expect(ownedBy({ title: 'x', organizationId: 'org-2', workspaceId: 'ws-2' }, admin)).toEqual({
      title: 'x',
      organizationId: 'org-2',
      workspaceId: 'ws-2',
    });
  });
});
