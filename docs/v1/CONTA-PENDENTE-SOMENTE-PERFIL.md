# Conta pendente = somente Perfil + correções do Perfil (09/10)

Decisão: `DECISOES-V1.md` item 177. Feito depois da auditoria read-only do cadastro, login, senha e Perfil.
**Situação: pronto localmente. Não aplicado no banco real, sem deploy.**

## 1. Bugs corrigidos (Fase 1)

| # | Antes | Agora | Onde |
|---|---|---|---|
| 1 | Leitura do Perfil que falhava mostrava formulário vazio; "Salvar" apagava registro, cidade etc. no servidor | Estado de erro com "Tentar novamente"; sem formulário, sem Salvar, sem enviar/remover imagem até carregar de verdade; a cópia local não é sobrescrita | `perfil.js` (`carregarSupa`, `bloqueado`, `painelErroCarga`) |
| 2 | Trocar foto/logo/assinatura/carimbo apagava o arquivo antigo antes de subir o novo | Sobe o novo → registra → só então apaga o antigo. Upload que falha: antiga intacta. Registro que falha: o arquivo novo é retirado (sem órfão) | `perfil.js` (`guardarImagemSupa`) |
| 3 | Salvar mandava o formulário inteiro: a última sessão apagava o que a outra tinha salvo | Salva **só os campos alterados**, com controle otimista por `updated_at`. Outro dispositivo salvou no meio: campos diferentes se somam; o **mesmo** campo vira conflito explícito ("…alterado em outro dispositivo… nada foi salvo"), e a tela passa a mostrar o servidor | `perfil.js` (`gravarSupa`) |
| 4 | Perfil → Alterar senha aceitava 6 | 8 em cadastro, nova senha e Perfil. Mensagens dizem só a regra real (tamanho) | `perfil.js`, `login.js` |
| 5 | Erro de servidor no cadastro dizia "Não foi possível **entrar**"; senha fraca falava em "misturando letras e números" | "Não foi possível concluir o cadastro…"; "A senha… precisa ter pelo menos 8 caracteres" | `login.js` |
| 6 | Chave "Documentos" em Preferências sem efeito | Removida (o valor antigo em `profiles.modulos` é ignorado) | `perfil.js` |
| 7 | "Manter conectado" não fazia nada | **Removido** (fazer funcionar exigiria trocar o armazenamento da sessão do supabase-js; a sessão continua lembrada, como sempre foi) | `index.html`, `login.js`, `style.css` |
| 8 | Conta sem linha em `profiles`: "Salvar" não gravava nada e dizia "salvo" | Cria a linha | `perfil.js` |
| 9 | (achado durante a implementação) Se a resposta do login chegasse antes do evento de sessão, o app abria **sem checar o status da conta** | A sessão da resposta é usada na hora; sem sessão o app só abre pelo atalho de desenvolvimento (localhost) | `login.js` |

## 2. Fluxo novo da conta pendente (Fase 2)

Nenhum status novo: `profiles.status` (`pendente | ativo | recusado`) e a liberação em Configurações → Contas.

1. Cadastro (`/cadastro`) → o gatilho do banco cria o perfil **pendente**.
2. Login → `minha_conta_status()` → **pendente** → o app abre só com **Perfil** (e Sair da conta).
3. No topo do Perfil, o aviso com o texto definido em `perfil.js` (`TEXTO_CONTA_PENDENTE`). Mudar o texto é editar essas duas linhas. Sem data no código.
4. Checklist em destaque, sem bloquear o salvar: Foto, CRN, Logo, Assinatura, Carimbo, Contato. Cada item que falta é um link para a aba certa.
5. Abas: Perfil, Marca, Conta. Preferências (módulos do menu clínico) fica escondida.
6. Sair e voltar: continua pendente, com tudo salvo no servidor.
7. A administradora libera (**pendente → ativo**). O app completo abre em qualquer um destes casos, sem novo cadastro e sem nova senha, e nada do Perfil se perde:
   - ao recarregar a página;
   - no próximo login;
   - em "Verificar acesso novamente", que recarrega sozinho.

