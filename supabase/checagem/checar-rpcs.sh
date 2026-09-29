#!/bin/sh
# Roda as RPCs de escrita no banco real, numa transacao desfeita.
# Sai com 0 se todas gravaram o esperado; diferente de 0 se qualquer uma falhou.
#
# Precisa de:
#   - psql instalado
#   - SUPABASE_DB_URL no ambiente: a connection string do Postgres
#     (Supabase > Project Settings > Database > Connection string).
#     Nunca coloque essa string em arquivo do repo nem em commit.
#
# Uso:  SUPABASE_DB_URL=... sh supabase/checagem/checar-rpcs.sh

set -eu

AQUI=$(cd "$(dirname "$0")" && pwd)

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "FALHA: defina SUPABASE_DB_URL (connection string do Postgres) no ambiente." >&2
  exit 2
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "FALHA: psql nao encontrado." >&2
  exit 2
fi

if psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$AQUI/rpcs-escrita.sql"; then
  echo "CHECAGEM DAS RPCs: OK (nada foi gravado, transacao desfeita)"
else
  status=$?
  echo "CHECAGEM DAS RPCs: FALHOU (codigo $status). Nao faca deploy." >&2
  exit "$status"
fi
