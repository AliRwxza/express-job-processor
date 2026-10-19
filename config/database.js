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
      host: dbConfig.host || "localhost",
      dialect: dbConfig.dialect || "mysql",
      port: dbConfig.port || 3306,

      logging: dbConfig.logging
    }
  );

  sequelize.authenticate()
    .then(() => {
      console.log("connected to database");
    })
    .catch((err) => {
      console.error("This is an error");
      throw err;
    });

  require("../models");
  
  return sequelize;
}

async function closeConnection(sequelize) {
  if (sequelize && sequelize.connectionManager && sequelize.connectionManager.pool) {
    await sequelize.close();
  }
}

module.exports = { 
  init,
  closeConnection,
  get sequelize() {
    return sequelize;
  }
};