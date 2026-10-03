const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define(
  "Job",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'queued',
      validate: {
        isIn: {
          args: [['queued', 'processing', 'completed', 'failed', 'cancelled']],
          msg: "status must be one of: queued, processing, completed, failed, cancelled"
        }
      }
    },
    attempts: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    maxRetries: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 3
    },
    timeout: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 60
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true
    },
  },
  {
    constraints: [
      {
        type: 'CHECK',
        fields: ['status'],
        where: {
          status: ['received', 'active', 'done', 'failed', 'cancelled']
        }
      }
    ],
    tableName: "jobs",
    underscored: true,
    timestamps: true
  }
);

module.exports = Job;