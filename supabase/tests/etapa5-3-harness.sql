-- Harness ETAPA 5.3 (migration 20261002110000 — identidade real na dupla aprovacao): roda DENTRO da transacao
-- do scripts/validar-cadeia-local.sh, depois de etapa5-2-harness.sql. Usa os aprovadores de teste de
-- aprovadores-harness-setup.sql (Daniel = uidA, Rodrigo = uidB, ninguem = uidC). Nada persiste.
create temp table _log53 (passo text) on commit drop;
grant insert, select on _log53 to authenticated;
reset role;
do $$
declare pk uuid; hpk uuid; a uuid := (select v::uuid from _aprov where k = 'daniel');
begin
  insert into public.integrated_reading_rule_packages (code, version, status, notes) values ('TEST_FIXTURE_ONLY-LI-S', 1, 'em_revisao', 'fixture seguranca') returning id into pk;
  insert into _aprov values ('pk53', pk::text);
  -- quatro olhos no cadastro: o mesmo uid nao pode ter dois papeis no mesmo escopo
  begin insert into public.methodology_approvers (user_id, scope, approval_stage, display_name) values (a, 'holoscan', 2, 'Rodrigo'); insert into _log53 values ('S01 FALHOU: mesmo uid com dois papeis no mesmo escopo');
  exception when others then insert into _log53 values ('S01 ok: um usuario tem no maximo um papel por escopo (quatro olhos no cadastro)'); end;
  begin insert into public.methodology_approvers (user_id, scope, approval_stage, display_name) values (gen_random_uuid(), 'holoscan', 1, 'Rodrigo'); insert into _log53 values ('S02 FALHOU: nome fora do papel aceito');
  exception when others then insert into _log53 values ('S02 ok: display_name tem de bater com a etapa (Daniel=1, Rodrigo=2)'); end;
  insert into _log53 values ('S03 ' || case when (select count(*) from public.methodology_approvers where notes is distinct from 'TEST_FIXTURE_ONLY') = 0 then 'ok' else 'FALHOU' end || ': a migration nao cadastrou aprovador real nenhum (so os fixtures deste harness)');
