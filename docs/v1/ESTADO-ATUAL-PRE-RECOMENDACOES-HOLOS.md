# ESTADO ATUAL DO HOLOHACKING — PRÉ-RECOMENDAÇÕES HOLOS

Relatório **só de leitura** (nada foi implementado para recomendações). Levantado em 09/10/2026 sobre a branch
`claude/v1-etapa6-1-validacao-banco-real`, já com o prontuário (exames/documentos só como arquivos) implementado
localmente. Nenhum nome de paciente nem dado clínico aqui. Onde um fato vem do banco real, está marcado **[banco real,
só leitura]**; o resto vem do código.

---

## A. Identidade e git
- Repositório público `RodrigoMendanha/HoloHacking`; branch de trabalho `claude/v1-etapa6-1-validacao-banco-real`.
- Produção (holohacking.com.br) roda **518bd65** (deploy feito pela usuária). Depois dela, na branch: `fc6a009`
  (roteiro de deploy) e o commit do prontuário **f567a70 (+ e71a8ed, roteiro de deploy)** (não aplicado no banco real, sem deploy).
- Supabase `sllhyymeeyoozokgbnuv`: migrations aplicadas até `20261010100000` (36) **[banco real, só leitura]**; a 37ª
  (`20261011100000_prontuario_documentos`) existe só na branch.
- Suíte local: 124 suítes, 3801 asserções, 0 falhas (`node testes/rodar.mjs`, 09/10, sobre f567a70). Cadeia SQL local (`scripts/validar-cadeia-local.sh`): verde, P00–P18 inclusive.

## B. A tela de resultado do HOLOSCAN (seção HOLOSCAN, `app.js` `desenharResumo`, ~l. 2916)
Quadro **"Resultado desta aplicação"**:
1. meta: data da aplicação, "N de 84 perguntas respondidas", selo (oficial / histórica / homologação);
2. **"Os cinco sistemas, do mais baixo ao mais alto"**: nome, nota, faixa (`HoloAusencia.porLeitura`; sem nota quando
   < 80% das perguntas do sistema);
3. **Tríade**: Físico · Mental · Espiritual e "dimensão mais baixa";
4. **"Por onde investigar"**: os **2 sistemas de nota mais baixa** com os **3 sinais (perguntas) que mais pesaram**
   (`dominantes`: `holoscan-oficial.js` `paraTela`, l. 108–121 — contribuição desc., empate por `question_id`, guarda 5);
   texto fixo: "É a aritmética das respostas — não é diagnóstico nem…";
5. botões: **Resultado HOLOS →**, **Resultado para a paciente →** (novo, 09/10), **Conduta →**;
6. **"Sua interpretação"** (textarea, vai para o relatório).
Abaixo do quadro: radar, Índice, Tríade, cobertura, `#holo-dominantes`, `#holo-prioridades`.
**Não existe** hoje nenhuma sugestão de ferramenta nesta tela (Decisão 65; "Por onde começar" desligado, l. 3169–3195).

## C. Pacote HOLOS-V1@2 **[banco real, só leitura]**
Aprovado, `content_hash 7af1dae64c1e…`, vigente desde 2026-10-03; 84 perguntas; 5 sistemas (fúngico, ácido-inflamatório,
metabólico, detox-linfático, mental-emocional-espiritual); 84 associações primárias peso 1; 11 `secondary_contextual`;
84 `triade_por_bloco`; 15 faixas (3 por sistema); 16 regras (scoring×5, absence, coverage, index, triad×3,
comparability, suggestion com `automatica:false`, example…); escalas frequência/intensidade 0–3; edição HOLOSCAN-V1 v1;
aprovação passo 1 em 2026-10-03 (aprovador único). **Revisão pública** das 84 perguntas aberta (`aprovacoes.html`,
rodada até 2026-10-24) — parecer, não altera o pacote.

## D. Mensagens oficiais por faixa
Texto único por faixa (×15): "A pontuação deste eixo ficou na faixa X nesta aplicação. Revise os itens respondidos e a
cobertura antes da interpretação profissional." + sufixo paciente " Esta pontuação organiza respostas do HOLOSCAN e não
representa, sozinha, um diagnóstico." Nenhum texto de ação, dica ou ferramenta vem do pacote.

## E. Motor de prioridade (o que existe)
- Ordem de leitura dos sistemas: `HoloAusencia.porLeitura` (nota crescente; sem nota por último).
- "Dominantes" por sistema: aritmética de contribuição (sem peso clínico além do peso 1 das associações).
- `#holo-prioridades`: lista de faixas por sistema (texto do pacote), sem ranking próprio.
- Não há motor de prioridade além disso; nenhum cruzamento com ferramentas, exames (retirados), anamnese ou conduta.

