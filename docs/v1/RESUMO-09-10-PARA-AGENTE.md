# HoloHacking: o que foi feito em 09/10/2026 (contexto para o agente)

**Estado em produção:** holohacking.com.br roda o commit **c22a27d** (branch `claude/v1-etapa6-1-validacao-banco-real`), conferido 69 de 69 arquivos no ar.
**Banco (Supabase, projeto Holohacking, plano Pro, São Paulo):** todos os SQL citados abaixo foram **aplicados e conferidos**.
**Regras que continuam valendo:**
- HOLOS-V1@2, as 84 perguntas e os pesos **não foram alterados**.
- Exames são só arquivos: não entram em nenhum resultado. A Leitura Integrada está fora do fluxo.
- Nenhuma conclusão clínica é gerada sem regra homologada. O que falta regra aparece como **PENDÊNCIA METODOLÓGICA — AGUARDANDO RODRIGO/DANIEL**.

---

## 1. Resultado HOLOS: "Resumo estruturado" (a principal alteração)

**Onde:** aba **Resultado HOLOS** da ficha da paciente (visão profissional e visão da paciente) e página **Resultado · Paciente** (PDF/WhatsApp).
**Arquivo novo:** `resultado-sintese.js`. Alterado: `resultado-holos.js`.
**O que é:** um bloco no topo do documento que **organiza o que já está salvo** no Resultado HOLOS. Não recalcula nada, não grava nada e não inventa texto clínico.

### Visão profissional: 4 camadas, cada uma com rótulo na tela
1. **FATOS** (cálculo do sistema, já salvo no snapshot):
   - Índice HOLOS (ex.: 50 de 100);
   - quantos sistemas têm nota e quais não têm;
   - a ordem dos 5 sistemas, do mais baixo ao mais alto;
   - a Tríade Corpo / Mente / Espírito, com a dimensão mais baixa só quando não há empate (se houver empate, diz que estão iguais);
   - as ferramentas aplicadas, por eixo (Corpo, Mente, Espírito).
2. **REGRA OFICIAL** (metodologia aprovada):
   - **"Por onde investigar"**: os 2 sistemas de nota mais baixa, a mesma regra do HOLOSCAN;
   - **Próximos Passos HOLOS registrados**: sistema → ferramenta, pelo catálogo aprovado HOLOS-RECOMENDACOES-V1, lidos do registro e sem recalcular.
3. **DECISÃO DA NUTRICIONISTA**:
   - o estado escolhido na Linha do Momentum;
   - quantas leituras de ferramenta ela registrou;
   - quantas das 3 observações ela preencheu (**nenhuma é obrigatória**).
4. **PENDÊNCIAS METODOLÓGICAS** (num bloco recolhível, com o selo "AGUARDANDO RODRIGO/DANIEL"):
   - **PM-01:** conclusão integrada Corpo, Mente e Espírito;
   - **PM-02:** fechamento/"resultado" de cada ferramenta;
   - **PM-03:** ferramenta → próxima ferramenta (matriz a partir do resultado de uma ferramenta);
   - **PM-04:** prioridade e gravidade além da ordem "Por onde investigar";
   - **PM-05:** o que a paciente vê ("Por onde investigar", Próximos Passos) e a frase dirigida à profissional que aparece na mensagem oficial de faixa para a paciente.

### Visão da paciente: "Resumo da sua avaliação"
- Só fatos simples: as respostas organizadas em 5 sistemas, o Índice e as ferramentas que a nutricionista marcou para mostrar.
- **Não mostra:** pendências, "Por onde investigar", Próximos Passos, códigos ou IDs.

### Garantias
- Resultados antigos ganham o resumo ao abrir, **sem nenhuma gravação**. Snapshot, hash, versões e histórico continuam iguais.
- O Resultado salva **sem nenhum texto obrigatório**.
- Teste: `testes/testar-resultado-sintese.mjs` (18 verificações, incluindo a busca por frases de conclusão, gravidade ou recomendação que não deveriam existir).

### Auditoria feita junto (resumo)
- **Entram no Resultado HOLOS:** HOLOSCAN oficial, as ferramentas escolhidas e as 3 observações.
- **Não entram:** exames, Leitura Integrada, anamnese.
- **Calculados pelo sistema:** notas, faixas, Índice, Tríade, "Por onde investigar" e Próximos Passos (catálogo).
- **Sem regra oficial:** conclusão integrada, fechamento de cada ferramenta, ferramenta → ferramenta, prioridade e gravidade (por isso as PM-01 a PM-05).
- **Recomendações antigas (REC-001…023, SEL-001):** continuam **desligadas**.
- **Risco registrado:** a página Resultado/PDF junta o snapshot com a Conduta e o Perfil **atuais**. Um PDF gerado hoje pode sair diferente de um gerado antes, porque não há registro da emissão (decisão de produto pendente).
- **Arquitetura para o futuro:** uma regra de conclusão ou de ferramenta → ferramenta deve ser **um catálogo aprovado e versionado**, aplicado no servidor e gravado em snapshot, como os Próximos Passos. Nada disso foi criado: depende das decisões de Rodrigo/Daniel.
- **Documentos:** `docs/v1/RESULTADO-FINAL-HOLOS.md` (auditoria completa A1–A9, matriz de dados) e `docs/v1/FLUXO-CLINICO-V1.md` (jornada inteira com a natureza de cada dado).

