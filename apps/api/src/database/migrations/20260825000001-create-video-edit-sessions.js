'use strict';

const { baseColumns } = require('./_helpers/base-columns');
const { referenceCharsetCollate } = require('./_helpers/reference-collation');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('video_edit_sessions', {
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
      title: { type: Sequelize.STRING(200), allowNull: false },
      provider: { type: Sequelize.STRING(100), allowNull: false },
      modelId: { type: Sequelize.STRING(150), allowNull: false },
      aspectRatio: {
        type: Sequelize.ENUM('16:9', '9:16'),
        allowNull: false,
        defaultValue: '9:16',
      },
      status: {
        type: Sequelize.ENUM('active', 'archived'),
        allowNull: false,
        defaultValue: 'active',
      },
      // Nullable and unconstrained on purpose: both point into
      // video_edit_turns, which references this table, so a FK either way
      // would be circular. Integrity is enforced in the application layer.
      rootTurnId: { type: Sequelize.UUID, allowNull: true },
      latestTurnId: { type: Sequelize.UUID, allowNull: true },
    }, await referenceCharsetCollate(queryInterface));

    await queryInterface.addIndex('video_edit_sessions', ['workspaceId']);
    await queryInterface.addIndex('video_edit_sessions', ['createdBy']);
    await queryInterface.addIndex('video_edit_sessions', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('video_edit_sessions');
  },
};
