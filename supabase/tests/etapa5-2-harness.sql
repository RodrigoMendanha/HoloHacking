-- Harness ETAPA 5.2 (migration 20261002100000 — governanca da Leitura Integrada): roda DENTRO da transacao
-- do scripts/validar-cadeia-local.sh (BEGIN ... ROLLBACK), depois de etapa5-harness.sql.
-- Pacotes/dominios/regras/referencias aqui sao TEST_FIXTURE_ONLY num banco local descartavel: nada e metodologia,
-- nada persiste. O pacote real LI-V1@1 nao e tocado.
create temp table _log52 (passo text) on commit drop;
grant insert, select on _log52 to authenticated;
create temp table _li52 (k text primary key, v text) on commit drop;
grant insert, select, update on _li52 to authenticated;

-- ---------- gestao tecnica (como migration): fixtures ----------
reset role;
do $$
declare pk uuid; pc uuid; d1 uuid; rf uuid; cv uuid; dv uuid;
begin
  insert into _li52 values ('holo_aprov_antes', (select count(*) from public.methodology_package_approvals)::text);
  insert into public.integrated_reading_rule_packages (code, version, status, notes) values ('TEST_FIXTURE_ONLY-LI-A', 1, 'em_revisao', 'fixture incompleta') returning id into pk;
  insert into _li52 values ('pk', pk::text);
  -- pacote "completo" (fixture): dominio + vinculo com referencia + regras temporal/suficiencia/mistos/convergencia/texto + dependencias
  insert into public.lab_method_references (exam_code, lower_bound, upper_bound, unit, source, justification, effective_from, status, responsible, approval_provenance, content_hash)
    values ('LAB-002', 1, 2, 'u', 'TEST_FIXTURE_ONLY', 'fixture', current_date, 'aprovado', 'fixture', '{}'::jsonb, 'fixture') returning id into rf;
  insert into public.lab_unit_conversion_rules (exam_code, from_unit, to_unit, factor, source, rule_version, status, responsible, approval_provenance)
    values ('LAB-002', 'u', 'w', 2, 'TEST_FIXTURE_ONLY', '1', 'aprovado', 'fixture', '{}'::jsonb) returning id into cv;
  insert into public.lab_derived_calculations (code, formula, formula_version, inputs, required_units, source, status, responsible, approval_provenance)
    values ('TEST_FIXTURE_ONLY_DERIV', 'a*b', '1', '[]'::jsonb, '{}'::jsonb, 'TEST_FIXTURE_ONLY', 'aprovado', 'fixture', '{}'::jsonb) returning id into dv;
  insert into public.integrated_reading_rule_packages (code, version, status, notes) values ('TEST_FIXTURE_ONLY-LI-C', 1, 'em_revisao', 'fixture completa') returning id into pc;
  insert into public.integrated_reading_domains (package_id, code, name, status) values (pc, 'TEST_FIXTURE_ONLY_D1', 'fixture', 'aprovado') returning id into d1;
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, direction, reference_id, status) values (pc, d1, 'LAB-002', 'any', rf, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values
    (pc, 'temporal', 'global', '{"max_days": 1}', 'aprovado'), (pc, 'sufficiency', 'global', '{"min_results": 1}', 'aprovado'),
    (pc, 'mixed', 'global', '{"policy": "insufficient"}', 'aprovado'), (pc, 'convergence', 'global', '{"holoscan_max_nota": 1}', 'aprovado'),
    (pc, 'text', 'global', '{"convergente": "f", "divergente": "f", "sem_dados_suficientes": "f"}', 'aprovado');
  insert into public.integrated_reading_package_dependencies (package_id, kind, ref_id, status) values (pc, 'reference', rf, 'aprovado'), (pc, 'conversion', cv, 'aprovado'), (pc, 'derived', dv, 'aprovado');
  insert into _li52 values ('pc', pc::text), ('rf', rf::text), ('cv', cv::text), ('dv', dv::text), ('d1', d1::text);
  insert into _log52 values ('G00 ' || case when (select status from public.integrated_reading_rule_packages where code = 'LI-V1') = 'rascunho' and (select count(*) from public.integrated_reading_package_approvals) = 0 then 'ok' else 'FALHOU' end || ': LI-V1@1 em rascunho; nenhuma aprovacao nasce da migration');
end $$;

-- ---------- aplicacao (authenticated) ----------
set local role authenticated;
do $$
declare pk uuid := (select v::uuid from _li52 where k = 'pk'); pc uuid := (select v::uuid from _li52 where k = 'pc'); li uuid := (select id from public.integrated_reading_rule_packages where code = 'LI-V1');
  h text; hc text; r jsonb; v jsonb; t text;
begin
  h := public.li_hash_conteudo(pk); hc := public.li_hash_conteudo(pc);
  insert into _li52 values ('h', h), ('hc', hc);
  insert into _log52 values ('G01 ' || case when h ~ '^[0-9a-f]{64}$' and h = public.li_hash_conteudo(pk) and h <> hc then 'ok' else 'FALHOU' end || ': hash canonico calculado no servidor, estavel, distinto por conteudo');
  v := public.li_validar_completude(li);
  insert into _log52 values ('G02 ' || case when (v->>'publicavel')::boolean = false and v->'bloqueios' ? 'sem_dominio_aprovado' and v->'bloqueios' ? 'sem_regra_temporal' and v->'bloqueios' ? 'sem_regra_suficiencia' and v->'bloqueios' ? 'sem_regra_convergencia_divergencia' and v->'bloqueios' ? 'sem_regra_resultados_mistos' then 'ok' else 'FALHOU' end || ': validador de completude aponta os bloqueios do LI-V1: ' || (v->>'total_bloqueios'));
  insert into _log52 values ('G03 ' || case when (public.li_validar_completude(pc)->>'publicavel')::boolean then 'ok' else 'FALHOU' end || ': fixture completa passa no validador (sem inventar conteudo real): ' || left((public.li_validar_completude(pc)->'bloqueios')::text, 60));
  begin perform public.registrar_aprovacao_li(li, 1, public.li_hash_conteudo(li), 1, 'Daniel', 'x'); insert into _log52 values ('G04 FALHOU: aprovacao em LI-V1 (rascunho) aceita');
  exception when others then insert into _log52 values ('G04 ok: LI-V1 em rascunho nao recebe aprovacao: ' || left(sqlerrm, 40)); end;
  begin perform public.registrar_aprovacao_li(pk, 1, h, 2, 'Rodrigo', 'x'); insert into _log52 values ('G05 FALHOU: Rodrigo antes de Daniel aceito');
  exception when others then insert into _log52 values ('G05 ok: Rodrigo antes de Daniel recusado'); end;
  begin perform public.registrar_aprovacao_li(pk, 1, h, 1, 'Rodrigo', 'x'); insert into _log52 values ('G06 FALHOU: Aprovacao 1 por Rodrigo aceita');
  exception when others then insert into _log52 values ('G06 ok: responsavel errado recusado'); end;
  begin perform public.registrar_aprovacao_li(pk, 1, h, 1, 'Liderança do método HOLOSCAN', 'x'); insert into _log52 values ('G07 FALHOU: Lideranca aceita');
  exception when others then insert into _log52 values ('G07 ok: "Liderança do método HOLOSCAN" recusada'); end;
  begin perform public.registrar_aprovacao_li(pk, 1, repeat('0', 64), 1, 'Daniel', 'x'); insert into _log52 values ('G08 FALHOU: hash divergente aceito');
  exception when others then insert into _log52 values ('G08 ok: hash divergente recusado'); end;
  begin perform public.registrar_aprovacao_li(pk, 2, h, 1, 'Daniel', 'x'); insert into _log52 values ('G09 FALHOU: versao divergente aceita');
  exception when others then insert into _log52 values ('G09 ok: versao divergente recusada'); end;
  begin perform public.registrar_aprovacao_li(pk, 1, h, 1, 'Daniel', '  '); insert into _log52 values ('G10 FALHOU: sem justificativa aceita');
  exception when others then insert into _log52 values ('G10 ok: justificativa vazia recusada'); end;
  begin insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification) values (pk, 1, h, 1, 'responsavel_primario', 'Daniel', 'direto');
    insert into _log52 values ('G11 FALHOU: aprovacao inserida direto');
  exception when others then insert into _log52 values ('G11 ok: escrita direta na tabela de aprovacoes proibida: ' || left(sqlerrm, 30)); end;
  r := public.registrar_aprovacao_li(pk, 1, h, 1, 'Daniel', 'conferido (fixture)');
  select status into t from public.integrated_reading_rule_packages where id = pk;
  insert into _log52 values ('G12 ' || case when t = 'em_revisao' and r->>'content_hash' = h and (r->'completude'->>'publicavel')::boolean = false then 'ok' else 'FALHOU' end || ': Daniel valido passa; pacote continua em_revisao; resposta traz os bloqueios');
  begin perform public.registrar_aprovacao_li(pk, 1, h, 1, 'Daniel', 'de novo'); insert into _log52 values ('G13 FALHOU: Aprovacao 1 duplicada');
  exception when others then insert into _log52 values ('G13 ok: Aprovacao 1 repetida recusada'); end;
  begin perform public.homologar_pacote_li(pk, 1, h, 'Rodrigo'); insert into _log52 values ('G14 FALHOU: homologado so com a Aprovacao 1');
  exception when others then insert into _log52 values ('G14 ok: so com Aprovacao 1 nao homologa'); end;
  r := public.registrar_aprovacao_li(pk, 1, h, 2, 'Rodrigo', 'revisado (fixture)');
  insert into _log52 values ('G15 ' || case when (select count(*) from public.integrated_reading_package_approvals where package_id = pk and invalidated_at is null) = 2 and (select status from public.integrated_reading_rule_packages where id = pk) = 'em_revisao' then 'ok' else 'FALHOU' end || ': Rodrigo valido passa depois de Daniel; duas aprovacoes NAO homologam sozinhas');
  begin perform public.homologar_pacote_li(pk, 1, h, 'Rodrigo'); insert into _log52 values ('G16 FALHOU: pacote incompleto homologado');
  exception when others then insert into _log52 values ('G16 ok: pacote incompleto nao homologa mesmo com as duas aprovacoes: ' || left(sqlerrm, 60)); end;
  begin update public.integrated_reading_rule_packages set status = 'aprovado' where id = pk; insert into _log52 values ('G17 FALHOU: status aprovado por UPDATE da aplicacao');
  exception when others then insert into _log52 values ('G17 ok: aplicacao nao altera status (sem GRANT): ' || left(sqlerrm, 30)); end;
  -- fixture completa: Daniel -> Rodrigo
  perform public.registrar_aprovacao_li(pc, 1, hc, 1, 'Daniel', 'fixture'); perform public.registrar_aprovacao_li(pc, 1, hc, 2, 'Rodrigo', 'fixture');
  insert into _log52 values ('G18 ' || case when (select count(*) from public.integrated_reading_package_approvals where package_id = pc and invalidated_at is null) = 2 then 'ok' else 'FALHOU' end || ': fixture completa com Aprovacoes 1 e 2 vigentes');
