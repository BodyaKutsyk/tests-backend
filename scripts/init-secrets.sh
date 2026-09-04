#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

set -a
source "$ROOT_DIR/.env"
set +a

mkdir -p "$ROOT_DIR/secrets"

if [ ! -f "$ROOT_DIR/secrets/db_password" ]; then
  : "${POSTGRES_USER_PASSWORD:?POSTGRES_USER_PASSWORD is not set}"

  printf '%s' "$POSTGRES_USER_PASSWORD" > "$ROOT_DIR/secrets/db_password"
  chmod 600 "$ROOT_DIR/secrets/db_password"
fi