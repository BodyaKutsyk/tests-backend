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
The project uses Jest. Run `pnpm test` for unit tests, `pnpm test:integration` for repository tests, and `pnpm test:e2e` for HTTP tests. Integration, e2e, and provider tests use disposable PostgreSQL containers through Testcontainers. Each run gets a clean database that is discarded afterward, which prevents tests from changing development data and reduces failures caused by shared or stale state. Pact provider verification uses the same disposable-database approach, while the Pact Broker runs separately with persistent storage so published contracts and verification results remain available between test runs.

### Pact contract tests

Pact uses consumer-driven contracts: the consumer test records the frontend's expected API behavior, then the provider verifier checks the API against that contract. Provider verification seeds its disposable database for the declared provider state and publishes the verification result to the broker on every run. The broker stores contract versions separately from the disposable test database, so test data can be safely reset without losing contract history or verification results.

Start the broker and its PostgreSQL database:

```bash
pnpm infisical docker compose -f docker-compose.pact.yml up -d --wait
```

Run the consumer contract test, publish the generated contract, and verify the provider:

```bash
export PACT_BROKER_URL="${PACT_BROKER_URL:-http://localhost:9292}"
pnpm test:contract
```

The provider verification result is published by `verify:provider`. Check deployability for both participants separately: the first command checks the consumer (`frontend`), and the second checks the provider (`tests-api`). Run both commands because a deploy is safe only when the contracts for each participant are compatible with the versions recorded in the broker.

```bash
pnpm contract:can-i-deploy "$PACT_BROKER_URL"
pnpm contract:can-i-deploy:provider "$PACT_BROKER_URL"
```

For each command, a successful result reports that the participant version is safe to deploy and exits with status `0`. If the broker has no matching verification or reports an incompatible contract, the command reports that deployment is not safe and exits with a non-zero status. Treat both checks as required; a passing consumer check does not imply that the provider check passes, or vice versa.

#### CI result

In [GitHub Actions run](https://github.com/BodyaKutsyk/tests-backend/actions/runs/40947017588/job/123704943241?pr=11), both deployability checks passed:

| Participant checked | Version | Contract partner | Partner version | Result |
| --- | --- | --- | --- | --- |
| `frontend` (consumer) | `0.1` | `tests-api` | `0.1` | Safe to deploy |
| `tests-api` (provider) | `0.1` | `frontend` | `0.1` | Safe to deploy |

The broker reported that all required verification results were published and successful. It also warned that no deployment environment was specified, so the result is not environment-specific.

---

## Configuration

### Environment variables

```text
API_PORT                 -> Port used by the backend API.
POSTGRES_DB              -> Name of the PostgreSQL database.
POSTGRES_USER            -> PostgreSQL application user used by the backend.
POSTGRES_USER_PASSWORD   -> Initial password for the PostgreSQL application user.
POSTGRES_ADMIN           -> PostgreSQL administrator username.
POSTGRES_ADMIN_PASSWORD  -> Password for the PostgreSQL administrator.
POSTGRES_PASSWORD_FILE   -> Path to the file containing the current rotated application user password.
POSTGRES_PORT            -> Connection port to the PostgreSQL
POSTGRES_HOST            -> Host of the PostgreSQL
PACT_BROKER_DB_NAME      -> Pact Broker PostgreSQL database name.
PACT_BROKER_DB_USER      -> Pact Broker PostgreSQL user name.
PACT_BROKER_DB_PASSWORD  -> Pact Broker PostgreSQL password.
PACT_BROKER_PORT         -> Pact Broker service port.
PACT_BROKER_URL          -> Pact Broker URL, default http://localhost:9292.

```

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



