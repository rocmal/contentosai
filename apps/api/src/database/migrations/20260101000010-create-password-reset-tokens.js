'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('password_reset_tokens', {
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
      consumedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('password_reset_tokens', ['tokenHash'], { unique: true });
    await queryInterface.addIndex('password_reset_tokens', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('password_reset_tokens');
  },
};
