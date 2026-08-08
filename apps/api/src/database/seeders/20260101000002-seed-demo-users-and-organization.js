'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

/**
 * Creates a ready-to-log-in admin and a normal member user, plus the
 * organization/workspace/membership rows that give them somewhere to work.
 * Idempotent - safe to run against a database that already has these users
 * (e.g. after a partial seed run).
 *
 * Credentials (change immediately in any shared/deployed environment):
 *   Admin:  admin@lumora.ai / Admin@12345   (role: super-admin)
 *   Member: user@lumora.ai  / User@12345    (role: member)
 */
const ADMIN_EMAIL = 'admin@lumora.ai';
const ADMIN_PASSWORD = 'Admin@12345';
const MEMBER_EMAIL = 'user@lumora.ai';
const MEMBER_PASSWORD = 'User@12345';
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
    const now = new Date();

    let admin = await findOne(queryInterface, Sequelize, 'users', { email: ADMIN_EMAIL });
    if (!admin) {
      const adminId = uuidv4();
      await queryInterface.bulkInsert('users', [
        {
          id: adminId,
          email: ADMIN_EMAIL,
          passwordHash: await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS),
          firstName: 'Admin',
          lastName: 'User',
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
      admin = { id: adminId };
    }

    let member = await findOne(queryInterface, Sequelize, 'users', { email: MEMBER_EMAIL });
    if (!member) {
      const memberId = uuidv4();
      await queryInterface.bulkInsert('users', [
        {
          id: memberId,
          email: MEMBER_EMAIL,
          passwordHash: await bcrypt.hash(MEMBER_PASSWORD, SALT_ROUNDS),
          firstName: 'Normal',
          lastName: 'User',
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
      member = { id: memberId };
    }

    let organization = await findOne(queryInterface, Sequelize, 'organizations', { slug: 'lumora-demo' });
    if (!organization) {
      const organizationId = uuidv4();
      await queryInterface.bulkInsert('organizations', [
        {
          id: organizationId,
          name: 'Lumora Demo',
          slug: 'lumora-demo',
          ownerId: admin.id,
          status: 'active',
          description: 'Default demo organization seeded for local development.',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: admin.id,
          updatedBy: admin.id,
          version: 0,
        },
      ]);
      organization = { id: organizationId };
    }

    let workspace = await findOne(queryInterface, Sequelize, 'workspaces', {
      organizationId: organization.id,
      slug: 'default',
    });
    if (!workspace) {
      const workspaceId = uuidv4();
      await queryInterface.bulkInsert('workspaces', [
        {
          id: workspaceId,
          organizationId: organization.id,
          name: 'Default',
          slug: 'default',
          description: 'Default workspace seeded for local development.',
          status: 'active',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: admin.id,
          updatedBy: admin.id,
          version: 0,
        },
      ]);
      workspace = { id: workspaceId };
    }

    const superAdminRole = await findOne(queryInterface, Sequelize, 'roles', { slug: 'super-admin' });
    const memberRole = await findOne(queryInterface, Sequelize, 'roles', { slug: 'member' });
    if (!superAdminRole || !memberRole) {
      throw new Error(
        'Roles "super-admin"/"member" not found - run the 20260101000001-seed-permissions-and-roles seeder first.',
      );
    }

    const adminMembership = await findOne(queryInterface, Sequelize, 'organization_members', {
      organizationId: organization.id,
      userId: admin.id,
    });
    if (!adminMembership) {
      await queryInterface.bulkInsert('organization_members', [
        {
          id: uuidv4(),
          organizationId: organization.id,
          userId: admin.id,
          roleId: superAdminRole.id,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: admin.id,
          updatedBy: admin.id,
          version: 0,
        },
      ]);
    }

    const memberMembership = await findOne(queryInterface, Sequelize, 'organization_members', {
      organizationId: organization.id,
      userId: member.id,
    });
    if (!memberMembership) {
      await queryInterface.bulkInsert('organization_members', [
        {
          id: uuidv4(),
          organizationId: organization.id,
          userId: member.id,
          roleId: memberRole.id,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdBy: admin.id,
          updatedBy: admin.id,
          version: 0,
        },
      ]);
    }
  },

  async down(queryInterface) {
    const [organization] = await queryInterface.sequelize.query(
      `SELECT id FROM organizations WHERE slug = 'lumora-demo'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (organization) {
      await queryInterface.bulkDelete('organization_members', { organizationId: organization.id });
      await queryInterface.bulkDelete('workspaces', { organizationId: organization.id });
      await queryInterface.bulkDelete('organizations', { id: organization.id });
    }

    await queryInterface.bulkDelete('users', { email: [ADMIN_EMAIL, MEMBER_EMAIL] });
  },
};
