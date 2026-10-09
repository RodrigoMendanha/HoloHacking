FROM nginx:stable-alpine

COPY index.html aprovacoes.html anamnese.html style.css favicon.svg logo-holohacking.png *.js /usr/share/nginx/html/

# Rodada 08 — build auditavel: /version.json diz qual codigo esta no ar.
# O commit vem de fora (o contexto do build nao leva o .git):
#   docker build --build-arg COMMIT=$(git rev-parse --short HEAD) -t holohacking:... .
# Sem o argumento, o arquivo diz "desconhecido" — nunca inventa um commit.
ARG VERSAO=0.2.0
ARG COMMIT=desconhecido
RUN printf '{"version":"%s","commit":"%s","builtAt":"%s"}\n' \
      "$VERSAO" "$COMMIT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      > /usr/share/nginx/html/version.json && cat /usr/share/nginx/html/version.json

RUN printf '%s\n' \
    'server {' \
    '  listen 80;' \
    '  server_name _;' \
    '  root /usr/share/nginx/html;' \
    '  index index.html;' \
    '  server_tokens off;' \
    '  add_header X-Content-Type-Options nosniff always;' \
    '  add_header Referrer-Policy strict-origin-when-cross-origin always;' \
    '  add_header Cache-Control "no-cache" always;' \
    '  location / {' \
    '    try_files $uri $uri/ /index.html;' \
    '  }' \
    '}' > /etc/nginx/conf.d/default.conf

RUN nginx -t

EXPOSE 80
