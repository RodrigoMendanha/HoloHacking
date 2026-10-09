-- RESULTADO FINAL HOLOS (10/10) — PARTE 2 de 7: Proximos Passos congelados no snapshot (so o registro existente)
-- Rodar INTEIRA e NA ORDEM. Erro = nada aplicado; rode a MESMA parte de novo. Pode repetir sem problema. SOMENTE ADITIVA.
-- Identico a supabase/migrations/20261015100000_resultado_final_holos.sql. A ultima linha antes da conferencia e "commit;".
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $$ begin
  if to_regprocedure('public.resultado_holos_ferramentas(uuid, uuid, jsonb)') is null then raise exception 'rode a PARTE 1 antes (nada foi aplicado)'; end if;
end $$;
-- ----------------------------------------------------------------------------
-- 1c. Proximos Passos do snapshot: SO o registro imutavel ja existente (catalogo mais recente registrado). Nada e
--     calculado: sem registro, o snapshot diz isso (aplicacao anterior ao catalogo nao ganha recomendacao em silencio).
-- ----------------------------------------------------------------------------
create or replace function public.resultado_holos_proximos_passos(uid uuid, p_app uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pp record;
begin
  select n.* into pp from public.holos_next_steps n
    where n.holoscan_application_id = p_app and n.nutritionist_id = uid order by n.catalog_version desc, n.created_at desc limit 1;
  if not found then return jsonb_build_object('registrado', false); end if;
  return jsonb_build_object('registrado', true, 'registro_id', pp.id, 'registrado_em', pp.created_at,
    'catalogo', jsonb_build_object('code', pp.catalog_code, 'version', pp.catalog_version, 'content_hash', pp.catalog_hash),
    'engine_version', pp.engine_version, 'content_hash', pp.content_hash,
    'systems_order', pp.systems_order, 'selection', pp.selection, 'motivo', pp.content_snapshot->'motivo');
end;
$$;
revoke all on function public.resultado_holos_proximos_passos(uuid, uuid) from public, anon, authenticated;
commit;
select 'resultado_holos_proximos_passos' as item, (to_regprocedure('public.resultado_holos_proximos_passos(uuid, uuid)') is not null)::text as valor;
