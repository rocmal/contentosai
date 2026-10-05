'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remembers which renewal reminder (3 days / 1 day before the plan ends)
    // was last emailed and for which period, so the 6-hourly renewal job
    // never sends the same reminder twice.
    await queryInterface.addColumn('subscriptions', 'renewalReminderPeriodEnd', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('subscriptions', 'renewalReminderStage', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscriptions', 'renewalReminderStage');
    await queryInterface.removeColumn('subscriptions', 'renewalReminderPeriodEnd');
  },
};
