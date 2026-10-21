'use strict';

/**
 * When a self-serve plan is not renewed after its 30 days, its credits are now kept but paused (not spendable) until
 * the customer renews, instead of being removed. pausedAt marks that state; renewal clears it and carries the credits
 * forward.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('credit_wallets', 'pausedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('credit_wallets', 'pausedAt');
  },
};
