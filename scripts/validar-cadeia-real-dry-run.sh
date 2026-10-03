#!/bin/sh
# ETAPA 6.1 — DRY-RUN da cadeia pendente (20260930130000 .. 20261002130000) num banco PostgreSQL via psql,
# TUDO dentro de UMA transacao explicita BEGIN ... ROLLBACK. Nada persiste. Nunca faz COMMIT.
# Uso (credencial SOMENTE via ambiente seguro; nunca em chat, commit ou log):
#   PGHOST=... PGPORT=... PGUSER=... PGDATABASE=postgres PGPASSWORD=... sh scripts/validar-cadeia-real-dry-run.sh
# Saida: um JSON com as checagens de supabase/tests/etapa6-1-checks-real.sql (k, ok, d). ON_ERROR_STOP: o primeiro
# erro aborta a transacao (rollback automatico). lock_timeout/statement_timeout/idle_in_transaction curtos: nao bloqueia producao.
set -eu
cd "$(dirname "$0")/.."
{
  echo "begin;"
  echo "set local lock_timeout = '3s'; set local statement_timeout = '110s'; set local idle_in_transaction_session_timeout = '30s';"
  for f in supabase/migrations/2026093013*.sql supabase/migrations/2026093014*.sql supabase/migrations/2026093015*.sql \
           supabase/migrations/2026093016*.sql supabase/migrations/2026093017*.sql supabase/migrations/2026093018*.sql \
           supabase/migrations/2026093019*.sql supabase/migrations/2026100120*.sql supabase/migrations/2026100121*.sql \
           supabase/migrations/2026100122*.sql supabase/migrations/2026100210*.sql supabase/migrations/2026100211*.sql \
           supabase/migrations/2026100212*.sql supabase/migrations/2026100213*.sql; do
    grep -v '^[[:space:]]*begin;[[:space:]]*$' "$f" | grep -v '^[[:space:]]*commit;[[:space:]]*$'
  done
  cat supabase/tests/etapa6-1-checks-real.sql
  echo "rollback;"
} | psql -v ON_ERROR_STOP=1 -X -At
