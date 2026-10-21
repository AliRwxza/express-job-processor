# Node Dispatch

A MySQL-backed background job queue for Node.js. Move slow or CPU-intensive tasks out of your application's request handlers and process them in separate worker processes.

Your application adds jobs to the database with `dispatch()`. The `node-dispatch start` command runs workers that pick up queued jobs, execute their handlers, and save the results. Jobs support configurable timeouts and retries.

Node Dispatch currently supports one queue and MySQL. It can be used with Express or any other Node.js application.

Currently, only MySQL is supported. More features are on the way

## Installation and usage

You need Node.js, npm, and MySQL 8.x with InnoDB tables. The examples below use CommonJS.

### 1. Install and configure

From your application's root directory:

```bash
npm install node-dispatch dotenv
npx node-dispatch setup --config ./config/config.js
```

This creates the requested configuration file without overwriting an existing file, then runs all pending package migrations. Configure the database values first if the file was just created, then rerun the same command.

Update the configuration for your application:

```js
// queue.config.js
require("dotenv").config();

module.exports = {
  driver: "database",
  workersCount: 3,
  jobsDirectory: "./jobs",
  removeOnComplete: false,
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
```

Provide these values in your environment or in a local `.env` file:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_NAME=job_processor
DB_USER=queue_user
DB_PASSWORD=your_password
```

Keep real credentials out of Git. `dotenv` is optional if your environment already supplies these values; remove its import in that case.

`workersCount` sets the number of worker processes. `jobsDirectory` points to your job classes and, when using the CLI, is resolved relative to the configuration file.

### 2. Prepare the database

Create a MySQL database and a user with access to it. `node-dispatch setup --config ./config/config.js` applies the package's migrations using that configuration. To run them manually instead:

```bash
npx sequelize-cli db:migrate --url "mysql://USER:PASSWORD@HOST:3306/job_processor" --migrations-path ./node_modules/node-dispatch/migrations
```

Replace the connection placeholders with your database settings. URL-encode special characters in credentials. This migration command uses the URL, not `queue.config.js`.

### 3. Define a job

Create `jobs/AddNumbers.js`:

```js
const { BaseJob } = require("node-dispatch");

class AddNumbers extends BaseJob {
  static timeout = 30;   // Seconds per execution
  static maxRetries = 2; // Retries after the first execution

  static async handle({ a, b }) {
    return { sum: a + b };
  }
}

module.exports = AddNumbers;
```

Each job must export a named class extending `BaseJob` and implement a static `handle()` method. Put job files directly inside the configured directory. Use unique class names and JSON-serializable payloads and results.

Throw an error from `handle()` when a job fails. The manager retries it up to `maxRetries` times after failing for the first time. Design handlers so retrying a task does not unintentionally repeat external side effects.

### 4. Dispatch a job

Configure the package once during your application's startup, before dispatching jobs:

```js
// app.js
const path = require("node:path");
const queue = require("node-dispatch");
const config = require("./queue.config.js");
const AddNumbers = require("./jobs/AddNumbers");

queue.configure({
  ...config,
  jobsDirectory: path.resolve(__dirname, config.jobsDirectory),
});

async function main() {
  const job = await AddNumbers.dispatch({ a: 10, b: 20 });
  console.log("Queued job:", job.id);
}

main().catch(console.error);
```

`dispatch()` saves the job and returns its database record. It does not wait for execution. In a web application, use the same configuration at startup and dispatch jobs from your request handlers.

To enqueue several instances of the same job, pass their payloads to `dispatchMany()`. It performs one bulk insert and returns the created records:

```js
const jobs = await AddNumbers.dispatchMany([
  { a: 10, b: 20 },
  { a: 30, b: 40 },
]);
```

When every instance should receive the same payload, pass that payload and the
number of instances instead:

```js
const jobs = await ProcessBatchData.dispatchMany({ failure: true }, 3);
```

### 5. Start workers

In a separate terminal, from the same application root:

```bash
npx node-dispatch start
```

Workers continue polling for jobs while the command is running. Completed jobs store their result in the database.

Set `removeOnComplete: true` to remove completed queue rows. Jobs that exhaust their retries are then moved to the `failed_jobs` archive with status `failed` and their worker error output in `result`.

To use a different configuration file:

```bash
npx node-dispatch start --config ./config/queue.config.cjs
```

For help:

```bash
npx node-dispatch --help
```

## Development and contributing

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/node-dispatch.git
cd node-dispatch
npm ci
git switch -c fix/your-change
```

Create a local `queue.config.js` and configure a development database using the example above. Install the database tables from the repository root:

```bash
npx sequelize-cli db:migrate --url "mysql://USER:PASSWORD@HOST:3306/job_processor" --migrations-path ./migrations
```

Run the CLI directly while developing:

```bash
node ./bin/job-processor.js setup
node ./bin/job-processor.js start
```

To try your local package in another application, run `npm link` from this repository, then `npm link node-dispatch` from that application's directory. You can then use the imports and examples above against your local changes.

Before submitting a pull request, verify that jobs can be dispatched and processed. For changes to retries or timeouts, check those failure paths too. The repository currently has no automated test script.

Commit your changes, push your branch to your fork, and open a pull request against the upstream default branch. Explain what changed, why, and how you verified it. Do not include credentials or local database configuration.
