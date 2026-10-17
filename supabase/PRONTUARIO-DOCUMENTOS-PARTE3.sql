-- =====================================================================
-- PRONTUARIO (09/10): exames e documentos sao SO arquivos — PARTE 3 de 4 — rodar INTEIRA no SQL Editor (uma transacao).
-- emitir_relatorio sem exames e sem conteudo de documento. E A MAIOR PARTE (uma funcao so, ~13 KB, sem comentarios/indentacao): se o editor cortar o texto, NAO rode pela metade — avise, que a aplicacao sera feita pela ferramenta (MCP) com a sua autorizacao.
-- Rode as partes NA ORDEM (1, 2, 3, 4). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema (tudo e "if not exists" / "create or replace").
-- NAO DESTRUTIVA: nenhuma tabela, coluna, linha ou arquivo e apagado; metodologia, HOLOSCAN e Resultado HOLOS intocados.
-- Conteudo identico a supabase/migrations/20261011100000_prontuario_documentos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if position('laboratorio_desativado' in pg_get_functiondef('public.salvar_coleta_laboratorial(jsonb)'::regprocedure)) = 0 then raise exception 'rode a PARTE 2 antes (salvar_coleta_laboratorial ainda nao recusa)'; end if;
end $$;
create or replace function public.emitir_relatorio(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
uid uuid := auth.uid(); v_id uuid; v_op uuid; v_pid uuid; v_enc uuid; sel jsonb; atual public.report_emissions%rowtype;
sup public.report_emissions%rowtype; rev int := 1; intimo boolean; interp boolean;
pac record; prof record; x text; r record; r2 record;
fontes jsonb := '{}'::jsonb; conteudo jsonb; secao jsonb; itens jsonb; dom record; it jsonb; tipo text;
dominios_intimos text[] := array['emocional','sentido_pessoal'];
hash text; agora timestamptz := now();
begin
if uid is null then raise exception 'nao autenticado'; end if;
if payload is null then raise exception 'payload vazio'; end if;
v_op := nullif(payload->>'operation_id','')::uuid;
if v_op is not null then
select r0.id into v_id from public.report_emissions r0 where r0.nutritionist_id = uid and r0.operation_id = v_op and r0.status = 'emitido';
if v_id is not null then return v_id; end if;
end if;
v_id := nullif(payload->>'id','')::uuid;
if v_id is not null then
select * into atual from public.report_emissions r0 where r0.id = v_id and r0.nutritionist_id = uid for update;
if not found then raise exception 'relatorio % nao encontrado', v_id using errcode = 'P0002'; end if;
if atual.status = 'emitido' then
if v_op is not null and atual.operation_id = v_op then return v_id; end if;
raise exception 'relatorio ja emitido; retifique criando uma nova emissao' using errcode = 'P0001', hint = 'emissao_imutavel';
end if;
if payload->>'expected_updated_at' is not null and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
raise exception 'o rascunho do relatorio foi alterado em outro lugar; recarregue antes de emitir' using errcode = 'P0001', hint = 'conflito';
end if;
v_pid := atual.patient_id;
else
v_pid := (payload->>'patient_id')::uuid;
end if;
if v_pid is null then raise exception 'patient_id e obrigatorio'; end if;
v_enc := nullif(payload->>'encounter_id','')::uuid;
sel := coalesce(payload->'selected_sources', atual.selected_sources, '{}'::jsonb);
intimo := coalesce((sel->>'incluir_intimo')::boolean, false);
interp := coalesce((sel->>'incluir_interpretacao')::boolean, true);
if nullif(payload->>'supersedes_report_id','') is not null or atual.supersedes_report_id is not null then
select * into sup from public.report_emissions r0
where r0.id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, atual.supersedes_report_id) and r0.nutritionist_id = uid for update;
if not found then raise exception 'emissao a retificar nao encontrada' using errcode = 'P0002'; end if;
if sup.patient_id <> v_pid then raise exception 'emissao a retificar e de outro paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
if sup.status <> 'emitido' then raise exception 'so uma emissao pode ser retificada' using errcode = 'P0001'; end if;
rev := sup.revision_number + 1;
end if;
select p.nome, p.nascimento, p.sexo into pac from public.patients p where p.id = v_pid and p.nutritionist_id = uid;
if pac.nome is null then raise exception 'paciente nao encontrado' using errcode = 'P0002'; end if;
select pr.nome, pr.profissao, pr.registro into prof from public.profiles pr where pr.id = uid;
conteudo := jsonb_build_object(
'template_version', 1,
'tipos_de_conteudo', jsonb_build_array('RELATO_DO_PACIENTE','OBSERVACAO_PROFISSIONAL','DADO_MEDIDO','DADO_DOCUMENTAL','INDICADOR_CALCULADO','TEXTO_ASSISTIDO'),
'paciente', jsonb_build_object('nome', pac.nome, 'nascimento', pac.nascimento, 'sexo', pac.sexo),
'profissional', jsonb_build_object('nome', prof.nome, 'profissao', prof.profissao, 'registro', prof.registro),
'periodo', jsonb_build_object('inicio', nullif(payload->>'period_start',''), 'fim', nullif(payload->>'period_end','')),
'titulo', payload->>'title',
'metodologia', 'Resultados metodológicos do HOLOSCAN (notas, faixas, Índice, Tríada) ainda não são oficiais: Pacote Metodológico V1 não homologado. Constam só identificação, data, versão e cobertura bruta.',
'texto_assistido', '[]'::jsonb
);
itens := '[]'::jsonb;
for x in select value from jsonb_array_elements_text(coalesce(sel->'encounter_ids','[]'::jsonb)) loop
select * into r from public.encounters e where e.id = x::uuid and e.patient_id = v_pid and e.nutritionist_id = uid;
if not found then raise exception 'atendimento % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_DOCUMENTAL', 'id', r.id, 'occurred_at', r.occurred_at, 'timezone', r.timezone, 'type', r.type, 'modality', r.modality, 'com_agendamento', r.consultation_id is not null);
fontes := jsonb_set(fontes, '{encounters}', coalesce(fontes->'encounters','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
end loop;
conteudo := conteudo || jsonb_build_object('atendimentos', itens);
itens := '[]'::jsonb;
for x in select value from jsonb_array_elements_text(coalesce(sel->'anamnesis_ids','[]'::jsonb)) loop
select * into r from public.anamneses a where a.id = x::uuid and a.patient_id = v_pid and a.nutritionist_id = uid;
if not found then raise exception 'anamnese % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
if r.status = 'rascunho' then raise exception 'anamnese % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
secao := '[]'::jsonb;
if r.content->'dominios' is not null then
for dom in select key, value from jsonb_each(r.content->'dominios') loop
if not intimo and dom.key = any(dominios_intimos) then continue; end if;
for it in select * from jsonb_array_elements(coalesce(dom.value->'itens','[]'::jsonb)) loop
tipo := case it->>'origem' when 'relato_paciente' then 'RELATO_DO_PACIENTE' when 'observacao_profissional' then 'OBSERVACAO_PROFISSIONAL'
when 'documento_externo' then 'DADO_DOCUMENTAL' when 'dado_medido' then 'DADO_MEDIDO' else 'RELATO_DO_PACIENTE' end;
secao := secao || (jsonb_build_object('dominio', dom.key, 'tipo_conteudo', tipo) || (it - 'fonte_anamnese_id'));
end loop;
end loop;
end if;
itens := itens || jsonb_build_object('id', r.id, 'encounter_id', r.encounter_id, 'revision_number', r.revision_number, 'status', r.status,
'reviewed_at', r.reviewed_at, 'itens', secao, 'intimo_incluido', intimo);
fontes := jsonb_set(fontes, '{anamneses}', coalesce(fontes->'anamneses','[]'::jsonb) || jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'updated_at', r.updated_at), true);
end loop;
conteudo := conteudo || jsonb_build_object('anamneses', itens);
itens := '[]'::jsonb;
for x in select value from jsonb_array_elements_text(coalesce(sel->'holoscan_application_ids','[]'::jsonb)) loop
select * into r from public.holoscan_applications h where h.id = x::uuid and h.patient_id = v_pid and h.nutritionist_id = uid;
if not found then raise exception 'HOLOSCAN % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
itens := itens || jsonb_build_object('tipo_conteudo', 'INDICADOR_CALCULADO', 'id', r.id, 'encounter_id', r.encounter_id, 'quando', r.quando,
'versao_estrutura', r.versao_estrutura, 'versao_bancos', r.versao_bancos, 'cobertura', r.cobertura,
'resultados_oficiais', false, 'interpretacao_profissional', case when interp then r.interpretacao_texto else null end,
'interpretacao_tipo', 'OBSERVACAO_PROFISSIONAL');
fontes := jsonb_set(fontes, '{holoscan_applications}', coalesce(fontes->'holoscan_applications','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
end loop;
conteudo := conteudo || jsonb_build_object('holoscan', itens);
conteudo := conteudo || jsonb_build_object('exames_incluidos', false);
itens := '[]'::jsonb;
for x in select value from jsonb_array_elements_text(coalesce(sel->'tool_application_ids','[]'::jsonb)) loop
select * into r from public.tool_applications t where t.id = x::uuid and t.patient_id = v_pid and t.nutritionist_id = uid;
if not found then raise exception 'ferramenta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
if r.status = 'rascunho' then raise exception 'ferramenta % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
itens := itens || jsonb_build_object('tipo_conteudo', 'RELATO_DO_PACIENTE', 'id', r.id, 'encounter_id', r.encounter_id, 'ferramenta_id', r.ferramenta_id,
'versao_ferramenta', r.versao_ferramenta, 'concluida_em', r.concluida_em, 'status', r.status,
'respostas', case when intimo then r.respostas else null end, 'respostas_incluidas', intimo,
'leitura_profissional', case when interp then r.leitura else null end, 'leitura_tipo', 'OBSERVACAO_PROFISSIONAL',
'prioridade', r.prioridade, 'proximo_passo', r.proximo_passo);
fontes := jsonb_set(fontes, '{tool_applications}', coalesce(fontes->'tool_applications','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
end loop;
conteudo := conteudo || jsonb_build_object('ferramentas', itens);
itens := '[]'::jsonb;
for x in select value from jsonb_array_elements_text(coalesce(sel->'conduct_ids','[]'::jsonb)) loop
select * into r from public.conducts c where c.id = x::uuid and c.patient_id = v_pid and c.nutritionist_id = uid;
if not found then raise exception 'conduta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
if r.status = 'rascunho' then raise exception 'conduta % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'description', g.description, 'responsible', g.responsible, 'due_text', g.due_text,
'follow_up', g.follow_up, 'status', g.status, 'status_note', g.status_note) order by g.position, g.created_at), '[]'::jsonb)
into secao from public.agreements g where g.conduct_id = r.id
and (sel->'agreement_ids' is null or jsonb_array_length(coalesce(sel->'agreement_ids','[]'::jsonb)) = 0 or (sel->'agreement_ids') ? g.id::text);
itens := itens || jsonb_build_object('tipo_conteudo', 'OBSERVACAO_PROFISSIONAL', 'id', r.id, 'encounter_id', r.encounter_id, 'revision_number', r.revision_number,
'status', r.status, 'priorities', r.priorities, 'objective', r.objective, 'nutrition_strategy', r.nutrition_strategy, 'actions', r.actions,
'resources', r.resources, 'requested_exams', r.requested_exams, 'monitoring', r.monitoring, 'return_plan', r.return_plan,
'observations', r.observations,
'professional_guidance', r.professional_guidance, 'previous_decision', r.previous_decision, 'previous_decision_note', r.previous_decision_note,
'acordos', secao);
fontes := jsonb_set(fontes, '{conducts}', coalesce(fontes->'conducts','[]'::jsonb) || jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'updated_at', r.updated_at), true);
end loop;
conteudo := conteudo || jsonb_build_object('condutas', itens);
conteudo := conteudo || jsonb_build_object('documentos_armazenados',
(select count(*) from public.documents d where d.patient_id = v_pid and d.nutritionist_id = uid and d.arquivado_em is null));
conteudo := conteudo || jsonb_build_object('interpretacao_profissional',
case when interp and nullif(payload->>'professional_text','') is not null
then jsonb_build_object('tipo_conteudo', 'OBSERVACAO_PROFISSIONAL', 'texto', payload->>'professional_text') else null end);
hash := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');   -- sha256() nativo do PostgreSQL (>= 11): hash tecnico, nao assinatura
if v_id is not null then
update public.report_emissions set
status = 'emitido', encounter_id = coalesce(v_enc, encounter_id), title = coalesce(payload->>'title', title),
period_start = coalesce(nullif(payload->>'period_start','')::date, period_start), period_end = coalesce(nullif(payload->>'period_end','')::date, period_end),
selected_sources = sel, professional_text = coalesce(payload->>'professional_text', professional_text),
source_snapshot = fontes, content_snapshot = conteudo, content_hash = hash, template_version = 1,
issued_at = agora, created_by = uid, revision_number = rev,
supersedes_report_id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, supersedes_report_id),
operation_id = coalesce(operation_id, v_op)
where id = v_id;
else
insert into public.report_emissions (nutritionist_id, patient_id, encounter_id, status, title, period_start, period_end, selected_sources,
professional_text, source_snapshot, content_snapshot, content_hash, template_version, issued_at, created_by, revision_number,
supersedes_report_id, operation_id)
values (uid, v_pid, v_enc, 'emitido', payload->>'title', nullif(payload->>'period_start','')::date, nullif(payload->>'period_end','')::date, sel,
payload->>'professional_text', fontes, conteudo, hash, 1, agora, uid, rev, nullif(payload->>'supersedes_report_id','')::uuid, v_op)
returning id into v_id;
end if;
if sup.id is not null then
update public.report_emissions set superseded_at = agora where id = sup.id and superseded_at is null;
end if;
return v_id;
end;
$$;

commit;
