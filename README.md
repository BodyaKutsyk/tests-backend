# Test generator
## About
Test Generator is an educational AI-powered platform designed to help students study more efficiently by automatically generating tests from uploaded learning materials.
Users can upload .md or .txt documents and generate tests based on their content. Before generation, users can configure the number of questions and choose between open-ended and multiple-choice questions.

User stories:
- As a **student** I can upload .md or .txt files and receive tests for education.
- As a **student** I can configure test to set up how many questions I want to get
- As a **student** I can configure test to get an open-ended or multiple-choice type of answers

You can upload .md/.txt files, set an amount and get wanted tests. Also, you can choose whenever you need open-ended or multiple-choice tests.

## Domain

### User

Represents a registered platform user.

* `id: uuid`
* `email: string`
* `passwordHash: string`
* `firstName: string`
* `lastName: string`
* `createdAt: date`
* `updatedAt: date`
* `deletedAt: date | null`

### Document

Represents a file uploaded by a user and used as source material for test generation.

* `id: uuid`
* `storageKey: string`
* `name: string`
* `mimeType: string`
* `size: number`
* `userId: uuid`
* `createdAt: date`
* `updatedAt: date`
* `deletedAt: date | null`

### Test

Represents a generated test based on one or more source documents.

* `id: uuid`
* `name: string`
* `userId: uuid`
* `documentIds: uuid[]`
* `createdAt: date`
* `updatedAt: date`
* `deletedAt: date | null`

### Question

Represents a question within a test.

* `id: uuid`
* `testId: uuid`
* `type: "open-ended" | "multiple-choice"`
* `value: string`
* `createdAt: date`
* `updatedAt: date`

### AnswerOption

Represents an available answer option for a multiple-choice question.

* `id: uuid`
* `questionId: uuid`
* `value: string`
* `isCorrect: boolean`
* `createdAt: date`
* `updatedAt: date`

### GenerationJob

Represents the asynchronous process of generating a test from one or more documents.

* `id: uuid`
* `documentIds: uuid[]`
* `testId: uuid | null`
* `userId: uuid`
* `questionType: "open-ended" | "multiple-choice"`
* `questionCount: number`
* `status: "queued" | "parsing" | "generating" | "done" | "failed"`
* `createdAt: date`
* `updatedAt: date`

### Attempt

Represents a user's attempt to complete a test.

* `id: uuid`
* `testId: uuid`
* `userId: uuid`
* `score: number`
* `createdAt: date`
* `updatedAt: date`

### Response

Represents a user's answer to a question within a test attempt.

* `id: uuid`
* `questionId: uuid`
* `attemptId: uuid`
* `answerOptionId: uuid | null`
* `value: string | null`
* `createdAt: date`
* `updatedAt: date`

### EvaluationJob

Represents the asynchronous process of evaluating responses from a test attempt.

* `id: uuid`
* `attemptId: uuid`
* `status: "queued" | "evaluating" | "done" | "failed"`
* `createdAt: date`
* `updatedAt: date`

### Evaluation

Represents the evaluation result for a submitted response.

* `id: uuid`
* `responseId: uuid`
* `evaluationJobId: uuid`
* `isCorrect: boolean`
* `explanation: string | null`
* `createdAt: date`
* `updatedAt: date`

### Quota

Represents a resource usage limit assigned to a user.

* `id: uuid`
* `userId: uuid`
* `type: "storage" | "generation"`
* `maxLimit: number`
* `used: number`
* `createdAt: date`
* `updatedAt: date`

For `generation` quotas, `maxLimit` and `used` represent generation count. For `storage` quotas, they represent storage usage in bytes.


## Architecture decisions
## Trade-offs
1. The current implementation of the test generator doesn’t support PDF, images and other file types due to its complexity
2. 


## Installation
Before starting the project, install the dependencies:

`pnpm install`

