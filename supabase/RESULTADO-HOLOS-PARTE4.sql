-- =====================================================================
-- RESULTADO HOLOS — PARTE 4 de 5 — rodar INTEIRA no SQL Editor (uma transacao).
-- Salvar rascunho e salvar (congelar) o Resultado HOLOS.
-- Rode NA ORDEM (a PARTE 1 ja foi aplicada). Se uma parte der erro, nada dela e aplicado: rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema.
-- Conteudo identico a supabase/migrations/20261009100000_resultado_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regprocedure('public.montar_resultado_holos(uuid, jsonb)') is null then raise exception 'rode a PARTE 3 antes (montar_resultado_holos nao existe)'; end if;
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

do $$ begin
  if to_regprocedure('public.salvar_rascunho_resultado_holos(jsonb)') is null or to_regprocedure('public.salvar_resultado_holos(jsonb)') is null then raise exception 'POS 4: funcoes nao criadas'; end if;
end $$;
commit;
select 'PARTE 4 OK. Agora rode a PARTE 5 (a ultima).' as resultado;
