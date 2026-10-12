-- PUBLICACAO DIRETA DO HOLOSCAN — PARTE 1 de 2 (SQL Editor do Supabase)
-- Igual a supabase/migrations/20261018100000_publicacao_direta_metodologia.sql. Pode rodar duas vezes.
-- Rode a parte inteira de uma vez. O ultimo select mostra o resultado: tem de sair tudo "true".
-- pre-checagem (so leitura): o v2 esta aprovado e o responsavel metodologico esta ativo
select (select count(*) from public.methodology_packages where code = 'HOLOS-V1' and version = 2 and status in ('aprovado','retirado')) = 1 as v2_existe,
       (select count(*) from public.methodology_approvers where scope = 'holoscan' and approval_stage = 1 and active) = 1 as responsavel_ativo;

begin;
-- 1. regime novo: publicacao_direta (sem segundo revisor, como o aprovador_unico)
alter table public.methodology_packages drop constraint if exists methodology_packages_regime_valido;
alter table public.methodology_packages add constraint methodology_packages_regime_valido
  check (governance_regime is null or governance_regime in ('dupla_aprovacao', 'aprovador_unico', 'publicacao_direta'));
alter table public.methodology_packages drop constraint if exists methodology_packages_aprovado_completo;
alter table public.methodology_packages add constraint methodology_packages_aprovado_completo check (
  status not in ('aprovado','retirado') or (
    content_hash is not null and responsible is not null and effective_from is not null
    and approved_at is not null and approved_by is not null
    and (
      (governance_regime in ('aprovador_unico', 'publicacao_direta') and reviewed_by is null and reviewed_at is null)
      or (coalesce(governance_regime, 'dupla_aprovacao') = 'dupla_aprovacao' and reviewed_by is not null and reviewed_at is not null))));


-- 2. publicar: em_revisao -> aprovado (vigente hoje) e a versao anterior -> retirado (ate ontem)
create or replace function public.publicar_pacote_metodologico(p_package_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); pk public.methodology_packages%rowtype; ant public.methodology_packages%rowtype;
  v jsonb; h text; ap public.methodology_approvers; resp text; ult integer; retiradas uuid[] := '{}';
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  ap := public.aprovador_autorizado('holoscan', 1);
  if ap.id is null then
    raise exception 'so o responsavel metodologico do HOLOSCAN publica uma versao nova' using errcode = 'P0001', hint = 'publicador_nao_autorizado';
  end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then
    raise exception 'so um pacote em_revisao pode ser publicado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido';
  end if;
  select max(p.version) into ult from public.methodology_packages p
    where p.code = pk.code and p.nutritionist_id = uid and p.status in ('aprovado', 'retirado');
  if ult is not null and pk.version <> ult + 1 then
    raise exception 'a versao publicada tem de ser a seguinte (% v%), nao v%', pk.code, ult + 1, pk.version using errcode = 'P0001', hint = 'versao_fora_de_ordem';
  end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'publicacao bloqueada pelo validador: % erro(s) — %', v->>'total_erros', left((v->'erros')::text, 400) using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  h := public.metodologia_hash_conteudo(p_package_id);
  resp := coalesce(nullif(btrim(ap.display_name), ''), 'responsável metodológico') || ' (publicação direta)';

  -- a(s) versao(oes) anterior(es) do mesmo codigo saem do ar ontem: hoje so a nova vale
  for ant in select * from public.methodology_packages p
      where p.code = pk.code and p.nutritionist_id = uid and p.status = 'aprovado' and p.id <> p_package_id for update loop
    insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, source, justification)
    values (uid, ant.id, 'pacote', ant.code, ant.version::text, 'retirado', resp, current_date, 'publicacao direta',
      'substituída por ' || pk.code || ' v' || pk.version);
    update public.methodology_packages set status = 'retirado', retired_at = now(),
      retired_reason = 'substituída por ' || pk.code || ' v' || pk.version,
      effective_to = greatest(ant.effective_from, current_date - 1)
      where id = ant.id;
    retiradas := retiradas || ant.id;
  end loop;

  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, source, justification, evidence)
  values (uid, p_package_id, 'pacote', pk.code, pk.version::text, 'aprovado', resp, current_date, 'publicacao direta',
    'Publicação direta (regime publicacao_direta, sem etapa de aprovação)',
    'content_hash ' || h || '; validar_pacote_metodologico: 0 erros');
  perform set_config('holohacking.aprovacao_rpc', p_package_id::text, true);
  update public.methodology_packages set status = 'aprovado', governance_regime = 'publicacao_direta',
    approved_at = now(), approved_by = uid, reviewed_by = null, reviewed_at = null,
    responsible = resp, justification = coalesce(justification, 'publicação direta'),
    effective_from = current_date, effective_to = null, content_hash = h
    where id = p_package_id;
  perform set_config('holohacking.aprovacao_rpc', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'regime', 'publicacao_direta', 'content_hash', h,
    'effective_from', current_date, 'retiradas', to_jsonb(retiradas), 'validacao', v);
end;
$$;
revoke all on function public.publicar_pacote_metodologico(uuid) from public, anon;
grant execute on function public.publicar_pacote_metodologico(uuid) to authenticated;

commit;

select pg_get_constraintdef(c.oid) like '%publicacao_direta%' as regime_aceita_publicacao_direta,
       (select count(*) from pg_constraint where conname = 'methodology_packages_aprovado_completo' and pg_get_constraintdef(oid) like '%publicacao_direta%') = 1 as aprovado_completo_ok,
       has_function_privilege('authenticated', 'public.publicar_pacote_metodologico(uuid)', 'execute') as authenticated_publica,
       not has_function_privilege('anon', 'public.publicar_pacote_metodologico(uuid)', 'execute') as anon_nao_publica,
       (select count(*) from public.methodology_packages where code = 'HOLOS-V1' and version = 2 and status = 'aprovado') = 1 as v2_continua_no_ar_ate_o_login
  from pg_constraint c where c.conname = 'methodology_packages_regime_valido';
