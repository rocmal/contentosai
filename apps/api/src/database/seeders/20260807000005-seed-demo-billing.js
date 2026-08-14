'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Backfills a starter-plan subscription + fully-granted credit wallet for
 * the seeded demo organization ("lumora-demo"). This data didn't exist
 * before AuthService started auto-provisioning it for new registrations
 * (see 20260807000003-create-credits + the auth.service.ts registration
 * change) - without this, the pre-existing seeded admin/member demo users
 * would hit a 402 "Insufficient Credits" on every generation, since their
 * workspace has no wallet at all. Idempotent - safe to re-run.
 */
const PLAN = 'starter';
const STARTER_CREDITS = 2500;

async function findOne(queryInterface, Sequelize, table, where) {
  const columns = Object.keys(where)
    .map((key) => `${key} = :${key}`)
    .join(' AND ');
  const [row] = await queryInterface.sequelize.query(`SELECT * FROM ${table} WHERE ${columns} LIMIT 1`, {
    replacements: where,
    type: Sequelize.QueryTypes.SELECT,
  });
  return row ?? null;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const organization = await findOne(queryInterface, Sequelize, 'organizations', { slug: 'lumora-demo' });
    if (!organization) {
      // Demo org seeder hasn't run yet (or this isn't a dev DB with the demo
      // data at all) - nothing to backfill.
      return;
    }

    const admin = await findOne(queryInterface, Sequelize, 'users', { email: 'admin@lumora.ai' });
    const actorId = admin ? admin.id : null;

    const workspace = await findOne(queryInterface, Sequelize, 'workspaces', {
      organizationId: organization.id,
      slug: 'default',
    });
    if (!workspace) {
      return;
    }

    let subscription = await findOne(queryInterface, Sequelize, 'subscriptions', {
      organizationId: organization.id,
    });
    if (!subscription) {
      const subscriptionId = uuidv4();
      await queryInterface.bulkInsert('subscriptions', [
        {
          id: subscriptionId,
          organizationId: organization.id,
          plan: PLAN,
          status: 'trialing',
          gatewayProvider: null,
          gatewayCustomerId: null,
          gatewaySubscriptionId: null,
          currentPeriodEnd: oneMonthFromNow,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: actorId,
          updatedBy: actorId,
          version: 0,
        },
      ]);
    }

    let wallet = await findOne(queryInterface, Sequelize, 'credit_wallets', { workspaceId: workspace.id });
    if (!wallet) {
      const walletId = uuidv4();
      await queryInterface.bulkInsert('credit_wallets', [
        {
          id: walletId,
          organizationId: organization.id,
          workspaceId: workspace.id,
          balance: STARTER_CREDITS,
          cycleStartAt: now,
          cycleEndAt: oneMonthFromNow,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: actorId,
          updatedBy: actorId,
          version: 0,
        },
      ]);

      await queryInterface.bulkInsert('credit_transactions', [
        {
          id: uuidv4(),
          organizationId: organization.id,
          workspaceId: workspace.id,
          userId: actorId,
          amount: STARTER_CREDITS,
          reason: 'plan.initial_grant',
          relatedEntityId: null,
          balanceAfter: STARTER_CREDITS,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: actorId,
          updatedBy: actorId,
          version: 0,
        },
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    const organization = await findOne(queryInterface, Sequelize, 'organizations', { slug: 'lumora-demo' });
    if (!organization) return;

    const workspace = await findOne(queryInterface, Sequelize, 'workspaces', {
      organizationId: organization.id,
      slug: 'default',
    });

    await queryInterface.bulkDelete('subscriptions', { organizationId: organization.id });
    if (workspace) {
      await queryInterface.bulkDelete('credit_transactions', { workspaceId: workspace.id });
      await queryInterface.bulkDelete('credit_wallets', { workspaceId: workspace.id });
    }
  },
};
