-- =====================================================================
-- ANAMNESE PRE-CONSULTA POR LINK (09/10) — PARTE 5 de 5 — rodar INTEIRA no SQL Editor (uma transacao).
-- RPCs publicas da paciente (abrir, salvar rascunho, enviar), permissoes e registro da migration.
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
  if to_regprocedure('public.criar_convite_anamnese(uuid, uuid, integer, text, text)') is null then raise exception 'rode a PARTE 4 antes (nada foi aplicado)'; end if;
end $$;
-- ----------------------------------------------------------------------------
-- RPCs PUBLICAS (a paciente, sem conta): so com o token, so este convite
-- ----------------------------------------------------------------------------
create or replace function public.anamnese_publica_abrir(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.anamnesis_invites; pac text; ps jsonb;
begin
  c := public.convite_anamnese_por_token(p_token);
  if c.id is null then return jsonb_build_object('estado', 'invalido'); end if;
  if c.status = 'revogado' then return jsonb_build_object('estado', 'revogado'); end if;
  if c.status = 'concluido' then return jsonb_build_object('estado', 'concluido', 'enviado_em', c.submitted_at); end if;
  if c.expires_at < now() then return jsonb_build_object('estado', 'expirado'); end if;
  select split_part(btrim(x.nome), ' ', 1) into pac from public.patients x where x.id = c.patient_id;
  ps := coalesce(c.professional_snapshot, '{}'::jsonb);
  return jsonb_build_object('estado', 'aberto', 'status', c.status, 'tipo', c.form_tipo, 'form_version', c.form_version,
    'expira_em', c.expires_at, 'salvo_em', c.last_saved_at, 'rascunho', coalesce(c.draft_content, '{}'::jsonb),
    'paciente', jsonb_build_object('primeiro_nome', nullif(pac, '')),
    'profissional', jsonb_build_object('nome', ps->>'nome', 'profissao', ps->>'profissao', 'registro', ps->>'registro',
      'cor_primaria', ps->>'cor_primaria', 'cor_secundaria', ps->>'cor_secundaria', 'logo', ps->>'logo'));
end;
$$;

create or replace function public.anamnese_publica_salvar(p_token text, p_conteudo jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.anamnesis_invites; limpo jsonb;
begin
  c := public.convite_anamnese_por_token(p_token);
  if c.id is null then raise exception 'link invalido' using errcode = 'P0001', hint = 'link_invalido'; end if;
  if c.status = 'revogado' then raise exception 'link revogado' using errcode = 'P0001', hint = 'link_revogado'; end if;
  if c.status = 'concluido' then raise exception 'anamnese ja enviada' using errcode = 'P0001', hint = 'ja_enviada'; end if;
  if c.expires_at < now() then raise exception 'link expirado' using errcode = 'P0001', hint = 'link_expirado'; end if;
  if c.save_count >= 2000 then raise exception 'limite de salvamentos' using errcode = 'P0001', hint = 'limite'; end if;
  limpo := public.convite_anamnese_limpar(p_conteudo, c.form_tipo);
  if pg_column_size(limpo) > 65536 then raise exception 'conteudo grande demais' using errcode = '22023', hint = 'grande_demais'; end if;
  update public.anamnesis_invites set draft_content = limpo, status = 'iniciado', started_at = coalesce(started_at, now()),
         last_saved_at = now(), save_count = save_count + 1
   where id = c.id returning * into c;
  return jsonb_build_object('salvo_em', c.last_saved_at);
end;
$$;

create or replace function public.anamnese_publica_enviar(p_token text, p_conteudo jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.anamnesis_invites; limpo jsonb;
begin
  c := public.convite_anamnese_por_token(p_token);
  if c.id is null then raise exception 'link invalido' using errcode = 'P0001', hint = 'link_invalido'; end if;
  if c.status = 'revogado' then raise exception 'link revogado' using errcode = 'P0001', hint = 'link_revogado'; end if;
  if c.status = 'concluido' then raise exception 'anamnese ja enviada' using errcode = 'P0001', hint = 'ja_enviada'; end if;
  if c.expires_at < now() then raise exception 'link expirado' using errcode = 'P0001', hint = 'link_expirado'; end if;
  limpo := public.convite_anamnese_limpar(p_conteudo, c.form_tipo);
  if pg_column_size(limpo) > 65536 then raise exception 'conteudo grande demais' using errcode = '22023', hint = 'grande_demais'; end if;
  if (select count(*) from jsonb_object_keys(limpo -> 'formulario')) = 0 then
    raise exception 'nada preenchido' using errcode = '22023', hint = 'vazio';
  end if;
  update public.anamnesis_invites set submitted_content = limpo, submitted_at = now(), status = 'concluido', draft_content = null,
         started_at = coalesce(started_at, now()), last_saved_at = now()
   where id = c.id returning * into c;
  return jsonb_build_object('enviado_em', c.submitted_at);
end;
$$;

revoke all on function public.criar_convite_anamnese(uuid, uuid, integer, text, text), public.revogar_convite_anamnese(uuid),
  public.marcar_convite_anamnese_usado(uuid, uuid) from public, anon;
grant execute on function public.criar_convite_anamnese(uuid, uuid, integer, text, text), public.revogar_convite_anamnese(uuid),
  public.marcar_convite_anamnese_usado(uuid, uuid) to authenticated;
revoke all on function public.anamnese_publica_abrir(text), public.anamnese_publica_salvar(text, jsonb), public.anamnese_publica_enviar(text, jsonb) from public;
grant execute on function public.anamnese_publica_abrir(text), public.anamnese_publica_salvar(text, jsonb), public.anamnese_publica_enviar(text, jsonb) to anon, authenticated;
insert into supabase_migrations.schema_migrations (version, name)
values ('20261014100000', 'anamnese_pre_consulta')
on conflict (version) do nothing;
commit;

select 'funcoes publicas (anon)' as item, (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  and p.proname like 'anamnese_publica_%' and has_function_privilege('anon', p.oid, 'execute')) as valor
union all select 'anon executa criar_convite (deve ser false)', has_function_privilege('anon', 'public.criar_convite_anamnese(uuid, uuid, integer, text, text)', 'execute')::text
union all select 'convites existentes', (select count(*)::text from public.anamnesis_invites)
union all select 'migration registrada', (select count(*)::text from supabase_migrations.schema_migrations where version = '20261014100000');
