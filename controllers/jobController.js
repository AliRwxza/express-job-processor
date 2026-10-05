const responseHandler = require("../helper/responseHandler");
const { Job } = require("../models");
const { StatusCodes } = require("http-status-codes");

async function createJob(req, res) {
  const { type, payload } = req.body;
  const timeout = Number(req.body.timeout);
  const maxRetries = Number(req.body.maxRetries);

  if (!type) {
    return responseHandler(
      res,
      StatusCodes.BAD_REQUEST,
      {
        error: "Job type cannot be empty"
      }
    );
  }

  if (Number.isNaN(timeout) || !Number.isInteger(timeout) || timeout < 0) {
    
    return responseHandler(
      res,
      StatusCodes.BAD_REQUEST,
      {
        error: "Timeout needs to be a nonnegative integer"
      }
    );
  }

  if (Number.isNaN(maxRetries) || !Number.isInteger(maxRetries) || maxRetries < 0) {
    
    return responseHandler(
      res,
      StatusCodes.BAD_REQUEST,
      {
        error: "Max retries needs to be a nonnegative integer"
      }
    );
  }

  const job = await Job.create({
    type,
    payload,
    maxRetries,
    timeout
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