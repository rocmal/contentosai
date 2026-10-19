'use strict';

/** Mirrors friendlyAssetName() in modules/media/domain/friendly-name.ts (migrations are plain JS). */
function friendlyBase(prompt) {
  const cleaned = String(prompt || '')
    .replace(/[\/:*?"<>|\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s'&-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let base = cleaned.split(' ').slice(0, 6).join(' ');
  if (base.length > 50) {
    base =
      base
        .slice(0, 50)
        .replace(/\s+\S*$/, '')
        .trim() || base.slice(0, 50).trim();
  }
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : null;
}

/** Mirrors the placeholder pattern and isMachineMadeName() in friendly-name.ts. */
const PLACEHOLDER_NAME =
  /^(?:Image|Video|Voiceover|Talking avatar) \d{1,2} [A-Za-z]{3,4} \d{4}( \(\d+\))?\.([a-z0-9]{1,5})$/;
const MACHINE_BASE =
  /^(?:[a-z]+[-_])*(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{16,}|\d{10,})$/i;

const TYPE_LABEL = { image: 'Image', video: 'Video', audio: 'Audio', character: 'Talking avatar' };

/** Mirrors the dated fallback in uploadedFileName() (modules/media/domain/upload-name.ts), at the item's own date, India time. */
function datedName(type, createdAt, extension) {
  const at = new Date(createdAt);
  const date = at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const time = at
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    .replace(':', '.');
  return `${TYPE_LABEL[type] || 'File'} ${date} ${time}${extension}`;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Two kinds of unreadable Gallery names, both made by the app rather than the person:
    // - "Video 19 Oct 2026.mp4": the browser saved the clip before the prompt reached the server, and the name was
    //   not updated when the prompt arrived (fixed in MediaAssetsService.setPromptIfMissing);
    // - ids and timestamps such as "817ed7e3-767a-...jpg", "video-c40565c6-...mp4", "lumora-video-1760882400000.mp4"
    //   (fixed for new uploads in uploadedFileName).
    // Anything else, including every name a person typed, is left alone.
    const rows = await queryInterface.sequelize.query(
      'SELECT id, fileName, prompt, type, createdAt FROM media_assets WHERE deletedAt IS NULL',
      { type: Sequelize.QueryTypes.SELECT },
    );
    for (const row of rows) {
      const fileName = String(row.fileName || '');
      let name = null;

      const placeholder = PLACEHOLDER_NAME.exec(fileName);
      if (placeholder) {
        const base = friendlyBase(row.prompt);
        if (base) name = `${base}${placeholder[1] || ''}.${placeholder[2]}`;
      } else {
        const extension = (/\.[a-z0-9]{1,5}$/i.exec(fileName) || [''])[0];
        const base = extension ? fileName.slice(0, -extension.length) : fileName;
        if (MACHINE_BASE.test(base)) {
          const fromPrompt = friendlyBase(row.prompt);
          name = fromPrompt
            ? `${fromPrompt}${extension}`
            : datedName(row.type, row.createdAt, extension);
        }
      }

      if (!name || name === fileName) continue;
      await queryInterface.sequelize.query(
        'UPDATE media_assets SET fileName = :name WHERE id = :id',
        {
          replacements: { name: name.slice(0, 255), id: row.id },
        },
      );
    }
  },

  async down() {
    // The old names were ids and placeholders; a readable name is harmless to keep.
  },
};
