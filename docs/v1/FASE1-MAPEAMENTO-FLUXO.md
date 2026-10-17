# Plano mestre — Fase 1: fluxo do Mapeamento Holístico

Data: 13/10. Só dados fictícios. Este documento não contém senha, chave ou token.

**Objetivo.** O Mapeamento Holístico deve funcionar como parte real da ficha da paciente, e não só como gerador de link.

**Critério de aceite.** A paciente envia, e a resposta aparece na ficha sozinha, sem nenhuma ação da nutricionista.

**Resultado.** Atendido: `testar-mapeamento-fluxo.mjs`, item F06. A ficha aberta mostrou a resposta em cerca de 0,5 s no teste. Em uso real, o tempo máximo é 20 s.

---

## 1. Auditoria (como estava)

| Ponto | Situação encontrada |
|---|---|
| **Onde a resposta fica** | Em `anamnesis_invites.submitted_content`. A RPC pública `anamnese_publica_enviar` grava a resposta e marca `status = concluido` e `submitted_at` **no próprio envio**, então a resposta **já era salva automaticamente**. O rascunho da paciente vai para `draft_content` (autosave; `status = iniciado`, `started_at`, `last_saved_at`). |
| **Estados no banco** | `enviado` (no momento em que o link é **gerado**), `iniciado`, `concluido` e `revogado`. "Expirado" é derivado de `expires_at`. |
| **Quando aparece na ficha** | Só quando o cache da aba era recarregado, isto é, ao trocar de paciente ou recarregar a página. Com a ficha aberta, a aba continuava mostrando "Enviado" para sempre. **Essa era a causa do "não aparece sozinho".** |
| **Dashboard × aba** | O Dashboard relê os convites a cada abertura (TTL de 5 s). A aba usava o cache. Resultado: o Dashboard mostrava "Mapeamento recebido" enquanto a aba e a Visão geral ainda mostravam "Enviado". |
| **"Enviado"** | Aparecia no momento em que o link era **gerado**, mesmo que a nutricionista nunca tivesse mandado. Não havia nenhum registro do envio. |
| **Depois de respondido** | A tela continuava organizada em torno do link e mostrava a resposta **inteira** aberta. Não havia resumo. "Enviar novo Mapeamento" tinha o mesmo peso das outras ações. |
| **Histórico** | Só os Mapeamentos *respondidos* anteriores apareciam. Revogados e expirados não apareciam, e não havia datas de envio nem a indicação "levado ao atendimento". |
| **Vínculo com o atendimento** | `encounter_id` é o atendimento ativo no momento em que o link é gerado. "Levar para o atendimento" cria um rascunho V2 e grava `imported_anamnesis_id` e `imported_at`. A tela não mostrava se essa anamnese tinha sido concluída. |

## 2. Arquitetura adotada

**Etapas**

Uma regra só, `PreConsulta.etapa(convite)`, usada pela aba, pela Visão geral e pelo Dashboard:

```
NÃO ENVIADO → LINK GERADO → LINK ENVIADO → MAPEAMENTO RECEBIDO → REVISADO
(fora do caminho: LINK EXPIRADO, LINK REVOGADO)
```

| Etapa | Vem de |
|---|---|
| Link gerado | convite aberto e `sent_at` nulo. Detalhe: "Ainda não enviado ao paciente" ou "O paciente começou a responder" |
| Link enviado | `sent_at` preenchido no 1º "Copiar link" ou "Enviar pelo WhatsApp". Detalhe: meio usado, ou "O paciente começou a responder" |
| Mapeamento recebido | `status = concluido`. Detalhe: "Respondido pelo paciente" ou "Levado para o atendimento: em revisão" |
| Revisado | a resposta foi levada (`imported_anamnesis_id`) **e** a anamnese daquele atendimento está salva ou revisada |

