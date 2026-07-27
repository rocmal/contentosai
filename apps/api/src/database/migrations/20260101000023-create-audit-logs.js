'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // No FK constraints on organizationId/userId: this log must never fail to
    // write because a referenced row was hard-deleted.
    await queryInterface.createTable('audit_logs', {
      ...baseColumns(),
      organizationId: { type: Sequelize.UUID, allowNull: true },
      userId: { type: Sequelize.UUID, allowNull: true },
      action: { type: Sequelize.STRING(150), allowNull: false },
      entityType: { type: Sequelize.STRING(150), allowNull: false },
      entityId: { type: Sequelize.UUID, allowNull: true },
      changes: { type: Sequelize.JSON, allowNull: true },
      ipAddress: { type: Sequelize.STRING(45), allowNull: true },
    });

    await queryInterface.addIndex('audit_logs', ['organizationId']);
    await queryInterface.addIndex('audit_logs', ['userId']);
    await queryInterface.addIndex('audit_logs', ['entityType', 'entityId']);
    await queryInterface.addIndex('audit_logs', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
