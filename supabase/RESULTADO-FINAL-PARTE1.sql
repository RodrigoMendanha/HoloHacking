-- RESULTADO FINAL HOLOS (10/10) — PARTE 1 de 7: campos aceitos (compartilhar Proximos Passos) + validacao das ferramentas do snapshot
-- Rodar INTEIRA e NA ORDEM. Erro = nada aplicado; rode a MESMA parte de novo. Pode repetir sem problema. SOMENTE ADITIVA.
-- Identico a supabase/migrations/20261015100000_resultado_final_holos.sql. A ultima linha antes da conferencia e "commit;".
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $$
declare f text[] := '{}';
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261014100000') then f := f || 'migration 20261014100000'; end if;
  if to_regprocedure('public.resultado_holos_sistemas(uuid, uuid)') is null then f := f || 'resultado_holos_sistemas'; end if;
  if to_regprocedure('public.salvar_rascunho_resultado_holos(jsonb)') is null then f := f || 'salvar_rascunho_resultado_holos'; end if;
  if to_regclass('public.holos_next_steps') is null then f := f || 'holos_next_steps'; end if;
  if to_regprocedure('public.conta_ativa()') is null then f := f || 'conta_ativa()'; end if;
  if array_length(f, 1) > 0 then raise exception 'banco fora do estado esperado (nada foi aplicado): %', array_to_string(f, ', '); end if;
end $$;
-- ----------------------------------------------------------------------------
-- 1a. campos que o navegador pode mandar: + visao_paciente.proximos_passos (boolean, padrao false)
-- ----------------------------------------------------------------------------
create or replace function public.resultado_holos_campos(payload jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'holoscan_application_id', payload->>'holoscan_application_id',
    'tool_application_ids', coalesce(payload->'tool_application_ids', '[]'::jsonb),
    'visao_paciente', jsonb_build_object(
      'ferramentas', coalesce(payload#>'{visao_paciente,ferramentas}', '{}'::jsonb),
      'proximos_passos', coalesce(payload#>'{visao_paciente,proximos_passos}', 'false'::jsonb)));
$$;
revoke all on function public.resultado_holos_campos(jsonb) from public, anon, authenticated;
-- ----------------------------------------------------------------------------
-- 1b. ferramentas do snapshot (mesmas regras do template 1): lista de uuids sem repeticao, do mesmo paciente/profissional,
--     concluidas/revisadas, uma por ferramenta, do catalogo atual; copia integral + "mostrar ao paciente"
-- ----------------------------------------------------------------------------
create or replace function public.resultado_holos_ferramentas(uid uuid, v_pid uuid, payload jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tools jsonb := coalesce(payload->'tool_application_ids', '[]'::jsonb);
  v_vis jsonb := coalesce(payload#>'{visao_paciente,ferramentas}', '{}'::jsonb);
  v_ids uuid[] := '{}'; v_id uuid; x text; n_tools int; n_ok int; n_ferr int; v_ferramentas jsonb; v_fontes jsonb;
begin
  if jsonb_typeof(v_tools) <> 'array' then raise exception 'lista de ferramentas invalida' using errcode = '22023', hint = 'payload_invalido'; end if;
  for x in select jsonb_array_elements_text(v_tools) loop
    begin v_id := x::uuid; exception when others then
      raise exception 'identificador de ferramenta invalido' using errcode = '22023', hint = 'payload_invalido'; end;
    if v_id = any(v_ids) then raise exception 'ferramenta repetida' using errcode = 'P0001', hint = 'fonte_repetida'; end if;
    v_ids := v_ids || v_id;
  end loop;
  n_tools := coalesce(array_length(v_ids, 1), 0);
  if n_tools > 9 then raise exception 'no maximo 9 ferramentas' using errcode = 'P0001', hint = 'payload_invalido'; end if;
  select count(*), count(distinct t.ferramenta_id) into n_ok, n_ferr from public.tool_applications t
    where t.id = any(v_ids) and t.patient_id = v_pid and t.nutritionist_id = uid;
  if n_ok <> n_tools then raise exception 'ferramenta de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if n_ferr <> n_tools then raise exception 'escolha uma unica aplicacao por ferramenta' using errcode = 'P0001', hint = 'fonte_repetida'; end if;
  if exists (select 1 from public.tool_applications t where t.id = any(v_ids) and t.status not in ('concluida', 'revisada')) then
    raise exception 'ferramenta em rascunho nao entra no Resultado HOLOS' using errcode = 'P0001', hint = 'fonte_nao_consolidada';
  end if;
  if exists (select 1 from public.tool_applications t where t.id = any(v_ids) and t.ferramenta_id not in
      ('oq3', 'pqq', 'linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro', 'mapa_rotina_v1', 'gatilhos_respostas_v1', 'conexao_pertencimento_v1')) then
    raise exception 'ferramenta fora do catalogo atual' using errcode = 'P0001', hint = 'fonte_invalida';
  end if;
  if jsonb_typeof(v_vis) <> 'object' then raise exception 'visibilidade invalida' using errcode = '22023', hint = 'payload_invalido'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'ferramenta_id', t.ferramenta_id, 'versao_ferramenta', t.versao_ferramenta, 'status', t.status,
      'iniciada_em', t.iniciada_em, 'concluida_em', t.concluida_em, 'encounter_id', t.encounter_id,
      'respostas', coalesce(t.respostas, '{}'::jsonb), 'leitura', t.leitura, 'prioridade', t.prioridade, 'proximo_passo', t.proximo_passo,
      'mostrar_paciente', coalesce((v_vis #>> array[t.id::text, 'mostrar'])::boolean, false), 'ocultar', '[]'::jsonb
    ) order by array_position(v_ids, t.id)), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('tipo', 'tool_application', 'id', t.id, 'updated_at', t.updated_at, 'status', t.status)
      order by array_position(v_ids, t.id)), '[]'::jsonb)
    into v_ferramentas, v_fontes from public.tool_applications t where t.id = any(v_ids);
  return jsonb_build_object('ferramentas', v_ferramentas, 'fontes', v_fontes);
end;
$$;
revoke all on function public.resultado_holos_ferramentas(uuid, uuid, jsonb) from public, anon, authenticated;
commit;
select 'resultado_holos_ferramentas' as item, (to_regprocedure('public.resultado_holos_ferramentas(uuid, uuid, jsonb)') is not null)::text as valor
union all select 'authenticated executa (deve ser false)', has_function_privilege('authenticated', 'public.resultado_holos_ferramentas(uuid, uuid, jsonb)', 'execute')::text;