---

## 2. Anamnese pré-consulta por link (SQL aplicado e no ar)

**Fluxo:**
1. Ficha da paciente → aba **Anamnese** → cartão **"Anamnese pré-consulta"** → **Gerar link**.
2. A nutricionista envia por **WhatsApp** (botão) ou copia o link.
3. A paciente abre **holohacking.com.br/anamnese.html#t=…** no celular, **sem criar conta**:
   - 8 etapas em linguagem simples (motivo, alimentação, saúde, restrições, estilo de vida, contexto, peso e altura) e uma revisão final;
   - salva sozinha no servidor (pode parar e continuar depois);
   - nos temas sensíveis tem a opção "Prefiro não responder";
   - ao enviar, a resposta **congela**.
4. Na ficha, o status muda: Não enviada → Enviada → Iniciada → Concluída (ou Expirada / Revogada).
5. A nutricionista pode **Ver resposta** e **Levar para a anamnese do atendimento**. Isso cria um **rascunho** da anamnese V2 marcado como origem **"relato da paciente"**, que ela revisa antes de salvar.

**Segurança:**
- **Link:** 32 bytes aleatórios. O banco guarda **só o hash SHA-256**, então ninguém, nem a nutricionista, consegue ler o código guardado. O link mostra o código só na hora de gerar.
- **Validade:** 7 dias. Gerar um novo link revoga o anterior, e a nutricionista também pode revogar.
- **O que a página pública faz:** só as 3 funções de abrir, salvar e enviar, e só com o token. Não lê nada além daquele convite e não mostra nenhum ID.
- **Identidade da nutricionista:** nome, registro, cores e logo em miniatura são copiados no convite. A página pública não acessa os arquivos dela.
- **Conta não liberada** não gera link (mesma trava das outras tabelas). **Paciente arquivado** não recebe link.
- **No servidor**, o conteúdo é filtrado: só os blocos permitidos, e da parte objetiva só peso e altura informados pela paciente.
- **O relato da paciente nunca vira** diagnóstico, nota, sistema, conduta nem entra no Resultado.

**Banco:**
- Tabela `anamnesis_invites`.
- Funções da nutricionista: `criar_convite_anamnese`, `revogar_convite_anamnese`, `marcar_convite_anamnese_usado`.
- Funções públicas: `anamnese_publica_abrir/salvar/enviar`.
- Migration `20261014100000`, aplicada em 5 partes (`supabase/ANAMNESE-PRE-CONSULTA-PARTE1..5.sql`) e conferida.

**Arquivos:** `anamnese.html`, `anamnese-publica.js`, `anamnese-convite.js` (novos), `anamnese-v2.js`, `anamnese.js`.
**Proteção extra:** se o banco não tiver a tabela, o cartão simplesmente não aparece (sem mensagem de erro).
**Testes:** `testes/testar-anamnese-pre-consulta.mjs` (34) + harness SQL AP00–AP17.
**Documento:** `docs/v1/ANAMNESE-PRE-CONSULTA.md`.

---

## 3. Janelas de boas-vindas (no ar)

**Arquivo novo:** `boas-vindas.js`. Todas as janelas têm a logo e o visual verde e dourado, com o passo a passo **① Faça seu registro → ② Complete seu perfil → ③ A equipe libera seu acesso completo**.

1. **Cadastro** (holohacking.com.br/cadastro ou "Criar conta"):
   - "Seja bem-vindo(a), nutricionista, ao HoloHacking";
   - botão "Fazer meu registro →", que leva ao formulário;
   - aparece **toda vez** que o cadastro abre.
2. **Primeiro acesso** (conta aguardando liberação):
   - "Olá, {nome}! Que bom ter você aqui. Agora o próximo passo é completar o seu perfil profissional";
   - lista do que falta (Foto, CRN, Logo, Assinatura, Carimbo, Contato);
   - "Completar meu perfil →" leva ao primeiro item que falta.
3. **Conta liberada** (primeira entrada depois da aprovação):
   - "Olá, {nome}! Seja bem-vindo(a), nutri HoloHacking";
   - atalhos: cadastrar a primeira paciente, ver o perfil, ajuda.

**Comportamento:**
- As janelas 2 e 3 aparecem **só no primeiro acesso**. O "já vi" fica na própria conta (metadados do login), então vale em qualquer aparelho.
- A janela 3 só aparece para contas liberadas nos últimos 30 dias: as contas antigas não veem.
- Fecham por botão, X, Esc ou clique fora. No celular cabem na tela, sem rolagem lateral.

