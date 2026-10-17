-- Migration 20261021100000 (Resultado HOLOS T5) — PARTE 4 de 4. Rodar as 4 em ordem, cada uma inteira.
begin;
alter table public.holos_result_emissions drop constraint holos_result_emissions_template;
alter table public.holos_result_emissions add constraint holos_result_emissions_template check (template_version in ('RF-1', 'RF-2', 'RF-3'));
create or replace function public.emitir_resultado_final(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); v_rid uuid; v_op uuid; r record; pac record; cd record; pr record; em record;
  v_acordos jsonb; v_conduta jsonb; v_img jsonb := coalesce(payload->'imagens', '{}'::jsonb);
  v_logo text; v_ass text; v_car text; v_num int; snap jsonb; h text; agora timestamptz := now(); v_t5 boolean; v_tpl text;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  begin
    v_rid := (payload->>'holos_result_id')::uuid;
    v_op := nullif(payload->>'operation_id', '')::uuid;
  exception when others then raise exception 'identificador invalido' using errcode = '22023', hint = 'payload_invalido'; end;
  if v_rid is null then raise exception 'resultado obrigatorio' using errcode = '22023', hint = 'payload_invalido'; end if;
  if jsonb_typeof(v_img) <> 'object' then raise exception 'imagens invalidas' using errcode = '22023', hint = 'imagem_invalida'; end if;
  if v_op is not null then
    select e.* into em from public.holos_result_emissions e where e.nutritionist_id = uid and e.operation_id = v_op;
    if found then return jsonb_build_object('id', em.id, 'emission_number', em.emission_number, 'content_hash', em.content_hash, 'created_at', em.created_at); end if;
  end if;

  select h.* into r from public.holos_results h where h.id = v_rid and h.nutritionist_id = uid;
  if not found then raise exception 'resultado nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if r.status = 'rascunho' or r.content_snapshot is null then raise exception 'so Resultado HOLOS salvo e emitido' using errcode = 'P0001', hint = 'resultado_nao_finalizado'; end if;
  if r.superseded_at is not null then raise exception 'esta versao foi substituida: emita a versao atual' using errcode = 'P0001', hint = 'resultado_substituido'; end if;
  v_t5 := coalesce(r.template_version, 1) >= 5;
  if v_t5 and jsonb_typeof(r.content_snapshot#>'{direcao_paciente,foco_atual}') is distinct from 'object' then
    raise exception 'Resultado HOLOS sem Foco atual confirmado: defina e confirme o foco antes de emitir' using errcode = 'P0001', hint = 'foco_obrigatorio';
  end if;
  select p.id, p.nome, p.status into pac from public.patients p where p.id = r.patient_id and p.nutritionist_id = uid;
  if pac.status = 'inativo' then raise exception 'paciente arquivado: reative antes de registrar novas informacoes' using errcode = 'P0001', hint = 'paciente_arquivado'; end if;

  select c.*, e.occurred_at as atendimento_em into cd from public.conducts c join public.encounters e on e.id = c.encounter_id
   where c.patient_id = r.patient_id and c.nutritionist_id = uid and c.status in ('salvo', 'revisado') and c.encounter_id = r.encounter_id
   order by c.revision_number desc limit 1;
  if found then
    select coalesce(jsonb_agg(jsonb_build_object('description', a.description, 'due_text', a.due_text) order by a.position, a.created_at), '[]'::jsonb)
      into v_acordos from public.agreements a where a.conduct_id = cd.id and a.nutritionist_id = uid and length(btrim(a.description)) > 0;
    v_conduta := jsonb_build_object('id', cd.id, 'revision_number', cd.revision_number, 'encounter_id', cd.encounter_id, 'atendimento_em', cd.atendimento_em,
      'campos', jsonb_build_object('objective', cd.objective, 'nutrition_strategy', cd.nutrition_strategy, 'actions', cd.actions,
        'resources', cd.resources, 'professional_guidance', cd.professional_guidance, 'return_plan', cd.return_plan),
      'acordos', v_acordos);
  else
    v_conduta := null;
  end if;

  select p.nome, p.profissao, p.registro, p.especialidade, p.cidade, p.telefone, p.instagram, p.cor_primaria, p.cor_secundaria
    into pr from public.profiles p where p.id = uid;
  v_logo := public.emissao_imagem_valida(v_img->'logo');
  v_ass := public.emissao_imagem_valida(v_img->'assinatura');
  v_car := public.emissao_imagem_valida(v_img->'carimbo');

  select coalesce(max(e.emission_number), 0) + 1 into v_num from public.holos_result_emissions e where e.patient_id = r.patient_id;
  v_tpl := case when v_t5 then 'RF-3' else 'RF-2' end;
  snap := jsonb_build_object(
    'template', v_tpl,
    'emitida_em', agora,
    'emissao', jsonb_build_object('numero', v_num),
    'paciente', jsonb_build_object('id', pac.id, 'nome', pac.nome),
    'resultado', jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'status', r.status, 'salvo_em', r.saved_at,
      'content_hash', r.content_hash, 'template_version', r.template_version),
    'conduta', v_conduta,
    'profissional', jsonb_build_object('nome', pr.nome, 'profissao', pr.profissao, 'registro', pr.registro, 'especialidade', pr.especialidade,
      'cidade', pr.cidade, 'telefone', pr.telefone, 'instagram', pr.instagram, 'cor_primaria', pr.cor_primaria, 'cor_secundaria', pr.cor_secundaria),
    'imagens', jsonb_build_object('logo', v_logo, 'assinatura', v_ass, 'carimbo', v_car));
  if v_t5 then
    snap := snap || jsonb_build_object('direcao_paciente', r.content_snapshot->'direcao_paciente', 'caminho', coalesce(r.content_snapshot->'caminho', '[]'::jsonb));
  end if;
  h := encode(sha256(convert_to(snap::text, 'UTF8')), 'hex');
  insert into public.holos_result_emissions (nutritionist_id, patient_id, holos_result_id, result_content_hash, conduct_id, emission_number,
      template_version, content_snapshot, content_hash, operation_id, created_at)
    values (uid, r.patient_id, r.id, r.content_hash, case when v_conduta is null then null else cd.id end, v_num, v_tpl, snap, h, v_op, agora)
    returning * into em;
  return jsonb_build_object('id', em.id, 'emission_number', em.emission_number, 'content_hash', em.content_hash, 'created_at', em.created_at);
end;
$$;
revoke all on function public.emitir_resultado_final(jsonb) from public, anon;
grant execute on function public.emitir_resultado_final(jsonb) to authenticated;

commit;
