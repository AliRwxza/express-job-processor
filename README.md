# Task Processor

A Node.js task processing system that accepts jobs through an HTTP API and executes them asynchronously using multiple worker processes.

## Overview

The Task Processor separates job creation from job execution:

1. A client submits a job through the API.
2. The job is stored in MySQL with a `queued` status.
3. The worker manager finds queued jobs and assigns them to available workers.
4. Each worker executes its assigned job in a separate Node.js process.
5. The job is marked as `completed` or as `failed` depending on the result.
6. Jobs that exceed their configured timeout are terminated and handled as failures.
7. If a worker process crashes, the manager replaces it and recovers the associated job if it doesn't exceed its max number of retries.

The system uses multiple processes so that individual jobs are isolated from the main manager process and can be terminated independently.

## Tech Stack

- Node.js
- Express
- MySQL
- Sequelize
- CommonJS
- Node.js `child_process.fork()`

## Architecture

```text
                    HTTP Client
                         |
                         v
                  +--------------+
                  |   Express    |
                  |     API      |
                  +--------------+
                         |
                         v
                  +--------------+
                  |    MySQL     |
                  |     Jobs     |
                  +--------------+
                         ^
                         |
                  +--------------+
                  |    Worker    |
                  |    Manager   |
                  +--------------+
                    /    |    \
                   /     |     \
                  v      v       v
             Worker    Worker   Worker
               1         2         3
```

### Main Components

#### API

The Express API is responsible for accepting and validating job creation requests and storing jobs in the database.

#### Worker Manager

The worker manager:

* Creates and monitors worker processes.
* Finds queued jobs.
* Assigns jobs to idle workers.
* Tracks which job is assigned to each worker.
* Enforces job timeouts.
* Handles worker failures and crashes.
* Replaces terminated workers.

#### Workers

Each worker is a separate Node.js process created using `fork()`.

A worker receives a job from the manager, loads the requested module, executes the requested method, and reports the result back to the manager.

#### Database

MySQL stores jobs and their execution state.

Sequelize is used as the ORM for database operations.

## Job Lifecycle

A job normally follows this lifecycle:

```text
queued
  |
  v
processing
  |
  +----> completed
  |
  +----> failed
  |
  +----> queued (retry)
```

### Job States

| Status       | Description                                 |
| ------------ | ------------------------------------------- |
| `queued`     | Waiting for an available worker             |
| `processing` | Currently assigned to a worker              |
| `completed`  | Successfully executed                       |
| `failed`     | Execution failed and no more retries remain |

## Job Structure

A job contains the execution configuration and its current state.

The important fields are:

| Field        | Description                             |
| ------------ | --------------------------------------- |
| `id`         | Unique job identifier                   |
| `payload`    | Information required to execute the job |
| `status`     | Current job state                       |
| `timeout`    | Maximum execution time in seconds       |
| `attempts`   | Number of attempts already made         |
| `maxRetries` | Maximum number of retries allowed       |
| `result`     | Execution result or error information   |
| `createdAt`  | Job creation time                       |
| `updatedAt`  | Last update time                        |

## Job Type and Payload

A job consists of a **type** and a **payload**.

- `type` identifies which registered task handler should execute the job.
- `payload` contains the data passed to that handler.

Example:

```json
{
  "type": "processBatchData",
  "payload": {
    "itemsCount": 12,
    "delayPerItemMs": 1000
  }
}
```

The worker resolves the type through the task registry and executes the corresponding handler:

```js
const handler = getHandler(job.type);
const result = await handler(job.payload);
```

The client does not provide a file path or JavaScript method name. Only job types registered by the application can be executed.
## Creating a Job

### `POST /api/jobs`

Creates a new job and adds it to the queue.

### Request Body

```json
{
  "maxRetries": 3,
  "timeout": 60,
  "payload": {
    "filePath": "./tasks/example.js",
    "methodName": "processData",
    "args": [10, "hello"]
  }
}
```

### Fields

#### `maxRetries`

