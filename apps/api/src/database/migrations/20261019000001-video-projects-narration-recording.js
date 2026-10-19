'use strict';

/**
 * A Scene Builder draft can use one of the person's own voice recordings (custom_voices) as its narration.
 * Kept as a plain id, not a foreign key: a recording can be deleted while drafts still name it, and the
 * editor then tells the person and falls back to the typed script.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('video_projects', 'narrationRecordingId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('video_projects', 'narrationRecordingId');
  },
};
