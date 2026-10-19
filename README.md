# Express Job Processor

A Node.js background job processor with a single MySQL-backed queue, child-process workers, configurable timeouts, and retries.

Applications enqueue jobs through a JavaScript API. A separate worker process loads configuration and processes jobs through the `job-processor` CLI.

Express is not required to use the queue.

> This project is under development. Shutdown, transaction handling, and crash recovery have known limitations described below.

## Features

- One database-backed queue.
- Configurable number of child-process workers.
- Job discovery from a configured directory.
- Static job classes extending `BaseJob`.
- Configurable execution timeout and retry limit per job.
- Job claiming through transactions, row locks, and `skipLocked`.
- Database persistence for job status, payload, and result.
- CLI startup using a project configuration file.
- JavaScript API for configuration and dispatch.

## Requirements

- A current supported Node.js release. Node.js 24 is a suitable development target; the package does not yet declare a tested compatibility range.
- npm.
- MySQL with InnoDB tables and support for `SELECT ... FOR UPDATE SKIP LOCKED`. Use MySQL 8.x as the development target.
- An existing database and credentials with access to the queue tables.

## Installation

### From source

From the repository directory:

```bash
npm ci
```

### Local package development

From the package directory:

```bash
npm link
```

From the consuming application:

```bash
npm link express-job-processor
```

This allows the application to import the local package while you develop it.

### From npm

After publishing this package under a name you control:

```bash
npm install express-job-processor
```

The examples use the current package name.

## Database setup

Create the database before running producers or workers:

```sql
CREATE DATABASE job_processor;
```

The package does not automatically create or migrate tables.

From the repository root, run the included migrations:

```bash
npx sequelize-cli db:migrate --url "mysql://USER:PASSWORD@HOST:3306/job_processor" --migrations-path ./migrations
```

Replace the placeholders. URL-encode special characters in credentials, and avoid retaining real passwords in shell history or shared logs.

This command uses its connection URL; it does not load `queue.config.js`.

The migrations create:

| Table | Purpose |
| --- | --- |
| `jobs` | Stores job type, payload, status, retry counters, timeout, result, and timestamps |
| `job_logs` | Defines a schema for execution logs; the current manager does not write these records |

### Migration packaging

The current `package.json` does not include `migrations/` in its `files` allowlist.

Before publishing, add `"migrations/"` if installed-package users should receive the migrations.

After that change, consumers can use:

```bash
npx sequelize-cli db:migrate --url "mysql://USER:PASSWORD@HOST:3306/job_processor" --migrations-path ./node_modules/express-job-processor/migrations
```

## Configuration

Create `queue.config.js` in the consuming application's root directory:

```js
module.exports = {
  driver: "database",
  workersCount: 3,
  jobsDirectory: "./src/jobs",

  database: {
    dialect: "mysql",
    host: process.env.DB_HOST,
    port: 3306,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
  },
};
```

Supply the referenced environment variables through your shell, hosting platform, or process manager.

The queue runtime does not automatically load `.env`. The configuration file decides where its values come from.

Do not commit database credentials to source control.

Each application or worker-manager process loads its own configuration and creates its own connection pool. Processes do not share configuration memory or a live database connection.

### Module format

The current CLI loads configuration using `require()` and expects the configuration object directly.

Use:

```js
module.exports = {
  // configuration
};
```

For an application using `"type": "module"`, name the CommonJS configuration `queue.config.cjs` and run:

```bash
npx job-processor start --config ./queue.config.cjs
```

### Configuration options

| Option | Default | Description |
| --- | --- | --- |
| `driver` | `"database"` | Storage driver; `"file"` is not implemented |
| `workersCount` | `1` | Number of child worker processes; supply a positive integer |
| `jobsDirectory` | `"./jobs"` | Directory containing job modules |
| `database.name` | `null` | Database name |
| `database.dialect` | `"mysql"` | Sequelize dialect; MySQL is the implemented queue target |
| `database.host` | `"localhost"` | Database host |
| `database.port` | `3306` | Database port |
| `database.user` | `"root"` | Database username |
| `database.password` | `null` | Database password |
| `database.logging` | `false` | Sequelize SQL logging setting |

Configuration merges top-level properties and separately merges the `database` object. Omitted properties retain their existing values.

Explicit `undefined` values still overwrite existing properties. For example, a missing environment variable can overwrite a database default with `undefined`.

This is a one-level merge, not a general recursive merge.

### Path resolution

When using the CLI, a relative `jobsDirectory` is resolved from the configuration file's directory.

