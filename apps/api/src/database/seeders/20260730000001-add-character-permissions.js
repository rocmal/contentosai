'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Backfills the "character" permission (talking-avatar video generation) and
 * grants it to "member" and "super-admin", for a database that was already
 * seeded before Character Studio existed. On a fresh database this is a
 * no-op if 20260101000001-seed-permissions-and-roles already covers it.
 * Idempotent.
 */
const ACTIONS = ['generate'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const existingPermissions = await queryInterface.sequelize.query(
      `SELECT id, slug FROM permissions WHERE module = 'character'`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const existingSlugs = new Set(existingPermissions.map((p) => p.slug));

    const newPermissionRows = ACTIONS.filter((action) => !existingSlugs.has(`character.${action}`)).map(
      (action) => ({
        id: uuidv4(),
        name: `Generate Character Video`,
        slug: `character.${action}`,
        module: 'character',
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
      `SELECT id, slug FROM permissions WHERE module = 'character'`,
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
      `SELECT id FROM permissions WHERE module = 'character'`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const permissionIds = permissions.map((p) => p.id);
    if (permissionIds.length > 0) {
      await queryInterface.bulkDelete('role_permissions', { permissionId: permissionIds });
      await queryInterface.bulkDelete('permissions', { id: permissionIds });
    }
  },
};
