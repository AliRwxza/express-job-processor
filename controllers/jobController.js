const responseHandler = require("../helper/responseHandler");
const { Job } = require("../models");
const { StatusCodes } = require("http-status-codes");
const { getHandler } = require("../tasks");

async function createJob(req, res) {
  const { type, payload, maxRetries, timeout } = req.body;

  // Validate the type against the same registry used by workers.
  getHandler(type);

  const job = await Job.create({
    type,
    payload,
    maxRetries,
    timeout
  });

  return responseHandler(
    res,
    StatusCodes.ACCEPTED,
    {
      message: "Job queued",
      jobId: job.id
    }
  );
}

module.exports = {
  createJob
};
