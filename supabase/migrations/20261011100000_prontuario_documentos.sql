-- ============================================================================
-- PRONTUARIO: exames e documentos sao SO arquivos (decisao de produto 09/10)
-- ============================================================================
-- A partir desta migration:
--   * exame e documento ficam guardados no prontuario (documents + Storage 'patient-documents') para a nutricionista
--     consultar em qualquer aparelho; o sistema NAO le, interpreta, estrutura, classifica, compara nem pontua exame;
--   * nenhuma gravacao NOVA de resultado laboratorial estruturado (coletas, resultados, componentes, exames
--     personalizados) e aceita: as funcoes antigas recusam com hint 'laboratorio_desativado' e a API perde a escrita
--     direta nas tabelas lab_*;
--   * nenhuma Leitura Integrada NOVA e aceita: salvar_leitura_integrada recusa com hint 'li_desativada';
--   * documento nao e mais apagado: e ARQUIVADO (arquivado_em). O registro e o arquivo continuam guardados;
--   * a Conduta deixa de receber prescricao dietetica, diagnostico nutricional e encaminhamentos (as revisoes antigas
--     continuam como foram gravadas);
--   * o relatorio emitido daqui em diante nao leva valor de exame nem nome de documento: so "N documentos/exames
--     armazenados no prontuario".
--
-- NAO DESTRUTIVA: nenhuma tabela, coluna, linha ou arquivo e apagado. Coletas, resultados, Leituras Integradas,
-- relatorios antigos, documentos, arquivos e vinculos ficam exatamente como estao (so leitura).
-- NAO toca metodologia: pacotes, perguntas, pesos, sistemas, faixas, HOLOSCAN e Resultado HOLOS ficam como estao.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. DOCUMENTOS: titulo, observacao e arquivamento
-- ----------------------------------------------------------------------------
alter table public.documents add column if not exists titulo text;
alter table public.documents add column if not exists observacao text;
alter table public.documents add column if not exists arquivado_em timestamptz;
alter table public.documents add column if not exists arquivado_por uuid references auth.users(id);
alter table public.documents drop constraint if exists documents_titulo_tamanho;
alter table public.documents add constraint documents_titulo_tamanho check (titulo is null or char_length(titulo) <= 200);
alter table public.documents drop constraint if exists documents_observacao_tamanho;
alter table public.documents add constraint documents_observacao_tamanho check (observacao is null or char_length(observacao) <= 2000);
create index if not exists documents_paciente_ativos on public.documents (patient_id, created_at desc) where arquivado_em is null;

comment on column public.documents.titulo is 'Titulo dado pela nutricionista (biblioteca do prontuario). Sem titulo, a tela usa o nome do arquivo.';
comment on column public.documents.observacao is 'Observacao opcional da nutricionista. Texto livre; o sistema nao le o arquivo.';
comment on column public.documents.arquivado_em is 'Documento arquivado: sai da lista, mas o registro e o arquivo continuam guardados. Documento nao e apagado.';

-- Documento nao e apagado (nem pela API nem por engano no SQL Editor). Arquivar e um UPDATE de arquivado_em.
create or replace function public.documento_nao_apaga()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'documento do prontuario nao e apagado: arquive o documento'
    using errcode = 'P0001', hint = 'documento_nao_apaga';
end $$;
revoke all on function public.documento_nao_apaga() from public, anon, authenticated;
drop trigger if exists documents_nao_apaga on public.documents;
create trigger documents_nao_apaga before delete on public.documents
  for each row execute function public.documento_nao_apaga();

-- O que identifica o arquivo nunca muda; so os metadados da biblioteca e o arquivamento.
create or replace function public.documento_proteger()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.patient_id is distinct from old.patient_id or new.nutritionist_id is distinct from old.nutritionist_id
     or new.storage_path is distinct from old.storage_path or new.mime_type is distinct from old.mime_type
     or new.tamanho_bytes is distinct from old.tamanho_bytes or new.origem_local is distinct from old.origem_local
     or new.created_at is distinct from old.created_at then
    raise exception 'o arquivo do documento nao muda: so titulo, tipo, data, observacao e arquivamento'
      using errcode = 'P0001', hint = 'documento_imutavel';
  end if;
  -- quem arquivou e quando: do servidor, nunca do payload
  if new.arquivado_em is not null and old.arquivado_em is null then
    new.arquivado_em := now();
    new.arquivado_por := auth.uid();
  elsif new.arquivado_em is null then
    new.arquivado_por := null;
  else
    new.arquivado_em := old.arquivado_em;
    new.arquivado_por := old.arquivado_por;
  end if;
  return new;
end $$;
revoke all on function public.documento_proteger() from public, anon, authenticated;
drop trigger if exists documents_proteger on public.documents;
create trigger documents_proteger before update on public.documents
  for each row execute function public.documento_proteger();

-- documento nasce ativo: arquivado_em/arquivado_por nao vem do payload
create or replace function public.documento_nasce_ativo()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.arquivado_em := null;
  new.arquivado_por := null;
  return new;
end $$;
revoke all on function public.documento_nasce_ativo() from public, anon, authenticated;
drop trigger if exists documents_nasce_ativo on public.documents;
create trigger documents_nasce_ativo before insert on public.documents
  for each row execute function public.documento_nasce_ativo();

-- a API perde o DELETE de documents (a politica fica, o grant sai; o gatilho acima cobre o resto)
revoke delete on table public.documents from authenticated;

-- Storage: o arquivo de um documento registrado nao pode ser apagado nem sobrescrito. Continua podendo apagar SO o
-- objeto orfao (upload cuja linha em documents nao chegou a ser gravada), que e o que o app limpa quando o insert falha.
drop policy if exists storage_patient_docs_update on storage.objects;
drop policy if exists storage_patient_docs_delete on storage.objects;
create policy storage_patient_docs_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (select 1 from public.documents d where d.storage_path = objects.name)
  );

