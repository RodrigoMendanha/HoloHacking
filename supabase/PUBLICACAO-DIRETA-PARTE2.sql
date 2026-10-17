-- PUBLICACAO DIRETA DO HOLOSCAN — PARTE 2 de 2 (SQL Editor do Supabase)
-- Igual a supabase/migrations/20261018100000_publicacao_direta_metodologia.sql. Pode rodar duas vezes.
-- Rode a parte inteira de uma vez. O ultimo select mostra o resultado: tem de sair tudo "true".
begin;
-- 3. revisao publica das perguntas (aprovacoes.html) sai do ar: a pagina foi removida do site e as
--    RPCs anonimas deixam de ser chamaveis pela API. As respostas ja registradas ficam no banco, intactas.
revoke execute on function public.revisao_perguntas_ler(), public.revisao_perguntas_registrar(text, text, text, text),
  public.revisao_perguntas_concluir(text) from anon, authenticated;

commit;

select not has_function_privilege('anon', 'public.revisao_perguntas_ler()', 'execute') as ler_fechado,
       not has_function_privilege('anon', 'public.revisao_perguntas_registrar(text, text, text, text)', 'execute') as registrar_fechado,
       not has_function_privilege('authenticated', 'public.revisao_perguntas_concluir(text)', 'execute') as concluir_fechado,
       (select count(*) from public.revisoes_perguntas_respostas) >= 0 as respostas_antigas_intactas;
