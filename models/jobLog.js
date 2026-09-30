const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const JobLog = sequelize.define(
  "JobLog",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    JobId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'jobs',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    attemptNumber: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    resultStatus: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: {
          args: [['queued', 'processing', 'completed', 'failed', 'cancelled']]
        }
      }
    },
    errorDetail: {
      type: DataTypes.JSON,
      allowNull: true
    },
    durationMs: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    }
  },
  {
    underscored: true,
    tableName: 'job_logs',
    timestamps: 'true'
  }
);

module.exports = JobLog;