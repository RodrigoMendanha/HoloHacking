# Teste de ponta a ponta: HOLOSCAN → Resultado (10/10)

Pedido da usuária: testar o sistema inteiro, do HOLOSCAN até o resultado e as indicações, e dizer o que funciona, o que não
funciona e o que faz ou não faz sentido dentro do método. O método **não diagnostica, não prescreve e não encaminha**.

## Como foi testado

1. **Jornada pela tela**, clicando como a nutricionista, no código atual com o servidor de teste:
   - login;
   - cadastro da paciente;
   - atendimento;
   - anamnese;
   - HOLOSCAN com as 84 perguntas respondidas na tela;
   - Próximos Passos;
   - as 3 ferramentas indicadas, abertas pelo botão "Iniciar ferramenta" e concluídas;
   - Resultado HOLOS (profissional e paciente);
   - Conduta com acordo;
   - Resultado Final emitido (PDF e WhatsApp);
   - relatório "Mapa HOLOS";
   - retorno 30 dias depois com novo HOLOSCAN;
   - Evolução;
   - celular (390 px);
   - HOLOS AI.

   O roteiro fica fora do repositório. As capturas estão em `docs/v1/teste-ponta-a-ponta/`.
2. **Motores** (HOLOSCAN → Próximos Passos → Síntese):
   - 18 perfis extremos e de borda (tudo pior, tudo melhor, empates, cobertura no limite de 80%, quase sem respostas);
   - 20 perfis aleatórios, cada um rodado duas vezes.
3. **Dados reais**, só leitura:
   - o pacote HOLOS-V1@2 do banco foi comparado item a item com o do código;
   - os 3 HOLOSCANs reais foram recalculados pelo motor e comparados com o que está salvo. Usei só números, sem nenhuma identificação.
4. **Auditoria de textos**: tudo o que a nutricionista ou a paciente leem, procurando linguagem de diagnóstico, prescrição, encaminhamento, gravidade ou exames.
5. **Suíte automática**: 134 grupos, 4098 verificações, verde (antes desta rodada).

## O que funciona (provado)

- **Cálculo do HOLOSCAN**:
  - os 3 HOLOSCANs reais, recalculados, são **idênticos** ao salvo: Índice, notas, faixas e Tríade;
  - o pacote em produção é **idêntico** ao do código: 84 perguntas, 179 vínculos, 15 faixas, 2 escalas e 16 regras;
  - mesma entrada dá sempre a mesma saída;
  - os limites das faixas estão corretos;
  - as 9 perguntas invertidas estão no sentido certo;
  - o corte de 80% de cobertura funciona;
  - sistema sem dado sai do Índice, da ordem e das indicações.
- **Próximos Passos**:
  - são registrados sozinhos ao salvar o HOLOSCAN;
  - só usam ferramentas do catálogo aprovado (30 regras), com 1 principal e no máximo 2 complementares;
  - vêm sempre dos 2 sistemas de nota mais baixa;
  - "Iniciar ferramenta" abre a ferramenta certa.
- **Jornada pela tela**:
  - os 18 passos funcionaram;
  - nenhum erro de JavaScript;
  - Resultado Final sem rolagem lateral no celular.
- **Linguagem**:
  - as 30 regras, a Síntese, o Resultado HOLOS, o Resultado Final e a Ajuda não diagnosticam, não prescrevem e não encaminham;
  - os avisos "não é diagnóstico" estão presentes.

## Corrigido nesta rodada (local, não publicado)

- **Cartões dos Próximos Passos ilegíveis no tema claro**, **também no site no ar**. O texto herdava a cor creme do painel
  escuro e o contraste era de 1,1:1. Passou para 11,6:1.
  - Arquivo: `style.css`.
  - Teste novo de contraste em `testes/testar-proximos-passos.mjs`.

## Problemas encontrados

### Prioridade 1 — texto que contraria a regra do método (vai para a paciente ou para o relatório)

