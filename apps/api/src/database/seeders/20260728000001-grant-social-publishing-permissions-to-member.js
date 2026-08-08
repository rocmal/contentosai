'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Scheduled/automated social posting (Video Studio "Schedule Post") needs
 * the "member" role to create Content rows, connect a Meta account, and
 * create/cancel its own publishing jobs. The base
 * 20260101000001-seed-permissions-and-roles seeder already grants these on
 * a fresh database; this incremental seeder backfills the same grants onto
 * a database that seeded before this feature existed. Idempotent - skips
 * any (role, permission) pair that's already granted.
 */
const NEW_MEMBER_PERMISSION_SLUGS = [
  'content.create',
  'integrations.create',
  'integrations.read',
  'publishing.create',
  'publishing.delete',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const [memberRole] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE slug = 'member' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    if (!memberRole) {
      return;
    }

    const permissions = await queryInterface.sequelize.query(
      `SELECT id, slug FROM permissions WHERE slug IN (:slugs)`,
      { replacements: { slugs: NEW_MEMBER_PERMISSION_SLUGS }, type: Sequelize.QueryTypes.SELECT },
    );

    const existingGrants = await queryInterface.sequelize.query(
      `SELECT permissionId FROM role_permissions WHERE roleId = :roleId`,
      { replacements: { roleId: memberRole.id }, type: Sequelize.QueryTypes.SELECT },
    );
    const alreadyGrantedIds = new Set(existingGrants.map((row) => row.permissionId));

    const rowsToInsert = permissions
      .filter((permission) => !alreadyGrantedIds.has(permission.id))
      .map((permission) => ({
        id: uuidv4(),
        roleId: memberRole.id,
        permissionId: permission.id,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        version: 0,
      }));

    if (rowsToInsert.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rowsToInsert);
    }
  },

  async down(queryInterface, Sequelize) {
    const [memberRole] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE slug = 'member' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    if (!memberRole) {
      return;
    }

    const permissions = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE slug IN (:slugs)`,
      { replacements: { slugs: NEW_MEMBER_PERMISSION_SLUGS }, type: Sequelize.QueryTypes.SELECT },
    );

    await queryInterface.bulkDelete('role_permissions', {
      roleId: memberRole.id,
      permissionId: permissions.map((permission) => permission.id),
    });
  },
};
