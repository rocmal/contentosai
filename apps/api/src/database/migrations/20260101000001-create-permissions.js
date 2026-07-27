'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('permissions', {
      ...baseColumns(),
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      module: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('permissions', ['module']);
    await queryInterface.addIndex('permissions', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permissions');
  },
};
