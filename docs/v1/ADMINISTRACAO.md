# Administração (10/10)

Página só da equipe HoloHacking, dentro do app: **Configurações → Administração**. Ela substitui a antiga seção
"Contas". Só aparece para contas que estão em `public.administradores`, e cada função do servidor recusa quem não
é administrador. Esconder a tela não é a proteção.

Nenhum dado de paciente aparece na página: só quantidades (pacientes, atendimentos, HOLOSCAN, Resultados).

## O que a página faz

| Aba | O que mostra / faz |
|---|---|
| **Visão geral** | Contas: total, aguardando, liberadas, recusadas, bloqueadas. Cadastros hoje, em 7 e em 30 dias. Quem entrou nos últimos 7 dias e quem nunca entrou. Uso somado (só números). Últimos cadastros. Link `holohacking.com.br/cadastro` com botão **Copiar link**. |
| **Cadastros** | **Quem está se cadastrando**: aguardando liberação (nome, e-mail, telefone, quando, e-mail confirmado), com **Liberar acesso**, **Recusar**, **WhatsApp** e **Ver conta**. Também os cadastros dos últimos 30 dias já decididos. Atualiza sozinha a cada 2 minutos e avisa "Novo cadastro: Fulana". |
| **Contas** | Todas as contas. Busca por nome, e-mail ou telefone. Filtros: liberadas, aguardando, recusadas, bloqueadas, nunca entraram, com senha provisória. **Gerenciar** abre o painel da conta, descrito abaixo. |
| **Histórico** | Tudo o que a administração fez: quem, em quem, quando, motivo e "de → para". O registro é **imutável** e o banco não aceita apagar nem alterar. |

O **painel da conta** traz:
- **Dados da conta**: situação, e-mail, telefone, data do cadastro, e-mail confirmado, último acesso, quem liberou e quando.
- **Perfil profissional**, com a porcentagem preenchida e quais imagens foram enviadas (foto, logo, assinatura, carimbo).
- **Uso** da conta, só em números.
- **Liberação**: liberar, recusar (com motivo) ou voltar para análise.
- **Dados**: corrigir nome e telefone.
- **Acesso**:
  - **Definir senha provisória**: o sistema gera uma senha de 12 caracteres, que aparece uma única vez, com botões Copiar e Enviar por WhatsApp. No próximo acesso, a nutricionista é obrigada a criar uma senha só dela.
  - **Enviar link de nova senha** por e-mail.
  - **Trocar e-mail**: a pessoa passa a entrar com o novo e-mail, e o e-mail de contato do perfil acompanha a troca.
  - **Bloquear** ou **desbloquear** o acesso: a pessoa bloqueada não entra e vê "Este acesso está bloqueado"; os dados dela continuam guardados.

### Regras

- Ninguém muda a própria conta por aqui. Para a própria conta vale o Perfil.
- Contas de administrador não são bloqueadas nem têm senha ou e-mail trocados por aqui.
- A senha provisória nunca vai para o registro, para o banco ou para o log. Senha, token e link são apagados do registro mesmo se alguém tentar gravá-los.
- Nada clínico muda. O harness prova que pacientes, atendimentos, HOLOSCAN e resultados ficam intactos.

## Peças

| Peça | Arquivo |
|---|---|
| Banco, aditivo | `supabase/migrations/20261016100000_administracao.sql`: `admin_audit_log` (imutável, fechada para a API) e as funções `admin_painel()`, `admin_definir_status()`, `admin_editar_perfil()`, `admin_historico()` e `admin_registrar_acao_servico()` (esta só para a service_role) |
| SQL para o SQL Editor | `supabase/ADMINISTRACAO-PARTE1..4.sql`: 45/86/73/64 linhas, cada uma com conferência antes e depois |
| Edge Function | `supabase/functions/admin-usuarios/`: `index.ts` + `nucleo.js` (a regra, testada) e `ARQUIVO-UNICO-PAINEL.ts`, a mesma coisa num arquivo só para colar no painel, gerado por `scripts/gerar-admin-usuarios-unico.mjs` |
| Tela | `contas.js` (reescrito), `index.html` (menu "Administração" e seção), `style.css` (`.ad-*`), `app.js` (título) |
| Troca obrigatória de senha | `login.js`: `user_metadata.precisa_trocar_senha` abre "Criar nova senha" antes do app; a troca limpa a marca. Login bloqueado mostra uma mensagem clara. |

**Compatibilidade.** Sem o SQL novo, a página cai no modo antigo e continua liberando e recusando. Sem a Edge
Function, os botões de Acesso dizem "ainda não está publicada" e nada muda. Então o deploy do site pode vir antes
ou depois do SQL.

## Provas (todas locais)

- **Banco** (`supabase/tests/administracao-harness.sql`, em `scripts/validar-cadeia-local.sh`): AD00–AD12, 18 ok. Cobrem:
  - recusa para conta comum e para anon;
  - tabela fechada para a API;
  - painel só com contagens, sem nome de paciente;
  - liberar, recusar e voltar para análise, com registro;
  - a própria conta bloqueada;
  - nome e telefone validados;
  - histórico ordenado;
  - registro imutável até para o dono do banco;
  - função de serviço só para a service_role, com ator administrador, removendo senha, token e link;
  - nada clínico alterado.

  Cadeia inteira: 422 ok.
- **SQL em partes**: as 4 partes aplicadas **duas vezes** seguidas, mais o harness, num Postgres local: tudo ok. Nas
  conferências, anon e conta logada sem acesso.
- **Edge Function** (`testes/testar-admin-usuarios.mjs`, 23 ok): só administrador, nunca a própria conta nem a de outro
  administrador, senha forte e nunca registrada, metadados preservados, e-mail validado e duplicado recusado, bloqueio,
  limite de e-mail, nenhuma chave no código e o arquivo único atualizado.
- **Tela** (`testes/testar-admin.mjs`, 34 ok): o fluxo completo no navegador, incluindo a nutricionista entrar com a
  senha provisória e ser obrigada a trocá-la, a conta bloqueada não entrar e o login com o e-mail novo funcionar.
  Capturas: `docs/v1/administracao/`.

## Como ativar (quando autorizado)

Nada disto foi aplicado. Ordem sugerida:

1. **SQL**: no SQL Editor, rodar `supabase/ADMINISTRACAO-PARTE1.sql` até a `PARTE4.sql`, nessa ordem, cada uma inteira. A última linha antes da conferência é `commit;`.
2. **Edge Function**: em Supabase → Edge Functions → Deploy a new function → Via Editor, use o nome `admin-usuarios`. Cole o conteúdo de `supabase/functions/admin-usuarios/ARQUIVO-UNICO-PAINEL.ts` e publique.
   - Pela linha de comando, o equivalente é `supabase functions deploy admin-usuarios`.
   - Deixe "Verify JWT" ligado, que é o padrão.
   - **Nenhum segredo precisa ser criado**: `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem em toda Edge Function do projeto.
   - `SITE_URL` é opcional; o padrão é `https://holohacking.com.br`.
3. **Site**: deploy do commit novo pelo roteiro de sempre (`scripts/deploy-etapa6-5b.sh`). São 70 arquivos, com os hashes no `docs/deploy.md` §3.5.

### Limites que continuam valendo

- O **link de nova senha** usa o e-mail padrão do Supabase, que tem limite baixo por hora. Se a pessoa não receber,
  use a **senha provisória** e mande por WhatsApp.
- O "último acesso" é o último **login** (`last_sign_in_at`). Quem continua com a sessão aberta não renova esse horário.
