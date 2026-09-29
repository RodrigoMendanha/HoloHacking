#!/bin/sh
# conferir-producao — o que esta no ar e a main que deveria estar?
#
#   sh scripts/conferir-producao.sh                     # confere https://holohacking.com.br
#   sh scripts/conferir-producao.sh http://127.0.0.1:8080   # confere outro endereco (ex.: o container na VPS)
#
# Baixa cada arquivo da lista de hashes do docs/deploy.md §3.5, calcula o
# sha256 e compara. Imprime OK ou a lista dos que diferem, e sai com codigo
# 1 se algum diferir. Nao usa credencial nenhuma: so baixa o que o site ja
# serve para qualquer navegador. Precisa de curl e de sha256sum (Linux) ou
# shasum (Mac).
set -u

BASE="${1:-https://holohacking.com.br}"
BASE="${BASE%/}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOC="$DIR/docs/deploy.md"

if command -v sha256sum >/dev/null 2>&1; then
  hash_de() { sha256sum "$1" | cut -d' ' -f1; }
elif command -v shasum >/dev/null 2>&1; then
  hash_de() { shasum -a 256 "$1" | cut -d' ' -f1; }
else
  echo "ERRO: falta sha256sum (ou shasum) nesta maquina." >&2; exit 2
fi
command -v curl >/dev/null 2>&1 || { echo "ERRO: falta curl nesta maquina." >&2; exit 2; }
[ -f "$DOC" ] || { echo "ERRO: nao achei $DOC" >&2; exit 2; }

# A lista esperada: o bloco de codigo logo depois do titulo "### 3.5".
ESPERADO="$(awk '
  /^### 3\.5 / { na35 = 1; next }
  na35 && /^```/ { if (dentro) exit; dentro = 1; next }
  na35 && dentro && /^[0-9a-f]{64}  / { print }
' "$DOC")"
TOTAL="$(printf '%s\n' "$ESPERADO" | grep -c .)"
[ "$TOTAL" -gt 0 ] || { echo "ERRO: lista de hashes vazia em docs/deploy.md §3.5" >&2; exit 2; }

HASH_INDEX="$(printf '%s\n' "$ESPERADO" | awk '$2 == "index.html" { print $1 }')"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

echo "Conferindo $TOTAL arquivos em $BASE"
DIFEREM=""
N=0
# printf + while: a lista vem do doc, nao de fora; nomes sem espaco.
printf '%s\n' "$ESPERADO" > "$TMP/lista"
while read -r esperado nome; do
  [ -n "$nome" ] || continue
  N=$((N + 1))
  saida="$TMP/arquivo"
  status="$(curl -sS -L -o "$saida" -w '%{http_code}' -H 'Cache-Control: no-cache' "$BASE/$nome" 2>"$TMP/erro")" || status="falhou"
  if [ "$status" != "200" ]; then
    DIFEREM="$DIFEREM
  $nome  (HTTP $status$( [ -s "$TMP/erro" ] && printf ': %s' "$(head -c 120 "$TMP/erro")"))"
    continue
  fi
  obtido="$(hash_de "$saida")"
  if [ "$obtido" != "$esperado" ]; then
    nota=""
    [ "$nome" != "index.html" ] && [ "$obtido" = "$HASH_INDEX" ] && nota="  (voltou o index.html: o arquivo nao existe no ar)"
    DIFEREM="$DIFEREM
  $nome  esperado ${esperado%"${esperado#????????????}"}...  no ar ${obtido%"${obtido#????????????}"}...$nota"
  fi
done < "$TMP/lista"

if [ -z "$DIFEREM" ]; then
  echo "OK: $N de $TOTAL arquivos batem com docs/deploy.md §3.5"
  exit 0
fi
QTD="$(printf '%s\n' "$DIFEREM" | grep -c .)"
echo "DIFEREM: $QTD de $TOTAL arquivos$DIFEREM"
exit 1
