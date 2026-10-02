-- V1, Etapa 5 — LABORATORIO: CATALOGO-BASE (45), COLETAS, RESULTADOS, COMPONENTES,
-- REFERENCIAS, CONVERSOES, CALCULOS DERIVADOS E INFRAESTRUTURA DA LEITURA INTEGRADA.
-- NAO APLICADA em producao. Entra depois de 130000..210000.
--
-- Autoridade: Documento Mestre (§21–§24, §34.2, §43.2). O AS-IS (exames.csv,
-- confrontar(), ideal_min/max, sistema_no_momento) e preservado como HISTORICO
-- e sai da saida oficial. Nada aqui inventa referencia, faixa, conversao,
-- vinculo exame→sistema, vinculo exame→dominio, regra de convergencia, score,
-- painel obrigatorio, interpretacao ou calculo derivado.
--
--   1. lab_exam_catalog              45 exames-base, configuracao GLOBAL, somente leitura
--   2. lab_custom_exams              exame customizado da nutricionista (nao conta nos 45)
--   3. lab_collections (evolui)      identidade = id; estado rascunho|salvo|revisado; revisao;
--                                    operation_id idempotente; encounter_id explicito; documento
--   4. lab_results (evolui)          valor ORIGINAL preservado; numerico | censurado | qualitativo;
--                                    variante/metodo/material; referencia DO LAUDO; legado em legacy_*
--   5. lab_result_components         componentes de exame composto (Hemograma)
--   6. lab_method_references         referencia METODOLOGICA versionada — VAZIA
--   7. lab_unit_conversion_rules     conversoes validadas — VAZIA
--   8. lab_derived_calculations      calculos derivados versionados — VAZIA
--   9. integrated_reading_*          pacote de regras LI-V1 (rascunho, SEM dominios/vinculos/regras),
--                                    leituras salvas congeladas (snapshot + revisao)
--  10. protecoes, RLS, RPCs (salvar_coleta_laboratorial, revisar_coleta_laboratorial,
--      marcar_coleta_revisada, salvar_leitura_integrada) e migracao deterministica do legado.

