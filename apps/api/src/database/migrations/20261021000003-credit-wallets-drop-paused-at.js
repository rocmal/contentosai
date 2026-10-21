'use strict';

const { randomUUID } = require('crypto');

/**
 * Undoes "paused credits" (20261021000001), decided against the same day: each 30-day period now starts with a fresh
 * allotment and nothing carries over, so a lapsed plan's credits are removed again, as before. Any wallet the renewal
 * job paused in the meantime gets that treatment now - balance to 0, recorded as a plan.expired transaction, exactly
 * like CreditsService.expire - and the column is dropped.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const paused = await queryInterface.sequelize.query(
      `SELECT id, organizationId, workspaceId, balance FROM credit_wallets
        WHERE pausedAt IS NOT NULL AND deletedAt IS NULL AND balance IS NOT NULL AND balance > 0`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    for (const wallet of paused) {
      const now = new Date();
      await queryInterface.sequelize.query(
        'UPDATE credit_wallets SET balance = 0, updatedAt = :now, version = version + 1 WHERE id = :id',
        { replacements: { now, id: wallet.id } },
      );
      await queryInterface.bulkInsert('credit_transactions', [
        {
          id: randomUUID(),
          organizationId: wallet.organizationId,
          workspaceId: wallet.workspaceId,
          userId: null,
          amount: -Number(wallet.balance),
          reason: 'plan.expired',
          relatedEntityId: null,
          balanceAfter: 0,
          createdAt: now,
          updatedAt: now,
          version: 0,
        },
      ]);
    }

    await queryInterface.removeColumn('credit_wallets', 'pausedAt');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('credit_wallets', 'pausedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
};
