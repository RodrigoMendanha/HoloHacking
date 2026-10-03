-- ============================================================================
-- ETAPA 6.3-A — VERIFICAR APROVADORES (SOMENTE LEITURA). Nao mostra uid nem e-mail.
-- Esperado apos o cadastro: 4 linhas (holoscan 1 Daniel, holoscan 2 Rodrigo, integrated_reading 1 Daniel, integrated_reading 2 Rodrigo),
-- quantidade 1 em cada, ativos 1 em cada; resumo: total 4, uids_distintos 2, cada_conta_um_estagio true.
-- ============================================================================
select scope, approval_stage, display_name, count(*) as quantidade, count(*) filter (where active) as ativos
from public.methodology_approvers
group by scope, approval_stage, display_name
union all
select 'RESUMO: total=' || (select count(*) from public.methodology_approvers)
       || ' uids_distintos=' || (select count(distinct user_id) from public.methodology_approvers)
       || ' cada_conta_um_estagio=' || (select coalesce(bool_and(n = 1), false) from (select user_id, count(distinct approval_stage) n from public.methodology_approvers group by user_id) z)
       || ' daniel_e_rodrigo_contas_diferentes=' || (select coalesce((select count(distinct user_id) from public.methodology_approvers where display_name = 'Daniel') = 1
                                                              and (select count(distinct user_id) from public.methodology_approvers where display_name = 'Rodrigo') = 1
                                                              and not exists (select 1 from public.methodology_approvers d join public.methodology_approvers r on r.user_id = d.user_id where d.display_name = 'Daniel' and r.display_name = 'Rodrigo'), false)),
       null, null, null, null
order by 1, 2;
