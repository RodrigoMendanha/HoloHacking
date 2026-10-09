-- =====================================================================
-- ANAMNESE PRE-CONSULTA POR LINK (09/10) — PARTE 2 de 5 — rodar INTEIRA no SQL Editor (uma transacao).
-- Gatilhos (resposta enviada imutavel; conta nao liberada nao gera link) e RLS (so leitura dos proprios convites, sem o hash).
-- Rode as partes NA ORDEM (1 a 5). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema ("if not exists" / "create or replace" / "drop ... if exists").
-- SOMENTE ADITIVA: tabela e funcoes novas. Nao altera anamneses, HOLOSCAN, ferramentas, Resultado HOLOS nem metodologia.
-- Conteudo identico a supabase/migrations/20261014100000_anamnese_pre_consulta.sql (dividido so para caber no editor).
-- A ULTIMA LINHA ANTES DA CONFERENCIA E "commit;". Se o editor cortar o texto, nao rode.
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regclass('public.anamnesis_invites') is null then raise exception 'rode a PARTE 1 antes (nada foi aplicado)'; end if;
end $$;
-- resposta enviada e convite concluido/revogado nao mudam (so a marcacao "levado para a anamnese")
create or replace function public.proteger_convite_anamnese()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'convite de anamnese nao e apagado: revogue' using errcode = 'P0001', hint = 'convite_imutavel';
  end if;
  if new.nutritionist_id is distinct from old.nutritionist_id or new.patient_id is distinct from old.patient_id
     or new.token_hash is distinct from old.token_hash or new.created_at is distinct from old.created_at
     or new.professional_snapshot is distinct from old.professional_snapshot then
    raise exception 'convite nao muda de dona, paciente ou token' using errcode = 'P0001', hint = 'convite_imutavel';
  end if;
  if old.status = 'concluido' and (new.submitted_content is distinct from old.submitted_content or new.submitted_at is distinct from old.submitted_at
     or new.status is distinct from old.status or new.draft_content is distinct from old.draft_content) then
    raise exception 'resposta enviada pela paciente e imutavel' using errcode = 'P0001', hint = 'convite_concluido';
  end if;
  if old.status = 'revogado' and (new.status is distinct from old.status or new.draft_content is distinct from old.draft_content
     or new.submitted_content is distinct from old.submitted_content) then
    raise exception 'convite revogado nao volta' using errcode = 'P0001', hint = 'convite_revogado';
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_convite_anamnese() from public, anon, authenticated;
drop trigger if exists anamnesis_invites_proteger on public.anamnesis_invites;
create trigger anamnesis_invites_proteger before update or delete on public.anamnesis_invites
  for each row execute function public.proteger_convite_anamnese();

-- conta nao liberada nao gera convite (mesma trava das outras tabelas clinicas, 20261013100000)
do $$ begin
  if to_regprocedure('public.exigir_conta_ativa()') is not null then
    drop trigger if exists exigir_conta_ativa on public.anamnesis_invites;
    create trigger exigir_conta_ativa before insert or update or delete on public.anamnesis_invites
      for each statement execute function public.exigir_conta_ativa();
  end if;
end $$;

-- RLS: a nutricionista le os PROPRIOS convites (sem o hash); escrita so por RPC
alter table public.anamnesis_invites enable row level security;
revoke all on public.anamnesis_invites from public, anon, authenticated;
grant select (id, nutritionist_id, patient_id, encounter_id, status, form_version, form_tipo, expires_at, draft_content, submitted_content,
              save_count, professional_snapshot, imported_anamnesis_id, imported_at, created_at, started_at, last_saved_at, submitted_at, revoked_at)
  on public.anamnesis_invites to authenticated;
drop policy if exists anamnesis_invites_select_proprios on public.anamnesis_invites;
create policy anamnesis_invites_select_proprios on public.anamnesis_invites for select to authenticated
  using (nutritionist_id = (select auth.uid()));
commit;

select 'RLS ligada' as item, (select relrowsecurity::text from pg_class where oid = 'public.anamnesis_invites'::regclass) as valor
union all select 'gatilhos (imutavel + conta ativa)', (select count(*)::text from pg_trigger where tgrelid = 'public.anamnesis_invites'::regclass and not tgisinternal)
union all select 'anon le a tabela (deve ser false)', has_table_privilege('anon', 'public.anamnesis_invites', 'select')::text;
