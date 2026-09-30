const {Sequelize} = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",

    logging: console.log
  }
);

async function initDB() {
  await sequelize.authenticate();

  console.log("connected to database");
}

module.exports= {
  sequelize,
  initDB
}