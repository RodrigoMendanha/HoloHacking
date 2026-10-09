# Anamnese pré-consulta por link (09/10)

Decisão: `DECISOES-V1.md` item 178.
**Situação:** implementado e testado localmente (migration, artefato SQL, front e testes). **Não aplicado no banco real, sem deploy.**

## Fluxo

A paciente não cria conta. Os passos:
1. A nutricionista cria a paciente.
2. Na **aba Anamnese**, clica em **Gerar link**.
3. Envia pelo WhatsApp: **Copiar link** ou **Enviar pelo WhatsApp**.
4. A paciente abre o link no celular e preenche em 8 etapas. O progresso é salvo no servidor automaticamente.
5. Ela pode fechar e voltar depois, inclusive por outro aparelho.
6. Quando envia, a resposta fica congelada.
7. A ficha mostra **Concluída** e **Ver resposta**, com o relato da paciente.
8. A nutricionista revisa antes da consulta e usa **Levar para a anamnese do atendimento**, que cria um rascunho V2 para ela revisar e salvar.

## B1. Auditoria da anamnese atual (resumo)

- **Tabela `anamneses`:**
  - **Atendimento:** obrigatório (`encounter_id NOT NULL`).
  - **Estados:** `rascunho → salvo → revisado`; revisões com `supersedes_id`; o que está salvo é imutável.
  - **Validação do servidor:** o CHECK valida só `content.dominios`.
  - **Gravação:** só pelas RPCs `salvar_anamnese` e `criar_anamnese_a_partir_de`.
  - **Acesso:** a RLS permite à nutricionista ler e gravar só o que é dela; não há DELETE.
  - **Travas:** a trava de conta ativa e a de paciente arquivado valem também aqui.
- **V2** (`anamnese-v2.js`):
  - O conteúdo tem `formulario_versao: 2`, `formulario`, `meta` (estado/origem por campo) e `dominios`, gerado por `gerarDominiosDaAnamneseV2`.
  - O rascunho é salvo sozinho, por RPC.
  - A anamnese antiga (V1) abre no editor antigo, sem conversão.
- **Quem lê:**
  - relatório (só consolidadas; conteúdo íntimo só com marcação);
  - Evolução;
  - HOLOS AI (inclui conteúdo íntimo; registrado);
  - linha do tempo, ficha, dashboard e exportação.
- **Nenhuma leitura** vem de HOLOSCAN, Resultado HOLOS, ferramentas ou Próximos Passos.

## B2. Reaproveitamento da V2

O formulário público usa **o mesmo esquema** da V2 (`AnamneseV2.BLOCOS_PRIMEIRA` e `BLOCOS_RETORNO`) e as mesmas chaves `bloco.campo`.

- **Na página da paciente:** as perguntas foram reescritas em linguagem simples, mas a chave continua a mesma.
- **Ao levar para a anamnese:** o rascunho é montado por `prepararDePreConsulta`.
  - O conteúdo passa pela mesma função canônica que gera os domínios (`gerarDominiosDaAnamneseV2`).
  - Resultado: Relatório, Evolução e HOLOS AI continuam lendo como sempre.

Não há modelo duplicado.

## B3–B5. Página pública, convite e token — decisões técnicas

| Tema | Decisão | Motivo |
|---|---|---|
| Endereço | `/anamnese.html#t=<token>` | O pedido citava `/anamnese/:token`. Com o token depois do `#`, ele **não vai para o servidor web, para logs nem para o Referer**; não há ID nenhum no link |
| Token | 32 bytes aleatórios (`gen_random_bytes`), em base64url (43 caracteres), gerados no servidor | Imprevisível; não dá para enumerar |
| Armazenamento | **Só o sha256** fica em `anamnesis_invites.token_hash` (a coluna não é liberada para a API) | Um vazamento do banco não revela o link |
| Copiar o link depois | O token puro é devolvido **uma vez**. O link fica disponível enquanto a tela estiver aberta; depois disso, **Gerar novo link** (o anterior é revogado) | Consequência de guardar só o hash |
| Um link por paciente | Gerar outro revoga o anterior ainda não respondido | Evita dois links válidos |
| Validade | 7 dias (1 a 30 aceitos) | — |
| Estados | Guardados: `enviado`, `iniciado`, `concluido`, `revogado`. **`expirado` é calculado** (vencido e não concluído) | Ninguém precisa "expirar" a linha |
| Acesso anônimo | Sem acesso à tabela; só 3 RPCs públicas (`anamnese_publica_abrir`, `_salvar`, `_enviar`) | A função encontra o convite pelo hash e só mexe nele |
| Enumeração | Token inválido, inventado ou nulo devolve só `invalido`. O formato é conferido antes de qualquer consulta | Não diz se existe outro convite |
| Limites | Rascunho e resposta com até 64 KB; até 2000 salvamentos por convite; blocos e campos fora da lista são descartados no servidor; `meta` e `dominios` vindos de fora são descartados | Ninguém injeta estado, origem ou domínio |
| Rate limit por IP | **Não existe.** O Postgres não vê IP; o token de 256 bits torna a enumeração inviável e os limites por convite seguram abuso | Registrado como risco (ver abaixo) |
| Concluído | A resposta é imutável (gatilho até para o administrador do banco); reenviar ou salvar de novo dá `ja_enviada`; reabrir mostra só "enviada" | Nada muda em silêncio |
| Corrigir | A nutricionista gera um link novo, ou corrige na própria anamnese do atendimento | A resposta original fica como registro |

