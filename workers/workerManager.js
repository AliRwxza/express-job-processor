const worker = require("./worker");

function startWorkers(workerCount) {
  console.log(`Creating ${workerCount} workers`);

  for (let i = 1; i <= workerCount; i++) {
    worker(i);
  }
}

module.exports = startWorkers;