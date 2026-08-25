'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Links a turn to the credit hold taken before the vendor call, so the
    // completion and failure handlers know which reservation to settle.
    await queryInterface.addColumn('video_edit_turns', 'creditReservationId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('video_edit_turns', 'tier', {
      type: Sequelize.ENUM('economy', 'fast', 'studio'),
      allowNull: false,
      defaultValue: 'fast',
    });
    await queryInterface.addColumn('video_edit_turns', 'style', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'realistic',
    });
    await queryInterface.addColumn('video_edit_turns', 'durationSeconds', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 8,
    });

    await queryInterface.addIndex('video_edit_turns', ['creditReservationId'], {
      name: 'video_edit_turns_credit_reservation',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('video_edit_turns', 'video_edit_turns_credit_reservation');
    await queryInterface.removeColumn('video_edit_turns', 'durationSeconds');
    await queryInterface.removeColumn('video_edit_turns', 'style');
    await queryInterface.removeColumn('video_edit_turns', 'tier');
    await queryInterface.removeColumn('video_edit_turns', 'creditReservationId');
  },
};
