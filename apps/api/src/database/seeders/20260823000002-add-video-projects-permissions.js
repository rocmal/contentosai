'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seeds the "video-projects" permission catalogue (create/read/update/
 * delete) and grants all four to both "member" and "super-admin" - unlike
 * video-templates, a project needs update too (it's the auto-save target
 * as someone works in the Scene Builder), not just create/read/delete.
 * Idempotent, so it's also correct to run against a database that somehow
 * already has some of these permissions.
 */
const ACTIONS = ['create', 'read', 'update', 'delete'];

function titleCase(value) {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const existingPermissions = await queryInterface.sequelize.query(
      `SELECT id, slug FROM permissions WHERE module = 'video-projects'`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const existingSlugs = new Set(existingPermissions.map((p) => p.slug));

    const newPermissionRows = ACTIONS.filter((action) => !existingSlugs.has(`video-projects.${action}`)).map(
      (action) => ({
        id: uuidv4(),
        name: `${titleCase(action)} Video Projects`,
        slug: `video-projects.${action}`,
        module: 'video-projects',
        description: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        version: 0,
      }),
    );
    if (newPermissionRows.length > 0) {
      await queryInterface.bulkInsert('permissions', newPermissionRows);
    }

    const allPermissions = await queryInterface.sequelize.query(
      `SELECT id, slug FROM permissions WHERE module = 'video-projects'`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    const [superAdminRole] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE slug = 'super-admin' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const [memberRole] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE slug = 'member' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    const grants = [];
    for (const role of [superAdminRole, memberRole].filter(Boolean)) {
      const existingGrants = await queryInterface.sequelize.query(
        `SELECT permissionId FROM role_permissions WHERE roleId = :roleId`,
        { replacements: { roleId: role.id }, type: Sequelize.QueryTypes.SELECT },
      );
      const alreadyGrantedIds = new Set(existingGrants.map((g) => g.permissionId));

      for (const permission of allPermissions) {
        if (!alreadyGrantedIds.has(permission.id)) {
          grants.push({
            id: uuidv4(),
            roleId: role.id,
            permissionId: permission.id,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            createdBy: null,
            updatedBy: null,
            version: 0,
          });
        }
      }
    }

    if (grants.length > 0) {
      await queryInterface.bulkInsert('role_permissions', grants);
    }
  },

  async down(queryInterface, Sequelize) {
    const permissions = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE module = 'video-projects'`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const permissionIds = permissions.map((p) => p.id);
    if (permissionIds.length > 0) {
      await queryInterface.bulkDelete('role_permissions', { permissionId: permissionIds });
      await queryInterface.bulkDelete('permissions', { id: permissionIds });
    }
  },
};
