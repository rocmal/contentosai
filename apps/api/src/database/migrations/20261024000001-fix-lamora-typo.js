'use strict';

/**
 * ONE-TIME data fix (feedback 2026-10-24): a video's prompt and thumbnail text said "Lamora OS" instead of "Lumora OS".
 * Replaces the misspelling in every text, varchar and JSON column, so the prompt, titles and stored scene text are all
 * fixed wherever they live. Safe to run twice (nothing left to replace the second time). Text baked into a thumbnail
 * IMAGE cannot be fixed from SQL: regenerate that video or its thumbnail.
 *
 * Delete this file after it has run on production (sequelize keeps its name in SequelizeMeta, so removing it later is harmless).
 */
const FIXES = [
  ['Lamora', 'Lumora'],
  ['LAMORA', 'LUMORA'],
  ['lamora', 'lumora'],
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const columns = await sequelize.query(
      `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, DATA_TYPE AS dataType
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND DATA_TYPE IN ('varchar', 'text', 'mediumtext', 'longtext', 'json')
          AND TABLE_NAME <> 'SequelizeMeta'
          AND EXTRA NOT LIKE '%GENERATED%'`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    let changed = 0;
    for (const { tableName, columnName, dataType } of columns) {
      const table = `\`${tableName}\``;
      const column = `\`${columnName}\``;
      const isJson = dataType === 'json';
      const source = isJson ? `CAST(${column} AS CHAR)` : column;
      let expression = source;
      for (const [from, to] of FIXES) expression = `REPLACE(${expression}, '${from}', '${to}')`;
      const assigned = isJson ? `CAST(${expression} AS JSON)` : expression;

      // LOWER() because some columns (MariaDB JSON) use a case-sensitive collation; REPLACE itself is case-sensitive.
      const [, meta] = await sequelize.query(
        `UPDATE ${table} SET ${column} = ${assigned} WHERE LOWER(${source}) LIKE '%lamora%'`,
      );
      const rows = (meta && (meta.affectedRows ?? meta.rowCount)) || 0;
      if (rows > 0) {
        changed += rows;
        console.log(`fix-lamora-typo: ${tableName}.${columnName} - ${rows} row(s)`);
      }
    }
    console.log(`fix-lamora-typo: ${changed} row(s) fixed in total`);
  },

  async down() {
    // The misspelling is not worth restoring.
  },
};