-- ============================================================================
-- 1. CATALOGO-BASE (45) — global, somente leitura
-- ============================================================================
create table public.lab_exam_catalog (
  code             text primary key,
  position         integer not null unique,
  canonical_name   text not null,
  category         text not null,
  aliases          jsonb not null default '[]'::jsonb,
  composite        boolean not null default false,
  status           text not null default 'ativo',
  catalog_version  text not null,
  created_at       timestamptz not null default now(),
  constraint lab_exam_catalog_code_formato check (code ~ '^LAB-0(0[1-9]|[1-3][0-9]|4[0-5])$'),
  constraint lab_exam_catalog_nome_unico unique (canonical_name),
  constraint lab_exam_catalog_status check (status in ('ativo','retirado'))
);
insert into public.lab_exam_catalog (code, position, canonical_name, category, aliases, composite, catalog_version) values
  ('LAB-001', 1, 'Hemograma completo', 'Hematologia', '[]', true, 'catalogo-lab-v1.0'),
  ('LAB-002', 2, 'Glicemia de jejum', 'Glicêmico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-003', 3, 'Insulina basal', 'Glicêmico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-004', 4, 'Hemoglobina glicada', 'Glicêmico', '["HbA1c"]', false, 'catalogo-lab-v1.0'),
  ('LAB-005', 5, 'Triglicerídeos', 'Lipídico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-006', 6, 'Colesterol total', 'Lipídico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-007', 7, 'LDL colesterol', 'Lipídico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-008', 8, 'LDL oxidada', 'Lipídico especializado', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-009', 9, 'HDL colesterol', 'Lipídico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-010', 10, 'Creatinina', 'Renal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-011', 11, 'Ureia', 'Renal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-012', 12, 'TGO ou AST', 'Hepático', '["TGO","AST"]', false, 'catalogo-lab-v1.0'),
  ('LAB-013', 13, 'TGP ou ALT', 'Hepático', '["TGP","ALT"]', false, 'catalogo-lab-v1.0'),
  ('LAB-014', 14, 'Bilirrubina total', 'Hepático', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-015', 15, 'Gama GT ou GGT', 'Hepático', '["Gama GT","GGT"]', false, 'catalogo-lab-v1.0'),
  ('LAB-016', 16, 'PCR', 'Inflamação', '["Proteína C reativa"]', false, 'catalogo-lab-v1.0'),
  ('LAB-017', 17, 'Homocisteína', 'Investigação contextual', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-018', 18, 'Fibrinogênio', 'Investigação contextual', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-019', 19, 'Sódio', 'Eletrólitos', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-020', 20, 'Potássio', 'Eletrólitos', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-021', 21, 'Magnésio', 'Minerais', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-022', 22, 'Zinco', 'Minerais', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-023', 23, 'Selênio', 'Minerais', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-024', 24, 'Fósforo', 'Minerais', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-025', 25, 'Vitamina B12', 'Vitaminas', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-026', 26, 'Ácido fólico', 'Vitaminas', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-027', 27, 'Alumínio', 'Elementos especializados', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-028', 28, 'Ferro sérico', 'Ferro', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-029', 29, 'Ferritina', 'Ferro', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-030', 30, 'TSH', 'Tireoide', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-031', 31, 'T4 livre', 'Tireoide', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-032', 32, 'T3 livre', 'Tireoide', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-033', 33, 'Ácido úrico', 'Metabólico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-034', 34, 'Paratormônio ou PTH', 'Metabolismo mineral', '["Paratormônio","PTH"]', false, 'catalogo-lab-v1.0'),
  ('LAB-035', 35, '25 OH vitamina D', 'Vitaminas', '["Vitamina D 25-OH","25-hidroxivitamina D"]', false, 'catalogo-lab-v1.0'),
  ('LAB-036', 36, 'DHT', 'Hormonal', '["Di-hidrotestosterona"]', false, 'catalogo-lab-v1.0'),
  ('LAB-037', 37, 'Testosterona livre', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-038', 38, 'Testosterona total', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-039', 39, 'SHBG', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-040', 40, 'Progesterona', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-041', 41, 'Estradiol', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-042', 42, 'LH', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-043', 43, 'FSH', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-044', 44, 'CK', 'Muscular', '["Creatina quinase","Creatinoquinase"]', false, 'catalogo-lab-v1.0'),
  ('LAB-045', 45, 'Cálcio ionizado sérico', 'Metabolismo mineral', '["Cálcio iônico"]', false, 'catalogo-lab-v1.0');
do $$ begin
  if (select count(*) from public.lab_exam_catalog) <> 45 then raise exception 'catalogo-base deve ter exatamente 45 exames'; end if;
end $$;
alter table public.lab_exam_catalog enable row level security;
create policy lab_exam_catalog_select on public.lab_exam_catalog for select to authenticated using (true);
revoke all on table public.lab_exam_catalog from public, anon, authenticated;
grant select on table public.lab_exam_catalog to authenticated;
-- catalogo-base muda SO por migration: nenhuma escrita pela aplicacao
create or replace function public.proteger_catalogo_laboratorial()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'catalogo-base laboratorial e configuracao global: muda so por migration versionada' using errcode = 'P0001', hint = 'catalogo_imutavel'; end; $$;
create trigger lab_exam_catalog_proteger before insert or update or delete on public.lab_exam_catalog for each row execute function public.proteger_catalogo_laboratorial();

-- ============================================================================
-- 2. EXAME CUSTOMIZADO (escopo da nutricionista; nao entra nos 45)
-- ============================================================================
create table public.lab_custom_exams (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default auth.uid() references auth.users(id),
  name             text not null,
  aliases          jsonb not null default '[]'::jsonb,
  notes            text,
  status           text not null default 'ativo',
  created_by       uuid default auth.uid() references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint lab_custom_exams_nome_nao_vazio check (length(btrim(name)) > 0),
  constraint lab_custom_exams_status check (status in ('ativo','inativo')),
  constraint lab_custom_exams_id_nutritionist_unique unique (id, nutritionist_id)
);
create unique index lab_custom_exams_nome_unico on public.lab_custom_exams (nutritionist_id, lower(btrim(name)));
create trigger lab_custom_exams_tocar_updated_at before update on public.lab_custom_exams for each row execute function public.tocar_updated_at();
alter table public.lab_custom_exams enable row level security;
create policy lab_custom_exams_select on public.lab_custom_exams for select to authenticated using (nutritionist_id = (select auth.uid()));
create policy lab_custom_exams_insert on public.lab_custom_exams for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy lab_custom_exams_update on public.lab_custom_exams for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));
revoke all on table public.lab_custom_exams from public, anon;
grant select, insert, update on table public.lab_custom_exams to authenticated;

-- ============================================================================
-- 3. COLETAS — identidade e o id; estado; revisao; idempotencia; documento
-- ============================================================================
-- coletado_em E a clinical_date (data clinica da coleta); created_at/updated_at sao registro.
alter table public.documents add constraint documents_id_nutritionist_unique unique (id, nutritionist_id);
alter table public.lab_collections
  add column if not exists clinical_time   time,
  add column if not exists state           text not null default 'salvo',
  add column if not exists source          text not null default 'manual',
  add column if not exists operation_id    uuid,
  add column if not exists revision        integer not null default 1,
  add column if not exists created_by      uuid references auth.users(id),
  add column if not exists reviewed_at     timestamptz,
  add column if not exists reviewed_by     uuid references auth.users(id),
  add column if not exists revision_note   text,
  add column if not exists supersedes_id   uuid references public.lab_collections(id) on delete restrict,
  add column if not exists superseded_at   timestamptz,
  add column if not exists document_id     uuid;
alter table public.lab_collections add constraint lab_collections_state check (state in ('rascunho','salvo','revisado'));
alter table public.lab_collections add constraint lab_collections_source check (source in ('manual','legacy_panel','legacy_migrated','extracted_draft','revision'));
alter table public.lab_collections add constraint lab_collections_revision_positiva check (revision >= 1);
alter table public.lab_collections add constraint lab_collections_revisado_completo check (state <> 'revisado' or (reviewed_at is not null and reviewed_by is not null));
alter table public.lab_collections add constraint lab_collections_document_fk foreign key (document_id, nutritionist_id) references public.documents (id, nutritionist_id) on delete set null;
alter table public.lab_collections add constraint lab_collections_id_nutritionist_unique unique (id, nutritionist_id);
create unique index lab_collections_operation_unica on public.lab_collections (nutritionist_id, operation_id) where operation_id is not null;
create index lab_collections_supersedes_idx on public.lab_collections (supersedes_id) where supersedes_id is not null;
-- coletas que ja existem vieram do painel legado (valores locais): preservadas como tal
update public.lab_collections set source = 'legacy_panel', state = 'salvo' where source = 'manual';

-- ============================================================================
-- 4. RESULTADOS — valor original, variante, metodo, material, referencia do laudo
-- ============================================================================
alter table public.lab_results
  alter column valor drop not null,
  alter column unidade_no_momento drop not null,
  alter column ideal_min_no_momento drop not null,
  alter column ideal_max_no_momento drop not null,
  alter column nome_exame_no_momento drop not null,
  alter column sistema_no_momento drop not null,
  alter column exame_id drop not null;
alter table public.lab_results drop constraint lab_results_faixa_coerente;
alter table public.lab_results add constraint lab_results_faixa_coerente check (ideal_min_no_momento is null or ideal_max_no_momento is null or ideal_min_no_momento <= ideal_max_no_momento);
alter table public.lab_results drop constraint lab_results_sistema_valido;
alter table public.lab_results add constraint lab_results_sistema_valido check (sistema_no_momento is null or sistema_no_momento in ('fungico','acido_inflamatorio','metabolico','detox_linfatico','mental_emocional_espiritual'));
alter table public.lab_results
  add column if not exists exam_code                   text references public.lab_exam_catalog(code),
  add column if not exists custom_exam_id              uuid references public.lab_custom_exams(id) on delete restrict,
  add column if not exists variant                     text,
  add column if not exists value_original_text         text,
  add column if not exists numeric_value               numeric,
  add column if not exists qualifier                   text,
  add column if not exists censor_limit                numeric,
  add column if not exists unit_original               text,
  add column if not exists method                      text,
  add column if not exists material                    text,
  add column if not exists report_reference_text       text,
  add column if not exists report_reference_min        numeric,
  add column if not exists report_reference_max        numeric,
  add column if not exists report_reference_operator   text,
  add column if not exists report_reference_unit       text,
  add column if not exists report_reference_population text,
  add column if not exists reference_status            text not null default 'missing',
  add column if not exists reference_source            text not null default 'laudo',
  add column if not exists origin                      text not null default 'manual',
  add column if not exists notes                       text,
  add column if not exists result_date                 date,
  add column if not exists legacy_exame_id             text,
  add column if not exists legacy_ideal_min            numeric,
  add column if not exists legacy_ideal_max            numeric,
  add column if not exists legacy_sistema              text,
  add column if not exists requires_manual_mapping     boolean not null default false,
  add column if not exists mapping_note                text,
  add column if not exists position                    integer,
  add column if not exists updated_at                  timestamptz not null default now();
alter table public.lab_results add constraint lab_results_qualifier check (qualifier is null or qualifier in ('eq','lt','lte','gt','gte','text'));
alter table public.lab_results add constraint lab_results_numerico_so_exato check (numeric_value is null or qualifier = 'eq');
alter table public.lab_results add constraint lab_results_censurado_sem_numero check (qualifier not in ('lt','lte','gt','gte') or numeric_value is null);
alter table public.lab_results add constraint lab_results_operator check (report_reference_operator is null or report_reference_operator in ('range','lt','lte','gt','gte'));
alter table public.lab_results add constraint lab_results_reference_status check (reference_status in ('informed','missing'));
alter table public.lab_results add constraint lab_results_reference_source check (reference_source in ('laudo','metodologica'));
alter table public.lab_results add constraint lab_results_origin check (origin in ('manual','legacy_migrated','additional_legacy','extracted_draft'));
alter table public.lab_results add constraint lab_results_um_exame check (num_nonnulls(exam_code, custom_exam_id) <= 1);
alter table public.lab_results add constraint lab_results_identidade check (exam_code is not null or custom_exam_id is not null or origin in ('additional_legacy','legacy_migrated') or requires_manual_mapping);
alter table public.lab_results add constraint lab_results_referencia_coerente check (report_reference_min is null or report_reference_max is null or report_reference_min <= report_reference_max);
-- referencia informada = ao menos texto ou limite; ausente = nada (e NAO significa "dentro")
alter table public.lab_results add constraint lab_results_referencia_informada check (
  (reference_status = 'informed' and (report_reference_text is not null or report_reference_min is not null or report_reference_max is not null))
  or (reference_status = 'missing' and report_reference_text is null and report_reference_min is null and report_reference_max is null));
-- um resultado por identidade (exame + variante + material) na mesma coleta; legado continua pela unique (collection_id, exame_id)
create unique index lab_results_identidade_catalogo on public.lab_results (collection_id, exam_code, coalesce(variant,''), coalesce(material,'')) where exam_code is not null;
create unique index lab_results_identidade_custom on public.lab_results (collection_id, custom_exam_id, coalesce(variant,''), coalesce(material,'')) where custom_exam_id is not null;
create trigger lab_results_tocar_updated_at before update on public.lab_results for each row execute function public.tocar_updated_at();

-- migracao DETERMINISTICA do legado (so onde a identidade e inequivoca; variante preservada; o resto fica marcado)
with mapa(exame_id, exam_code, variant, manual, nota) as (values
  ('EXA-002','LAB-016','ultrassensivel',false,null), ('EXA-004','LAB-033',null,false,null), ('EXA-005','LAB-002',null,false,null),
  ('EXA-006',null,null,true,'Insulina de jejum × Insulina basal (LAB-003): confirmar identidade'),
  ('EXA-008','LAB-004',null,false,null), ('EXA-009','LAB-005',null,false,null), ('EXA-010','LAB-009',null,false,null), ('EXA-011','LAB-030',null,false,null),
  ('EXA-012','LAB-031',null,false,null), ('EXA-013','LAB-012',null,false,null), ('EXA-014','LAB-013',null,false,null), ('EXA-015','LAB-015',null,false,null),
  ('EXA-016','LAB-014',null,false,null), ('EXA-017','LAB-011',null,false,null), ('EXA-018','LAB-010',null,false,null), ('EXA-019','LAB-035',null,false,null),
  ('EXA-020','LAB-025',null,false,null), ('EXA-021','LAB-029',null,false,null), ('EXA-022','LAB-021','eritrocitario',false,null), ('EXA-023','LAB-017',null,false,null))
update public.lab_results r set
  value_original_text = coalesce(r.value_original_text, r.valor::text),
  numeric_value = coalesce(r.numeric_value, r.valor), qualifier = coalesce(r.qualifier, 'eq'),
  unit_original = coalesce(r.unit_original, r.unidade_no_momento),
  legacy_exame_id = r.exame_id, legacy_ideal_min = r.ideal_min_no_momento, legacy_ideal_max = r.ideal_max_no_momento, legacy_sistema = r.sistema_no_momento,
  reference_status = 'missing',
  origin = case when r.exame_id in ('EXA-001','EXA-003','EXA-007','EXA-024') then 'additional_legacy' else 'legacy_migrated' end,
  exam_code = m.exam_code, variant = m.variant,
  requires_manual_mapping = coalesce(m.manual, r.exame_id not in ('EXA-001','EXA-003','EXA-007','EXA-024')),
  mapping_note = coalesce(m.nota, case when m.exame_id is null and r.exame_id not in ('EXA-001','EXA-003','EXA-007','EXA-024') then 'exame legado sem mapeamento provado' end)
from (select * from mapa union all select null, null, null, null, null where false) m
where r.exame_id is not null and r.value_original_text is null and (m.exame_id = r.exame_id or (m.exame_id is null));
-- linhas legado que nao estavam na tabela de mapeamento (acima so casa as 20 conhecidas): preservar e marcar
update public.lab_results r set
  value_original_text = r.valor::text, numeric_value = r.valor, qualifier = 'eq', unit_original = r.unidade_no_momento,
  legacy_exame_id = r.exame_id, legacy_ideal_min = r.ideal_min_no_momento, legacy_ideal_max = r.ideal_max_no_momento, legacy_sistema = r.sistema_no_momento,
  reference_status = 'missing',
  origin = case when r.exame_id in ('EXA-001','EXA-003','EXA-007','EXA-024') then 'additional_legacy' else 'legacy_migrated' end,
  requires_manual_mapping = r.exame_id not in ('EXA-001','EXA-003','EXA-007','EXA-024'),
  mapping_note = case when r.exame_id not in ('EXA-001','EXA-003','EXA-007','EXA-024') then 'exame legado sem mapeamento provado' end
where r.exame_id is not null and r.value_original_text is null;
alter table public.lab_results alter column value_original_text set not null;
alter table public.lab_results add constraint lab_results_valor_original_nao_vazio check (length(btrim(value_original_text)) > 0);

-- ============================================================================
-- 5. COMPONENTES DE EXAME COMPOSTO (Hemograma): pertencem ao resultado
-- ============================================================================
create table public.lab_result_components (
  id                       uuid primary key default gen_random_uuid(),
  result_id                uuid not null references public.lab_results(id) on delete cascade,
  position                 integer not null default 0,
  original_name            text not null,
  canonical_component_key  text,
  value_original_text      text not null,
  numeric_value            numeric,
  qualifier                text,
  censor_limit             numeric,
  unit_original            text,
  report_reference_text    text,
  report_reference_min     numeric,
  report_reference_max     numeric,
  report_reference_operator text,
  notes                    text,
  created_at               timestamptz not null default now(),
  constraint lab_components_nome check (length(btrim(original_name)) > 0),
  constraint lab_components_valor check (length(btrim(value_original_text)) > 0),
  constraint lab_components_qualifier check (qualifier is null or qualifier in ('eq','lt','lte','gt','gte','text')),
  constraint lab_components_numerico_so_exato check (numeric_value is null or qualifier = 'eq'),
  constraint lab_components_operator check (report_reference_operator is null or report_reference_operator in ('range','lt','lte','gt','gte'))
);
create index lab_result_components_result_idx on public.lab_result_components (result_id, position);
-- componente so em resultado de exame composto do catalogo (Hemograma completo)
create or replace function public.proteger_componente_laboratorial()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_code text; v_comp boolean;
begin
  select r.exam_code into v_code from public.lab_results r where r.id = new.result_id;
  select c.composite into v_comp from public.lab_exam_catalog c where c.code = v_code;
  if not coalesce(v_comp, false) then raise exception 'componentes so existem em resultado de exame composto do catalogo (Hemograma completo)' using errcode = 'P0001', hint = 'componente_invalido'; end if;
  return new;
end; $$;
revoke all on function public.proteger_componente_laboratorial() from public, anon, authenticated;
create trigger lab_result_components_proteger before insert or update on public.lab_result_components for each row execute function public.proteger_componente_laboratorial();

-- ============================================================================
-- 6/7/8. REFERENCIA METODOLOGICA, CONVERSOES, CALCULOS DERIVADOS — infraestrutura VAZIA
-- ============================================================================
create table public.lab_method_references (
  id              uuid primary key default gen_random_uuid(),
  exam_code       text not null references public.lab_exam_catalog(code),
  variant         text, material text, method text,
  population      text, sex text, age_min integer, age_max integer, context text,
  lower_bound     numeric, upper_bound numeric, operator text not null default 'range',
  unit            text not null,
  source          text not null, source_version text, justification text not null,
  effective_from  date, effective_to date,
  status          text not null default 'rascunho',
  responsible     text, approval_provenance jsonb,
  content_hash    text, version integer not null default 1,
  created_at      timestamptz not null default now(),
  constraint lab_method_references_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint lab_method_references_operator check (operator in ('range','lt','lte','gt','gte')),
  constraint lab_method_references_limites check (lower_bound is not null or upper_bound is not null),
  constraint lab_method_references_aprovado_completo check (status <> 'aprovado' or (responsible is not null and approval_provenance is not null and content_hash is not null and effective_from is not null))
);
create table public.lab_unit_conversion_rules (
  id            uuid primary key default gen_random_uuid(),
  exam_code     text references public.lab_exam_catalog(code),
  from_unit     text not null, to_unit text not null, factor numeric not null,
  source        text not null, rule_version text not null,
  status        text not null default 'rascunho',
  responsible   text, approval_provenance jsonb,
  created_at    timestamptz not null default now(),
  constraint lab_unit_conversion_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint lab_unit_conversion_fator_positivo check (factor > 0),
  constraint lab_unit_conversion_aprovado_completo check (status <> 'aprovado' or (responsible is not null and approval_provenance is not null))
);
create table public.lab_derived_calculations (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  formula         text not null, formula_version text not null,
  inputs          jsonb not null, required_units jsonb not null, criteria jsonb,
  source          text not null,
  status          text not null default 'rascunho',
  responsible     text, approval_provenance jsonb,
  created_at      timestamptz not null default now(),
  constraint lab_derived_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint lab_derived_aprovado_completo check (status <> 'aprovado' or (responsible is not null and approval_provenance is not null))
);
-- gerenciamento tecnico/interno: a aplicacao SO LE; sem botao de aprovacao; sem autoridade administrativa nova
alter table public.lab_method_references enable row level security;
alter table public.lab_unit_conversion_rules enable row level security;
alter table public.lab_derived_calculations enable row level security;
create policy lab_method_references_select on public.lab_method_references for select to authenticated using (true);
create policy lab_unit_conversion_rules_select on public.lab_unit_conversion_rules for select to authenticated using (true);
create policy lab_derived_calculations_select on public.lab_derived_calculations for select to authenticated using (true);
revoke all on table public.lab_method_references, public.lab_unit_conversion_rules, public.lab_derived_calculations from public, anon, authenticated;
grant select on table public.lab_method_references, public.lab_unit_conversion_rules, public.lab_derived_calculations to authenticated;

-- ============================================================================
-- 9. LEITURA INTEGRADA — infraestrutura versionada (pacote real SEM regras)
-- ============================================================================
create table public.integrated_reading_rule_packages (
  id            uuid primary key default gen_random_uuid(),
  code          text not null, version integer not null default 1,
  status        text not null default 'rascunho',
  notes         text, content_hash text,
  responsible   text, approval_provenance jsonb,
  created_at    timestamptz not null default now(),
  constraint irp_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint irp_code_version unique (code, version),
  constraint irp_aprovado_completo check (status <> 'aprovado' or (responsible is not null and approval_provenance is not null and content_hash is not null))
);
create table public.integrated_reading_domains (
  id               uuid primary key default gen_random_uuid(),
  package_id       uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  code             text not null, name text not null,
  holoscan_system  text,
  status           text not null default 'rascunho',
  created_at       timestamptz not null default now(),
  constraint ird_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint ird_code unique (package_id, code),
  constraint ird_system check (holoscan_system is null or holoscan_system in ('fungico','acido_inflamatorio','metabolico','detox_linfatico','mental_emocional_espiritual'))
);
create table public.integrated_reading_exam_domain_links (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  domain_id     uuid not null references public.integrated_reading_domains(id) on delete restrict,
  exam_code     text not null references public.lab_exam_catalog(code),
  variant       text, material text,
  direction     text not null default 'any',
  reference_id  uuid references public.lab_method_references(id),
  status        text not null default 'rascunho',
  created_at    timestamptz not null default now(),
  constraint irl_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint irl_direction check (direction in ('any','above','below'))
);
create table public.integrated_reading_rules (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  rule_type     text not null, target text not null default 'global',
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'rascunho',
  created_at    timestamptz not null default now(),
  constraint irr_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint irr_type check (rule_type in ('sufficiency','temporal','mixed','convergence','text')),
  constraint irr_unique unique (package_id, rule_type, target)
);
-- pacote REAL da V1: existe, em rascunho, SEM dominio, SEM vinculo, SEM regra
insert into public.integrated_reading_rule_packages (code, version, status, notes)
  values ('LI-V1', 1, 'rascunho', 'Infraestrutura da Etapa 5. Nenhum dominio, vinculo exame→dominio, suficiencia, janela temporal, regra de resultados mistos ou texto aprovados: toda leitura real e sem_dados_suficientes (docs/v1/laboratorio/HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md).');
alter table public.integrated_reading_rule_packages enable row level security;
alter table public.integrated_reading_domains enable row level security;
alter table public.integrated_reading_exam_domain_links enable row level security;
alter table public.integrated_reading_rules enable row level security;
create policy irp_select on public.integrated_reading_rule_packages for select to authenticated using (true);
create policy ird_select on public.integrated_reading_domains for select to authenticated using (true);
create policy irl_select on public.integrated_reading_exam_domain_links for select to authenticated using (true);
create policy irr_select on public.integrated_reading_rules for select to authenticated using (true);
revoke all on table public.integrated_reading_rule_packages, public.integrated_reading_domains, public.integrated_reading_exam_domain_links, public.integrated_reading_rules from public, anon, authenticated;
grant select on table public.integrated_reading_rule_packages, public.integrated_reading_domains, public.integrated_reading_exam_domain_links, public.integrated_reading_rules to authenticated;

-- leitura SALVA: congela fontes, referencias, pacote/versao, motor, estado, trace
create table public.integrated_readings (
  id                            uuid primary key default gen_random_uuid(),
  nutritionist_id               uuid not null default auth.uid() references auth.users(id),
  patient_id                    uuid not null,
  encounter_id                  uuid,
  responsible                   text not null,
  clinical_context              text,
  holoscan_application_id       uuid references public.holoscan_applications(id) on delete restrict,
  selected_collection_ids       uuid[] not null default '{}',
  selected_result_ids           uuid[] not null default '{}',
  references_snapshot           jsonb not null default '[]'::jsonb,
  sources_snapshot              jsonb not null default '{}'::jsonb,
  rule_package_id               uuid references public.integrated_reading_rule_packages(id) on delete restrict,
  rule_version                  integer,
  engine_version                text not null,
  state                         text not null,
  reason_codes                  jsonb not null default '[]'::jsonb,
  trace                         jsonb not null default '{}'::jsonb,
  professional_note             text,
  revision                      integer not null default 1,
  supersedes_id                 uuid references public.integrated_readings(id) on delete restrict,
  superseded_at                 timestamptz,
  content_hash                  text not null,
  created_by                    uuid default auth.uid() references auth.users(id),
  created_at                    timestamptz not null default now(),
  constraint ir_state check (state in ('convergente','divergente','sem_dados_suficientes')),
  constraint ir_responsavel check (length(btrim(responsible)) > 0),
  constraint ir_patient_fk foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete restrict,
  constraint ir_encounter_fk foreign key (encounter_id, patient_id, nutritionist_id) references public.encounters (id, patient_id, nutritionist_id) on delete restrict
);
create index integrated_readings_patient_idx on public.integrated_readings (patient_id, created_at desc);
alter table public.integrated_readings enable row level security;
create policy integrated_readings_select on public.integrated_readings for select to authenticated using (nutritionist_id = (select auth.uid()));
revoke all on table public.integrated_readings from public, anon, authenticated;
grant select on table public.integrated_readings to authenticated;   -- escrita SO pela RPC
create trigger integrated_readings_paciente_arquivado before insert or update on public.integrated_readings for each row execute function public.bloquear_escrita_paciente_arquivado();
-- leitura salva e imutavel: so superseded_at (uma vez)
create or replace function public.proteger_leitura_integrada()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'leitura integrada salva e historico: nao e apagada' using errcode = 'P0001', hint = 'leitura_imutavel'; end if;
  if old.superseded_at is not null or new.superseded_at is null or (to_jsonb(old) - 'superseded_at') <> (to_jsonb(new) - 'superseded_at') then
    raise exception 'leitura integrada salva e imutavel: corrija com uma nova revisao' using errcode = 'P0001', hint = 'leitura_imutavel'; end if;
  return new;
end; $$;
create trigger integrated_readings_proteger before update or delete on public.integrated_readings for each row execute function public.proteger_leitura_integrada();

-- ============================================================================
-- 10. PROTECOES: coleta/resultado consolidado nao e sobrescrito nem apagado
-- ============================================================================
-- Coletas V1 (source <> legacy_panel) em salvo/revisado: so superseded_at, state (salvo→revisado),
-- reviewed_*, revision_note e updated_at mudam; o conteudo exige revisao (nova linha).
-- O painel legado (source = legacy_panel) mantem o comportamento historico ate ser desligado.
create or replace function public.proteger_coleta_consolidada()
returns trigger language plpgsql set search_path = '' as $$
declare livres text[] := array['updated_at','superseded_at','state','reviewed_at','reviewed_by','revision_note'];
begin
  if tg_op = 'DELETE' then
    if old.source <> 'legacy_panel' and old.state in ('salvo','revisado') then
      raise exception 'coleta consolidada nao e apagada: corrija com uma revisao' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
    return old;
  end if;
  if old.source = 'legacy_panel' then return new; end if;
  if old.state in ('salvo','revisado') then
    if (to_jsonb(old) - livres) <> (to_jsonb(new) - livres) then
      raise exception 'coleta consolidada e imutavel: corrija com revisar_coleta_laboratorial' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
    if new.state = 'rascunho' then raise exception 'coleta consolidada nao volta a rascunho' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
    if old.state = 'revisado' and new.state <> 'revisado' then raise exception 'coleta revisada nao muda de estado' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
    if old.superseded_at is not null and new.superseded_at is distinct from old.superseded_at then raise exception 'superseded_at nao muda depois de definido' using errcode = 'P0001'; end if;
  end if;
  if new.patient_id <> old.patient_id or new.nutritionist_id <> old.nutritionist_id then raise exception 'coleta nao muda de paciente nem de profissional' using errcode = 'P0001'; end if;
  return new;
end; $$;
create trigger lab_collections_proteger before update or delete on public.lab_collections for each row execute function public.proteger_coleta_consolidada();

create or replace function public.proteger_resultado_consolidado()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_state text; v_source text; v_cid uuid;
begin
  v_cid := case when tg_op = 'DELETE' then old.collection_id else new.collection_id end;
  select c.state, c.source into v_state, v_source from public.lab_collections c where c.id = v_cid;
  if v_source is distinct from 'legacy_panel' and v_state in ('salvo','revisado') and coalesce(current_setting('holohacking.lab_rpc', true), '') <> v_cid::text then
    raise exception 'resultado de coleta consolidada e imutavel: corrija com revisar_coleta_laboratorial' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
  if tg_op = 'UPDATE' and new.collection_id <> old.collection_id then raise exception 'resultado nao muda de coleta' using errcode = 'P0001'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function public.proteger_resultado_consolidado() from public, anon, authenticated;
create trigger lab_results_proteger before insert or update or delete on public.lab_results for each row execute function public.proteger_resultado_consolidado();
create or replace function public.proteger_componente_consolidado()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_state text; v_source text; v_cid uuid;
begin
  select c.id, c.state, c.source into v_cid, v_state, v_source from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = case when tg_op = 'DELETE' then old.result_id else new.result_id end;
  if v_source is distinct from 'legacy_panel' and v_state in ('salvo','revisado') and coalesce(current_setting('holohacking.lab_rpc', true), '') <> v_cid::text then
    raise exception 'componente de coleta consolidada e imutavel: corrija com revisar_coleta_laboratorial' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function public.proteger_componente_consolidado() from public, anon, authenticated;
create trigger lab_result_components_proteger_consolidado before insert or update or delete on public.lab_result_components for each row execute function public.proteger_componente_consolidado();

-- RLS dos componentes: via resultado → coleta
alter table public.lab_result_components enable row level security;
create policy lab_result_components_select on public.lab_result_components for select to authenticated
  using (exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = lab_result_components.result_id and c.nutritionist_id = (select auth.uid())));
