# Prontuário: exames e documentos são só arquivos (decisão de produto 09/10)

Implementado localmente em 09/10/2026. **Não aplicado no banco real e sem deploy.** Aguarda revisão.

## A regra definitiva
O HoloHacking **não lê, não interpreta, não estrutura, não classifica, não compara, não pontua nem cruza exames**.
Exame e documento são **arquivos do prontuário**: a nutricionista guarda, consulta em qualquer aparelho, abre, baixa e arquiva.
Nada disso entra no HOLOSCAN, no Resultado HOLOS, na HOLOS AI, no relatório automático nem na Evolução.

Também por decisão da usuária: o sistema **não prescreve dieta, déficit calórico nem cardápio**. A Conduta perdeu
Prescrição dietética, Diagnóstico nutricional e Encaminhamentos. Ficam os campos da metodologia (objetivo, estratégia,
ações, recursos, exames solicitados, acompanhamento, retorno, observações, orientações).

## O que mudou (F1–F6)

### F1 — Biblioteca de documentos (aba Documentos da ficha)
- Campos: **tipo** (Exame, Laudo, Receita, Encaminhamento, Documento, Outro), **título**, **data do documento/exame**,
  **arquivo** (PDF, foto, TXT/CSV até 10 MB), **observação**.
- Lista: título, tipo, data, nome e tamanho do arquivo, "Enviado em", responsável (nome do perfil), observação;
  botões **Abrir / Baixar / Arquivar**. "Ver arquivados" mostra os arquivados com **Restaurar**.
- **Documento não é apagado**: Arquivar tira da lista; a linha (`arquivado_em`/`arquivado_por`, carimbados pelo servidor)
  e o arquivo no bucket continuam. `ArquivoStore.remover` recusa documento do servidor; `window.excluirDocumento` é
  um alias de `arquivarDocumento` (qualquer tela esquecida arquiva).
- Paciente arquivado: o arquivo é barrado já ao escolher o arquivo (mensagem padrão), sem formulário.
- Multidispositivo: a lista vem de `documents` (só ativos por padrão) e o arquivo de `storage.download()` autenticado.
  Nenhum link público, nenhum caminho de storage em localStorage ou exportação.

### F2 — Laboratório estruturado desativado (histórico só leitura)
- `salvar_coleta_laboratorial`, `salvar_coleta_exames`, `revisar_coleta_laboratorial`, `marcar_coleta_revisada`
  recusam com `hint = 'laboratorio_desativado'`.
- `revoke insert, update, delete` para `authenticated` em `lab_collections`, `lab_results`, `lab_result_components`,
  `lab_custom_exams`. A leitura continua (RLS por dono).
- `Sincronizacao.salvarColeta` devolve `{ ok: false, motivo: 'laboratorio_desativado' }`; nenhum reenvio de pendente.
- Coletas antigas continuam no banco e são lidas (`Sincronizacao.coletas`, exportação `coletasExames`), mas **não aparecem
  em tela nenhuma**: nem linha do tempo, nem Visão geral, nem Evolução, nem relatório, nem HOLOS AI.

### F3 — Leitura Integrada fora do fluxo
- `salvar_leitura_integrada` recusa com `hint = 'li_desativada'`. Leituras salvas e os pacotes LI-V1 ficam (só leitura).
- Saíram do `index.html`: `laboratorio-catalogo.js`, `laboratorio-motor.js`, `leitura-integrada-motor.js`,
  `laboratorio.js` (os arquivos continuam no repositório como histórico; não são carregados).
- Saíram da tela: menu "Leitura Integrada", bloco laboratorial da aba HOLOSCAN, confronto legado (inclusive em
  `?homologacao=1`), seção B do relatório, seção de exames da Evolução, "Lançar valores" no documento.

### F4 — Página Resultado (`resultado-pagina.js`, seção `#secao-resultado`)
- Entrou no menu no lugar da Leitura Integrada (passo APRESENTAR da jornada: HOLOSCAN → Ferramentas → Resultado HOLOS →
  **Resultado** → Evolução).
- Mostra **só**: o Resultado HOLOS **salvo** (versão para a paciente: ferramentas marcadas "mostrar ao paciente", textos
  da nutri), a **Conduta vigente** (orientações, ações, retorno, combinados) e a **identidade profissional** (nome,
  registro) no cabeçalho e no rodapé. Sem exames, sem ids internos, sem campos só profissionais.
- Sem resultado finalizado: convida a preparar na aba Resultado HOLOS da ficha. Nada é inventado.
- Aviso **só na tela** quando o texto da nutri contém termo fora do método (ex.: "cardápio"); o PDF não leva o aviso.
- **Baixar PDF**: html2pdf.js 0.10.2 (cdnjs, versão fixa), gerado no navegador, baixado como
  `Resultado-HOLOS-<Paciente>.pdf`. Nenhum link público.
