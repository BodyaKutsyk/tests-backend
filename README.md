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
* `documentId: uuid[]`
* `testId: uuid | null`
* `userId`: uuid
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
1. project uses jest library as test runner
2. API contract testing is done via `pact@4`
3. to test project  use `pnpm test` or `pnpm test`
4. to validate existing `openapi.yaml` specification use `pnpm penapi:lint`

---

## Configuration

### Environment variables

```text
API_INTERNAL_PORT        -> Internal port used by the backend API inside the container.
API_EXTERNAL_PORT        -> External host port mapped to the backend API.
POSTGRES_DB              -> Name of the PostgreSQL database.
POSTGRES_USER            -> PostgreSQL application user used by the backend.
POSTGRES_USER_PASSWORD   -> Initial password for the PostgreSQL application user.
POSTGRES_ADMIN           -> PostgreSQL administrator username.
POSTGRES_ADMIN_PASSWORD  -> Password for the PostgreSQL administrator.
POSTGRES_PASSWORD_FILE   -> Path to the file containing the current rotated application user password.
```

### How to start

1. Create an . `.env.infisical` file base on `.env.infisical.example`
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
``` 
bash docker exec -i postgres psql -h ${DB_HOST} -U ${POSTGRES_ADMIN} ${POSTGRES_DB} < db/indexes.sql
```

## Grading
### How to run the app without Infisical infrastructure

To start the application without using Infisical, run:

```bash
SKIP_VAULT=1 pnpm infisical <command>
```
where `<command>` is the script you want to execute. In this mode, environment variables are loaded from the local `.env` file instead of being injected by Infisical.

### When to use QueryBuilder and Repository

The project uses Repository for simple CRUD operations because it provides a straightforward and convenient API.

QueryBuilder is used for more complex queries involving ORDER BY, GROUP BY, and JOIN clauses, primarily for generating reports.

### Synchronize
The `synchronize` option in `DataSource` is disabled because the project uses migrations.

### `onDelete` in Entities

The application uses `RESTRICT` for relations referencing the `User` entity to prevent accidental hard deletion while dependent records still exist.

`CASCADE` is used for child entities that have no meaningful value after their parent entity is deleted.

`SET NULL` is used for optional relations where the child entity should remain after the referenced entity is deleted.