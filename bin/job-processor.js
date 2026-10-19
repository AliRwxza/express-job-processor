#!/usr/bin/env node

const { parseArgs } = require("node:util");
const path = require("node:path");
const fs = require("fs/promises");

const template = 
`require("dotenv").config();

module.exports = {
  driver: "database",
  workersCount: 1,
  jobsDirectory: "./jobs",

  database: {
    dialect: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
  },
};
`;

async function createTemplate(configPath = "../config/config.queue.js") {
  try {
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    await fs.writeFile(configPath, template, { flag: "wx" });

    console.log("Created", configPath);
  } catch(err) {
    if (err.code !== "EEXIST") {
      throw err;
    }

    console.log("Config file already exists");
  }
}

function printHelp() {
  console.log(`
    Usage:
      job-processor setup [options]
      job-processor start [options]

    Commands:
      setup   create a configuration template if missing, then run migrations
      start   start the default queue
      
    Options:
      --config <path>   Configuration file (default: ./queue.config.js)
      --help, -h        Show help

    Configuration uses CommonJS (module.exports).
  `);
}

function isPositiveInteger(value) {
  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    strict: true,
    allowPositionals: true,
    options: {
      config: { type: "string" },
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help || process.argv.length === 2) {
    printHelp();

    return;
  }

  const command = positionals[0];

  if (positionals.length !== 1 ||
    !["setup", "start"].includes(command)
  ) {
    throw new Error("Expected one command: setup or start");
  }

  const configPath = path.resolve(process.cwd(), values.config ?? "queue.config.js");

  if (command === "setup") {
    console.log("WE'RE HERE");
    await createTemplate(configPath);
    return;
  }

  const config = require(configPath);

  if (!config || typeof config !== "object") {
    throw new Error("Configuration must export an object");
  }

  if (typeof config.jobsDirectory !== "string" ||
    config.jobsDirectory.trim() === ""
  ) {
    throw new Error("No directory provided for defined jobs");
  }

  const queue = require("../index");
  
  queue.configure({
    ...config,
    jobsDirectory: path.resolve(
      path.dirname(configPath),
      config.jobsDirectory
    )
  });

  await queue.startWorkers();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});