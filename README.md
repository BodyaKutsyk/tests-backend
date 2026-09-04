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
