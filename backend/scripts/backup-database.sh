#!/bin/sh
# Database backup script
# Creates a backup of the database before making any changes
# Usage: ./scripts/backup-database.sh

set -e

BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${MYSQL_DATABASE:-time_tracking}"
DB_USER="root"
DB_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpassword}"
DB_HOST="${DB_HOST:-db}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"

echo "📦 Creating database backup..."
echo "   Database: $DB_NAME"
echo "   Backup file: $BACKUP_FILE"

# Create backup using mysqldump
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || {
  echo "❌ Backup failed. Trying alternative method..."
  
  # Alternative: Use docker exec if mysqldump not available
  docker exec time-tracking-db mysqldump -u "$DB_USER" -p"$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || {
    echo "❌ Backup failed. Please backup manually before proceeding."
    exit 1
  }
}

# Compress backup
if command -v gzip >/dev/null 2>&1; then
  gzip "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE}.gz"
  echo "✅ Backup compressed"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup created successfully!"
echo "   File: $BACKUP_FILE"
echo "   Size: $BACKUP_SIZE"
echo ""
echo "💡 To restore this backup:"
echo "   mysql -h $DB_HOST -u root -p$DB_PASSWORD $DB_NAME < $BACKUP_FILE"

