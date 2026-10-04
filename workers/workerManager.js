const { Job } = require('../models');
const { setTimeout } = require("node:timers/promises");
const { fork } = require("node:child_process");
const path = require("path");
const { sequelize } = require('../config/database');

let workers = [];

function createWorker(workerId) {
  const workerPath = path.resolve(__dirname, "./worker.js");
  const worker = fork(workerPath);

  const workerReference = {
    id: workerId,
    process: worker,
    job: null
  };

  worker.on("message", async (message) => {
    
    const { type, result } = message;
    const { id, attempts, maxRetries } = workerReference.job;

    if (type === "ready") {
      console.log(`[WORKER ${workerReference.id} READY]: state set to idle`);

      workerReference.job = null;

      await Job.update({
        status: "completed",
        result: result
      }, {
        where: { id }
      });

    } else if (type === "failed") {
      console.log(`[WORKER ${workerReference.id} FAILED]: state set to idle`);

      workerReference.job = null;
      
      await Job.update({
        status: (attempts < maxRetries) ? "queued" : "failed",
        attempts: (attempts < maxRetries) ? attempts + 1 : attempts,
        result: result

      }, {
        where: { id }
      });
    }
  });

  worker.on("exit", (code, signal) => {
    console.error("Worker exited with code:", code);
    console.error("Signal:", signal);
    
    createWorker(workerId);
  });

  return workerReference;
}

async function startWorkers(workerCount) {
  console.log(`Creating ${workerCount} workers`);

  for (let i = 1; i <= workerCount; i++) {
    const workerReference = createWorker(i);

    workers.push(workerReference);
  }

  while (true) {
    const job = await sequelize.transaction(async (transaction) => {

      const job = await Job.findOne({
        where: {
          status: "queued"
        },
        order: [
          ["attempts", "ASC"],
          ["createdAt", "ASC"]
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true
      });

      if (!job) {
        return null;
      }

      await job.update({
        status: "processing"
      }, {
        transaction
      });

      return job;
    });
    
    if (!job) {      
      await setTimeout(500);
      continue;
    }
      
    const idleWorker = workers.find(
      w => !w.job
    );

    if (!idleWorker) {
      await setTimeout(100);
      continue;
    }

    idleWorker.job = job;
    
    idleWorker.process.send({
      job: job
    });
  }
}

module.exports = startWorkers;