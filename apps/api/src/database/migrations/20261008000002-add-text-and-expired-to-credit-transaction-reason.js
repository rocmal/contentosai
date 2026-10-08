'use strict';

const REASONS = [
  'generation.text',
  'generation.image',
  'generation.voice',
  'generation.video',
  'generation.character',
  'plan.initial_grant',
  'plan.monthly_grant',
  'plan.expired',
  'refund',
  'admin.adjustment',
];

const ORIGINAL_REASONS = REASONS.filter((r) => r !== 'generation.text' && r !== 'plan.expired');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // The original credit_transactions.reason enum was created without
    // 'generation.text' and 'plan.expired', which the code writes. Every text
    // generation (AI Studio, Co-pilot, agents) failed at the credit reserve with
    // "Data truncated for column 'reason'". Widening an ENUM is non-destructive.
    await queryInterface.changeColumn('credit_transactions', 'reason', {
      type: Sequelize.ENUM(...REASONS),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('credit_transactions', 'reason', {
      type: Sequelize.ENUM(...ORIGINAL_REASONS),
      allowNull: false,
    });
  },
};
