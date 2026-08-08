'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('video_templates', {
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
      title: { type: Sequelize.STRING(150), allowNull: false },
      videoUrl: { type: Sequelize.STRING(1000), allowNull: false },
      storageKey: { type: Sequelize.STRING(500), allowNull: false },
      thumbnailUrl: { type: Sequelize.STRING(1000), allowNull: true },
      aspectRatio: { type: Sequelize.STRING(20), allowNull: false, defaultValue: '16:9' },
      durationSeconds: { type: Sequelize.INTEGER, allowNull: true },
      visibility: {
        type: Sequelize.ENUM('private', 'team'),
        allowNull: false,
        defaultValue: 'private',
      },
    });

    await queryInterface.addIndex('video_templates', ['workspaceId', 'visibility']);
    await queryInterface.addIndex('video_templates', ['createdBy']);
    await queryInterface.addIndex('video_templates', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('video_templates');
  },
};
