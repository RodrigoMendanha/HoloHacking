-- ============================================================================
-- RESULTADO HOLOS TEMPLATE 5 — DIRECIONAMENTO + ESTRATEGIAS + ACOMPANHAMENTO DA EVOLUCAO (13/10/2026)
-- ============================================================================
-- SOMENTE ADITIVA. Nao altera HOLOSCAN (perguntas, pesos, associacoes, notas, faixas, Indice, Triade, cobertura), pacotes
-- metodologicos, o catalogo PP-V1, ferramentas, nem nenhum Resultado HOLOS / emissao / relatorio ja gravado (sem backfill,
-- sem recalculo, mesmo hash). Templates 1-4 continuam validos e sao desenhados como antes.
--
-- 1. holos_results.direcao jsonb (schema_version 1): o que a nutricionista monta PARA A PACIENTE, organizado em
--    Direcionamento (momento, dores, desejos, padroes, foco atual), Estrategias (estrategias, Corpo / Mente / Espirito,
--    acordos compartilhados) e Acompanhamento da evolucao (avancos, o que permaneceu, observar, proxima etapa).
--    Cada item guarda texto, origem, ref (de onde veio), sugestao, confirmado, mostrar_paciente, descartado.
--    SUGERIDO -> CONFIRMADO PELA NUTRICIONISTA -> COMPARTILHADO COM A PACIENTE: so item com confirmado = true E
--    mostrar_paciente = true chega a paciente. HIPOTESE NUNCA chega a paciente (nem com mostrar_paciente = true).
-- 2. Snapshot template 5: tudo do template 4 + 'direcao' (registro profissional completo, com sugestoes e hipoteses),
--    'direcao_paciente' (projecao montada NO SERVIDOR: so o compartilhavel; sem hipotese, sem ref) e 'caminho' (os
--    Resultados anteriores da paciente, lidos do snapshot imutavel deles: data, foco e avancos compartilhados; nada de nota).
-- 3. Foco atual: NAO e exigido no rascunho; e OBRIGATORIO (confirmado) para finalizar (salvar) e para emitir.
-- 4. Emissao: template 5 -> RF-3 (exige foco confirmado; congela tambem 'direcao_paciente' e 'caminho', o snapshot
--    publico). Templates 1-4 (historicos) -> RF-2, a regra da epoca: sem direcao, sem foco, sem nova versao.
--    Emissoes RF-1/RF-2 ja feitas nao mudam.
-- ============================================================================

begin;

alter table public.holos_results add column if not exists direcao jsonb;
alter table public.holos_results drop constraint if exists holos_results_direcao_tamanho;
alter table public.holos_results add constraint holos_results_direcao_tamanho
  check (direcao is null or (jsonb_typeof(direcao) = 'object' and pg_column_size(direcao) <= 262144));
comment on column public.holos_results.direcao is
  'Template 5: direcionamento, estrategias e acompanhamento montados pela nutricionista (schema_version 1). Itens com origem/ref/sugestao/confirmado/mostrar_paciente; hipotese nunca vai para a paciente.';

