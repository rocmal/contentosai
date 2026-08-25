'use strict';

const { randomUUID } = require('crypto');

const PERMISSIONS = [
  { name: 'Read Credit Balance', slug: 'video-credits.read', module: 'video-credits', roles: ['owner', 'admin', 'member'] },
  { name: 'Manage Credit Grants', slug: 'video-credits.manage', module: 'video-credits', roles: ['owner', 'admin'] },
  { name: 'Manage Model Catalog', slug: 'video-catalog.manage', module: 'video-credits', roles: ['owner'] },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const select = { type: Sequelize.QueryTypes.SELECT };

    for (const permission of PERMISSIONS) {
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM permissions WHERE slug = :slug LIMIT 1',
        { ...select, replacements: { slug: permission.slug } },
      );

      const permissionId = existing ? existing.id : randomUUID();
      if (!existing) {
        await queryInterface.bulkInsert('permissions', [
          {
            id: permissionId,
            name: permission.name,
            slug: permission.slug,
            module: permission.module,
            description: null,
            createdAt: now,
            updatedAt: now,
            version: 0,
          },
        ]);
      }

      const roles = await queryInterface.sequelize.query(
        'SELECT id FROM roles WHERE slug IN (:slugs)',
        { ...select, replacements: { slugs: permission.roles } },
      );

      for (const role of roles) {
        const [link] = await queryInterface.sequelize.query(
          'SELECT id FROM role_permissions WHERE roleId = :roleId AND permissionId = :permissionId LIMIT 1',
          { ...select, replacements: { roleId: role.id, permissionId } },
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
