# "Esqueci minha senha": e-mail que chega de verdade

## Por que é preciso
O servidor de e-mail que vem com o Supabase é só para testes:
- **só entrega para os e-mails da equipe do projeto** no Supabase;
- tem limite de poucos e-mails por hora.

Para as nutricionistas, o e-mail de recuperação **não chega**. A solução é configurar um **SMTP próprio**.

## Opção recomendada: Resend (grátis até 3.000 e-mails/mês)
1. Crie a conta em resend.com.
2. Em **Domains → Add domain**, use `holohacking.com.br`. O Resend mostra 3 ou 4 registros DNS (TXT/MX). Cadastre-os no painel onde o domínio está (Hostinger ou outro) e espere ficar "Verified" (de minutos a algumas horas).
3. Em **API Keys → Create API key** (permissão "Sending access"), copie a chave. **Não cole a chave no chat nem em arquivo do projeto**; ela vai direto no painel do Supabase.
4. No Supabase, abra **Authentication → Emails → SMTP Settings → Enable custom SMTP** e preencha:

   | Campo | Valor |
   |---|---|
   | Sender email | `nao-responda@holohacking.com.br` |
   | Sender name | `HoloHacking` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | a chave da API (passo 3) |

   Salve.
5. Em **Authentication → Rate Limits**, suba o limite de e-mails por hora (por exemplo, 30).

Alternativas: Brevo (300 e-mails/dia grátis) ou o SMTP do provedor de e-mail do domínio. Os campos são os mesmos; mudam host, porta, usuário e senha.

## Texto do e-mail em português
Em **Authentication → Emails → Templates → Reset Password**:

**Subject:** `HoloHacking — criar nova senha`

**Body:**
```html
<h2>Criar nova senha</h2>
<p>Recebemos um pedido para criar uma nova senha na sua conta do HoloHacking.</p>
<p><a href="{{ .ConfirmationURL }}">Clique aqui para criar a nova senha</a></p>
<p>O link vale por 1 hora e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: sua senha continua a mesma.</p>
<p>Equipe HoloHacking</p>
```

## Teste
1. No site, clique em **Esqueci minha senha** e informe o e-mail de uma conta (pode ser a sua).
2. O e-mail deve chegar em até alguns minutos; confira também o spam.
3. Clique no link. O site abre na tela **Criar nova senha**: o app não entra direto.
4. Crie a senha nova (mínimo 8 caracteres). O app abre.

Se o link estiver vencido ou já tiver sido usado, o site volta ao login e pede um link novo.
