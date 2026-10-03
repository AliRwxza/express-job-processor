require("dotenv").config();

const { sequelize } = require("../config/database");
const { Job } = require("../models");
const { setTimeout } = require("node:timers/promises");

async function executeJob(job) {
  const jobModule= require(job.payload.file);

  const method = jobModule[job.payload.method];

  const result = await method(job.payload);

  await job.update({
    status: "completed",
    result: JSON.stringify(result)
  });

  console.log(`job ${job.id} completed successfully`);
}

async function worker(workerId) {
  console.log("Starting worker " + workerId);
  
  while (true) {
    const transaction = await sequelize.transaction();
    const job = await Job.findOne({
      where: {status: "queued"},
      order: [
        ["createdAt", "ASC"]
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
      skipLocked: true
    });

    if (!job) {
      console.log("No jobs available");

      transaction.rollback();

      await setTimeout(5000);

      continue;
    }

    console.log(`Job ${job.id} locked`);

    try {
      if (job.attempts >= job.maxRetries) {
        console.log("Number of retries exceeded.");

        throw Error("MAX_RET");
      }

      await job.update({
        status: "processing",
        attempts: job.attempts + 1
      }, {
        transaction
      });

      await transaction.commit();

      console.log(`Job ${job.id} status updated to processing`);

      await executeJob(job);

    } catch (err) {
      // console.log(err);
      if (job.attempts < job.maxRetries) {
        await job.update({
          status: "queued",
        });

      } else {
        await job.update({
          status: "failed",
          result: "Error: maximum number of retries exceeded"
        }, {
          transaction
        });
        
        transaction.commit();
      }
    }
  }
}

module.exports = worker;