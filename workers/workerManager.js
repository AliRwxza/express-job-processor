const worker = require("./worker");
const { Job } = require('../models');
const { setTimeout } = require("node:timers/promises");
const { fork } = require("node:child_process");

let workers = [];
let jobs = [];

async function startWorkers(workerCount) {
  console.log(`Creating ${workerCount} workers`);

  for (let i = 0; i < workerCount; i++) {
    const worker = fork("./workers/worker.js");

    const workerReference = {
      id: i + 1,
      process: worker,
      idle: true
    };

    workers.push(workerReference);

    worker.on("message", async (message) => {
      const { type, result, jobId, attempts, maxRetries } = message;
      if (type === "ready") {
        console.log(`[WORKER ${workerReference.id} READY]: state set to idle`);

        workerReference.idle = true;
        
        await Job.update({
          status: "completed",
          result: result
        }, {
          where: {id: jobId}
        });

      } else if (type === "failed") {
        console.log(`[WORKER ${workerReference.id} FAILED]: state set to idle`);

        workerReference.idle = true;
        
        await Job.update({
          status: (attempts < maxRetries) ? "queued" : "failed",
          attempts: (attempts < maxRetries) ? attempts + 1 : attempts,
          result: result
        }, {
          where: {id: jobId}
        });
      }
    });
  }

  while (true) {
    jobs = await Job.findAll({
      where: {status: "queued"},
      order: [
        ["createdAt", "ASC"]
      ]
    });
    
    if (jobs.length === 0) {
      console.log("No jobs available");
      
      await setTimeout(5000);
      continue;
    }
      
    const idleWorker = workers.find(
      w => w.idle === true
    );

    if (!idleWorker) {
      console.log("No workers available");
      await setTimeout(1000);
      continue;
    }

    idleWorker.idle = false;

    await jobs[0].update({
      status: "processing"
    });

    idleWorker.process.send({
      job: jobs[0]
    });
  }
}

module.exports = startWorkers;