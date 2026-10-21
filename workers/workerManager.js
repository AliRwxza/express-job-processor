const { Job } = require('../models');
const { setTimeout, clearTimeout } = require("node:timers");
const { setTimeout: sleep } = require("node:timers/promises");
const { fork } = require("node:child_process");
const store = require("../config/store");
const path = require("path");

const { init } = require("../config/database");
const jobRegistry = require("../registry/jobRegistry");

let workers = [];
let isRunning = false;
let sequelize = null;

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
      workerReference.timeout = null;

      try {
        const where = {
          id: job.id,
          status: "processing"
        };

        if (store.get("removeOnComplete") === true) {
          await Job.destroy({ where });

        } else {
          await Job.update(
            { status: "completed", result },
            { where }
          );
        }

      } catch (err) {
        console.error(`[WORKER ${workerReference.id}] Could not complete its job: ${err}`);
      }

      workerReference.job = null;

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
    await job.update({
      status: canRetry ? "queued" : "failed",
      attempts: canRetry ? job.attempts + 1 : job.attempts,
      result: result
      }
    );
    
  } catch (err) {
    console.error(`[WORKER ${workerReference.id}] Could not update failed job:`, err);
  }
}

async function claimJobs(workerCount) {
  const transaction = await sequelize.transaction();

  let jobs;

  try {
    jobs = await Job.findAll({
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

    await transaction.commit();
    
  } catch (err) {
    jobs = [];
    
    await transaction.rollback();
    
    console.error(err);
  }
  
  return jobs;
}

async function assignJobToWorker(workerReference, job) {
  if (!jobRegistry.validateRuntimeKey(job.type)) {
    await job.update({
      status: "failed",
      result: `Invalid job type ${job.type}`
    });

    return;
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
    return;
  }

  workerReference.timeout = setTimeout(async () => {
    await workerReference.process.kill();
    
  }, workerReference.job.timeout * 1000);
}

async function runCycle() {
  const idleWorkers = workers.filter(
    (workerReference) => !workerReference.job
  );

  if (idleWorkers.length === 0) {
    return;
  }

  const claimedJobs = await claimJobs(idleWorkers.length);

  if (claimedJobs.length === 0) {
    return;
  }

  for (let i = 0; i < claimedJobs.length; i++) {
    try {
      await assignJobToWorker(idleWorkers[i], claimedJobs[i]);
    } catch(err) {
      await Job.update(
        { status: "queued" },
        { id: claimedJobs[i].id }
      )
    }
  }
}

async function startWorkers(workerCount) {
  if (isRunning) return;

  sequelize = await init();

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
  }
  
  for (const workerRef of workers) {
    while (workerRef.job) {
      await sleep(100);
    }

    clearTimeout(workerRef.timeout);

    workerRef.job = null;
    workerRef.timeout = null;
  }
}

module.exports = {
  startWorkers,
  stopWorkers
};