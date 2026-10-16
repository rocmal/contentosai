'use strict';

/** Mirrors repairUploadedName() in modules/media/domain/upload-name.ts (migrations are plain JS). */
function repair(name) {
  if (![...name].every((c) => c.charCodeAt(0) <= 0xff) || !/[\u0080-ÿ]/.test(name)) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Files uploaded before the fix stored Hindi names as Latin-1 mojibake ("à¤¬à¥‡...").
    const rows = await queryInterface.sequelize.query(
      "SELECT id, fileName FROM media_assets WHERE deletedAt IS NULL AND fileName REGEXP '[Ã-ÿ]'",
      { type: Sequelize.QueryTypes.SELECT },
    );
    for (const row of rows) {
      const fixed = repair(row.fileName);
      if (fixed === row.fileName) continue;
      await queryInterface.sequelize.query('UPDATE media_assets SET fileName = :name WHERE id = :id', {
        replacements: { name: fixed.slice(0, 255), id: row.id },
      });
    }
  },

  async down() {
    // The garbled names are not worth restoring.
  },
};
