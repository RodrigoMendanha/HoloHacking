# Resultado Final do Método HOLOS: decisões aprovadas implementadas (10/10)

Decisão: `DECISOES-V1.md` item 180. Substitui as pendências PM-01 a PM-04 e resolve a PM-05 (Modelo B).

**Situação:** implementado **localmente** (código, testes, migration aditiva, artefato SQL em 7 partes).
**Não aplicado no banco real. Não está no ar.** Aguarda autorização.

**Intocados:**
- HOLOS-V1@2, as 84 perguntas, os pesos, o sentido das perguntas, a cobertura, o Índice, a Tríade, as faixas e as regras do HOLOSCAN;
- os Resultados HOLOS já salvos, com os seus snapshots e hashes.

**Continuam fora de qualquer resultado:** os exames e a Leitura Integrada.

---

## 1. Regras homologadas × pendências metodológicas

| Tema | Regra HOMOLOGADA (implementada) | PENDÊNCIA METODOLÓGICA — AGUARDANDO RODRIGO/DANIEL |
|---|---|---|
| Síntese HOLOS | organização determinística e factual do que o método produziu | fórmula integrada Corpo + Mente + Espírito (PM-07) |
| Prioridade | menor nota = maior prioridade **de investigação** ("1ª/2ª área para investigar") | prioridade clínica, gravidade, risco: não existem |
| Tríade | menor dimensão; empate de 2 = sem dimensão única menor; de 3 = sem predominância | diferença pequena / grande (PM-06) |
| Ferramentas | resultado estruturado, descritivo, **não é score** | taxonomia de crenças (PM-10); padrão em Gatilhos (PM-11) |
| Linha do Momentum | estado **escolhido** pela nutricionista (Preservar, Reorganizar, Construir, Expandir), nunca calculado | — |
| Ferramenta → ferramenta | **só** OQ³ + PQQ → Mapa do Propósito (opcional) | qualquer outra transição (PM-09) |
| Sistema → ferramenta | catálogo HOLOS-RECOMENDACOES-V1 (30 relações), 1 principal + até 2 complementares, nada obrigatório | — |
| Visão da paciente | Modelo B: compartilhamento controlado pela nutricionista | conteúdo da Carta ao Futuro Eu (consentimento, PM-14) |
| Conduta | o resultado **informa**, não gera | Conduta automática (PM-13) |
| Mapeamento | a nutricionista decide quando há informação suficiente | critério automático / suficiência (PM-08) |
| Reaplicação do HOLOSCAN | opção profissional | intervalo automático (PM-12) |

## 2. Síntese HOLOS (`resultado-sintese.js`)

Derivada **só do snapshot salvo**: nada é recalculado nem lido ao vivo.

**Frases que ela produz:**
1. A 1ª e a 2ª área para investigar (sistemas de nota mais baixa), ou "nenhum sistema teve nota".
2. O empate entre sistemas, quando houver (desempatado pela ordem oficial do motor; o empate é dito).
3. A ordem de investigação completa.
4. Os sistemas sem nota e a cobertura insuficiente (Índice não calculado).
5. A Tríade: a menor dimensão, ou o empate de 2, ou "sem predominância" quando as 3 são iguais.
6. As ferramentas indicadas pelo catálogo vigente: os Próximos Passos **congelados no snapshot**.
7. As ferramentas aplicadas e os seus resultados estruturados (a Carta aparece só como "realizada").
8. O estado da Linha do Momentum escolhido pela nutricionista ("informa a Conduta; não a determina").
9. O próximo passo sustentado (a ferramenta principal do catálogo) e o lembrete de que nenhuma é obrigatória.
10. O aprofundamento ainda disponível (sugeridas e não aplicadas) e o Mapa do Propósito opcional quando há OQ³ + PQQ.
11. O limite: "o sistema não possui regra homologada para afirmar gravidade, diagnóstico ou causa, nem para dizer que o mapeamento está concluído".

**Nunca gera:**
- diagnóstico, causa, prognóstico, gravidade, leve/moderado/grave, risco;
- interpretação psicológica ou espiritual;
- conduta, prescrição, orientação nutricional;
- causalidade corpo ↔ emoção;
- "mapeamento concluído", percentual, selo ou intervalo de reaplicação.

**Resultado antigo (template 1):** mostra só o que o snapshot tem. Os Próximos Passos aparecem como "salvo antes de fazerem parte do Resultado; não são buscados ao vivo".

## 3. Resultado estruturado de cada ferramenta (`ferramentas-fechamento.js`)

