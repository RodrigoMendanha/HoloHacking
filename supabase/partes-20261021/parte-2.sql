-- Migration 20261021100000 (Resultado HOLOS T5) — PARTE 2 de 4. Rodar as 4 em ordem, cada uma inteira.
begin;

create or replace function public.resultado_holos_validar_direcao(uid uuid, v_pid uuid, d jsonb)
returns void language plpgsql stable security definer set search_path = '' as $$
declare k text; it jsonb; tb text; ok boolean; rid text;
begin
  if d is null or jsonb_typeof(d) = 'null' then return; end if;
  if jsonb_typeof(d) <> 'object' then raise exception 'direcao invalida' using errcode = '22023', hint = 'direcao_invalida'; end if;
  if pg_column_size(d) > 262144 then raise exception 'direcao grande demais' using errcode = '22023', hint = 'direcao_invalida'; end if;
  if d->'schema_version' is distinct from '1'::jsonb then
    raise exception 'direcao: schema_version deve ser 1' using errcode = '22023', hint = 'direcao_invalida';
  end if;
  for k in select jsonb_object_keys(d) loop
    if k not in ('schema_version', 'tipo', 'momento', 'dores', 'desejos', 'avancos', 'permaneceu', 'padroes', 'foco_atual', 'direcionamentos', 'estrategias',
                 'acompanhamento_estrategias', 'corpo', 'mente', 'espirito', 'acordos_compartilhados', 'observar', 'proxima_etapa') then
      raise exception 'direcao: campo desconhecido %', k using errcode = '22023', hint = 'direcao_invalida';
    end if;
  end loop;
  if d ? 'tipo' and coalesce(d->>'tipo', '') not in ('primeira', 'retorno') then
    raise exception 'direcao: tipo deve ser primeira ou retorno' using errcode = '22023', hint = 'direcao_invalida';
  end if;
  foreach k in array array['momento', 'dores', 'desejos', 'avancos', 'permaneceu', 'padroes', 'direcionamentos', 'estrategias', 'acompanhamento_estrategias',
                           'acordos_compartilhados', 'observar'] loop
    if d ? k then
      if jsonb_typeof(d->k) <> 'array' or jsonb_array_length(d->k) > 40 then
        raise exception 'direcao: % deve ser lista (ate 40 itens)', k using errcode = '22023', hint = 'direcao_invalida';
      end if;
      for it in select jsonb_array_elements(d->k) loop perform public.resultado_holos_validar_item(it, k); end loop;
    end if;
  end loop;
  foreach k in array array['corpo', 'mente', 'espirito'] loop
    if d ? k then
      if jsonb_typeof(d->k) <> 'object' or exists (select 1 from jsonb_object_keys(d->k) x where x <> 'itens')
         or (d->k ? 'itens' and (jsonb_typeof(d#>array[k, 'itens']) <> 'array' or jsonb_array_length(d#>array[k, 'itens']) > 40)) then
        raise exception 'direcao: % deve ser {itens: [...]}', k using errcode = '22023', hint = 'direcao_invalida';
      end if;
      for it in select jsonb_array_elements(coalesce(d#>array[k, 'itens'], '[]'::jsonb)) loop perform public.resultado_holos_validar_item(it, k); end loop;
    end if;
  end loop;
  foreach k in array array['foco_atual', 'proxima_etapa'] loop
    if d ? k and jsonb_typeof(d->k) <> 'null' then perform public.resultado_holos_validar_item(d->k, k); end if;
  end loop;
  for it in select r from public.resultado_holos_itens(d) x(r) where jsonb_typeof(r->'ref') = 'object' loop
    tb := case it#>>'{ref,tipo}' when 'anamnese' then 'anamneses' when 'conduta' then 'conducts' when 'acordo' then 'agreements'
      when 'ferramenta' then 'tool_applications' when 'holoscan' then 'holoscan_applications' when 'resultado' then 'holos_results'
      when 'atendimento' then 'encounters' end;
    execute format('select exists (select 1 from public.%I where id = $1 and patient_id = $2 and nutritionist_id = $3)', tb)
      into ok using (it#>>'{ref,id}')::uuid, v_pid, uid;
    if not ok then raise exception 'referencia de outra paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  for rid in select coalesce(r#>>'{anterior,resultado_id}', r#>>'{estrategia,resultado_id}') from public.resultado_holos_itens(d) x(r)
             where jsonb_typeof(r->'anterior') = 'object' or jsonb_typeof(r->'estrategia') = 'object' loop
    if not exists (select 1 from public.holos_results h where h.id = rid::uuid and h.patient_id = v_pid and h.nutritionist_id = uid and h.status <> 'rascunho') then
      raise exception 'estrategia de Resultado de outra paciente ou nao salvo' using errcode = 'P0001', hint = 'referencia_cruzada';
    end if;
  end loop;
end;
$$;
revoke all on function public.resultado_holos_validar_direcao(uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function public.resultado_holos_item_paciente(it jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(it) = 'object'
     and it->'confirmado' = 'true'::jsonb                      -- confirmado pela nutricionista (sugestao sozinha nao basta)
     and it->'mostrar_paciente' = 'true'::jsonb                 -- e compartilhado com a paciente
     and coalesce(it->'descartado', 'false'::jsonb) <> 'true'::jsonb
     and coalesce(it->>'tipo', '') <> 'hipotese'                -- HIPOTESE NUNCA, mesmo com mostrar_paciente = true
     and length(btrim(coalesce(it->>'texto', ''))) > 0;
$$;
drop function if exists public.resultado_holos_lista_paciente(jsonb, boolean);
create or replace function public.resultado_holos_lista_paciente(l jsonb, lista text)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('texto', btrim(x->>'texto'), 'origem', x->>'origem') ||
      (select coalesce(jsonb_object_agg(k, x->k), '{}'::jsonb) from unnest(case lista
         when 'direcionamentos' then array['id', 'territorio', 'porque', 'objetivo', 'status', 'sistemas']
         when 'estrategias' then array['id', 'direcionamento_id', 'finalidade', 'acao', 'observar', 'contexto', 'prazo', 'responsavel', 'status', 'anterior']
         when 'acompanhamento_estrategias' then array['estrategia', 'aplicou', 'facilitou', 'dificultou', 'percepcao', 'mudanca', 'decisao']
         else array[]::text[] end) k where x ? k and jsonb_typeof(x->k) <> 'null')
    order by n), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(l) = 'array' then l else '[]'::jsonb end) with ordinality t(x, n)
  where public.resultado_holos_item_paciente(x) and (lista <> 'padroes' or x->>'tipo' = 'padrao_observado');
$$;
create or replace function public.resultado_holos_direcao_paciente(d jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select case when d is null or jsonb_typeof(d) <> 'object' then
      jsonb_build_object('schema_version', 1, 'tipo', 'primeira', 'momento', '[]'::jsonb, 'dores', '[]'::jsonb, 'desejos', '[]'::jsonb, 'avancos', '[]'::jsonb,
        'permaneceu', '[]'::jsonb, 'padroes', '[]'::jsonb, 'foco_atual', null, 'direcionamentos', '[]'::jsonb, 'estrategias', '[]'::jsonb,
        'acompanhamento_estrategias', '[]'::jsonb,
        'corpo', jsonb_build_object('itens', '[]'::jsonb), 'mente', jsonb_build_object('itens', '[]'::jsonb), 'espirito', jsonb_build_object('itens', '[]'::jsonb),
        'acordos_compartilhados', '[]'::jsonb, 'observar', '[]'::jsonb, 'proxima_etapa', null)
    else jsonb_build_object('schema_version', 1, 'tipo', coalesce(d->>'tipo', 'primeira'),
      'momento', public.resultado_holos_lista_paciente(d->'momento', 'momento'),
      'dores', public.resultado_holos_lista_paciente(d->'dores', 'dores'),
      'desejos', public.resultado_holos_lista_paciente(d->'desejos', 'desejos'),
      'avancos', public.resultado_holos_lista_paciente(d->'avancos', 'avancos'),
      'permaneceu', public.resultado_holos_lista_paciente(d->'permaneceu', 'permaneceu'),
      'padroes', public.resultado_holos_lista_paciente(d->'padroes', 'padroes'),
      'foco_atual', case when jsonb_typeof(d->'foco_atual') = 'object' and d#>'{foco_atual,confirmado}' = 'true'::jsonb
                          and coalesce(d#>'{foco_atual,descartado}', 'false'::jsonb) <> 'true'::jsonb and coalesce(d#>>'{foco_atual,tipo}', '') <> 'hipotese'
                          and length(btrim(coalesce(d#>>'{foco_atual,texto}', ''))) > 0
                     then jsonb_build_object('texto', btrim(d#>>'{foco_atual,texto}'), 'origem', d#>>'{foco_atual,origem}') else null end,
      'direcionamentos', public.resultado_holos_lista_paciente(d->'direcionamentos', 'direcionamentos'),
      'estrategias', public.resultado_holos_lista_paciente(d->'estrategias', 'estrategias'),
      'acompanhamento_estrategias', public.resultado_holos_lista_paciente(d->'acompanhamento_estrategias', 'acompanhamento_estrategias'),
      'corpo', jsonb_build_object('itens', public.resultado_holos_lista_paciente(d#>'{corpo,itens}', 'corpo')),
      'mente', jsonb_build_object('itens', public.resultado_holos_lista_paciente(d#>'{mente,itens}', 'mente')),
      'espirito', jsonb_build_object('itens', public.resultado_holos_lista_paciente(d#>'{espirito,itens}', 'espirito')),
      'acordos_compartilhados', public.resultado_holos_lista_paciente(d->'acordos_compartilhados', 'acordos_compartilhados'),
      'observar', public.resultado_holos_lista_paciente(d->'observar', 'observar'),
      'proxima_etapa', case when public.resultado_holos_item_paciente(d->'proxima_etapa')
                       then jsonb_build_object('texto', btrim(d#>>'{proxima_etapa,texto}'), 'origem', d#>>'{proxima_etapa,origem}') else null end)
  end;
$$;
revoke all on function public.resultado_holos_item_paciente(jsonb) from public, anon, authenticated;
revoke all on function public.resultado_holos_lista_paciente(jsonb, text) from public, anon, authenticated;
revoke all on function public.resultado_holos_direcao_paciente(jsonb) from public, anon, authenticated;

create or replace function public.resultado_holos_caminho(uid uuid, v_pid uuid, v_eid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'resultado_id', x.id, 'revision_number', x.revision_number, 'content_hash', x.content_hash, 'template_version', x.template_version,
      'atendimento_em', x.occurred_at,
      'foco', x.content_snapshot#>'{direcao_paciente,foco_atual}',
      'direcionamentos', coalesce(x.content_snapshot#>'{direcao_paciente,direcionamentos}', '[]'::jsonb),
      'estrategias', coalesce(x.content_snapshot#>'{direcao_paciente,estrategias}', '[]'::jsonb),
      'avancos', coalesce(x.content_snapshot#>'{direcao_paciente,avancos}', '[]'::jsonb),
      'acordos', coalesce(x.content_snapshot#>'{direcao_paciente,acordos_compartilhados}', '[]'::jsonb)
    ) order by x.occurred_at), '[]'::jsonb)
  from (
    select * from (
      select distinct on (h.encounter_id) h.id, h.revision_number, h.content_hash, h.template_version, h.content_snapshot, e.occurred_at
        from public.holos_results h join public.encounters e on e.id = h.encounter_id
       where h.patient_id = v_pid and h.nutritionist_id = uid and h.status in ('salvo', 'revisado') and h.superseded_at is null
         and h.content_snapshot is not null and h.encounter_id <> v_eid
         and e.occurred_at < (select e2.occurred_at from public.encounters e2 where e2.id = v_eid)
       order by h.encounter_id, h.saved_at desc) y
    order by y.occurred_at desc limit 10) x;
$$;
revoke all on function public.resultado_holos_caminho(uuid, uuid, uuid) from public, anon, authenticated;

commit;
