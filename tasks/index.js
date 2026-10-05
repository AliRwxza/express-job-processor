const { run, processBatchData, heavyDataTransform } = require("../exampleFiles/sampleTasks");

const handlers = {
  primeCalculation: run,
  processBatchData,
  heavyDataTransform
};

function getHandler(type) {
  const handler = handlers[type];

  if (!handler) {
    throw new Error(`Unknown job type: ${type}`);
  }

  return handler;
}

module.exports = {
  getHandler
};
