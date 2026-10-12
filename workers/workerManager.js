const { Job } = require('../models');
const { setTimeout, clearTimeout } = require("node:timers");
const { setTimeout: sleep } = require("node:timers/promises");
const { fork } = require("node:child_process");
const path = require("path");
const { sequelize } = require('../config/database');

const jobRegistry = require("../registry/jobRegistry");

let workers = [];
let isRunning = false;

function createWorker(workerId) {
  const workerPath = path.resolve(__dirname, "./worker.js");
  const worker = fork(workerPath);

  const workerReference = {
    id: workerId,
    process: worker,
    job: null,
    timeout: null,
    sto: false
  };

  worker.on("message", async (message) => {
    
    const { type, result } = message;
    const job = workerReference.job;

    if (!job) return;

    if (type === "completed") {
      clearTimeout(workerReference.timeout);
      
      workerReference.job = null;

      try {
        await Job.update({
          status: "completed",
          result: result
        }, {
          where: { id: job.id, status: "processing" }
        });
      } catch (err) {
        console.error(`[WORKER ${workerReference.id}] Could not complete its job with results: ${err}`);
      }

    } else if (type === "failed") {
      await handleJobFailure(workerReference, result);
    }
  });

  worker.on("exit", async (code, signal) => {
    clearTimeout(workerReference.timeout);
    workerReference.timeout = null;

    console.error(`[WORKER ${workerReference.id}]: Exited with code and signal`, code, signal);

    if (workerReference.job) {
      await handleJobFailure(workerReference, "ERROR: exited with code: " + code);
    }

    if (!workerReference.sto) {
      workers[workerReference.id - 1] = createWorker(workerId);
    }
  });

  return workerReference;
}

async function handleJobFailure(workerReference, result) {
  const job = workerReference.job;

  if (!job) {
    return;
  }
  
  clearTimeout(workerReference.timeout);
  workerReference.timeout = null;
  workerReference.job = null;

  const canRetry = job.attempts < job.maxRetries;

  try {
    await Job.update({
      status: canRetry ? "queued" : "failed",
      attempts: canRetry ? job.attempts + 1 : job.attempts,
      result: result
      }, {
        where: { id: job.id }
      }
    );
    
  } catch (err) {
    console.error(`[WORKER ${workerReference.id}] Could not update failed job:`, err);
  }
}

async function claimJobs(workerCount) {
  const transaction = await sequelize.transaction();

  const jobs = Job.findAll({
    where: { status: "queued" },
    order: [
      ["attempts", "ASC"],
      ["createdAt", "ASC"]
    ],
    limit: workerCount,
    transaction,
    lock: transaction.LOCK.UPDATE,
    skipLocked: true
  });

  for (const job of jobs) {
    await job.update(
      { "status": "processing" },
      { transaction }
    );
  }

  transaction.commit();
  
  return jobs;
}

async function assignJobToWorker(workerReference, job) {
  if (!jobRegistry.validateRuntimeKey(job.type)) {
    await job.update({
      status: "failed",
      result: "ERROR: Invalid job"
    });

    throw new Error(`Invalid job type ${job.type}`);
  }

  const jobPath = jobRegistry.get(job.type);
  
  workerReference.job = job;

  try {
    workerReference.process.send({
      job: job,
      path: jobPath
    });
  } catch(err) {
    await handleJobFailure(workerReference, err.message);
  }

  workerReference.timeout = setTimeout(async () => {
    workerReference.process.kill();
    
  }, workerReference.job.timeout * 1000);
}

async function runCycle() {
  const idleWorkers = workers.filter(
    (workerReference) => !workerReference.job
  );

  if (idleWorkers.length === 0) {
    return;
  }

  const jobs = claimJobs(idleWorkers.length);

  for (let i = 0; i < idleWorkers.length; i++) {
    assignJobToWorker(idleWorkers[i], jobs[i]);
  }
}

async function startWorkers(workerCount) {
  if (isRunning) return;
  
  for (let i = 1; i <= workerCount; i++) {
    const workerReference = createWorker(i);
    
    workers.push(workerReference);
  }
  
  isRunning = true;

  while (isRunning) {
    try {
      await runCycle();
    } catch(err) {
      console.error("[MANAGER] Cycle failed due to:", err);
    }

    if (isRunning) {
      await sleep(1000);
    }
  }
}

async function stopWorkers() {
  isRunning = false;
  
  for (const workerRef of workers) {
    workerRef.sto = true;

    while (workerRef.job);

    clearTimeout(workerRef.timeout);

    workerRef.process.job = null;
    workerRef.process.timeout = null;
  }
}

module.exports = {
  startWorkers,
  stopWorkers
};