'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Baseline RBAC data every fresh Lumora database needs: the full permission
 * catalogue (one row per `<module>.<action>` slug guarded by a controller),
 * a "Super Admin" system role holding all of them, and a "Member" system
 * role with sane non-destructive defaults. Organizations can clone these
 * system roles (organizationId: null) into their own scoped roles via the
 * Roles API.
 */
const PERMISSIONS = [
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'users', action })),
  ...['read', 'update', 'delete', 'manage-members'].map((action) => ({
    module: 'organizations',
    action,
  })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'workspaces', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'roles', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'permissions', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'campaigns', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'content', action })),
  { module: 'ai', action: 'generate' },
  { module: 'image', action: 'generate' },
  { module: 'video', action: 'generate' },
  { module: 'voice', action: 'generate' },
  ...['upload', 'read', 'delete'].map((action) => ({ module: 'storage', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'brand', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'media', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'analytics', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'automation', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'publishing', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'calendar', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'notifications', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'billing', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'integrations', action })),
  ...['create', 'read', 'update', 'delete'].map((action) => ({ module: 'video-templates', action })),
  { module: 'audit', action: 'read' },
  ...['read', 'update', 'delete'].map((action) => ({ module: 'settings', action })),
];

const READ_ONLY_MEMBER_MODULES = [
  'organizations',
  'workspaces',
  'campaigns',
  'content',
  'brand',
  'media',
  'analytics',
  'automation',
  'publishing',
  'calendar',
  'notifications',
  'settings',
  'integrations',
  'video-templates',
];

function titleCase(value) {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const permissionRows = PERMISSIONS.map((permission) => ({
      id: uuidv4(),
      name: `${titleCase(permission.action)} ${titleCase(permission.module)}`,
      slug: `${permission.module}.${permission.action}`,
      module: permission.module,
      description: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
    }));

    await queryInterface.bulkInsert('permissions', permissionRows);

    const superAdminRoleId = uuidv4();
    const memberRoleId = uuidv4();

    await queryInterface.bulkInsert('roles', [
      {
        id: superAdminRoleId,
        organizationId: null,
        name: 'Super Admin',
        slug: 'super-admin',
        description: 'Full access to every resource across the platform.',
        isSystem: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        version: 0,
      },
      {
        id: memberRoleId,
        organizationId: null,
        name: 'Member',
        slug: 'member',
        description: 'Can generate/use AI content and read most resources.',
        isSystem: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        version: 0,
      },
    ]);

    const superAdminRolePermissions = permissionRows.map((permission) => ({
      id: uuidv4(),
      roleId: superAdminRoleId,
      permissionId: permission.id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
    }));

    const memberPermissionIds = permissionRows.filter(
      (permission) =>
        (READ_ONLY_MEMBER_MODULES.includes(permission.module) && permission.slug.endsWith('.read')) ||
        [
          'ai.generate',
          'image.generate',
          'video.generate',
          'voice.generate',
          'storage.upload',
          // Scheduled/automated social posting (Video Studio "Schedule Post"):
          // members can create the video's Content record, connect their own
          // Facebook/Instagram account, and create/cancel their own scheduled
          // publishing jobs.
          'content.create',
          'integrations.create',
          'publishing.create',
          'publishing.delete',
          // Save-as-template (Video Studio result screen): members can save
          // their own private/team templates and remove their own later.
          'video-templates.create',
          'video-templates.delete',
        ].includes(permission.slug),
    );

    const memberRolePermissions = memberPermissionIds.map((permission) => ({
      id: uuidv4(),
      roleId: memberRoleId,
      permissionId: permission.id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
    }));

    await queryInterface.bulkInsert('role_permissions', [
      ...superAdminRolePermissions,
      ...memberRolePermissions,
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('roles', { slug: ['super-admin', 'member'] });
    await queryInterface.bulkDelete('permissions', null, {});
  },
};
