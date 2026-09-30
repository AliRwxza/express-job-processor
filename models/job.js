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
    name: {
      type: DataTypes.STRING(),
      allowNull: false
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
    max_retries: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 3
    },
    timeout: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 60
    }
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