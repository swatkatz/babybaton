#!/bin/bash
# Tests for the migration runner script.
# Requires a running PostgreSQL instance (uses DATABASE_URL or defaults to local).
#
# Usage: ./scripts/test_migrate.sh

set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/migrate_test}"
MIGRATE_SCRIPT="$(dirname "$0")/migrate.sh"
MIGRATIONS_DIR="$(mktemp -d)"
PASS=0
FAIL=0

cleanup() {
  rm -rf "$MIGRATIONS_DIR"
  psql "$DATABASE_URL" -c "DROP DATABASE IF EXISTS migrate_test;" 2>/dev/null || true
}

setup_db() {
  # Create a fresh test database
  local base_url="${DATABASE_URL%/*}"
  psql "$base_url/postgres" -c "DROP DATABASE IF EXISTS migrate_test;" 2>/dev/null || true
  psql "$base_url/postgres" -c "CREATE DATABASE migrate_test;" 2>/dev/null || true
}

assert_eq() {
  local description="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $description"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $description (expected '$expected', got '$actual')"
    FAIL=$((FAIL + 1))
  fi
}

run_test() {
  local test_name="$1"
  echo ""
  echo "=== $test_name ==="
}

# --- Setup ---
setup_db

# Reconstruct DATABASE_URL to point to migrate_test db
BASE_URL="${DATABASE_URL%/*}"
TEST_DB_URL="$BASE_URL/migrate_test"

# --- Test 1: Fresh database, all migrations applied ---
run_test "Test 1: Fresh database — runs all migrations"

cat > "$MIGRATIONS_DIR/001_create_users.sql" << 'SQL'
CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100));
SQL

cat > "$MIGRATIONS_DIR/002_add_email.sql" << 'SQL'
ALTER TABLE users ADD COLUMN email VARCHAR(200);
SQL

bash "$MIGRATE_SCRIPT" "$TEST_DB_URL" "$MIGRATIONS_DIR"

MIGRATION_COUNT=$(psql "$TEST_DB_URL" -t -c "SELECT COUNT(*) FROM schema_migrations;" | xargs)
assert_eq "schema_migrations has 2 entries" "2" "$MIGRATION_COUNT"

TABLE_EXISTS=$(psql "$TEST_DB_URL" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users');" | xargs)
assert_eq "users table was created" "t" "$TABLE_EXISTS"

COL_EXISTS=$(psql "$TEST_DB_URL" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email');" | xargs)
assert_eq "email column was added" "t" "$COL_EXISTS"

# --- Test 2: Idempotent — running again skips all ---
run_test "Test 2: Idempotent — running again applies nothing"

bash "$MIGRATE_SCRIPT" "$TEST_DB_URL" "$MIGRATIONS_DIR"

MIGRATION_COUNT=$(psql "$TEST_DB_URL" -t -c "SELECT COUNT(*) FROM schema_migrations;" | xargs)
assert_eq "schema_migrations still has 2 entries" "2" "$MIGRATION_COUNT"

# --- Test 3: New migration — only new one is applied ---
run_test "Test 3: New migration — only new one applied"

cat > "$MIGRATIONS_DIR/003_add_age.sql" << 'SQL'
ALTER TABLE users ADD COLUMN age INTEGER;
SQL

bash "$MIGRATE_SCRIPT" "$TEST_DB_URL" "$MIGRATIONS_DIR"

MIGRATION_COUNT=$(psql "$TEST_DB_URL" -t -c "SELECT COUNT(*) FROM schema_migrations;" | xargs)
assert_eq "schema_migrations has 3 entries" "3" "$MIGRATION_COUNT"

COL_EXISTS=$(psql "$TEST_DB_URL" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'age');" | xargs)
assert_eq "age column was added" "t" "$COL_EXISTS"

# --- Test 4: Bootstrap — existing tables, no schema_migrations ---
run_test "Test 4: Bootstrap — seeds existing migrations"

# Drop schema_migrations to simulate first run on existing DB
psql "$TEST_DB_URL" -c "DROP TABLE schema_migrations;" > /dev/null

bash "$MIGRATE_SCRIPT" "$TEST_DB_URL" "$MIGRATIONS_DIR"

MIGRATION_COUNT=$(psql "$TEST_DB_URL" -t -c "SELECT COUNT(*) FROM schema_migrations;" | xargs)
assert_eq "schema_migrations has 3 entries after bootstrap" "3" "$MIGRATION_COUNT"

# --- Test 5: Failed migration — exits with error ---
run_test "Test 5: Failed migration — exits non-zero"

cat > "$MIGRATIONS_DIR/004_bad_migration.sql" << 'SQL'
THIS IS NOT VALID SQL;
SQL

set +e
bash "$MIGRATE_SCRIPT" "$TEST_DB_URL" "$MIGRATIONS_DIR" 2>/dev/null
EXIT_CODE=$?
set -e

assert_eq "exits with non-zero on bad migration" "1" "$EXIT_CODE"

BAD_APPLIED=$(psql "$TEST_DB_URL" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE filename = '004_bad_migration.sql';" | xargs)
assert_eq "bad migration not recorded" "0" "$BAD_APPLIED"

# Clean up bad migration for subsequent runs
rm "$MIGRATIONS_DIR/004_bad_migration.sql"

# --- Summary ---
echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
echo "================================"

cleanup

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
