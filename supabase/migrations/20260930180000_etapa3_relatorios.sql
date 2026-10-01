-- V1, Etapa 3 — PROVENIENCIA (fechamento da Etapa 2) e RELATORIOS CLINICOS
-- versionados (report_emissions). NAO APLICADA em producao. Entra depois de
-- 130000..170000, que nao sao reescritas.
--
-- Ver docs/v1/ETAPA3-ARQUITETURA-EVOLUCAO-RELATORIOS.md.
--   1. Triggers de proveniencia: source_anamnesis_id (fonte consolidada, de
--      outro atendimento, nunca a propria linha) e origin_agreement_id (acordo
--      de OUTRA conduta do mesmo paciente). As FKs compostas ja impedem cruzar
--      paciente/profissional; isto fecha a linhagem. Nenhuma linha reescrita.
--   2. report_emissions: rascunho editavel; emissao = snapshot IMUTAVEL, com
--      source_snapshot (ids/revisoes) e content_snapshot montados PELO SERVIDOR
--      a partir das fontes selecionadas e validadas; content_hash tecnico
--      (sha256, nao e assinatura); retificacao = nova emissao ligada.
--   3. RLS so do dono, anon revogado, sem DELETE, paciente arquivado bloqueado,
--      idempotencia por operation_id, concorrencia por expected_updated_at.
-- Nada metodologico: nenhum delta, nota, faixa, Indice ou Triada no snapshot.

-- ============================================================================
-- 1. PROVENIENCIA
-- ============================================================================

create or replace function public.validar_proveniencia_anamnese()
returns trigger
language plpgsql
set search_path = ''
as $$
declare fonte record;
begin
  if new.source_anamnesis_id is null then return new; end if;
  if new.source_anamnesis_id = new.id then
    raise exception 'anamnese nao pode ter a si mesma como fonte' using errcode = 'P0001', hint = 'proveniencia';
  end if;
  select a.status, a.encounter_id into fonte from public.anamneses a where a.id = new.source_anamnesis_id;
  if fonte.status is null then return new; end if;   -- a FK composta ja recusa o que nao existe/nao e do paciente
  if fonte.status = 'rascunho' then
    raise exception 'fonte da copia precisa ser anamnese salva ou revisada' using errcode = 'P0001', hint = 'proveniencia';
  end if;
  if fonte.encounter_id = new.encounter_id then
    raise exception 'fonte da copia precisa ser de outro atendimento' using errcode = 'P0001', hint = 'proveniencia';
  end if;
  return new;
end;
$$;
create trigger anamneses_validar_proveniencia before insert or update on public.anamneses
  for each row execute function public.validar_proveniencia_anamnese();

create or replace function public.validar_lineage_acordo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare origem record;
begin
  if new.origin_agreement_id is null then return new; end if;
  if new.origin_agreement_id = new.id then
    raise exception 'acordo nao pode ter a si mesmo como origem' using errcode = 'P0001', hint = 'proveniencia';
  end if;
  select g.conduct_id, g.patient_id into origem from public.agreements g where g.id = new.origin_agreement_id;
  if origem.conduct_id is null then return new; end if;   -- FK composta cuida do inexistente/outro paciente
  if origem.conduct_id = new.conduct_id then
    raise exception 'acordo de origem precisa pertencer a outra conduta (revisao ou atendimento anterior)'
      using errcode = 'P0001', hint = 'proveniencia';
  end if;
  return new;
end;
$$;
create trigger agreements_validar_lineage before insert or update on public.agreements
  for each row execute function public.validar_lineage_acordo();

-- ============================================================================
-- 2. REPORT_EMISSIONS
-- ============================================================================

create table public.report_emissions (
  id                    uuid primary key default gen_random_uuid(),
  nutritionist_id       uuid not null default auth.uid() references auth.users(id),
  patient_id            uuid not null,
  encounter_id          uuid,
  report_type           text not null default 'relatorio_clinico',
  revision_number       integer not null default 1,
  status                text not null default 'rascunho',
  title                 text,
  period_start          date,
  period_end            date,
  selected_sources      jsonb not null default '{}'::jsonb,
  professional_text     text,
  source_snapshot       jsonb,
  content_snapshot      jsonb,
  content_hash          text,
  template_version      integer not null default 1,
  issued_at             timestamptz,
  created_by            uuid references auth.users(id),
  supersedes_report_id  uuid,
  superseded_at         timestamptz,
  operation_id          uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint report_emissions_status_valido check (status in ('rascunho','emitido')),
  constraint report_emissions_tipo_valido check (report_type in ('relatorio_clinico')),
  constraint report_emissions_revisao_positiva check (revision_number >= 1),
  constraint report_emissions_emitido_completo check (
    status = 'rascunho' or (source_snapshot is not null and content_snapshot is not null and content_hash is not null and issued_at is not null)),
  constraint report_emissions_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete restrict,
  constraint report_emissions_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id) on delete restrict,
  constraint report_emissions_id_patient_nutritionist_unique unique (id, patient_id, nutritionist_id),
  constraint report_emissions_supersedes_fk
    foreign key (supersedes_report_id, patient_id, nutritionist_id)
    references public.report_emissions (id, patient_id, nutritionist_id) on delete restrict
);

