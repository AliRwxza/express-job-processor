async function executeJob(job, path) {
  const jobModule = require(path);

  const result = await jobModule.run(job.payload);

  console.log(`job ${job.id} completed successfully`);

  return result;
}

process.on("message", async (message) => {
  try {
    const res = await executeJob(message.job, message.path);

    process.send({
      type: "ready",
      result: JSON.stringify(res)
    });

  } catch(err) {
    console.log("ERROR in worker:", err);

    process.send({
      type: "failed",
      result: "ERROR: " + err.message
    });
  }
});