'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      ...baseColumns(),
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      passwordHash: { type: Sequelize.STRING(255), allowNull: true },
      firstName: { type: Sequelize.STRING(100), allowNull: false },
      lastName: { type: Sequelize.STRING(100), allowNull: false },
      avatarUrl: { type: Sequelize.STRING(500), allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'invited', 'suspended'),
        allowNull: false,
        defaultValue: 'invited',
      },
      isEmailVerified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      emailVerifiedAt: { type: Sequelize.DATE, allowNull: true },
      lastLoginAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('users', ['status']);
    await queryInterface.addIndex('users', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