### OPENAPI
If you made some changes in the `openapi/openapi.yaml` update docs HTML file via `pnpm openapi:build`.
For validating `openapi.yml` use `pnpm openapi:lint` based on `redocly/cli`
### Testing
The project uses Jest. Run `pnpm test` for unit tests, `pnpm test:integration` for repository tests, and `pnpm test:e2e` for HTTP tests. Integration, e2e, and provider tests use disposable PostgreSQL containers through Testcontainers to keep test data isolated from the development database.

### Pact contract tests

Pact uses consumer-driven contracts: the consumer test records the frontend's expected API behavior, then the provider verifier checks the API against that contract. Provider verification seeds its disposable database for the declared provider state and publishes the verification result to the broker on every run. The broker stores contract versions separately from the disposable test database.

Start the broker and its PostgreSQL database:

```bash
pnpm infisical docker compose -f docker-compose.pact.yml up -d --wait
```

Run the consumer contract test, publish the generated contract, and verify the provider:

```bash
export PACT_BROKER_URL="${PACT_BROKER_URL:-http://localhost:9292}"
pnpm test:contract
```

The provider verification result is published by `verify:provider`. Check deployability for both participants separately:

```bash
pnpm contract:can-i-deploy "$PACT_BROKER_URL"
pnpm contract:can-i-deploy:provider "$PACT_BROKER_URL"
```

---

## Configuration

### Environment variables


| Key                       | Description                                                                      |
| ------------------------- | -------------------------------------------------------------------------------- |
| `API_PORT`                | Host port mapped to the backend API.                                             |
| `POSTGRES_DB`             | Name of the PostgreSQL database.                                                 |
| `POSTGRES_USER`           | PostgreSQL application user used by the backend.                                 |
| `POSTGRES_USER_PASSWORD`  | Initial password for the PostgreSQL application user.                            |
| `POSTGRES_ADMIN`          | PostgreSQL administrator username.                                               |
| `POSTGRES_ADMIN_PASSWORD` | Password for the PostgreSQL administrator.                                       |
| `POSTGRES_PASSWORD_FILE`  | Path to the file containing the current rotated application user password.       |
| `POSTGRES_PORT`           | Connection port to PostgreSQL.                                                   |
| `POSTGRES_HOST`           | Host of the PostgreSQL server.                                                   |
| `PACT_BROKER_DB_NAME`     | Name of the Pact Broker PostgreSQL database.                                     |
| `PACT_BROKER_DB_USER`     | PostgreSQL username for the Pact Broker                                          |
| `PACT_BROKER_DB_PASSWORD` | PostgreSQL password for the Pact Broker                                          |
| `PACT_BROKER_PORT`        | Port exposed by the Pact Broker service                                          |
| `RABBITMQ_USER`           | Username used to authenticate with RabbitMQ                                      |
| `RABBITMQ_PASSWORD`       | Password used to authenticate with RabbitMQ                                      |
| `RABBITMQ_PORT`           | Port used to connect to the RabbitMQ                                             |
| `RABBITMQ_HOST`           | Host used to connect to the RabbitMQ                                             |

### How to start

1. Create an `.env.infisical` file base on `.env.infisical.example`
   For a better understanding of the available environment variables and their validation rules, see `src/config/env.schema.ts`.

2. Generate the required secrets:
   ```bash
   bash scripts/init-secrets.sh
   ```
3. Start the application in the required mode:
   ```bash
   pnpm docker:start:dev
   ```
   or
   ```bash
   pnpm docker:start:prod
   ```
4. Validate that `.env.example` is consistent with `env.schema.ts`:
   ```bash
   pnpm check:env
   ```

### How to rotate the database password

Before rotating the database password, make sure the database container is running and healthy.

Run:
```bash
bash rotate.sh
```
The script generates a new database password and applies the required changes.
### How to apply database indexes
Run to apply optimization indexes:
``` bash 
docker exec -i postgres psql -U ${POSTGRES_ADMIN} ${POSTGRES_DB} < db/indexes.sql
```

## Grading

### 0. Prepare Environment Variables                                                                                                                                                                                         
                                                                                                                                                                                                                           
Before running grading commands directly on the host, export the database variables:                                                                                                                                         
                                                                                                                                                                                                                           
