const { Job } = require("../models");

class BaseJob {
  timeout = 60;
  maxRetries = 3;

  constructor() {
    throw new Error(`BaseJob and any of its subclasses are static utility classes and should not be instantiated.`)
  }

  static async handle(payload) {
    throw new Error(`Method handle() is not implemented in subclass ${this.constructor.name}`);
  }

  static async dispatch(payload = {}) {
    if (Number.isNaN(timeout) || !Number.isInteger(timeout) || timeout < 0) {
      return 1;
    }

    if (Number.isNaN(maxRetries) || !Number.isInteger(maxRetries) || maxRetries < 0) {
      
      return 1;
    }
    
    const job = await Job.create({
      type: this.name,
      payload: payload,
      maxRetries,
      timeout
    });

    return job ? 0 : 1;
  }

  static async failed() {
    throw new Error("BaseJob 'failed' is not yet implemented")
  }

  static async run(payload) {
    try {
      const result = await this.handle(payload);
      return result;
    } catch(err) {
      console.error(`Error executing ${this.name}`);
    }

    throw error;
  }
}

module.exports = BaseJob;