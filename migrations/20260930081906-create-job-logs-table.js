'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable('job_logs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      job_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'jobs',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      attempt_number: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1
      },
      result_status: {
        type: Sequelize.STRING(10),
        allowNull: false,
        validate: {
          isIn: {
            args: [['queued', 'processing', 'completed', 'failed', 'cancelled']]
          }
        }
      },
      error_detail: {
        type: Sequelize.JSON,
        allowNull: true
      },
      duration_ms: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addConstraint('job_logs', {
      fields: ['result_status'],
      type: 'CHECK',
      where: {
        result_status: ['queued', 'processing', 'completed', 'failed', 'cancelled']
      }
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable('job_logs');
  }
};
