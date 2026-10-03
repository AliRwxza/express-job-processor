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
      if (message.type === "ready") {
        console.log(`[WORKER ${workerReference.id}]: state set to idle`)
        workerReference.idle = true;
        
        await Job.update({
          status: "completed",
          result: message.result
        }, {
          where: {id: message.jobId}
        });

      } else if (message.type === "failed") {
        workerReference.idle = true;
        
        const job = await Job.findByPk(message.jobId);
        await job.update({
          status: (job.attempts < job.maxRetries) ? "queued" : "failed",
          attempts: (job.attempts < job.maxRetries) ? job.attempts + 1 : job.attempts,
          result: message.result
        });
      }
    });
  }

  while (true) {
    console.log("number of workers:", workers.length);
    jobs = await Job.findAll({
      where: {status: "queued"},
      order: [
        ["createdAt", "ASC"]
      ]
    });

    console.log("Number of jobs:", jobs.length);
    
    if (jobs.length === 0) {
      console.log("No jobs available");
      
      await setTimeout(5000);
      continue;
    }
      
    var idleWorker;

    while (true) {
      idleWorker = workers.find(
        w => w.idle === true
      );

      if (idleWorker){
        break;
      }

      console.log("No workers are available");

      await setTimeout(5000);
      continue;
    }

    idleWorker.idle = false;

    idleWorker.process.send({
      job: jobs[0]
    });

    await jobs[0].update({
      status: "processing"
    });
  }
}

module.exports = startWorkers;