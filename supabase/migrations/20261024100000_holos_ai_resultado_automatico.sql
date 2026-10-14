-- ============================================================================
-- HOLOS AI -> Resultado HOLOS automatico (simplificacao definitiva, 14/10/2026)
-- Aditiva sobre 20261023100000 (ponte). NAO muda HOLOSCAN, schema v1, validacao, imutabilidade nem a segregacao.
--
-- O que muda: depois de importar um HOLOS_AI_RESULT valido, a nutricionista nao revisa item a item.
-- A RPC aceitar_importacao_holos_ai aplica a REGRA FIXA do metodo de uma vez:
--   - todo item ainda "sugerido" passa a "confirmado" (o valor da IA fica identico; nada e editado);
--   - compartilhar = elegivel para a paciente: secao que NAO e so profissional, e estrategia que NAO
--     "requer decisao profissional na Conduta" (essa fica interna ate a nutricionista decidir na Conduta);
--   - hipoteses, conflitos, alertas, fontes, raciocinio, sistemas, ferramentas, roteiro e rascunho
--     continuam so profissionais (holos_ai_so_profissional) e o servidor continua recusando leva-los a paciente;
--   - a importacao fica "confirmado" com aceite = 'automatico' (rastreavel; a revisao manual antiga = 'revisao').
-- O JSON original continua imutavel e versionado; o historico (inclusive o descartado) continua.
-- ============================================================================
begin;

alter table public.holos_ai_imports add column if not exists aceite text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'holos_ai_imports_aceite') then
    alter table public.holos_ai_imports add constraint holos_ai_imports_aceite check (aceite is null or aceite in ('revisao', 'automatico'));
  end if;
end $$;
comment on column public.holos_ai_imports.aceite is
  'Como a importacao foi aceita: automatico (regra fixa do metodo, sem revisao item a item) ou revisao (revisao manual antiga). Imutavel depois de gravado.';

-- mesmo gatilho de 20261023100000 + o aceite: so e gravado uma vez, junto com a confirmacao
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
  if new.aceite is distinct from old.aceite and (old.aceite is not null or new.status <> 'confirmado' or old.status = 'confirmado') then
    raise exception 'o aceite da importacao HOLOS AI e gravado uma vez, na confirmacao' using errcode = 'P0001', hint = 'holos_ai_imutavel';
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

-- regra fixa: o que pode ir para a paciente (mesma regra no front: HolosAIContrato.elegivelPaciente)
create or replace function public.holos_ai_elegivel_paciente(p_secao text, p_valor jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select not public.holos_ai_so_profissional(p_secao)
     and not (p_secao = 'estrategias' and coalesce(p_valor->>'classificacao', '') = 'requer_decisao_profissional_na_conduta');
$$;
revoke all on function public.holos_ai_elegivel_paciente(text, jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- RPC aceitar: importacao valida -> confirmada pela regra fixa, sem revisao item a item. Idempotente.
-- ----------------------------------------------------------------------------
create or replace function public.aceitar_importacao_holos_ai(p_import_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); imp record; aceitos int; compart int;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  select * into imp from public.holos_ai_imports where id = p_import_id and nutritionist_id = uid for update;
  if not found then raise exception 'importacao nao encontrada' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if imp.status = 'confirmado' then
    -- repetir o clique (ou a rede) nao muda nada
    select count(*) filter (where estado in ('confirmado', 'editado')), count(*) filter (where compartilhar) into aceitos, compart
      from public.holos_ai_import_items where import_id = p_import_id;
    return jsonb_build_object('id', p_import_id, 'status', 'confirmado', 'aceite', imp.aceite, 'aceitos', aceitos, 'compartilhados', compart, 'repetida', true);
  end if;
  if imp.status <> 'importado' and imp.status <> 'em_revisao' then
    raise exception 'a importacao ja esta %', imp.status using errcode = 'P0001', hint = 'holos_ai_revisao_encerrada';
  end if;
  update public.holos_ai_import_items
     set estado = 'confirmado', valor_profissional = null,
         compartilhar = public.holos_ai_elegivel_paciente(secao, valor_ia), revisado_em = now()
   where import_id = p_import_id and estado = 'sugerido';
  select count(*) filter (where estado in ('confirmado', 'editado')), count(*) filter (where compartilhar) into aceitos, compart
    from public.holos_ai_import_items where import_id = p_import_id;
  if aceitos = 0 then
    raise exception 'nenhum item para aceitar: descarte a importacao' using errcode = 'P0001', hint = 'holos_ai_nada_confirmado';
  end if;
  update public.holos_ai_imports set status = 'confirmado', aceite = 'automatico', concluida_em = now(),
      revisao_iniciada_em = coalesce(revisao_iniciada_em, now()) where id = p_import_id;
  return jsonb_build_object('id', p_import_id, 'status', 'confirmado', 'aceite', 'automatico', 'aceitos', aceitos, 'compartilhados', compart, 'repetida', false);
end;
$$;
revoke all on function public.aceitar_importacao_holos_ai(uuid) from public, anon;
grant execute on function public.aceitar_importacao_holos_ai(uuid) to authenticated;

commit;
