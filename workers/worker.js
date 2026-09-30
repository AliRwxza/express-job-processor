require("dotenv").config();

const { sequelize } = require("../config/database");
const { Job } = require("../models");

async function executeJob(job) {
  const jobModule= require(job.payload.file);

  const method = jobModule[job.payload.method];

  const result = await method(...job.payload.args);

  console.log("method result:", result);
  console.log("stringified result:", JSON.stringify(result));

  await job.update({
    status: "completed",
    result: JSON.stringify(result)
  });

  console.log(`job ${job.id} completed successfully`);
}

async function processJob() {
  const job = await Job.findOne({
    where: {status: "queued"},
    order: [
      ["createdAt", "ASC"]
    ]
  });
  
  if (!job) {
    console.log("No jobs available");
    return;
  }

  try {
    await job.update({
      status: "processing"
    });

    await executeJob(job);

  } catch (err) {
    console.log(err);

    if (job.attempts < job.max_retries) {
      await job.update({
        status: "queued",
        attempts: job.attempts + 1
      });

    } else {
      await job.update({
        status: "failed",
        result: "ERROR: Maximum number of attempts reached"
      });
    }
  }
}

async function startWorker() {

    await sequelize.authenticate();

    console.log(
        "Worker connected to database"
    );


    setInterval(
        processJob,
        5000
    );
}


startWorker();