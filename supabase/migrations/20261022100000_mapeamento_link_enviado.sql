-- =====================================================================
-- MAPEAMENTO HOLISTICO — estado "LINK ENVIADO" (Plano mestre, Fase 1, 13/10)
-- =====================================================================
-- Aditiva. Hoje o convite nasce com status 'enviado' no momento em que o LINK E GERADO, mas a nutricionista
-- pode nao ter mandado o link ainda. A tela passa a mostrar:
--   NAO ENVIADO -> LINK GERADO -> LINK ENVIADO -> MAPEAMENTO RECEBIDO -> REVISADO
-- "Link enviado" precisa de registro no banco (outro aparelho / outra aba ve o mesmo estado): duas colunas
-- novas e uma RPC que so MARCA o envio (copiar o link ou abrir o WhatsApp). Nada muda no status do convite,
-- na resposta da paciente, nas RPCs publicas nem no historico. Convites antigos ficam com sent_at nulo
-- ("Link gerado" se ainda abertos; os ja respondidos continuam "Mapeamento recebido").
begin;

alter table public.anamnesis_invites add column if not exists sent_at timestamptz;
alter table public.anamnesis_invites add column if not exists sent_via text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'anamnesis_invites_sent_via_valido') then
    alter table public.anamnesis_invites add constraint anamnesis_invites_sent_via_valido
      check (sent_via is null or sent_via in ('whatsapp', 'copiado'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'anamnesis_invites_sent_coerente') then
    alter table public.anamnesis_invites add constraint anamnesis_invites_sent_coerente
      check ((sent_at is null) = (sent_via is null));
  end if;
end $$;
comment on column public.anamnesis_invites.sent_at is 'Quando a nutricionista copiou o link ou abriu o WhatsApp com ele pela primeira vez (so marcacao; nao muda o status).';
comment on column public.anamnesis_invites.sent_via is 'Como o link saiu pela primeira vez: whatsapp | copiado.';

grant select (sent_at, sent_via) on public.anamnesis_invites to authenticated;

-- marca o primeiro envio do link (idempotente: o segundo clique nao muda nada)
create or replace function public.marcar_convite_anamnese_enviado(p_id uuid, p_via text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c public.anamnesis_invites;
begin
  if uid is null then raise exception 'sem sessao' using errcode = '42501'; end if;
  if p_via is null or p_via not in ('whatsapp', 'copiado') then
    raise exception 'meio de envio invalido' using errcode = '22023', hint = 'via_invalida';
  end if;
  select * into c from public.anamnesis_invites where id = p_id and nutritionist_id = uid;
  if c.id is null then raise exception 'convite nao encontrado' using errcode = 'P0002', hint = 'convite_invalido'; end if;
  if c.status not in ('enviado', 'iniciado') or c.expires_at < now() then
    raise exception 'link nao esta aberto' using errcode = 'P0001', hint = 'convite_fechado';
  end if;
  if c.sent_at is null then
    update public.anamnesis_invites set sent_at = now(), sent_via = p_via where id = c.id returning * into c;
  end if;
  return jsonb_build_object('id', c.id, 'sent_at', c.sent_at, 'sent_via', c.sent_via);
end;
$$;
revoke all on function public.marcar_convite_anamnese_enviado(uuid, text) from public, anon, authenticated;
grant execute on function public.marcar_convite_anamnese_enviado(uuid, text) to authenticated;

commit;
