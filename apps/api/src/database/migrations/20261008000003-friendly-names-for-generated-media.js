'use strict';

/** Mirrors friendlyAssetName() in modules/media/domain/friendly-name.ts (migrations are plain JS). */
function friendlyName(prompt, extension) {
  const cleaned = String(prompt || '')
    .replace(/[\/:*?"<>|\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s'&-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let base = cleaned.split(' ').slice(0, 6).join(' ');
  if (base.length > 50) {
    base = base.slice(0, 50).replace(/\s+\S*$/, '').trim() || base.slice(0, 50).trim();
  }
  if (!base) return null;
  return `${base.charAt(0).toUpperCase()}${base.slice(1)}.${extension}`;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Videos were saved in the Gallery under the provider's job id (for example
    // "video-video-models/veo-3.1-fast-generate-preview/operations/..."). Give existing
    // generated items a readable name from what the user asked for. Only machine-made names are touched,
    // so anything the user renamed themselves is left alone.
    const rows = await queryInterface.sequelize.query(
      `SELECT id, fileName, prompt FROM media_assets
        WHERE deletedAt IS NULL AND prompt IS NOT NULL AND prompt <> ''
          AND (fileName LIKE 'video-%' OR fileName LIKE 'image-%' OR fileName LIKE 'speech-%')`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    for (const row of rows) {
      const extension = (/\.([a-z0-9]{1,5})$/i.exec(row.fileName) || [])[1];
      if (!extension) continue;
      const name = friendlyName(row.prompt, extension);
      if (!name) continue;
      await queryInterface.sequelize.query('UPDATE media_assets SET fileName = :name WHERE id = :id', {
        replacements: { name, id: row.id },
      });
    }
  },

  async down() {
    // Original machine-made names are not recoverable, and a readable name is harmless.
  },
};
