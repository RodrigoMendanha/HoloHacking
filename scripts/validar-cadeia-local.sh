#!/bin/sh
# Valida a cadeia de migrations 130000..200000 + harness Etapa 4 e 4.2 num PostgreSQL LOCAL descartavel.
# Uso: PGHOST=/caminho/socket PGPORT=55432 sh scripts/validar-cadeia-local.sh
# Pre-requisito: banco "base" com supabase/tests/stub-supabase-local.sql e as migrations anteriores a 20260930130000.
# Tudo roda em BEGIN ... ROLLBACK: nada persiste. Nao substitui a validacao no banco real.
set -e
cd "$(dirname "$0")/.."
{
  echo "begin;"
  for f in supabase/migrations/2026093013*.sql supabase/migrations/2026093014*.sql supabase/migrations/2026093015*.sql \
           supabase/migrations/2026093016*.sql supabase/migrations/2026093017*.sql supabase/migrations/2026093018*.sql \
           supabase/migrations/2026093019*.sql supabase/migrations/2026100120*.sql; do
    grep -v '^[[:space:]]*begin;[[:space:]]*$' "$f" | grep -v '^[[:space:]]*commit;[[:space:]]*$'
  done
  cat supabase/tests/etapa4-harness.sql
  cat supabase/tests/etapa4-2-pacotes.sql
  cat supabase/tests/etapa4-2-harness.sql
  echo "rollback;"
} | psql -U postgres -d base -v ON_ERROR_STOP=1 -At | tr '|' '\n' | sed 's/^ //'