-- ----------------------------------------------------------------------------
-- 2. LABORATORIO ESTRUTURADO: desativado (historico so leitura)
-- ----------------------------------------------------------------------------
create or replace function public.salvar_coleta_exames(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'resultados laboratoriais estruturados foram desativados: exame e guardado so como arquivo do prontuario'
    using errcode = 'P0001', hint = 'laboratorio_desativado';
end $$;
revoke all on function public.salvar_coleta_exames(jsonb) from public, anon;
grant execute on function public.salvar_coleta_exames(jsonb) to authenticated;

create or replace function public.salvar_coleta_laboratorial(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'resultados laboratoriais estruturados foram desativados: exame e guardado so como arquivo do prontuario'
    using errcode = 'P0001', hint = 'laboratorio_desativado';
end $$;
revoke all on function public.salvar_coleta_laboratorial(jsonb) from public, anon;
grant execute on function public.salvar_coleta_laboratorial(jsonb) to authenticated;

create or replace function public.revisar_coleta_laboratorial(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'resultados laboratoriais estruturados foram desativados: as coletas antigas ficam so para leitura'
    using errcode = 'P0001', hint = 'laboratorio_desativado';
end $$;
revoke all on function public.revisar_coleta_laboratorial(jsonb) from public, anon;
grant execute on function public.revisar_coleta_laboratorial(jsonb) to authenticated;

create or replace function public.marcar_coleta_revisada(p_collection_id uuid, p_responsible text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'resultados laboratoriais estruturados foram desativados: as coletas antigas ficam so para leitura'
    using errcode = 'P0001', hint = 'laboratorio_desativado';
end $$;
revoke all on function public.marcar_coleta_revisada(uuid, text) from public, anon;
grant execute on function public.marcar_coleta_revisada(uuid, text) to authenticated;

-- escrita direta pela API (painel legado gravava direto nas tabelas): sai. Leitura (select) continua.
revoke insert, update, delete on table public.lab_collections from authenticated;
revoke insert, update, delete on table public.lab_results from authenticated;
revoke insert, update, delete on table public.lab_result_components from authenticated;
revoke insert, update, delete on table public.lab_custom_exams from authenticated;

-- ----------------------------------------------------------------------------
-- 3. LEITURA INTEGRADA: fora do fluxo (leituras salvas e pacotes ficam, so leitura)
-- ----------------------------------------------------------------------------
create or replace function public.salvar_leitura_integrada(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'a Leitura Integrada foi retirada do fluxo: exame nao produz resultado. As leituras salvas ficam so para leitura'
    using errcode = 'P0001', hint = 'li_desativada';
end $$;
revoke all on function public.salvar_leitura_integrada(jsonb) from public, anon;
grant execute on function public.salvar_leitura_integrada(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. CONDUTA: sem prescricao dietetica, diagnostico nutricional e encaminhamentos
-- ----------------------------------------------------------------------------
-- O sistema nao prescreve dieta. Revisao NOVA nasce sem esses tres campos; revisao existente nao muda (o que foi
-- gravado continua no historico, mas nao e mais exibido nem copiado para relatorio, Resultado ou HOLOS AI).
create or replace function public.conduta_sem_prescricao()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.dietary_prescription := null;
    new.nutrition_diagnosis := null;
    new.referrals := null;
  else
    new.dietary_prescription := old.dietary_prescription;
    new.nutrition_diagnosis := old.nutrition_diagnosis;
    new.referrals := old.referrals;
  end if;
  return new;
end $$;
revoke all on function public.conduta_sem_prescricao() from public, anon, authenticated;
drop trigger if exists conducts_sem_prescricao on public.conducts;
create trigger conducts_sem_prescricao before insert or update on public.conducts
  for each row execute function public.conduta_sem_prescricao();

-- ----------------------------------------------------------------------------
-- 5. RELATORIO: sem exames e sem conteudo de documento (mesma funcao da Etapa 5, sem esses blocos)
-- ----------------------------------------------------------------------------
-- Relatorios ja emitidos sao imutaveis e ficam como estao (inclusive os que guardaram valores de exame).
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
    'metodologia', 'Resultados metodológicos do HOLOSCAN (notas, faixas, Índice, Tríada) ainda não são oficiais: Pacote Metodológico V1 não homologado. Constam só identificação, data, versão e cobertura bruta.',
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

  -- Prontuario (20261011100000): exame e documento sao SO arquivos do prontuario. lab_collection_ids e ignorado: nenhum
  -- valor, unidade ou referencia laboratorial entra no relatorio. As coletas antigas continuam no banco, so leitura.
  conteudo := conteudo || jsonb_build_object('exames_incluidos', false);

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
      'resources', r.resources, 'requested_exams', r.requested_exams, 'monitoring', r.monitoring, 'return_plan', r.return_plan,
      'observations', r.observations,
      'professional_guidance', r.professional_guidance, 'previous_decision', r.previous_decision, 'previous_decision_note', r.previous_decision_note,
      'acordos', secao);
    fontes := jsonb_set(fontes, '{conducts}', coalesce(fontes->'conducts','[]'::jsonb) || jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('condutas', itens);

  -- documentos: so a referencia administrativa (quantos arquivos ativos o prontuario guarda). document_ids e ignorado:
  -- nome, tipo e conteudo do arquivo nao entram no relatorio.
  conteudo := conteudo || jsonb_build_object('documentos_armazenados',
    (select count(*) from public.documents d where d.patient_id = v_pid and d.nutritionist_id = uid and d.arquivado_em is null));

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

commit;
