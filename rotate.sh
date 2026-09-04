#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
export $(cat .env | xargs)

NEW_PASSWORD="db-$(openssl rand -hex 8)"
docker compose exec -T db psql -U $POSTGRES_ADMIN -d $POSTGRES_DB \
  -c "ALTER ROLE ${POSTGRES_USER} WITH PASSWORD '${NEW_PASSWORD}';" >/dev/null

printf '%s' "${NEW_PASSWORD}" > secrets/db_password

docker compose exec -T db psql -U $POSTGRES_ADMIN -d $POSTGRES_DB -tA \
  -c "SELECT count(pg_terminate_backend(pid)) FROM pg_stat_activity WHERE usename = '${POSTGRES_USER}';"