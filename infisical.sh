#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Error: No command specified to run." >&2
  echo "Usage: $0 <command> [args...]" >&2
  exit 1
fi

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      [[ -z "${line// }" ]] && continue

      local var_name="${line%%=*}"
      var_name="${var_name// /}"

      if [[ -n "$var_name" && -z "${!var_name+x}" ]]; then
        export "$line"
      fi
    done < "$file"
  fi
}

if [[ -f .env ]]; then
  load_env_file .env
fi

SKIP_VAULT_FLAG="${SKIP_VAULT:-0}"
IS_CI="${CI:-false}"

if [[ "$SKIP_VAULT_FLAG" =~ ^(1|true|yes)$ ]] || [[ "$IS_CI" == "true" ]] || [[ -n "${GITHUB_ACTIONS:-}" ]]; then
  exec "$@"
fi

if ! command -v infisical &>/dev/null; then
  echo "Warning: 'infisical' CLI not found. Falling back to running command directly without Vault." >&2
  if [[ ! -f .env && -f .env.example ]]; then
    load_env_file .env.example
  fi
  exec "$@"
fi

if [[ -f .env.infisical ]]; then
  load_env_file .env.infisical
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