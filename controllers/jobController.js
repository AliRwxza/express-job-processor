const responseHandler = require("../helper/responseHandler");
const { Job, JobLog } = require("../models");
const { StatusCodes } = require("http-status-codes");

async function createJob(req, res) {
  const {payload, maxRetries, timeout} = req.body;

  const job = await Job.create({
    payload,
    maxRetries,
    timeout
  });

  return responseHandler(res, StatusCodes.ACCEPTED, 
    {
      message: "Job queued"
    }
  );
}

module.exports = {
  createJob
}