For example:

- Configuration: `/app/config/queue.config.js`
- Jobs directory: `../src/jobs`
- Resolved directory: `/app/src/jobs`

When using the JavaScript API directly, resolve paths yourself.

## Define a job

Create `src/jobs/AddNumbers.js`:

```js
const { BaseJob } = require("express-job-processor");

class AddNumbers extends BaseJob {
  static timeout = 30;
  static maxRetries = 2;

  static async handle(payload) {
    const { a, b } = payload;

    if (typeof a !== "number" || typeof b !== "number") {
      throw new Error("a and b must be numbers");
    }

    return { sum: a + b };
  }
}

module.exports = AddNumbers;
```

### Job requirements

- Export a named class directly through `module.exports`.
- Extend the package's `BaseJob`.
- Implement a static `handle(payload)` method.
- Place job files directly inside `jobsDirectory`.
- Use a unique class name for each job type.
- Use JSON-serializable payloads and results.

Discovery scans `.js` files and does not recurse into subdirectories.

The class name is stored as the database job type. Renaming a class can prevent already queued jobs from resolving to their implementation.

Jobs are static utility classes:

```js
await AddNumbers.dispatch({ a: 10, b: 20 });
```

Do not instantiate them:

```js
// Unsupported:
new AddNumbers();
```

Job modules are loaded during discovery and again inside worker processes. Keep module loading safe and initialize worker dependencies explicitly.

Workers do not inherit application globals or in-memory service instances.

## Dispatch jobs

Configure the package before dispatching:

```js
const path = require("node:path");
const queue = require("express-job-processor");
const config = require("./queue.config.js");
const AddNumbers = require("./src/jobs/AddNumbers");

queue.configure({
  ...config,
  jobsDirectory: path.resolve(__dirname, config.jobsDirectory),
});

async function enqueueExample() {
  const job = await AddNumbers.dispatch({
    a: 10,
    b: 20,
  });

  console.log("Queued job:", job.id);
}

enqueueExample().catch(console.error);
```

`dispatch()` inserts a queued job and returns a Sequelize job instance.

It does not execute the handler or wait for the result. A worker manager must be running separately.

For Express applications, configure the package during application startup and dispatch jobs from request handlers as needed.

## Start the default queue

From the consuming application's root:

```bash
npx job-processor start
```

Load another configuration file:

```bash
npx job-processor start --config ./config/queue.config.cjs
```

Show help:

```bash
npx job-processor --help
```

### Using an npm script

Add this to the consuming application's `package.json`:

```json
{
  "scripts": {
    "queue": "job-processor start"
  }
}
```

Then run:

```bash
npm run queue
```

### Running from the package repository

```bash
npm run cli -- start --config ./queue.config.js
```

Create the configuration file first, or point to one in the consuming application.

The standalone `--` forwards subsequent arguments from npm to the CLI.

### Runtime behavior

The worker manager:

1. Loads configuration.
2. Initializes the database and job registry.
3. Forks the configured number of workers.
4. Claims jobs for idle workers.
5. Continues polling while running.

The command stays in the foreground. It does not daemonize or exit when the queue becomes empty.

The manager sleeps one second between polling cycles; database query time adds to that interval.

### CLI options

| Option | Description |
| --- | --- |
| `--config <path>` | Configuration path; defaults to `./queue.config.js` |
| `--help`, `-h` | Display help |

Database flags such as `--db-host` and `--db-password` are no longer accepted.

The intended command is `start`. However, the current implementation does not validate positional arguments, so other positional commands can also start workers.

## JavaScript API

Import the package:

```js
const queue = require("express-job-processor");
```

### `queue.configure(options)`

Merges configuration into the process-local store.

Returns `undefined`. Do not export its return value from the configuration file.

Configuration changes are rejected after worker initialization.

Always configure before the first dispatch too: dispatching can create and cache the database connection before worker initialization occurs.

### `queue.startWorkers()`

Initializes storage and discovery, starts child workers, and runs the polling loop.

```js
queue.configure(options);
await queue.startWorkers();
```

The returned promise remains pending while the manager runs.

Calling it again after initialization returns without starting another manager in the same process.

### `queue.stopWorkers()`

Intended to stop workers and close the database connection.

Shutdown is currently incomplete. Do not rely on graceful draining or restarting the same manager instance.

### `queue.config`

Returns the current configuration object:

```js
const workerCount = queue.config.workersCount;
```

The getter exposes the underlying object rather than an immutable copy.

Avoid modifying it directly or logging it because it can contain credentials.

