#!/bin/sh
set -eu

psql \
  -v ON_ERROR_STOP=1 \
  -v app_user="$POSTGRES_APP_USER" \
  -v app_password="$POSTGRES_APP_PASSWORD" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'EOSQL'

CREATE ROLE :"app_user"
WITH LOGIN PASSWORD :'app_password';

EOSQL