## 3. Conta recusada

- **Login:** permitido, mas mostra só "Acesso não liberado", com "Verificar de novo" (a equipe pode liberar depois) e "Sair desta conta".
- **O app não abre.**
- **No servidor:** não edita o perfil, não envia imagem e não grava nada clínico. Continua lendo o que já é dela.

## 4. Bloqueios no front

- `body.conta-pendente` (CSS): esconde todo item do menu menos Perfil, busca global, barra de paciente, todas as seções menos Perfil, telas de ferramenta e a aba Preferências.
- `irParaSecao` (`app.js`): para conta pendente, qualquer destino que não seja `perfil` vira `perfil`. Isso vale para menu, atalho, botão, chamada direta e endereço com `#pacientes`.
- `window.ContaAcesso` (`login.js`): `status()`, `restrito()`, `verificar()`.
- **O front não é a proteção.** Quem impede de gravar é o servidor.

## 5. Bloqueios no servidor (Fase 3) — migration `20261013100000_conta_pendente_somente_perfil.sql`

**Auditoria do que uma conta não ativa ainda conseguia gravar** (banco real, só leitura):
- **Antes:** tudo que tem `nutritionist_id`, menos `patients` (insert/update). Por exemplo agenda (`schedule_blocks`), consultas, HOLOS AI (`ai_threads`/`ai_messages`), metodologia (`methodology_*`), relatórios e ferramentas. E também pelas RPCs SECURITY DEFINER (que passam por cima da RLS) para quem já tivesse paciente.
- **Agora:**
  - **Gatilho de comando** `exigir_conta_ativa` (`before insert or update or delete … for each statement`):
    - Está em **todas as 32 tabelas** de dado da nutricionista (27 com `nutritionist_id`, menos `professional_assets`; mais as 5 filhas `ai_messages`, `holoscan_answers`, `holoscan_system_scores`, `lab_results`, `lab_result_components`).
    - Dispara também dentro das RPCs, então uma trava cobre a API e as RPCs.
    - Só vale com usuário logado (`auth.uid()`). Migrations, painel e service_role não são afetados.
    - Erro: `42501`, hint `conta_nao_liberada`.
  - **Recusada:** políticas RESTRICTIVE em `profiles` (insert/update) e `professional_assets` (insert/update/delete) via `conta_pode_editar_perfil()`.
  - **Storage (RESTRICTIVE):**
    - `patient-documents` exige conta ativa;
    - `professional-assets` recusa conta recusada.
- **O que a pendente pode gravar:** só o próprio `profiles` (sem mudar o status, que já era protegido pelo gatilho `proteger_status_conta`), as próprias `professional_assets`, a própria pasta em `professional-assets`, e as ações de conta/senha do Supabase Auth.

**Banco real (só leitura, 09/10):**
- as mesmas 32 tabelas;
- 4 contas, todas `ativo`: **ninguém muda de comportamento ao aplicar**;
- 0 contas sem perfil.

## 6. Migrations e artefato SQL

- `supabase/migrations/20261013100000_conta_pendente_somente_perfil.sql` (não destrutiva).
- Para o SQL Editor: `supabase/CONTA-PENDENTE-PARTE1.sql` (funções e gatilhos) e `supabase/CONTA-PENDENTE-PARTE2.sql` (políticas e registro da migration).
  - Cada parte tem um pré-check que recusa se o banco estiver fora do estado esperado, inclusive se houver conta sem perfil.
  - Cada parte termina com uma conferência.
  - Rodar na ordem. A última linha antes da conferência é `commit;`.

## 7. RLS / políticas novas

`profiles_recusada_nao_grava_ins/_upd`, `professional_assets_recusada_ins/_upd/_del`, `storage_conta_liberada_ins/_upd/_del` (todas RESTRICTIVE, `to authenticated`).

## 8. Testes

