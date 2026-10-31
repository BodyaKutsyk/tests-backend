#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

if [ "${SKIP_VAULT:-0}" = "1" ]; then exec "$@"; fi

if [[ -f .env.infisical ]]; then
  set -a
  source .env.infisical
  set +a
fi

: "${INFISICAL_CLIENT_ID:?INFISICAL_CLIENT_ID is required}"
: "${INFISICAL_CLIENT_SECRET:?INFISICAL_CLIENT_SECRET is required}"
: "${INFISICAL_API_URL:?INFISICAL_API_URL is required}"

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