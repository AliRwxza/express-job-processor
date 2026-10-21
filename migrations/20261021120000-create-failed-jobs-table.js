'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('failed_jobs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      original_job_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      payload: Sequelize.JSON,
      status: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'failed'
      },
      attempts: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false
      },
      max_retries: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false
      },
      timeout: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false
      },
      result: Sequelize.TEXT,
      failed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('failed_jobs');
  }
};