-- ----------------------------------------------------------------------------
-- 1. validacao do formato (rascunho, previa e salvar passam por aqui)
--    Item base: id, texto, texto_sugerido, origem, ref, sugestao, confirmado, mostrar_paciente, descartado.
--    Campos proprios por lista: padroes (tipo), direcionamentos (territorio, porque, objetivo, status, sistemas),
--    estrategias (direcionamento_id, finalidade, acao, observar, contexto, prazo, responsavel, status, anterior),
--    acompanhamento_estrategias (estrategia, aplicou, facilitou, dificultou, percepcao, observacao, mudanca, decisao).
-- ----------------------------------------------------------------------------
drop function if exists public.resultado_holos_validar_item(jsonb, boolean);
create or replace function public.resultado_holos_ref_resultado(r jsonb, obrigatorio boolean)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if r is null or jsonb_typeof(r) = 'null' then
    if obrigatorio then raise exception 'referencia da estrategia obrigatoria' using errcode = '22023', hint = 'direcao_invalida'; end if;
    return;
  end if;
  if jsonb_typeof(r) <> 'object' or coalesce(r->>'resultado_id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or jsonb_typeof(r->'estrategia_id') is distinct from 'string' or length(r->>'estrategia_id') > 64
     or exists (select 1 from jsonb_object_keys(r) x where x not in ('resultado_id', 'estrategia_id')) then
    raise exception 'referencia de estrategia invalida' using errcode = '22023', hint = 'direcao_invalida';
  end if;
end;
$$;
revoke all on function public.resultado_holos_ref_resultado(jsonb, boolean) from public, anon, authenticated;

create or replace function public.resultado_holos_validar_item(it jsonb, lista text)
returns void language plpgsql immutable set search_path = '' as $$
declare k text; r jsonb; extras text[];
begin
  if jsonb_typeof(it) <> 'object' then raise exception 'item de direcao invalido' using errcode = '22023', hint = 'direcao_invalida'; end if;
  extras := case lista
    when 'padroes' then array['tipo']
    when 'direcionamentos' then array['territorio', 'porque', 'objetivo', 'status', 'sistemas']
    when 'estrategias' then array['direcionamento_id', 'finalidade', 'acao', 'observar', 'contexto', 'prazo', 'responsavel', 'status', 'anterior']
    when 'acompanhamento_estrategias' then array['estrategia', 'aplicou', 'facilitou', 'dificultou', 'percepcao', 'observacao', 'mudanca', 'decisao']
    else array[]::text[] end;
  for k in select jsonb_object_keys(it) loop
    if k not in ('id', 'texto', 'texto_sugerido', 'origem', 'ref', 'sugestao', 'confirmado', 'mostrar_paciente', 'descartado') and not (k = any(extras)) then
      raise exception 'campo de item desconhecido: %', k using errcode = '22023', hint = 'direcao_invalida';
    end if;
  end loop;
  if jsonb_typeof(it->'texto') is distinct from 'string' or length(btrim(it->>'texto')) = 0 or length(it->>'texto') > 1000 then
    raise exception 'texto do item obrigatorio (ate 1000 caracteres)' using errcode = '22023', hint = 'direcao_invalida';
  end if;
  foreach k in array array['texto_sugerido', 'porque', 'objetivo', 'direcionamento_id', 'finalidade', 'acao', 'observar', 'contexto', 'prazo', 'responsavel',
                           'aplicou', 'facilitou', 'dificultou', 'percepcao', 'observacao', 'mudanca'] loop
    if it ? k and (jsonb_typeof(it->k) not in ('string', 'null') or length(coalesce(it->>k, '')) > 1000) then
      raise exception 'campo % invalido (texto ate 1000 caracteres)', k using errcode = '22023', hint = 'direcao_invalida';
    end if;
  end loop;
  if it ? 'id' and (jsonb_typeof(it->'id') <> 'string' or length(it->>'id') > 64) then
    raise exception 'id do item invalido' using errcode = '22023', hint = 'direcao_invalida';
  end if;
  if coalesce(it->>'origem', '') not in ('relato_paciente', 'observacao_profissional', 'holoscan', 'ferramenta', 'conduta', 'acordo', 'nutricionista', 'resultado_anterior') then
    raise exception 'origem do item invalida' using errcode = '22023', hint = 'direcao_invalida';
  end if;
  foreach k in array array['sugestao', 'confirmado', 'mostrar_paciente', 'descartado'] loop
    if it ? k and jsonb_typeof(it->k) <> 'boolean' then raise exception 'campo % deve ser booleano', k using errcode = '22023', hint = 'direcao_invalida'; end if;
  end loop;
  r := it->'ref';
  if r is not null and jsonb_typeof(r) <> 'null' then
    if jsonb_typeof(r) <> 'object' or coalesce(r->>'tipo', '') not in ('anamnese', 'conduta', 'acordo', 'ferramenta', 'holoscan', 'resultado', 'atendimento')
       or coalesce(r->>'id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or (r ? 'campo' and jsonb_typeof(r->'campo') not in ('string', 'null')) or length(coalesce(r->>'campo', '')) > 80
       or exists (select 1 from jsonb_object_keys(r) x where x not in ('tipo', 'id', 'campo')) then
      raise exception 'referencia do item invalida' using errcode = '22023', hint = 'direcao_invalida';
    end if;
  elsif it->'sugestao' = 'true'::jsonb then
    -- rastreabilidade: sugestao do sistema sempre diz de onde veio
    raise exception 'sugestao sem referencia de origem' using errcode = '22023', hint = 'direcao_invalida';
  end if;
  if lista = 'padroes' then
    if coalesce(it->>'tipo', '') not in ('padrao_observado', 'hipotese') then
      raise exception 'padrao precisa do tipo padrao_observado ou hipotese' using errcode = '22023', hint = 'direcao_invalida';
    end if;
  elsif lista = 'direcionamentos' then
    if it ? 'territorio' and jsonb_typeof(it->'territorio') <> 'null' and coalesce(it->>'territorio', '') not in ('corpo', 'mente', 'espirito', 'integrado') then
      raise exception 'territorio invalido' using errcode = '22023', hint = 'direcao_invalida'; end if;
    if it ? 'status' and coalesce(it->>'status', '') not in ('proposto', 'ativo', 'concluido', 'encerrado') then
      raise exception 'status do direcionamento invalido' using errcode = '22023', hint = 'direcao_invalida'; end if;
    if it ? 'sistemas' and (jsonb_typeof(it->'sistemas') <> 'array' or jsonb_array_length(it->'sistemas') > 5
       or exists (select 1 from jsonb_array_elements(it->'sistemas') x where jsonb_typeof(x) <> 'string' or length(x #>> '{}') > 40)) then
      raise exception 'sistemas do direcionamento invalidos' using errcode = '22023', hint = 'direcao_invalida'; end if;
  elsif lista = 'estrategias' then
    if it ? 'status' and coalesce(it->>'status', '') not in ('proposta', 'acordada', 'em_teste', 'manter', 'ajustar', 'substituir', 'concluida', 'encerrada') then
      raise exception 'status da estrategia invalido' using errcode = '22023', hint = 'direcao_invalida'; end if;
    perform public.resultado_holos_ref_resultado(it->'anterior', false);
  elsif lista = 'acompanhamento_estrategias' then
    perform public.resultado_holos_ref_resultado(it->'estrategia', true);
    if it ? 'decisao' and jsonb_typeof(it->'decisao') <> 'null' and coalesce(it->>'decisao', '') not in ('manter', 'ajustar', 'substituir', 'concluir', 'encerrar') then
      raise exception 'decisao invalida' using errcode = '22023', hint = 'direcao_invalida'; end if;
    if it->'confirmado' = 'true'::jsonb and coalesce(it->>'decisao', '') = '' then
      raise exception 'acompanhamento confirmado precisa da decisao' using errcode = '22023', hint = 'direcao_invalida'; end if;
  end if;
end;
$$;
revoke all on function public.resultado_holos_validar_item(jsonb, text) from public, anon, authenticated;

-- todos os itens da direcao (listas, territorios e itens unicos), para conferir referencias e projetar
create or replace function public.resultado_holos_itens(d jsonb)
returns setof jsonb language sql immutable set search_path = '' as $$
  select x from jsonb_array_elements(case when jsonb_typeof(d) = 'object' then (
      select coalesce(jsonb_agg(v), '[]'::jsonb) from (
        select jsonb_array_elements(case when jsonb_typeof(d->l) = 'array' then d->l else '[]'::jsonb end) v
          from unnest(array['momento', 'dores', 'desejos', 'avancos', 'permaneceu', 'padroes', 'direcionamentos', 'estrategias', 'acompanhamento_estrategias',
                            'acordos_compartilhados', 'observar']) l
        union all
        select jsonb_array_elements(case when jsonb_typeof(d#>array[t, 'itens']) = 'array' then d#>array[t, 'itens'] else '[]'::jsonb end)
          from unnest(array['corpo', 'mente', 'espirito']) t
        union all
        select d->u from unnest(array['foco_atual', 'proxima_etapa']) u where jsonb_typeof(d->u) = 'object') s)
    else '[]'::jsonb end) x;
$$;
revoke all on function public.resultado_holos_itens(jsonb) from public, anon, authenticated;

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
  -- toda referencia aponta para um registro DESTA paciente e DESTA nutricionista (nunca de outra pessoa)
  for it in select r from public.resultado_holos_itens(d) x(r) where jsonb_typeof(r->'ref') = 'object' loop
    tb := case it#>>'{ref,tipo}' when 'anamnese' then 'anamneses' when 'conduta' then 'conducts' when 'acordo' then 'agreements'
      when 'ferramenta' then 'tool_applications' when 'holoscan' then 'holoscan_applications' when 'resultado' then 'holos_results'
      when 'atendimento' then 'encounters' end;
    execute format('select exists (select 1 from public.%I where id = $1 and patient_id = $2 and nutritionist_id = $3)', tb)
      into ok using (it#>>'{ref,id}')::uuid, v_pid, uid;
    if not ok then raise exception 'referencia de outra paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  -- estrategia anterior / acompanhada: um Resultado SALVO desta paciente (o historico e lido, nunca reescrito)
  for rid in select coalesce(r#>>'{anterior,resultado_id}', r#>>'{estrategia,resultado_id}') from public.resultado_holos_itens(d) x(r)
             where jsonb_typeof(r->'anterior') = 'object' or jsonb_typeof(r->'estrategia') = 'object' loop
    if not exists (select 1 from public.holos_results h where h.id = rid::uuid and h.patient_id = v_pid and h.nutritionist_id = uid and h.status <> 'rascunho') then
      raise exception 'estrategia de Resultado de outra paciente ou nao salvo' using errcode = 'P0001', hint = 'referencia_cruzada';
    end if;
  end loop;
end;
$$;
revoke all on function public.resultado_holos_validar_direcao(uuid, uuid, jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. projecao PARA A PACIENTE (a unica fonte da visao da paciente, do PDF, do WhatsApp e da emissao)
-- ----------------------------------------------------------------------------
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
-- campos que a paciente ve, por lista (nunca ref, sugestao, observacao interna da nutricionista)
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
      -- o foco e sempre compartilhado quando confirmado (e o que a emissao exige)
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

-- ----------------------------------------------------------------------------
-- 3. caminho: Resultados ANTERIORES da paciente (de outros atendimentos, anteriores a este), lidos do snapshot
--    imutavel de cada um. So o que ja era da paciente (foco, direcionamentos, estrategias, avancos e acordos
--    compartilhados). Nada de nota: o passado nao e recalculado e notas de pacotes diferentes nao sao comparadas.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. montagem template 5: o template 4 intacto (renomeado) + direcao, projecao da paciente e caminho
-- ----------------------------------------------------------------------------
do $$ begin
  if to_regprocedure('public.montar_resultado_holos_t4(uuid, jsonb)') is null then
    alter function public.montar_resultado_holos(uuid, jsonb) rename to montar_resultado_holos_t4;
  end if;
end $$;
revoke all on function public.montar_resultado_holos_t4(uuid, jsonb) from public, anon, authenticated;

create or replace function public.montar_resultado_holos(uid uuid, payload jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare m jsonb; d jsonb := payload->'direcao'; v_pid uuid; v_eid uuid;
begin
  m := public.montar_resultado_holos_t4(uid, payload);   -- valida paciente, atendimento, HOLOSCAN, ferramentas (como antes)
  if d is not null and jsonb_typeof(d) = 'null' then d := null; end if;
  v_pid := (payload->>'patient_id')::uuid;
  v_eid := (payload->>'encounter_id')::uuid;
  perform public.resultado_holos_validar_direcao(uid, v_pid, d);
  return jsonb_set(m, '{conteudo}', (m->'conteudo') || jsonb_build_object(
    'template_version', 5,
    'direcao', d,
    'direcao_paciente', public.resultado_holos_direcao_paciente(d),
    'caminho', public.resultado_holos_caminho(uid, v_pid, v_eid)));
end;
$$;
revoke all on function public.montar_resultado_holos(uuid, jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. rascunho: igual ao anterior + grava a direcao (validada pela montagem). Foco NAO e exigido aqui.
-- ----------------------------------------------------------------------------
create or replace function public.salvar_rascunho_resultado_holos(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); v_id uuid; atual record; anterior record; v_op uuid; v_sup uuid; v_rev int := 1; m jsonb;
  v_dir jsonb := case when jsonb_typeof(payload->'direcao') = 'object' then payload->'direcao' else null end;
begin
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  m := public.montar_resultado_holos(uid, payload);   -- valida paciente, atendimento, HOLOSCAN, ferramentas e direcao
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
      questoes_aprofundar = nullif(payload->>'questoes_aprofundar', ''), direcao = v_dir
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
      holoscan_application_id, selected_sources, leitura_profissional, pontos_acompanhar, questoes_aprofundar, operation_id, direcao)
    values (uid, (payload->>'patient_id')::uuid, (payload->>'encounter_id')::uuid, 'rascunho', v_rev, v_sup,
      (payload->>'holoscan_application_id')::uuid, public.resultado_holos_campos(payload), nullif(payload->>'leitura_profissional', ''),
      nullif(payload->>'pontos_acompanhar', ''), nullif(payload->>'questoes_aprofundar', ''), v_op, v_dir)
    returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.salvar_rascunho_resultado_holos(jsonb) from public, anon;
grant execute on function public.salvar_rascunho_resultado_holos(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. salvar (finalizar): exige o FOCO ATUAL confirmado; congela template 5 a partir do que esta GRAVADO
-- ----------------------------------------------------------------------------
create or replace function public.resultado_holos_foco_ok(d jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(d) = 'object' and jsonb_typeof(d->'foco_atual') = 'object' and d#>'{foco_atual,confirmado}' = 'true'::jsonb
     and coalesce(d#>'{foco_atual,descartado}', 'false'::jsonb) <> 'true'::jsonb and length(btrim(coalesce(d#>>'{foco_atual,texto}', ''))) > 0;
$$;
revoke all on function public.resultado_holos_foco_ok(jsonb) from public, anon, authenticated;

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
    if found then return v_id; end if;
  end if;
  v_id := public.salvar_rascunho_resultado_holos(payload - 'operation_id');
  select h2.* into r from public.holos_results h2 where h2.id = v_id and h2.nutritionist_id = uid for update;
  if not public.resultado_holos_foco_ok(r.direcao) then
    raise exception 'defina e confirme o Foco atual antes de finalizar o Resultado HOLOS' using errcode = 'P0001', hint = 'foco_obrigatorio';
  end if;
  m := public.montar_resultado_holos(uid, jsonb_build_object('patient_id', r.patient_id, 'encounter_id', r.encounter_id)
         || r.selected_sources || jsonb_build_object('direcao', r.direcao));
  conteudo := (m->'conteudo') || jsonb_build_object(
    'resultado', jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'supersedes_id', r.supersedes_id, 'salvo_em', agora),
    'observacoes', jsonb_build_object('leitura_profissional', r.leitura_profissional, 'pontos_acompanhar', r.pontos_acompanhar,
      'questoes_aprofundar', r.questoes_aprofundar));
  h := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');
  update public.holos_results set status = 'salvo', content_snapshot = conteudo, source_snapshot = m->'fontes', content_hash = h,
    template_version = coalesce((conteudo->>'template_version')::int, 1),
    methodology_package_id = (m#>>'{pacote,id}')::uuid, methodology_package_version = (m#>>'{pacote,version}')::int,
    methodology_content_hash = m#>>'{pacote,content_hash}', saved_at = agora, operation_id = coalesce(v_op, r.operation_id)
    where id = v_id;
  if r.supersedes_id is not null then
    update public.holos_results set superseded_at = agora where id = r.supersedes_id and superseded_at is null;
  end if;
  return v_id;
end;
$$;
revoke all on function public.salvar_resultado_holos(jsonb) from public, anon;
grant execute on function public.salvar_resultado_holos(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. emissao: template 5 -> RF-3 (foco obrigatorio, projecao da paciente + caminho); templates 1-4 -> RF-2 historico
-- ----------------------------------------------------------------------------
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
  -- templates 1-4 (historicos): a regra da epoca (RF-2), sem direcao e sem foco. Template 5: sem Foco atual
  -- confirmado nao ha emissao para a paciente.
  v_t5 := coalesce(r.template_version, 1) >= 5;
  if v_t5 and jsonb_typeof(r.content_snapshot#>'{direcao_paciente,foco_atual}') is distinct from 'object' then
    raise exception 'Resultado HOLOS sem Foco atual confirmado: defina e confirme o foco antes de emitir' using errcode = 'P0001', hint = 'foco_obrigatorio';
  end if;
  select p.id, p.nome, p.status into pac from public.patients p where p.id = r.patient_id and p.nutritionist_id = uid;
  if pac.status = 'inativo' then raise exception 'paciente arquivado: reative antes de registrar novas informacoes' using errcode = 'P0001', hint = 'paciente_arquivado'; end if;

  -- Conduta do ATENDIMENTO DO RESULTADO (regra RF-2), congelada como registro profissional da emissao
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
  -- RF-3: snapshot publico com SO a projecao da paciente (nunca a direcao completa, que guarda sugestoes e hipoteses).
  -- RF-2 (templates 1-4): exatamente o snapshot da regra historica.
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
