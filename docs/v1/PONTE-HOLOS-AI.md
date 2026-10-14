# Ponte HOLOS AI → HoloHacking (14/10/2026)

**Objetivo:** o HoloHacking recebe o JSON canônico `HOLOS_AI_RESULT` (schema_version 1, HOLOS AI v1.2) e transforma o conteúdo **confirmado pela nutricionista** em Resultado HOLOS final, PDF oficial e WhatsApp.

**Limites:** a HOLOS AI não substitui o Resultado HOLOS; ela fornece inteligência para ele. Nada mudou em:
- HOLOSCAN (fórmula, notas, faixas, Índice, Tríade);
- PP-V1, os cinco sistemas e as ferramentas;
- pacotes metodológicos e scores;
- exames.

**Status:** pronto, testado localmente, **sem deploy** (parado antes, como pedido).

## 1. Fluxo na tela (aba HOLOS AI do atendimento, logo antes do Resultado HOLOS)

| Passo | O que faz |
|---|---|
| 1. Copiar Pacote HOLOS AI | Copia um JSON (`HOLOS_AI_PACOTE`, `pacote_version` 1) só com dados já registrados: Mapeamento (respostas da paciente, por etapa), HOLOSCAN (sistemas, notas, faixas, Índice, Tríade, leitura profissional), evolução, ferramentas aplicadas e respostas, Conduta, Resultado HOLOS / direção atual (foco, direcionamentos, estratégias confirmados) e histórico de atendimentos. **Sem** nome, telefone, e-mail, CPF ou endereço (identificador por iniciais + idade + sexo), **sem** exames, **sem** conteúdo da Carta ao Futuro Eu. "Ver o pacote" mostra o conteúdo antes de copiar. |
| 2. Abrir HOLOS AI | Link do agente (`HOLOS_AI_URLS.chatgpt` em `holos-ai.js` ou `HolosAI.configurarUrls({ chatgpt })`). **Ainda não há GPT publicado: nenhum link foi configurado nem inventado.** Passo a passo em `docs/v1/holos-ai-gpt/LEIA-ME-CONFIGURAR-GPT.md` ("Link do GPT no HoloHacking"). Sem URL, aparece "endereço não configurado". |
| 3. Importar Resultado HOLOS AI | Campo grande "Cole aqui o JSON HOLOS_AI_RESULT" + **Validar e importar**. Aceita o JSON puro ou a resposta inteira do GPT (usa o primeiro bloco ` ``` `). Valida na tela e no servidor. **Inválido:** nada é salvo, o erro aparece em lista e o texto colado fica no campo. |
| 4. Revisar análise | Um cartão por item, agrupado por seção. Todo item começa como **SUGESTÃO HOLOS AI**. Ações: **Confirmar**, **Editar** (só textos), **Descartar**, **Voltar a sugestão**, **Compartilhar com a paciente** (só em item confirmado/editado que não é só profissional). Também há ações em lote por seção. **Concluir revisão** fica bloqueado enquanto houver sugestão pendente. **Descartar esta importação** também é possível. |
| 5. Gerar Resultado HOLOS | Só com uma importação **CONFIRMADA**. Leva o confirmado para o Resultado HOLOS deste atendimento (continua o rascunho existente ou abre um novo). Lá a nutricionista escolhe o HOLOSCAN (sem pré-marcação, como antes), confirma o **Foco atual**, finaliza e emite; o PDF e o WhatsApp saem da emissão. |

**Histórico:** cada importação aparece com versão, data, status e itens aceitos. "Abrir" mostra a revisão daquela versão.

**Status geral:** IMPORTADO → EM REVISÃO → CONFIRMADO | DESCARTADO.

## 2. Contrato JSON implementado (schema_version 1)

**Fonte única no código:** `holos-ai-contrato.js`, usado pela tela, pelo servidor falso e pelos testes. O servidor real tem a cópia das regras em SQL (`holos_ai_problemas`). O schema de referência é `docs/v1/holos-ai-gpt/06-SCHEMA-HOLOS-AI-RESULT.json`.

**Aceita:**
- `schema_version` igual a 1;
- as 24 chaves obrigatórias. Desde o fechamento de 14/10, `meta` e `entrada` (objetos) e `ferramentas_ja_aplicadas` e `plano_acompanhamento` (listas) também são obrigatórios; vazios (`{}` / `[]`) são aceitos. Continua `schema_version: 1`: nenhum campo mudou de nome ou de tipo.

**Recusa (erro, nada salvo):**
- `schema_version` diferente de 1 (`schema_incompativel`);
- JSON quebrado ou que não é objeto (`json_invalido`);
- estrutura inválida (`resultado_invalido`):
  - chave faltando;
  - `tipo` fora de `primeira_consulta | retorno`;
  - tipos errados;
  - mais de 60 itens por seção ou textos acima de 5000 caracteres;
  - ferramentas: mais de 3, ID fora do catálogo PP-V1 (`REC-(FUN|AIN|MET|DTL|MEE)-0[1-6]`), duplicata, principal ≠ 1, ou ferramenta já concluída no encontro;
  - estratégia sem classificação válida, território, origem, `baseado_em`, ou com status ≠ SUGERIDO;
  - estratégia acordada na 1ª consulta com decisão ≠ `MANTER EM OBSERVAÇÃO — SUGERIDO`;
  - decisão de retorno fora de MANTER/AJUSTAR/SUBSTITUIR/CONCLUIR/ENCERRAR;
  - estratégia nova com decisão;
  - direcionamento inexistente;
  - território sem material que não comece com "Ainda não aprofundado nesta etapa.", ou que cite estratégia de outro território;
  - território `nao_aprofundado` com estratégia vinculada, ou estratégia cujo território está `nao_aprofundado` (fechamento 14/10);
  - estratégia com "baseado_em" numa hipótese / pontos para aprofundar (fechamento 14/10);
  - `meta` ou `entrada` que não são objeto;
  - hipótese sem `so_profissional: true`.

**Só aviso (não impede; aparece em "Avisos (não impedem)" na tela, durante a revisão):**
- termos diagnósticos ou números do HOLOSCAN no `rascunho_paciente`, porque ele nunca é enviado sozinho;
- linguagem da nota ("mais equilíbrio", nota como saúde, normalidade, gravidade ou risco) e "concentrou mais marcadores" fora da 1ª área;
- tarefa da Conduta como estratégia (composição, alimentos, quantidade, suplemento, protocolo, prescrição);
- corte inventado ("maior parte dos dias", %, N vezes por semana, "em N de N");
- estratégia nova que repete uma hipótese ainda não confirmada;
- sugestão nova apresentada como combinada no rascunho.

São heurísticas de texto: não bloqueiam estilo. O validador do GPT (`holos_ai_pdf.py`, `validar_resultado`) aponta os mesmos casos para o agente corrigir antes de entregar.

**Rótulo:** `catalogo: "not_catalogued"` fica só no JSON; na revisão, direcionamentos e estratégias mostram uma vez "SUGESTÃO HOLOS AI — REQUER REVISÃO PROFISSIONAL".

**Seções só profissionais** (nunca podem ser compartilhadas; o servidor recusa):
- `sintese_integrada`, `o_que_apareceu`, `convergencias`, `pontos_para_aprofundar` (inclui as hipóteses);
- `sistemas_prioritarios`, `ferramentas_ja_aplicadas`, `ferramentas_recomendadas`;
- `roteiro_proxima_consulta`, `rascunho_paciente`, `alertas_profissionais`, `fontes_utilizadas`.

**Do confirmado para o Resultado HOLOS (template 5):**

| Item da HOLOS AI | Vira |
|---|---|
| direcionamentos | `direcao.direcionamentos` (território, por quê, objetivo, sistema, status "proposto") |
| estratégias | `direcao.estrategias` (ação = "o que fazer", observar, prazo, critério, classificação; acordada = "acordada", nova = "proposta"; ligada ao direcionamento) |
| padrões observados | `direcao.padroes` (padrão observado) |
| corpo / mente / espírito com material | `direcao.<território>.itens` (o "Ainda não aprofundado" não vira item) |
| o que observar + plano de acompanhamento | `direcao.observar` |
| próxima etapa | `direcao.proxima_etapa` (se ainda não houver) |
| síntese integrada | **leitura profissional** do Resultado (nunca para a paciente) |
| 1º direcionamento | **Foco atual só como sugestão** (a nutricionista confirma) |

**Cada item vindo da HOLOS AI:**
- origem `holos_ai`;
- `ref = {tipo: "holos_ai", id: <importação>, campo: <item>}`;
- `texto_sugerido` = texto original da IA; `texto` = texto da nutricionista (editado, se houve edição);
- `confirmado: true`;
- `mostrar_paciente` = o "Compartilhar" da revisão.

**Fica só no registro da HOLOS AI** (não entra no documento da paciente): ferramentas recomendadas, sistemas, roteiro, alertas, fontes e o rascunho de mensagem.

## 3. Banco — migration `20261023100000_holos_ai_ponte.sql` (aditiva)

**`holos_ai_imports`** — uma importação por linha, **imutável**:
- `texto_original` (o que foi colado), `json_original`, `texto_sha256`, `schema_version`;
- `tipo`, `agente`, `kb_version`, `entrada`, `origem` (`holos_ai_gpt`);
- `encounter_id`, `patient_id`, `versao` (1, 2… por atendimento; nunca sobrescreve);
- `status` e carimbos (`imported_at`, `revisao_iniciada_em`, `concluida_em`, `descartada_em`);
- `operation_id`, para o clique duplo não duplicar.

**`holos_ai_import_items`** — um registro por elemento de cada seção:
- `secao`, `ordem`, `chave` (D1/E1…);
- `valor_ia` (imutável), `so_profissional` (definido pelo servidor);
- `estado` (sugerido/confirmado/editado/descartado), `valor_profissional`, `compartilhar`, `revisado_em`.

**Gatilhos:**
- o original e o valor da IA não mudam, nem para o dono do banco;
- nada é apagado;
- item só muda durante a revisão;
- transições de status válidas;
- paciente arquivado e conta pendente bloqueiam, como nas demais tabelas.

**RLS:** só a própria nutricionista lê. Nenhuma escrita direta: só por RPC.

**RPCs:** `importar_holos_ai`, `revisar_item_holos_ai`, `concluir_revisao_holos_ai`, `descartar_importacao_holos_ai`.

**Resultado HOLOS:** `resultado_holos_validar_item` e `resultado_holos_validar_direcao` foram recriadas com o mesmo texto da 20261021100000, mais:
- origem/ref `holos_ai`;
- a conferência do item importado: importação concluída; item aceito para entrar confirmado; item só profissional nunca para a paciente, nem como foco; e nunca de outra paciente.

O texto dessas funções em produção foi conferido em 14/10, só em leitura: é o da `supabase/partes-20261021` (igual à migration, sem os comentários).

## 4. Arquivos

| Arquivo | Mudança |
|---|---|
| `holos-ai-contrato.js` | **novo**: contrato do JSON (extrair, validar, explodir, mapear para o Resultado) |
| `holos-ai-ponte.js` | **novo**: os 5 passos, Pacote, importação, revisão, histórico |
| `holos-ai.js` | a aba desenha a ponte primeiro; `secoesPacote(eid)` sem o cadastro; falha da ponte não derruba o contexto em texto |
| `resultado-holos.js` | `receberHolosAI(importação, itens)`; mensagens dos novos erros |
| `resultado-direcao.js` | rótulos da origem "HOLOS AI" (profissional) / "registrado pela sua nutricionista" (paciente) |
| `index.html` | aba HOLOS AI antes do Resultado HOLOS; 2 scripts novos |
| `style.css` | bloco `.hai-*` (tema claro/escuro, 390 px) |
| `supabase/migrations/20261023100000_holos_ai_ponte.sql` | **novo** (aditivo) |
| `supabase/tests/holos-ai-ponte-harness.sql` (+ `scripts/holos-ai-ponte-harness.modelo.sql`, `scripts/gerar-harness-holos-ai.py`) | **novo**: HA00–HA14 no Postgres local |
| `scripts/validar-cadeia-local.sh` | a cadeia local inclui a migration e o harness novos |
| `testes/holos-ai-falso.mjs` | **novo**: RPCs no servidor falso |
| `testes/supabase-falso.mjs`, `testes/resultado-holos-falso.mjs` | tabelas, RPCs e conferência dos itens holos_ai |
| `testes/testar-holos-ai-ponte.mjs`, `testes/testar-holos-ai-contrato.mjs` | **novos**: teste vertical e contrato |
| `testes/testar-arquivos.mjs`, `testes/testar-storage-manifest.mjs` | expectativa nova: ordem das abas e 65 scripts |
| `docs/deploy.md`, `docs/v1/DECISOES-V1.md` (item 196), este documento, `docs/v1/capturas/holos-ai-ponte/` | documentação |

## 5. Testes

**Harness SQL** (Postgres 16 local, cadeia inteira em `BEGIN … ROLLBACK`): **532 ok, 0 falhas** (505 anteriores + 27 da ponte HA00–HA14, com HA03b/HA03c do fechamento de 14/10).

| Grupo | Casos |
|---|---|
| Estrutura | HA00 RLS e grants |
| Importação inválida | HA01 JSON inválido; HA02 schema_version 2; HA03 estrutura inválida; HA03b sem meta/entrada/ferramentas_ja_aplicadas/plano_acompanhamento, estratégia em território não aprofundado, estratégia baseada em hipótese — nada salvo, nem parcial |
| Importação válida | HA03c T5 sem problema e os quatro campos vazios aceitos; HA04 resposta inteira do GPT → v1, 62 itens em 20 seções, 43 só profissionais |
| Imutabilidade | HA05 nem o dono do banco altera ou apaga; HA06 reimportação vira v2 e a v1 fica idêntica; HA07 operation_id |
| Revisão | HA08 editar só texto; só profissional não compartilha; HA09 concluir com pendência recusado; depois de concluir, nada muda |
| Resultado HOLOS | HA10 descartado, só profissional, importação não concluída, sem ref, item de outra importação → recusados |
| Emissão | HA11 finalizar + emissão RF-3: só o confirmado e compartilhado, com o texto editado; sem hipótese, sem leitura profissional |
| Segurança | HA12 outra nutricionista; HA13 descartar e anônimo |
| Não interferência | HA14 HOLOSCAN, Resultados e emissões existentes idênticos; regras antigas da direção iguais |

**Teste vertical** (`testar-holos-ai-ponte.mjs`, navegador + servidor falso, paciente fictícia): **48 ok** (T5 do fechamento; N09 novo). Fluxo:
1. Mapeamento → HOLOSCAN → ferramentas → Copiar Pacote;
2. JSON inválido, schema incompatível, estrutura inválida, sem `plano_acompanhamento` e estratégia em Mente "nao_aprofundado", na tela e no servidor;
3. importar a fixture (resposta inteira do GPT);
4. editar uma estratégia → descartar a sugestão nova (E2) → confirmar sem compartilhar a observação das reuniões → compartilhar → concluir; rótulo único na tela;
5. nova importação (v2, com "Plano B" e rascunho "que combinamos") mostra os AVISOS e não sobrescreve a v1 → descartar a v2;
6. Gerar Resultado HOLOS → escolher HOLOSCAN → rascunho;
7. confirmar foco → finalizar → emitir RF-3 → PDF (1,85 MB) → WhatsApp "Nesta fase, nosso principal direcionamento é: Organizar o fim da tarde.";
8. recarregar → histórico e revisão persistidos;
9. 390 px sem rolagem lateral;
10. outra conta bloqueada; nenhum erro de JavaScript.

**Contrato** (`testar-holos-ai-contrato.mjs`): **26 ok** (C07 do fechamento: 4 chaves obrigatórias, regras estruturais, seis avisos e a mesma conferência rodando o validador do GPT em Python).

**Suíte completa** (`npm run teste`, 14/10, depois do fechamento da v1.2): **VERDE — 158 suítes, 4813 asserções, 0 falhas**. Quatro testes antigos ganharam expectativa nova: `testar-arquivos.mjs` (ordem das abas), `testar-storage-manifest.mjs` (65 scripts) e o seletor do contexto em texto em `testar-correcoes-jornada.mjs` e `testar-relatorios-motor.mjs` (o `#hai-json` não é o contexto).

## 6. Riscos

1. **O front publicado antes da migration** mostra, na aba HOLOS AI, "Não foi possível carregar as importações" e não importa nada (o restante da ficha e o Resultado HOLOS funcionam normalmente). **Aplique a migration antes, ou junto, do front.**
2. **A migration recria duas funções do Resultado HOLOS** (`resultado_holos_validar_item` e `resultado_holos_validar_direcao`). A lógica de produção foi conferida (igual à 20261021100000, só sem comentários). Se alguém alterar essas funções direto no banco antes do deploy, a alteração será sobrescrita: refaça a conferência por md5 (seção 7, passo 0).
3. **Edição só de texto:** a revisão não muda classificação, decisão, IDs nem território. Para mudar estrutura, a nutricionista ajusta no editor do Resultado HOLOS (o item continua com a origem HOLOS AI).
4. **Revisão item a item:** a análise de exemplo tem 62 itens. Os botões por seção resolvem rápido, mas a nutricionista é responsável pelo que confirma em lote.
5. **O Pacote é MVP:**
   - o Mapeamento sai do atendimento escolhido;
   - HOLOSCAN, ferramentas e Conduta saem dos geradores de contexto já existentes (último HOLOSCAN aceito pelo servidor; Conduta do atendimento escolhido);
   - não há tela própria de "quais seções enviar".
6. **"Abrir HOLOS AI"** depende de configurar a URL do GPT (`HOLOS_AI_URLS.chatgpt` ou `HolosAI.configurarUrls`); ainda não existe GPT publicado, então nenhum link foi colocado. Sem ela, o botão avisa que o endereço não está configurado.
7. **Pendência paralela:** a migration da Fase 1 (`20261022100000`, "Link enviado") também continua sem aplicar em produção (conferido em 14/10). As duas são independentes.
8. **Avisos são heurísticos:** detectam padrões de texto ("maior parte dos dias", "combinamos", radicais repetidos de uma hipótese). Podem deixar passar uma redação nova ou avisar à toa; por isso não bloqueiam. O que bloqueia é estrutural (chaves, território não aprofundado, baseado em hipótese).

## 7. Comandos exatos para o deploy (quando autorizado)

**0. Conferência prévia** (só leitura, SQL Editor ou MCP):
```sql
select to_regclass('public.holos_ai_imports') is null as ponte_ainda_nao_existe,
       to_regprocedure('public.resultado_holos_validar_direcao(uuid, uuid, jsonb)') is not null as template5_existe,
       (select md5(prosrc) from pg_proc where proname = 'resultado_holos_validar_item') as md5_item,
       (select md5(prosrc) from pg_proc where proname = 'resultado_holos_validar_direcao') as md5_direcao;
-- esperado em 14/10: true, true, 27a42d53e707cfcb4570735f1a0ef2cf, 7630094d01ab889110d54813325816a3
```

**1. Banco:** Supabase → SQL Editor → colar `supabase/migrations/20261023100000_holos_ai_ponte.sql` inteiro (`begin … commit`) → Run.

**2. Conferência** (só leitura):
```sql
select to_regclass('public.holos_ai_imports') is not null as imports,
       to_regclass('public.holos_ai_import_items') is not null as itens,
       (select relrowsecurity from pg_class where oid = 'public.holos_ai_imports'::regclass) as rls,
       has_function_privilege('authenticated', 'public.importar_holos_ai(uuid, text, uuid)', 'execute') as rpc_autenticado,
       not has_function_privilege('anon', 'public.importar_holos_ai(uuid, text, uuid)', 'execute') as anon_fechado,
       not has_table_privilege('authenticated', 'public.holos_ai_imports', 'insert') as sem_escrita_direta,
       (select count(*) from public.holos_ai_imports) as importacoes;   -- esperado: true, true, true, true, true, true, 0
```

**3. Front:** na VPS, seguir `docs/deploy.md` §3.2–§3.4:
- `git pull`;
- conferir `sha256sum` com o §3.5;
- `docker build` e trocar o container.

O `Dockerfile` já copia `*.js`, então os dois arquivos novos entram sem mudança.

**4. Smoke** (conta de teste, paciente fictícia):
1. Abrir a aba HOLOS AI → Copiar Pacote.
2. Colar `docs/v1/holos-ai-gpt/exemplo-resultado.json` → Validar e importar → v1, 62 sugestões.
3. Confirmar tudo, compartilhar o direcionamento → Concluir → Gerar Resultado HOLOS.
4. Escolher o HOLOSCAN → confirmar o foco → Finalizar → Emitir → conferir PDF e WhatsApp.

**5. Rollback do banco**, se preciso (antes de existir importação real):
```sql
begin;
-- volta as duas funcoes do Resultado HOLOS ao texto de 20261021100000 (colar as duas definicoes de supabase/partes-20261021)
drop function public.importar_holos_ai(uuid, text, uuid);
drop function public.revisar_item_holos_ai(uuid, text, jsonb, boolean);
drop function public.concluir_revisao_holos_ai(uuid);
drop function public.descartar_importacao_holos_ai(uuid);
drop table public.holos_ai_import_items;
drop table public.holos_ai_imports;
drop function public.holos_ai_problemas(jsonb);
drop function public.holos_ai_extrair(text);
drop function public.holos_ai_so_profissional(text);
drop function public.proteger_holos_ai_import();
drop function public.proteger_holos_ai_item();
commit;
```

**Depois que houver Resultado com item da HOLOS AI, não faça rollback.** Os snapshots continuam válidos, mas a direção desses Resultados referencia as tabelas.