end $$;

-- ---------- gestao tecnica: alteracoes invalidam; voltar ao hash antigo nao ressuscita ----------
reset role;
do $$
declare pk uuid := (select v::uuid from _li52 where k = 'pk'); pc uuid := (select v::uuid from _li52 where k = 'pc'); h text := (select v from _li52 where k = 'h'); hc text := (select v from _li52 where k = 'hc'); d uuid; h2 text;
begin
  begin update public.integrated_reading_rule_packages set status = 'aprovado' where id = pk; insert into _log52 values ('G19 FALHOU: trigger deixou status aprovado por UPDATE direto');
  exception when others then insert into _log52 values ('G19 ok: nem UPDATE direto (gestao tecnica) poe aprovado — so homologar_pacote_li: ' || left(sqlerrm, 40)); end;
  insert into public.integrated_reading_domains (package_id, code, name, status) values (pk, 'TEST_FIXTURE_ONLY_X', 'x', 'rascunho') returning id into d;
  h2 := public.li_hash_conteudo(pk);
  insert into _log52 values ('G20 ' || case when h2 <> h and (select count(*) from public.integrated_reading_package_approvals where package_id = pk and invalidated_at is null) = 0
    and (select count(*) from public.integrated_reading_package_approvals where package_id = pk and invalidated_at is not null and invalidated_reason like '%integrated_reading_domains insert%') = 2 then 'ok' else 'FALHOU' end || ': mudanca de dominio muda o hash e invalida as duas aprovacoes (historico com motivo)');
  delete from public.integrated_reading_domains where id = d;
  insert into _log52 values ('G21 ' || case when public.li_hash_conteudo(pk) = h and (select count(*) from public.integrated_reading_package_approvals where package_id = pk and invalidated_at is null) = 0 and (select count(*) from public.integrated_reading_package_approvals where package_id = pk) = 2 then 'ok' else 'FALHOU' end || ': voltar ao hash antigo NAO ressuscita aprovacao; historico preservado (2 linhas)');
  begin delete from public.integrated_reading_package_approvals where package_id = pk; insert into _log52 values ('G22 FALHOU: aprovacao apagada');
  exception when others then insert into _log52 values ('G22 ok: aprovacao e append-only (delete recusado)'); end;
  begin update public.integrated_reading_package_approvals set justification = 'x' where package_id = pk; insert into _log52 values ('G23 FALHOU: aprovacao editada');
  exception when others then insert into _log52 values ('G23 ok: aprovacao imutavel (update recusado)'); end;
  -- pacote completo: cada entidade relevante invalida
  update public.lab_method_references set justification = 'fixture 2' where id = (select v::uuid from _li52 where k = 'rf');
  insert into _log52 values ('G24 ' || case when (select count(*) from public.integrated_reading_package_approvals where package_id = pc and invalidated_at is null) = 0 and public.li_hash_conteudo(pc) <> hc then 'ok' else 'FALHOU' end || ': mudanca em referencia vinculada invalida e muda o hash');
  update _li52 set v = public.li_hash_conteudo(pc) where k = 'hc';
