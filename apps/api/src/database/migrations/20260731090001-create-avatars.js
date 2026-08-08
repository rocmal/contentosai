'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('avatars', {
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
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(180), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      imageUrl: { type: Sequelize.STRING(1000), allowNull: false },
      thumbnailUrl: { type: Sequelize.STRING(1000), allowNull: true },
      category: { type: Sequelize.ENUM('business', 'marketing', 'education', 'custom'), allowNull: false },
      gender: { type: Sequelize.ENUM('female', 'male', 'non_binary', 'unknown'), allowNull: false },
      language: { type: Sequelize.STRING(20), allowNull: true },
      tags: { type: Sequelize.JSON, allowNull: false },
      voiceId: { type: Sequelize.STRING(150), allowNull: true },
      emotionDefault: { type: Sequelize.STRING(80), allowNull: true },
      ageGroup: {
        type: Sequelize.ENUM('young_adult', 'adult', 'middle_aged', 'senior', 'unknown'),
        allowNull: false,
      },
      isFavorite: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      isPublic: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      isArchived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      qualityScore: { type: Sequelize.INTEGER, allowNull: true },
      provider: { type: Sequelize.STRING(80), allowNull: false },
      providerAvatarId: { type: Sequelize.STRING(255), allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: false },
    });

    await queryInterface.addIndex('avatars', ['workspaceId', 'slug'], { unique: true });
    await queryInterface.addIndex('avatars', ['workspaceId', 'category']);
    await queryInterface.addIndex('avatars', ['workspaceId', 'isFavorite']);
    await queryInterface.addIndex('avatars', ['workspaceId', 'isArchived']);
    await queryInterface.addIndex('avatars', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('avatars');
  },
};
