-- V1 — ETAPA 5.2: GOVERNANCA E DUPLA APROVACAO DA LEITURA INTEGRADA.
-- NAO APLICADA em producao. Entra depois de 130000..220000.
--
-- Mesma governanca humana do Pacote Metodologico HOLOSCAN (migration 20261001210000):
--   Aprovacao 1: responsavel = Daniel  · papel = responsavel primario
--   Aprovacao 2: responsavel = Rodrigo · papel = revisao final
--   ordem obrigatoria Daniel -> Rodrigo; as duas sobre o MESMO package_id, version e content_hash.
--
-- Por que estruturas PROPRIAS (opcao B) e nao a generalizacao da tabela da 4.2:
--   methodology_package_approvals tem FK composta (package_id, nutritionist_id) para methodology_packages
--   (pacote do profissional). O pacote da Leitura Integrada e GLOBAL (sem nutritionist_id) e seu hash cobre
--   entidades que o HOLOSCAN nao tem (referencias metodologicas, conversoes, calculos derivados). Generalizar
--   exigiria alterar a tabela e as funcoes ja aprovadas do HOLOSCAN; espelhar o contrato nao toca nelas.
--   Contrato identico: ordem, pessoas, hash conferido, invalidacao append-only, acao final explicita.
--
-- Regras:
--   1. Nenhuma aprovacao e automatica: so registrar_aprovacao_li escreve; a tabela nao tem GRANT de escrita.
--   2. Aprovacao 2 so existe sobre uma Aprovacao 1 VIGENTE do mesmo package_id, version e content_hash.
--   3. Qualquer mudanca metodologica (pacote: code/version; dominio, vinculo, regra, dependencia;
--      referencia/conversao/derivado REFERENCIADOS) invalida as aprovacoes vigentes (historico mantido,
--      com motivo). Voltar o conteudo ao hash antigo NAO reativa aprovacao invalidada.
--   4. As duas aprovacoes NAO homologam: homologar_pacote_li e o ato final explicito, que exige completude
--      metodologica (li_validar_completude sem bloqueio), hash atual e as duas aprovacoes vigentes.
--   5. status 'aprovado' so por homologar_pacote_li (trigger recusa UPDATE direto); pacote aprovado e
--      imutavel (so pode ser retirado); grava snapshot imutavel do conteudo homologado.
--   6. Nada atribuido a "Liderança do método HOLOSCAN".
--   7. O pacote real LI-V1@1 continua em rascunho, sem dominio, vinculo, regra ou aprovacao.

-- ============================================================================
-- 1. DEPENDENCIAS DO PACOTE (referencias / conversoes / derivados que o pacote USA)
-- ============================================================================
-- Uma referencia, conversao ou calculo derivado so e elegivel para um pacote oficial se estiver
-- referenciado aqui (ou em links.reference_id) — e portanto dentro do hash/snapshot homologado.
create table public.integrated_reading_package_dependencies (
  id          uuid primary key default gen_random_uuid(),
  package_id  uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  kind        text not null,
  ref_id      uuid not null,
  status      text not null default 'rascunho',
  created_at  timestamptz not null default now(),
  constraint irpd_kind check (kind in ('reference','conversion','derived')),
  constraint irpd_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint irpd_unique unique (package_id, kind, ref_id)
);
alter table public.integrated_reading_package_dependencies enable row level security;
create policy irpd_select on public.integrated_reading_package_dependencies for select to authenticated using (true);
revoke all on table public.integrated_reading_package_dependencies from public, anon, authenticated;
grant select on table public.integrated_reading_package_dependencies to authenticated;