| Onde | O que está escrito | Quem vê |
|---|---|---|
| `arquivos.js:673`, relatório "Mapa HOLOS" (também na versão "Para o paciente") | "Queixa que sugira doença deve ser encaminhada ao médico." | nutricionista e paciente |
| `corpo-bancos.js:240` e `formulario.js:388`, leitura profissional de todas as ferramentas | opção **"Encaminhar"** e "…monitoramento ou encaminhamento" | nutricionista; vai para o relatório |
| rótulos curtos dos sinais (tela "Por onde investigar", prévia dos Próximos Passos, relatório da paciente) | "candidíase de repetição", "triglicerídeos altos ou HDL baixo", "marcador inflamatório alterado no exame" | nutricionista e paciente |
| `metodologia-decisoes-v1.js:31`, texto da faixa na visão da paciente | "Revise os itens respondidos e a cobertura antes da interpretação profissional… não representa, **sozinha**, um diagnóstico" | paciente (instrução para a profissional aparecendo para a paciente) |
| `index.html:549` | "(0 = **comprometido**, 10 = muito bom)" | nutricionista |
| `conduta.js:31` e `relatorios.js:35` | campo "Exames solicitados" e aviso "Solicitação de exames… pendência" (exames estão desativados) | nutricionista |

### Prioridade 2 — metodologia (decisão do dono do método)

- **A indicação quase não varia.** O Mapa da Rotina é a 1ª opção em 4 dos 5 sistemas. Nos 3 HOLOSCANs reais, a ferramenta principal seria o Mapa da Rotina em todos.
- **Tudo nota 10 ainda indica 2 áreas e 3 ferramentas.** Falta uma mensagem de "nenhuma área destacada".
- **Empate entre a 1ª e a 2ª área** é resolvido pela ordem do pacote, sem aviso (`resultado-sintese.js:82`).
- **A Tríade segue o prefixo da pergunta, não o conteúdo.** As perguntas de sono e foco (SNT-501 a 510) contam como Corpo.
- **"Faixa alta" quer dizer menos sinais**, mas para a paciente "alta" pode soar como problema.
- **O corte de 80% é rígido.** Com cerca de 70% das perguntas respondidas, espalhadas, nenhum sistema fica avaliável.
- **A Evolução não mostra diferença de notas** entre o 1º HOLOSCAN e o retorno: a regra de comparabilidade não foi homologada. No teste, o Índice foi de 57,8 para 72,0 e a tela não mostra isso.
- **Frases da Síntese:**
  - citam as 3 dimensões quando uma está sem dado;
  - afirmam "menor" quando a tela mostra o mesmo número (6,7 e 6,7).
- **O servidor não confere as notas contra as respostas.** É assim por decisão, mas uma nota adulterada no navegador mudaria as indicações registradas.

### Prioridade 3 — coerência

- **Nomes que mudam entre telas:**
  - OQ3 × OQ³;
  - Tríade × Tríada;
  - Físico/Mental/Espiritual × Corpo/Mente/Espírito;
  - "Ácido-Inflamatório" × "Ácido Inflamatório".
- **Dois documentos para a paciente:** o "Mapa HOLOS" antigo, sem as fronteiras novas, e o Resultado Final novo.
- **"Próximos passos" tem quatro sentidos diferentes.**
- **HOLOS AI:** copia o caso, com o nome da paciente, para colar em IA externa, sem aviso de método nem de LGPD. Os botões do ChatGPT e do Gemini estão como "Em desenvolvimento".
- **A demonstração (`?demo=1`) está desatualizada:** ainda cita exames e Leitura Integrada.
- **Evolução com dois atendimentos no mesmo dia:** a tela usou o mesmo HOLOSCAN nos dois pontos. Com datas diferentes, funciona.

## Banco real (só leitura, 10/10)

- **Uso até agora:** 6 contas, 4 pacientes, 5 atendimentos, 3 HOLOSCANs oficiais e 12 ferramentas aplicadas.
- **Ainda não usados:** **0 Próximos Passos registrados** e **0 Resultados HOLOS salvos**. Os 3 HOLOSCANs são anteriores aos Próximos Passos e ninguém ainda salvou um Resultado HOLOS.
- **Não aplicados:** o Resultado Final (tabela de emissões) e a Administração.

## Não testado

- **O site no ar:** a rede deste ambiente bloqueia o acesso a holohacking.com.br.
- **As funções SQL no banco real:** é proibido gravar nele. Elas foram provadas num Postgres local e no servidor de teste.
- **Envio real:** WhatsApp e e-mail; os botões existem e montam o link.
