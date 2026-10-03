-- REGRESSAO: dados legados (supabase/tests/legado-seed-pre-etapa5.sql) atravessaram a cadeia inteira. Roda no fim da transacao local.
create or replace function pg_temp.okf(b boolean) returns text language sql as $$ select case when b then 'ok' else 'FALHOU' end $$;
do $$
declare r public.lab_results%rowtype; n int; t1 text; t2 text;
begin
  select count(*) into n from public.lab_results where not (exam_code is not null or custom_exam_id is not null or origin in ('additional_legacy','legacy_migrated') or requires_manual_mapping);
  raise notice 'L01 %: toda linha de lab_results satisfaz lab_results_identidade (violacoes=%)', pg_temp.okf(n = 0), n;
  raise notice 'L02 %: lab_results_identidade esta VALIDADA (convalidated)', pg_temp.okf((select convalidated from pg_constraint where conname = 'lab_results_identidade'));
  select * into r from public.lab_results where legacy_exame_id = 'EXA-002' and valor = 1.8;
  raise notice 'L03 %: EXA-002 legado -> LAB-016 / ultrassensivel / legacy_migrated / sem mapeamento manual / valor original e referencia missing (%,%,%,%,%,%)', pg_temp.okf(r.exam_code = 'LAB-016' and r.variant = 'ultrassensivel' and r.origin = 'legacy_migrated' and not r.requires_manual_mapping and r.value_original_text = '1.8' and r.reference_status = 'missing' and r.legacy_ideal_max = 1 and r.legacy_sistema = 'acido_inflamatorio'), r.exam_code, r.variant, r.origin, r.requires_manual_mapping, r.value_original_text, r.reference_status;
  select * into r from public.lab_results where legacy_exame_id = 'EXA-006';
  raise notice 'L04 %: EXA-006 legado -> sem exam_code, requires_manual_mapping, nota de confirmacao (%)', pg_temp.okf(r.exam_code is null and r.requires_manual_mapping and r.origin = 'legacy_migrated' and r.mapping_note like '%confirmar identidade%'), left(r.mapping_note, 40);
  select * into r from public.lab_results where legacy_exame_id = 'EXA-001';
  raise notice 'L05 %: EXA-001 legado -> additional_legacy sem exam_code e sem mapeamento manual (%,%)', pg_temp.okf(r.exam_code is null and r.origin = 'additional_legacy' and not r.requires_manual_mapping), r.origin, r.requires_manual_mapping;
  select * into r from public.lab_results where legacy_exame_id = 'EXA-099';
  raise notice 'L06 %: exame legado sem mapeamento provado -> requires_manual_mapping + nota (%)', pg_temp.okf(r.exam_code is null and r.origin = 'legacy_migrated' and r.requires_manual_mapping and r.mapping_note = 'exame legado sem mapeamento provado'), r.mapping_note;
  select * into r from public.lab_results where legacy_exame_id = 'EXA-009' and valor = 210;
  raise notice 'L07 %: resultado legado de paciente ARQUIVADO tambem migrou (bloqueio de arquivado nao barra a normalizacao) (%)', pg_temp.okf(r.exam_code = 'LAB-005' and r.value_original_text = '210'), r.exam_code;
  select count(*) into n from public.lab_results r2 join public.lab_collections c2 on c2.id = r2.collection_id where r2.legacy_exame_id is not null and c2.laboratorio = 'Lab Seed';
  raise notice 'L08 %: 7 resultados legados preservados (legacy_exame_id) e value_original_text preenchido em todos (%)', pg_temp.okf(n = 7 and (select count(*) from public.lab_results r3 join public.lab_collections c3 on c3.id = r3.collection_id where c3.laboratorio = 'Lab Seed' and r3.value_original_text is null) = 0), n;
  select count(*) into n from public.lab_collections where laboratorio = 'Lab Seed' and (source <> 'legacy_panel' or state <> 'salvo');
  raise notice 'L09 %: coletas legadas normalizadas (legacy_panel / salvo) (fora=%)', pg_temp.okf(n = 0), n;
  select tgenabled into t1 from pg_trigger where tgname = 'lab_results_paciente_arquivado';
  select tgenabled into t2 from pg_trigger where tgname = 'lab_collections_paciente_arquivado';
  raise notice 'L10 %: triggers de paciente arquivado RELIGADOS apos a normalizacao (%,%)', pg_temp.okf(t1 = 'O' and t2 = 'O'), t1, t2;
  raise notice 'L11 %: score HOLOSCAN legado (nota 10 / avaliavel=false) preservado sem reescrita (constraint 130000 NOT VALID)', pg_temp.okf((select nota = 10 and not avaliavel from public.holoscan_system_scores where sistema = 'metabolico' and nome = 'Metabolico' limit 1));
  begin
    update public.lab_results set valor = 99 where legacy_exame_id = 'EXA-009' and valor = 210;
    raise notice 'L12 FALHOU: escrita clinica em resultado de paciente arquivado foi aceita apos a migration';
  exception when others then raise notice 'L12 ok: escrita clinica em paciente arquivado continua bloqueada apos a migration (%)', left(sqlerrm, 50);
  end;
end $$;
