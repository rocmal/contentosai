'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seeds the "credits" permission catalogue (read/manage) and grants read to
 * both "member" and "super-admin", but "manage" (adjusting a wallet's
 * balance) only to "super-admin". Idempotent.
 */
const ACTIONS = ['read', 'manage'];
const MEMBER_ACTIONS = ['read'];

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
      `SELECT id, slug FROM permissions WHERE module = 'credits'`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const existingSlugs = new Set(existingPermissions.map((p) => p.slug));

    const newPermissionRows = ACTIONS.filter((action) => !existingSlugs.has(`credits.${action}`)).map(
      (action) => ({
        id: uuidv4(),
        name: `${titleCase(action)} Credits`,
        slug: `credits.${action}`,
        module: 'credits',
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
      `SELECT id, slug FROM permissions WHERE module = 'credits'`,
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
      const isMember = memberRole && role.id === memberRole.id;
      const relevantPermissions = allPermissions.filter((p) =>
        isMember ? MEMBER_ACTIONS.some((action) => p.slug === `credits.${action}`) : true,
      );

      const existingGrants = await queryInterface.sequelize.query(
        `SELECT permissionId FROM role_permissions WHERE roleId = :roleId`,
        { replacements: { roleId: role.id }, type: Sequelize.QueryTypes.SELECT },
      );
      const alreadyGrantedIds = new Set(existingGrants.map((g) => g.permissionId));

      for (const permission of relevantPermissions) {
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
      `SELECT id FROM permissions WHERE module = 'credits'`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const permissionIds = permissions.map((p) => p.id);
    if (permissionIds.length > 0) {
      await queryInterface.bulkDelete('role_permissions', { permissionId: permissionIds });
      await queryInterface.bulkDelete('permissions', { id: permissionIds });
    }
  },
};
