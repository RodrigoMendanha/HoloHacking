-- ============================================================================
-- PONTE HOLOS AI -> HOLOHACKING (14/10/2026)
-- ============================================================================
-- SOMENTE ADITIVA. Nao altera HOLOSCAN (perguntas, pesos, associacoes, notas, faixas, Indice, Triade, cobertura), pacotes
-- metodologicos, PP-V1, ferramentas, exames, nem nenhum Resultado HOLOS / emissao ja gravado (sem backfill, mesmo hash).
--
-- 1. holos_ai_imports: cada JSON HOLOS_AI_RESULT (schema_version 1) colado num atendimento. Guarda IMUTAVEL o texto colado,
--    o JSON, a versao do schema, o agente, quando e em qual atendimento. Nova importacao = novo registro (versao 2, 3...);
--    nenhuma importacao sobrescreve outra. Status: importado -> em_revisao -> confirmado | descartado (finais).
-- 2. holos_ai_import_items: um registro por elemento de cada secao (sintese, estrategias, direcionamentos...). valor_ia e
--    imutavel; a nutricionista confirma, edita (valor_profissional) ou descarta, e marca o que pode ir para a paciente.
--    Secoes so profissionais (hipoteses, alertas, fontes, raciocinio, pontos para aprofundar...) nunca sao compartilhaveis.
-- 3. Resultado HOLOS (template 5): itens com origem 'holos_ai' e ref {tipo:'holos_ai', id:<importacao>, campo:<item>}.
--    O servidor confere: importacao CONCLUIDA, item ACEITO (confirmado/editado) para entrar confirmado e nunca item so
--    profissional para a paciente. A visao da paciente, o PDF e o WhatsApp continuam saindo SO da projecao do servidor.
-- Escrita SO pelas RPCs (security definer); leitura so da propria nutricionista (RLS). Conta pendente e paciente arquivado
-- bloqueiam como nas demais tabelas.
-- ============================================================================

begin;

create table if not exists public.holos_ai_imports (
  id                    uuid primary key default gen_random_uuid(),
  nutritionist_id       uuid not null default auth.uid() references auth.users(id),
  patient_id            uuid not null,
  encounter_id          uuid not null,
  versao                integer not null,
  schema_version        integer not null,
  tipo                  text not null,
  origem                text not null default 'holos_ai_gpt',
  agente                text,
  kb_version            text,
  entrada               jsonb,
  texto_original        text not null,
  json_original         jsonb not null,
  texto_sha256          text not null,
  status                text not null default 'importado',
  operation_id          uuid,
  imported_at           timestamptz not null default now(),
  revisao_iniciada_em   timestamptz,
  concluida_em          timestamptz,
  descartada_em         timestamptz,
  updated_at            timestamptz not null default now(),
  constraint holos_ai_imports_status check (status in ('importado', 'em_revisao', 'confirmado', 'descartado')),
  constraint holos_ai_imports_schema check (schema_version = 1),
  constraint holos_ai_imports_tipo check (tipo in ('primeira_consulta', 'retorno')),
  constraint holos_ai_imports_versao check (versao >= 1),
  constraint holos_ai_imports_texto check (length(texto_original) between 2 and 400000 and pg_column_size(json_original) <= 1048576),
  constraint holos_ai_imports_sha check (texto_sha256 ~ '^[0-9a-f]{64}$'),
  constraint holos_ai_imports_meta check (length(coalesce(agente, '')) <= 200 and length(coalesce(kb_version, '')) <= 400 and length(origem) <= 40),
  constraint holos_ai_imports_unique unique (id, patient_id, nutritionist_id),
  constraint holos_ai_imports_versao_unica unique (encounter_id, versao),
  constraint holos_ai_imports_patient_fk foreign key (patient_id, nutritionist_id)
    references public.patients(id, nutritionist_id) on delete restrict,
  constraint holos_ai_imports_encounter_fk foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters(id, patient_id, nutritionist_id) on delete restrict
);
comment on table public.holos_ai_imports is
  'HOLOS AI: cada JSON HOLOS_AI_RESULT importado num atendimento (texto e JSON originais imutaveis; nova importacao = nova versao).';
create index if not exists holos_ai_imports_patient_idx on public.holos_ai_imports (patient_id, imported_at desc);
create unique index if not exists holos_ai_imports_operation on public.holos_ai_imports (nutritionist_id, operation_id) where operation_id is not null;

create table if not exists public.holos_ai_import_items (
  id                  uuid primary key default gen_random_uuid(),
  import_id           uuid not null,
  nutritionist_id     uuid not null,
  patient_id          uuid not null,
  secao               text not null,
  ordem               integer not null,
  chave               text,
  valor_ia            jsonb not null,
  so_profissional     boolean not null,
  estado              text not null default 'sugerido',
  valor_profissional  jsonb,
  compartilhar        boolean not null default false,
  revisado_em         timestamptz,
  created_at          timestamptz not null default now(),
  constraint holos_ai_items_secao check (secao in ('sintese_integrada', 'o_que_apareceu', 'convergencias', 'padroes_observados', 'pontos_para_aprofundar',
    'sistemas_prioritarios', 'ferramentas_ja_aplicadas', 'ferramentas_recomendadas', 'direcionamentos', 'estrategias', 'corpo', 'mente', 'espirito',
    'o_que_observar', 'plano_acompanhamento', 'roteiro_proxima_consulta', 'proxima_etapa', 'rascunho_paciente', 'alertas_profissionais', 'fontes_utilizadas')),
  constraint holos_ai_items_estado check (estado in ('sugerido', 'confirmado', 'editado', 'descartado')),
  constraint holos_ai_items_editado check ((estado = 'editado') = (valor_profissional is not null)),
  constraint holos_ai_items_compartilhar check (not compartilhar or (estado in ('confirmado', 'editado') and not so_profissional)),
  constraint holos_ai_items_ordem check (ordem >= 0 and length(coalesce(chave, '')) <= 64),
  constraint holos_ai_items_unico unique (import_id, secao, ordem),
  constraint holos_ai_items_import_fk foreign key (import_id, patient_id, nutritionist_id)
    references public.holos_ai_imports(id, patient_id, nutritionist_id) on delete restrict
);
comment on table public.holos_ai_import_items is
  'HOLOS AI: um item por elemento de cada secao importada. valor_ia imutavel; revisao da nutricionista (confirmar/editar/descartar/compartilhar).';
