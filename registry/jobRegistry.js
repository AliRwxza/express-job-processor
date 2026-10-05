const path = require("path");
const fs = require("fs");

class JobRegistry {
  #map

  constructor(folderPath) {
    if (folderPath === undefined) {
      this.#map = new Map();
    
    } else {
      this.#discoverDirectory(folderPath);
    }
  }

  #discoverDirectory(folderPath) {
    const absolutePath = path.resolve(folderPath);
    const files = fs.readdirSync(absolutePath);

    for (const file of files) {
      if (file.endsWith('.js')) {
        const exported = require(folderPath);

        if (exported.type === undefined || exported.handler === undefined) {
          continue;
        }

        this.register(exported.type, exported.handler);
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