end $$;
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare pk uuid := (select v::uuid from _aprov where k = 'pk53'); h text; r jsonb; a uuid := (select v::uuid from _aprov where k = 'daniel'); b uuid := (select v::uuid from _aprov where k = 'rodrigo'); c uuid := (select v::uuid from _aprov where k = 'ninguem'); n int; hpk uuid;
begin
  h := public.li_hash_conteudo(pk);
  insert into _log53 values ('S04 ' || case when public.meus_papeis_aprovacao() @> '[{"scope":"integrated_reading","approval_stage":1,"display_name":"Daniel"}]' and jsonb_array_length(public.meus_papeis_aprovacao()) = 2 then 'ok' else 'FALHOU' end || ': a tela le so os proprios papeis (Daniel: holoscan 1 + integrated_reading 1)');
  begin insert into public.methodology_approvers (user_id, scope, approval_stage, display_name) values (c, 'integrated_reading', 1, 'Daniel'); insert into _log53 values ('S05 FALHOU: aplicacao cadastrou aprovador');
  exception when others then insert into _log53 values ('S05 ok: aplicacao nao escreve em methodology_approvers: ' || left(sqlerrm, 30)); end;
  -- impostor: conta sem papel digita "Daniel"
  perform pg_temp.como_ninguem();
  begin perform public.registrar_aprovacao_li(pk, 1, h, 1, 'Daniel', 'x'); insert into _log53 values ('S06 FALHOU: usuario sem papel aprovou como Daniel');
  exception when others then insert into _log53 values ('S06 ok: usuario sem papel nao se passa por Daniel (LI): ' || left(sqlerrm, 50)); end;
  begin perform public.registrar_aprovacao_li(pk, 1, h, 2, 'Rodrigo', 'x'); insert into _log53 values ('S07 FALHOU: usuario sem papel aprovou como Rodrigo');
  exception when others then insert into _log53 values ('S07 ok: usuario sem papel nao se passa por Rodrigo (LI)'); end;
  insert into _log53 values ('S08 ' || case when jsonb_array_length(public.meus_papeis_aprovacao()) = 0 then 'ok' else 'FALHOU' end || ': conta sem papel ve lista vazia');
  -- Rodrigo autorizado nao faz a etapa 1; Daniel autorizado nao faz a etapa 2
  perform pg_temp.como_rodrigo();
  begin perform public.registrar_aprovacao_li(pk, 1, h, 1, 'Daniel', 'x'); insert into _log53 values ('S09 FALHOU: Rodrigo registrou a Aprovacao 1 como Daniel');
  exception when others then insert into _log53 values ('S09 ok: Rodrigo autorizado nao pode a etapa 1 (nem digitando Daniel)'); end;
  perform pg_temp.como_daniel();
  r := public.registrar_aprovacao_li(pk, 1, h, 1, 'Daniel', 'conferido (fixture)');
  insert into _log53 values ('S10 ' || case when (r->>'approved_by')::uuid = a and (select approved_by = a and approver_id is not null and responsible = 'Daniel' from public.integrated_reading_package_approvals where id = (r->>'id')::uuid) then 'ok' else 'FALHOU' end || ': Daniel autorizado aprova a etapa 1; aprovacao registra uid real + approver_id + nome');
  begin perform public.registrar_aprovacao_li(pk, 1, h, 2, 'Rodrigo', 'x'); insert into _log53 values ('S11 FALHOU: Daniel registrou a Aprovacao 2 como Rodrigo');
  exception when others then insert into _log53 values ('S11 ok: Daniel autorizado nao pode a etapa 2 (mudar o nome nao contorna auth.uid())'); end;
  perform pg_temp.como_rodrigo();
  r := public.registrar_aprovacao_li(pk, 1, h, 2, 'Rodrigo', 'revisado (fixture)');
  insert into _log53 values ('S12 ' || case when (r->>'approved_by')::uuid = b and (select count(distinct approved_by) from public.integrated_reading_package_approvals where package_id = pk and invalidated_at is null) = 2 then 'ok' else 'FALHOU' end || ': Rodrigo autorizado aprova a etapa 2 depois de Daniel; duas identidades distintas no historico');
  begin perform public.homologar_pacote_li(pk, 1, h, 'Rodrigo'); insert into _log53 values ('S13 FALHOU: incompleto homologado');
  exception when others then insert into _log53 values ('S13 ok: homologacao continua exigindo completude (' || left(sqlerrm, 30) || ')'); end;
  perform pg_temp.como_ninguem();
  begin perform public.homologar_pacote_li(pk, 1, h, 'Rodrigo'); insert into _log53 values ('S14 FALHOU: usuario sem papel homologou');
  exception when others then insert into _log53 values ('S14 ok: homologar e so de aprovador autorizado: ' || left(sqlerrm, 40)); end;
  -- anon
  perform set_config('request.jwt.claims', '', true);
  begin perform public.registrar_aprovacao_li(pk, 1, h, 1, 'Daniel', 'x'); insert into _log53 values ('S15 FALHOU: anon aprovou');
  exception when others then insert into _log53 values ('S15 ok: sem sessao (anon) falha: ' || left(sqlerrm, 20)); end;
  perform pg_temp.como_daniel();
  -- HOLOSCAN: mesma regra; aprovador le pacote em_revisao alheio; impostor nao
  select id into hpk from public.methodology_packages where status = 'em_revisao' and nutritionist_id = a order by created_at desc limit 1;
  perform pg_temp.como_rodrigo();
  select count(*) into n from public.methodology_packages where id = hpk;
  insert into _log53 values ('S16 ' || case when hpk is not null and n = 1 then 'ok' else 'FALHOU' end || ': Rodrigo (aprovador) le o pacote HOLOSCAN em_revisao de outro profissional para conferir o hash');
  perform pg_temp.como_ninguem();
  select count(*) into n from public.methodology_packages where id = hpk;
  insert into _log53 values ('S17 ' || case when n = 0 then 'ok' else 'FALHOU' end || ': conta sem papel nao ve pacote em_revisao alheio');
  begin perform public.registrar_aprovacao_metodologica(hpk, 1, 'Daniel', 'x', public.metodologia_hash_conteudo(hpk)); insert into _log53 values ('S18 FALHOU: impostor aprovou HOLOSCAN');
  exception when others then insert into _log53 values ('S18 ok: usuario sem papel nao se passa por Daniel (HOLOSCAN): ' || left(sqlerrm, 40)); end;
  perform pg_temp.como_rodrigo();
  begin perform public.registrar_aprovacao_metodologica(hpk, 1, 'Daniel', 'x', public.metodologia_hash_conteudo(hpk)); insert into _log53 values ('S19 FALHOU: Rodrigo fez a etapa 1 do HOLOSCAN');
  exception when others then insert into _log53 values ('S19 ok: HOLOSCAN: Rodrigo autorizado nao faz a etapa 1'); end;
  perform pg_temp.como_daniel();
  begin perform public.registrar_aprovacao_metodologica(hpk, 2, 'Rodrigo', 'x', public.metodologia_hash_conteudo(hpk)); insert into _log53 values ('S20 FALHOU: Daniel fez a etapa 2 do HOLOSCAN');
  exception when others then insert into _log53 values ('S20 ok: HOLOSCAN: Daniel autorizado nao faz a etapa 2'); end;
  insert into _log53 values ('S21 ' || case when (select count(*) from public.methodology_package_approvals where approved_by is null) = 0 and (select count(*) from public.methodology_package_approvals where step = 2 and approved_by = a) = 0 then 'ok' else 'FALHOU' end || ': toda aprovacao HOLOSCAN do harness tem uid real e as de etapa 2 nao sao do mesmo uid da etapa 1');
end $$;
reset role;
select string_agg(passo, ' | ' order by passo) from _log53;
