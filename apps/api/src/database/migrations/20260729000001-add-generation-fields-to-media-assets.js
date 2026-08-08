'use strict';

/**
 * Turns media_assets from a plain uploaded-file registry into a per-user
 * generation gallery/cache: prompt (or transcript)/provider/model/voiceId
 * are recorded so a past generation can be shown for reuse, and cacheKeyHash
 * lets an identical repeat request be served from here instead of calling
 * the AI provider again (see MediaAssetsService.findCached).
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('media_assets', 'prompt', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('media_assets', 'provider', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('media_assets', 'model', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn('media_assets', 'voiceId', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn('media_assets', 'cacheKeyHash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });

    await queryInterface.addIndex('media_assets', ['createdBy', 'cacheKeyHash']);
    await queryInterface.addIndex('media_assets', ['createdBy', 'type']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('media_assets', ['createdBy', 'type']);
    await queryInterface.removeIndex('media_assets', ['createdBy', 'cacheKeyHash']);
    await queryInterface.removeColumn('media_assets', 'cacheKeyHash');
    await queryInterface.removeColumn('media_assets', 'voiceId');
    await queryInterface.removeColumn('media_assets', 'model');
    await queryInterface.removeColumn('media_assets', 'provider');
    await queryInterface.removeColumn('media_assets', 'prompt');
  },
};
