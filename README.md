## Installation
Before starting project you need to install npm packages via `npm i`
## OPENAPI
If you made some changes in the `openaopi/openapi.yaml` update docs HTML file via `npm run openapi:build`.
For validating `openapi.yml` use `npm run openapi:lint` based on `redocly/cli`
### Testing
1. project uses jest library as test runner
2. API contract testing is done via `pact@4`
3. to test project  use `npm test` or `npm run test`
4. to validate existing `openapi.yaml` specification use `npm run openapi:lint`