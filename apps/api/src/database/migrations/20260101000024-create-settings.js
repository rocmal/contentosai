'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('settings', {
      ...baseColumns(),
      organizationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      key: { type: Sequelize.STRING(150), allowNull: false },
      value: { type: Sequelize.JSON, allowNull: true },
    });

    await queryInterface.addIndex('settings', ['organizationId', 'key'], {
      unique: true,
      name: 'settings_organization_key_unique',
    });
    await queryInterface.addIndex('settings', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('settings');
  },
};
