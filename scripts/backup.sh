#!/bin/sh
set -eu

BACKUP_DIR="/backups"
TIMESTAMP="$(date +'%Y-%m-%d_%H-%M-%S')"

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

cat > "$META_FILE" <<EOF
USERS_COUNT=$USERS_COUNT
QUOTA_USED_SUM=$QUOTA_USED_SUM
EOF

echo "Backup created: $BACKUP_FILE"
echo "Metadata created: $META_FILE"
echo "Users count: $USERS_COUNT"
echo "Quota used sum: $QUOTA_USED_SUM"