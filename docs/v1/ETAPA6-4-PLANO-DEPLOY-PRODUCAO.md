# HOLOHACKING V1 — ETAPA 6.4 — PLANO DE DEPLOY EM PRODUÇÃO (NÃO EXECUTADO)

**Estado:** preparado em 2026-10-03, à espera de autorização separada. Nada foi publicado, nenhum merge foi feito.

## 0. Pré-condições já cumpridas (banco real, somente leitura)

- **Gate 6.3:** `gate_6_3_ok = true`.
  - 31 migrations.
  - Aprovador único Daniel nos dois escopos; Rodrigo desativado ×2, com motivo.
  - 0 aprovações de etapa 2.
- **HOLOS-V1@2:**
  - status `aprovado`, regime `aprovador_unico`, hash `7af1dae6…`;
  - aprovações `1:Daniel`, 1 registro de homologação;
  - 84 perguntas, 5 sistemas, 15 faixas;
  - vigente desde 2026-10-03; `reviewed_by`/`reviewed_at` nulos.
- **LI-V1@2:**
  - status `aprovado`, hash `fa99ec80…`, aprovações `1:Daniel`;
  - 1 snapshot, com regime `aprovador_unico` e `approval_2` nulo;
  - proveniência `aprovador_unico`, `segunda_revisao = false`.
- **Dados:**
  - 4 aplicações históricas sem proveniência (`historicas_fingerprint` `205812d8e238e293fe8b58205ffa5631`, apps md5 `d5a62c16…`);
  - 20 scores (md5 `1c66f0d5…`);
  - 0 aplicações novas, 0 com pacote não aprovado, 0 leituras integradas.
- `supabase/ETAPA6-4-VERIFICACAO-POS-DEPLOY.sql` rodado antes do deploy: `deploy_ok = true`, `primeira_app_ok = false`. O segundo é o esperado, porque ainda não há aplicação nova.

**Janela até o deploy.** Produção (`main`) ainda serve o front antigo sobre o banco novo.
- Uma aplicação HOLOSCAN salva por ele fica **sem proveniência para sempre**: é imutável e não há backfill.
- Essa aplicação faria `deploy_ok` cair, porque `novas_sem_proveniencia` passaria a ser maior que 0.
- **Até o deploy, evitar aplicar HOLOSCAN em produção.** Se ocorrer, não é dano a dados, mas a aplicação entra como "nova sem proveniência" e precisa ser registrada como exceção conhecida.

## 1. O que vai para produção

- Branch `claude/v1-etapa6-1-validacao-banco-real`, **HEAD deste commit**; o hash sai no relatório que acompanha este plano.
- A `main` (`6bf10f5`) é ancestral do HEAD: é merge **fast-forward**, com 0 commits só na `main`.
- O front é idêntico ao validado no preview `92a2b3b`. Depois dele só mudaram documentação, SQL de verificação e o script de checagem.
- Hashes: os 54 arquivos servidos (`index.html style.css favicon.svg *.js`) batem com `docs/deploy.md` §3.5 (54/54).

## 2. Antes do deploy

1. **Merge para a `main`**, depois de autorizado.
   - Abrir PR `claude/v1-etapa6-1-validacao-banco-real` → `main` e fazer merge (fast-forward/merge commit), sem squash, para preservar o histórico.
   - Anotar o commit resultante da `main`.
2. **Checagem das RPCs** (`docs/deploy.md` §3.0):
   - roda numa máquina com `psql`;
   - a connection string é passada só no terminal;
   - roda tudo em `BEGIN … ROLLBACK`, então nada fica gravado.

   ```sh
   SUPABASE_DB_URL='<connection string>' sh supabase/checagem/checar-rpcs.sh
   ```

   Seguir só com `CHECAGEM DAS RPCs: OK`. A checagem 6 foi atualizada para o contrato V1 da Etapa 0: mesma data cria outra coleta; não há recusa de data futura. Foi provada localmente sobre o estado pós-6.3-B.
3. Rodar `supabase/ETAPA6-4-VERIFICACAO-POS-DEPLOY.sql` no SQL Editor e confirmar `deploy_ok = true`.
4. Backup/snapshot do projeto Supabase, como nas etapas anteriores.

