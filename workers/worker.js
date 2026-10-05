const { getHandler } = require("../tasks");

async function executeJob(job) {
  const handler = getHandler(job.type);

  const result = await handler(job.payload);

  console.log(`job ${job.id} completed successfully`);

  return result;
}

process.on("message", async (message) => {
  try {
    const res = await executeJob(message.job);

    process.send({
      type: "completed",
      result: JSON.stringify(res)
    });
  } catch (err) {
    console.log("ERROR in worker:", err);

    process.send({
      type: "failed",
      result: "ERROR: " + err.message
    });
  }
});
