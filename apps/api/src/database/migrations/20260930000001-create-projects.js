'use strict';

const { baseColumns } = require('./_helpers/base-columns');
const { referenceCharsetCollate } = require('./_helpers/reference-collation');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'projects',
      {
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
        title: { type: Sequelize.STRING(200), allowNull: false },
        category: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'General' },
        description: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('in_progress', 'review', 'completed', 'archived'),
          allowNull: false,
          defaultValue: 'in_progress',
        },
      },
      await referenceCharsetCollate(queryInterface),
    );

    await queryInterface.addIndex('projects', ['workspaceId', 'status']);
    await queryInterface.addIndex('projects', ['campaignId']);
    await queryInterface.addIndex('projects', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('projects');
  },
};
