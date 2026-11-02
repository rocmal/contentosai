'use strict';

/**
 * 30-day periods a customer already has after the current one, so a platform admin can give several months at once
 * (until the payment gateway is live). The renewal job starts the next period - fresh credits, no carry-over - while
 * any are left, and only lets the plan lapse when none are.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subscriptions', 'prepaidPeriods', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscriptions', 'prepaidPeriods');
  },
};
