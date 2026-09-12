# Test generator
## About
Test generator is the educational AI platform providing a useful and efficient way to study by creating and managing tests. 
You can upload an article or other type of data and with AI get tests for training.  

User stories:
- As a **student** I can upload .md or .txt files and receive tests for education.
- As a **student** I can configure test to set up how many questions I want to get
- As a **student** I can configure test to get an open-ended or multiple-choice type of answers

You can upload .md/.txt files, set an amount and get wanted tests. Also, you can choose whenever you need open-ended or multiple-choice tests.


[//]: # (треба продумати для розгорнутих відповідей для Response )

## Domain
1. User id: uuid, email: string, passwordHash: string, firstName: string, lastName: string, createdAt: date

2. Test id: uuid, name: string, userId: uuid, documentId: uuid, createdAt: date
3. Question id: uuid, testId: uuid, type: "open-ended" | "multiple-choice", value: string, createdAt: date
4. AnswerOption id: uuid, questionId: uuid, value: string, isCorrect: boolean, createdAt: date

5. Document id: uuid, size: number, type: ("md", "txt"), storageKey: string, userId: uuid, createdAt: date 
6. GenerationJob id: uuid, status: string ("queued", "parsing", "generating", "done", "failed"), questionType: "open-ended" | "multiple-choice", questionCount: number, documentId: uuid, testId: uuid | null, createdAt: date
7. Attempt id: uuid, testId: uuid, userId: uuid, score: number | null, createdAt: date
8. Response id: uuid, questionId: uuid, answerOptionId: uuid | null, value: string | null, attemptId: uuid, createdAt: date
9. Evaluation id: uuid, responseId: uuid, isCorrect: boolean, explanation: string | null, evaluationJobId: uuid, createdAt: date
10. EvaluationJob id: uuid, attemptId: uuid, status: (queued | evaluating | failed | done) createdAt: date
11. Quota: id: uuid, type: string ("storage", "generation") limit: (generation: number as count, storage as bytes), used: number, userId: uuid, createdAt: date

## Architecture decisions
## Trade-offs
1. The current implementation of the test generator doesn’t support PDF, images and other file types due to its complexity
2. 


## Installation
Before starting project you need to install npm packages via `npm i`
### OPENAPI
If you made some changes in the `openaopi/openapi.yaml` update docs HTML file via `npm run openapi:build`.
For validating `openapi.yml` use `npm run openapi:lint` based on `redocly/cli`
### Testing
1. project uses jest library as test runner
2. API contract testing is done via `pact@4`
3. to test project  use `npm test` or `npm run test`
4. to validate existing `openapi.yaml` specification use `npm run openapi:lint`

---

## Configuration

### How to start
1. Create `.env` file based on `.env.example`. For better understanding view the `src/config/env.schema.ts` file
2. Generate secrets with `sh scripts/init-secrets.sh`.
3. For different purposes use `pnpm docker:start:dev` or `pnpm docker:start:prod`
4. To verify `.env.example` and `env.schema` use `pnpm check:env`

### How to rotate database password
To rotate the database password, use `sh rotate.sh` command. Before running this command make sure that the database is running and healthy
