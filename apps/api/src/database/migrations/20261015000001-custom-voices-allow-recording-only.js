'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // A recording can now be saved before it is cloned (cloning needs a vendor key),
    // so the provider's voice id is empty until the voice is made usable.
    await queryInterface.changeColumn('custom_voices', 'providerVoiceId', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE custom_voices SET providerVoiceId = '' WHERE providerVoiceId IS NULL");
    await queryInterface.changeColumn('custom_voices', 'providerVoiceId', {
      type: Sequelize.STRING(150),
      allowNull: false,
    });
  },
};
