-- =============================================================================
-- REVISAO DAS PERGUNTAS DO HOLOSCAN (pagina publica /aprovacoes.html)
-- =============================================================================
-- Uma pagina sem login, so para o revisor marcar, em cada pergunta do pacote
-- oficial, Aprovar / Negar / Editar. Pedido de 09/10: sem conta e sem codigo.
--
-- O que NAO muda: o pacote metodologico (HOLOS-V1 v2), as perguntas oficiais,
-- as aplicacoes do HOLOSCAN e qualquer dado clinico. A revisao so registra
-- PROPOSTAS (parecer); uma versao nova do pacote segue a homologacao oficial.
--
-- Protecoes (a pagina e aberta a quem tiver o endereco):
-- - tabelas sem acesso direto pela API (RLS ligada, sem politica, revoke);
-- - so 3 funcoes publicas: ler a revisao aberta, registrar uma decisao,
--   concluir; nada clinico e nenhuma outra tabela e lida por elas;
-- - so existe UMA revisao aberta por vez, com prazo (expira_em); fora do
--   prazo, concluida ou cancelada, nada e aceito;
-- - cada decisao e um registro NOVO (historico): nada e sobrescrito nem
--   apagado, e o que vale e a ultima decisao de cada pergunta;
-- - limites de tamanho nos textos e no total de registros por revisao.
--
-- A revisao em si (a rodada e as 84 perguntas copiadas do pacote aprovado) e
-- aberta por um SQL separado (supabase/REVISAO-PERGUNTAS-PARTE2.sql).
-- =============================================================================
begin;

create table if not exists public.revisoes_perguntas (
  id                 uuid primary key default gen_random_uuid(),
  package_id         uuid not null references public.methodology_packages(id),
  package_code       text not null,
  package_version    integer not null,
  titulo             text not null,
  status             text not null default 'aberta',
  expira_em          timestamptz not null,
  concluida_em       timestamptz,
  concluida_por_nome text,
  created_at         timestamptz not null default now(),
  constraint revisoes_perguntas_status check (status in ('aberta', 'concluida', 'cancelada')),
  constraint revisoes_perguntas_nome check (concluida_por_nome is null or length(concluida_por_nome) <= 80)
);
-- uma revisao aberta por vez
create unique index if not exists revisoes_perguntas_uma_aberta on public.revisoes_perguntas ((true)) where status = 'aberta';

create table if not exists public.revisoes_perguntas_itens (
  revisao_id     uuid not null references public.revisoes_perguntas(id) on delete cascade,
  stable_id      text not null,
  posicao        integer not null,
  sistema_code   text,
  sistema_nome   text,
  sistema_ordem  integer,
  texto_original text not null,
  respostas      jsonb not null default '[]'::jsonb,
  primary key (revisao_id, stable_id)
);

create table if not exists public.revisoes_perguntas_respostas (
  id             bigint generated always as identity primary key,
  revisao_id     uuid not null,
  stable_id      text not null,
  decisao        text not null,
  texto_sugerido text,
  comentario     text,
  criado_em      timestamptz not null default now(),
  constraint revisoes_respostas_item_fk foreign key (revisao_id, stable_id)
    references public.revisoes_perguntas_itens(revisao_id, stable_id) on delete cascade,
  constraint revisoes_respostas_decisao check (decisao in ('aprovar', 'negar', 'editar', 'limpar')),
  constraint revisoes_respostas_textos check (coalesce(length(texto_sugerido), 0) <= 1000 and coalesce(length(comentario), 0) <= 1000),
  constraint revisoes_respostas_editar check (decisao <> 'editar' or length(btrim(coalesce(texto_sugerido, ''))) > 0)
);
create index if not exists revisoes_respostas_idx on public.revisoes_perguntas_respostas (revisao_id, stable_id, id desc);

-- historico: nada e alterado nem apagado (so a revisao inteira, em cascata, pelo dono do banco)
create or replace function public.revisao_respostas_imutavel()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'historico da revisao nao e alterado' using errcode = 'P0001';
  end if;
  if pg_trigger_depth() = 1 and not exists (select 1 from public.revisoes_perguntas r where r.id = old.revisao_id and r.status = 'cancelada') then
    raise exception 'historico da revisao nao e apagado' using errcode = 'P0001';
  end if;
  return old;
end;
$$;
drop trigger if exists revisoes_respostas_imutavel on public.revisoes_perguntas_respostas;
create trigger revisoes_respostas_imutavel before update or delete on public.revisoes_perguntas_respostas
  for each row execute function public.revisao_respostas_imutavel();