## 3. Deploy na VPS (Docker, como `docs/deploy.md` §3.1–3.3)

```sh
# 3.1 descobrir o estado atual
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'
docker inspect <CONTAINER> --format '{{.Config.Image}}'

# 3.2 trazer o código da main (já com o merge)
cd <DIR>
git fetch origin && git checkout main && git pull --ff-only
git log --oneline -1                                  # tem de ser o commit do merge
sha256sum index.html style.css favicon.svg *.js       # tem de bater com docs/deploy.md §3.5 (54 arquivos)

# 3.3 construir e trocar
docker build --build-arg COMMIT=$(git rev-parse --short HEAD) -t holohacking:$(git rev-parse --short HEAD) .
docker stop <CONTAINER> && docker rename <CONTAINER> <CONTAINER>-anterior
docker run -d --name <CONTAINER> --restart unless-stopped -p <PORTA>:80 holohacking:$(git rev-parse --short HEAD)
curl -s http://127.0.0.1:<PORTA>/version.json         # commit = o da main
sh scripts/conferir-producao.sh http://127.0.0.1:<PORTA>   # OK: 54 de 54
sh scripts/conferir-producao.sh                            # domínio público: OK: 54 de 54
```

**Rollback:** `docker rm -f <CONTAINER> && docker rename <CONTAINER>-anterior <CONTAINER> && docker start <CONTAINER>`.
- O banco não muda com o deploy, então o rollback é só do front.
- Aplicações salvas pelo front novo ficam com proveniência válida, e o front antigo continua lendo-as.

## 4. Smoke tests pós-deploy (sem criar dado clínico de teste)

1. `version.json` mostra o commit da `main`; `conferir-producao.sh` dá 54/54; `Cache-Control: no-cache` no `app.js`.
2. Recarregar com Ctrl+Shift+R (uma vez) no navegador de quem usa.
3. Login (Daniel) → **Perfil → Conta → Versão do app** mostra o commit novo.
4. **Metodologia (modo normal, sem `?homologacao=1`):**
   - pacote ativo HOLOS-V1@2;
   - status da barreira **aprovado**;
   - saídas oficiais liberadas.
5. `https://holohacking.com.br/?homologacao=1` → Metodologia:
   - "Homologação — aprovador único";
   - HOLOS-V1@2 e LI-V1@2 **aprovado**;
   - nenhuma menção a Aprovação 2 ou Rodrigo;
   - nenhum botão de aprovar ou homologar ativo.
6. Abrir um paciente existente: ficha, Documentos/Exames, Evolução e Relatórios abrem sem erro. As 4 aplicações históricas continuam sem vínculo de pacote: a Leitura Integrada as trata como `incompatible_holoscan_version`, conforme `POLITICA-COMPATIBILIDADE-APLICACOES-HISTORICAS-HOLOSCAN-LI.md`.
7. Rodar `ETAPA6-4-VERIFICACAO-POS-DEPLOY.sql`: `deploy_ok = true`, com `novas = 0` e `historicas_fingerprint` inalterado.

## 5. Primeira aplicação HOLOSCAN nova (prova da proveniência)

1. Uma nutricionista real aplica o HOLOSCAN normalmente num paciente real e salva. Não criar paciente nem aplicação de teste em produção.
2. Rodar `ETAPA6-4-VERIFICACAO-POS-DEPLOY.sql` e conferir:
   - `primeira_app_ok = true`;
   - `novas_com_holos_v2 = novas`, `novas_sem_proveniencia = 0`, `ultima_nova_com_holos_v2 = true`;
   - `apps_com_pacote_nao_aprovado = 0`;
   - `historicas = 4` e `historicas_sem_proveniencia = 4`, com `historicas_fingerprint` `205812d8…` igual (sem backfill).
3. Se houver Leitura Integrada gerada: `leituras_fora_li_v2 = 0`. O estado `convergente`/`divergente`/`sem_dados_suficientes` vem do motor; nada é inferido.
4. Se `primeira_app_ok = false`, com `novas_sem_proveniencia > 0`: **parar o uso do HOLOSCAN** e investigar o front servido (`version.json`, cache do navegador). A aplicação sem proveniência não é corrigida por backfill: é registrada como exceção.
