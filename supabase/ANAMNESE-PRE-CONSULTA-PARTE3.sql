-- =====================================================================
-- ANAMNESE PRE-CONSULTA POR LINK (09/10) — PARTE 3 de 5 — rodar INTEIRA no SQL Editor (uma transacao).
-- Funcoes internas: hash do token, limpeza do conteudo enviado, busca do convite pelo token.
-- Rode as partes NA ORDEM (1 a 5). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema ("if not exists" / "create or replace" / "drop ... if exists").
-- SOMENTE ADITIVA: tabela e funcoes novas. Nao altera anamneses, HOLOSCAN, ferramentas, Resultado HOLOS nem metodologia.
-- Conteudo identico a supabase/migrations/20261014100000_anamnese_pre_consulta.sql (dividido so para caber no editor).
-- A ULTIMA LINHA ANTES DA CONFERENCIA E "commit;". Se o editor cortar o texto, nao rode.
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regprocedure('public.proteger_convite_anamnese()') is null then raise exception 'rode a PARTE 2 antes (nada foi aplicado)'; end if;
end $$;
-- ----------------------------------------------------------------------------
-- utilitarios internos
-- ----------------------------------------------------------------------------
create or replace function public.convite_anamnese_hash(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256'), 'hex');
$$;
revoke all on function public.convite_anamnese_hash(text) from public, anon, authenticated;

-- so blocos/campos que a paciente pode preencher (o resto e descartado no servidor)
create or replace function public.convite_anamnese_limpar(p_conteudo jsonb, p_tipo text)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare f jsonb; saida jsonb := '{}'::jsonb; b text; permitidos text[];
begin
  if p_conteudo is null or jsonb_typeof(p_conteudo) <> 'object' then
    raise exception 'conteudo invalido' using errcode = '22023', hint = 'conteudo_invalido';
  end if;
  f := p_conteudo -> 'formulario';
  if f is null or jsonb_typeof(f) <> 'object' then
    raise exception 'conteudo invalido' using errcode = '22023', hint = 'conteudo_invalido';
  end if;
  permitidos := case when p_tipo = 'retorno' then array['retorno'] else array['motivo', 'alimentar', 'saude', 'restricoes', 'estilo', 'contexto', 'objetiva'] end;
  for b in select jsonb_object_keys(f) loop
    if b = any(permitidos) and jsonb_typeof(f -> b) = 'object' then
      if b = 'objetiva' then
        -- a paciente informa so peso e altura (autorrelato); medidas aferidas, exames e avaliacoes sao da profissional
        saida := saida || jsonb_build_object(b, (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(f -> b) as x(k, v)
                                                  where k in ('peso', 'peso_unidade', 'altura', 'altura_unidade')));
      else
        saida := saida || jsonb_build_object(b, f -> b);
      end if;
    end if;
  end loop;
  return jsonb_build_object('formulario_versao', 2, 'tipo', p_tipo, 'formulario', saida);
end;
$$;
revoke all on function public.convite_anamnese_limpar(jsonb, text) from public, anon, authenticated;

-- encontra o convite pelo token (formato conferido antes: nada de consulta com lixo)
create or replace function public.convite_anamnese_por_token(p_token text)
returns public.anamnesis_invites language plpgsql stable security definer set search_path = '' as $$
declare c public.anamnesis_invites;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{40,64}$' then return null; end if;
  select * into c from public.anamnesis_invites where token_hash = public.convite_anamnese_hash(p_token);
  return c;
end;
$$;
revoke all on function public.convite_anamnese_por_token(text) from public, anon, authenticated;
commit;

select 'funcoes internas' as item, (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  and p.proname in ('convite_anamnese_hash', 'convite_anamnese_limpar', 'convite_anamnese_por_token')) as valor
union all select 'anon executa a busca por token (deve ser false)', has_function_privilege('anon', 'public.convite_anamnese_por_token(text)', 'execute')::text;
