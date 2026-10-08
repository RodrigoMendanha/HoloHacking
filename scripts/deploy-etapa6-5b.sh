#!/bin/sh
# HOLOHACKING — deploy do front na VPS (passos 4 a 11). Versao atual: esqueci minha senha confiavel (05bc411). Rodar NA VPS:
#   sh deploy-etapa6-5b.sh            -> passos 4-8 (estado, codigo, build, container temporario 8082). NAO troca producao.
#   sh deploy-etapa6-5b.sh swap       -> passos 9-11 (troca 8080, valida local e publico). So depois de conferir o 1o.
# Para sozinho em qualquer divergencia. Nunca apaga container. Nao usa credencial.
set -eu
ESPERADO=05bc411e6f9d9ad423d515156a96cf53febf606b
CURTO=05bc411
DIR=/opt/holohacking
IMG=holohacking-web:$CURTO
PROD=holohacking-web
ROLLBACK=holohacking-web-antes-05bc411
TEMP=holohacking-web-teste-$CURTO
pare() { echo; echo "### PARE: $*"; exit 1; }
cd "$DIR"

if [ "${1:-}" != "swap" ]; then
  echo "=== PASSO 4 — estado anterior (registrar) ==="
  docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
  docker inspect "$PROD" --format 'imagem em uso: {{.Config.Image}}'
  echo "git HEAD atual: $(git rev-parse HEAD)"
  curl -s http://127.0.0.1:8080/version.json; echo
  docker ps --format '{{.Names}}' | grep -i caddy || systemctl is-active caddy 2>/dev/null || echo "(Caddy: conferir manualmente)"
  docker ps -a --format '{{.Names}}' | grep -q -- "-anterior\|$ROLLBACK" && echo "container(s) de rollback anteriores existem (preservados)" || echo "(nenhum container de rollback anterior encontrado)"

  echo; echo "=== PASSO 5 — codigo ==="
  [ -z "$(git status --porcelain)" ] || pare "working tree da VPS nao esta limpa"
  # a versao e o commit exato (nao depende de a main ja apontar para ele)
  git fetch origin
  git cat-file -e "$ESPERADO^{commit}" 2>/dev/null || git fetch origin claude/v1-etapa6-1-validacao-banco-real
  git cat-file -e "$ESPERADO^{commit}" 2>/dev/null || pare "commit $ESPERADO nao encontrado no GitHub"
  git checkout --detach "$ESPERADO"
  [ "$(git rev-parse HEAD)" = "$ESPERADO" ] || pare "HEAD da VPS $(git rev-parse HEAD) != $ESPERADO"
  [ -z "$(git status --porcelain)" ] || pare "working tree suja depois do pull"
  echo "HEAD = $ESPERADO (ok), working tree limpa"

  echo; echo "=== PASSO 6 — build ==="
  docker build --build-arg COMMIT="$CURTO" -t "$IMG" .
  V=$(docker run --rm "$IMG" cat /usr/share/nginx/html/version.json); echo "version.json na imagem: $V"
  echo "$V" | grep -q "\"commit\":\"$CURTO\"" || pare "version.json da imagem sem o commit $CURTO"

  echo; echo "=== PASSO 7 — container temporario em 127.0.0.1:8082 (producao 8080 intocada) ==="
  docker rm -f "$TEMP" >/dev/null 2>&1 || true
  docker run -d --name "$TEMP" -p 127.0.0.1:8082:80 "$IMG" >/dev/null
  sleep 2
  curl -s http://127.0.0.1:8082/version.json; echo
  for p in / /index.html /app.js /ferramentas-registro.js /metodologia.js /formulario.js /holoscan-oficial.js /ajuda.js /contas.js /login.js /style.css /favicon.svg /logo-holohacking.png /version.json; do
    c=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8082$p"); echo "$c $p"; [ "$c" = 200 ] || pare "$p devolveu $c no temporario"
  done
  curl -sI http://127.0.0.1:8082/app.js | grep -iE 'cache-control|x-content-type|referrer-policy|content-type'
  echo; echo "=== conferir-producao no temporario (esperado 59 de 59) ==="
  sh scripts/conferir-producao.sh http://127.0.0.1:8082 || pare "conferir-producao no temporario nao deu 59/59 — NAO fazer swap"
  echo; echo "=== PASSO 8 — referencias do index (nenhum 404) ==="
  for s in $(curl -s http://127.0.0.1:8082/ | grep -o 'src="/[^"]*\.js"' | sed 's/src="//;s/"//'); do
    c=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8082$s"); [ "$c" = 200 ] || pare "$s -> $c"
  done
  echo "todos os scripts do index respondem 200"
  echo; echo ">>> TEMPORARIO VERDE. Producao (8080) intocada. Para trocar: sh $0 swap"
  exit 0
fi

echo "=== PASSO 9 — swap ==="
docker image inspect "$IMG" >/dev/null 2>&1 || pare "imagem $IMG nao existe (rode a 1a parte antes)"
docker ps -a --format '{{.Names}}' | grep -qx "$ROLLBACK" && pare "ja existe container $ROLLBACK — conferir antes de trocar"
docker stop "$PROD"
docker rename "$PROD" "$ROLLBACK"
docker run -d --name "$PROD" --restart unless-stopped -p 127.0.0.1:8080:80 "$IMG" >/dev/null
sleep 2
echo "rollback preservado: $ROLLBACK ($(docker inspect "$ROLLBACK" --format '{{.Config.Image}}'))"

echo; echo "=== PASSO 10 — validacao local 8080 ==="
V=$(curl -s http://127.0.0.1:8080/version.json); echo "$V"
echo "$V" | grep -q "\"commit\":\"$CURTO\"" || pare "8080 nao serve $CURTO — fazer ROLLBACK (ver abaixo)"
sh scripts/conferir-producao.sh http://127.0.0.1:8080 || pare "8080 nao deu 59/59 — fazer ROLLBACK"

echo; echo "=== PASSO 11 — validacao publica ==="
curl -s https://holohacking.com.br/version.json; echo
for p in / /app.js /ferramentas-registro.js /style.css; do echo "$(curl -s -o /dev/null -w '%{http_code}' "https://holohacking.com.br$p") $p"; done
curl -sI https://holohacking.com.br/app.js | grep -iE 'cache-control|x-content-type|referrer-policy|content-type'
sh scripts/conferir-producao.sh || pare "publico nao deu 59/59 — fazer ROLLBACK"
docker rm -f "$TEMP" >/dev/null 2>&1 || true
echo; echo ">>> 6.5-B NO AR: $CURTO. Rollback disponivel em $ROLLBACK."
echo "ROLLBACK (so se precisar): docker stop $PROD && docker rename $PROD $PROD-$CURTO-falhou && docker rename $ROLLBACK $PROD && docker start $PROD"
