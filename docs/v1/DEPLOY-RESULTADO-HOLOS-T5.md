# Deploy — Resultado HOLOS T5 + HOLOS-V1 v7 (só texto)

Uma operação coordenada, no mesmo HoloHacking: mesmo domínio, login, banco, pacientes, histórico e plataforma.
**Nada aqui foi executado.** Executar só com autorização explícita de Rodrigo. Sem senha, chave ou token neste documento.

- Commit do front: **`COMMIT_FINAL`** (branch `claude/admiring-mccarthy-jke2pf`)
- Migration: `supabase/migrations/20261021100000_resultado_holos_direcao.sql` (aditiva; ainda NÃO aplicada em produção)
- Rollback do banco: `supabase/rollback/20261021100000_resultado_holos_direcao_rollback.sql` (provado no Postgres local: RB-01/RB-02)
- Pacote HOLOSCAN: produção está na **HOLOS-V1 v6** (`2f746194…`, hash do servidor `545a594d…`); a **v7** (só texto) é
  publicada pelo próprio app no login do responsável metodológico (publicação direta), montada a partir da v6 do banco.

## 0. Antes (só leitura) — impressões digitais pré-deploy (13/10)

| dado | linhas | md5 |
|---|---|---|
| aplicações HOLOSCAN | 11 | 99e866e00f475663f9a58bf81ed9f553 |
| respostas | 911 | cf475acf94fcc20d9c7d75aa3b8d1659 |
| notas | 55 | 056f3fabdadfa4d29e3801284e884d27 |
| Resultados HOLOS | 9 | c1b3521bb7a2a1b6811222ebd5752f4a |
| emissões | 6 | e9ef60b5301a13901782e20f2c834c4b |
| relatórios | 2 | d9c3333e14ead83422e78316655abdf6 |
| próximos passos | 8 | 398b8b4702b8cb7b1a4e5c8c9cdaa8ae |
| pacotes | 5 | 11921067ab9cb0bc1ea63531e84b4a6b |
| coluna `direcao` | 0 (não existe) | — |

Funções que a migration substitui (md5 do corpo, conferido em produção = esperado pela migration):
`montar_resultado_holos` 0212c43e…, `emitir_resultado_final` a2a795a5…, `salvar_resultado_holos` 36c6f679…,
`salvar_rascunho_resultado_holos` 9038d38b…. Constraint `holos_result_emissions_template` = RF-1/RF-2.

## Ordem (sem intervalo longo entre os passos 1 e 2)

### 1. Migration (banco)
Supabase → SQL Editor → colar o arquivo `supabase/migrations/20261021100000_resultado_holos_direcao.sql` inteiro → Run
(ele tem `begin; … commit;`: entra inteiro ou não entra). Conferir (só leitura):

```sql
select (select count(*) from information_schema.columns where table_schema='public' and table_name='holos_results' and column_name='direcao') = 1 as coluna,
       to_regprocedure('public.montar_resultado_holos_t4(uuid, jsonb)') is not null as t4_preservado,
       to_regprocedure('public.resultado_holos_direcao_paciente(jsonb)') is not null as projecao,
       (select pg_get_constraintdef(oid) from pg_constraint where conname='holos_result_emissions_template') as rf;
```
Esperado: `true | true | true | … 'RF-1','RF-2','RF-3'`.

### 2. Front (VPS) — imediatamente depois

```sh
cd /opt/holohacking && git fetch origin claude/admiring-mccarthy-jke2pf
git show origin/claude/admiring-mccarthy-jke2pf:scripts/deploy-etapa6-5b.sh > /tmp/deploy-t5.sh
sh /tmp/deploy-t5.sh          # passos 4-8: build + container temporário 8082 + 73/73 (produção intocada)
sh /tmp/deploy-t5.sh swap     # passos 9-11: troca 8080, valida local e público (só se o 1º terminou sem PARE)
```

### 3. Publicar a v7 (login metodológico)
1. Fechar TODAS as abas do HoloHacking; abrir uma aba nova e entrar com a conta do **responsável metodológico** (dona da v6).
2. Abrir **Metodologia** e esperar aparecer a **v7 no ar** (a v6 passa a "retirada"). **Não recarregar nem navegar antes disso.**
3. Conferir (só leitura):

```sql
select version, status, effective_from, lineage->>'revisao' revisao from public.methodology_packages where code='HOLOS-V1' order by version;
select code, public_text from public.methodology_systems s join public.methodology_packages p on p.id=s.package_id
 where p.code='HOLOS-V1' and p.version=7 order by s.position;
```
Esperado: `7 | aprovado | hoje | HOLOS-V1-TEXTO-SISTEMAS-2026-10-13`, `6 | retirado`; nenhum `em_revisao`; nenhum texto com "exame".
Se aparecer uma v7 `em_revisao` parada (página recarregada no meio), ela não vai ao ar sozinha (o validador recusa); avisar
antes de qualquer correção.

### 4. Validar o front carregado
- `https://holohacking.com.br/version.json` → commit `COMMIT_FINAL`; Perfil → Conta → Versão do app igual.
- `sh scripts/conferir-producao.sh` → 73 de 73.

### 5. Impressões digitais pós-deploy (só leitura)
Rodar a mesma consulta do passo 0. Esperado: aplicações, respostas, notas, Resultados, emissões, relatórios e próximos
passos **iguais** (antes do smoke); pacotes = 6 (v7 aprovada, v6 retirada); coluna `direcao` = 1.

### 6. Smoke fictício (Cowork) — prompt em `docs/v1/SMOKE-COWORK-RESULTADO-HOLOS-T5.md`.

## Rollback

- **Front** (na VPS; o script imprime o comando exato):
  `docker stop holohacking-web && docker rename holohacking-web holohacking-web-COMMIT_FINAL_CURTO-falhou && docker rename holohacking-web-antes-COMMIT_FINAL_CURTO holohacking-web && docker start holohacking-web`
- **Banco** (só se o front voltou e for preciso): SQL Editor → `supabase/rollback/20261021100000_resultado_holos_direcao_rollback.sql`.
  Devolve as 4 RPCs ao corpo de antes (md5 conferido); **não apaga** a coluna `direcao`, Resultados T5 nem emissões RF-3.
- **v7**: não precisa de rollback (só texto; notas/Índice/Tríade/PP idênticos). Aplicações novas na v7 continuam válidas.

## Checklist pós-deploy
- [ ] Migration conferida (passo 1)
- [ ] version.json = COMMIT_FINAL; 73/73
- [ ] v7 aprovada, v6 retirada, nenhum `em_revisao`; texto do Ácido sem "exame"
- [ ] Impressões digitais do histórico iguais às do passo 0
- [ ] Resultado antigo (template 4) abre igual e emite pela regra histórica (RF-2)
- [ ] Smoke Cowork verde (1ª consulta, retorno, histórico)
