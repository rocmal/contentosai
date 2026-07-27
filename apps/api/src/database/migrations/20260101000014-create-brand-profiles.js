'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('brand_profiles', {
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
      industry: { type: Sequelize.STRING(150), allowNull: true },
      toneOfVoice: { type: Sequelize.STRING(150), allowNull: true },
      brandColors: { type: Sequelize.JSON, allowNull: true },
      logoUrl: { type: Sequelize.STRING(500), allowNull: true },
      guidelines: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('brand_profiles', ['workspaceId']);
    await queryInterface.addIndex('brand_profiles', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('brand_profiles');
  },
};
