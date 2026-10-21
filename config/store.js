class Configuration {
  options
  
  constructor() {
    this.options = {
      workersCount: 1,
      jobsDirectory: "./jobs",
      removeOnComplete: false,
      driver: "database",
      database: {
        name: null,
        dialect: "mysql",
        host: "localhost",
        port: 3306,
        user: "root",
        password: null,
        logging: false
      }
    };
  }

  set(userConfig = {}) {
    this.options = {
      ...this.options,
      ...userConfig,
      database: {
        ...this.options.database,
        ...userConfig.database
      }
    };
  }

  get(key) {
    return this.options[key];
  }

  getAll() {
    return this.options
  }
};

module.exports = new Configuration;