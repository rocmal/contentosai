'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('voice_templates', {
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
      name: { type: Sequelize.STRING(150), allowNull: false },
      provider: { type: Sequelize.STRING(80), allowNull: false },
      voiceId: { type: Sequelize.STRING(150), allowNull: false },
      language: { type: Sequelize.STRING(20), allowNull: false },
      visibility: {
        type: Sequelize.ENUM('private', 'team'),
        allowNull: false,
        defaultValue: 'private',
      },
    });

    await queryInterface.addIndex('voice_templates', ['workspaceId', 'visibility']);
    await queryInterface.addIndex('voice_templates', ['createdBy']);
    await queryInterface.addIndex('voice_templates', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('voice_templates');
  },
};
