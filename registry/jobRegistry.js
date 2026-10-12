const path = require("path");
const fs = require("fs");
const { platform } = process;
const local = path[platform === `win32` ? `win32` : `posix`];

const BaseJob = require("../jobs/BaseJob");

class JobRegistry {
  #map = new Map();

  #validateClass(filePath) {
    const localPath = filePath.replaceAll(path.sep, local.sep);
    const jobClass = require(localPath);
    
    if (typeof jobClass !== 'function') {
      throw new Error("Job modules must export a valid named class");
    }

    if (!BaseJob.prototype.isPrototypeOf(jobClass.prototype)) {
      throw new Error("Job module must extend BaseJob class");
    }

    if (typeof jobClass.handle !== 'function' ||
      jobClass.handle === BaseJob.handle)
    {
      throw new Error("Job class must implement handle()");
    }

    return jobClass.name;
  }

  discoverDirectory(folderPath) {
    const absolutePath = path.resolve(folderPath); // folderPath: from the terminal directory (cwd)
    const files = fs.readdirSync(absolutePath);

    for (const file of files) {
      const filePath = path.join(absolutePath, file);

      if (filePath.endsWith('.js')) {
        try {
          
          let jobClassName = this.#validateClass(filePath);

          if (jobClassName) {
            this.register(jobClassName, filePath);
          }

        } catch (err) {
          console.error(`File ${filePath} does not meet the requirements: ${err}`);
        }
      }
    }
  }

  register(type, filePath) {
    if (!type || typeof type !== 'string') {
      throw new Error("Job type must be a non-empty string.");
    }

    if (this.#map.has(type)) {
      throw new Error(`Job type ${type} already exists.`);
    }

    if (!this.#validateClass(filePath)) {
      throw new Error(`Class validation failed.`);
    }
    this.#map.set(type, filePath);
  }

  unregister(type) {
    return this.#map.delete(type);
  }

  validateRuntimeKey(type) {
    const filePath = this.#map.get(type);
    
    return filePath && fs.existsSync(filePath);
  }

  get(type) {
    return this.#map.get(type);
  }
}

const jobRegistry = new JobRegistry();

module.exports = jobRegistry;