### `BaseJob.dispatch(payload = {})`

Persists a job using the subclass's:

- Class name.
- `timeout`.
- `maxRetries`.

Returns a Sequelize job instance on successful insertion.

Invalid timeout or retry values currently return `1` instead of throwing.

### `BaseJob.run(payload)`

Executes the handler directly.

The worker uses this internally. Calling it yourself bypasses persistence, worker isolation, retries, and manager-enforced timeouts.

### `BaseJob.failed()`

A placeholder method that throws when called.

The worker manager does not automatically invoke it.

### `queue.jobRegistry`

Currently exported as `null`.

The export captures the initial value and is not updated when the internal registry is initialized. Automatic directory discovery is the supported registration route for consumers at present.

## Timeouts and retries

### Timeout

```js
static timeout = 30;
```

The timeout is measured in seconds.

When execution exceeds the deadline, the manager kills the worker process. Its exit handler handles the failure and normally creates a replacement worker.

A timeout of zero triggers an immediate timeout; it does not disable the limit.

### Retry limit

```js
static maxRetries = 2;
```

This permits up to three executions through the normal failure path:

1. Initial execution.
2. First retry.
3. Second retry.

The database `attempts` field starts at zero and increments when a failed job is requeued. It records retry progression rather than total executions.

There is no configurable retry backoff.

Design handlers to tolerate repeated execution. External side effects and job status updates are not one atomic operation.

## Job lifecycle

| Status | Meaning |
| --- | --- |
| `queued` | Waiting to be claimed |
| `processing` | Claimed for execution |
| `completed` | Handler completed successfully |
| `failed` | Failure is terminal, such as exhausted retries |
| `cancelled` | Allowed by the schema; no public cancellation operation exists |

Queued jobs are selected by:

1. `attempts` ascending.
2. Creation time ascending.

This favors jobs with fewer recorded retries. Ordering is not strict FIFO across all jobs.

On success, the worker JSON-stringifies the handler's return value and the manager stores it in `result`.

On failure, the manager stores an error string and either requeues the job or marks it failed.

There is currently no public status command or result-waiting API. Inspect the database to observe status and results.

## Known limitations

The current implementation has the following limitations:

- One queue only.
- MySQL-backed processing only; file storage is unimplemented.
- Authentication is started without awaiting or catching its promise.
- `await init()` does not wait for authentication because `init()` returns a Sequelize instance synchronously.
- Graceful shutdown contains a blocking busy-wait and does not terminate child processes correctly.
- Database shutdown is called without the connection argument expected by `closeConnection()`.
- The CLI does not install cleanup handlers for termination signals.
- Transaction commit is not awaited.
- Claim transactions have no rollback path when queries fail.
- Asynchronous job assignments are not awaited.
- Jobs left `processing` after a manager crash are not automatically reclaimed.
- Configuration validation is limited.
- Invalid job modules are logged and skipped during discovery.
- Attempt logs are not written to `job_logs`.
- Exactly-once execution is not guaranteed.
- Scheduling, priorities, dashboards, cancellation, and graceful restart are not implemented.
- The supplied repository has no automated test script or declared package license.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Configuration file not found | Run from the application root or provide `--config` |
| Configuration rejected | Export the object directly through `module.exports` |
| Missing jobs directory | Set `jobsDirectory` and verify the resolved path exists |
| Access denied with `using password: NO` | Check `database.password`, spelling, and environment variables |
| Queue table missing | Run migrations against the database used by the application and workers |
| Job stays queued | Check that a manager is running and review database and discovery errors |
| Invalid job type | Check the stored type, class name, and discovered job modules |
| Repeated timeout | Check the job's timeout and handler execution time |
| npm reports unknown flags | Use a standalone `--` after the npm script name |

## Project structure

| Path | Purpose |
| --- | --- |
| `index.js` | Public API and initialization |
| `bin/job-processor.js` | CLI configuration loading and startup |
| `config/store.js` | Defaults and configuration merging |
| `config/database.js` | Sequelize connection lifecycle |
| `jobs/BaseJob.js` | Job base class and dispatch |
| `registry/jobRegistry.js` | Discovery and validation |
| `workers/workerManager.js` | Polling, claiming, supervision, retries, and timeouts |
| `workers/worker.js` | Child-process execution |
| `models/` | Sequelize models and associations |
| `migrations/` | Database schema migrations |
| `examples/tasks/` | Example CPU-intensive jobs |

The bundled examples use repository-relative imports. Jobs in consuming applications should import `BaseJob` from the installed package.