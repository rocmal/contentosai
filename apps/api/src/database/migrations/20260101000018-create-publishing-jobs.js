'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('publishing_jobs', {
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
      contentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'content_items', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      platform: { type: Sequelize.STRING(100), allowNull: false },
      status: {
        type: Sequelize.ENUM('scheduled', 'published', 'failed'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      scheduledAt: { type: Sequelize.DATE, allowNull: true },
      publishedAt: { type: Sequelize.DATE, allowNull: true },
      externalPostId: { type: Sequelize.STRING(255), allowNull: true },
    });

    await queryInterface.addIndex('publishing_jobs', ['workspaceId']);
    await queryInterface.addIndex('publishing_jobs', ['contentId']);
    await queryInterface.addIndex('publishing_jobs', ['status']);
    await queryInterface.addIndex('publishing_jobs', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('publishing_jobs');
  },
};
