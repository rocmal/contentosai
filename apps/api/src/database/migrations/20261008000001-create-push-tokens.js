'use strict';

const { baseColumns } = require('./_helpers/base-columns');
const { referenceCharsetCollate } = require('./_helpers/reference-collation');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // One row per phone a person has signed in on. The token is the Expo push
    // token ("ExponentPushToken[...]"); it is unique, and moves to whoever signed in last.
    await queryInterface.createTable('push_tokens', {
      ...baseColumns(),
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      token: { type: Sequelize.STRING(255), allowNull: false },
      platform: { type: Sequelize.STRING(20), allowNull: false },
    }, await referenceCharsetCollate(queryInterface));

    await queryInterface.addIndex('push_tokens', ['token'], { unique: true });
    await queryInterface.addIndex('push_tokens', ['userId']);
    await queryInterface.addIndex('push_tokens', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('push_tokens');
  },
};
