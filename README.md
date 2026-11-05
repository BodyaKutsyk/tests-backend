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
1. Project uses jest library as test runner
2. API contract testing is done via `pact@4`
3. To test the project, use `pnpm test`
4. To validate existing `openapi.yaml` specification use `pnpm openapi:lint`

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
| `REDIS_QUEUE_HOST`        | Host used to connect to the Redis Queue                                          |
| `REDIS_QUEUE_PORT`        | Port used to connect to the Redis Queue                                          |
| `REDIS_CACHE_HOST`        | Host used to connect to the Redis Cache                                          |
| `REDIS_CACHE_PORT`        | Port used to connect to the Redis Cache                                          |
| `REDIS_PASSWORD`          | Password for the Redis                                                           | 

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

Run these commands from the repository root. Set `SKIP_VAULT=1` so `pnpm infisical` loads the development values from `.env.example` without contacting Infisical. The grading Compose override passes those values to the API containers and starts them directly.

```bash
export SKIP_VAULT=1
export POSTGRES_HOST=127.0.0.1
export RABBITMQ_HOST=127.0.0.1
export REDIS_CACHE_HOST=127.0.0.1
export REDIS_QUEUE_HOST=127.0.0.1
pnpm install --frozen-lockfile
pnpm infisical bash -c 'mkdir -p secrets; printf "%s" "$POSTGRES_USER_PASSWORD" > secrets/db_password'
pnpm infisical docker compose -f docker-compose.yaml -f docker-compose.grading.yml up -d --wait db pg_bouncer rabbitmq redis-cache redis-queue
pnpm build
pnpm migrate
pnpm seed
pnpm infisical docker compose -f docker-compose.yaml -f docker-compose.grading.yml up -d --build --wait api
pnpm demo:cache
pnpm demo:session
pnpm demo:ratelimit
pnpm demo:queue
```

The cache Redis is published on port 6380 and the queue Redis on port 6379. The API is published on port 5137 by the development example. `--wait` lets Redis and PostgreSQL become healthy before migrations and demos start. The rate limit demo starts two additional API containers on ports 3001 and 3002.

### Running without Infisical

Each homework demo runs through `pnpm infisical`. With `SKIP_VAULT=1`, `infisical.sh` loads missing development variables from `.env.example` and runs the demo without contacting Infisical.

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

#### Results of n+1
```
Selecting 50 users that have tests.
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

Atomic UPDATE was chosen to improve query performance and avoid unnecessary explicit row locking.
The retry mechanism handles two PostgreSQL error codes: `40001` and `40P01`. 
In both cases, PostgreSQL aborts the affected transaction, so the operation must be retried in a new transaction.

### Postgres Connection Pool `transaction` mode
PgBouncer uses transaction mode to reuse database connections more efficiently. A client keeps the same PostgreSQL connection only during a transaction, and after COMMIT or ROLLBACK that connection returns to the pool. Because of this, session-level state is not reliable between transactions: regular SET, LISTEN, and session-level prepared statements may not work as expected across different transactions. SET LOCAL is safe because it only applies inside the current transaction.

## Trade-offs

### WebSocket vs SSE
WebSocket provides low-latency, duplex communication, allowing both the client and server to send messages independently. However, when using the native WebSocket API, the client needs to handle reconnection, implement cursor-based event recovery, and manage other reliability features manually.

SSE provides one-way communication from the server to the client. This approach is simpler and can be more lightweight for server-to-client updates, as it uses standard HTTP and does not require additional client-side libraries in browsers. Automatic reconnection is supported out of the box through the native browser EventSource API.

### RabbitmQ Prefetch
The default prefetch count for the `GenerationJob` consumer is set to 4, considering the 30-minute consumer timeout and the fact that generating a single test can take up to 7 minutes. This ensures that all prefetched jobs can be processed within the timeout window.

### Redis: Cache, Sessions, Rate Limiting, and Queue Demo

The project uses two Redis services because eviction policy is configured per server. Cache Redis uses `allkeys-lru`, so it can evict cached data under memory pressure. BullMQ and sessions use a separate Redis service with `noeviction`, AOF, and a persistent Docker volume because this state must survive process restarts and must not be evicted.

Cache entries have a TTL to bound staleness. TTL jitter spreads expirations and reduces simultaneous cache misses.

If a stampede lock expires or its owner crashes, requests may repeat the database read. This is acceptable here because the lock only avoids duplicate reads: the failure can increase database load but does not corrupt business data. A business invariant would need a stronger mechanism.

Sessions are stored in queue Redis. Authenticated requests validate the session and refresh its TTL, keeping active sessions alive. Rate limiting uses shared Redis counters across API instances. NestJS Throttler applies a fixed window of 4 requests per 5 seconds and uses client IP by default; excess requests return 429 with `Retry-After`. We chose the fixed window for its simple, inexpensive counter; a brief burst across a window boundary is acceptable for this endpoint.

#### Queue retry and scheduler demo

With Infisical, start Docker services so the API worker and its existing garbage-collection scheduler are running. For a run without Infisical, use the commands in `Grading` above.

```bash
pnpm infisical docker compose up -d --wait
```

Run the demo from the host:

```bash
pnpm demo:queue
```

The demo reads `maxmemory-policy` from queue Redis, adds the same job twice with one stable `jobId`, and confirms there is one queued job. The consumer intentionally fails this marked demo job twice; BullMQ retries it and the third attempt succeeds. The marked job exits before the garbage-collection code, so it does not delete document files or rows. The demo also counts configured schedulers and observes two completed scheduler runs, which takes a little over two minutes with the current 60-second interval.

#### Measured demo results

These are results from the local Docker stack on 2026-11-05. The API was published on port 3000, cache Redis on 6380, and queue Redis on 6381. The demo commands finished with exit code 0.

`pnpm demo:cache`:

```text
cache-lru=1
cache-maxmemory=1
warmed=50
ttl-distinct=47
concurrent=20
db-calls=1
db-calls-warm=0
```

`pnpm demo:session`:

```text
requests=3
sessions=1
in-redis=1
ttl-renewed=1
```

`pnpm demo:ratelimit`:

```text
instances=2
limit=4
requests=20
allowed=4
blocked=16
status=429
retry-after=1
```

`pnpm demo:queue`:

```text
queue-noeviction=1
attempts=3
completed=1
added=2
queued=1
schedulers=1
scheduled-runs=2
```

Scheduler count can be greater than one if more schedulers are registered on the queue. The demo exits with an error status if a required retry, de-duplication, Redis policy, or scheduler check fails.
