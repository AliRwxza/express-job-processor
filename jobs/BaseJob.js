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

  /**
   * Queue multiple jobs in one database operation.
   *
   * Pass an array to queue jobs with individual payloads, or pass one payload
   * together with a count to queue that same payload repeatedly.
   *
   * @param {object[]|object} payloadsOrPayload JSON-serializable payload(s) for this job type.
   * @param {number} [count] Number of copies to queue when passing a single payload.
   * @returns {Promise<object[]>} The created job records.
   */
  static async dispatchMany(payloadsOrPayload, count) {
    let payloads;

    if (Array.isArray(payloadsOrPayload)) {
      if (count !== undefined) {
        throw new TypeError("dispatchMany() does not accept a count when passed an array of payloads");
      }

      payloads = payloadsOrPayload;
    } else {
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new TypeError("dispatchMany() expects a non-negative integer count when passed a single payload");
      }

      payloads = Array.from({ length: count }, () => payloadsOrPayload);
    }

    if (Number.isNaN(this.timeout) || !Number.isInteger(this.timeout) || this.timeout < 0) {
      return 1;
    }

    if (Number.isNaN(this.maxRetries) || !Number.isInteger(this.maxRetries) || this.maxRetries < 0) {
      return 1;
    }

    if (payloads.length === 0) {
      return [];
    }

    const { init } = require("../config/database");
    await init();

    const { Job } = require("../models");

    return Job.bulkCreate(payloads.map((payload) => ({
      type: this.name,
      payload,
      maxRetries: this.maxRetries,
      timeout: this.timeout
    })));
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
