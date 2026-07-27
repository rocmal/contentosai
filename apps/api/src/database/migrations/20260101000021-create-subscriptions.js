'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscriptions', {
      ...baseColumns(),
      organizationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      plan: { type: Sequelize.STRING(100), allowNull: false },
      status: {
        type: Sequelize.ENUM('trialing', 'active', 'past_due', 'canceled'),
        allowNull: false,
        defaultValue: 'trialing',
      },
      stripeCustomerId: { type: Sequelize.STRING(255), allowNull: true },
      stripeSubscriptionId: { type: Sequelize.STRING(255), allowNull: true },
      currentPeriodEnd: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('subscriptions', ['organizationId'], {
      unique: true,
      name: 'subscriptions_organization_unique',
    });
    await queryInterface.addIndex('subscriptions', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subscriptions');
  },
};
