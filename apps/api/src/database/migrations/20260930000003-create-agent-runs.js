'use strict';

const { baseColumns } = require('./_helpers/base-columns');
const { referenceCharsetCollate } = require('./_helpers/reference-collation');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'agent_runs',
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
        agentId: { type: Sequelize.STRING(50), allowNull: false },
        input: { type: Sequelize.TEXT, allowNull: false },
        output: { type: Sequelize.TEXT('long'), allowNull: false },
        provider: { type: Sequelize.STRING(50), allowNull: false },
        model: { type: Sequelize.STRING(100), allowNull: false },
        complianceFlags: { type: Sequelize.JSON, allowNull: true },
      },
      await referenceCharsetCollate(queryInterface),
    );

    await queryInterface.addIndex('agent_runs', ['workspaceId', 'agentId']);
    await queryInterface.addIndex('agent_runs', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('agent_runs');
  },
};