Maximum number of times a failed job can be retried upon initial failure.

* Must be a non-negative integer.
* `0` means the job is not retried.

#### `timeout`

Maximum execution time for the job, in seconds.

* Must be a positive integer.
* When the limit is exceeded, the worker is terminated and the job is handled as a failure.

#### `payload`

Execution information for the worker.

* `filePath` — path to the JavaScript module.
* `methodName` — exported function to execute.
* `args` — arguments passed to the function.

### Response

A successfully created job returns:

```http
202 Accepted
```

with the created job identifier.

## Retries

When a worker reports a failure, the manager checks the job's retry configuration.

```text
attempts < maxRetries
```

If retries remain, the job is returned to the `queued` state.

If no retries remain, the job is marked as `failed`.

## Timeouts

Each job has its own timeout value.

The manager starts a timer when a job is assigned to a worker.

```text
Job assigned
     |
     v
Start timeout
     |
     +---- job completes/fails normally
     |          |
     |          v
     |       clear timer
     |
     +---- timeout expires
                |
                v
          handle failure
                |
                v
            kill worker
                |
                v
          create replacement
```

The timeout is managed by the worker manager rather than the worker itself. This allows the manager to terminate a worker even when the worker is blocked by a CPU-intensive operation or an infinite loop.

## Worker Crash Recovery

Workers run as independent child processes.

If a worker exits unexpectedly while processing a job, the manager:

1. Detects the worker's exit.
2. Handles the associated job so it does not remain permanently stuck in `processing`.
3. Creates a replacement worker.

This prevents a failed worker process from permanently reducing the worker pool or leaving jobs stuck.

## Concurrent Job Processing

Multiple workers allow multiple jobs to execute concurrently.

Each worker can process one job at a time:

```text
Worker 1 → Job A
Worker 2 → Job B
Worker 3 → Job C
Worker 4 → idle
```

The manager tracks the currently assigned job for each worker.

```js
{
  id: 1,
  process: workerProcess,
  job: assignedJob
}
```

A worker is considered available when its `job` reference is `null`.

## Project Structure

```text
.
├── app.js
├── bin/
│   └── www
├── config/
│   ├── config.js
│   └── database.js
├── controllers/
│   └── jobController.js
├── helper/
│   └── responseHandler.js
├── exampleFiles/
│   └── sampleTasks.js
├── models/
│   ├── index.js
│   ├── job.js
│   └── jobLog.js
├── routes/
│   ├── index.js
│   └── job.js
├── workers/
│   ├── workerManager.js
│   └── worker.js
├── public/
│   └── ...
├── views/
│   └── ...
├── migrations/
│   └── ...
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

The exact structure may vary depending on the current implementation, but the main responsibilities remain separated between the API, database layer, worker manager, workers, and executable task modules.

## Configuration

Create a `.env` file containing the database configuration:

```env
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret

WORKERS_COUNT=number_parallel_workers
```

Adjust the values according to your MySQL configuration.

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

Create the required MySQL database and configure the environment variables.

The project uses Sequelize migrations to create and modify the database schema.

Run all pending migrations with:

```bash
npx sequelize-cli db:migrate
```

Run the application with:

```bash
npm start
```

## Adding a Task

A task is a normal CommonJS JavaScript module that exports the methods that workers are allowed to execute.

Example:

```js
async function processData(count, message) {
  // task implementation

  return {
    count,
    message
  };
}

module.exports = {
  processData
};
```

The task can then be referenced by a job payload:

```json
{
  "filePath": "./tasks/example.js",
  "methodName": "processData",
  "args": [10, "hello"]
}
```

## Design Goals

The project is designed around the following goals:

* Asynchronous job execution.
* Multiple concurrent worker processes.
* Isolation between the manager and individual jobs.
* Configurable job timeouts.
* Retry support.
* Worker crash recovery.
* Safe job assignment under concurrent managers.
* Persistent job state in MySQL.
* Clear separation between API, job management, and task execution.

```