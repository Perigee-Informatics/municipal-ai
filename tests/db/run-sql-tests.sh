#!/usr/bin/env bash
# Local SQL test: builds a scratch Postgres database, stubs the Supabase auth schema,
# applies db-setup/supabase-setup.sql exactly as the Supabase SQL editor would, then runs assertions.
# Usage: tests/db/run-sql-tests.sh [host] [port] [user]   (defaults: /var/tmp/pgtest 5433 postgres)
set -euo pipefail
HOST="${1:-/var/tmp/pgtest}"; PORT="${2:-5433}"; USER_="${3:-postgres}"
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DB="muni_test_$$"
P="psql -h $HOST -p $PORT -U $USER_ -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "create database $DB"
trap '$P -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
$P -d $DB -f "$DIR/tests/db/supabase-stub.sql"
$P -d $DB -f "$DIR/db-setup/supabase-setup.sql"
$P -d $DB -f "$DIR/tests/db/assertions.sql"
echo "SQL tests passed"