end $$;
set local role authenticated;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc');
begin perform public.registrar_aprovacao_li(pc, 1, hc, 1, 'Daniel', 'fixture'); perform public.registrar_aprovacao_li(pc, 1, hc, 2, 'Rodrigo', 'fixture'); end $$;
reset role;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc');
begin
  update public.lab_unit_conversion_rules set factor = 3 where id = (select v::uuid from _li52 where k = 'cv');
  insert into _log52 values ('G25 ' || case when (select count(*) from public.integrated_reading_package_approvals where package_id = pc and invalidated_at is null) = 0 and public.li_hash_conteudo(pc) <> hc then 'ok' else 'FALHOU' end || ': mudanca em conversao vinculada invalida e muda o hash');
  update _li52 set v = public.li_hash_conteudo(pc) where k = 'hc';
end $$;
set local role authenticated;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc');
begin perform public.registrar_aprovacao_li(pc, 1, hc, 1, 'Daniel', 'fixture'); perform public.registrar_aprovacao_li(pc, 1, hc, 2, 'Rodrigo', 'fixture'); end $$;
reset role;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc');
begin
  update public.lab_derived_calculations set formula_version = '2' where id = (select v::uuid from _li52 where k = 'dv');
  insert into _log52 values ('G26 ' || case when (select count(*) from public.integrated_reading_package_approvals where package_id = pc and invalidated_at is null) = 0 and public.li_hash_conteudo(pc) <> hc then 'ok' else 'FALHOU' end || ': mudanca em calculo derivado vinculado invalida e muda o hash');
  update _li52 set v = public.li_hash_conteudo(pc) where k = 'hc';
