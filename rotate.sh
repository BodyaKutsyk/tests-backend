#!/bin/sh
set -eu

cd "$(dirname "$0")"

set -a
. ./.env
set +a

NEW_PASSWORD="db-$(openssl rand -hex 8)"

docker compose exec -T db \
  psql -U "$POSTGRES_ADMIN" -d "$POSTGRES_DB" \
  -c "ALTER ROLE ${POSTGRES_USER} WITH PASSWORD '${NEW_PASSWORD}';" \
  >/dev/null

printf '%s' "$NEW_PASSWORD" > secrets/db_password

docker compose exec -T db \
  psql -U "$POSTGRES_ADMIN" -d "$POSTGRES_DB" -tA \
  -c "SELECT count(pg_terminate_backend(pid))
      FROM pg_stat_activity
      WHERE usename = '${POSTGRES_USER}';"