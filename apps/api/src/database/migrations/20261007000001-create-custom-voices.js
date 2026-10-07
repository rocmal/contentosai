'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // A voice the user recorded themselves in Voice Studio. The recording is
    // cloned at the provider (providerVoiceId is what text-to-speech uses); the
    // original sample is kept in storage so the clone can be rebuilt.
    await queryInterface.createTable('custom_voices', {
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
      name: { type: Sequelize.STRING(60), allowNull: false },
      provider: { type: Sequelize.STRING(50), allowNull: false },
      providerVoiceId: { type: Sequelize.STRING(150), allowNull: false },
      sampleStorageKey: { type: Sequelize.STRING(255), allowNull: true },
      // The person confirmed the recording is their own voice (or they have permission).
      consentConfirmedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('custom_voices', ['workspaceId']);
    await queryInterface.addIndex('custom_voices', ['createdBy']);
    await queryInterface.addIndex('custom_voices', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('custom_voices');
  },
};