create index if not exists holos_ai_items_import_idx on public.holos_ai_import_items (import_id, secao, ordem);

-- secoes que NUNCA vao para a paciente (o mesmo de holos-ai-contrato.js SO_PROFISSIONAL)
create or replace function public.holos_ai_so_profissional(p_secao text)
returns boolean language sql immutable set search_path = '' as $$
  select p_secao in ('sintese_integrada', 'o_que_apareceu', 'convergencias', 'pontos_para_aprofundar', 'sistemas_prioritarios', 'ferramentas_ja_aplicadas',
    'ferramentas_recomendadas', 'roteiro_proxima_consulta', 'rascunho_paciente', 'alertas_profissionais', 'fontes_utilizadas');
$$;
revoke all on function public.holos_ai_so_profissional(text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- gatilhos: original imutavel, transicoes de status, item so muda durante a revisao, nada e apagado
-- ----------------------------------------------------------------------------
create or replace function public.proteger_holos_ai_import()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'importacao HOLOS AI nao e apagada (descarte-a)' using errcode = 'P0001', hint = 'holos_ai_imutavel';
  end if;
  if new.id <> old.id or new.nutritionist_id <> old.nutritionist_id or new.patient_id <> old.patient_id or new.encounter_id <> old.encounter_id
     or new.versao <> old.versao or new.schema_version <> old.schema_version or new.tipo <> old.tipo or new.origem <> old.origem
     or new.agente is distinct from old.agente or new.kb_version is distinct from old.kb_version or new.entrada is distinct from old.entrada
     or new.texto_original <> old.texto_original or new.json_original <> old.json_original or new.texto_sha256 <> old.texto_sha256
     or new.operation_id is distinct from old.operation_id or new.imported_at <> old.imported_at then
    raise exception 'o JSON importado da HOLOS AI e imutavel' using errcode = 'P0001', hint = 'holos_ai_imutavel';
  end if;
  if new.status <> old.status and not (
       (old.status = 'importado' and new.status in ('em_revisao', 'confirmado', 'descartado'))
    or (old.status = 'em_revisao' and new.status in ('confirmado', 'descartado'))) then
    raise exception 'transicao de status invalida: % -> %', old.status, new.status using errcode = 'P0001', hint = 'holos_ai_status';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists holos_ai_imports_proteger on public.holos_ai_imports;
create trigger holos_ai_imports_proteger before update or delete on public.holos_ai_imports
  for each row execute function public.proteger_holos_ai_import();
drop trigger if exists holos_ai_imports_paciente_arquivado on public.holos_ai_imports;
create trigger holos_ai_imports_paciente_arquivado before insert or update on public.holos_ai_imports
  for each row execute function public.bloquear_escrita_paciente_arquivado();

create or replace function public.proteger_holos_ai_item()
returns trigger language plpgsql set search_path = '' as $$
declare st text;
begin
  if tg_op = 'DELETE' then
    raise exception 'item importado da HOLOS AI nao e apagado' using errcode = 'P0001', hint = 'holos_ai_imutavel';
  end if;
  if new.id <> old.id or new.import_id <> old.import_id or new.nutritionist_id <> old.nutritionist_id or new.patient_id <> old.patient_id
     or new.secao <> old.secao or new.ordem <> old.ordem or new.chave is distinct from old.chave or new.valor_ia <> old.valor_ia
     or new.so_profissional <> old.so_profissional or new.created_at <> old.created_at then
    raise exception 'o valor original da HOLOS AI e imutavel' using errcode = 'P0001', hint = 'holos_ai_imutavel';
  end if;
  select status into st from public.holos_ai_imports where id = new.import_id;
  if st not in ('importado', 'em_revisao') then
    raise exception 'revisao encerrada: a importacao esta %', st using errcode = 'P0001', hint = 'holos_ai_revisao_encerrada';
  end if;
  return new;
end;
$$;
drop trigger if exists holos_ai_items_proteger on public.holos_ai_import_items;
create trigger holos_ai_items_proteger before update or delete on public.holos_ai_import_items
  for each row execute function public.proteger_holos_ai_item();
drop trigger if exists holos_ai_items_paciente_arquivado on public.holos_ai_import_items;
create trigger holos_ai_items_paciente_arquivado before insert or update on public.holos_ai_import_items
  for each row execute function public.bloquear_escrita_paciente_arquivado();

do $$ begin
  if to_regprocedure('public.exigir_conta_ativa()') is not null then
    drop trigger if exists exigir_conta_ativa on public.holos_ai_imports;
    create trigger exigir_conta_ativa before insert or update or delete on public.holos_ai_imports
      for each statement execute function public.exigir_conta_ativa();
    drop trigger if exists exigir_conta_ativa on public.holos_ai_import_items;
    create trigger exigir_conta_ativa before insert or update or delete on public.holos_ai_import_items
      for each statement execute function public.exigir_conta_ativa();
  end if;
end $$;

-- RLS: so a propria nutricionista le; escrita SO pelas funcoes abaixo
alter table public.holos_ai_imports enable row level security;
alter table public.holos_ai_import_items enable row level security;
drop policy if exists holos_ai_imports_select_proprios on public.holos_ai_imports;
create policy holos_ai_imports_select_proprios on public.holos_ai_imports for select to authenticated
  using (nutritionist_id = (select auth.uid()));
drop policy if exists holos_ai_items_select_proprios on public.holos_ai_import_items;
create policy holos_ai_items_select_proprios on public.holos_ai_import_items for select to authenticated
  using (nutritionist_id = (select auth.uid()));
revoke all on public.holos_ai_imports from public, anon, authenticated;
revoke all on public.holos_ai_import_items from public, anon, authenticated;
grant select on public.holos_ai_imports to authenticated;
grant select on public.holos_ai_import_items to authenticated;

-- ----------------------------------------------------------------------------
-- o JSON colado: o primeiro bloco ``` (```json ... ```) ou o texto inteiro (mesma regra de holos-ai-contrato.js trechoJson)
-- ----------------------------------------------------------------------------
create or replace function public.holos_ai_extrair(p_texto text)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare t text := btrim(coalesce(p_texto, '')); i int; resto text; j int; v jsonb;
begin
  i := strpos(t, '```');
  if i > 0 then
    resto := substr(t, i + 3);
    j := strpos(resto, '```');
    t := btrim(case when j > 0 then substr(resto, 1, j - 1) else resto end);
    t := btrim(regexp_replace(t, '^json\M', '', 'i'));
  end if;
  begin
    v := t::jsonb;
  exception when others then
    raise exception 'JSON invalido: confira se o bloco foi copiado inteiro (do { inicial ao } final)' using errcode = '22023', hint = 'json_invalido';
  end;
  if jsonb_typeof(v) <> 'object' then
    raise exception 'o conteudo colado nao e um objeto JSON' using errcode = '22023', hint = 'json_invalido';
  end if;
  return v;
end;
$$;
revoke all on function public.holos_ai_extrair(text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- validacao do HOLOS_AI_RESULT schema_version 1 (as mesmas regras de holos-ai-contrato.js validar). Devolve os problemas.
-- ----------------------------------------------------------------------------
create or replace function public.holos_ai_problemas(r jsonb)
returns text[] language plpgsql immutable set search_path = '' as $$
declare
  p text[] := '{}'; k text; x jsonb; i int; n int; tipo text; eid text; dec text; idsd text[] := '{}'; idse text[] := '{}'; terre jsonb := '{}'::jsonb;
  rid text; nome text; vid text[] := '{}'; vnome text[] := '{}'; concl text[] := '{}'; principais int := 0; terr text; t jsonb;
  obrig text[] := array['schema_version', 'tipo', 'sintese_integrada', 'o_que_apareceu', 'convergencias', 'padroes_observados', 'pontos_para_aprofundar',
    'sistemas_prioritarios', 'ferramentas_recomendadas', 'direcionamentos', 'estrategias', 'corpo', 'mente', 'espirito', 'o_que_observar',
    'roteiro_proxima_consulta', 'proxima_etapa', 'rascunho_paciente', 'alertas_profissionais', 'fontes_utilizadas'];
  listas text[] := array['o_que_apareceu', 'convergencias', 'padroes_observados', 'pontos_para_aprofundar', 'sistemas_prioritarios', 'ferramentas_ja_aplicadas',
    'ferramentas_recomendadas', 'direcionamentos', 'estrategias', 'o_que_observar', 'plano_acompanhamento', 'roteiro_proxima_consulta', 'alertas_profissionais',
    'fontes_utilizadas'];
  manter_obs text := 'MANTER EM OBSERVAÇÃO — SUGERIDO';
  cheio text := '^\s*$';
begin
  if r is null or jsonb_typeof(r) <> 'object' then return array['o resultado nao e um objeto JSON']; end if;
  if not r ? 'schema_version' then p := p || 'falta a chave "schema_version"'::text;
  elsif r->'schema_version' is distinct from '1'::jsonb then
    return array['schema_version ' || (r->'schema_version')::text || ' nao e compativel: este HoloHacking importa schema_version 1'];
  end if;
  foreach k in array obrig loop if not r ? k then p := p || format('falta a chave "%s"', k); end if; end loop;
  tipo := r->>'tipo';
  if r ? 'tipo' and coalesce(tipo, '') not in ('primeira_consulta', 'retorno') then p := p || 'tipo deve ser "primeira_consulta" ou "retorno"'::text; end if;
  foreach k in array array['sintese_integrada', 'proxima_etapa', 'rascunho_paciente'] loop
    if r ? k and jsonb_typeof(r->k) <> 'string' then p := p || format('"%s" deve ser texto', k);
    elsif r ? k and length(r->>k) > 5000 then p := p || format('"%s" passa de 5000 caracteres', k); end if;
  end loop;
  foreach k in array listas loop
    if r ? k then
      if jsonb_typeof(r->k) <> 'array' then p := p || format('"%s" deve ser lista', k); continue; end if;
      if jsonb_array_length(r->k) > 60 then p := p || format('"%s" tem mais de 60 itens', k); end if;
      for x, i in select v, o - 1 from jsonb_array_elements(r->k) with ordinality e(v, o) loop
        if jsonb_typeof(x) not in ('string', 'object') then p := p || format('%s[%s] deve ser texto ou objeto', k, i);
        elsif (jsonb_typeof(x) = 'string' and length(x #>> '{}') > 5000)
           or (jsonb_typeof(x) = 'object' and exists (select 1 from jsonb_each(x) c where jsonb_typeof(c.value) = 'string' and length(c.value #>> '{}') > 5000)) then
          p := p || format('%s[%s] tem texto com mais de 5000 caracteres', k, i);
        end if;
        if k in ('o_que_apareceu', 'convergencias', 'pontos_para_aprofundar', 'sistemas_prioritarios', 'ferramentas_ja_aplicadas', 'ferramentas_recomendadas',
                 'direcionamentos', 'estrategias', 'roteiro_proxima_consulta', 'alertas_profissionais') and jsonb_typeof(x) <> 'object' then
          p := p || format('%s[%s] deve ser objeto', k, i);
        elsif k in ('padroes_observados', 'o_que_observar', 'plano_acompanhamento', 'fontes_utilizadas') and jsonb_typeof(x) <> 'string' then
          p := p || format('%s[%s] deve ser texto', k, i);
        end if;
      end loop;
    end if;
  end loop;
  -- detalhes por secao (so objetos)
  for x, i in select v, o - 1 from jsonb_array_elements(case when jsonb_typeof(r->'o_que_apareceu') = 'array' then r->'o_que_apareceu' else '[]' end) with ordinality e(v, o) where jsonb_typeof(v) = 'object' loop
    if coalesce(x->>'texto', '') ~ cheio then p := p || format('o_que_apareceu[%s]: falta texto', i); end if;
  end loop;
  for x, i in select v, o - 1 from jsonb_array_elements(case when jsonb_typeof(r->'convergencias') = 'array' then r->'convergencias' else '[]' end) with ordinality e(v, o) where jsonb_typeof(v) = 'object' loop
    if coalesce(x->>'tipo', '') not in ('convergencia', 'conflito') then p := p || format('convergencias[%s]: tipo deve ser convergencia ou conflito', i); end if;
    if coalesce(x->>'texto', '') ~ cheio then p := p || format('convergencias[%s]: falta texto', i); end if;
  end loop;
  for x, i in select v, o - 1 from jsonb_array_elements(case when jsonb_typeof(r->'pontos_para_aprofundar') = 'array' then r->'pontos_para_aprofundar' else '[]' end) with ordinality e(v, o) where jsonb_typeof(v) = 'object' loop
    if coalesce(x->>'tipo', '') not in ('questao', 'hipotese') then p := p || format('pontos_para_aprofundar[%s]: tipo deve ser questao ou hipotese', i); end if;
    if coalesce(x->>'texto', '') ~ cheio then p := p || format('pontos_para_aprofundar[%s]: falta texto', i); end if;
    if x->>'tipo' = 'hipotese' and x->'so_profissional' is distinct from 'true'::jsonb then p := p || format('pontos_para_aprofundar[%s]: hipotese deve ter so_profissional = true', i); end if;
  end loop;
  for x, i in select v, o - 1 from jsonb_array_elements(case when jsonb_typeof(r->'sistemas_prioritarios') = 'array' then r->'sistemas_prioritarios' else '[]' end) with ordinality e(v, o) where jsonb_typeof(v) = 'object' loop
    if coalesce(x->>'sistema', '') ~ cheio then p := p || format('sistemas_prioritarios[%s]: falta o sistema', i); end if;
  end loop;
  for x, i in select v, o - 1 from jsonb_array_elements(case when jsonb_typeof(r->'alertas_profissionais') = 'array' then r->'alertas_profissionais' else '[]' end) with ordinality e(v, o) where jsonb_typeof(v) = 'object' loop
    if coalesce(x->>'tipo', '') not in ('metodologico', 'avaliacao_profissional', 'exames', 'conduta', 'catalogo', 'informacao_insuficiente') then p := p || format('alertas_profissionais[%s]: tipo invalido', i); end if;
    if coalesce(x->>'texto', '') ~ cheio then p := p || format('alertas_profissionais[%s]: falta texto', i); end if;
  end loop;
  for x, i in select v, o - 1 from jsonb_array_elements(case when jsonb_typeof(r->'roteiro_proxima_consulta') = 'array' then r->'roteiro_proxima_consulta' else '[]' end) with ordinality e(v, o) where jsonb_typeof(v) = 'object' loop
    if coalesce(x->>'tipo', '') not in ('ferramenta', 'pergunta', 'criterio_decisao') then p := p || format('roteiro_proxima_consulta[%s]: tipo invalido', i); end if;
    if coalesce(x->>'texto', '') ~ cheio then p := p || format('roteiro_proxima_consulta[%s]: falta texto', i); end if;
  end loop;
  -- ferramentas: ate 3, IDs do catalogo PP-V1, sem duplicatas, exatamente 1 principal, nunca uma concluida no encontro
  if jsonb_typeof(r->'ferramentas_recomendadas') = 'array' and jsonb_array_length(r->'ferramentas_recomendadas') > 3 then
    p := p || format('ferramentas_recomendadas: no maximo 3 (veio %s)', jsonb_array_length(r->'ferramentas_recomendadas'));
  end if;
  select coalesce(array_agg(lower(btrim(v->>'ferramenta'))), '{}') into concl
    from jsonb_array_elements(case when jsonb_typeof(r->'ferramentas_ja_aplicadas') = 'array' then r->'ferramentas_ja_aplicadas' else '[]' end) v
   where jsonb_typeof(v) = 'object' and v->>'situacao' = 'concluida';
  n := 0;
  for x in select v from jsonb_array_elements(case when jsonb_typeof(r->'ferramentas_recomendadas') = 'array' then r->'ferramentas_recomendadas' else '[]' end) v where jsonb_typeof(v) = 'object' loop
    n := n + 1;
    rid := coalesce(x->>'regra_id', ''); nome := lower(btrim(coalesce(x->>'ferramenta', '')));
    if rid !~ '^REC-(FUN|AIN|MET|DTL|MEE)-0[1-6]$' then p := p || format('ferramenta "%s": regra_id fora do catalogo PP-V1 (%s)', x->>'ferramenta', rid); end if;
    if rid = any(vid) or (nome <> '' and nome = any(vnome)) then p := p || format('ferramenta duplicada: %s %s', rid, x->>'ferramenta'); end if;
    vid := vid || rid; if nome <> '' then vnome := vnome || nome; end if;
    if coalesce(x->>'papel', '') not in ('principal', 'complementar') then p := p || format('ferramenta %s: papel deve ser principal ou complementar', rid); end if;
    if x->>'papel' = 'principal' then principais := principais + 1; end if;
    if nome <> '' and nome = any(concl) then p := p || format('ferramenta "%s" ja foi concluida neste atendimento', x->>'ferramenta'); end if;
  end loop;
  if n > 0 and principais <> 1 then p := p || 'ferramentas_recomendadas: deve haver exatamente 1 principal'::text; end if;
  -- direcionamentos
  for x, i in select v, o - 1 from jsonb_array_elements(case when jsonb_typeof(r->'direcionamentos') = 'array' then r->'direcionamentos' else '[]' end) with ordinality e(v, o) where jsonb_typeof(v) = 'object' loop
    k := coalesce(x->>'id', '');
    if k !~ '^D[0-9]+$' then p := p || format('direcionamentos[%s]: id deve ser D1, D2...', i);
    elsif k = any(idsd) then p := p || format('direcionamento %s repetido', k); end if;
    idsd := idsd || k;
    if coalesce(x->>'titulo', '') ~ cheio then p := p || format('direcionamento %s: falta o titulo', coalesce(nullif(k, ''), i::text)); end if;
    if jsonb_typeof(x->'baseado_em') is distinct from 'array' or jsonb_array_length(x->'baseado_em') = 0 then p := p || format('direcionamento %s sem "baseado_em"', coalesce(nullif(k, ''), i::text)); end if;
    if x->>'status' is distinct from 'SUGERIDO' then p := p || format('direcionamento %s: status deve ser SUGERIDO', coalesce(nullif(k, ''), i::text)); end if;
    if x ? 'territorio' and jsonb_typeof(x->'territorio') <> 'null' and coalesce(x->>'territorio', '') not in ('Corpo', 'Mente', 'Espírito') then
      p := p || format('direcionamento %s: territorio invalido', coalesce(nullif(k, ''), i::text)); end if;
  end loop;
  -- estrategias
  for x, i in select v, o - 1 from jsonb_array_elements(case when jsonb_typeof(r->'estrategias') = 'array' then r->'estrategias' else '[]' end) with ordinality e(v, o) where jsonb_typeof(v) = 'object' loop
    eid := coalesce(x->>'id', '');
    if eid !~ '^E[0-9]+$' then p := p || format('estrategias[%s]: id deve ser E1, E2...', i);
    elsif eid = any(idse) then p := p || format('estrategia %s repetida', eid); end if;
    idse := idse || eid; terre := terre || jsonb_build_object(eid, x->'territorio');
    if coalesce(x->>'titulo', '') ~ cheio then p := p || format('estrategia %s: falta o titulo', coalesce(nullif(eid, ''), i::text)); end if;
    if coalesce(x->>'classificacao', '') not in ('observacao', 'comportamental_metodologica', 'requer_decisao_profissional_na_conduta') then
      p := p || format('estrategia %s: classificacao invalida (%s)', coalesce(nullif(eid, ''), i::text), x->>'classificacao'); end if;
    if coalesce(x->>'territorio', '') not in ('Corpo', 'Mente', 'Espírito') then p := p || format('estrategia %s: territorio invalido', coalesce(nullif(eid, ''), i::text)); end if;
    if jsonb_typeof(x->'baseado_em') is distinct from 'array' or jsonb_array_length(x->'baseado_em') = 0 then p := p || format('estrategia %s sem "baseado_em"', coalesce(nullif(eid, ''), i::text)); end if;
    if x->>'status' is distinct from 'SUGERIDO' then p := p || format('estrategia %s: status deve ser SUGERIDO', coalesce(nullif(eid, ''), i::text)); end if;
    if coalesce(x->>'direcionamento_id', '') <> '' and not ((x->>'direcionamento_id') = any(idsd)) then
      p := p || format('estrategia %s aponta para direcionamento inexistente %s', coalesce(nullif(eid, ''), i::text), x->>'direcionamento_id'); end if;
    if coalesce(x->>'origem', '') not in ('acordada', 'nova') then p := p || format('estrategia %s: origem deve ser acordada ou nova', coalesce(nullif(eid, ''), i::text)); end if;
    if not x ? 'decisao_sugerida' then p := p || format('estrategia %s: falta decisao_sugerida', coalesce(nullif(eid, ''), i::text)); end if;
    dec := x->>'decisao_sugerida';
    if x->>'origem' = 'nova' and dec is not null then p := p || format('estrategia %s e nova: decisao_sugerida deve ser null', coalesce(nullif(eid, ''), i::text)); end if;
    if x->>'origem' = 'acordada' and tipo = 'primeira_consulta' and dec is distinct from manter_obs then
      p := p || format('estrategia %s: na primeira consulta a decisao e "%s"', coalesce(nullif(eid, ''), i::text), manter_obs); end if;
    if x->>'origem' = 'acordada' and tipo = 'retorno' and coalesce(dec, '') not in ('MANTER', 'AJUSTAR', 'SUBSTITUIR', 'CONCLUIR', 'ENCERRAR', manter_obs) then
      p := p || format('estrategia %s: decisao de retorno invalida (%s)', coalesce(nullif(eid, ''), i::text), dec); end if;
  end loop;
  -- Corpo / Mente / Espirito
  foreach k in array array['corpo', 'mente', 'espirito'] loop
    if not r ? k then continue; end if;
    t := r->k; terr := case k when 'corpo' then 'Corpo' when 'mente' then 'Mente' else 'Espírito' end;
    if jsonb_typeof(t) <> 'object' then p := p || format('"%s" deve ser objeto {situacao, resumo, estrategias}', k); continue; end if;
    if coalesce(t->>'situacao', '') not in ('com_material', 'nao_aprofundado') then p := p || format('%s: situacao deve ser com_material ou nao_aprofundado', k); end if;
    if jsonb_typeof(t->'resumo') is distinct from 'string' then p := p || format('%s: resumo deve ser texto', k);
    elsif t->>'situacao' = 'nao_aprofundado' and left(t->>'resumo', length('Ainda não aprofundado nesta etapa.')) <> 'Ainda não aprofundado nesta etapa.' then
      p := p || format('%s: sem material, o resumo comeca com "Ainda não aprofundado nesta etapa."', k); end if;
    if jsonb_typeof(t->'estrategias') is distinct from 'array' then p := p || format('%s: estrategias deve ser lista', k);
    else
      for eid in select v #>> '{}' from jsonb_array_elements(t->'estrategias') v loop
        if not (eid = any(idse)) then p := p || format('%s cita estrategia inexistente %s', k, eid);
        elsif terre->>eid is distinct from terr then p := p || format('%s cita %s, que e do territorio %s', k, eid, terre->>eid); end if;
      end loop;
    end if;
  end loop;
  return p;
end;
$$;
revoke all on function public.holos_ai_problemas(jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- RPC importar: valida TUDO antes de gravar (JSON invalido / schema incompativel / estrutura invalida -> nada e salvo).
-- Nova importacao no mesmo atendimento = nova versao; as anteriores ficam como estao (nunca sobrescritas).
-- ----------------------------------------------------------------------------
create or replace function public.importar_holos_ai(p_encounter_id uuid, p_texto text, p_operation_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); enc record; v jsonb; probs text[]; v_id uuid; v_versao int; k text; x jsonb; i int; n int := 0;
  secoes text[] := array['sintese_integrada', 'o_que_apareceu', 'convergencias', 'padroes_observados', 'pontos_para_aprofundar', 'sistemas_prioritarios',
    'ferramentas_ja_aplicadas', 'ferramentas_recomendadas', 'direcionamentos', 'estrategias', 'corpo', 'mente', 'espirito', 'o_que_observar',
    'plano_acompanhamento', 'roteiro_proxima_consulta', 'proxima_etapa', 'rascunho_paciente', 'alertas_profissionais', 'fontes_utilizadas'];
  existente record;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  if p_operation_id is not null then
    select id, versao into existente from public.holos_ai_imports where nutritionist_id = uid and operation_id = p_operation_id;
    if found then return jsonb_build_object('id', existente.id, 'versao', existente.versao, 'repetida', true); end if;
  end if;
  select e.id, e.patient_id into enc from public.encounters e where e.id = p_encounter_id and e.nutritionist_id = uid;
  if not found then raise exception 'atendimento nao encontrado' using errcode = 'P0001', hint = 'atendimento_obrigatorio'; end if;
  if p_texto is null or length(btrim(p_texto)) < 2 then raise exception 'cole o JSON HOLOS_AI_RESULT' using errcode = '22023', hint = 'json_invalido'; end if;
  if length(p_texto) > 400000 then raise exception 'texto grande demais' using errcode = '22023', hint = 'json_invalido'; end if;
  v := public.holos_ai_extrair(p_texto);
  probs := public.holos_ai_problemas(v);
  if v->'schema_version' is not null and v->'schema_version' is distinct from '1'::jsonb then
    raise exception '%', probs[1] using errcode = '22023', hint = 'schema_incompativel';
  end if;
  if coalesce(array_length(probs, 1), 0) > 0 then
    raise exception 'HOLOS_AI_RESULT invalido (% problema(s)): %', array_length(probs, 1), array_to_string(probs[1:12], ' | ')
      using errcode = '22023', hint = 'resultado_invalido';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('holos_ai:' || p_encounter_id::text, 0));
  select coalesce(max(versao), 0) + 1 into v_versao from public.holos_ai_imports where encounter_id = p_encounter_id;
  insert into public.holos_ai_imports (nutritionist_id, patient_id, encounter_id, versao, schema_version, tipo, agente, kb_version, entrada,
      texto_original, json_original, texto_sha256, operation_id)
    values (uid, enc.patient_id, p_encounter_id, v_versao, 1, v->>'tipo', left(v#>>'{meta,agente}', 200), left(v#>>'{meta,kb_version}', 400),
      case when jsonb_typeof(v->'entrada') = 'object' then v->'entrada' end,
      p_texto, v, encode(sha256(convert_to(p_texto, 'UTF8')), 'hex'), p_operation_id)
    returning id into v_id;
  -- um item por elemento de cada secao (nunca um textao unico)
  foreach k in array secoes loop
    if not v ? k then continue; end if;
    if k in ('sintese_integrada', 'proxima_etapa', 'rascunho_paciente') then
      if btrim(coalesce(v->>k, '')) <> '' then
        insert into public.holos_ai_import_items (import_id, nutritionist_id, patient_id, secao, ordem, valor_ia, so_profissional)
          values (v_id, uid, enc.patient_id, k, 0, v->k, public.holos_ai_so_profissional(k));
        n := n + 1;
      end if;
    elsif k in ('corpo', 'mente', 'espirito') then
      insert into public.holos_ai_import_items (import_id, nutritionist_id, patient_id, secao, ordem, valor_ia, so_profissional)
        values (v_id, uid, enc.patient_id, k, 0, v->k, public.holos_ai_so_profissional(k));
      n := n + 1;
    else
      for x, i in select e.val, e.o - 1 from jsonb_array_elements(v->k) with ordinality e(val, o) loop
        insert into public.holos_ai_import_items (import_id, nutritionist_id, patient_id, secao, ordem, chave, valor_ia, so_profissional)
          values (v_id, uid, enc.patient_id, k, i, case when jsonb_typeof(x) = 'object' and jsonb_typeof(x->'id') = 'string' then left(x->>'id', 64) end,
            x, public.holos_ai_so_profissional(k));
        n := n + 1;
      end loop;
    end if;
  end loop;
  return jsonb_build_object('id', v_id, 'versao', v_versao, 'itens', n, 'repetida', false);
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC revisar item: confirmar / editar (so campos de texto) / descartar / voltar a sugerido; compartilhar so o que pode
-- ----------------------------------------------------------------------------
create or replace function public.revisar_item_holos_ai(p_item_id uuid, p_estado text, p_valor jsonb default null, p_compartilhar boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); it record; imp record; editaveis text[]; k text; novo jsonb;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  select * into it from public.holos_ai_import_items where id = p_item_id and nutritionist_id = uid;
  if not found then raise exception 'item nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  select * into imp from public.holos_ai_imports where id = it.import_id;
  if imp.status not in ('importado', 'em_revisao') then
    raise exception 'revisao encerrada: a importacao esta %', imp.status using errcode = 'P0001', hint = 'holos_ai_revisao_encerrada';
  end if;
  if coalesce(p_estado, '') not in ('sugerido', 'confirmado', 'editado', 'descartado') then
    raise exception 'estado invalido' using errcode = '22023', hint = 'holos_ai_estado_invalido';
  end if;
  if coalesce(p_compartilhar, false) and (it.so_profissional or p_estado not in ('confirmado', 'editado')) then
    raise exception 'este item nao pode ir para a paciente (so profissional ou nao confirmado)' using errcode = 'P0001', hint = 'holos_ai_so_profissional';
  end if;
  if p_estado = 'editado' then
    if p_valor is null or jsonb_typeof(p_valor) = 'null' then raise exception 'edicao sem valor' using errcode = '22023', hint = 'holos_ai_edicao_invalida'; end if;
    if jsonb_typeof(it.valor_ia) = 'string' then
      if jsonb_typeof(p_valor) <> 'string' or btrim(p_valor #>> '{}') = '' or length(p_valor #>> '{}') > 5000 then
        raise exception 'o texto editado e obrigatorio (ate 5000 caracteres)' using errcode = '22023', hint = 'holos_ai_edicao_invalida';
      end if;
      novo := to_jsonb(btrim(p_valor #>> '{}'));
    else
      editaveis := case it.secao when 'direcionamentos' then array['titulo', 'por_que', 'objetivo']
        when 'estrategias' then array['titulo', 'o_que_fazer', 'o_que_observar', 'prazo', 'criterio_sucesso']
        when 'corpo' then array['resumo'] when 'mente' then array['resumo'] when 'espirito' then array['resumo']
        else array['texto'] end;
      if jsonb_typeof(p_valor) <> 'object' then raise exception 'edicao deve trazer os campos de texto' using errcode = '22023', hint = 'holos_ai_edicao_invalida'; end if;
      for k in select jsonb_object_keys(p_valor) loop
        if not (k = any(editaveis)) or jsonb_typeof(p_valor->k) <> 'string' or length(p_valor->>k) > 5000
           or (k in ('titulo', 'texto', 'resumo') and btrim(p_valor->>k) = '') then
          raise exception 'campo % nao pode ser editado assim (so textos: %)', k, array_to_string(editaveis, ', ') using errcode = '22023', hint = 'holos_ai_edicao_invalida';
        end if;
      end loop;
      novo := it.valor_ia || p_valor;
    end if;
  end if;
  update public.holos_ai_import_items set estado = p_estado, valor_profissional = case when p_estado = 'editado' then novo end,
      compartilhar = coalesce(p_compartilhar, false) and p_estado in ('confirmado', 'editado') and not it.so_profissional,
      revisado_em = case when p_estado = 'sugerido' then null else now() end
    where id = p_item_id;
  if imp.status = 'importado' then
    update public.holos_ai_imports set status = 'em_revisao', revisao_iniciada_em = now() where id = imp.id;
  end if;
  return (select to_jsonb(x) - 'nutritionist_id' - 'patient_id' from public.holos_ai_import_items x where x.id = p_item_id);
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC concluir revisao: todo item decidido (nada fica so "sugerido") e pelo menos um aceito -> CONFIRMADO (final)
-- ----------------------------------------------------------------------------
create or replace function public.concluir_revisao_holos_ai(p_import_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); imp record; pend int; aceitos int;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  select * into imp from public.holos_ai_imports where id = p_import_id and nutritionist_id = uid for update;
  if not found then raise exception 'importacao nao encontrada' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if imp.status not in ('importado', 'em_revisao') then
    raise exception 'a importacao ja esta %', imp.status using errcode = 'P0001', hint = 'holos_ai_revisao_encerrada';
  end if;
  select count(*) filter (where estado = 'sugerido'), count(*) filter (where estado in ('confirmado', 'editado')) into pend, aceitos
    from public.holos_ai_import_items where import_id = p_import_id;
  if pend > 0 then
    raise exception 'ainda ha % item(ns) sem revisao: confirme, edite ou descarte cada um', pend using errcode = 'P0001', hint = 'holos_ai_revisao_incompleta';
  end if;
  if aceitos = 0 then
    raise exception 'nenhum item confirmado: descarte a importacao em vez de concluir' using errcode = 'P0001', hint = 'holos_ai_nada_confirmado';
  end if;
  update public.holos_ai_imports set status = 'confirmado', concluida_em = now(),
      revisao_iniciada_em = coalesce(revisao_iniciada_em, now()) where id = p_import_id;
  return jsonb_build_object('id', p_import_id, 'status', 'confirmado', 'aceitos', aceitos);
end;
$$;

-- RPC descartar a importacao inteira (fica no historico; nada vai para o Resultado)
create or replace function public.descartar_importacao_holos_ai(p_import_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); imp record;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  select * into imp from public.holos_ai_imports where id = p_import_id and nutritionist_id = uid for update;
  if not found then raise exception 'importacao nao encontrada' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if imp.status not in ('importado', 'em_revisao') then
    raise exception 'a importacao ja esta %', imp.status using errcode = 'P0001', hint = 'holos_ai_revisao_encerrada';
  end if;
  update public.holos_ai_imports set status = 'descartado', descartada_em = now() where id = p_import_id;
  return jsonb_build_object('id', p_import_id, 'status', 'descartado');
end;
$$;

revoke all on function public.importar_holos_ai(uuid, text, uuid) from public, anon;
revoke all on function public.revisar_item_holos_ai(uuid, text, jsonb, boolean) from public, anon;
revoke all on function public.concluir_revisao_holos_ai(uuid) from public, anon;
revoke all on function public.descartar_importacao_holos_ai(uuid) from public, anon;
grant execute on function public.importar_holos_ai(uuid, text, uuid) to authenticated;
grant execute on function public.revisar_item_holos_ai(uuid, text, jsonb, boolean) to authenticated;
grant execute on function public.concluir_revisao_holos_ai(uuid) to authenticated;
grant execute on function public.descartar_importacao_holos_ai(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Resultado HOLOS (template 5): itens da HOLOS AI na direcao (origem/ref holos_ai) — mesmas funcoes de 20261021100000,
-- com 'holos_ai' na lista de origens e de referencias e a conferencia do item importado.
-- ----------------------------------------------------------------------------
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
  if coalesce(it->>'origem', '') not in ('relato_paciente', 'observacao_profissional', 'holoscan', 'ferramenta', 'conduta', 'acordo', 'nutricionista', 'resultado_anterior', 'holos_ai') then
    raise exception 'origem do item invalida' using errcode = '22023', hint = 'direcao_invalida';
  end if;
  foreach k in array array['sugestao', 'confirmado', 'mostrar_paciente', 'descartado'] loop
    if it ? k and jsonb_typeof(it->k) <> 'boolean' then raise exception 'campo % deve ser booleano', k using errcode = '22023', hint = 'direcao_invalida'; end if;
  end loop;
  r := it->'ref';
  if r is not null and jsonb_typeof(r) <> 'null' then
    if jsonb_typeof(r) <> 'object' or coalesce(r->>'tipo', '') not in ('anamnese', 'conduta', 'acordo', 'ferramenta', 'holoscan', 'resultado', 'atendimento', 'holos_ai')
       or coalesce(r->>'id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or (r ? 'campo' and jsonb_typeof(r->'campo') not in ('string', 'null')) or length(coalesce(r->>'campo', '')) > 80
       or exists (select 1 from jsonb_object_keys(r) x where x not in ('tipo', 'id', 'campo')) then
      raise exception 'referencia do item invalida' using errcode = '22023', hint = 'direcao_invalida';
    end if;
    -- HOLOS AI: item vindo da HOLOS AI sempre aponta para o item importado (ref holos_ai, campo = id do item)
    if (it->>'origem' = 'holos_ai') <> (r->>'tipo' = 'holos_ai')
       or (r->>'tipo' = 'holos_ai' and coalesce(r->>'campo', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
      raise exception 'item da HOLOS AI precisa da referencia ao item importado' using errcode = '22023', hint = 'direcao_invalida';
    end if;
  elsif it->>'origem' = 'holos_ai' then
    raise exception 'item da HOLOS AI precisa da referencia ao item importado' using errcode = '22023', hint = 'direcao_invalida';
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

create or replace function public.resultado_holos_validar_direcao(uid uuid, v_pid uuid, d jsonb)
returns void language plpgsql stable security definer set search_path = '' as $$
declare k text; it jsonb; tb text; ok boolean; rid text; hi record;
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
      when 'atendimento' then 'encounters' when 'holos_ai' then 'holos_ai_imports' end;
    execute format('select exists (select 1 from public.%I where id = $1 and patient_id = $2 and nutritionist_id = $3)', tb)
      into ok using (it#>>'{ref,id}')::uuid, v_pid, uid;
    if not ok then raise exception 'referencia de outra paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  -- HOLOS AI: so o que a nutricionista ACEITOU na revisao (confirmado/editado) de uma importacao CONCLUIDA entra confirmado;
  -- item so profissional (hipotese, alerta, fonte, raciocinio...) nunca vai para a paciente; descartado nunca entra confirmado.
  for it in select r from public.resultado_holos_itens(d) x(r) where r#>>'{ref,tipo}' = 'holos_ai' loop
    select i.estado, i.so_profissional, m.status into hi
      from public.holos_ai_import_items i join public.holos_ai_imports m on m.id = i.import_id
     where m.id = (it#>>'{ref,id}')::uuid and i.id = (it#>>'{ref,campo}')::uuid and m.patient_id = v_pid and m.nutritionist_id = uid;
    if not found then raise exception 'item da HOLOS AI de outra paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if hi.status <> 'confirmado' then
      raise exception 'a revisao desta importacao HOLOS AI ainda nao foi concluida' using errcode = 'P0001', hint = 'holos_ai_nao_concluida';
    end if;
    if it->'confirmado' = 'true'::jsonb and hi.estado not in ('confirmado', 'editado') then
      raise exception 'item da HOLOS AI descartado ou nao revisado nao entra confirmado' using errcode = 'P0001', hint = 'holos_ai_item_nao_aceito';
    end if;
    if hi.so_profissional and (it->'mostrar_paciente' = 'true'::jsonb or (it = d->'foco_atual' and it->'confirmado' = 'true'::jsonb)) then
      raise exception 'item so profissional da HOLOS AI nao vai para a paciente' using errcode = 'P0001', hint = 'holos_ai_so_profissional';
    end if;
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

commit;
