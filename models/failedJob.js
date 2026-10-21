const { DataTypes } = require("sequelize");
const sequelize = require("../config/database").init();

// Failed jobs are an archive, rather than a foreign-key child of jobs: the
// source queue row is deliberately removed when removeOnComplete is enabled.
const FailedJob = sequelize.define("FailedJob", {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  originalJobId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  payload: DataTypes.JSON,
  status: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: "failed"
  },
  attempts: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false
  },
  maxRetries: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false
  },
  timeout: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false
  },
  result: DataTypes.TEXT,
  failedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: "failed_jobs",
  underscored: true,
  timestamps: true
});

module.exports = FailedJob;