-- ============================================================================
-- 2. CONTEUDO CANONICO E HASH
-- ============================================================================
-- Entra tudo o que pode mudar uma saida oficial: identificacao e versao do pacote; dominios; vinculos
-- (exame, variante, material, direcao, referencia resolvida); TODAS as regras (temporal, suficiencia,
-- mistos, convergencia/divergencia, textos e qualquer tipo futuro, com payload integral); dependencias
-- resolvidas (conteudo + versao de referencias, conversoes e derivados). Ordenacao canonica por chaves de
-- negocio; jsonb normaliza a ordem das chaves. Fora: ids, created_at/updated_at, aprovacoes, notes.
create or replace function public.li_conteudo_canonico(p_package_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'package', (select jsonb_build_object('code', p.code, 'version', p.version) from public.integrated_reading_rule_packages p where p.id = p_package_id),
    'domains', (select coalesce(jsonb_agg(jsonb_build_object('code', d.code, 'name', d.name, 'holoscan_system', d.holoscan_system, 'status', d.status) order by d.code), '[]')
                  from public.integrated_reading_domains d where d.package_id = p_package_id),
    'links', (select coalesce(jsonb_agg(jsonb_build_object('domain', d.code, 'exam_code', l.exam_code, 'variant', l.variant, 'material', l.material, 'direction', l.direction, 'status', l.status,
                  'reference', (select to_jsonb(r) - 'id' - 'created_at' - 'updated_at' from public.lab_method_references r where r.id = l.reference_id))
                  order by d.code, l.exam_code, coalesce(l.variant, ''), coalesce(l.material, ''), l.direction), '[]')
                from public.integrated_reading_exam_domain_links l join public.integrated_reading_domains d on d.id = l.domain_id where l.package_id = p_package_id),
    'rules', (select coalesce(jsonb_agg(jsonb_build_object('rule_type', x.rule_type, 'target', x.target, 'payload', x.payload, 'status', x.status) order by x.rule_type, x.target), '[]')
                from public.integrated_reading_rules x where x.package_id = p_package_id),
    'dependencies', (select coalesce(jsonb_agg(jsonb_build_object('kind', k.kind, 'status', k.status, 'content',
                  case k.kind
                    when 'reference'  then (select to_jsonb(r) - 'id' - 'created_at' - 'updated_at' from public.lab_method_references r where r.id = k.ref_id)
                    when 'conversion' then (select to_jsonb(c) - 'id' - 'created_at' - 'updated_at' from public.lab_unit_conversion_rules c where c.id = k.ref_id)
                    when 'derived'    then (select to_jsonb(e) - 'id' - 'created_at' - 'updated_at' from public.lab_derived_calculations e where e.id = k.ref_id)
                  end) order by k.kind, k.ref_id), '[]')
                from public.integrated_reading_package_dependencies k where k.package_id = p_package_id)
  )