end $$;
set local role authenticated;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc');
begin perform public.registrar_aprovacao_li(pc, 1, hc, 1, 'Daniel', 'fixture'); perform public.registrar_aprovacao_li(pc, 1, hc, 2, 'Rodrigo', 'fixture'); end $$;
reset role;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc');
begin
  update public.integrated_reading_rules set payload = '{"max_days": 2}' where package_id = pc and rule_type = 'temporal';
  insert into _log52 values ('G27 ' || case when (select count(*) from public.integrated_reading_package_approvals where package_id = pc and invalidated_at is null) = 0 and public.li_hash_conteudo(pc) <> hc then 'ok' else 'FALHOU' end || ': mudanca de regra (temporal) invalida e muda o hash');
  update _li52 set v = public.li_hash_conteudo(pc) where k = 'hc';
end $$;
set local role authenticated;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc');
begin perform public.registrar_aprovacao_li(pc, 1, hc, 1, 'Daniel', 'fixture'); perform public.registrar_aprovacao_li(pc, 1, hc, 2, 'Rodrigo', 'fixture'); end $$;
reset role;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc');
begin
  update public.integrated_reading_exam_domain_links set direction = 'above' where package_id = pc;
  insert into _log52 values ('G28 ' || case when (select count(*) from public.integrated_reading_package_approvals where package_id = pc and invalidated_at is null) = 0 and public.li_hash_conteudo(pc) <> hc then 'ok' else 'FALHOU' end || ': mudanca de vinculo invalida e muda o hash');
  update _li52 set v = public.li_hash_conteudo(pc) where k = 'hc';
end $$;
set local role authenticated;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc');
begin perform public.registrar_aprovacao_li(pc, 1, hc, 1, 'Daniel', 'fixture'); perform public.registrar_aprovacao_li(pc, 1, hc, 2, 'Rodrigo', 'fixture'); end $$;
reset role;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc');
begin
  update public.integrated_reading_rule_packages set version = 2 where id = pc;
  insert into _log52 values ('G29 ' || case when (select count(*) from public.integrated_reading_package_approvals where package_id = pc and invalidated_at is null) = 0 and public.li_hash_conteudo(pc) <> hc then 'ok' else 'FALHOU' end || ': mudanca de version invalida e muda o hash');
  update _li52 set v = public.li_hash_conteudo(pc) where k = 'hc';
