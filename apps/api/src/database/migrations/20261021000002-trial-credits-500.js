'use strict';

const { randomUUID } = require('crypto');

/** Mirrors the TRIAL_CREDITS default in modules/credits/credits.constants.ts (migrations are plain JS). */
const TRIAL_CREDITS = 500;

/**
 * The signup trial grew from 150 to 500 credits (150 could not pay for one 180-credit AI video). Workspaces still on
 * the trial - never paid, subscription "trialing" - get the difference once, so everyone on the trial has had 500.
 * The top-up is TRIAL_CREDITS minus what the workspace was already granted at signup, so a workspace that somehow
 * got more is left alone. Recorded as a plan.initial_grant transaction for the credit history.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const wallets = await queryInterface.sequelize.query(
      `SELECT w.id, w.organizationId, w.workspaceId, w.balance
         FROM credit_wallets w
         JOIN subscriptions s ON s.organizationId = w.organizationId AND s.deletedAt IS NULL
        WHERE w.deletedAt IS NULL AND w.balance IS NOT NULL AND s.status = 'trialing'`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    for (const wallet of wallets) {
      const [granted] = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM credit_transactions
          WHERE workspaceId = :workspaceId AND reason = 'plan.initial_grant' AND deletedAt IS NULL`,
        { replacements: { workspaceId: wallet.workspaceId }, type: Sequelize.QueryTypes.SELECT },
      );
      const topUp = TRIAL_CREDITS - Number(granted.total);
      if (topUp <= 0) continue;

      const balanceAfter = Number(wallet.balance) + topUp;
      const now = new Date();
      await queryInterface.sequelize.query(
        'UPDATE credit_wallets SET balance = balance + :topUp, updatedAt = :now, version = version + 1 WHERE id = :id',
        { replacements: { topUp, now, id: wallet.id } },
      );
      await queryInterface.bulkInsert('credit_transactions', [
        {
          id: randomUUID(),
          organizationId: wallet.organizationId,
          workspaceId: wallet.workspaceId,
          userId: null,
          amount: topUp,
          reason: 'plan.initial_grant',
          relatedEntityId: null,
          balanceAfter,
          createdAt: now,
          updatedAt: now,
          version: 0,
        },
      ]);
    }
  },

  async down() {
    // Credits already handed out (and perhaps spent) are not taken back.
  },
};
