# Cadastro de nutricionistas — como ligar e como usar

## 1. Banco (uma vez, no SQL Editor)
1. Abra `supabase/CADASTRO-NUTRICIONISTAS.sql`.
2. Troque `SEU_EMAIL_DE_LOGIN` pelo e-mail com que **você** entra no HoloHacking.
3. Cole o arquivo inteiro no SQL Editor e clique em **Run**.
4. A conferência no fim deve mostrar:
   - **contas ativas** igual ao número de contas que já existiam;
   - **contas pendentes = 0**;
   - **administradoras = 1**;
   - **trava em pacientes = 2**;
   - **proteção do status = 1**.

Se o e-mail estiver errado, o SQL para com a mensagem "nenhuma administradora cadastrada" e **nada é aplicado**.

## 2. Painel do Supabase (Authentication)
- **Sign In / Providers → Email:**
  - **Allow new users to sign up**: ligado.
  - **Confirm email**: **recomendado desligado** para o lançamento. O e-mail padrão do Supabase manda poucas mensagens por hora, e a sua liberação manual já controla quem entra.
  - Para ligar a confirmação, configure antes um SMTP próprio (Authentication → Emails → SMTP).
  - **Minimum password length**: 8.
- **URL Configuration:**
  - Site URL: `https://holohacking.com.br`.
  - Redirect URLs: `https://holohacking.com.br/*`.

## 3. No dia a dia
- **Link para mandar às nutricionistas:** `https://holohacking.com.br/cadastro`.
- **A nutri:**
  1. Preenche nome, e-mail, telefone e senha.
  2. Vê "Seu cadastro está em análise".
  3. Enquanto não é liberada, o app não abre e o servidor não deixa criar paciente.
- **Você:**
  1. Entre em **Configurações → Contas**; o número ao lado do menu é a quantidade de cadastros pendentes.
  2. Clique em **Liberar acesso** ou **Recusar** (com confirmação).
  3. O botão **WhatsApp** abre a conversa para você avisar a nutri.
  4. Ela entra com o e-mail e a senha que cadastrou; se estiver na tela de análise, basta clicar em **Verificar de novo**.
- **Recusou por engano?** Em "Decididos recentemente", use **Liberar**.

## 4. Outras administradoras
No SQL Editor, troque `EMAIL` pelo e-mail dela e rode:

```sql
insert into public.administradores (user_id)
select id from auth.users where lower(email) = lower('EMAIL')
on conflict do nothing;
```
