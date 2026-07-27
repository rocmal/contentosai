'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('calendar_events', {
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
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      startAt: { type: Sequelize.DATE, allowNull: false },
      endAt: { type: Sequelize.DATE, allowNull: true },
      contentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'content_items', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      campaignId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'campaigns', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
    });

    await queryInterface.addIndex('calendar_events', ['workspaceId']);
    await queryInterface.addIndex('calendar_events', ['contentId']);
    await queryInterface.addIndex('calendar_events', ['campaignId']);
    await queryInterface.addIndex('calendar_events', ['startAt']);
    await queryInterface.addIndex('calendar_events', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('calendar_events');
  },
};
