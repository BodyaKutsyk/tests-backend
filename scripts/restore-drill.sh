#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="./backups"

RESTORE_SERVICE="restore-drill"
RESTORE_CONTAINER="pg_restore-drill"

LATEST_BACKUP="$(
  find "$BACKUP_DIR" \
    -maxdepth 1 \
    -type f \
    -name '*.dump' \
    -printf '%T@ %p\n' \
    | sort -nr \
    | head -n 1 \
    | cut -d' ' -f2-
)"

if [ -z "$LATEST_BACKUP" ]; then
  echo "No backup files found"
  exit 1
fi

META_FILE="${LATEST_BACKUP%.dump}.meta"

if [ ! -f "$META_FILE" ]; then
  echo "Metadata file not found: $META_FILE"
  exit 1
fi

EXPECTED_USERS_COUNT="$(
  grep '^USERS_COUNT=' "$META_FILE" | cut -d= -f2
)"

EXPECTED_QUOTA_USED_SUM="$(
  grep '^QUOTA_USED_SUM=' "$META_FILE" | cut -d= -f2
)"

BACKUP_NAME="$(basename "$LATEST_BACKUP")"

echo "Restore drill"
echo "Backup: $BACKUP_NAME"
echo "Expected users count: $EXPECTED_USERS_COUNT"
echo "Expected quota used sum: $EXPECTED_QUOTA_USED_SUM"

cleanup() {
  echo "Cleaning up restore container..."

  docker compose \
    --profile restore \
    rm -sf "$RESTORE_SERVICE" >/dev/null 2>&1 || true
}

trap cleanup EXIT

# Remove container left from a previous failed drill
cleanup

START_TIME="$(date +%s)"

echo "Starting clean PostgreSQL container..."

docker compose \
  --profile restore \
  up -d "$RESTORE_SERVICE"

echo "Waiting for PostgreSQL..."

until docker exec "$RESTORE_CONTAINER" \
  pg_isready \
    -U "$POSTGRES_ADMIN" \
    -d "$POSTGRES_DB" \
    >/dev/null 2>&1
do
  sleep 1
done

echo "Restoring backup..."

docker exec \
  -e PGPASSWORD="$POSTGRES_ADMIN_PASSWORD" \
  "$RESTORE_CONTAINER" \
  pg_restore \
    -U "$POSTGRES_ADMIN" \
    -d "$POSTGRES_DB" \
    --clean \
    --if-exists \
    --no-owner \
    "/backups/$BACKUP_NAME"

echo "Running validation..."

ACTUAL_USERS_COUNT="$(
  docker exec \
    -e PGPASSWORD="$POSTGRES_ADMIN_PASSWORD" \
    "$RESTORE_CONTAINER" \
    psql \
      -U "$POSTGRES_ADMIN" \
      -d "$POSTGRES_DB" \
      -tAc "SELECT COUNT(*) FROM users"
)"

ACTUAL_QUOTA_USED_SUM="$(
  docker exec \
    -e PGPASSWORD="$POSTGRES_ADMIN_PASSWORD" \
    "$RESTORE_CONTAINER" \
    psql \
      -U "$POSTGRES_ADMIN" \
      -d "$POSTGRES_DB" \
      -tAc "SELECT COALESCE(SUM(used), 0) FROM quotas"
)"

END_TIME="$(date +%s)"
RTO_SECONDS="$((END_TIME - START_TIME))"

echo
echo "Expected:"
echo "  users:      $EXPECTED_USERS_COUNT"
echo "  quota used: $EXPECTED_QUOTA_USED_SUM"

echo
echo "Actual:"
echo "  users:      $ACTUAL_USERS_COUNT"
echo "  quota used: $ACTUAL_QUOTA_USED_SUM"

echo
echo "RTO: ${RTO_SECONDS}s"

if [ "$EXPECTED_USERS_COUNT" != "$ACTUAL_USERS_COUNT" ] ||
   [ "$EXPECTED_QUOTA_USED_SUM" != "$ACTUAL_QUOTA_USED_SUM" ]; then
  echo "MISMATCH"
  exit 1
fi

echo "MATCH"