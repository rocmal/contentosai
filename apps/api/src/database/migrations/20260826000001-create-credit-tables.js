'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('video_credit_wallets', {
      ...baseColumns(),
      organizationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      plan: { type: Sequelize.STRING(100), allowNull: false },
      periodStart: { type: Sequelize.DATE, allowNull: false },
      periodEnd: { type: Sequelize.DATE, allowNull: false },
      grantedCredits: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reservedCredits: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      consumedCredits: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });

    // One wallet per org per period; the unique index is what stops a double
    // grant from silently doubling somebody's allowance.
    await queryInterface.addIndex('video_credit_wallets', ['organizationId', 'periodStart'], {
      unique: true,
      name: 'video_credit_wallets_org_period_unique',
    });
    await queryInterface.addIndex('video_credit_wallets', ['organizationId', 'periodEnd']);

    await queryInterface.createTable('video_credit_transactions', {
      ...baseColumns(),
      walletId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'video_credit_wallets', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      organizationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('grant', 'reserve', 'commit', 'refund', 'expire'),
        allowNull: false,
      },
      credits: { type: Sequelize.INTEGER, allowNull: false },
      reservationId: { type: Sequelize.UUID, allowNull: true },
      feature: { type: Sequelize.STRING(150), allowNull: true },
      modelId: { type: Sequelize.STRING(150), allowNull: true },
      vendorCostUsd: { type: Sequelize.DECIMAL(12, 6), allowNull: true },
      reason: { type: Sequelize.TEXT, allowNull: true },
    });

    // A reservation may be settled exactly once in each direction. This index
    // is the database-level guarantee behind the idempotent commit/refund.
    await queryInterface.addIndex('video_credit_transactions', ['reservationId', 'type'], {
      unique: true,
      name: 'video_credit_transactions_reservation_type_unique',
    });
    await queryInterface.addIndex('video_credit_transactions', ['walletId', 'createdAt']);
    await queryInterface.addIndex('video_credit_transactions', ['organizationId', 'createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('video_credit_transactions');
    await queryInterface.dropTable('video_credit_wallets');
  },
};
