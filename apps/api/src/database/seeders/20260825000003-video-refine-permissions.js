'use strict';

const { randomUUID } = require('crypto');

const PERMISSIONS = [
  { name: 'Refine Video Turn', slug: 'video.refine', module: 'video' },
  { name: 'Read Video Sessions', slug: 'video.read', module: 'video' },
];

/** Roles that receive the new permissions. Owner/Admin get them because they
 *  hold every video permission already; Member gets them because refining is
 *  the ordinary editing action, not an administrative one. */
const GRANTED_ROLE_SLUGS = ['owner', 'admin', 'member'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    for (const permission of PERMISSIONS) {
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM permissions WHERE slug = :slug LIMIT 1',
        { replacements: { slug: permission.slug }, type: Sequelize.QueryTypes.SELECT },
      );

      const permissionId = existing ? existing.id : randomUUID();
      if (!existing) {
        await queryInterface.bulkInsert('permissions', [
          { id: permissionId, ...permission, description: null, createdAt: now, updatedAt: now, version: 0 },
        ]);
      }

      const roles = await queryInterface.sequelize.query(
        'SELECT id FROM roles WHERE slug IN (:slugs)',
        {
          replacements: { slugs: GRANTED_ROLE_SLUGS },
          type: Sequelize.QueryTypes.SELECT,
        },
      );

      for (const role of roles) {
        const [link] = await queryInterface.sequelize.query(
          'SELECT id FROM role_permissions WHERE roleId = :roleId AND permissionId = :permissionId LIMIT 1',
          {
            replacements: { roleId: role.id, permissionId },
            type: Sequelize.QueryTypes.SELECT,
          },
        );
        if (!link) {
          await queryInterface.bulkInsert('role_permissions', [
            {
              id: randomUUID(),
              roleId: role.id,
              permissionId,
              createdAt: now,
              updatedAt: now,
              version: 0,
            },
          ]);
        }
      }
    }
  },

  async down(queryInterface) {
    const slugs = PERMISSIONS.map((permission) => permission.slug);
    await queryInterface.sequelize.query(
      'DELETE FROM role_permissions WHERE permissionId IN (SELECT id FROM permissions WHERE slug IN (:slugs))',
      { replacements: { slugs } },
    );
    await queryInterface.bulkDelete('permissions', { slug: slugs });
  },
};