- **Enviar pelo WhatsApp**: no celular, compartilha o PDF pelo menu nativo (`navigator.share` com arquivo); no computador,
  baixa o PDF e abre `wa.me/<número do cadastro>?text=<mensagem pronta>` (a nutri anexa o arquivo). Número: DDI 55 só
  quando falta (10–11 dígitos); 12–13 dígitos começando por 55 ficam como estão.
- Imprimir e "Abrir na ficha".

### F5 — Limpeza
- Relatório: seções A (HOLOSCAN), B (Consultas), C "Documentos do prontuário" (**só a contagem**), D interpretação
  profissional. `emitir_relatorio` grava `exames_incluidos = false` e `documentos_armazenados = N` (ativos).
  Emissões antigas com exames ficam como foram gravadas; a tela diz que o registro existe e não exibe valores.
- Evolução sem seção/fonte "exames". Linha do tempo sem "Coleta de exames". Panorama/ficha sem contagem de valores.
- HOLOS AI: contexto diz explicitamente que exames e documentos não estão incluídos.
- Conduta: três campos fora da tela e anulados pelo gatilho `conducts_sem_prescricao` (revisões antigas intactas).
- Ajuda e textos de fronteira reescritos ("não prescreve dieta nem calorias e não emite laudo").

### F6 — Provas
- `supabase/tests/prontuario-pre.sql` + `prontuario-harness.sql` (P00–P18) na cadeia local
  (`PGHOST=/tmp/pgsock PGPORT=55432 sh scripts/validar-cadeia-local.sh`): histórico intacto por impressão digital; RPCs
  recusam; API sem escrita; documento nasce ativo, não apaga, arquivo/paciente imutáveis, arquivar carimbado pelo servidor;
  Storage não solta objeto registrado; conduta sem os 3 campos; relatório sem exames; HOLOSCAN e Resultado HOLOS idênticos
  para a mesma entrada.
- `testes/supabase-falso.mjs` espelha a migration. Suítes novas/reescritas: `testar-prontuario.mjs` (ponta a ponta),
  `testar-holoscan.mjs`, `testar-arquivos.mjs`, `testar-ficha-holoscan.mjs`, `testar-rodada08-exames.mjs`,
  `testar-v1-etapa5-banco.mjs`, `testar-v1-etapa5-ui.mjs`, `testar-v1-etapa6-li-banco.mjs`, `testar-v1-etapa6-li-ui.mjs`,
  `testar-li-guiada.mjs`; as demais suítes afetadas foram ajustadas para provar recusa + preservação (nunca puladas).

## Banco
- Migration `supabase/migrations/20261011100000_prontuario_documentos.sql` (não destrutiva; `begin/commit`).
- Para o SQL Editor: `supabase/PRONTUARIO-DOCUMENTOS-PARTE1..4.sql` (na ordem; idempotentes; PARTE 4 confere tudo e
  registra a migration). **A PARTE 3 é uma função só de ~14 KB**: se o editor cortar o texto, não rodar pela metade —
  a aplicação dessa parte é feita pela ferramenta (MCP) com autorização explícita. As 4 partes foram provadas na cadeia
  local no lugar da migration (mesmo resultado P00–P18 + POS).

## O que NÃO mudou
HOLOS-V1@2 (84 perguntas, pesos, sistemas, faixas, mensagens), LI-V1@2 (fica como histórico), o cálculo do HOLOSCAN, o
Resultado HOLOS, as 10 ferramentas e seus registros, anamnese, atendimentos, agenda, cadastro.

## Riscos restantes
- `caso-marina.js` (demo) ainda escreve `holohacking.exames` local; `holoscan.js` legado ainda aceita `exames` no contexto
  (só `?homologacao=1`/local, contexto vazio). Nenhum caminho leva isso ao servidor ou à tela.
- A exportação JSON ainda leva `coletasExames` (histórico preservado, decisão 6). Avaliar se deve sair numa próxima rodada.
- `laboratorio-*.js` / `leitura-integrada-*.js` continuam copiados pelo `Dockerfile` (`*.js`), mas não são carregados.
- PDF depende de biblioteca externa (cdnjs); sem rede, "Baixar PDF" avisa e "Imprimir" continua funcionando.
- WhatsApp no computador exige que a nutri anexe o PDF baixado (limite do `wa.me`).

## Plano de aplicação real (depois da revisão)
1. Banco (SQL Editor): PARTE 1 → 2 → 3 → 4 (ou MCP para a 3, com autorização). Só leitura depois: colunas, gatilhos,
   privilégios, `documents` total/arquivados, contagens do histórico.
2. Deploy do front pelo script da VPS; `sh scripts/conferir-producao.sh` tem de sair `OK: 64 de 64`.
3. Verificação no ar: aba Documentos (adicionar, abrir em outro aparelho, arquivar, restaurar), página Resultado (PDF,
   WhatsApp), relatório sem exames, Conduta sem os 3 campos.
