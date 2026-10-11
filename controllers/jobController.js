const responseHandler = require("../helper/responseHandler");
const { Job } = require("../models");
const { StatusCodes } = require("http-status-codes");
const jobRegistry = require("../registry/jobRegistry");

async function createJob(req, res) {
  const { type, payload } = req.body;

  const jobPath = jobRegistry.get(type);
  const jobClass = require(jobPath);

  const job = await Job.create({
    type,
    payload,
    timeout: jobClass.timeout,
    maxRetries: jobClass.maxRetries
  });

  return responseHandler(res, StatusCodes.ACCEPTED, 
    {
      message: "Job queued",
      jobId: job.id
    }
  );
}

module.exports = {
  createJob
}