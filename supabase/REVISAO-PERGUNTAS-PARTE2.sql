-- =====================================================================
-- REVISAO DAS PERGUNTAS — PARTE 2 de 3 — rodar INTEIRA no SQL Editor (uma transacao).
-- Registrar decisao e concluir, com as permissoes da pagina publica.
-- Rode NA ORDEM (1, 2, 3). Se uma parte der erro, nada dela e aplicado: rode de novo a MESMA parte.
-- Conteudo identico a supabase/migrations/20261010100000_revisao_perguntas.sql (dividido so para caber no editor).
-- Nao toca em paciente, HOLOSCAN, nem no pacote metodologico.
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regprocedure('public.revisao_perguntas_ler()') is null then raise exception 'rode a PARTE 1 antes'; end if;
end $$;
-- REGISTRAR: uma decisao (aprovar | negar | editar | limpar) numa pergunta da revisao aberta
create or replace function public.revisao_perguntas_registrar(p_stable_id text, p_decisao text, p_texto text default null, p_comentario text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; v_texto text := nullif(btrim(coalesce(p_texto, '')), ''); v_coment text := nullif(btrim(coalesce(p_comentario, '')), ''); v_em timestamptz;
begin
  select * into r from public.revisoes_perguntas where status = 'aberta' for update;
  if not found then raise exception 'nenhuma revisao aberta' using errcode = 'P0001', hint = 'revisao_fechada'; end if;
  if r.expira_em <= now() then raise exception 'o prazo da revisao terminou' using errcode = 'P0001', hint = 'revisao_expirada'; end if;
  if p_decisao is null or p_decisao not in ('aprovar', 'negar', 'editar', 'limpar') then
    raise exception 'decisao invalida' using errcode = '22023', hint = 'decisao_invalida';
  end if;
  if not exists (select 1 from public.revisoes_perguntas_itens i where i.revisao_id = r.id and i.stable_id = p_stable_id) then
    raise exception 'pergunta fora desta revisao' using errcode = '22023', hint = 'pergunta_invalida';
  end if;
  if p_decisao = 'editar' and v_texto is null then
    raise exception 'escreva o texto sugerido' using errcode = '22023', hint = 'texto_obrigatorio';
  end if;
  if coalesce(length(v_texto), 0) > 1000 or coalesce(length(v_coment), 0) > 1000 then
    raise exception 'texto longo demais (maximo 1000 caracteres)' using errcode = '22023', hint = 'texto_longo';
  end if;
  if (select count(*) from public.revisoes_perguntas_respostas x where x.revisao_id = r.id) >= 5000 then
    raise exception 'limite de registros desta revisao atingido' using errcode = 'P0001', hint = 'limite';
  end if;
  insert into public.revisoes_perguntas_respostas (revisao_id, stable_id, decisao, texto_sugerido, comentario)
  values (r.id, p_stable_id, p_decisao,
          case when p_decisao = 'editar' then v_texto end,
          case when p_decisao in ('negar', 'editar') then v_coment end)
  returning criado_em into v_em;
  return jsonb_build_object('stable_id', p_stable_id, 'decisao', p_decisao, 'decidido_em', v_em);
end;
$$;

-- CONCLUIR: so com todas as perguntas decididas; depois disso a revisao fica so para leitura
create or replace function public.revisao_perguntas_concluir(p_nome text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; v_total int; v_ok int; v_aprov int; v_neg int; v_edit int; v_nome text := nullif(btrim(coalesce(p_nome, '')), '');
begin
  select * into r from public.revisoes_perguntas where status = 'aberta' for update;
  if not found then raise exception 'nenhuma revisao aberta' using errcode = 'P0001', hint = 'revisao_fechada'; end if;
  if r.expira_em <= now() then raise exception 'o prazo da revisao terminou' using errcode = 'P0001', hint = 'revisao_expirada'; end if;
  if coalesce(length(v_nome), 0) > 80 then raise exception 'nome longo demais' using errcode = '22023', hint = 'texto_longo'; end if;
  select count(*), count(u.decisao), count(*) filter (where u.decisao = 'aprovar'), count(*) filter (where u.decisao = 'negar'), count(*) filter (where u.decisao = 'editar')
    into v_total, v_ok, v_aprov, v_neg, v_edit
    from public.revisoes_perguntas_itens i
    left join lateral (select x.decisao from public.revisoes_perguntas_respostas x where x.revisao_id = i.revisao_id and x.stable_id = i.stable_id order by x.id desc limit 1) u
      on u.decisao is distinct from 'limpar'
   where i.revisao_id = r.id;
  if v_ok < v_total then
    raise exception 'faltam % pergunta(s) sem decisao', v_total - v_ok using errcode = 'P0001', hint = 'revisao_incompleta';
  end if;
  update public.revisoes_perguntas set status = 'concluida', concluida_em = now(), concluida_por_nome = v_nome where id = r.id;
  return jsonb_build_object('total', v_total, 'aprovadas', v_aprov, 'negadas', v_neg, 'editadas', v_edit);
end;
$$;

revoke all on function public.revisao_perguntas_ler(), public.revisao_perguntas_registrar(text, text, text, text),
  public.revisao_perguntas_concluir(text) from public;
grant execute on function public.revisao_perguntas_ler(), public.revisao_perguntas_registrar(text, text, text, text),
  public.revisao_perguntas_concluir(text) to anon, authenticated;


do $$ begin
  if to_regprocedure('public.revisao_perguntas_registrar(text, text, text, text)') is null or to_regprocedure('public.revisao_perguntas_concluir(text)') is null then raise exception 'POS 2: incompleto'; end if;
  if not has_function_privilege('anon', 'public.revisao_perguntas_registrar(text, text, text, text)', 'execute') then raise exception 'POS 2: pagina sem permissao'; end if;
end $$;
commit;
select 'PARTE 2 OK. Agora rode a PARTE 3 (a ultima).' as resultado;