| Ferramenta | Fechamento | O que nunca faz |
|---|---|---|
| OQ³ | O que quer · O que precisa de atenção · O que consegue sustentar agora · Alavancas | baixo/médio/alto, classificação |
| Linha do Momentum | estado escolhido pela nutricionista + justificativa (só profissional) + dimensões registradas + sustenta/limita | calcular estado por média ou corte |
| Mapa da Rotina | sono, trabalho, deslocamento, responsabilidades, o dia (refeições, atividade, pausas), dificuldades, momentos disponíveis, espaços para a mudança | score, classificação, próxima ferramenta |
| PQQ | objetivo + os 5 níveis + a síntese construída com a paciente | padrão oculto, classificação |
| Mapa de Crenças | crença relatada, contexto/origem, efeito percebido, alternativa | taxonomia, "limitante", padrão predominante |
| Gatilhos & Respostas | situação → gatilho → pensamento → emoção (intensidade) → resposta → consequência → recurso; observação da nutricionista só profissional | trauma, causa, padrão |
| Roda Holística | percepção por área; áreas percebidas como mais/menos cuidadas | média, score diagnóstico |
| Carta ao Futuro Eu | "realizada" (+ para quando) | interpretar; o texto não vai para a paciente |
| Conexão & Pertencimento | apoio, relações, ambientes, pertencimento, conexão consigo, espiritualidade (só quando registrada); vínculos só **contados** | score espiritual, "boa/ruim/tóxica/fraca/forte" |
| Mapa do Propósito | o que quer, por que importa, direção, o que consegue sustentar (de OQ³ + PQQ) | diagnóstico espiritual |

**Critério técnico do Mapa do Propósito:** OQ³ e PQQ concluídos/revisados no resultado, com conteúdo (OQ³: quer, precisa ou consegue; PQQ: objetivo, algum nível ou a síntese). É opcional.

**Na tela:** cada cartão de ferramenta abre com o **Resultado estruturado**. O registro completo fica recolhido logo abaixo, só na visão profissional.

## 4. Sistema → ferramenta (sem mudança)

As 30 relações do HOLOS-RECOMENDACOES-V1 continuam idênticas e na mesma ordem. Isso foi provado no banco local (RF03) e no catálogo do servidor falso.

O rank é a ordem de recomendação do motor, não uma sequência de atendimento. A regra continua: 1 principal + até 2 complementares, sem repetir, e nenhuma ferramenta é obrigatória.

## 5. Visão da paciente: Modelo B

- **O que ela vê:**
  - a identificação;
  - a Tríade em linguagem simples;
  - as **áreas para aprofundar** (1ª e 2ª);
  - as ferramentas autorizadas ("Mostrar ao paciente", desligado por padrão), cada uma com o seu resultado estruturado;
  - a síntese própria para a paciente;
  - os combinados da Conduta (na página Resultado).
- **Próximos Passos:** chave **"Compartilhar Próximos Passos HOLOS com a paciente"** no formulário do Resultado HOLOS, **desligada por padrão**. Ela fica congelada no snapshot (`visibilidade.proximos_passos`).
  - **Ligada:** a paciente vê só os nomes das ferramentas, sem justificativa técnica, código ou regra.
- **Índice e notas:** o comportamento atual foi mantido (a visão da paciente já mostrava o Índice, as notas e as faixas antes). Nenhuma exposição nova foi criada.
- **Nunca mostra:** IDs, hash, pacote, pesos, regra interna, códigos, justificativa técnica, observação profissional privada (questões para aprofundar, justificativa do Momentum, observação da nutricionista em Gatilhos), pendência, debug.

## 6. Conduta

O resultado informa a Conduta e não a gera. Nada do Resultado vira objetivo, estratégia, ação ou combinado.

A emissão (seção 7) copia a Conduta vigente **como a nutricionista escreveu**, só nos campos que já iam para a paciente: objetivo, estratégia, ações, recursos, orientações, retorno e combinados.

## 7. Emissão imutável do Resultado Final

**Antes:** a página Resultado/PDF juntava o Resultado HOLOS congelado com a Conduta e o Perfil **atuais**. Um PDF refeito depois saía diferente.

**Agora** (tabela `holos_result_emissions`, RPC `emitir_resultado_final`):

- **"Gerar Resultado Final"** congela:
  - o Resultado HOLOS usado (id + hash; a Síntese e a visibilidade vêm do snapshot dele);
  - a Conduta destinada à paciente;
  - nome, profissão, CRN, especialidade, cidade, contato e cores;
  - logo, assinatura e carimbo, como imagem embutida;
  - o template (RF-1) e a data/hora.

  Também grava o snapshot, o sha256 e o número da emissão.
- **PDF, WhatsApp e Imprimir** saem só de uma emissão e a desenham só com o que ela congelou. Mudar o Perfil, a Conduta, o logo ou a assinatura depois **não altera** uma emissão antiga. O teste prova que o HTML e o PDF ficam idênticos.
- **Sem emissão:** a tela mostra uma **PRÉVIA** (dados atuais) e o botão "Gerar Resultado Final".
- **Lista de emissões:** cada uma reabre exatamente como foi emitida.
- **Imutabilidade e segurança:**
  - a emissão é imutável (gatilho), sem INSERT, UPDATE ou DELETE direto pela API;
  - RLS: só a própria nutricionista;
  - recusada para paciente arquivado, conta não liberada, resultado em rascunho ou versão substituída;
  - imagem só PNG, JPEG ou WebP em base64, até cerca de 700 KB.
