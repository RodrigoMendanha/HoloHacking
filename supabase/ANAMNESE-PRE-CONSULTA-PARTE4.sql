-- =====================================================================
-- ANAMNESE PRE-CONSULTA POR LINK (09/10) — PARTE 4 de 5 — rodar INTEIRA no SQL Editor (uma transacao).
-- RPCs da nutricionista: criar link, revogar, marcar como levado para a anamnese.
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
  if to_regprocedure('public.convite_anamnese_por_token(text)') is null then raise exception 'rode a PARTE 3 antes (nada foi aplicado)'; end if;
end $$;
-- ----------------------------------------------------------------------------
-- RPCs da NUTRICIONISTA (logada)
-- ----------------------------------------------------------------------------
-- IDENTIDADE NO CONVITE: nome, profissao, registro e cores vem do Perfil (servidor) no momento do convite; o
-- logo vem como miniatura (data URL, ate ~90 KB) enviada pela propria nutricionista. Assim a pagina publica nao
-- precisa ler o Storage (o caminho do arquivo traria o ID da conta) e o link nao revela nenhum ID.
create or replace function public.criar_convite_anamnese(p_patient_id uuid, p_encounter_id uuid default null, p_dias integer default 7,
                                                         p_tipo text default 'primeira', p_logo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); pac record; tok text; c public.anamnesis_invites; pr record;
begin
  if uid is null then raise exception 'sem sessao' using errcode = '42501'; end if;
  select id, status into pac from public.patients where id = p_patient_id and nutritionist_id = uid;
  if pac.id is null then raise exception 'paciente nao encontrado' using errcode = 'P0002', hint = 'paciente_invalido'; end if;
  if pac.status = 'inativo' then raise exception 'paciente arquivado' using errcode = 'P0001', hint = 'paciente_arquivado'; end if;
  if p_encounter_id is not null and not exists (select 1 from public.encounters e where e.id = p_encounter_id and e.patient_id = p_patient_id and e.nutritionist_id = uid) then
    raise exception 'atendimento nao encontrado' using errcode = 'P0002', hint = 'atendimento_invalido';
  end if;
  if p_dias is null or p_dias < 1 or p_dias > 30 then raise exception 'validade de 1 a 30 dias' using errcode = '22023', hint = 'validade_invalida'; end if;
  if p_tipo not in ('primeira', 'retorno') then raise exception 'tipo invalido' using errcode = '22023', hint = 'tipo_invalido'; end if;
  if p_logo is not null and (length(p_logo) > 90000 or p_logo !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$') then
    raise exception 'logo invalido' using errcode = '22023', hint = 'logo_invalido';
  end if;
  select p.nome, p.profissao, p.registro, p.cor_primaria, p.cor_secundaria into pr from public.profiles p where p.id = uid;
  -- um link valido por paciente: gerar outro revoga o anterior que ainda nao foi enviado
  update public.anamnesis_invites set status = 'revogado', revoked_at = now()
   where patient_id = p_patient_id and nutritionist_id = uid and status in ('enviado', 'iniciado');
  tok := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.anamnesis_invites (nutritionist_id, patient_id, encounter_id, token_hash, form_tipo, expires_at, professional_snapshot)
  values (uid, p_patient_id, p_encounter_id, public.convite_anamnese_hash(tok), p_tipo, now() + make_interval(days => p_dias),
          jsonb_build_object('nome', pr.nome, 'profissao', pr.profissao, 'registro', pr.registro,
                             'cor_primaria', pr.cor_primaria, 'cor_secundaria', pr.cor_secundaria, 'logo', p_logo))
  returning * into c;
  return jsonb_build_object('id', c.id, 'token', tok, 'expires_at', c.expires_at, 'status', c.status, 'form_tipo', c.form_tipo);
end;
$$;

create or replace function public.revogar_convite_anamnese(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c public.anamnesis_invites;
begin
  select * into c from public.anamnesis_invites where id = p_id and nutritionist_id = uid;
  if c.id is null then raise exception 'convite nao encontrado' using errcode = 'P0002', hint = 'convite_invalido'; end if;
  if c.status = 'concluido' then raise exception 'convite ja respondido nao e revogado' using errcode = 'P0001', hint = 'convite_concluido'; end if;
  if c.status = 'revogado' then return jsonb_build_object('id', c.id, 'status', c.status); end if;
  update public.anamnesis_invites set status = 'revogado', revoked_at = now() where id = c.id returning * into c;
  return jsonb_build_object('id', c.id, 'status', c.status, 'revoked_at', c.revoked_at);
end;
$$;

-- a nutricionista levou a resposta para uma anamnese do atendimento (so marca; nao altera a resposta)
create or replace function public.marcar_convite_anamnese_usado(p_id uuid, p_anamnesis_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c public.anamnesis_invites;
begin
  select * into c from public.anamnesis_invites where id = p_id and nutritionist_id = uid;
  if c.id is null then raise exception 'convite nao encontrado' using errcode = 'P0002', hint = 'convite_invalido'; end if;
  if c.status <> 'concluido' then raise exception 'a paciente ainda nao enviou' using errcode = 'P0001', hint = 'convite_nao_concluido'; end if;
  if not exists (select 1 from public.anamneses a where a.id = p_anamnesis_id and a.nutritionist_id = uid and a.patient_id = c.patient_id) then
    raise exception 'anamnese nao encontrada' using errcode = 'P0002', hint = 'anamnese_invalida';
  end if;
  update public.anamnesis_invites set imported_anamnesis_id = p_anamnesis_id, imported_at = now() where id = c.id returning * into c;
  return jsonb_build_object('id', c.id, 'imported_anamnesis_id', c.imported_anamnesis_id, 'imported_at', c.imported_at);
end;
$$;
commit;

select 'funcoes da nutricionista' as item, (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  and p.proname in ('criar_convite_anamnese', 'revogar_convite_anamnese', 'marcar_convite_anamnese_usado')) as valor;
