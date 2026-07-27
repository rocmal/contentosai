'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      ...baseColumns(),
      organizationId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      isSystem: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    });

    await queryInterface.addIndex('roles', ['organizationId', 'slug'], {
      unique: true,
      name: 'roles_organization_slug_unique',
    });
    await queryInterface.addIndex('roles', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  },
};
