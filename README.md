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

1. Create a `.env` file based on `.env.example`.

   For a better understanding of the available environment variables and their validation rules, see `src/config/env.schema.ts`.

2. Generate the required secrets:
   ```bash
   sh scripts/init-secrets.sh
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
sh rotate.sh
```
The script generates a new database password and applies the required changes.