alter table public.revisoes_perguntas enable row level security;
alter table public.revisoes_perguntas_itens enable row level security;
alter table public.revisoes_perguntas_respostas enable row level security;
revoke all on public.revisoes_perguntas, public.revisoes_perguntas_itens, public.revisoes_perguntas_respostas from public, anon, authenticated;

-- a revisao que a pagina mostra: a aberta (dentro do prazo) ou, se nao houver, a ultima
create or replace function public.revisao_atual_id()
returns uuid language sql stable set search_path = '' as $$
  select r.id from public.revisoes_perguntas r
   where r.status <> 'cancelada'
   order by (r.status = 'aberta') desc, r.created_at desc limit 1;
$$;
revoke all on function public.revisao_atual_id() from public, anon, authenticated;

-- LER: a revisao e as perguntas, com a ultima decisao de cada uma
create or replace function public.revisao_perguntas_ler()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r record; v_estado text;
begin
  select * into r from public.revisoes_perguntas where id = public.revisao_atual_id();
  if not found then return jsonb_build_object('estado', 'nenhuma'); end if;
  v_estado := case when r.status = 'concluida' then 'concluida'
                   when r.status = 'aberta' and r.expira_em <= now() then 'expirada'
                   else 'aberta' end;
  return jsonb_build_object(
    'estado', v_estado, 'titulo', r.titulo, 'pacote', r.package_code || ' v' || r.package_version,
    'expira_em', r.expira_em, 'concluida_em', r.concluida_em, 'concluida_por_nome', r.concluida_por_nome,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
          'stable_id', i.stable_id, 'posicao', i.posicao, 'sistema_code', i.sistema_code, 'sistema_nome', i.sistema_nome,
          'texto_original', i.texto_original, 'respostas', i.respostas,
          'decisao', u.decisao, 'texto_sugerido', u.texto_sugerido, 'comentario', u.comentario, 'decidido_em', u.criado_em)
        order by i.sistema_ordem nulls last, i.posicao)
      from public.revisoes_perguntas_itens i
      left join lateral (
        select x.decisao, x.texto_sugerido, x.comentario, x.criado_em from public.revisoes_perguntas_respostas x
         where x.revisao_id = i.revisao_id and x.stable_id = i.stable_id order by x.id desc limit 1
      ) u on u.decisao is distinct from 'limpar'
      where i.revisao_id = r.id), '[]'::jsonb));
end;
$$;

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

-- ABRIR uma revisao (so pelo dono do banco, no SQL Editor; sem acesso pela API):
-- copia as perguntas do pacote APROVADO, com o sistema principal e a escala de respostas.
create or replace function public.revisao_perguntas_abrir(p_code text, p_version integer, p_dias integer default 15)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_pk record; v_id uuid; v_n int;
begin
  select m.id, m.code, m.version into v_pk from public.methodology_packages m
   where m.code = p_code and m.version = p_version and m.status = 'aprovado';
  if not found then raise exception 'pacote % v% aprovado nao encontrado', p_code, p_version using errcode = 'P0001'; end if;
  if exists (select 1 from public.revisoes_perguntas where status = 'aberta') then
    raise exception 'ja existe uma revisao aberta (conclua ou cancele antes)' using errcode = 'P0001';
  end if;
  if p_dias is null or p_dias < 1 or p_dias > 60 then raise exception 'prazo entre 1 e 60 dias' using errcode = '22023'; end if;
  insert into public.revisoes_perguntas (package_id, package_code, package_version, titulo, expira_em)
  values (v_pk.id, v_pk.code, v_pk.version, 'Revisão das perguntas do HOLOSCAN (' || v_pk.code || ' v' || v_pk.version || ')', now() + make_interval(days => p_dias))
  returning id into v_id;
  insert into public.revisoes_perguntas_itens (revisao_id, stable_id, posicao, sistema_code, sistema_nome, sistema_ordem, texto_original, respostas)
  select v_id, q.stable_id, q.position, a.destination_id, s.name, s.position, q.statement, coalesce(q.response_labels, '[]'::jsonb)
    from public.methodology_questions q
    left join lateral (select x.destination_id from public.methodology_associations x
                        where x.package_id = q.package_id and x.question_stable_id = q.stable_id and x.role = 'primaria' and x.destination_type = 'system'
                        order by x.destination_id limit 1) a on true
    left join public.methodology_systems s on s.package_id = q.package_id and s.code = a.destination_id
   where q.package_id = v_pk.id;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'o pacote nao tem perguntas' using errcode = 'P0001'; end if;
  return v_id;
end;
$$;
revoke all on function public.revisao_perguntas_abrir(text, integer, integer) from public, anon, authenticated;

commit;