- **Transição:** se o front for ao ar antes do SQL, a página segue como antes (PDF ao vivo), sem erro.

## 8. Snapshot e compatibilidade

- **Template 2** (Resultados novos): o snapshot passa a congelar os Próximos Passos **já registrados** (`holos_next_steps`, imutável) e a visibilidade.
  - Nada é calculado na hora de salvar: sem registro, o snapshot diz `registrado: false`.
- **Template 1** (Resultados antigos): intactos. Sem backfill, sem recálculo, sem mudar hash, sem reinterpretar. A apresentação nova usa só o que o snapshot tem.

## 9. Fluxo final do método

HOLOSCAN
→ 5 sistemas + Índice + Tríade
→ Por onde investigar
→ Próximos Passos HOLOS
→ ferramenta
→ resultado estruturado da ferramenta
→ Mapa do Propósito (se OQ³ + PQQ, opcional)
→ Síntese HOLOS
→ Conduta profissional
→ emissão do Resultado Final
→ versão para a paciente (PDF/WhatsApp)

Ver `FLUXO-CLINICO-V1.md`.

## 10. Testes

| Teste | O que prova |
|---|---|
| `testes/testar-resultado-sintese.mjs` (44) | Síntese em todos os casos pedidos; fechamento das 9 ferramentas; F→F; S→F (30 relações, 1+2, nada obrigatório) |
| `testes/testar-resultado-final.mjs` (25) | tela: Síntese, resultado estruturado, Modelo B (OFF/ON), resultado antigo sem leitura ao vivo, emissão (prévia, gerar, Perfil/Conduta mudam e o PDF fica igual, nova emissão, lista), segurança, transição, 390 px, teclado, imprimir |
| `supabase/tests/resultado-final-harness.sql` (RF00–RF15, 18) | banco local: não interferência (HOLOSCAN, 84 perguntas, pesos, faixas, catálogo), resultados antigos intactos, template 2, emissão imutável, RLS, arquivado, conta pendente, idempotência, exclusão de paciente com convite |

## 11. Capturas

Em `docs/v1/resultado-final/` (dados fictícios):
- `sintese-profissional.png`
- `paciente-pp-off.png`
- `paciente-pp-on.png`
- `emissao-desktop.png`
- `emissao-mobile.png`

## 12. Riscos restantes

- **Template RF-1:** a emissão guarda **dados** congelados e o desenho segue o template RF-1. Se o layout da página da paciente mudar, isso exige um RF-2 que mantenha o RF-1 para as emissões antigas.
- **Imagens congeladas:** saem do navegador (o servidor só valida o formato). Se uma falhar, a emissão sai sem ela e a tela avisa.
- **Mensagem oficial de faixa para a paciente:** traz uma frase dirigida à profissional. É pendência antiga do pacote; o pacote não foi alterado.

## 13. SHA-256 dos artefatos

```
63ee39e3552528e9911d1128f8da73fad42c6950e06ff683e0fbc01c195cc27e  supabase/migrations/20261015100000_resultado_final_holos.sql
125231a9928c01f486681ad4a21893214ddd622dbd30e331490c01959f117307  supabase/RESULTADO-FINAL-PARTE1.sql
59744f9b30b4ce46bf2ead2eb2c9026a97e5019c16f1659d9fdcc30b62a1110b  supabase/RESULTADO-FINAL-PARTE2.sql
2b899a6a4066f7d80ea5f9401156cf046396b61d4a501e05cb28890490c28d38  supabase/RESULTADO-FINAL-PARTE3.sql
d8d9a40f8e1e1959d482616471c6c3c923abc4bc28726a9195296eb4b7bc6a37  supabase/RESULTADO-FINAL-PARTE4.sql
454eddabc3bd1c17723754e2ddd5741d1258fc5fb89d090e982f1a0164afded1  supabase/RESULTADO-FINAL-PARTE5.sql
833b9433ae64237ef12f5eea7fe3c0612a12e691daf3434a83b446574eb3a21e  supabase/RESULTADO-FINAL-PARTE6.sql
ad11af10fd297bf43df08b1f5fd972d92fbc71f19c1cf82d042af34daee705e8  supabase/RESULTADO-FINAL-PARTE7.sql
041e6bb97e0ac10fddbe0376cba2e5efd9ae0b631fcba36b02375c14e4fe3bfd  supabase/tests/resultado-final-pre.sql
8200a58024ac2d0dac546f08e7eeb2b694a97731eecdf2d98fafed696328e3c6  supabase/tests/resultado-final-harness.sql
```
