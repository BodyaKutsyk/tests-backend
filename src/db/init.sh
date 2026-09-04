#!/usr/bin/env bash
set -euo pipefail

psql \
  -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<EOSQL

CREATE ROLE ${POSTGRES_USER}
WITH LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}';

EOSQL