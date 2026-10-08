-- =====================================================================
-- RESULTADO HOLOS — PARTE 2 de 5 — rodar INTEIRA no SQL Editor (uma transacao).
-- Funcoes auxiliares: sistemas do HOLOSCAN para o snapshot e campos aceitos do navegador.
-- Rode NA ORDEM (a PARTE 1 ja foi aplicada). Se uma parte der erro, nada dela e aplicado: rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema.
-- Conteudo identico a supabase/migrations/20261009100000_resultado_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regclass('public.holos_results') is null then raise exception 'rode a PARTE 1 antes (holos_results nao existe)'; end if;
end $$;

-- sistemas do HOLOSCAN para o snapshot: notas/faixas SALVAS, textos oficiais do pacote, pontuou / contexto (so leitura)
create or replace function public.resultado_holos_sistemas(p_app uuid, p_pk uuid)
returns jsonb language sql stable set search_path = '' as $$
select coalesce(jsonb_agg(jsonb_build_object(
    'sistema', s.sistema, 'nome', s.nome, 'nota', s.nota, 'carga', s.carga, 'faixa', s.faixa, 'obtido', s.obtido, 'maximo', s.maximo,
    'respondidos', s.respondidos, 'total_marcadores', s.total_marcadores, 'avaliavel', s.avaliavel,
    'texto_publico', ms.public_text,
    'mensagem_nutri', (select r.message_nutri from public.methodology_ranges r where r.package_id = p_pk and r.destination_type = 'system'
                        and r.destination_id = s.sistema and r.label = s.faixa limit 1),
    'mensagem_paciente', (select r.message_paciente from public.methodology_ranges r where r.package_id = p_pk and r.destination_type = 'system'
                        and r.destination_id = s.sistema and r.label = s.faixa limit 1),
    'pontuou', (select coalesce(jsonb_agg(jsonb_build_object('question_id', q.stable_id, 'enunciado', q.statement, 'valor', ans.valor,
                  'resposta', q.response_labels->>(ans.valor::int), 'peso', ma.weight) order by q.position nulls last, q.stable_id), '[]'::jsonb)
                from public.methodology_associations ma
                join public.methodology_questions q on q.package_id = ma.package_id and q.stable_id = ma.question_stable_id
                join public.holoscan_answers ans on ans.application_id = p_app and ans.marcador_id = ma.question_stable_id
                where ma.package_id = p_pk and ma.destination_type = 'system' and ma.destination_id = s.sistema and ma.role = 'primaria'),
    'contexto', (select coalesce(jsonb_agg(jsonb_build_object('question_id', q.stable_id, 'enunciado', q.statement, 'valor', ans.valor,
                  'resposta', q.response_labels->>(ans.valor::int)) order by q.position nulls last, q.stable_id), '[]'::jsonb)
                from public.methodology_associations ma
                join public.methodology_questions q on q.package_id = ma.package_id and q.stable_id = ma.question_stable_id
                join public.holoscan_answers ans on ans.application_id = p_app and ans.marcador_id = ma.question_stable_id
                where ma.package_id = p_pk and ma.destination_type = 'system' and ma.destination_id = s.sistema and ma.role = 'secondary_contextual')
  ) order by coalesce(ms.position, 99), s.sistema), '[]'::jsonb)
  from public.holoscan_system_scores s
  left join public.methodology_systems ms on ms.package_id = p_pk and ms.code = s.sistema
  where s.application_id = p_app;
$$;
revoke all on function public.resultado_holos_sistemas(uuid, uuid) from public, anon, authenticated;

-- campos que o navegador pode mandar (e nada mais)
create or replace function public.resultado_holos_campos(payload jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'holoscan_application_id', payload->>'holoscan_application_id',
    'tool_application_ids', coalesce(payload->'tool_application_ids', '[]'::jsonb),
    'visao_paciente', jsonb_build_object('ferramentas', coalesce(payload#>'{visao_paciente,ferramentas}', '{}'::jsonb)));
$$;
revoke all on function public.resultado_holos_campos(jsonb) from public, anon, authenticated;

do $$ begin
  if to_regprocedure('public.resultado_holos_sistemas(uuid, uuid)') is null or to_regprocedure('public.resultado_holos_campos(jsonb)') is null then raise exception 'POS 2: funcoes nao criadas'; end if;
end $$;
commit;
select 'PARTE 2 OK. Agora rode a PARTE 3.' as resultado;