**Teste:** `testes/testar-boas-vindas.mjs` (24). **Capturas:** `docs/v1/boas-vindas/`.

---

## 4. Conta pendente = somente Perfil (aplicado e no ar desde cd9e23f/dbac2db)

**Comportamento por status da conta:**
- **Conta recém-cadastrada (pendente):**
  - entra no app só com **Perfil** e **Sair**;
  - vê o aviso "Seu cadastro profissional está sendo preparado…", o checklist (Foto, CRN, Logo, Assinatura, Carimbo, Contato) e o botão "Verificar acesso novamente";
  - cada item do checklist leva direto ao campo (rola e foca).
- **Recusada:** vê só "Acesso não liberado".
- **Ativa:** tudo normal.

**Trava real no servidor:** uma conta não ativa não grava nada clínico em 33 tabelas, incluindo a nova dos convites.
**Correções do Perfil:**
- leitura com falha não vira formulário vazio;
- salva só os campos alterados, com controle de conflito;
- a troca de imagem sobe a nova antes de apagar a antiga;
- senha mínima de 8 caracteres;
- "Manter conectado" removido.

**Liberação das contas:** Configurações → Contas (administradora aprova ou recusa).

---

## 5. Perguntas respondidas hoje

### O banco aguenta 100 nutricionistas ao mesmo tempo?
**Sim.** Plano Pro, servidor do banco no tamanho básico, 60 conexões diretas, banco com 17 MB.
- O app não abre uma conexão por pessoa: o Supabase reaproveita poucas conexões entre todos.
- O app não usa atualização ao vivo nem fica consultando o banco em ciclo.

**Pontos de atenção:**
1. **Limite de cadastros e logins vindos do mesmo IP** (por exemplo, todas no mesmo Wi-Fi de um evento): se precisar, aumentar em Authentication → Rate Limits.
2. **E-mail sem SMTP próprio:** "Esqueci minha senha" não funciona em volume. É pendência antiga: configurar o SMTP.
3. **Aprovação das contas é manual**, uma a uma, em Configurações → Contas.

### PagTrust dentro do sistema (pagamentos e assinaturas)
**É possível, do mesmo jeito que se integra Hotmart ou Kiwify.**
- O checkout continua na PagTrust: não trazer cartão para dentro do app, porque exigiria certificação PCI.
- A PagTrust tem **webhooks** (painel: Integrações → Webhooks).
- O HoloHacking receberia os eventos numa função do Supabase, gravaria numa tabela `assinaturas` e **liberaria ou bloquearia a conta automaticamente**, reaproveitando a trava de conta ativa.
- Telas: "Minha assinatura" para a nutricionista e um painel de pagamentos para a administradora.

**Falta confirmar com a PagTrust (sem documentação pública):**
- se há assinatura recorrente e quais são os eventos (renovação, atraso, cancelamento, reembolso);
- se o webhook manda token ou assinatura para validar a origem;
- um exemplo real da mensagem de "compra aprovada".

**Alternativa**, se a PagTrust não tiver recorrência confiável: Asaas, Pagar.me ou PagBank.
**Nada foi implementado.**

---

## 6. Pendências em aberto

- **Metodológicas (Rodrigo/Daniel):** PM-01 a PM-05 (ver item 1).
- **Supabase:**
  - SMTP próprio (recuperação de senha em volume);
  - limite de cadastro e login por IP, se for haver muitas pessoas na mesma rede.
- **PagTrust:** respostas da PagTrust (ver item 5) antes de construir.
- **Produto:** registrar a emissão do PDF da página Resultado (hoje mistura snapshot e dados atuais).
- **VPS (limpeza opcional):** container parado `holohacking-web-c22a27d-falhou` pode ser apagado. **Manter** `holohacking-web-antes-c22a27d` (é a cópia para voltar de versão).

## 7. Referências técnicas

| Item | Valor |
|---|---|
| Commit em produção | `c22a27d` |
| Commits do dia | `5ef7f5f` (resultado + pré-anamnese), `6f556d7` (docs, capturas, cor do cartão), `7843911` (boas-vindas), `c22a27d` (cartão some sem SQL), `90f7281` (roteiro de deploy), `d22befd` (registro do SQL aplicado) |
| Deploy | `scripts/deploy-etapa6-5b.sh` (passo 1 temporário 8082; `swap` troca e confere 69/69). Para voltar: `docker stop holohacking-web && docker rename holohacking-web holohacking-web-c22a27d-falhou && docker rename holohacking-web-antes-c22a27d holohacking-web && docker start holohacking-web` (só em emergência) |
| Testes | suíte completa verde: 131 arquivos, 3.989 verificações, 0 falhas |
| Decisões | `docs/v1/DECISOES-V1.md` itens 177 (conta pendente), 178 (resultado + pré-anamnese), 179 (boas-vindas) |
| Estado de release | `RELEASE-STATE.md` |
