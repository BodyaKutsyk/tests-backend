#!/bin/sh
set -eu

BACKUP_DIR="/backups"
TIMESTAMP="$(date +'%Y-%m-%d_%H-%M-%S')"
BACKUP_DATE="$(date +'%Y-%m-%d')"
BACKUP_TIME="$(date +'%H:%M:%S')"

BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.dump"
META_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.meta"

export PGPASSWORD="$POSTGRES_ADMIN_PASSWORD"

mkdir -p "$BACKUP_DIR"

echo "Creating backup..."

USERS_COUNT="$(
  psql \
    -h db \
    -U "$POSTGRES_ADMIN" \
    -d "$POSTGRES_DB" \
    -tAc "SELECT COUNT(*) FROM users"
)"

QUOTA_USED_SUM="$(
  psql \
    -h db \
    -U "$POSTGRES_ADMIN" \
    -d "$POSTGRES_DB" \
    -tAc "SELECT COALESCE(SUM(used), 0) FROM quotas"
)"

pg_dump \
  -h db \
  -U "$POSTGRES_ADMIN" \
  -d "$POSTGRES_DB" \
  -Fc \
  -f "$BACKUP_FILE"

DUMP_SIZE="$(wc -c < "$BACKUP_FILE" | tr -d ' ')"

cat > "$META_FILE" <<EOF
USERS_COUNT=$USERS_COUNT
QUOTA_USED_SUM=$QUOTA_USED_SUM
BACKUP_DATE=$BACKUP_DATE
BACKUP_TIME=$BACKUP_TIME
TIMESTAMP=$TIMESTAMP
DUMP_SIZE_BYTES=$DUMP_SIZE
EOF

touch "$BACKUP_DIR/.last_success"

echo "Backup created: $BACKUP_FILE"
echo "Metadata created: $META_FILE"
echo "Date / Time: $BACKUP_DATE $BACKUP_TIME"
echo "Dump size: $DUMP_SIZE bytes"
echo "Users count: $USERS_COUNT"
echo "Quota used sum: $QUOTA_USED_SUM"