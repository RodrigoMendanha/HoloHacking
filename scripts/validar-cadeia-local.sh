#!/bin/sh
# Valida a cadeia de migrations 130000..20261005100000 + harness Etapa 4, 4.2, 5, 5.2, 5.3, 6, 6.0.1, aprovador unico, HOLOSCAN oficial (P0) e regressao de dados LEGADOS num PostgreSQL LOCAL descartavel.
# Antes das migrations entra supabase/tests/legado-seed-pre-etapa5.sql (dados legados sinteticos, como em producao); no fim, legado-harness.sql.
# Uso: PGHOST=/caminho/socket PGPORT=55432 sh scripts/validar-cadeia-local.sh
# Pre-requisito: banco "base" com supabase/tests/stub-supabase-local.sql e as migrations anteriores a 20260930130000.
# Tudo roda em BEGIN ... ROLLBACK: nada persiste. Nao substitui a validacao no banco real.
set -e
# SEGURANCA: so PostgreSQL LOCAL (socket unix ou localhost). Nunca o banco real, mesmo que o ambiente traga PGHOST remoto.
case "${PGHOST:-}" in /*|localhost|127.0.0.1) ;; *) echo "RECUSADO: PGHOST nao e local (defina PGHOST=/caminho/do/socket)"; exit 2;; esac
cd "$(dirname "$0")/.."
{
  echo "begin;"
  cat supabase/tests/legado-seed-pre-etapa5.sql
  for f in supabase/migrations/2026093013*.sql supabase/migrations/2026093014*.sql supabase/migrations/2026093015*.sql \
           supabase/migrations/2026093016*.sql supabase/migrations/2026093017*.sql supabase/migrations/2026093018*.sql \
           supabase/migrations/2026093019*.sql supabase/migrations/2026100120*.sql supabase/migrations/2026100121*.sql supabase/migrations/2026100122*.sql supabase/migrations/2026100210*.sql supabase/migrations/2026100211*.sql supabase/migrations/2026100212*.sql supabase/migrations/2026100213*.sql supabase/migrations/2026100310*.sql; do
    grep -v '^[[:space:]]*begin;[[:space:]]*$' "$f" | grep -v '^[[:space:]]*commit;[[:space:]]*$'
  done
  cat supabase/tests/aprovadores-harness-setup.sql
  cat supabase/tests/etapa4-harness.sql
  cat supabase/tests/etapa4-2-pacotes.sql
  cat supabase/tests/etapa4-2-harness.sql
  cat supabase/tests/aprovador-unico-harness.sql
  cat supabase/tests/etapa5-harness.sql
  cat supabase/tests/etapa5-2-harness.sql
  cat supabase/tests/etapa5-3-harness.sql
  cat supabase/tests/etapa6-harness.sql
  cat supabase/tests/legado-harness.sql
  # Correcao P0 (pos-deploy 6.4): a migration entra DEPOIS dos harnesses anteriores, como no banco real (aplicada
  # sobre dados que ja existem); o PRE guarda as digitais das aplicacoes existentes para provar que nada mudou.
  cat supabase/tests/holoscan-oficial-pre.sql
  for f in supabase/migrations/2026100510*.sql; do
    grep -v '^[[:space:]]*begin;[[:space:]]*$' "$f" | grep -v '^[[:space:]]*commit;[[:space:]]*$'
  done
  cat supabase/tests/holoscan-oficial-harness.sql
  echo "rollback;"
} | psql -U postgres -d base -v ON_ERROR_STOP=1 -At | tr '|' '\n' | sed 's/^ //'
