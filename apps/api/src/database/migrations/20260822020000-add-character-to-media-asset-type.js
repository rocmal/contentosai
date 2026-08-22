'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Character Studio's talking-avatar clips were being saved as generic
    // 'video' (no distinct type existed), making them indistinguishable
    // from real Video Studio output anywhere they're listed or filtered
    // (Media Library, the mobile Recent Generations feed, Video Studio's
    // own "choose from gallery" picker). Widening the enum rather than
    // reusing 'video' with a separate flag keeps the existing type-based
    // filtering/counting logic (MediaAssetsService.countGalleryMedia,
    // every `type=` query param) working unchanged for a fifth value.
    await queryInterface.changeColumn('media_assets', 'type', {
      type: Sequelize.ENUM('image', 'video', 'audio', 'document', 'character'),
      allowNull: false,
    });
  },

  async down(queryInterface) {
    // Any existing 'character' rows would violate the narrowed enum on
    // rollback - reclassify them as 'video' first (what they were saved as
    // before this migration existed) so down() never leaves the column in
    // a state some of its own rows can't satisfy.
    await queryInterface.sequelize.query(
      `UPDATE media_assets SET type = 'video' WHERE type = 'character'`,
    );
    await queryInterface.changeColumn('media_assets', 'type', {
      type: Sequelize.ENUM('image', 'video', 'audio', 'document'),
      allowNull: false,
    });
  },
};
