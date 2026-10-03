require("dotenv").config();

const { sequelize } = require("../config/database");
const { Job } = require("../models");


async function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function executeJob(job) {
  const jobModule= require(job.payload.file);

  const method = jobModule[job.payload.method];

  const result = await method(...job.payload.args);

  await job.update({
    status: "completed",
    result: JSON.stringify(result)
  });

  console.log(`job ${job.id} completed successfully`);
}

async function worker(workerId) {
  console.log("Starting worker " + workerId);
  
  while (true) {
    const job = await Job.findOne({
      where: {status: "queued"},
      order: [
        ["createdAt", "ASC"]
      ]
    });
  
    if (!job) {
      console.log("No jobs available");

      await sleep(5000);

      continue;
    }

    if (job.attempts >= job.maxRetries) {
      console.log("Number of retries exceeded.");

      await sleep(5000);

      continue;
    }

    await job.update({
      status: "processing",
      attempts: job.attempts + 1
    });

    await executeJob(job);
  }
}

module.exports = worker;