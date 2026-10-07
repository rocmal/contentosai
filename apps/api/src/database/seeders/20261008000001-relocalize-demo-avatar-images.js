'use strict';

/**
 * Repair for Character Studio cards that show a broken picture. Seeders run once
 * per database, so a database whose demo avatars were created (or re-created)
 * after 20260731190000-localize-demo-avatar-images ran is still pointing at
 * outside hosts (dicebear / randomuser). Those are blocked or unreliable in the
 * browser; the same pictures ship with the web app under /avatars/.
 *
 * Only rows still using an outside address are touched, so an avatar a customer
 * uploaded themselves is never changed. Idempotent - safe to re-run.
 */
const LOCAL_PATHS = {
  'sarah-chen': '/avatars/photos/sarah-chen.jpg',
  'james-wright': '/avatars/photos/james-wright.jpg',
  'maria-lopez': '/avatars/photos/maria-lopez.jpg',
  'david-kim': '/avatars/photos/david-kim.jpg',
  'emily-johnson': '/avatars/photos/emily-johnson.jpg',
  'robert-turner': '/avatars/photos/robert-turner.jpg',
  'aisha-patel': '/avatars/photos/aisha-patel.jpg',
  'alex-rivera': '/avatars/photos/alex-rivera.jpg',
  'leo-sharp': '/avatars/cartoon/leo-sharp.svg',
  'nova-chen': '/avatars/cartoon/nova-chen.svg',
  'max-turbo': '/avatars/cartoon/max-turbo.svg',
  'coco-bright': '/avatars/cartoon/coco-bright.svg',
  'ivy-scholar': '/avatars/cartoon/ivy-scholar.svg',
  'professor-finch': '/avatars/cartoon/professor-finch.svg',
  'ziggy-star': '/avatars/cartoon/ziggy-star.svg',
  'milo-byte': '/avatars/cartoon/milo-byte.svg',
};

module.exports = {
  async up(queryInterface) {
    for (const [slug, localPath] of Object.entries(LOCAL_PATHS)) {
      await queryInterface.sequelize.query(
        `UPDATE avatars SET imageUrl = :path, thumbnailUrl = :path
         WHERE slug = :slug AND provider = 'mock'
           AND (imageUrl LIKE 'http%' OR thumbnailUrl LIKE 'http%')`,
        { replacements: { path: localPath, slug } },
      );
    }
  },

  async down() {
    // Not reversible - the point is to move away from the outside addresses for good.
  },
};
