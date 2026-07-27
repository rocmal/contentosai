'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('media_assets', {
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
      fileName: { type: Sequelize.STRING(255), allowNull: false },
      storageKey: { type: Sequelize.STRING(500), allowNull: false },
      url: { type: Sequelize.STRING(1000), allowNull: false },
      mimeType: { type: Sequelize.STRING(150), allowNull: false },
      sizeBytes: { type: Sequelize.INTEGER, allowNull: false },
      type: {
        type: Sequelize.ENUM('image', 'video', 'audio', 'document'),
        allowNull: false,
      },
    });

    await queryInterface.addIndex('media_assets', ['workspaceId']);
    await queryInterface.addIndex('media_assets', ['type']);
    await queryInterface.addIndex('media_assets', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('media_assets');
  },
};
