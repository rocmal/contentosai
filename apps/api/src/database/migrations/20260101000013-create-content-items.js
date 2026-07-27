'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('content_items', {
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
      campaignId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'campaigns', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      type: { type: Sequelize.ENUM('text', 'image', 'video', 'audio'), allowNull: false },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
      },
      aiGenerated: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      aiProvider: { type: Sequelize.STRING(100), allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
    });

    await queryInterface.addIndex('content_items', ['workspaceId']);
    await queryInterface.addIndex('content_items', ['campaignId']);
    await queryInterface.addIndex('content_items', ['status']);
    await queryInterface.addIndex('content_items', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('content_items');
  },
};
