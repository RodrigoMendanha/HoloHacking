-- Migration 20261021100000 (Resultado HOLOS T5) — PARTE 1 de 4. Rodar as 4 em ordem, cada uma inteira.
begin;

alter table public.holos_results add column if not exists direcao jsonb;
alter table public.holos_results drop constraint if exists holos_results_direcao_tamanho;
alter table public.holos_results add constraint holos_results_direcao_tamanho
  check (direcao is null or (jsonb_typeof(direcao) = 'object' and pg_column_size(direcao) <= 262144));
comment on column public.holos_results.direcao is
  'Template 5: direcionamento, estrategias e acompanhamento montados pela nutricionista (schema_version 1). Itens com origem/ref/sugestao/confirmado/mostrar_paciente; hipotese nunca vai para a paciente.';

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
commit;
