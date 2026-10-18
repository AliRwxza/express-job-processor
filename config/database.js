const { Sequelize } = require('sequelize');
const store = require("./store");

let sequelize = null;

function init() {
  if (sequelize) {
    return sequelize;
  }

  const dbConfig = store.get("database");

  sequelize = new Sequelize(
    dbConfig.name,
    dbConfig.user,
    dbConfig.password,
    {
      host: dbConfig.host,
      dialect: dbConfig.dialect,

      logging: dbConfig.logging
    }
  );

  sequelize.authenticate()

  require("../models");

  console.log("connected to database");
  
  return sequelize;
}

async function closeConnection(sequelize) {
  if (sequelize && sequelize.connectionManager && sequelize.connectionManager.pool) {
    await sequelize.close();
    console.log("Database connection terminated successfully");

  } else {
    console.log("No active connection found");
  }
}

module.exports = { 
  init,
  closeConnection,
  get sequelize() {
    return sequelize;
  }
};