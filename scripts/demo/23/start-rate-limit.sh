#!/usr/bin/env bash
set -euo pipefail

if [[ "${SKIP_VAULT:-0}" == "1" ]]; then
  exec pnpm infisical docker compose \
    -f docker-compose.yaml -f docker-compose.grading.yml \
    --profile rate-limit-demo up -d --build --force-recreate --wait \
    api-rate-a api-rate-b
fi

exec pnpm infisical docker compose \
  --profile rate-limit-demo up -d --build --force-recreate --wait \
  api-rate-a api-rate-b