## B6. Identidade da nutricionista no formulário

**Cópia fixa no convite** (`professional_snapshot`), feita na criação do link:
- nome, profissão, CRN e cores vêm do **Perfil, no servidor**;
- o logo vai como **miniatura** (até ~88 KB, PNG/JPEG/WEBP), gerada no navegador da nutricionista a partir do logo dela.

**Por quê:**
- o caminho do logo no Storage contém o ID da conta, e o link não pode revelar IDs;
- assim a página pública não precisa de nenhum acesso ao Storage.

**Efeito:** um link antigo continua mostrando a identidade da época, o que também serve como registro.

## B7–B8. Experiência da paciente

**As 8 etapas:**
1. Sobre você e seu objetivo
2. Alimentação
3. Saúde e sintomas
4. Medicamentos e suplementos
5. Sono e rotina
6. Histórico e contexto
7. Medidas (só peso e altura, autorrelato)
8. Revisar e enviar

**Como funciona:**
- Nada é obrigatório.
- Os campos emocionais e de sentido pessoal são **opcionais**, com a explicação "Opcional. Responda só se quiser" e a caixa **"Prefiro não responder"**. Ela não pressupõe religião.
- Sem estado técnico, origem, IDs ou "domínios".
- A página é pensada para celular (390 px): barra de etapas fixa, botões Voltar/Continuar no rodapé, foco no título de cada etapa, todo campo com rótulo e rolagem horizontal zero.
- **Ficam de fora:** medidas aferidas, exames e avaliações, que são da profissional. O servidor também os descarta.

## B9–B10. Rascunho e envio

- **O servidor é a fonte oficial.** O rascunho é salvo 1,8 s depois de cada mudança, ao trocar de etapa e ao sair da página.
- O `localStorage` guarda **só uma cópia de segurança** neste aparelho. Ela vale apenas se for mais nova que o servidor (por exemplo, quando faltou rede) e sobe na hora. Ao enviar, a cópia local é apagada.
- **Enviar** valida (pelo menos um campo preenchido), grava, marca `concluido`, congela a resposta e mostra a confirmação.

## B11–B12. Na ficha

- **Cartão "Anamnese pré-consulta"** no topo da aba Anamnese, com:
  - status: Não enviada, Enviada, Iniciada, Concluída, Expirada ou Revogada;
  - datas de envio, início e conclusão, e validade.
- **Botões:**
  - Gerar link
  - Copiar link
  - Enviar pelo WhatsApp
  - Revogar
  - Gerar novo link
  - Ver resposta
  - Levar para a anamnese do atendimento
- **WhatsApp:** abre a conversa da paciente (55 + telefone) com a mensagem do pedido. Não leva dado sensível, só o primeiro nome e o link.

## B13. Vínculo com o atendimento

**Paciente obrigatória; atendimento opcional.** Se houver atendimento ativo (por exemplo, a consulta futura agendada), o convite fica ligado a ele.

A resposta vira anamnese **do atendimento que estiver ativo quando a nutricionista levar para lá**. Se esse atendimento já tiver anamnese, nada é sobrescrito: a resposta continua visível no cartão.

## B14–B16. Histórico, origem e o que NÃO acontece

- **Nada antigo muda.** A V1 não é convertida, não há backfill, e a V2 atual e a anamnese antiga ficam iguais (testado).
- **Origem `relato_paciente` em cada campo**, com `meta.pre_consulta = <id do convite>`:
  - peso e altura informados pela paciente **não** viram `dado_medido`;
  - "Prefiro não responder" vira estado `recusado`.
