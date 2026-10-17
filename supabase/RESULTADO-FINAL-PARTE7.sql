-- RESULTADO FINAL HOLOS (10/10) — PARTE 7 de 7: convite de pre-anamnese sai junto na exclusao da paciente + registro da migration
-- Rodar INTEIRA e NA ORDEM. Erro = nada aplicado; rode a MESMA parte de novo. Pode repetir sem problema. SOMENTE ADITIVA.
-- Identico a supabase/migrations/20261015100000_resultado_final_holos.sql. A ultima linha antes da conferencia e "commit;".
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $$ begin
  if to_regprocedure('public.emitir_resultado_final(jsonb)') is null then raise exception 'rode a PARTE 6 antes (nada foi aplicado)'; end if;
end $$;
-- ----------------------------------------------------------------------------
-- 3. Convite de pre-anamnese: apagado na cascata da exclusao da paciente (antes travava a exclusao)
-- ----------------------------------------------------------------------------
create or replace function public.proteger_convite_anamnese()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    -- pg_trigger_depth() > 1: a exclusao vem da cascata da paciente (FK on delete cascade): permitida
    if pg_trigger_depth() > 1 then return old; end if;
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
insert into supabase_migrations.schema_migrations (version, name)
values ('20261015100000', 'resultado_final_holos')
on conflict (version) do nothing;
commit;
select 'migration registrada' as item, (select count(*)::text from supabase_migrations.schema_migrations where version = '20261015100000') as valor
union all select 'emissoes existentes', (select count(*)::text from public.holos_result_emissions)
union all select 'catalogo Sistema -> Ferramenta (30 regras)', (select count(*)::text from public.holos_recommendation_rules where catalog_code = 'HOLOS-RECOMENDACOES-V1')
union all select 'resultados salvos com template 1 (antigos, intactos)', (select count(*)::text from public.holos_results where status <> 'rascunho' and template_version = 1);