## F. Recomendações já existentes (todas desligadas) — `corpo-bancos.js`
- **REC-001…015** (fonte `holoscan`, condição `{tipo:'sistema', sistema}`, `recommended_tool_id`, `priority`,
  `status: legado_nao_validado`): **10 apontam para ferramentas travadas** (ex.: `diario_corporal`,
  `gatilhos_respostas` antigo); **REC-016…023** (fonte `momentum`, `rascunho_nao_validado`).
- **SEL-001**: 2 do pior sistema + 1 do segundo, momentum `null` (vaga declarada vazia), máximo 4; `status rascunho`.
- `regrasApresentaveis()` (l. 518) só deixa passar `status = confirmado` → **nenhuma**. `montarConduta` (app.js l. 2804)
  existe, mas a tela mostra o aviso de "sugestões desligadas" (Decisão 65).
- Nada disso referencia as 10 ferramentas ativas pelos ids atuais (`*_v1`).

## G. As 10 ferramentas (únicas permitidas)
`ferramentas.js` `FERRAMENTAS_ATIVAS` + OQ³/PQQ/Mapa do Propósito (`formulario.js`):
- **Corpo (3):** OQ³ (`oq3`), Linha do Momentum (`linha_momentum`), Mapa da Rotina (`mapa_rotina_v1`);
- **Mente (3):** PQQ (`pqq`), Mapa de Crenças (`mapa_crencas`), Gatilhos & Respostas (`gatilhos_respostas_v1`);
- **Espírito (4):** Mapa do Propósito (`mapa`), Roda da Vida (`roda_vida`), Carta ao Futuro (`carta_futuro`),
  Conexão & Pertencimento (`conexao_pertencimento_v1`).
Travadas (fora do catálogo ativo; ids antigos congelados como legado): não entram em nenhuma sugestão.
Registro em `tool_applications` (status rascunho/concluida/revisada; concluída é imutável; `encounter_id`).

## H. Roteamento até uma ferramenta
- `window.abrirFerramentaPorId(id)` (`formulario.js` l. 881): abre o eixo e a vista da ferramenta (nav + card
  `[data-ferramenta]` / `[data-vista="vista-<id>"]`).
- `window.levarParaFicha(destino, id)`, `window.irParaSecao(secao)`, `window.definirPacienteAtivo(id)` (`app.js` l. 633–636).
- Já usado por: ficha (`ficha.js` l. 1076, chips de ferramenta) e pela antiga "Por onde começar" (`app.js` l. 3201).
Um botão "Aplicar <ferramenta>" no quadro do HOLOSCAN precisaria só de `data-abrir="<id>"` → `abrirFerramentaPorId`.

## I. Conduta (`conduta.js`)
Campos: objetivo, estratégia nutricional, ações, recursos, exames solicitados, monitoramento, retorno, observações,
orientações profissionais (**sem** prescrição dietética, diagnóstico nutricional e encaminhamentos — 09/10). Acordos
com estados (proposto → … → encerrado) e decisão sobre a anterior. Referências a ferramentas aplicadas (`[data-cd-tool]`,
nomes, não ids). Vinculada ao atendimento; a "vigente" é a do atendimento mais novo.

## J. Página Resultado (paciente) — `resultado-pagina.js` (09/10)
Só: Resultado HOLOS **salvo** (versão paciente: ferramentas com "mostrar ao paciente", textos da nutri), Conduta vigente
(orientações, ações, retorno, combinados), identidade profissional. Sem exames, ids, campos profissionais. Aviso de termo
fora do método só na tela. Ações: Baixar PDF, WhatsApp, Imprimir, Abrir na ficha.

## K. PDF
html2pdf.js 0.10.2 (cdnjs, versão fixa), gerado no navegador a partir do `#rp-doc`; nome `Resultado-HOLOS-<Paciente>.pdf`;
nenhum link público; celular compartilha via `navigator.share` (arquivo); computador baixa + `wa.me/<número>?text=`.

## L. Exames — estado atual
Só arquivos (migration 20261011100000): biblioteca (tipo, título, data, arquivo, observação; arquivar, nunca apagar).
Laboratório estruturado e Leitura Integrada fora do fluxo (RPCs recusam; escrita revogada; UI removida). Histórico
preservado só leitura, fora de toda tela. **Nenhum dado de exame pode alimentar um motor de recomendação.**

## M. HOLOS AI
Módulo de contexto (`holos-ai.js`): monta um texto com registros salvos (HOLOSCAN oficial, consultas, ferramentas,
conduta) e diz que exames/documentos não entram. Agentes externos marcados "Em desenvolvimento" (sem URL). Edge
Function `holos-ai` inerte. **Não gera recomendação.**

