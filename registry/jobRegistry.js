const path = require("path");
const fs = require("fs");
const BaseJob = require("../jobs/job");

class JobRegistry {
  #map = {}

  constructor(folderPath) {
    this.#map = new Map();
    if (folderPath !== undefined) {
      this.#discoverDirectory(folderPath);
    }
  }

  #validateClass(type, filePath) {
    const jobClass = require(filePath);

    if (!type) {
      throw new Error("Job type should be a valid string");
    }
    
    if (typeof jobClass !== 'function') {
      throw new Error("Job modules must export a valid named class");
    }

    if (!BaseJob.prototype.isPrototypeOf(jobClass.prototype)) {
      throw new Error("Job module must extend BaseJob class");
    }

    if (typeof jobClass.handle !== 'function' ||
      jobClass.handle === BaseJob.handle
    ) {
      throw new Error("Job class must implement handle()");
    }

    return true;
  }

  #discoverDirectory(folderPath) {
    const absolutePath = path.resolve(folderPath); // folderPath: from the terminal directory (cwd)
    const files = fs.readdirSync(absolutePath);

    for (const file of files) {
      if (file.endsWith('.js')) {
        this.#validateClass()

        this.register(jobClass.name, jobPath);
      }
    }
  }

  #fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  #isInDict(type) {
    return this.#map.has(type);
  }

  register(type, filePath) {
    this.#validateClass(type, filePath);

    this.#map.set(type, filePath);
  }

  unregister(type) {
    return this.#map.delete(type);
  }

  validateRuntimeKey(type) {
    const filePath = this.#isInDict(type);
    
    return filePath && this.#fileExists(filePath); 
  }

  get(type) {
    return this.#map.get(type);
  }
}

module.exports = JobRegistry;