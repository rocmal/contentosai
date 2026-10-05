'use strict';

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

/**
 * Gives the platform owner a real super-admin login on production, replacing
 * the demo admin account whose password was public.
 *
 * - The account is created with a random password nobody knows, so there is no
 *   credential in the repo: the owner signs in by using "Forgot password" on
 *   the login page to set one.
 * - The user is added to the existing admin organization as `super-admin`
 *   (the demo admin's organization, `lumora-demo`); if no organization exists
 *   yet, one named "Lumora" is created with this user as its owner.
 * - Seeders re-run on every deploy, so everything here only fills in what is
 *   missing and never touches an existing user's password.
 * - Runs in production, or anywhere OWNER_ADMIN_EMAIL is set explicitly; local
 *   dev and CI are left alone.
 *
 * Override the address with OWNER_ADMIN_EMAIL.
 */
const DEFAULT_OWNER_EMAIL = 'puneetmehra24@gmail.com';
const SALT_ROUNDS = 12;

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
    if (process.env.NODE_ENV !== 'production' && !process.env.OWNER_ADMIN_EMAIL) return;

    const email = (process.env.OWNER_ADMIN_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
    const now = new Date();

    const superAdminRole = await findOne(queryInterface, Sequelize, 'roles', { slug: 'super-admin' });
    if (!superAdminRole) {
      throw new Error('Role "super-admin" not found - run the 20260101000001 permissions/roles seeder first.');
    }

    let user = await findOne(queryInterface, Sequelize, 'users', { email });
    if (!user) {
      const id = uuidv4();
      await queryInterface.bulkInsert('users', [
        {
          id,
          email,
          // Unguessable on purpose - the owner sets a real password via "Forgot password".
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS),
          firstName: 'Puneet',
          lastName: 'Mehra',
          avatarUrl: null,
          status: 'active',
          isEmailVerified: true,
          emailVerifiedAt: now,
          lastLoginAt: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: null,
          updatedBy: null,
          version: 0,
        },
      ]);
      user = { id };
    }

    let organization = await findOne(queryInterface, Sequelize, 'organizations', { slug: 'lumora-demo' });
    if (!organization) {
      organization = await findOne(queryInterface, Sequelize, 'organizations', { slug: 'lumora' });
    }
    if (!organization) {
      const organizationId = uuidv4();
      await queryInterface.bulkInsert('organizations', [
        {
          id: organizationId,
          name: 'Lumora',
          slug: 'lumora',
          ownerId: user.id,
          status: 'active',
          description: 'Platform owner organization.',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: user.id,
          updatedBy: user.id,
          version: 0,
        },
      ]);
      organization = { id: organizationId };
    }

    const workspace = await findOne(queryInterface, Sequelize, 'workspaces', { organizationId: organization.id });
    if (!workspace) {
      await queryInterface.bulkInsert('workspaces', [
        {
          id: uuidv4(),
          organizationId: organization.id,
          name: 'Default',
          slug: 'default',
          description: 'Default workspace.',
          status: 'active',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: user.id,
          updatedBy: user.id,
          version: 0,
        },
      ]);
    }

    const membership = await findOne(queryInterface, Sequelize, 'organization_members', {
      organizationId: organization.id,
      userId: user.id,
    });
    if (!membership) {
      await queryInterface.bulkInsert('organization_members', [
        {
          id: uuidv4(),
          organizationId: organization.id,
          userId: user.id,
          roleId: superAdminRole.id,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: user.id,
          updatedBy: user.id,
          version: 0,
        },
      ]);
    } else if (membership.roleId !== superAdminRole.id) {
      await queryInterface.sequelize.query('UPDATE organization_members SET roleId = :roleId, updatedAt = :now WHERE id = :id', {
        replacements: { roleId: superAdminRole.id, now, id: membership.id },
      });
    }
  },

  // Deliberately a no-op: rolling back must never delete the owner's account.
  async down() {},
};
