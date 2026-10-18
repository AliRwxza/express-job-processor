class BaseJob {
  static timeout = 60;
  static maxRetries = 3;

  constructor() {
    throw new Error(`BaseJob and any of its subclasses are static utility classes and should not be instantiated.`)
  }

  static async handle(payload) {
    throw new Error(`Method handle() is not implemented in subclass ${this.name}`);
  }

  static async dispatch(payload = {}) {
    if (Number.isNaN(this.timeout) || !Number.isInteger(this.timeout) || this.timeout < 0) {
      return 1;
    }

    if (Number.isNaN(this.maxRetries) || !Number.isInteger(this.maxRetries) || this.maxRetries < 0) {
      return 1;
    }

    const { init } = require("../config/database");
    await init();

    const { Job } = require("../models");
    
    const job = await Job.create({
      type: this.name,
      payload: payload,
      maxRetries: this.maxRetries,
      timeout: this.timeout
    });

    return job;
  }

  static async failed() {
    throw new Error("BaseJob 'failed' is not yet implemented");
  }

  static async run(payload) {
    try {
      const result = await this.handle(payload);
      return result;
    } catch(err) {
      console.error(`Error executing ${this.name}`);
      throw err;
    }
  }
}

module.exports = BaseJob;