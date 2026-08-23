'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('video_projects', {
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
      title: { type: Sequelize.STRING(150), allowNull: false, defaultValue: 'Untitled video' },
      source: {
        type: Sequelize.ENUM('prompt', 'upload', 'templates', 'scenes'),
        allowNull: false,
        defaultValue: 'scenes',
      },
      status: {
        type: Sequelize.ENUM('draft', 'ready'),
        allowNull: false,
        defaultValue: 'draft',
      },
      // Array of StudioScene-shaped objects (id, visualUrl, visualType,
      // durationSeconds, focalXPct, focalYPct, filter, motion) - stored
      // whole, matching the avatars.tags precedent for a JSON array column
      // that's always read/written together, never queried per-element.
      scenes: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
      aspectRatio: { type: Sequelize.STRING(20), allowNull: false, defaultValue: '16:9' },
      transition: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'none' },
      narrationText: { type: Sequelize.TEXT, allowNull: true },
      narrationVoiceId: { type: Sequelize.STRING(150), allowNull: true },
      narrationGender: { type: Sequelize.STRING(20), allowNull: true },
      narrationLanguage: { type: Sequelize.STRING(10), allowNull: true },
      finalAssetId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'media_assets', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
    });

    await queryInterface.addIndex('video_projects', ['workspaceId', 'status']);
    await queryInterface.addIndex('video_projects', ['createdBy']);
    await queryInterface.addIndex('video_projects', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('video_projects');
  },
};
