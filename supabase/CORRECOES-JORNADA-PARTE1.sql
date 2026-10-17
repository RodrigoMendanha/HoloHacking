-- CORRECOES DA JORNADA (12/10) — PARTE 1 de 2: funcao interna dos Proximos Passos pendentes
-- Rodar INTEIRA e NA ORDEM. Erro = nada aplicado; rode a MESMA parte de novo. Pode repetir sem problema. SOMENTE ADITIVA
-- (nao muda tabela, HOLOSCAN, catalogo nem Resultado salvo). Identico a supabase/migrations/20261017100000_correcoes_jornada.sql.
-- A ultima linha antes da conferencia e "commit;".
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $$
declare f text[] := '{}';
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261015100000') then f := f || 'migration 20261015100000'; end if;
  if to_regclass('public.holos_next_steps') is null then f := f || 'holos_next_steps'; end if;
  if to_regprocedure('public.proximos_passos_escolher(uuid, text, text[], text[])') is null then f := f || 'proximos_passos_escolher()'; end if;
  if to_regprocedure('public.montar_resultado_holos(uuid, jsonb)') is null then f := f || 'montar_resultado_holos()'; end if;
  if array_length(f, 1) > 0 then raise exception 'banco fora do estado esperado (nada foi aplicado): %', array_to_string(f, ', '); end if;
end $$;
create or replace function public.proximos_passos_pendentes(p_uid uuid, p_app uuid, p_encontros uuid[])
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  reg record; v_pac uuid; sis_ids text[] := '{}'; concluidas text[] := '{}'; usadas text[];
  slots text[]; s text; escolha jsonb; selecao jsonb := '[]'::jsonb; n int := 0;
begin
  if p_uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  select x.* into reg from public.holos_next_steps x
    where x.holoscan_application_id = p_app and x.nutritionist_id = p_uid order by x.catalog_version desc, x.created_at desc limit 1;
  if not found then return null; end if;
  select a.patient_id into v_pac from public.holoscan_applications a where a.id = p_app and a.nutritionist_id = p_uid;
  select coalesce(array_agg(e.x->>'system_id' order by e.o), '{}') into sis_ids
    from jsonb_array_elements(reg.systems_order) with ordinality as e(x, o);
  select coalesce(array_agg(distinct t.ferramenta_id order by t.ferramenta_id), '{}') into concluidas from public.tool_applications t
    where t.nutritionist_id = p_uid and t.patient_id = v_pac and t.encounter_id = any(p_encontros) and t.status in ('concluida', 'revisada');
  usadas := concluidas;   -- concluida no atendimento nao volta como sugestao
  if array_length(sis_ids, 1) is not null then
    slots := case when array_length(sis_ids, 1) >= 2 then array[sis_ids[1], sis_ids[2], sis_ids[1]] else array[sis_ids[1], sis_ids[1], sis_ids[1]] end;
    foreach s in array slots loop
      escolha := public.proximos_passos_escolher(reg.catalog_id, s, usadas, concluidas);
      if escolha is not null then
        n := n + 1;
        usadas := usadas || (escolha->>'tool_id');
        selecao := selecao || (escolha || jsonb_build_object('papel', case when n = 1 then 'principal' else 'complementar' end, 'slot', n));
      end if;
    end loop;
  end if;
  return jsonb_build_object('concluidas_no_atendimento', to_jsonb(concluidas), 'selection', selecao,
    'todas_realizadas', (n = 0 and array_length(sis_ids, 1) is not null));
end;
$$;
revoke all on function public.proximos_passos_pendentes(uuid, uuid, uuid[]) from public, anon, authenticated;
commit;
select 'funcao proximos_passos_pendentes criada' as item, (to_regprocedure('public.proximos_passos_pendentes(uuid, uuid, uuid[])') is not null)::text as valor
union all select 'logado executa direto (deve ser false)', has_function_privilege('authenticated', 'public.proximos_passos_pendentes(uuid, uuid, uuid[])', 'execute')::text
union all select 'anon executa (deve ser false)', has_function_privilege('anon', 'public.proximos_passos_pendentes(uuid, uuid, uuid[])', 'execute')::text;
