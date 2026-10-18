#!/usr/bin/env node

const { parseArgs } = require("node:util");
const path = require("node:path");

const args = [
  "db-host",
  "db-port",
  "db-name",
  "db-user",
  "db-password",
  "workers",
  "jobs-directory",
];

function printHelp() {
  console.log(`
    Usage:
      job-processor start [options]

    Required options:
      --db-host <host>
      --db-port <port>
      --db-name <name>
      --db-user <user>
      --db-password <password>
      --workers <count>
      --jobs-directory <path>

    Other options:
      --help, -h`
  );
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
      ...Object.fromEntries(
        args.map((name) => [name, { type: "string" }])
      ),
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help || process.argv.length === 2) {
    printHelp();

    return;
  }

  for (const name of args) {
    if (values[name] === undefined ||
      (name !== "db-password" && values[name].trim() === "")
    ) {
      throw new Error(`missing required argument: --${name}`);
    };
  }

  if (!isPositiveInteger(values.workers)) {
    throw new Error("Workers count must be a non-negative value");
  }

  const workersCount = Number(values.workers);
  const dbPort = Number(values["db-port"]) || 3306; // default mysql port

  if (!isPositiveInteger(values["db-port"]) || dbPort > 65535) {
    throw new Error("Database port must be an integer between 1 and 65535");
  }

  const queue = require("../index");
  
  queue.configure({
    driver: "database",
    workersCount,
    jobsDirectory: path.resolve(values["jobs-directory"]),
    database: {
      host: values["db-host"],
      port: dbPort,
      name: values["db-name"],
      user: values["db-user"],
      password: values["db-password"],
      dialect: "mysql",
      logging: false
    }
  });

  await queue.startWorkers();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});