$$;
create or replace function public.li_hash_conteudo(p_package_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select encode(sha256(convert_to(public.li_conteudo_canonico(p_package_id)::text, 'UTF8')), 'hex')
$$;
revoke all on function public.li_conteudo_canonico(uuid), public.li_hash_conteudo(uuid) from public, anon;
grant execute on function public.li_conteudo_canonico(uuid), public.li_hash_conteudo(uuid) to authenticated;

-- ============================================================================
-- 3. VALIDADOR DE COMPLETUDE (tecnico — nao inventa conteudo)
-- ============================================================================
-- Devolve { publicavel, total_bloqueios, bloqueios: [codigo...] }. Um pacote so e homologavel sem bloqueios.
create or replace function public.li_validar_completude(p_package_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare b text[] := '{}'; d record; n int;
begin
  if not exists (select 1 from public.integrated_reading_rule_packages where id = p_package_id) then
    return jsonb_build_object('publicavel', false, 'total_bloqueios', 1, 'bloqueios', jsonb_build_array('pacote_inexistente'));
  end if;
  if not exists (select 1 from public.integrated_reading_domains where package_id = p_package_id and status = 'aprovado') then b := array_append(b, 'sem_dominio_aprovado'); end if;
  for d in select * from public.integrated_reading_domains where package_id = p_package_id and status = 'aprovado' order by code loop
    if not exists (select 1 from public.integrated_reading_exam_domain_links l where l.domain_id = d.id and l.status = 'aprovado') then b := array_append(b, ('dominio_sem_vinculo_aprovado:' || d.code)); end if;
    if not exists (select 1 from public.integrated_reading_rules r where r.package_id = p_package_id and r.rule_type = 'convergence' and r.status = 'aprovado' and r.target in ('global', d.id::text, d.code)) then b := array_append(b, ('dominio_sem_regra_convergencia:' || d.code)); end if;
  end loop;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'temporal' and status = 'aprovado') then b := array_append(b, 'sem_regra_temporal'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'sufficiency' and status = 'aprovado') then b := array_append(b, 'sem_regra_suficiencia'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'mixed' and status = 'aprovado') then b := array_append(b, 'sem_regra_resultados_mistos'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'convergence' and status = 'aprovado') then b := array_append(b, 'sem_regra_convergencia_divergencia'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'text' and status = 'aprovado'
                   and payload ? 'convergente' and payload ? 'divergente' and payload ? 'sem_dados_suficientes') then b := array_append(b, 'sem_texto_oficial_dos_tres_estados'); end if;
  select count(*) into n from (
    select 1 from public.integrated_reading_domains where package_id = p_package_id and status in ('rascunho','em_revisao')
    union all select 1 from public.integrated_reading_exam_domain_links where package_id = p_package_id and status in ('rascunho','em_revisao')
    union all select 1 from public.integrated_reading_rules where package_id = p_package_id and status in ('rascunho','em_revisao')
    union all select 1 from public.integrated_reading_package_dependencies where package_id = p_package_id and status in ('rascunho','em_revisao')) z;
  if n > 0 then b := array_append(b, ('elementos_nao_aprovados:' || n)); end if;
  select count(*) into n from public.integrated_reading_exam_domain_links l join public.lab_method_references r on r.id = l.reference_id
    where l.package_id = p_package_id and r.status <> 'aprovado';
  if n > 0 then b := array_append(b, ('vinculo_com_referencia_nao_aprovada:' || n)); end if;
  select count(*) into n from public.integrated_reading_package_dependencies k
    where k.package_id = p_package_id and not (
      (k.kind = 'reference'  and exists (select 1 from public.lab_method_references r where r.id = k.ref_id and r.status = 'aprovado')) or
      (k.kind = 'conversion' and exists (select 1 from public.lab_unit_conversion_rules c where c.id = k.ref_id and c.status = 'aprovado')) or
      (k.kind = 'derived'    and exists (select 1 from public.lab_derived_calculations e where e.id = k.ref_id and e.status = 'aprovado')));
  if n > 0 then b := array_append(b, ('dependencia_nao_aprovada_ou_inexistente:' || n)); end if;
  return jsonb_build_object('publicavel', coalesce(array_length(b, 1), 0) = 0, 'total_bloqueios', coalesce(array_length(b, 1), 0), 'bloqueios', to_jsonb(b));
end;
$$;
revoke all on function public.li_validar_completude(uuid) from public, anon;
grant execute on function public.li_validar_completude(uuid) to authenticated;

-- ============================================================================
-- 4. APROVACOES (append-only) E SNAPSHOT
-- ============================================================================
create table public.integrated_reading_package_approvals (
  id                 uuid primary key default gen_random_uuid(),
  package_id         uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  package_version    integer not null,
  content_hash       text not null,
  step               smallint not null,
  role               text not null,
  responsible        text not null,
  justification      text not null,
  approved_by        uuid not null default auth.uid() references auth.users(id),
  approved_at        timestamptz not null default now(),
  invalidated_at     timestamptz,
  invalidated_reason text,
  created_at         timestamptz not null default now(),
  constraint li_approvals_ordem check (
    (step = 1 and role = 'responsavel_primario' and responsible = 'Daniel')
    or (step = 2 and role = 'revisao_final' and responsible = 'Rodrigo')),
  constraint li_approvals_sem_lideranca check (responsible !~* 'lideran'),
  constraint li_approvals_justificativa check (length(btrim(justification)) > 0),
  constraint li_approvals_hash check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint li_approvals_invalidacao check ((invalidated_at is null) = (invalidated_reason is null))
);
create unique index li_approvals_uma_vigente on public.integrated_reading_package_approvals (package_id, step) where invalidated_at is null;
create index li_approvals_pacote_idx on public.integrated_reading_package_approvals (package_id, approved_at);

create or replace function public.proteger_aprovacao_li()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'aprovacao da leitura integrada e historico: nao e apagada' using errcode = 'P0001', hint = 'aprovacao_imutavel'; end if;
  if old.invalidated_at is not null or new.invalidated_at is null
     or (to_jsonb(old) - 'invalidated_at' - 'invalidated_reason') <> (to_jsonb(new) - 'invalidated_at' - 'invalidated_reason') then
    raise exception 'aprovacao da leitura integrada e imutavel: so pode ser invalidada (uma vez)' using errcode = 'P0001', hint = 'aprovacao_imutavel';
  end if;
  return new;
end $$;
create trigger li_approvals_proteger before update or delete on public.integrated_reading_package_approvals for each row execute function public.proteger_aprovacao_li();

alter table public.integrated_reading_package_approvals enable row level security;
create policy li_approvals_select on public.integrated_reading_package_approvals for select to authenticated using (true);
revoke all on table public.integrated_reading_package_approvals from public, anon, authenticated;
grant select on table public.integrated_reading_package_approvals to authenticated;

create table public.integrated_reading_package_snapshots (
  id               uuid primary key default gen_random_uuid(),
  package_id       uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  package_version  integer not null,
  content_hash     text not null,
  snapshot         jsonb not null,
  approval_1       uuid not null references public.integrated_reading_package_approvals(id),
  approval_2       uuid not null references public.integrated_reading_package_approvals(id),
  homologated_by   uuid not null default auth.uid() references auth.users(id),
  homologated_at   timestamptz not null default now(),
  constraint li_snapshots_unique unique (package_id, package_version)
);
create or replace function public.proteger_snapshot_li()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'snapshot homologado da leitura integrada e imutavel' using errcode = 'P0001', hint = 'snapshot_imutavel'; end $$;
create trigger li_snapshots_proteger before update or delete on public.integrated_reading_package_snapshots for each row execute function public.proteger_snapshot_li();
alter table public.integrated_reading_package_snapshots enable row level security;
create policy li_snapshots_select on public.integrated_reading_package_snapshots for select to authenticated using (true);
revoke all on table public.integrated_reading_package_snapshots from public, anon, authenticated;
grant select on table public.integrated_reading_package_snapshots to authenticated;

-- ============================================================================
-- 5. INVALIDACAO (pacote e filhas; referencias/conversoes/derivados referenciados)
-- ============================================================================
create or replace function public.li_invalidar_aprovacoes(p_package_id uuid, p_motivo text)
returns void language sql security definer set search_path = '' as $$
  update public.integrated_reading_package_approvals
     set invalidated_at = now(), invalidated_reason = p_motivo
   where package_id = p_package_id and invalidated_at is null;
$$;
revoke all on function public.li_invalidar_aprovacoes(uuid, text) from public, anon, authenticated;

create or replace function public.li_invalidar_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pid uuid; v_motivo text := 'conteudo metodologico alterado depois da aprovacao (' || tg_table_name || ' ' || lower(tg_op) || ')';
begin
  if tg_table_name = 'integrated_reading_rule_packages' then
    if new.version is not distinct from old.version and new.code is not distinct from old.code then return new; end if;
    perform public.li_invalidar_aprovacoes(new.id, 'pacote alterado depois da aprovacao (code/version)');
    return new;
  end if;
  if tg_table_name in ('integrated_reading_domains', 'integrated_reading_exam_domain_links', 'integrated_reading_rules', 'integrated_reading_package_dependencies') then
    v_pid := case when tg_op = 'DELETE' then old.package_id else new.package_id end;
    perform public.li_invalidar_aprovacoes(v_pid, v_motivo);
    if tg_op = 'DELETE' then return old; end if; return new;
  end if;
  -- entidade referenciada mudou: invalida TODOS os pacotes que a referenciam (dependencia ou vinculo)
  for v_pid in
    select distinct k.package_id from public.integrated_reading_package_dependencies k
      where k.ref_id = coalesce(new.id, old.id)
        and k.kind = case tg_table_name when 'lab_method_references' then 'reference' when 'lab_unit_conversion_rules' then 'conversion' else 'derived' end
    union
    select distinct l.package_id from public.integrated_reading_exam_domain_links l
      where tg_table_name = 'lab_method_references' and l.reference_id = coalesce(new.id, old.id)
  loop
    perform public.li_invalidar_aprovacoes(v_pid, 'entidade referenciada alterada depois da aprovacao (' || tg_table_name || ' ' || lower(tg_op) || ')');
  end loop;
  if tg_op = 'DELETE' then return old; end if; return new;
end $$;
revoke all on function public.li_invalidar_trigger() from public, anon, authenticated;
create trigger irp_invalida_aprovacoes  after update on public.integrated_reading_rule_packages for each row execute function public.li_invalidar_trigger();
create trigger ird_invalida_aprovacoes  after insert or update or delete on public.integrated_reading_domains for each row execute function public.li_invalidar_trigger();
create trigger irl_invalida_aprovacoes  after insert or update or delete on public.integrated_reading_exam_domain_links for each row execute function public.li_invalidar_trigger();
create trigger irr_invalida_aprovacoes  after insert or update or delete on public.integrated_reading_rules for each row execute function public.li_invalidar_trigger();
create trigger irpd_invalida_aprovacoes after insert or update or delete on public.integrated_reading_package_dependencies for each row execute function public.li_invalidar_trigger();
create trigger lmr_invalida_aprovacoes_li after update or delete on public.lab_method_references for each row execute function public.li_invalidar_trigger();
create trigger lucr_invalida_aprovacoes_li after update or delete on public.lab_unit_conversion_rules for each row execute function public.li_invalidar_trigger();
create trigger ldc_invalida_aprovacoes_li after update or delete on public.lab_derived_calculations for each row execute function public.li_invalidar_trigger();

-- ============================================================================
-- 6. 'aprovado' SO PELA RPC FINAL; aprovado/retirado imutaveis
-- ============================================================================
create or replace function public.proteger_pacote_li()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'aprovado' and old.status <> 'aprovado' and coalesce(current_setting('holohacking.li_homologar', true), '') <> old.id::text then
    raise exception 'aprovacao nao e edicao administrativa: use homologar_pacote_li (completude + Aprovacao 1 e 2 vigentes)' using errcode = 'P0001', hint = 'aprovacao_direta';
  end if;
  if old.status = 'aprovado' and coalesce(current_setting('holohacking.li_homologar', true), '') <> old.id::text then
    if new.status = 'retirado' and (to_jsonb(old) - 'status') = (to_jsonb(new) - 'status') then return new; end if;
    raise exception 'pacote da leitura integrada aprovado e imutavel: alteracao exige NOVA VERSAO (so pode ser retirado)' using errcode = 'P0001', hint = 'pacote_imutavel';
  end if;
  if old.status = 'retirado' and to_jsonb(old) <> to_jsonb(new) then
    raise exception 'pacote retirado e historico: nao muda' using errcode = 'P0001', hint = 'pacote_imutavel';
  end if;
  return new;
end $$;
create trigger irp_proteger before update on public.integrated_reading_rule_packages for each row execute function public.proteger_pacote_li();

create or replace function public.proteger_filha_pacote_li()
returns trigger language plpgsql set search_path = '' as $$
declare v_pid uuid := case when tg_op = 'DELETE' then old.package_id else new.package_id end; v_status text;
begin
  select status into v_status from public.integrated_reading_rule_packages where id = v_pid;
  if v_status in ('aprovado', 'retirado') and coalesce(current_setting('holohacking.li_homologar', true), '') <> v_pid::text then
    raise exception 'conteudo de pacote % da leitura integrada e imutavel: crie uma nova versao', v_status using errcode = 'P0001', hint = 'pacote_imutavel';
  end if;
  if tg_op = 'DELETE' then return old; end if; return new;
end $$;
create trigger ird_proteger  before insert or update or delete on public.integrated_reading_domains for each row execute function public.proteger_filha_pacote_li();
create trigger irl_proteger  before insert or update or delete on public.integrated_reading_exam_domain_links for each row execute function public.proteger_filha_pacote_li();
create trigger irr_proteger  before insert or update or delete on public.integrated_reading_rules for each row execute function public.proteger_filha_pacote_li();
create trigger irpd_proteger before insert or update or delete on public.integrated_reading_package_dependencies for each row execute function public.proteger_filha_pacote_li();

-- ============================================================================
-- 7. REGISTRAR UMA APROVACAO (ato humano; uma etapa por chamada)
-- ============================================================================
-- p_content_hash: o hash que a pessoa conferiu na tela; tem de ser o do conteudo atual. p_version idem.
-- A completude NAO e exigida aqui (e exigida na homologacao): a resposta traz os bloqueios atuais.
create or replace function public.registrar_aprovacao_li(p_package_id uuid, p_version integer, p_content_hash text, p_etapa integer, p_responsavel text, p_justificativa text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; h text; resp text := btrim(coalesce(p_responsavel, '')); a1 public.integrated_reading_package_approvals%rowtype; novo uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.integrated_reading_rule_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao recebe aprovacao (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa is null or p_etapa not in (1, 2) then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if p_etapa = 1 and resp <> 'Daniel' then raise exception 'Aprovacao 1 e do responsavel primario (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 2 and resp <> 'Rodrigo' then raise exception 'Aprovacao 2 e da revisao final (Rodrigo)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if length(btrim(coalesce(p_justificativa, ''))) = 0 then raise exception 'aprovacao exige justificativa' using errcode = 'P0001', hint = 'registro_incompleto'; end if;
  if p_version is distinct from pk.version then raise exception 'a versao conferida (%) nao e a versao atual do pacote (%)', p_version, pk.version using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  h := public.li_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then
    raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente';
  end if;
  -- aprovacoes vigentes de outra versao ou outro conteudo nao valem mais (historico mantido)
  update public.integrated_reading_package_approvals set invalidated_at = now(), invalidated_reason = 'versao ou conteudo diferentes do atual'
   where package_id = p_package_id and invalidated_at is null and (package_version <> pk.version or content_hash <> h);
  if p_etapa = 1 then
    if exists (select 1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
      raise exception 'Aprovacao 1 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by)
      values (p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid) returning id into novo;
  else
    select * into a1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
    if not found or a1.package_version <> pk.version or a1.content_hash <> h then
      raise exception 'Aprovacao 2 exige uma Aprovacao 1 (Daniel) vigente sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'ordem_invalida'; end if;
    if exists (select 1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null) then
      raise exception 'Aprovacao 2 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by)
      values (p_package_id, pk.version, h, 2, 'revisao_final', 'Rodrigo', btrim(p_justificativa), uid) returning id into novo;
  end if;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', p_etapa,
    'responsavel', case when p_etapa = 1 then 'Daniel' else 'Rodrigo' end, 'status_pacote', pk.status, 'completude', public.li_validar_completude(p_package_id));
end;
$$;
revoke all on function public.registrar_aprovacao_li(uuid, integer, text, integer, text, text) from public, anon;
grant execute on function public.registrar_aprovacao_li(uuid, integer, text, integer, text, text) to authenticated;

-- ============================================================================
-- 8. HOMOLOGAR (acao final explicita) — completude + hash atual + Aprovacoes 1 e 2 vigentes
-- ============================================================================
-- p_responsavel: quem executa o ato final (Daniel ou Rodrigo; nunca a "Liderança"); fica no provenance.
create or replace function public.homologar_pacote_li(p_package_id uuid, p_version integer, p_content_hash text, p_responsavel text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; v jsonb; h text; a1 public.integrated_reading_package_approvals%rowtype; a2 public.integrated_reading_package_approvals%rowtype;
        resp text := btrim(coalesce(p_responsavel, '')); snap jsonb; sid uuid; prov jsonb;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.integrated_reading_rule_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser homologado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if resp ~* 'lideran' or resp not in ('Daniel', 'Rodrigo') then raise exception 'homologacao e ato de Daniel ou Rodrigo (nunca da "Liderança do método HOLOSCAN")' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_version is distinct from pk.version then raise exception 'a versao conferida (%) nao e a versao atual (%)', p_version, pk.version using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  h := public.li_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  v := public.li_validar_completude(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'metodologia da leitura integrada incompleta: % bloqueio(s) — %', v->>'total_bloqueios', left((v->'bloqueios')::text, 400) using errcode = 'P0001', hint = 'metodologia_incompleta';
  end if;
  select * into a1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
  select * into a2 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null;
  if a1.id is null or a2.id is null or a1.package_version <> pk.version or a2.package_version <> pk.version or a1.content_hash <> h or a2.content_hash <> h or a2.approved_at < a1.approved_at then
    raise exception 'homologacao exige Aprovacao 1 (Daniel) e Aprovacao 2 (Rodrigo) vigentes sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'aprovacoes_incompletas';
  end if;
  snap := public.li_conteudo_canonico(p_package_id);
  prov := jsonb_build_object('aprovacao_1', jsonb_build_object('id', a1.id, 'responsavel', a1.responsible, 'papel', a1.role, 'em', a1.approved_at, 'justificativa', a1.justification),
                             'aprovacao_2', jsonb_build_object('id', a2.id, 'responsavel', a2.responsible, 'papel', a2.role, 'em', a2.approved_at, 'justificativa', a2.justification),
                             'homologado_por', resp, 'homologado_em', now(), 'content_hash', h, 'completude', v);
  perform set_config('holohacking.li_homologar', p_package_id::text, true);
  insert into public.integrated_reading_package_snapshots (package_id, package_version, content_hash, snapshot, approval_1, approval_2, homologated_by)
    values (p_package_id, pk.version, h, snap, a1.id, a2.id, uid) returning id into sid;
  update public.integrated_reading_rule_packages set status = 'aprovado', content_hash = h,
    responsible = 'Daniel (Aprovação 1 — responsável primário) / Rodrigo (Aprovação 2 — revisão final)', approval_provenance = prov
    where id = p_package_id;
  perform set_config('holohacking.li_homologar', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'content_hash', h, 'aprovacao_1', a1.id, 'aprovacao_2', a2.id, 'snapshot_id', sid, 'completude', v);
end;
$$;
revoke all on function public.homologar_pacote_li(uuid, integer, text, text) from public, anon;
grant execute on function public.homologar_pacote_li(uuid, integer, text, text) to authenticated;

-- ============================================================================
-- 9. ESTADO DO PACOTE REAL: inalterado (rascunho, sem dominio/vinculo/regra, SEM aprovacao)
-- ============================================================================
do $$
begin
  if (select count(*) from public.integrated_reading_package_approvals) <> 0 then raise exception 'governanca LI: nenhuma aprovacao pode nascer da migration'; end if;
  if (select status from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 1) <> 'rascunho' then raise exception 'governanca LI: LI-V1@1 tem de continuar em rascunho'; end if;
end $$;
