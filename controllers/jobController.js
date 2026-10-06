const responseHandler = require("../helper/responseHandler");
const { Job } = require("../models");
const { StatusCodes } = require("http-status-codes");
const JobRegistry = require("../registry/jobRegistry");

async function createJob(req, res) {
  const { type, payload } = req.body;
  const jobRegistry = new JobRegistry("./tasks");

  const jobClass = require(jobRegistry.get(type));

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