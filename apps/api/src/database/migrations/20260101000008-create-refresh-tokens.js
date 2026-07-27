'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      ...baseColumns(),
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      tokenHash: { type: Sequelize.STRING(255), allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      userAgent: { type: Sequelize.STRING(255), allowNull: true },
      ipAddress: { type: Sequelize.STRING(64), allowNull: true },
    });

    await queryInterface.addIndex('refresh_tokens', ['tokenHash'], { unique: true });
    await queryInterface.addIndex('refresh_tokens', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
  },
};
