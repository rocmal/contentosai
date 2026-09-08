'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** Sequelize's `UUID` type compiles to `CHAR(36) BINARY` for MySQL, whose
 * effective collation comes from the *table's* default charset/collation,
 * not anything settable per-column here (a per-column `collate` option is
 * silently dropped by this Sequelize version's MySQL query generator for
 * this type - verified directly against a real MySQL instance). Every
 * other table so far has relied on that table default implicitly matching
 * across tables, which holds for a CI database (created fresh, once, per
 * run) but isn't guaranteed on a long-lived production database - if the
 * server's default collation changed at any point after `organizations`
 * was first created (a MySQL/MariaDB version bump, a cPanel-level
 * setting, ...), this brand new table would silently get today's default
 * instead of matching it, and MySQL refuses to bind the FK ("errno: 150
 * Foreign key constraint is incorrectly formed"). Pinning this table's
 * own default to organizations.id's actual, current charset/collation
 * (organizations/workspaces/media_assets all share one from `baseColumns`,
 * created together - confirmed against local dev MySQL) makes this
 * correct regardless of whether that drift ever happened, without
 * touching any column type declaration. */
async function referenceCharsetCollate(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT CHARACTER_SET_NAME AS charset, COLLATION_NAME AS collation FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'id'`,
  );
  const { charset, collation } = rows[0] ?? {};
  return charset && collation ? { charset, collate: collation } : {};
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('video_projects', {
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
      title: { type: Sequelize.STRING(150), allowNull: false, defaultValue: 'Untitled video' },
      source: {
        type: Sequelize.ENUM('prompt', 'upload', 'templates', 'scenes'),
        allowNull: false,
        defaultValue: 'scenes',
      },
      status: {
        type: Sequelize.ENUM('draft', 'ready'),
        allowNull: false,
        defaultValue: 'draft',
      },
      // Array of StudioScene-shaped objects (id, visualUrl, visualType,
      // durationSeconds, focalXPct, focalYPct, filter, motion) - stored
      // whole, matching the avatars.tags precedent for a JSON array column
      // that's always read/written together, never queried per-element.
      scenes: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
      aspectRatio: { type: Sequelize.STRING(20), allowNull: false, defaultValue: '16:9' },
      transition: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'none' },
      narrationText: { type: Sequelize.TEXT, allowNull: true },
      narrationVoiceId: { type: Sequelize.STRING(150), allowNull: true },
      narrationGender: { type: Sequelize.STRING(20), allowNull: true },
      narrationLanguage: { type: Sequelize.STRING(10), allowNull: true },
      finalAssetId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'media_assets', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
    }, await referenceCharsetCollate(queryInterface));

    await queryInterface.addIndex('video_projects', ['workspaceId', 'status']);
    await queryInterface.addIndex('video_projects', ['createdBy']);
    await queryInterface.addIndex('video_projects', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('video_projects');
  },
};
