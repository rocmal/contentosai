'use strict';

const { v4: uuidv4 } = require('uuid');

const ACTIONS = ['create', 'read', 'update', 'delete'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const existingPermissions = await queryInterface.sequelize.query(
      `SELECT id, slug FROM permissions WHERE module = 'avatars'`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const existingSlugs = new Set(existingPermissions.map((permission) => permission.slug));

    const rows = ACTIONS.filter((action) => !existingSlugs.has(`avatars.${action}`)).map((action) => ({
      id: uuidv4(),
      name: `${action[0].toUpperCase()}${action.slice(1)} Avatars`,
      slug: `avatars.${action}`,
      module: 'avatars',
      description: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
    }));
    if (rows.length > 0) {
      await queryInterface.bulkInsert('permissions', rows);
    }

    const permissions = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE module = 'avatars'`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const roles = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE slug IN ('super-admin', 'member')`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    const grants = [];
    for (const role of roles) {
      const existingGrants = await queryInterface.sequelize.query(
        `SELECT permissionId FROM role_permissions WHERE roleId = :roleId`,
        { replacements: { roleId: role.id }, type: Sequelize.QueryTypes.SELECT },
      );
      const alreadyGranted = new Set(existingGrants.map((grant) => grant.permissionId));
      for (const permission of permissions) {
        if (!alreadyGranted.has(permission.id)) {
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
      `SELECT id FROM permissions WHERE module = 'avatars'`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const permissionIds = permissions.map((permission) => permission.id);
    if (permissionIds.length > 0) {
      await queryInterface.bulkDelete('role_permissions', { permissionId: permissionIds });
      await queryInterface.bulkDelete('permissions', { id: permissionIds });
    }
  },
};
