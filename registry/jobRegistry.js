const path = require("path");
const fs = require("fs");

class JobRegistry {
  #map = {}

  constructor(folderPath) {
    this.#map = new Map();
    if (folderPath !== undefined) {
      this.#discoverDirectory(folderPath);
    }
  }

  #discoverDirectory(folderPath) {
    const absolutePath = path.resolve(folderPath); // folderPath: from the terminal directory (cwd)
    const files = fs.readdirSync(absolutePath);

    for (const file of files) {
      if (file.endsWith('.js')) {
        const jobPath = path.join(absolutePath, file);
        const jobClass = require(jobPath);

        this.register(jobClass.name, jobPath);
      }
    }
  }

  register(type, handler) {
    this.#map.set(type, handler);
  }

  unregister(type) {
    return this.#map.delete(type);
  }

  has(type) {
    return this.#map.has(type);
  }

  get(type) {
    return this.#map.get(type);
  }
}

module.exports = JobRegistry;