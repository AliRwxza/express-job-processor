async function executeJob(job) {
  const jobModule = require(job.payload.file);

  const method = jobModule[job.payload.method];

  const result = await method(job.payload);

  console.log(`job ${job.id} completed successfully`);

  return result;
}

process.on("message", async (message) => {
  try {
    const res = await executeJob(message.job);

    process.send({
      type: "ready",
      jobId: message.job.id,
      result: JSON.stringify(res)
    });

  } catch(err) {
    console.log("ERROR in worker:", err);
    
    process.send({
      type: "failed",
      attempts: message.job.attempts,
      maxRetries: message.job.maxRetries,
      jobId: message.job.id,
      result: "ERROR" + err.message
    });
  }
});