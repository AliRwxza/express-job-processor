const storeConfig = require("./config/store");
const BaseJob = require("./jobs/BaseJob");

let initialized = false;
let jobRegistry = null;
let workerManager = null;

function configure(options = {}) {
  if (initialized) {
    throw new Error("Configuration cannot be changed after initialization");
  }

  storeConfig.set(options);
}

async function start() {
  const config = storeConfig.getAll();

  if (config.driver === "database") {
    const { init } = require("./config/database");
    await init();

  } else if (config.driver === "file") {
    console.log("file driver will be installed in this place");

  } else {
    throw new Error("Invalid driver selected")
  }

  jobRegistry = require("./registry/jobRegistry");
  workerManager = require("./workers/workerManager");

  jobRegistry.discoverDirectory(storeConfig.get("jobsDirectory"));

  initialized = true;
}

async function startWorkers() {
  if (initialized) {
    return;
  }

  await start();
  
  await workerManager.startWorkers(storeConfig.get("workersCount"));
}

async function stopWorkers() {
  if (!initialized || !workerManager) {
    return;
  }

  await workerManager.stopWorkers();

  const { closeConnection } = require("./config/database");
  await closeConnection();

  initialized = false;
  workerManager = null;
}

module.exports = {
  configure,
  BaseJob,
  jobRegistry,
  startWorkers,
  stopWorkers,
  get config() {
    return storeConfig.getAll()
  }
};