create index report_emissions_patient_idx on public.report_emissions (patient_id, created_at desc);
create unique index report_emissions_operation_unique on public.report_emissions (nutritionist_id, operation_id) where operation_id is not null;

create trigger report_emissions_tocar_updated_at before update on public.report_emissions
  for each row execute function public.tocar_updated_at();
create trigger report_emissions_paciente_arquivado before insert or update on public.report_emissions
  for each row execute function public.bloquear_escrita_paciente_arquivado();

-- Emissao e imutavel: depois de 'emitido' so superseded_at (retificacao) muda.
create or replace function public.proteger_emissao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'rascunho' then return new; end if;
  if (to_jsonb(old) - 'updated_at' - 'superseded_at') <> (to_jsonb(new) - 'updated_at' - 'superseded_at') then
    raise exception 'relatorio emitido e imutavel: retifique criando uma nova emissao'
      using errcode = 'P0001', hint = 'emissao_imutavel';
  end if;
  if old.superseded_at is not null and new.superseded_at is distinct from old.superseded_at then
    raise exception 'superseded_at nao pode ser alterado depois de definido' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger report_emissions_proteger before update on public.report_emissions
  for each row execute function public.proteger_emissao();

alter table public.report_emissions enable row level security;
create policy report_emissions_select_proprios on public.report_emissions for select to authenticated using (nutritionist_id = (select auth.uid()));
create policy report_emissions_insert_proprios on public.report_emissions for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy report_emissions_update_proprios on public.report_emissions for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));
revoke all on table public.report_emissions from public, anon;
grant select, insert, update on table public.report_emissions to authenticated;

-- ============================================================================
-- 3. RPC salvar_rascunho_relatorio — rascunho editavel, com controle otimista
-- ============================================================================
-- payload: { id?, patient_id, encounter_id?, title, period_start, period_end,
--            selected_sources, professional_text, supersedes_report_id?,
--            operation_id?, expected_updated_at? }

create or replace function public.salvar_rascunho_relatorio(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid(); v_id uuid; v_op uuid; atual public.report_emissions%rowtype; v_pid uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if payload is null then raise exception 'payload vazio'; end if;
  v_op := nullif(payload->>'operation_id','')::uuid;
  if v_op is not null then
    select r.id into v_id from public.report_emissions r where r.nutritionist_id = uid and r.operation_id = v_op;
    if v_id is not null then return v_id; end if;
  end if;
  v_id := nullif(payload->>'id','')::uuid;
  if v_id is not null then
    select * into atual from public.report_emissions r where r.id = v_id and r.nutritionist_id = uid for update;
    if not found then raise exception 'relatorio % nao encontrado', v_id using errcode = 'P0002'; end if;
    if atual.status <> 'rascunho' then raise exception 'relatorio emitido e imutavel: retifique criando uma nova emissao' using errcode = 'P0001', hint = 'emissao_imutavel'; end if;
    if payload->>'expected_updated_at' is not null and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'o rascunho do relatorio foi alterado em outro lugar; recarregue antes de salvar' using errcode = 'P0001', hint = 'conflito';
    end if;
    update public.report_emissions set
      title = payload->>'title', period_start = nullif(payload->>'period_start','')::date, period_end = nullif(payload->>'period_end','')::date,
      encounter_id = nullif(payload->>'encounter_id','')::uuid,
      selected_sources = coalesce(payload->'selected_sources', selected_sources),
      professional_text = payload->>'professional_text',
      supersedes_report_id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, supersedes_report_id),
      operation_id = coalesce(operation_id, v_op)
    where id = v_id;
    return v_id;
  end if;
  v_pid := (payload->>'patient_id')::uuid;
  if v_pid is null then raise exception 'patient_id e obrigatorio'; end if;
  insert into public.report_emissions (nutritionist_id, patient_id, encounter_id, status, title, period_start, period_end,
    selected_sources, professional_text, supersedes_report_id, created_by, operation_id)
  values (uid, v_pid, nullif(payload->>'encounter_id','')::uuid, 'rascunho', payload->>'title',
    nullif(payload->>'period_start','')::date, nullif(payload->>'period_end','')::date,
    coalesce(payload->'selected_sources','{}'::jsonb), payload->>'professional_text',
    nullif(payload->>'supersedes_report_id','')::uuid, uid, v_op)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.salvar_rascunho_relatorio(jsonb) from public, anon;
grant execute on function public.salvar_rascunho_relatorio(jsonb) to authenticated;

