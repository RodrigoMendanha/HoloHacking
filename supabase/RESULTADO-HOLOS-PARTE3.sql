-- =====================================================================
-- RESULTADO HOLOS — PARTE 3 de 3 — rodar INTEIRA no SQL Editor (uma transacao).
-- Cria rascunho/salvar/revisar/descartar, registra a migration e confere tudo.
-- Rode as partes NA ORDEM (1, 2, 3). Se uma parte der erro, nada dela e aplicado: corrija e rode de novo a MESMA parte.
-- Conteudo identico a supabase/migrations/20261009100000_resultado_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- PRE
do $$ begin
  if to_regprocedure('public.montar_resultado_holos(uuid, jsonb)') is null then raise exception 'rode a PARTE 2 antes (montar_resultado_holos nao existe)'; end if;
end $$;

-- ----------------------------------------------------------------------------
-- RASCUNHO: guarda selecao, textos e visibilidade. Valida tudo (mesmas regras do salvar).
-- ----------------------------------------------------------------------------
create or replace function public.salvar_rascunho_resultado_holos(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); v_id uuid; atual record; anterior record; v_op uuid; v_sup uuid; v_rev int := 1; m jsonb;
begin
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  m := public.montar_resultado_holos(uid, payload);   -- valida paciente, atendimento, HOLOSCAN e ferramentas
  begin v_op := nullif(payload->>'operation_id', '')::uuid; v_id := nullif(payload->>'id', '')::uuid; v_sup := nullif(payload->>'supersedes_id', '')::uuid;
  exception when others then raise exception 'identificador invalido' using errcode = '22023', hint = 'payload_invalido'; end;
  if v_op is not null then
    select h.id into v_id from public.holos_results h where h.nutritionist_id = uid and h.operation_id = v_op;
    if found then return v_id; end if;
  end if;
  if v_id is not null then
    select h.* into atual from public.holos_results h where h.id = v_id and h.nutritionist_id = uid for update;
    if not found then raise exception 'rascunho nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if atual.status <> 'rascunho' then raise exception 'resultado salvo e imutavel: crie uma nova versao' using errcode = 'P0001', hint = 'revisao_imutavel'; end if;
    if atual.patient_id <> (payload->>'patient_id')::uuid then raise exception 'rascunho de outro paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if payload ? 'expected_updated_at' and nullif(payload->>'expected_updated_at', '') is not null
       and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'o rascunho mudou em outra sessao' using errcode = 'P0001', hint = 'conflito';
    end if;
    update public.holos_results set encounter_id = (payload->>'encounter_id')::uuid,
      holoscan_application_id = (payload->>'holoscan_application_id')::uuid, selected_sources = public.resultado_holos_campos(payload),
      leitura_profissional = nullif(payload->>'leitura_profissional', ''), pontos_acompanhar = nullif(payload->>'pontos_acompanhar', ''),
      questoes_aprofundar = nullif(payload->>'questoes_aprofundar', '')
      where id = v_id;
    return v_id;
  end if;
  if v_sup is not null then
    select h.* into anterior from public.holos_results h where h.id = v_sup and h.nutritionist_id = uid and h.patient_id = (payload->>'patient_id')::uuid;
    if not found then raise exception 'versao anterior nao encontrada' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if anterior.status = 'rascunho' then raise exception 'so se cria nova versao a partir de resultado salvo' using errcode = 'P0001', hint = 'payload_invalido'; end if;
    if anterior.superseded_at is not null or exists (select 1 from public.holos_results h where h.supersedes_id = v_sup) then
      raise exception 'esta versao ja tem uma versao seguinte' using errcode = 'P0001', hint = 'conflito';
    end if;
    v_rev := anterior.revision_number + 1;
  end if;
  insert into public.holos_results (nutritionist_id, patient_id, encounter_id, status, revision_number, supersedes_id,
      holoscan_application_id, selected_sources, leitura_profissional, pontos_acompanhar, questoes_aprofundar, operation_id)
    values (uid, (payload->>'patient_id')::uuid, (payload->>'encounter_id')::uuid, 'rascunho', v_rev, v_sup,
      (payload->>'holoscan_application_id')::uuid, public.resultado_holos_campos(payload), nullif(payload->>'leitura_profissional', ''),
      nullif(payload->>'pontos_acompanhar', ''), nullif(payload->>'questoes_aprofundar', ''), v_op)
    returning id into v_id;
  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- SALVAR: grava o rascunho (com o que veio agora) e CONGELA: snapshot montado no servidor + sha256.
