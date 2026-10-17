-- =====================================================================
-- REVISAO DAS PERGUNTAS — PARTE 1 de 3 — rodar INTEIRA no SQL Editor (uma transacao).
-- Tabelas (revisao, perguntas, historico de decisoes), protecoes e a leitura da pagina.
-- Rode NA ORDEM (1, 2, 3). Se uma parte der erro, nada dela e aplicado: rode de novo a MESMA parte.
-- Conteudo identico a supabase/migrations/20261010100000_revisao_perguntas.sql (dividido so para caber no editor).
-- Nao toca em paciente, HOLOSCAN, nem no pacote metodologico.
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if not exists (select 1 from public.methodology_packages where code = 'HOLOS-V1' and version = 2 and status = 'aprovado') then
    raise exception 'pacote HOLOS-V1 v2 aprovado nao encontrado (nada foi aplicado)';
  end if;
end $$;


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


do $$ begin
  if to_regclass('public.revisoes_perguntas_respostas') is null or to_regprocedure('public.revisao_perguntas_ler()') is null then raise exception 'POS 1: incompleto'; end if;
end $$;
commit;
select 'PARTE 1 OK. Agora rode a PARTE 2.' as resultado;