## N. Dados disponíveis hoje para um motor de recomendação (todos no servidor, sob RLS por nutricionista)
- `holoscan_applications` + `holoscan_system_scores` (nota, faixa, obtido/máximo, respondidos, avaliável) +
  `holoscan_answers` (84 respostas) + proveniência do pacote (id, versão, hash);
- `tool_applications` (quais ferramentas já foram aplicadas, quando, status, respostas, leitura);
- `holos_results` (seleção, visão paciente, observações, snapshot com sha256);
- `conducts`/`agreements` (vigente e histórico), `anamneses`, `encounters`;
- pacote metodológico (perguntas, sistemas, associações, faixas, regras) — só leitura.
Não disponíveis: exames (por decisão), Leitura Integrada (retirada), sugestões legadas (não validadas).

## O. Onde regras de recomendação poderiam viver
1. **No pacote metodológico** (`methodology_rules`, `rule_type = 'suggestion'`): hoje `automatica:false`; mudar exige
   nova versão do pacote + aprovação (governança existente). Vantagem: versionado, com hash e aprovação; a tela só lê.
2. **Tabela própria** (ex.: `recommendation_rules`, global, só leitura pela API, com `status`, `version`, `provenance`),
   editada só por migration/aprovação — mesmo padrão do catálogo laboratorial (`GLOBAIS_SO_LEITURA` no falso).
3. **No código** (`corpo-bancos.js`): é onde REC/SEL vivem hoje; sem versionamento de dados nem aprovação — não recomendado.

## P. Mecanismos de aprovação existentes
- Pacote metodológico: `methodology_package_approvals` + aprovador único (`governanca_aprovador_unico`, 20261003100000),
  hash do conteúdo, `effective_from`.
- Leitura Integrada: `integrated_reading_package_approvals` (fora do fluxo desde 09/10).
- Revisão pública das perguntas (`aprovacoes.html`): parecer, sem efeito automático.
- Cadastro de nutricionistas: aprovação administrativa (`profiles.status`).

## Q. Riscos / cuidados para a próxima etapa
- Qualquer sugestão automática contraria a Decisão 65 enquanto não houver regra **aprovada**; a V1 declara que nenhuma
  sugestão é oficial.
- As REC legadas apontam para ferramentas travadas; não reaproveitar sem reescrever para os 10 ids ativos.
- "Por onde investigar" é aritmética; um motor que derive "ferramenta X" de "sistema Y baixo" é uma regra metodológica
  nova e precisa de dono (Daniel) e aprovação.
- A página Resultado (paciente) não deve receber sugestão automática sem decisão explícita.
- Repositório público: regras e textos entram no código/migration; nada clínico de paciente.

## Mapa de fluxo (hoje)
Anamnese → HOLOSCAN (84) → quadro de resultado (sistemas, Tríade, "por onde investigar", interpretação) → Ferramentas
(10, escolha manual da nutri) → Resultado HOLOS (seleção explícita + visão paciente) → Resultado (página da paciente:
PDF/WhatsApp) → Conduta (vigente) → Evolução. Exames: só arquivos no prontuário, fora do fluxo clínico automatizado.

## Matriz final
| Item | Existe | Onde | Estado | Observação |
|---|---|---|---|---|
| Tela de resultado HOLOSCAN | sim | `app.js` desenharResumo | em produção | sem sugestão de ferramenta |
| Pacote HOLOS-V1@2 | sim | banco (`methodology_*`) | aprovado, vigente | 84 perguntas, 16 regras, suggestion off |
| Mensagens por faixa | sim | pacote (15) | oficiais | neutras, sem ação |
| Motor de prioridade | parcial | `HoloAusencia.porLeitura`, `paraTela` | aritmético | sem cruzamentos |
| REC-001…023 / SEL-001 | sim | `corpo-bancos.js` | desligadas, não validadas | apontam para travadas |
| 10 ferramentas | sim | `ferramentas.js`, `formulario.js` | ativas | ids `*_v1` para 3 delas |
| Roteamento para ferramenta | sim | `abrirFerramentaPorId` | pronto | basta um botão |
| Conduta | sim | `conduta.js` + RPC | sem os 3 campos (09/10, local) | aguarda banco real |
| Página Resultado (paciente) | sim | `resultado-pagina.js` | local (09/10) | PDF/WhatsApp |
| Exames | só arquivo | `arquivos.js`, migration 20261011100000 | local (09/10) | histórico só leitura |
| HOLOS AI | contexto | `holos-ai.js` | em desenvolvimento | sem recomendação |
| Dados para um motor | sim | tabelas sob RLS | disponíveis | sem exames/LI |
| Lugar para regras | a decidir | pacote / tabela própria | — | precisa aprovação |
| Aprovação | sim | approvals + aprovador único | em uso | reaproveitável |
