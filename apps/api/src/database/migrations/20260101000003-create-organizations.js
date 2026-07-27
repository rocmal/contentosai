'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('organizations', {
      ...baseColumns(),
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      ownerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('active', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
      },
      description: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('organizations', ['ownerId']);
    await queryInterface.addIndex('organizations', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('organizations');
  },
};
