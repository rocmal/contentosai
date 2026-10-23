'use strict';

/**
 * A failed post keeps why it failed, so the app can show it next to the post (it was only in the failure
 * notification, and the website's bell did not show notifications). Posts that already failed get the reason back
 * from their "... post failed" notification, which carries the job id in its metadata.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('publishing_jobs', 'errorMessage', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    const notices = await queryInterface.sequelize.query(
      `SELECT message, metadata FROM notifications
        WHERE title LIKE '% post failed' AND deletedAt IS NULL
        ORDER BY createdAt ASC`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    for (const notice of notices) {
      let metadata = notice.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch {
          continue;
        }
      }
      const jobId = metadata && metadata.publishingJobId;
      if (!jobId) continue;
      await queryInterface.sequelize.query(
        `UPDATE publishing_jobs SET errorMessage = :message
          WHERE id = :jobId AND status = 'failed' AND errorMessage IS NULL`,
        { replacements: { message: String(notice.message).slice(0, 2000), jobId } },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('publishing_jobs', 'errorMessage');
  },
};
