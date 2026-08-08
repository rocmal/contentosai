'use strict';

/**
 * The demo avatar seeders (20260731170000, 20260731180000) originally pointed
 * imageUrl/thumbnailUrl at randomuser.me and api.dicebear.com. That meant:
 *  - thumbnailUrl used randomuser's 48x48 "thumb" variant, stretched to fill
 *    a much larger card in Character Studio -> visibly blurry.
 *  - dicebear images depend on an external host being reachable from the
 *    browser at render time -> unreliable in the "not visible" sense.
 * The images have since been downloaded into apps web's public/avatars/ and
 * are served same-origin. This seeder repoints existing rows at those local
 * paths. Idempotent - safe to re-run.
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
        `UPDATE avatars SET imageUrl = :path, thumbnailUrl = :path WHERE slug = :slug`,
        { replacements: { path: localPath, slug } },
      );
    }
  },

  async down() {
    // Not reversible to the original external URLs - the point of this
    // seeder is to move away from them for good.
  },
};