- **`supabase/tests/conta-pendente-harness.sql`** (CP00–CP13, Postgres local, dentro de `scripts/validar-cadeia-local.sh`):
  - trava nas 32 tabelas;
  - a pendente lê e edita só o próprio perfil e imagens, e não muda o status;
  - não vê nada de outra conta;
  - não cria paciente, agenda nem documento;
  - insert/update/delete recusados em todas as tabelas;
  - a conta que voltou a pendente não usa RPC clínica (`salvar_holoscan_completo`);
  - a recusada não edita nada;
  - a conta ativa continua gravando tudo;
  - a liberação preserva o perfil;
  - sem `auth.uid()` a trava não se aplica.
  - As partes 1 e 2 do artefato também foram provadas no lugar da migration, com o mesmo resultado.
- **`testes/testar-perfil-robustez.mjs`**: Fase 1 (erro de leitura, troca de imagem nos 4 tipos, órfão, concorrência, senha, Documentos, Manter conectado, mensagens, conta sem linha).
- **`testes/testar-conta-pendente.mjs`**: E2E e segurança (abaixo).
- **Ajustados:** `testar-cadastro.mjs` (pendente agora abre o Perfil) e `testar-login.mjs` (sem "Manter conectado").
- **`testes/supabase-falso.mjs`:** as mesmas regras da migration (tabelas travadas, RPCs que gravam, recusada, Storage) e `updated_at` em `profiles`.

## 9. E2E (`testar-conta-pendente.mjs`)

Os passos, todos verificados no servidor de teste:
1. cadastro → pendente;
2. o app abre no Perfil (menu só Perfil e Sair);
3. aviso e checklist;
4. preenche o perfil e envia foto, logo, assinatura e carimbo;
5. cores;
6. sai e entra (tudo permanece);
7. celular, como outro dispositivo (tudo permanece, sem rolagem lateral);
8. as 10 seções clínicas, o clique em menu escondido e `#pacientes` caem no Perfil;
9. API direta: lê e edita o próprio perfil, não muda o status, não vê outra conta, e 16 gravações clínicas são recusadas com `conta_nao_liberada`;
10. a administradora libera, a página recarrega e o sistema completo abre: cria paciente, com o perfil e as 4 imagens preservados;
11. a outra sessão aberta libera por "Verificar acesso novamente";
12. a recusada vê "Acesso não liberado" e não edita nada.

## 10. Riscos restantes

- **O e-mail de recuperação de senha depende do SMTP próprio**, ainda pendente (checklist abaixo).
- **O cadastro continua aberto a qualquer pessoa, sem captcha.** A conta fica pendente e só grava o próprio perfil e até 4 imagens. O limite de criação de contas é o padrão do Supabase.
- **O bucket `professional-assets` ainda aceita SVG no servidor.** A tela recusa. O risco é baixo, porque é privado e só a dona lê.
- **Uma conta ativa que for recusada depois** perde a escrita clínica, mas continua lendo os próprios dados. É o comportamento desejado; registrado aqui.
- **O conflito de Perfil é detectado por `updated_at`.** Duas gravações no mesmo milissegundo não são distinguíveis, o que é irrelevante na prática.

## 11. Checklist do Supabase (você faz no painel; nada disso foi alterado)

1. **Authentication → Emails → SMTP Settings:** ligar o SMTP próprio, com remetente do domínio. Sem ele, "Esqueci minha senha" só chega a e-mails da equipe do projeto. Texto em português: `docs/v1/EMAIL-RECUPERAR-SENHA.md`.
2. **Authentication → URL Configuration:**
   - Site URL: `https://holohacking.com.br`.
   - Redirect URLs: `https://holohacking.com.br/*`.
3. **Authentication → Providers → Email (ou Sign In / Providers):** "Minimum password length" = **8**. Deixar "Confirm email" como está hoje (desligado), a não ser que decida o contrário.
4. **Teste real de recuperação:**
   - pedir "Esqueci minha senha" com um e-mail de teste que **não** seja da equipe;
   - conferir se o e-mail chega;
   - abrir o link e criar a senha nova;
   - entrar com ela;
   - pedir de novo e usar o link antigo, que deve dizer "expirou ou já foi usado".
5. **Depois do deploy:** cadastrar uma conta de teste e conferir que ela entra só no Perfil. Depois liberar e conferir o acesso completo.
