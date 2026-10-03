-- ETAPA 6.3-B — reproduz LOCALMENTE (identidades ficticias) o estado real conferido em 2026-10-03, sobre um banco que ja recebeu
-- supabase/ETAPA6-2-APLICACAO-REAL.sql: 6.3-A (Daniel etapa 1 e Rodrigo etapa 2 nos dois escopos, ativos), HOLOS-V1@2 em_revisao
-- gravado por Daniel (mesmo conteudo do candidato; hash servidor 7af1dae6...) e a Aprovacao 1 de Daniel pela RPC. Nenhum uid real.
-- Uso: psql -d <banco> -f supabase/tests/etapa6-3-b-estado-real-local.sql (dentro de um BEGIN/COMMIT proprio).
begin;
create temp table _e63b (k text primary key, v uuid) on commit drop;
insert into _e63b select 'daniel', id from auth.users where email = 'fp-a@teste.invalid';
insert into _e63b select 'rodrigo', id from auth.users where email = 'fp-b@teste.invalid';
insert into public.methodology_approvers (user_id, scope, approval_stage, display_name, notes)
select (select v from _e63b where k = 'daniel'), s, 1, 'Daniel', 'Etapa 6.3-A: cadastro por gestao tecnica' from unnest(array['holoscan','integrated_reading']) s
union all
select (select v from _e63b where k = 'rodrigo'), s, 2, 'Rodrigo', 'Etapa 6.3-A: cadastro por gestao tecnica' from unnest(array['holoscan','integrated_reading']) s;
select set_config('request.jwt.claims', json_build_object('sub', (select v from _e63b where k = 'daniel'), 'role', 'authenticated')::text, true);
\i supabase/tests/etapa4-2-pacotes.sql
create or replace function pg_temp.gravar_pacote(doc jsonb) returns uuid language plpgsql as $$
declare uid uuid := auth.uid(); pk uuid; ed uuid;
begin
  insert into public.methodology_packages (nutritionist_id, code, version, status, origin, justification, notes, lineage, content_hash)
    values (uid, doc->>'code', (doc->>'version')::int, doc->>'status', doc->>'origin', doc->>'justification', doc->>'notes', doc->'lineage', case when doc ? 'lineage' then doc->>'content_hash' end) returning id into pk;
  insert into public.methodology_questionnaire_editions (nutritionist_id, package_id, code, version, status, item_count, notes)
    values (uid, pk, doc->'edicao'->>'code', (doc->'edicao'->>'version')::int, doc->'edicao'->>'status', (doc->'edicao'->>'item_count')::int, doc->'edicao'->>'notes') returning id into ed;
  insert into public.methodology_scales (nutritionist_id, package_id, code, min_value, max_value, labels, kind, status, source, notes)
    select uid, pk, x.code, x.min_value, x.max_value, x.labels, x.kind, x.status, x.source, x.notes
    from jsonb_to_recordset(doc->'escalas') x(code text, min_value int, max_value int, labels jsonb, kind text, status text, source text, notes text);
  insert into public.methodology_systems (nutritionist_id, package_id, code, name, public_text, definition, emotional_pattern, spiritual_impact, color, position, status, source, notes, legacy)
    select uid, pk, x.code, x.name, x.public_text, x.definition, x.emotional_pattern, x.spiritual_impact, x.color, x.position, x.status, x.source, x.notes, x.legacy
    from jsonb_to_recordset(doc->'sistemas') x(code text, name text, public_text text, definition text, emotional_pattern text, spiritual_impact text, color text, position int, status text, source text, notes text, legacy jsonb);
  insert into public.methodology_questions (nutritionist_id, package_id, edition_id, stable_id, statement, block, scale_code, response_labels, orientation, temporal_context, status, source, notes, version, position)
    select uid, pk, ed, x.stable_id, x.statement, x.block, x.scale_code, x.response_labels, x.orientation, x.temporal_context, x.status, x.source, x.notes, coalesce(x.version, 1), x.position
    from jsonb_to_recordset(doc->'perguntas') x(stable_id text, statement text, block text, scale_code text, response_labels jsonb, orientation text, temporal_context text, status text, source text, notes text, version int, position int);
  insert into public.methodology_associations (nutritionist_id, package_id, question_stable_id, destination_type, destination_id, weight, role, status, source, conflict, conflict_note, legacy)
    select uid, pk, x.question_stable_id, x.destination_type, x.destination_id, x.weight, x.role, x.status, x.source, coalesce(x.conflict, false), x.conflict_note, x.legacy
    from jsonb_to_recordset(doc->'associacoes') x(question_stable_id text, destination_type text, destination_id text, weight numeric, role text, status text, source text, conflict boolean, conflict_note text, legacy jsonb);
  insert into public.methodology_ranges (nutritionist_id, package_id, destination_type, destination_id, lower_bound, upper_bound, lower_bound_exact, upper_bound_exact, lower_inclusive, upper_inclusive, label, message_nutri, message_paciente, status, source, legacy)
    select uid, pk, x.destination_type, x.destination_id, x.lower_bound, x.upper_bound, x.lower_bound_exact, x.upper_bound_exact, x.lower_inclusive, x.upper_inclusive, x.label, x.message_nutri, x.message_paciente, x.status, x.source, x.legacy
    from jsonb_to_recordset(doc->'faixas') x(destination_type text, destination_id text, lower_bound numeric, upper_bound numeric, lower_bound_exact text, upper_bound_exact text, lower_inclusive boolean, upper_inclusive boolean, label text, message_nutri text, message_paciente text, status text, source text, legacy jsonb);
  insert into public.methodology_rules (nutritionist_id, package_id, rule_type, target, payload, status, source, notes)
    select uid, pk, x.rule_type, x.target, x.payload, x.status, x.source, x.notes
    from jsonb_to_recordset(doc->'regras') x(rule_type text, target text, payload jsonb, status text, source text, notes text);
  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, source, justification, evidence)
    select uid, pk, x.topic, x.element, x.version, x.decision, x.responsible, x.decided_at, x.source, x.justification, x.evidence
    from jsonb_to_recordset(coalesce(doc->'registros', '[]'::jsonb)) x(topic text, element text, version text, decision text, responsible text, decided_at date, source text, justification text, evidence text);
  return pk;
end $$;
do $$
declare pk uuid; h text;
begin
  pk := pg_temp.gravar_pacote(jsonb_set((select doc from _pacotes where nome = 'candidato'), '{status}', '"em_revisao"'));
  h := public.metodologia_hash_conteudo(pk);
  if h <> '7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402' then raise exception 'estado local: hash HOLOS-V1@2 % <> 7af1dae6', h; end if;
  perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'Aprovacao 1 local (identidade ficticia)', h);
end $$;
commit;
