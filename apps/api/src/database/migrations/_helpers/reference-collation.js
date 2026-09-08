/** Sequelize's `UUID` type compiles to `CHAR(36) BINARY` for MySQL, whose
 * effective collation comes from the *table's* default charset/collation,
 * not anything settable per-column (a per-column `collate` option is
 * silently dropped by this Sequelize version's MySQL query generator for
 * this type - verified directly against a real MySQL instance). Every
 * table up to 2026-08-22 relied on that table default implicitly matching
 * across tables, which holds for a CI database (created fresh, once, per
 * run) but wasn't guaranteed on the long-lived production database - its
 * server-level default collation had drifted from what `organizations`
 * (and everything created alongside it) actually has, silently breaking
 * every FK-bearing table created since ("errno: 150 Foreign key
 * constraint is incorrectly formed" on production only, never in CI).
 *
 * Reading organizations.id's actual, current charset/collation live and
 * pinning each new table's own default to match it - rather than trusting
 * an implicit default that had drifted - makes table creation correct
 * regardless of what the server's default happens to be, without
 * touching any column type declaration. Verified end-to-end against both
 * local dev MySQL and production (see 20260823000001-create-video-projects.js,
 * the first migration fixed this way). */
async function referenceCharsetCollate(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT CHARACTER_SET_NAME AS charset, COLLATION_NAME AS collation FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'id'`,
  );
  const { charset, collation } = rows[0] ?? {};
  return charset && collation ? { charset, collate: collation } : {};
}

module.exports = { referenceCharsetCollate };