create policy lab_result_components_insert on public.lab_result_components for insert to authenticated
  with check (exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = lab_result_components.result_id and c.nutritionist_id = (select auth.uid())));
create policy lab_result_components_update on public.lab_result_components for update to authenticated
  using (exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = lab_result_components.result_id and c.nutritionist_id = (select auth.uid())));
create policy lab_result_components_delete on public.lab_result_components for delete to authenticated
  using (exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = lab_result_components.result_id and c.nutritionist_id = (select auth.uid())));
revoke all on table public.lab_result_components from public, anon;
grant select, insert, update, delete on table public.lab_result_components to authenticated;

-- ============================================================================
-- 11. RPCs
-- ============================================================================
-- Grava resultados numa coleta (substitui os existentes). Uso interno das RPCs abaixo.
create or replace function public.lab_gravar_resultados(p_cid uuid, p_uid uuid, p_results jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; comp jsonb; rid uuid; n integer := 0; pos integer := 0; v_code text; v_cust uuid; v_q text; v_nv numeric; v_refst text;
begin
  perform set_config('holohacking.lab_rpc', p_cid::text, true);
  delete from public.lab_result_components x using public.lab_results y where x.result_id = y.id and y.collection_id = p_cid and y.exame_id is null;
  delete from public.lab_results where collection_id = p_cid and exame_id is null;
  for r in select value from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    pos := pos + 1;
    v_code := nullif(btrim(coalesce(r->>'exam_code','')), ''); v_cust := nullif(r->>'custom_exam_id','')::uuid;
    if v_code is null and v_cust is null then raise exception 'resultado % sem exame (exam_code ou custom_exam_id)', pos using errcode = 'P0001', hint = 'resultado_sem_exame'; end if;
    if v_code is not null and v_cust is not null then raise exception 'resultado % com exame do catalogo E customizado', pos using errcode = 'P0001'; end if;
    if v_code is not null and not exists (select 1 from public.lab_exam_catalog c where c.code = v_code and c.status = 'ativo') then raise exception 'exame % nao existe no catalogo-base', v_code using errcode = 'P0001', hint = 'exame_desconhecido'; end if;
    if v_cust is not null and not exists (select 1 from public.lab_custom_exams c where c.id = v_cust and c.nutritionist_id = p_uid) then raise exception 'exame customizado nao e deste profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if length(btrim(coalesce(r->>'value_original_text',''))) = 0 then raise exception 'resultado % sem valor original', pos using errcode = 'P0001', hint = 'valor_ausente'; end if;
    v_q := coalesce(r->>'qualifier', 'text'); v_nv := case when v_q = 'eq' then (r->>'numeric_value')::numeric else null end;
    v_refst := case when r->>'report_reference_text' is not null or r->>'report_reference_min' is not null or r->>'report_reference_max' is not null then 'informed' else 'missing' end;
    insert into public.lab_results (collection_id, exam_code, custom_exam_id, variant, value_original_text, numeric_value, qualifier, censor_limit, unit_original, method, material,
        report_reference_text, report_reference_min, report_reference_max, report_reference_operator, report_reference_unit, report_reference_population, reference_status, reference_source, origin, notes, result_date, position)
      values (p_cid, v_code, v_cust, nullif(btrim(coalesce(r->>'variant','')), ''), btrim(r->>'value_original_text'), v_nv, v_q, (r->>'censor_limit')::numeric, nullif(btrim(coalesce(r->>'unit_original','')), ''), nullif(btrim(coalesce(r->>'method','')), ''), nullif(btrim(coalesce(r->>'material','')), ''),
        r->>'report_reference_text', (r->>'report_reference_min')::numeric, (r->>'report_reference_max')::numeric, coalesce(r->>'report_reference_operator', case when v_refst = 'informed' then 'range' end), r->>'report_reference_unit', r->>'report_reference_population', v_refst, 'laudo',
        coalesce(r->>'origin', 'manual'), r->>'notes', (r->>'result_date')::date, pos)
      returning id into rid;
    n := n + 1;
    for comp in select value from jsonb_array_elements(coalesce(r->'components', '[]'::jsonb)) loop
      insert into public.lab_result_components (result_id, position, original_name, canonical_component_key, value_original_text, numeric_value, qualifier, censor_limit, unit_original, report_reference_text, report_reference_min, report_reference_max, report_reference_operator, notes)
        values (rid, coalesce((comp->>'position')::int, 0), comp->>'original_name', comp->>'canonical_component_key', comp->>'value_original_text',
          case when coalesce(comp->>'qualifier','text') = 'eq' then (comp->>'numeric_value')::numeric end, coalesce(comp->>'qualifier','text'), (comp->>'censor_limit')::numeric, comp->>'unit_original',
          comp->>'report_reference_text', (comp->>'report_reference_min')::numeric, (comp->>'report_reference_max')::numeric, comp->>'report_reference_operator', comp->>'notes');
    end loop;
  end loop;
  perform set_config('holohacking.lab_rpc', '', true);
  return n;
end; $$;
revoke all on function public.lab_gravar_resultados(uuid, uuid, jsonb) from public, anon, authenticated;

-- salvar_coleta_laboratorial(payload): collection { id?, patient_id, clinical_date, clinical_time?, laboratory_name?, encounter_id? (so se explicitamente informado),
--   notes?, state ('rascunho'|'salvo'), document_id?, operation_id? }, results [...]
--   * id ausente  → NOVA coleta, sempre (mesmo que ja exista outra na mesma data); operation_id repetido devolve a mesma
--   * id presente → edita AQUELA coleta, so se ainda rascunho; consolidada exige revisar_coleta_laboratorial
--   * nunca procura coleta por data; nunca escolhe atendimento pela data
create or replace function public.salvar_coleta_laboratorial(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c jsonb := payload->'collection'; cid uuid; pid uuid; eid uuid; st text; n int; op uuid; existente public.lab_collections%rowtype; dt date;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if c is null then raise exception 'payload incompleto: collection e obrigatoria' using errcode = 'P0001'; end if;
  pid := (c->>'patient_id')::uuid;
  if not exists (select 1 from public.patients p where p.id = pid and p.nutritionist_id = uid) then raise exception 'paciente nao e deste profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  st := coalesce(c->>'state', 'rascunho');
  if st not in ('rascunho','salvo') then raise exception 'estado invalido para salvar: % (revisado exige marcar_coleta_revisada)', st using errcode = 'P0001'; end if;
  dt := (c->>'clinical_date')::date;
  if dt is null and st = 'salvo' then raise exception 'coleta salva exige a data clinica (clinical_date)' using errcode = 'P0001', hint = 'data_ausente'; end if;
  if c ? 'encounter_id' and c->>'encounter_id' is not null then
    eid := (c->>'encounter_id')::uuid;
    if not exists (select 1 from public.encounters e where e.id = eid and e.patient_id = pid and e.nutritionist_id = uid) then raise exception 'atendimento nao e deste paciente/profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end if;
  op := nullif(c->>'operation_id','')::uuid;
  if c->>'id' is null and op is not null then
    select * into existente from public.lab_collections x where x.nutritionist_id = uid and x.operation_id = op;
    if found then
      if existente.patient_id <> pid then raise exception 'operation_id ja usado em coleta de outro paciente' using errcode = 'P0001'; end if;
      return jsonb_build_object('id', existente.id, 'state', existente.state, 'repetida', true);
    end if;
  end if;
  if c->>'id' is not null then
    cid := (c->>'id')::uuid;
    select * into existente from public.lab_collections x where x.id = cid and x.nutritionist_id = uid and x.patient_id = pid for update;
    if not found then raise exception 'coleta % nao encontrada para este paciente', cid using errcode = 'P0002'; end if;
    if existente.source <> 'legacy_panel' and existente.state in ('salvo','revisado') then raise exception 'coleta consolidada: use revisar_coleta_laboratorial' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
    update public.lab_collections set coletado_em = dt, data_coleta_desconhecida = (dt is null), clinical_time = (c->>'clinical_time')::time, laboratorio = c->>'laboratory_name', observacao = c->>'notes',
      encounter_id = case when c ? 'encounter_id' then eid else encounter_id end, document_id = case when c ? 'document_id' then nullif(c->>'document_id','')::uuid else document_id end,
      state = st, source = 'manual', operation_id = coalesce(op, operation_id)
      where id = cid;
  else
    insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, clinical_time, laboratorio, observacao, encounter_id, document_id, state, source, operation_id, created_by)
      values (uid, pid, dt, dt is null, (c->>'clinical_time')::time, c->>'laboratory_name', c->>'notes', eid, nullif(c->>'document_id','')::uuid, st, coalesce(c->>'source','manual'), op, uid)
      returning id into cid;
  end if;
  n := public.lab_gravar_resultados(cid, uid, payload->'results');
  if st = 'salvo' and n = 0 then raise exception 'coleta salva exige ao menos um resultado' using errcode = 'P0001', hint = 'sem_resultados'; end if;
  return jsonb_build_object('id', cid, 'state', st, 'results', n, 'repetida', false);
end; $$;
revoke all on function public.salvar_coleta_laboratorial(jsonb) from public, anon;
grant execute on function public.salvar_coleta_laboratorial(jsonb) to authenticated;

-- revisar_coleta_laboratorial(payload): { collection_id, reason, collection{...}, results[...] }
--   correcao de coleta consolidada = NOVA REVISAO (nova linha, supersedes_id), nunca sobrescrita.
--   clinical_date continua a data da coleta real (salvo correcao explicita no payload); created_at e registro.
create or replace function public.revisar_coleta_laboratorial(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); old public.lab_collections%rowtype; c jsonb := coalesce(payload->'collection', '{}'::jsonb); novo uuid; n int; dt date; eid uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into old from public.lab_collections x where x.id = (payload->>'collection_id')::uuid and x.nutritionist_id = uid for update;
  if not found then raise exception 'coleta nao encontrada' using errcode = 'P0002'; end if;
  if old.state = 'rascunho' then raise exception 'coleta em rascunho se edita com salvar_coleta_laboratorial' using errcode = 'P0001'; end if;
  if old.superseded_at is not null then raise exception 'esta coleta ja foi substituida por uma revisao' using errcode = 'P0001', hint = 'ja_revisada'; end if;
  if length(btrim(coalesce(payload->>'reason',''))) = 0 then raise exception 'revisao exige motivo' using errcode = 'P0001', hint = 'motivo_ausente'; end if;
  dt := coalesce((c->>'clinical_date')::date, old.coletado_em);
  if dt is null then raise exception 'revisao de coleta consolidada exige a data clinica' using errcode = 'P0001', hint = 'data_ausente'; end if;
  eid := case when c ? 'encounter_id' then nullif(c->>'encounter_id','')::uuid else old.encounter_id end;
  if eid is not null and not exists (select 1 from public.encounters e where e.id = eid and e.patient_id = old.patient_id and e.nutritionist_id = uid) then raise exception 'atendimento nao e deste paciente/profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, clinical_time, laboratorio, observacao, encounter_id, document_id, state, source, revision, supersedes_id, revision_note, created_by)
    values (uid, old.patient_id, dt, false, coalesce((c->>'clinical_time')::time, old.clinical_time), coalesce(c->>'laboratory_name', old.laboratorio), coalesce(c->>'notes', old.observacao), eid,
      case when c ? 'document_id' then nullif(c->>'document_id','')::uuid else old.document_id end, 'salvo', 'revision', old.revision + 1, old.id, btrim(payload->>'reason'), uid)
    returning id into novo;
  n := public.lab_gravar_resultados(novo, uid, payload->'results');
  if n = 0 then raise exception 'revisao exige ao menos um resultado' using errcode = 'P0001', hint = 'sem_resultados'; end if;
  update public.lab_collections set superseded_at = now() where id = old.id;
  return jsonb_build_object('id', novo, 'supersedes_id', old.id, 'revision', old.revision + 1, 'results', n);
end; $$;
revoke all on function public.revisar_coleta_laboratorial(jsonb) from public, anon;
grant execute on function public.revisar_coleta_laboratorial(jsonb) to authenticated;

-- marcar_coleta_revisada: salvo → revisado, acao humana identificada
create or replace function public.marcar_coleta_revisada(p_collection_id uuid, p_responsible text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); st text;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if length(btrim(coalesce(p_responsible,''))) = 0 then raise exception 'revisao exige responsavel identificado' using errcode = 'P0001'; end if;
  select state into st from public.lab_collections where id = p_collection_id and nutritionist_id = uid;
  if st is null then raise exception 'coleta nao encontrada' using errcode = 'P0002'; end if;
  if st <> 'salvo' then raise exception 'so coleta salva passa a revisada (estado atual: %)', st using errcode = 'P0001'; end if;
  update public.lab_collections set state = 'revisado', reviewed_at = now(), reviewed_by = uid, revision_note = coalesce(revision_note, '') || case when revision_note is null then '' else ' | ' end || 'revisado por ' || btrim(p_responsible) where id = p_collection_id;
  return jsonb_build_object('id', p_collection_id, 'state', 'revisado');
end; $$;
revoke all on function public.marcar_coleta_revisada(uuid, text) from public, anon;
grant execute on function public.marcar_coleta_revisada(uuid, text) to authenticated;

-- salvar_leitura_integrada(payload): congela fontes e resultado do motor. BARREIRA: enquanto o pacote nao tiver
-- vinculo exame→dominio aprovado, so 'sem_dados_suficientes' e aceito. Correcao = nova revisao (supersedes_id).
create or replace function public.salvar_leitura_integrada(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pid uuid; hid uuid; pkg public.integrated_reading_rule_packages%rowtype; x text; cids uuid[] := '{}'; rids uuid[] := '{}'; novo uuid; sup uuid; rev int := 1; h text; conteudo jsonb; eid uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  pid := (payload->>'patient_id')::uuid;
  if not exists (select 1 from public.patients p where p.id = pid and p.nutritionist_id = uid) then raise exception 'paciente nao e deste profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if length(btrim(coalesce(payload->>'responsible',''))) = 0 then raise exception 'leitura exige responsavel identificado' using errcode = 'P0001'; end if;
  if payload->>'state' not in ('convergente','divergente','sem_dados_suficientes') then raise exception 'estado invalido' using errcode = 'P0001'; end if;
  select * into pkg from public.integrated_reading_rule_packages k where k.id = (payload->>'rule_package_id')::uuid;
  if not found then raise exception 'pacote de regras nao encontrado' using errcode = 'P0002'; end if;
  if payload->>'state' <> 'sem_dados_suficientes' and not exists (select 1 from public.integrated_reading_exam_domain_links l join public.integrated_reading_domains d on d.id = l.domain_id
      where l.package_id = pkg.id and l.status = 'aprovado' and d.status = 'aprovado') then
    raise exception 'pacote % sem vinculo exame→dominio aprovado: a unica leitura possivel e sem_dados_suficientes', pkg.code using errcode = 'P0001', hint = 'sem_regra_homologada';
  end if;
  if payload->>'state' <> 'sem_dados_suficientes' and pkg.status <> 'aprovado' then raise exception 'pacote % nao aprovado: nenhuma leitura convergente/divergente e oficial', pkg.code using errcode = 'P0001', hint = 'sem_regra_homologada'; end if;
  hid := nullif(payload->>'holoscan_application_id','')::uuid;
  if hid is not null and not exists (select 1 from public.holoscan_applications a where a.id = hid and a.patient_id = pid and a.nutritionist_id = uid) then raise exception 'aplicacao HOLOSCAN nao e deste paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  for x in select value from jsonb_array_elements_text(coalesce(payload->'selected_collection_ids','[]'::jsonb)) loop
    if not exists (select 1 from public.lab_collections c where c.id = x::uuid and c.patient_id = pid and c.nutritionist_id = uid) then raise exception 'coleta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    cids := cids || x::uuid;
  end loop;
  for x in select value from jsonb_array_elements_text(coalesce(payload->'selected_result_ids','[]'::jsonb)) loop
    if not exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = x::uuid and c.patient_id = pid and c.nutritionist_id = uid) then raise exception 'resultado % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    rids := rids || x::uuid;
  end loop;
  eid := nullif(payload->>'encounter_id','')::uuid;
  sup := nullif(payload->>'supersedes_id','')::uuid;
  if sup is not null then
    select revision + 1 into rev from public.integrated_readings i where i.id = sup and i.nutritionist_id = uid and i.patient_id = pid and i.superseded_at is null;
    if rev is null then raise exception 'leitura anterior nao encontrada ou ja revisada' using errcode = 'P0001'; end if;
  end if;
  conteudo := jsonb_build_object('patient_id', pid, 'holoscan_application_id', hid, 'collections', to_jsonb(cids), 'results', to_jsonb(rids), 'references', coalesce(payload->'references_snapshot','[]'::jsonb),
    'sources', coalesce(payload->'sources_snapshot','{}'::jsonb), 'rule_package', pkg.code || '@' || pkg.version, 'engine', payload->>'engine_version', 'state', payload->>'state', 'reason_codes', coalesce(payload->'reason_codes','[]'::jsonb), 'trace', coalesce(payload->'trace','{}'::jsonb), 'note', payload->>'professional_note');
  h := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');
  insert into public.integrated_readings (nutritionist_id, patient_id, encounter_id, responsible, clinical_context, holoscan_application_id, selected_collection_ids, selected_result_ids, references_snapshot, sources_snapshot, rule_package_id, rule_version, engine_version, state, reason_codes, trace, professional_note, revision, supersedes_id, content_hash, created_by)
    values (uid, pid, eid, btrim(payload->>'responsible'), payload->>'clinical_context', hid, cids, rids, coalesce(payload->'references_snapshot','[]'::jsonb), coalesce(payload->'sources_snapshot','{}'::jsonb), pkg.id, pkg.version, coalesce(payload->>'engine_version','?'), payload->>'state', coalesce(payload->'reason_codes','[]'::jsonb), coalesce(payload->'trace','{}'::jsonb), payload->>'professional_note', rev, sup, h, uid)
    returning id into novo;
  if sup is not null then update public.integrated_readings set superseded_at = now() where id = sup; end if;
  return jsonb_build_object('id', novo, 'state', payload->>'state', 'revision', rev, 'content_hash', h);
end; $$;
revoke all on function public.salvar_leitura_integrada(jsonb) from public, anon;
grant execute on function public.salvar_leitura_integrada(jsonb) to authenticated;
