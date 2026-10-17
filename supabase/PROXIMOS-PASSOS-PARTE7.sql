-- =====================================================================
-- PROXIMOS PASSOS HOLOS V1 — PARTE 7 de 8 — rodar INTEIRA no SQL Editor (uma transacao).
-- RPCs para a aplicacao: proximos_passos_holos (previa) e registrar_proximos_passos (snapshot).
-- Rode as partes NA ORDEM (1 a 8). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez ("if not exists" / "create or replace"; a semente so entra uma vez).
-- NAO DESTRUTIVA: nenhum dado clinico e alterado; HOLOS-V1@2 (methodology_*) nao e tocado.
-- Conteudo identico a supabase/migrations/20261012100000_proximos_passos_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regprocedure('public.proximos_passos_calcular(uuid, uuid)') is null or to_regprocedure('public.proximos_passos_escolher(uuid, text, text[], text[])') is null then raise exception 'rode a PARTE 6 antes (funcoes do motor nao existem)'; end if;
end $$;
-- previa (sem gravar): o que o motor recomenda hoje, pelo catalogo aprovado mais recente
create or replace function public.proximos_passos_holos(p_application_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); r jsonb; reg record;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  r := public.proximos_passos_calcular(uid, p_application_id);
  select n.id, n.created_at into reg from public.holos_next_steps n where n.nutritionist_id = uid and n.holoscan_application_id = p_application_id and n.catalog_id = (r#>>'{catalogo,id}')::uuid;
  return r || jsonb_build_object('registrado', found, 'registro_id', reg.id, 'registrado_em', reg.created_at);
end;
$$;
revoke all on function public.proximos_passos_holos(uuid) from public, anon;
grant execute on function public.proximos_passos_holos(uuid) to authenticated;

-- registra (uma vez por aplicacao e catalogo). Se ja existe, devolve o registrado — nunca reescreve.
create or replace function public.registrar_proximos_passos(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); r jsonb; reg record; h text; cid uuid;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  r := public.proximos_passos_calcular(uid, p_application_id);
  cid := (r#>>'{catalogo,id}')::uuid;
  select n.* into reg from public.holos_next_steps n where n.nutritionist_id = uid and n.holoscan_application_id = p_application_id and n.catalog_id = cid;
  if found then
    return reg.content_snapshot || jsonb_build_object('registrado', true, 'registro_id', reg.id, 'registrado_em', reg.created_at);
  end if;
  r := r - 'registrado' - 'registro_id' - 'registrado_em';
  h := encode(sha256(convert_to(r::text, 'UTF8')), 'hex');
  insert into public.holos_next_steps (nutritionist_id, patient_id, encounter_id, holoscan_application_id, catalog_id, catalog_code, catalog_version, catalog_hash,
    engine_version, systems_order, selection, content_snapshot, content_hash)
  values (uid, (r->>'patient_id')::uuid, nullif(r->>'encounter_id', '')::uuid, p_application_id, cid, r#>>'{catalogo,code}', (r#>>'{catalogo,version}')::int, r#>>'{catalogo,content_hash}',
    r->>'engine_version', r->'systems_order', r->'selection', r, h)
  returning * into reg;
  return reg.content_snapshot || jsonb_build_object('registrado', true, 'registro_id', reg.id, 'registrado_em', reg.created_at);
end;
$$;
revoke all on function public.registrar_proximos_passos(uuid) from public, anon;
grant execute on function public.registrar_proximos_passos(uuid) to authenticated;

commit;
