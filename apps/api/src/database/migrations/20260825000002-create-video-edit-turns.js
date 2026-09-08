'use strict';

const { baseColumns } = require('./_helpers/base-columns');
const { referenceCharsetCollate } = require('./_helpers/reference-collation');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('video_edit_turns', {
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
      sessionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'video_edit_sessions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      parentTurnId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'video_edit_turns', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      providerTurnId: { type: Sequelize.STRING(255), allowNull: false },
      prompt: { type: Sequelize.TEXT, allowNull: false },
      task: {
        type: Sequelize.ENUM('text_to_video', 'image_to_video', 'reference_to_video', 'edit'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('in_progress', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'in_progress',
      },
      delivery: {
        type: Sequelize.ENUM('inline', 'uri'),
        allowNull: false,
        defaultValue: 'uri',
      },
      sourceUri: { type: Sequelize.STRING(1000), allowNull: true },
      mediaAssetId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'media_assets', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      editable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      failureReason: { type: Sequelize.TEXT, allowNull: true },
    }, await referenceCharsetCollate(queryInterface));

    await queryInterface.addIndex('video_edit_turns', ['sessionId']);
    await queryInterface.addIndex('video_edit_turns', ['parentTurnId']);
    // Vendor turn ids are the idempotency key for webhook/poll convergence.
    await queryInterface.addIndex('video_edit_turns', ['providerTurnId'], {
      unique: true,
      name: 'video_edit_turns_provider_turn_id_unique',
    });
    // Supports the reconciliation sweep for stale in-progress turns.
    await queryInterface.addIndex('video_edit_turns', ['status', 'createdAt'], {
      name: 'video_edit_turns_status_created_at',
    });
    await queryInterface.addIndex('video_edit_turns', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('video_edit_turns');
  },
};