-- ============================================================================
-- 4. RPC emitir_relatorio — valida cada fonte e monta o snapshot NO SERVIDOR
-- ============================================================================
-- payload: igual ao rascunho (id opcional = rascunho a consolidar). Com
-- supersedes_report_id, e uma retificacao: revision_number + 1 e a original
-- recebe superseded_at. selected_sources:
--   { encounter_ids: [], anamnesis_ids: [], holoscan_application_ids: [],
--     lab_collection_ids: [], tool_application_ids: [], conduct_ids: [],
--     agreement_ids: [], document_ids: [],
--     incluir_interpretacao: bool, incluir_intimo: bool }
-- Tipos de conteudo no snapshot: RELATO_DO_PACIENTE, OBSERVACAO_PROFISSIONAL,
-- DADO_MEDIDO, DADO_DOCUMENTAL, INDICADOR_CALCULADO, TEXTO_ASSISTIDO (vazio).

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

  -- retificacao: a emissao substituida tem de ser do mesmo paciente e estar emitida
  if nullif(payload->>'supersedes_report_id','') is not null or atual.supersedes_report_id is not null then
    select * into sup from public.report_emissions r0
      where r0.id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, atual.supersedes_report_id) and r0.nutritionist_id = uid for update;
    if not found then raise exception 'emissao a retificar nao encontrada' using errcode = 'P0002'; end if;
    if sup.patient_id <> v_pid then raise exception 'emissao a retificar e de outro paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if sup.status <> 'emitido' then raise exception 'so uma emissao pode ser retificada' using errcode = 'P0001'; end if;
    rev := sup.revision_number + 1;
  end if;

  -- identificacao proporcional + profissional (do servidor, nao do payload)
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
    'metodologia', 'Resultados metodológicos do HOLOSCAN (notas, faixas, Índice, Tríada, Leitura Integrada) ainda não são oficiais: Pacote Metodológico V1 não homologado. Constam só identificação, data, versão e cobertura bruta.',
    'texto_assistido', '[]'::jsonb
  );

  -- atendimentos
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'encounter_ids','[]'::jsonb)) loop
    select * into r from public.encounters e where e.id = x::uuid and e.patient_id = v_pid and e.nutritionist_id = uid;
    if not found then raise exception 'atendimento % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_DOCUMENTAL', 'id', r.id, 'occurred_at', r.occurred_at, 'timezone', r.timezone, 'type', r.type, 'modality', r.modality, 'com_agendamento', r.consultation_id is not null);
    fontes := jsonb_set(fontes, '{encounters}', coalesce(fontes->'encounters','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('atendimentos', itens);

  -- anamneses (so consolidadas); itens intimos so com incluir_intimo
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

  -- HOLOSCAN: identificacao, data, versao, cobertura, interpretacao profissional — nada de nota/indice/triada/faixa
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

  -- exames (coletas + resultados), DADO_MEDIDO; sem faixa de referencia (catalogo nao fechado)
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'lab_collection_ids','[]'::jsonb)) loop
    select * into r from public.lab_collections c where c.id = x::uuid and c.patient_id = v_pid and c.nutritionist_id = uid;
    if not found then raise exception 'coleta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('exame_id', lr.exame_id, 'nome', lr.nome_exame_no_momento, 'valor', lr.valor, 'unidade', lr.unidade_no_momento) order by lr.exame_id), '[]'::jsonb)
      into secao from public.lab_results lr where lr.collection_id = r.id;
    itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_MEDIDO', 'id', r.id, 'encounter_id', r.encounter_id, 'coletado_em', r.coletado_em,
      'data_coleta_desconhecida', r.data_coleta_desconhecida, 'laboratorio', r.laboratorio, 'resultados', secao);
    fontes := jsonb_set(fontes, '{lab_collections}', coalesce(fontes->'lab_collections','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('exames', itens);

  -- ferramentas consolidadas; respostas (conteudo intimo) so com incluir_intimo
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

  -- condutas consolidadas + acordos
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
      'resources', r.resources, 'requested_exams', r.requested_exams, 'referrals', r.referrals, 'monitoring', r.monitoring, 'return_plan', r.return_plan,
      'observations', r.observations, 'nutrition_diagnosis', r.nutrition_diagnosis, 'dietary_prescription', r.dietary_prescription,
      'professional_guidance', r.professional_guidance, 'previous_decision', r.previous_decision, 'previous_decision_note', r.previous_decision_note,
      'acordos', secao);
    fontes := jsonb_set(fontes, '{conducts}', coalesce(fontes->'conducts','[]'::jsonb) || jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('condutas', itens);

  -- documentos anexados: so metadados (DADO_DOCUMENTAL)
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'document_ids','[]'::jsonb)) loop
    select * into r from public.documents d where d.id = x::uuid and d.patient_id = v_pid and d.nutritionist_id = uid;
    if not found then raise exception 'documento % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_DOCUMENTAL', 'id', r.id, 'nome', r.nome, 'tipo', r.tipo, 'data_documento', r.data_documento);
    fontes := jsonb_set(fontes, '{documents}', coalesce(fontes->'documents','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('documentos', itens);

  -- interpretacao profissional escrita para este relatorio
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
revoke all on function public.emitir_relatorio(jsonb) from public, anon;
grant execute on function public.emitir_relatorio(jsonb) to authenticated;
