'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('avatar_usages', {
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
      avatarId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'avatars', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      projectId: { type: Sequelize.UUID, allowNull: true },
      campaignId: { type: Sequelize.UUID, allowNull: true },
      videoId: { type: Sequelize.UUID, allowNull: true },
      lastUsed: { type: Sequelize.DATE, allowNull: false },
      usageCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });

    await queryInterface.addIndex('avatar_usages', ['avatarId'], { unique: true });
    await queryInterface.addIndex('avatar_usages', ['workspaceId', 'lastUsed']);
    await queryInterface.addIndex('avatar_usages', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('avatar_usages');
  },
};
