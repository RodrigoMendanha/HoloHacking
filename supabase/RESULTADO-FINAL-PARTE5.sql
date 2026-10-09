-- RESULTADO FINAL HOLOS (10/10) — PARTE 5 de 7: tabela de emissoes do Resultado Final (imutavel, RLS, travas)
-- Rodar INTEIRA e NA ORDEM. Erro = nada aplicado; rode a MESMA parte de novo. Pode repetir sem problema. SOMENTE ADITIVA.
-- Identico a supabase/migrations/20261015100000_resultado_final_holos.sql. A ultima linha antes da conferencia e "commit;".
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $$ begin
  if position('template_version = coalesce' in pg_get_functiondef('public.salvar_resultado_holos(jsonb)'::regprocedure)) = 0 then raise exception 'rode a PARTE 4 antes (nada foi aplicado)'; end if;
end $$;
-- ----------------------------------------------------------------------------
-- 2. EMISSAO IMUTAVEL DO RESULTADO FINAL
-- ----------------------------------------------------------------------------
create table if not exists public.holos_result_emissions (
  id                    uuid primary key default gen_random_uuid(),
  nutritionist_id       uuid not null default auth.uid() references auth.users(id),
  patient_id            uuid not null,
  holos_result_id       uuid not null,
  result_content_hash   text not null,
  conduct_id            uuid,
  emission_number       integer not null,
  template_version      text not null default 'RF-1',
  content_snapshot      jsonb not null,
  content_hash          text not null,
  operation_id          uuid,
  created_at            timestamptz not null default now(),
  constraint holos_result_emissions_numero check (emission_number >= 1),
  constraint holos_result_emissions_hash check (content_hash ~ '^[0-9a-f]{64}$' and result_content_hash ~ '^[0-9a-f]{64}$'),
  constraint holos_result_emissions_template check (template_version in ('RF-1')),
  constraint holos_result_emissions_tamanho check (pg_column_size(content_snapshot) <= 3145728),
  constraint holos_result_emissions_numero_unico unique (patient_id, emission_number),
  constraint holos_result_emissions_paciente_fk foreign key (patient_id, nutritionist_id)
    references public.patients (id, nutritionist_id) on delete restrict,
  constraint holos_result_emissions_resultado_fk foreign key (holos_result_id, patient_id, nutritionist_id)
    references public.holos_results (id, patient_id, nutritionist_id) on delete restrict,
  constraint holos_result_emissions_conduta_fk foreign key (conduct_id, patient_id, nutritionist_id)
    references public.conducts (id, patient_id, nutritionist_id) on delete restrict
);
comment on table public.holos_result_emissions is
  'Emissao do Resultado Final para a paciente: congela Resultado HOLOS (id + hash), Conduta destinada a paciente, identidade profissional e imagens, template e data. Imutavel.';
create index if not exists holos_result_emissions_paciente on public.holos_result_emissions (patient_id, created_at desc);
create unique index if not exists holos_result_emissions_operacao on public.holos_result_emissions (nutritionist_id, operation_id) where operation_id is not null;

create or replace function public.proteger_emissao_resultado()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'emissao do Resultado Final e imutavel: gere uma nova emissao' using errcode = 'P0001', hint = 'emissao_imutavel';
end;
$$;
revoke all on function public.proteger_emissao_resultado() from public, anon, authenticated;
drop trigger if exists holos_result_emissions_proteger on public.holos_result_emissions;
create trigger holos_result_emissions_proteger before update or delete on public.holos_result_emissions
  for each row execute function public.proteger_emissao_resultado();
drop trigger if exists holos_result_emissions_paciente_arquivado on public.holos_result_emissions;
create trigger holos_result_emissions_paciente_arquivado before insert on public.holos_result_emissions
  for each row execute function public.bloquear_escrita_paciente_arquivado();
do $$ begin
  if to_regprocedure('public.exigir_conta_ativa()') is not null then
    drop trigger if exists exigir_conta_ativa on public.holos_result_emissions;
    create trigger exigir_conta_ativa before insert or update or delete on public.holos_result_emissions
      for each statement execute function public.exigir_conta_ativa();
  end if;
end $$;

alter table public.holos_result_emissions enable row level security;
revoke all on public.holos_result_emissions from public, anon, authenticated;
grant select on public.holos_result_emissions to authenticated;
drop policy if exists holos_result_emissions_select_proprias on public.holos_result_emissions;
create policy holos_result_emissions_select_proprias on public.holos_result_emissions for select to authenticated
  using (nutritionist_id = (select auth.uid()));
-- imagem do Perfil congelada na emissao (data URL; o navegador le do Perfil e manda; ate ~700 KB cada)
create or replace function public.emissao_imagem_valida(p jsonb)
returns text language plpgsql immutable set search_path = '' as $$
begin
  if p is null or jsonb_typeof(p) = 'null' then return null; end if;
  if jsonb_typeof(p) <> 'string' or length(p #>> '{}') > 700000 or (p #>> '{}') !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' then
    raise exception 'imagem invalida' using errcode = '22023', hint = 'imagem_invalida';
  end if;
  return p #>> '{}';
end;
$$;
revoke all on function public.emissao_imagem_valida(jsonb) from public, anon, authenticated;

commit;
select 'tabela holos_result_emissions' as item, (to_regclass('public.holos_result_emissions') is not null)::text as valor
union all select 'RLS ligada', (select relrowsecurity::text from pg_class where oid = 'public.holos_result_emissions'::regclass)
union all select 'gatilhos (imutavel + arquivado + conta ativa)', (select count(*)::text from pg_trigger where tgrelid = 'public.holos_result_emissions'::regclass and not tgisinternal)
union all select 'emissao_imagem_valida', (to_regprocedure('public.emissao_imagem_valida(jsonb)') is not null)::text
union all select 'authenticated insere direto (deve ser false)', has_table_privilege('authenticated', 'public.holos_result_emissions', 'insert')::text;
