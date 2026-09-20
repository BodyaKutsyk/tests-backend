#!/usr/bin/env bash
set -euo pipefail

set -a
source ./.env.infisical
set +a

export INFISICAL_TOKEN="$(
  infisical login \
    --method=universal-auth \
    --client-id="$INFISICAL_CLIENT_ID" \
    --client-secret="$INFISICAL_CLIENT_SECRET" \
    --domain="$INFISICAL_API_URL" \
    --plain \
    --silent
)"

exec infisical run \
  --domain="$INFISICAL_API_URL" \
  --env=dev \
  -- "$@"