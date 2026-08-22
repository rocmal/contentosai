'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * The base seeder only grants "member" a read on notifications
 * (READ_ONLY_MEMBER_MODULES), so a normal user gets 403 on
 * PATCH /notifications/:id/read and DELETE /notifications/:id - both of
 * which the mobile/desktop notifications UI needs for its own notifications.
 * Safe to grant broadly because NotificationsService now enforces
 * ownership (notification.userId === actorId) on every single-record
 * mutation, independent of this role grant. Idempotent - skips any
 * (role, permission) pair that's already granted.
 */
const NEW_MEMBER_PERMISSION_SLUGS = ['notifications.update', 'notifications.delete'];

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
