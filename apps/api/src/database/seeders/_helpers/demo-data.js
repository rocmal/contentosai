'use strict';

/**
 * Demo accounts ship with publicly-known passwords (see
 * 20260101000002-seed-demo-users-and-organization.js), so they must never be
 * created on a production database. Local dev and CI seed them as before;
 * a production deploy skips them unless SEED_DEMO_DATA=true is set explicitly
 * (e.g. for a throwaway demo environment).
 */
function shouldSeedDemoData() {
  if (process.env.SEED_DEMO_DATA === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

module.exports = { shouldSeedDemoData };