```bash                                                                                                                                                                                                                      
export POSTGRES_DB=my_db                                                                                                                                                                                                     
export POSTGRES_ADMIN=admin                                                                                                                                                                                                  
export POSTGRES_ADMIN_PASSWORD=admin_password                                                                                                                                                                                
export POSTGRES_HOST=127.0.0.1                                                                                                                                                                                               
export POSTGRES_PORT=5432   

### Running without Infisical

To execute commands without Infisical, use:

```bash
SKIP_VAULT=1 pnpm infisical <command>
```

Replace `<command>` with the command you want to execute. In this mode, environment variables are loaded from the local `.env` file.

### Backup and Restore Drill

To create a database backup manually:

```bash
pnpm infisical docker exec pg_backup /bin/sh scripts/backup.sh
```

The backup is created in `custom` PostgreSQL format (`-Fc`) together with metadata used for validation.

To run the restore drill:

```bash
pnpm infisical bash scripts/restore-drill.sh
```

The restore drill takes the latest backup, restores it into a clean temporary PostgreSQL container, compares the restored data with the saved metadata, and prints `MATCH` if validation succeeds. The temporary restore container is removed after the drill.

### Running the N+1 Demo

**1. Start the Docker services.**

With Infisical:

```bash
pnpm infisical docker compose up -d --wait
```

Without Infisical:

```bash
SKIP_VAULT=1 pnpm infisical docker compose up -d --wait
```

The `--wait` flag waits for the services to become running or healthy before proceeding.

**2. Run the N+1 demonstration.**

With Infisical:

```bash
pnpm infisical bash -c '
  POSTGRES_HOST=127.0.0.1 pnpm demo:nplus1
'
```

Without Infisical:

```bash
SKIP_VAULT=1 pnpm infisical bash -c '
  POSTGRES_HOST=127.0.0.1 pnpm demo:nplus1
