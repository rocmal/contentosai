'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // toneOfVoice was a single freeform string; the frontend's Brand Brain
    // has always modeled it as a list of tone adjectives (e.g. ["Authoritative",
    // "Friendly"]) - widen it to match instead of lossily joining/splitting
    // strings on every read/write. Table has no rows yet in any environment
    // that's run this migration, so no data-preserving cast is needed.
    await queryInterface.changeColumn('brand_profiles', 'toneOfVoice', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn('brand_profiles', 'tagline', {
      type: Sequelize.STRING(300),
      allowNull: true,
    });
    await queryInterface.addColumn('brand_profiles', 'websiteUrl', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('brand_profiles', 'primaryFont', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('brand_profiles', 'productsAndServices', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('brand_profiles', 'mission', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('brand_profiles', 'vision', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('brand_profiles', 'primaryCTA', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.addColumn('brand_profiles', 'targetAudience', {
      type: Sequelize.STRING(300),
      allowNull: true,
    });
    await queryInterface.addColumn('brand_profiles', 'competitors', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('brand_profiles', 'keywords', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    // { platform: string; handle: string; connected: boolean }[]
    await queryInterface.addColumn('brand_profiles', 'socialAccounts', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('brand_profiles', 'socialAccounts');
    await queryInterface.removeColumn('brand_profiles', 'keywords');
    await queryInterface.removeColumn('brand_profiles', 'competitors');
    await queryInterface.removeColumn('brand_profiles', 'targetAudience');
    await queryInterface.removeColumn('brand_profiles', 'primaryCTA');
    await queryInterface.removeColumn('brand_profiles', 'vision');
    await queryInterface.removeColumn('brand_profiles', 'mission');
    await queryInterface.removeColumn('brand_profiles', 'productsAndServices');
    await queryInterface.removeColumn('brand_profiles', 'primaryFont');
    await queryInterface.removeColumn('brand_profiles', 'websiteUrl');
    await queryInterface.removeColumn('brand_profiles', 'tagline');
    await queryInterface.changeColumn('brand_profiles', 'toneOfVoice', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
  },
};
