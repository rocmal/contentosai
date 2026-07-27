'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('automation_workflows', {
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
      name: { type: Sequelize.STRING(200), allowNull: false },
      trigger: { type: Sequelize.STRING(150), allowNull: false },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'inactive',
      },
      config: { type: Sequelize.JSON, allowNull: true },
    });

    await queryInterface.addIndex('automation_workflows', ['workspaceId']);
    await queryInterface.addIndex('automation_workflows', ['status']);
    await queryInterface.addIndex('automation_workflows', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('automation_workflows');
  },
};
