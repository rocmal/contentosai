'use strict';

/**
 * The previous seeder (20260731190000) pointed avatar images at relative
 * paths served by the *frontend* dev server (public/avatars/...). That fixed
 * broken/blurry thumbnails in the library grid, but broke "Generate
 * Character Video": GenerateCharacterDto.sourceImageUrl is `@IsUrl()`
 * (rejects relative paths outright), and even a fully-qualified
 * http://localhost:3000/... URL wouldn't be reachable by D-ID's servers.
 *
 * The API's own /storage/uploads/ static mount (main.ts) serves these at
 * {APP_URL}/storage/uploads/avatars/{photos,cartoon}/...; this seeder
 * repoints imageUrl/thumbnailUrl there.
 *
 * APP_URL is deliberately http://localhost:3001 in dev, NOT a Cloudflare
 * quick-tunnel URL. A tunnel was used briefly to satisfy D-ID's
 * @IsUrl()-validated, publicly-fetchable sourceImageUrl requirement, but
 * quick tunnels have "no uptime guarantee" and repeatedly died silently
 * (process alive, connection dead), breaking every avatar thumbnail until
 * someone noticed and manually re-ran this seeder with a fresh tunnel URL.
 * localhost is fine for the browser <img> tag and for SadTalker/Wav2Lip
 * (both fetch() the image from within the same Node process on this
 * machine) - only D-ID/HeyGen/Synthesia need public reachability, and
 * D-ID is the only one of those configured, and it's out of trial credits.
 * If D-ID (or another cloud provider) comes back into use, re-point
 * APP_URL at a live tunnel and re-run this seeder (idempotent - safe to
 * re-run) - see scripts/watch-tunnel.ps1 for a self-healing tunnel option.
 *
 * The cartoon set's source art is SVG, but D-ID's source_url validation
 * requires jpg|jpeg|png - hence the rasterized .png copies in
 * avatars/cartoon/ (generated from the .svg originals) instead of the .svg
 * files directly. Irrelevant to SadTalker/Wav2Lip, which don't care about
 * the extension, but kept since the .png copies already exist.
 */
const SLUGS = {
  photos: ['sarah-chen', 'james-wright', 'maria-lopez', 'david-kim', 'emily-johnson', 'robert-turner', 'aisha-patel', 'alex-rivera'],
  cartoon: ['leo-sharp', 'nova-chen', 'max-turbo', 'coco-bright', 'ivy-scholar', 'professor-finch', 'ziggy-star', 'milo-byte'],
};

module.exports = {
  async up(queryInterface) {
    const appUrl = (process.env.APP_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

    const updates = [
      ...SLUGS.photos.map((slug) => [slug, `${appUrl}/storage/uploads/avatars/photos/${slug}.jpg`]),
      ...SLUGS.cartoon.map((slug) => [slug, `${appUrl}/storage/uploads/avatars/cartoon/${slug}.png`]),
    ];

    for (const [slug, url] of updates) {
      await queryInterface.sequelize.query(
        `UPDATE avatars SET imageUrl = :url, thumbnailUrl = :url WHERE slug = :slug`,
        { replacements: { url, slug } },
      );
    }
  },

  async down() {
    // Not reversible to a prior state - re-run 20260731190000 manually if
    // you need the frontend-hosted relative paths back.
  },
};