'
```

`POSTGRES_HOST=127.0.0.1` overrides the Docker hostname because the demonstration runs directly on the host machine rather than inside a container.
Pass a sample size to compare query counts for different N values, for example `pnpm demo:nplus1 200`. The default is 50.

#### Results of n+1
```
Selecting up to 50 tests and users.
Before fix: 51 queries
After fix: 1 query
```

### When to use QueryBuilder and Repository

The project uses `Repository` for simple CRUD operations because it provides a straightforward and convenient API.

`QueryBuilder` is used for more complex queries involving `ORDER BY`, `GROUP BY`, and `JOIN` clauses, primarily for generating reports.

### Synchronize
The `synchronize` option in `DataSource` is disabled because the project uses migrations.

### `onDelete` in Entities

The application uses `RESTRICT` for relations referencing the `User` entity to prevent accidental hard deletion while dependent records still exist.

`CASCADE` is used for child entities that have no meaningful value after their parent entity is deleted.

`SET NULL` is used for optional relations where the child entity should remain after the referenced entity is deleted.

// можливі транзакції: 
1. створення тесту (test) -> питання -> відповіді
2. проходження тесту (attempt) -> response
3. створення фідбеку по тесту (responses) -> evaluationJob -> evaluations 

### Concurrency

#### 1. Atomic UPDATE vs Race Conditions (`pnpm demo:race`)
An atomic `UPDATE` with a conditional clause (`WHERE "used" + :amount <= "max_limit"`) was chosen to manage quota usage. This approach avoids unnecessary explicit row locking while preventing race conditions.

When running 50 concurrent transactions attempting to consume storage quota (max limit allows only 10 increments of 1024 bytes):
- **Attempts:** 50
- **Successful:** 10 (10 out of 50 succeeded)
- **Failed:** 40 (rejected due to quota limit)
- **Final quota used:** 10,240 / 10,240 (remaining: 0)
- **Over limit rows:** 0 (the invariant `used <= max_limit` holds)

```text
Attempts: 50
Successful: 10
Failed: 40
Final used: 10240
Final remaining quota: 0
Over limit rows: 0
Race condition invariant passed
```

#### 2. Job Queue with `SKIP LOCKED` (`pnpm demo:workers`)
To process queued generation jobs concurrently without collisions, workers use `SELECT ... FOR UPDATE SKIP LOCKED`. This allows each worker to pick up the next available job immediately without waiting on locks held by other workers.

Benchmark results processing a queue of 100 jobs (with 250ms processing time per job):
- **1 worker (sequential):** ~27.5 s
- **3 workers (concurrent with `SKIP LOCKED`):** **9.69 s**
- **Processed more than once:** 0 (no duplicate processing)

```text
[9.69 s] Workers did total: 100 operations
Processed more than once: 0
```

#### 3. Transaction Retry on Serialization Failure / Deadlock (`pnpm demo:retry`)
The retry mechanism handles two transient PostgreSQL error codes: `40001` (`serialization_failure`) and `40P01` (`deadlock_detected`). In both cases, PostgreSQL automatically aborts the affected transaction, requiring the operation to be retried in a new transaction after a short backoff.

Benchmark results with 2 concurrent workers updating quota under `SERIALIZABLE` isolation:
- **Total operations / attempts:** 20
- **Total retries:** 3 (handled error `40001` / `40P01` and succeeded on retry)
- **Final result:** All operations completed without data corruption or quota violations.

```text
[worker-1 | 0.1s] did total operations: 12
[worker-2 | 0.088s] did total operations: 8
Attempts: 20
Total retries: 3
```

### Postgres Connection Pool `transaction` mode
PgBouncer uses transaction mode to reuse database connections more efficiently. A client keeps the same PostgreSQL connection only during a transaction, and after COMMIT or ROLLBACK that connection returns to the pool. Because of this, session-level state is not reliable between transactions: regular SET, LISTEN, and session-level prepared statements may not work as expected across different transactions. SET LOCAL is safe because it only applies inside the current transaction.

## Trade-offs

### WebSocket vs SSE

| Criterion | SSE | WebSocket |
|---|---|---|
| Direction | Server to client | Two-way |
| Connection setup | HTTP response stream | WebSocket upgrade |
| Reconnection | Built in through `EventSource` | Client must reconnect |
| Best fit | Job status and notifications | Interactive, low-latency exchanges |
| Infrastructure | Works with standard HTTP proxies | Requires WebSocket upgrade support |
| Scaling events | Needs shared event delivery across instances | Also needs shared event delivery across instances |

For this API, SSE is the simpler choice for one-way generation status updates. Use WebSocket when clients need to send frequent messages over the same connection.

With two or more API instances, events kept in memory are not shared. A client connected to another instance may miss an update. Shared event delivery is needed for both SSE and WebSocket.

Run the demo:

```bash
pnpm infisical pnpm exec tsx scripts/realtime-demo.mjs
pnpm infisical pnpm exec tsx scripts/realtime-demo.mjs --same-room
```

## Async Events with RabbitMQ

The demos publish to the existing work queue and observe the API consumer through RabbitMQ queue statistics and job records. The API consumer stays enabled; the demos do not start a second consumer or purge the queues.

```bash
pnpm docker:start:dev
```

In a second terminal, run each demo. The package commands execute the scripts inside the API container through Infisical, where the database secret file and Docker service addresses are available:

```bash
pnpm demo:publish
pnpm demo:dlq
pnpm demo:duplicate
```

Expected results:

```text
demo:publish
published=5
delivered=5
effect=5
acked=5
dlq=0
prefetch=4

demo:dlq
rejected=1
work=0
dlq=1
dlq-reason=rejected
effect=0

demo:duplicate
deliveries=2
effect=1
skipped=1
```

`prefetch=4` limits the number of unacknowledged messages. Each job has two 5-second stages, and the workflow checks its state every 6 seconds: up to 22 seconds per job, or about 88 seconds for four concurrent messages.

RabbitMQ provides at-least-once delivery: if an ack is lost, a message may be delivered again. Processing must therefore be idempotent. The duplicate demo publishes the same event twice and checks that the job completes once and redelivery does not create a second effect.

