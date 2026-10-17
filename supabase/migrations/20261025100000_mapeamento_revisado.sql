-- =====================================================================
-- MAPEAMENTO HOLISTICO — "REVISADO" pela nutricionista (14/10)
-- =====================================================================
-- Aditiva. Hoje a etapa "Revisado" so aparece quando a resposta foi levada para o atendimento e a
-- anamnese desse atendimento foi concluida. A nutricionista pediu um botao para confirmar, direto na
-- aba, que leu o Mapeamento recebido. Uma coluna nova e uma RPC que so MARCA a revisao (idempotente).
-- Nada muda na resposta da paciente, no status do convite, nas RPCs publicas nem no historico.
begin;

alter table public.anamnesis_invites add column if not exists reviewed_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'anamnesis_invites_reviewed_coerente') then
    alter table public.anamnesis_invites add constraint anamnesis_invites_reviewed_coerente
      check (reviewed_at is null or status = 'concluido');
  end if;
end $$;
comment on column public.anamnesis_invites.reviewed_at is 'Quando a nutricionista marcou o Mapeamento recebido como revisado (so marcacao; nao muda a resposta).';

grant select (reviewed_at) on public.anamnesis_invites to authenticated;

create or replace function public.marcar_convite_anamnese_revisado(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c public.anamnesis_invites;
begin
  if uid is null then raise exception 'sem sessao' using errcode = '42501'; end if;
  select * into c from public.anamnesis_invites where id = p_id and nutritionist_id = uid;
  if c.id is null then raise exception 'convite nao encontrado' using errcode = 'P0002', hint = 'convite_invalido'; end if;
  if c.status <> 'concluido' then
    raise exception 'o paciente ainda nao enviou' using errcode = 'P0001', hint = 'convite_nao_recebido';
  end if;
  if c.reviewed_at is null then
    update public.anamnesis_invites set reviewed_at = now() where id = c.id returning * into c;
  end if;
  return jsonb_build_object('id', c.id, 'reviewed_at', c.reviewed_at);
end;
$$;
revoke all on function public.marcar_convite_anamnese_revisado(uuid) from public, anon, authenticated;
grant execute on function public.marcar_convite_anamnese_revisado(uuid) to authenticated;

commit;
