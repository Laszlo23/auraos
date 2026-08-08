#!/usr/bin/env bash
# Apply supabase/migrations/*.sql to the self-hosted Supabase Postgres on this VPS.
set -euo pipefail

MIGDIR="${1:-/opt/auraos/supabase/migrations}"
SB_ENV="${SB_ENV:-/opt/supabase/docker/.env}"

if [[ ! -f "$SB_ENV" ]]; then
  echo "Missing $SB_ENV" >&2
  exit 1
fi
if [[ ! -d "$MIGDIR" ]]; then
  echo "Missing migrations dir $MIGDIR" >&2
  exit 1
fi

PGPASS="$(grep '^POSTGRES_PASSWORD=' "$SB_ENV" | cut -d= -f2-)"
export PGPASSWORD="$PGPASS"

psql_db() {
  docker exec -e PGPASSWORD="$PGPASS" supabase-db \
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
}

psql_db -c \
  "CREATE TABLE IF NOT EXISTS public._aura_schema_migrations (
     version text PRIMARY KEY,
     applied_at timestamptz NOT NULL DEFAULT now()
   );"

applied=0
for f in $(ls "$MIGDIR"/*.sql | sort); do
  ver="$(basename "$f" .sql)"
  exists="$(psql_db -tAc "SELECT 1 FROM public._aura_schema_migrations WHERE version='$ver'" | tr -d '[:space:]')"
  if [[ "$exists" == "1" ]]; then
    echo "SKIP $ver"
    continue
  fi
  echo "APPLY $ver"
  if cat "$f" | docker exec -i -e PGPASSWORD="$PGPASS" supabase-db \
      psql -U postgres -d postgres -v ON_ERROR_STOP=1 >/tmp/"mig_$ver.log" 2>&1; then
    psql_db -c "INSERT INTO public._aura_schema_migrations(version) VALUES ('$ver')" >/dev/null
    applied=$((applied + 1))
    echo "OK $ver"
  else
    echo "FAIL $ver" >&2
    tail -40 /tmp/"mig_$ver.log" >&2
    exit 1
  fi
done

psql_db -c "NOTIFY pgrst, 'reload schema';" >/dev/null
echo "applied=$applied"
