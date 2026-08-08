'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('credit_wallets', {
      ...baseColumns(),
      organizationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      workspaceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'workspaces', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      // null = unlimited (Enterprise plan) - not represented as a large
      // number so a real cap can never be misread as "unlimited".
      balance: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      cycleStartAt: { type: Sequelize.DATE, allowNull: true },
      cycleEndAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('credit_wallets', ['workspaceId'], {
      unique: true,
      name: 'credit_wallets_workspace_unique',
    });
    await queryInterface.addIndex('credit_wallets', ['deletedAt']);

    await queryInterface.createTable('credit_transactions', {
      ...baseColumns(),
      organizationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      workspaceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'workspaces', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      // Negative = consumed, positive = granted/refunded.
      amount: { type: Sequelize.INTEGER, allowNull: false },
      reason: {
        type: Sequelize.ENUM(
          'generation.image',
          'generation.voice',
          'generation.video',
          'generation.character',
          'plan.initial_grant',
          'plan.monthly_grant',
          'refund',
          'admin.adjustment',
        ),
        allowNull: false,
      },
      relatedEntityId: { type: Sequelize.UUID, allowNull: true },
      // Wallet balance immediately after this transaction, for audit/debugging
      // without having to replay the whole ledger. Null when the wallet is
      // unlimited (Enterprise).
      balanceAfter: { type: Sequelize.INTEGER, allowNull: true },
    });
    await queryInterface.addIndex('credit_transactions', ['workspaceId', 'createdAt']);
    await queryInterface.addIndex('credit_transactions', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('credit_transactions');
    await queryInterface.dropTable('credit_wallets');
  },
};
