#!/usr/bin/env node

const { parseArgs } = require("node:util");
const path = require("node:path");

function printHelp() {
  console.log(`
    Usage:
      job-processor start [options]

    Options:
      --config <path>   Configuration file (default: ./queue.config.js)
      --help, -h        Show help
  `);
}

function isPositiveInteger(value) {
  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0;
}

async function main() {
  const { values } = parseArgs({
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

  const configPath = path.resolve(process.cwd(), values.config ?? "queue.config.js");
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