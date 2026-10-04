const { Job } = require('../models');
const { setTimeout } = require("node:timers/promises");
const { fork } = require("node:child_process");
const path = require("path");

let workers = [];
let jobs = [];

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
    jobs = await Job.findAll({
      where: {status: "queued"},
      order: [
        ["createdAt", "ASC"]
      ]
    });
    
    if (jobs.length === 0) {      
      await setTimeout(5000);
      continue;
    }
      
    const idleWorker = workers.find(
      w => !w.job
    );

    if (!idleWorker) {
      await setTimeout(1000);
      continue;
    }

    idleWorker.job = jobs[0];

    await jobs[0].update({
      status: "processing"
    });
    
    idleWorker.process.send({
      job: jobs[0]
    });
  }
}

module.exports = startWorkers;