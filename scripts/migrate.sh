#!/bin/bash
# Database migration runner
# Usage: ./scripts/migrate.sh <database_url> <migrations_dir>
#
# Tracks applied migrations in a `schema_migrations` table.
# On first run against an existing database, bootstraps known migrations as already applied.

set -euo pipefail

DATABASE_URL="${1:?Usage: migrate.sh <database_url> <migrations_dir>}"
MIGRATIONS_DIR="${2:?Usage: migrate.sh <database_url> <migrations_dir>}"

# Create schema_migrations table if it doesn't exist
psql "$DATABASE_URL" -q -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
"

# Bootstrap: if schema_migrations is empty but known tables exist,
# seed existing migrations as already applied
MIGRATION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM schema_migrations;" | xargs)

if [ "$MIGRATION_COUNT" = "0" ]; then
  # Check if the database already has tables from previous migrations
  # (i.e., this is an existing database without schema_migrations tracking)
  TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name != 'schema_migrations'
    );
  " | xargs)

  if [ "$TABLE_EXISTS" = "t" ]; then
    echo "Bootstrapping: existing database detected, seeding applied migrations..."
    # Find all migrations that correspond to existing schema objects
    # by checking which migration files exist in the directory
    # and marking them all as applied (since the DB already has their changes)
    for f in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
      BASENAME=$(basename "$f")
      psql "$DATABASE_URL" -q -c "
        INSERT INTO schema_migrations (filename) VALUES ('$BASENAME')
        ON CONFLICT DO NOTHING;
      "
      echo "  Bootstrapped: $BASENAME"
    done
    echo "Bootstrap complete."
    exit 0
  fi
fi

# Apply pending migrations in filename order
APPLIED=0
for f in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  BASENAME=$(basename "$f")

  ALREADY_APPLIED=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) FROM schema_migrations WHERE filename = '$BASENAME';
  " | xargs)

  if [ "$ALREADY_APPLIED" = "0" ]; then
    echo "Applying: $BASENAME"
    if ! psql "$DATABASE_URL" --set ON_ERROR_STOP=1 -q -f "$f"; then
      echo "FAILED: $BASENAME"
      exit 1
    fi
    psql "$DATABASE_URL" -q -c "INSERT INTO schema_migrations (filename) VALUES ('$BASENAME');"
    echo "Applied: $BASENAME"
    APPLIED=$((APPLIED + 1))
  else
    echo "Skipping (already applied): $BASENAME"
  fi
done

echo "Migrations complete. $APPLIED new migration(s) applied."
