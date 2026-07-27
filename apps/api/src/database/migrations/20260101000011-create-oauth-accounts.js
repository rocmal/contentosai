'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('oauth_accounts', {
      ...baseColumns(),
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      provider: { type: Sequelize.ENUM('google', 'github', 'microsoft'), allowNull: false },
      providerAccountId: { type: Sequelize.STRING(255), allowNull: false },
    });

    await queryInterface.addIndex('oauth_accounts', ['provider', 'providerAccountId'], {
      unique: true,
      name: 'oauth_accounts_provider_account_unique',
    });
    await queryInterface.addIndex('oauth_accounts', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('oauth_accounts');
  },
};