**Banco** (migration aditiva `20261022100000_mapeamento_link_enviado.sql`, 53 linhas):
- Colunas `sent_at timestamptz` e `sent_via text`. `sent_via` aceita só `whatsapp` ou `copiado`, e as duas colunas são preenchidas juntas ou ficam as duas vazias. A nutricionista dona do convite tem acesso de leitura.
- RPC `marcar_convite_anamnese_enviado(p_id, p_via)`:
  - é chamada só pela nutricionista dona do convite e só com o link aberto;
  - grava apenas o **1º** envio, e um clique repetido não muda nada;
  - não altera o status nem a resposta.
- A RPC fica sob a mesma trava de conta ativa (`exigir_conta_ativa`). Nenhuma RPC pública mudou.

**Atualização automática** (`anamnese-convite.js`):
- Com a ficha aberta e um link aberto, a tela confere o estado no servidor a cada 20 s.
- Também confere ao voltar para a aba do navegador e ao reabrir a aba Mapeamento.
- A conferência é leve: lê só colunas de estado, sem a resposta. Só relê tudo quando algo mudou.
- Quando a resposta chega, a tela redesenha o cartão do Mapeamento, a Visão geral e o Dashboard, e mostra o aviso "Mapeamento recebido de ⟨primeiro nome⟩".
- O registro do atendimento, que pode estar sendo digitado, **não** é redesenhado.
- Nada é gravado: a conferência só lê.

**Tela depois de recebido:**
1. Caminho de 4 passos, com datas.
2. "Mapeamento recebido · data e hora".
3. **Resumo** com as palavras da paciente: motivo, o que quer melhorar, dificuldades, fome, sinais, o que mais incomoda, rotina e "algo mais". No retorno: melhorou, piorou, prática, facilitou, dificultou, mudança, questão nova.
4. Datas.
5. Botões **Abrir Mapeamento completo** e **Levar para o atendimento**.
6. "Enviar novo Mapeamento" separado, como ação secundária.
7. **Histórico** com todos os envios (gerado, enviado, recebido, levado, revogado, expirado), com o atendimento de cada um. Os respondidos anteriores podem ser abertos para leitura.

**Compatibilidade.** O front funciona antes da migration. Se o banco ainda não tiver `sent_at`, a tela lê sem as colunas novas e o "Link enviado" vale só naquela sessão. Nenhuma mensagem de erro aparece (F10).

## 3. Impacto no método

**Nenhum.** O Mapeamento continua sendo contexto: não pontua, não alimenta sistemas, Índice, Tríade, PP-V1 nem Resultado. O resumo só seleciona respostas e não interpreta nada. A resposta enviada continua imutável (gatilho do banco). F12 prova que as digitais de HOLOSCAN, ferramentas, Resultado HOLOS, metodologia e conduta continuam iguais. Não há decisão metodológica nova nesta fase.

## 4. Arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/20261022100000_mapeamento_link_enviado.sql` | novo (aditivo) |
| `supabase/tests/mapeamento-link-enviado-harness.sql` | novo; ligado em `scripts/validar-cadeia-local.sh` |
| `anamnese-convite.js` | etapas, envio registrado, conferência automática, resumo, histórico |
| `mapeamento-holistico.js` | `resumo(conteudo)`; também servirá à Fase 2 (contexto no atendimento/HOLOSCAN) |
| `dashboard.js` | lê `sent_at` (com fallback), usa a mesma etapa, `JornadaPaciente.recarregar()` |
| `ficha.js` | a linha "Mapeamento Holístico" da Visão geral usa a etapa e se redesenha sozinha |
| `style.css` | caminho, resumo e histórico |
| `testes/supabase-falso.mjs`, `testes/anamnese-pre-consulta-falso.mjs` | colunas e RPC novas; `s.semMigracao` para simular banco antigo |
| `testes/testar-mapeamento-fluxo.mjs` | novo (F01–F12), na suíte |
| `testes/testar-mapeamento-holistico.mjs`, `testar-anamnese-pre-consulta.mjs`, `testar-mapeamento-enxuto.mjs` | ajustados (ver §6) |

## 5. Testes