- **O relato original continua no convite**, mesmo depois que a nutricionista edita a anamnese.
- O convite registra `imported_anamnesis_id` e `imported_at`.
- **Nada vira** diagnóstico, conclusão, conduta, sistema HOLOS ou nota. As funções públicas não tocam HOLOSCAN, ferramentas, Resultado HOLOS, anamneses nem metodologia (AP17).

## Banco

- **Migration:** `supabase/migrations/20261014100000_anamnese_pre_consulta.sql` (só adiciona).
- **SQL Editor:** `supabase/ANAMNESE-PRE-CONSULTA-PARTE1..5.sql`.
  - Cada parte tem pré e pós-checagem.
  - Rodar na ordem. Testado rodando **duas vezes seguidas**.

**SHA-256:**
```
0c05c84fbd2860ca2f9719626f80a1387a4fee0e459d6944affddbbd2b67f083  20261014100000_anamnese_pre_consulta.sql
0a6ea3a636cf1a65d56a29c9bd0b5993f8ab33b149c2ff6f2a4a4077cd1d60d2  ANAMNESE-PRE-CONSULTA-PARTE1.sql
82890d8e5b0f0b5151f1060092ecd0c8746f32b4887f3cde4f0ab5f895aabb4b  ANAMNESE-PRE-CONSULTA-PARTE2.sql
12cf2579a826902a36ea23dad1735ae1e0704863aa1da7975fb14f89d0b7bff0  ANAMNESE-PRE-CONSULTA-PARTE3.sql
855067cc07c7dc9ec4f7bdc246dd9c96bba78b65278b25bebc35053559030c58  ANAMNESE-PRE-CONSULTA-PARTE4.sql
cf43737b3983026b52dc2f82c9db6d8bf536a3337a1b49481269dbc4143f75bb  ANAMNESE-PRE-CONSULTA-PARTE5.sql
```

**Conferência no banco real (só leitura):**
- pgcrypto está no schema `extensions`;
- a migration 20261013100000 está aplicada;
- não há tabela nem função com os mesmos nomes.

O pré-check passaria.

## Testes

- **`supabase/tests/anamnese-pre-consulta-harness.sql` (AP00–AP17, Postgres local):**
  - estrutura e permissões;
  - token de 43 caracteres e só o hash no banco;
  - outra conta recusada;
  - anônimo abre só com o token, sem UUID, sobrenome ou telefone;
  - token inválido, inventado ou com injeção de SQL;
  - anônimo sem acesso às tabelas;
  - rascunho com limpeza no servidor;
  - reabrir e trocar de aparelho;
  - vazio, formato errado e conteúdo grande;
  - envio congelado;
  - imutável até para o administrador;
  - levar para a anamnese;
  - um link por paciente;
  - revogado e vencido;
  - conta pendente e paciente arquivado;
  - não interferência.
- **`testes/testar-anamnese-pre-consulta.mjs` (34 asserções, navegador):** o fluxo inteiro da nutricionista e da paciente, mais XSS, celular, rótulos, WhatsApp, revogar, vencer e a legibilidade do cartão na ficha.

## Riscos restantes

- **Link encaminhado:** quem recebe o link enxerga o primeiro nome da paciente e pode preencher. Mitigação: validade curta, revogação e um link por paciente.
- **Sem rate limit por IP.**
- **Copiar o link depois:** se a nutricionista fechar a tela antes de copiar, precisa gerar outro (decisão de segurança).
- **Paciente sem telefone:** "Enviar pelo WhatsApp" abre o WhatsApp sem contato escolhido.
- **Conta pendente com sessão aberta no mesmo navegador:** se ela abrir o link, o envio é recusado pela trava de conta ativa. É um caso raro.

## Capturas de tela

Em `docs/v1/resultado-anamnese/`, geradas por `SHOT_DIR=docs/v1/resultado-anamnese node testes/testar-anamnese-pre-consulta.mjs` (dados fictícios):
`ficha-preconsulta-link.png` (convite gerado: link e WhatsApp), `publica-mobile.png`, `publica-desktop.png`,
`publica-enviada-mobile.png` e `ficha-preconsulta-resposta.png` (status Concluída e resposta). O texto `<img …>` na resposta
é a carga de teste de XSS aparecendo como texto puro, ou seja, o escape funcionando.
