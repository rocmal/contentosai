'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('integrations', {
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
      provider: { type: Sequelize.STRING(100), allowNull: false },
      status: {
        type: Sequelize.ENUM('connected', 'disconnected'),
        allowNull: false,
        defaultValue: 'disconnected',
      },
      // Ciphertext only - never decrypted back into an API response.
      encryptedCredentials: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('integrations', ['workspaceId']);
    await queryInterface.addIndex('integrations', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('integrations');
  },
};