- **`testar-mapeamento-fluxo.mjs`**, todos ok:
  - F01 sem convite;
  - F02 link gerado ≠ enviado;
  - F03 WhatsApp registra o 1º envio;
  - F04 Dashboard = Visão = aba;
  - F05 "começou a responder" aparece sozinho;
  - **F06 a resposta aparece sozinha com a ficha aberta**, com data, hora, resumo e aviso; a Visão geral também muda;
  - F07 abrir e fechar a resposta completa;
  - F08 em revisão → Revisado;
  - F09 histórico;
  - F10 banco sem a migration;
  - F11 segurança;
  - F12 não interferência.
- **Postgres local:** MF00–MF05 ok (cadeia inteira: **505 ok**, eram 499):
  - colunas e grants;
  - 1º envio idempotente;
  - conta alheia recusada;
  - anônimo recusado;
  - convite respondido ou revogado recusado;
  - nada gravado direto pela nutricionista;
  - coerência das duas colunas.
- **Suíte completa:** o resultado está na resposta desta entrega.

## 6. Testes antigos ajustados (mudança de texto, não de regra)

| Antes | Agora |
|---|---|
| status "Enviado" ao gerar | "Link gerado" (e "Link enviado" depois de copiar/WhatsApp) |
| "Iniciado" / "Iniciado em" | "O paciente começou a responder" / "Paciente começou em" |
| "Concluído" + resposta inteira aberta + "Esconder resposta" | "Mapeamento recebido" + resumo + "Abrir Mapeamento completo" |
| "Revogado" / "Expirado" | "Link revogado" / "Link expirado" |
| `select(COLUNAS)` | `select(colunas(estado))` (BASE ou ESTADO, sem token_hash) |

## 7. Riscos

1. **Conferência a cada 20 s.**
   - **Quando roda:** só com a ficha aberta, a aba do navegador visível e um link aberto.
   - **O que lê:** uma consulta pequena por paciente.
   - **Quando para:** o link foi respondido, revogado ou expirou, ou não há nenhum link aberto.
2. **"Revisado" depende do cache de anamneses carregado.** Sem ele, a tela mostra "Mapeamento recebido · em revisão" até a anamnese chegar, e depois se corrige sozinha (`Anamnese.aoMudar`).
3. **Envios antigos:** convites anteriores à migration ficam sem `sent_at`. Os abertos aparecem como "Link gerado" até o próximo "Copiar" ou "WhatsApp"; os respondidos não mudam.
4. **"Copiar link":** o envio só é registrado quando a cópia funciona, seja pela área de transferência ou pela cópia alternativa do navegador. Se o navegador bloquear as duas e abrir a caixa "Copie o link", nada é registrado: o status continua "Link gerado" até um WhatsApp ou uma nova cópia.

## 8. Deploy (quando autorizado)

1. Supabase → SQL Editor → colar `supabase/migrations/20261022100000_mapeamento_link_enviado.sql` inteiro (53 linhas, `begin … commit`).
2. Conferir (só leitura):
   ```sql
   select count(*) filter (where column_name in ('sent_at','sent_via')) = 2 as colunas,
          to_regprocedure('public.marcar_convite_anamnese_enviado(uuid, text)') is not null as rpc
     from information_schema.columns where table_schema='public' and table_name='anamnesis_invites';
   ```
3. Publicar o front pelo script da VPS (ordem indiferente: o front aguenta o banco sem a migration).
4. **Rollback do banco**, se for preciso:
   ```sql
   drop function public.marcar_convite_anamnese_enviado(uuid, text);
   ```
   As colunas podem ficar, porque não afetam nada.

## 9. Capturas (`docs/v1/capturas/fase1-mapeamento/`)

- `f1-nao-enviado`
- `f2-link-gerado`
- `f3-link-enviado`
- `f6-recebido-resumo` (com o aviso)
- `f7-mapeamento-completo`
- `f8-revisado`
- `f9-historico`

## 10. Próxima fase

A Fase 2 trata da integração Mapeamento → atendimento e do bloco "Informações relevantes do Mapeamento" no HOLOSCAN. Ela vai usar o mesmo `MapeamentoHolistico.resumo`. Não começa sem a revisão desta fase.