end $$;

-- ---------- homologacao (acao final explicita) ----------
set local role authenticated;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); hc text := (select v from _li52 where k = 'hc'); r jsonb; n int;
begin
  perform public.registrar_aprovacao_li(pc, 2, hc, 1, 'Daniel', 'fixture final'); perform public.registrar_aprovacao_li(pc, 2, hc, 2, 'Rodrigo', 'fixture final');
  begin perform public.homologar_pacote_li(pc, 2, hc, 'Liderança do método HOLOSCAN'); insert into _log52 values ('G30 FALHOU: homologacao pela Lideranca aceita');
  exception when others then insert into _log52 values ('G30 ok: homologacao pela "Liderança" recusada'); end;
  begin perform public.homologar_pacote_li(pc, 2, repeat('a', 64), 'Rodrigo'); insert into _log52 values ('G31 FALHOU: homologacao com hash divergente aceita');
  exception when others then insert into _log52 values ('G31 ok: homologacao com hash divergente recusada'); end;
  begin perform public.homologar_pacote_li(pc, 1, hc, 'Rodrigo'); insert into _log52 values ('G32 FALHOU: homologacao com versao divergente aceita');
  exception when others then insert into _log52 values ('G32 ok: homologacao com versao divergente recusada'); end;
  r := public.homologar_pacote_li(pc, 2, hc, 'Rodrigo');
  select count(*) into n from public.integrated_reading_package_snapshots where package_id = pc and content_hash = hc;
  insert into _log52 values ('G33 ' || case when r->>'status' = 'aprovado' and (select status from public.integrated_reading_rule_packages where id = pc) = 'aprovado' and (select content_hash from public.integrated_reading_rule_packages where id = pc) = hc
    and (select approval_provenance->>'homologado_por' from public.integrated_reading_rule_packages where id = pc) = 'Rodrigo' and (select responsible from public.integrated_reading_rule_packages where id = pc) like 'Daniel%Rodrigo%' and n = 1 then 'ok' else 'FALHOU' end || ': homologacao explicita: aprovado + snapshot imutavel + provenance nomeia Daniel e Rodrigo');
  begin update public.integrated_reading_package_snapshots set snapshot = '{}' where package_id = pc; insert into _log52 values ('G34 FALHOU: snapshot alterado');
  exception when others then insert into _log52 values ('G34 ok: snapshot imutavel'); end;
end $$;
reset role;
do $$ declare pc uuid := (select v::uuid from _li52 where k = 'pc'); li uuid := (select id from public.integrated_reading_rule_packages where code = 'LI-V1');
begin
  begin insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pc, 'text', 'x', '{}', 'rascunho'); insert into _log52 values ('G35 FALHOU: filha inserida em pacote aprovado');
  exception when others then insert into _log52 values ('G35 ok: pacote aprovado e imutavel (filhas): ' || left(sqlerrm, 40)); end;
  begin update public.integrated_reading_rule_packages set notes = 'x' where id = pc; insert into _log52 values ('G36 FALHOU: pacote aprovado editado');
  exception when others then insert into _log52 values ('G36 ok: pacote aprovado so pode ser retirado'); end;
  insert into _log52 values ('G37 ' || case when (select status from public.integrated_reading_rule_packages where id = li) = 'rascunho' and (select count(*) from public.integrated_reading_package_approvals where package_id = li) = 0
    and (select count(*) from public.integrated_reading_domains where package_id = li) = 0 and (select count(*) from public.integrated_reading_exam_domain_links where package_id = li) = 0 and (select count(*) from public.integrated_reading_rules where package_id = li) = 0 then 'ok' else 'FALHOU' end || ': LI-V1@1 intocado: rascunho, 0 dominios, 0 vinculos, 0 regras, 0 aprovacoes');
  insert into _log52 values ('G38 ' || case when (select count(*) from public.methodology_package_approvals)::text = (select v from _li52 where k = 'holo_aprov_antes') then 'ok' else 'FALHOU' end || ': governanca LI nao toca as aprovacoes do HOLOSCAN');
  insert into _log52 values ('G39 ' || case when (select count(*) from public.integrated_reading_package_approvals where invalidated_at is not null) >= 12 and (select count(*) from public.integrated_reading_package_approvals where invalidated_at is not null and invalidated_reason is null) = 0 then 'ok' else 'FALHOU' end || ': historico append-only: toda invalidacao tem motivo (' || (select count(*) from public.integrated_reading_package_approvals where invalidated_at is not null) || ' invalidadas)');
end $$;
reset role;
select string_agg(passo, ' | ' order by passo) from _log52;