-- ----------------------------------------------------------------------------
create or replace function public.salvar_resultado_holos(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); v_id uuid; r record; m jsonb; conteudo jsonb; agora timestamptz := now(); h text; v_op uuid;
begin
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  begin v_op := nullif(payload->>'operation_id', '')::uuid; exception when others then
    raise exception 'identificador invalido' using errcode = '22023', hint = 'payload_invalido'; end;
  if v_op is not null then
    select h2.id into v_id from public.holos_results h2 where h2.nutritionist_id = uid and h2.operation_id = v_op and h2.status <> 'rascunho';
    if found then return v_id; end if;   -- clique duplo / repeticao: devolve o mesmo resultado salvo
  end if;
  -- o operation_id do salvar nao pode colidir com o do rascunho: o rascunho e gravado sem ele
  v_id := public.salvar_rascunho_resultado_holos(payload - 'operation_id');
  select h2.* into r from public.holos_results h2 where h2.id = v_id and h2.nutritionist_id = uid for update;
  m := public.montar_resultado_holos(uid, jsonb_build_object('patient_id', r.patient_id, 'encounter_id', r.encounter_id)
         || r.selected_sources);   -- o snapshot sai do que esta GRAVADO, nunca do conteudo do navegador
  conteudo := (m->'conteudo') || jsonb_build_object(
    'resultado', jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'supersedes_id', r.supersedes_id, 'salvo_em', agora),
    'observacoes', jsonb_build_object('leitura_profissional', r.leitura_profissional, 'pontos_acompanhar', r.pontos_acompanhar,
      'questoes_aprofundar', r.questoes_aprofundar));
  h := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');
  update public.holos_results set status = 'salvo', content_snapshot = conteudo, source_snapshot = m->'fontes', content_hash = h,
    methodology_package_id = (m#>>'{pacote,id}')::uuid, methodology_package_version = (m#>>'{pacote,version}')::int,
    methodology_content_hash = m#>>'{pacote,content_hash}', saved_at = agora, operation_id = coalesce(v_op, r.operation_id)
    where id = v_id;
  if r.supersedes_id is not null then
    update public.holos_results set superseded_at = agora where id = r.supersedes_id and superseded_at is null;
  end if;
  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- REVISAR: salvo -> revisado (quem e quando: carimbo do servidor). Nada mais muda.
-- ----------------------------------------------------------------------------
create or replace function public.revisar_resultado_holos(p_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r record;
begin
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  select h.* into r from public.holos_results h where h.id = p_id and h.nutritionist_id = uid for update;
  if not found then raise exception 'resultado nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if r.status <> 'salvo' then raise exception 'so um resultado salvo pode ser marcado como revisado' using errcode = 'P0001', hint = 'revisao_imutavel'; end if;
  update public.holos_results set status = 'revisado' where id = p_id;
  return p_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- DESCARTAR RASCUNHO (resultado salvo nunca e apagado)
-- ----------------------------------------------------------------------------
create or replace function public.descartar_rascunho_resultado_holos(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n int;
begin
  delete from public.holos_results h where h.id = p_id and h.nutritionist_id = uid and h.status = 'rascunho';
  get diagnostics n = row_count;
  if n = 0 then raise exception 'rascunho nao encontrado (resultado salvo nao e apagado)' using errcode = 'P0001', hint = 'revisao_imutavel'; end if;
  return true;
end;
$$;

revoke all on function public.previa_resultado_holos(jsonb) from public, anon;
revoke all on function public.salvar_rascunho_resultado_holos(jsonb) from public, anon;
revoke all on function public.salvar_resultado_holos(jsonb) from public, anon;
revoke all on function public.revisar_resultado_holos(uuid) from public, anon;
revoke all on function public.descartar_rascunho_resultado_holos(uuid) from public, anon;
grant execute on function public.previa_resultado_holos(jsonb) to authenticated;
grant execute on function public.salvar_rascunho_resultado_holos(jsonb) to authenticated;
grant execute on function public.salvar_resultado_holos(jsonb) to authenticated;
grant execute on function public.revisar_resultado_holos(uuid) to authenticated;
grant execute on function public.descartar_rascunho_resultado_holos(uuid) to authenticated;

-- historico de migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('20261009100000', 'resultado_holos') on conflict (version) do nothing;

-- POS (tudo)
do $$
declare n int;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.holos_results'::regclass) then raise exception 'POS: RLS desligada em holos_results'; end if;
  select count(*) into n from pg_policy where polrelid = 'public.holos_results'::regclass;
  if n <> 1 then raise exception 'POS: esperada 1 politica, encontradas %', n; end if;
  select count(*) into n from pg_trigger where tgrelid = 'public.holos_results'::regclass and not tgisinternal;
  if n <> 5 then raise exception 'POS: esperados 5 gatilhos, encontrados %', n; end if;
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname in
    ('montar_resultado_holos', 'resultado_holos_campos', 'previa_resultado_holos', 'salvar_rascunho_resultado_holos', 'salvar_resultado_holos',
     'revisar_resultado_holos', 'descartar_rascunho_resultado_holos', 'proteger_identidade_resultado_holos');
  if n <> 8 then raise exception 'POS: esperadas 8 funcoes, encontradas %', n; end if;
  if has_table_privilege('anon', 'public.holos_results', 'select') or has_table_privilege('authenticated', 'public.holos_results', 'insert')
     or has_table_privilege('authenticated', 'public.holos_results', 'update') or has_table_privilege('authenticated', 'public.holos_results', 'delete') then
    raise exception 'POS: privilegios de tabela mais largos que o esperado';
  end if;
  if has_function_privilege('anon', 'public.salvar_resultado_holos(jsonb)', 'execute') or has_function_privilege('authenticated', 'public.montar_resultado_holos(uuid, jsonb)', 'execute') then
    raise exception 'POS: execucao de funcao mais larga que o esperado';
  end if;
end $$;
commit;

select 'tabela holos_results' as item, (to_regclass('public.holos_results') is not null)::text as valor
union all select 'RLS ligada', (select relrowsecurity::text from pg_class where oid = 'public.holos_results'::regclass)
union all select 'gatilhos', (select count(*)::text from pg_trigger where tgrelid = 'public.holos_results'::regclass and not tgisinternal)
union all select 'resultados gravados', (select count(*)::text from public.holos_results)
union all select 'migration registrada', (select count(*)::text from supabase_migrations.schema_migrations where version = '20261009100000');
