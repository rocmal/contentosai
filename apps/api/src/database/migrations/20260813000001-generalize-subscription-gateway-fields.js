'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Subscriptions were modeled Stripe-specifically before any gateway was
    // actually wired up. Now that Razorpay is the real integration, rename
    // the columns to be gateway-agnostic (PaymentProviderFactory picks the
    // gateway by name) and record which gateway a subscription belongs to.
    await queryInterface.renameColumn('subscriptions', 'stripeCustomerId', 'gatewayCustomerId');
    await queryInterface.renameColumn('subscriptions', 'stripeSubscriptionId', 'gatewaySubscriptionId');
    await queryInterface.addColumn('subscriptions', 'gatewayProvider', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscriptions', 'gatewayProvider');
    await queryInterface.renameColumn('subscriptions', 'gatewaySubscriptionId', 'stripeSubscriptionId');
    await queryInterface.renameColumn('subscriptions', 'gatewayCustomerId', 'stripeCustomerId');
  },
};
