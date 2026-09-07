'use strict';

const { baseColumns } = require('./_helpers/base-columns');

/** Every other table's `id` (see base-columns.js) is a plain, uncollated
 * `Sequelize.UUID` (CHAR(36)) and has always relied on the database's
 * server-level default collation matching across tables. That's true for
 * a CI database (created fresh, once, per run) but not guaranteed on a
 * long-lived production database - if the server's default collation
 * changed at any point after `organizations`/`workspaces`/`media_assets`
 * were first created (a MySQL/MariaDB version bump, a cPanel-level
 * setting, ...), a brand new table's FK columns silently pick up today's
 * default instead of the one those tables actually have, and MySQL
 * refuses to bind them ("errno: 150 Foreign key constraint is incorrectly
 * formed") since InnoDB requires an exact collation match on both sides
 * of a string-typed FK. Reading each referenced column's actual,
 * current collation - rather than assuming "no explicit collation" still
 * resolves the same way it did back then - makes this migration correct
 * regardless of whether that drift ever happened. */
async function collationOf(queryInterface, table, column) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] },
  );
  return rows[0]?.collation ?? null;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const uuidRef = (model, collation, extra = {}) => ({
      type: collation ? Sequelize.CHAR(36) : Sequelize.UUID,
      ...(collation ? { collate: collation } : {}),
      allowNull: false,
      references: { model, key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      ...extra,
    });

    const organizationsIdCollation = await collationOf(queryInterface, 'organizations', 'id');
    const workspacesIdCollation = await collationOf(queryInterface, 'workspaces', 'id');
    const mediaAssetsIdCollation = await collationOf(queryInterface, 'media_assets', 'id');

    await queryInterface.createTable('video_projects', {
      ...baseColumns(),
      organizationId: uuidRef('organizations', organizationsIdCollation),
      workspaceId: uuidRef('workspaces', workspacesIdCollation),
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
      finalAssetId: uuidRef('media_assets', mediaAssetsIdCollation, { allowNull: true, onDelete: 'SET NULL' }),
    });

    await queryInterface.addIndex('video_projects', ['workspaceId', 'status']);
    await queryInterface.addIndex('video_projects', ['createdBy']);
    await queryInterface.addIndex('video_projects', ['deletedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('video_projects');
  },
};
