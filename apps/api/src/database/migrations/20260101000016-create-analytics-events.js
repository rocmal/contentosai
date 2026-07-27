'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('analytics_events', {
      ...baseColumns(),
      organizationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      workspaceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'workspaces', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      eventName: { type: Sequelize.STRING(150), allowNull: false },
      entityType: { type: Sequelize.STRING(100), allowNull: true },
      entityId: { type: Sequelize.UUID, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      occurredAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('analytics_events', ['workspaceId']);
    await queryInterface.addIndex('analytics_events', ['eventName']);
    await queryInterface.addIndex('analytics_events', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('analytics_events');
  },
};
