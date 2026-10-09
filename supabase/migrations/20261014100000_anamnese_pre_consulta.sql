-- =====================================================================
-- ANAMNESE PRE-CONSULTA POR LINK (09/10)
--
-- A nutricionista gera um link; a paciente (SEM conta) preenche no celular,
-- salva progresso, volta depois e envia. O que ela envia fica guardado como
-- RELATO DA PACIENTE neste convite (imutavel depois de enviado) e aparece na
-- ficha. Vira anamnese do atendimento so quando a nutricionista leva para la
-- (rascunho V2, com origem relato_paciente) e revisa. Nada aqui vira
-- diagnostico, conclusao, conduta, sistema HOLOS ou score.
--
-- TOKEN: 32 bytes aleatorios (base64url, 43 caracteres), gerado no servidor,
-- devolvido UMA vez a nutricionista. O banco guarda so o sha256 (hex). O link
-- leva o token depois do "#": nao vai para o servidor web nem para logs.
--
-- Estados guardados: enviado -> iniciado -> concluido | revogado.
-- "expirado" e calculado (expires_at < agora e nao concluido).
--
-- Somente aditiva: tabela nova e funcoes novas (nenhuma politica nova no Storage: a identidade vai no convite).
-- Nao mexe em anamneses, HOLOSCAN, ferramentas, Resultado HOLOS nem metodologia.
-- =====================================================================

create table if not exists public.anamnesis_invites (
  id                    uuid primary key default gen_random_uuid(),
  nutritionist_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  patient_id            uuid not null,
  encounter_id          uuid,
  token_hash            text not null,
  status                text not null default 'enviado',
  form_version          integer not null default 2,
  form_tipo             text not null default 'primeira',
  expires_at            timestamptz not null,
  draft_content         jsonb,
  submitted_content     jsonb,
  save_count            integer not null default 0,
  professional_snapshot jsonb not null default '{}'::jsonb,
  imported_anamnesis_id uuid,
  imported_at           timestamptz,
  created_at            timestamptz not null default now(),
  started_at            timestamptz,
  last_saved_at         timestamptz,
  submitted_at          timestamptz,
  revoked_at            timestamptz,
  constraint anamnesis_invites_token_hash_unico unique (token_hash),
  constraint anamnesis_invites_token_hash_formato check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint anamnesis_invites_status_valido check (status in ('enviado', 'iniciado', 'concluido', 'revogado')),
  constraint anamnesis_invites_tipo_valido check (form_tipo in ('primeira', 'retorno')),
  constraint anamnesis_invites_versao_valida check (form_version = 2),
  constraint anamnesis_invites_concluido_coerente check ((status = 'concluido') = (submitted_content is not null and submitted_at is not null)),
  constraint anamnesis_invites_revogado_coerente check ((status = 'revogado') = (revoked_at is not null)),
  constraint anamnesis_invites_tamanho check (coalesce(pg_column_size(draft_content), 0) <= 65536 and coalesce(pg_column_size(submitted_content), 0) <= 65536
                                              and pg_column_size(professional_snapshot) <= 131072),
  constraint anamnesis_invites_paciente_fk foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete cascade,
  constraint anamnesis_invites_atendimento_fk foreign key (encounter_id, patient_id, nutritionist_id) references public.encounters (id, patient_id, nutritionist_id)
);
comment on table public.anamnesis_invites is 'Anamnese pre-consulta por link: convite (token so como sha256), rascunho e resposta enviada pela paciente (relato_paciente, imutavel). Nao e anamnese do atendimento ate a nutricionista levar para la.';
create index if not exists anamnesis_invites_paciente on public.anamnesis_invites (patient_id, created_at desc);

-- resposta enviada e convite concluido/revogado nao mudam (so a marcacao "levado para a anamnese")
create or replace function public.proteger_convite_anamnese()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'convite de anamnese nao e apagado: revogue' using errcode = 'P0001', hint = 'convite_imutavel';
  end if;
  if new.nutritionist_id is distinct from old.nutritionist_id or new.patient_id is distinct from old.patient_id
     or new.token_hash is distinct from old.token_hash or new.created_at is distinct from old.created_at
     or new.professional_snapshot is distinct from old.professional_snapshot then
    raise exception 'convite nao muda de dona, paciente ou token' using errcode = 'P0001', hint = 'convite_imutavel';
  end if;
  if old.status = 'concluido' and (new.submitted_content is distinct from old.submitted_content or new.submitted_at is distinct from old.submitted_at
     or new.status is distinct from old.status or new.draft_content is distinct from old.draft_content) then
    raise exception 'resposta enviada pela paciente e imutavel' using errcode = 'P0001', hint = 'convite_concluido';
  end if;
  if old.status = 'revogado' and (new.status is distinct from old.status or new.draft_content is distinct from old.draft_content
     or new.submitted_content is distinct from old.submitted_content) then
    raise exception 'convite revogado nao volta' using errcode = 'P0001', hint = 'convite_revogado';
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_convite_anamnese() from public, anon, authenticated;
drop trigger if exists anamnesis_invites_proteger on public.anamnesis_invites;
create trigger anamnesis_invites_proteger before update or delete on public.anamnesis_invites
  for each row execute function public.proteger_convite_anamnese();

-- conta nao liberada nao gera convite (mesma trava das outras tabelas clinicas, 20261013100000)
do $$ begin
  if to_regprocedure('public.exigir_conta_ativa()') is not null then
    drop trigger if exists exigir_conta_ativa on public.anamnesis_invites;
    create trigger exigir_conta_ativa before insert or update or delete on public.anamnesis_invites
      for each statement execute function public.exigir_conta_ativa();
  end if;
end $$;

-- RLS: a nutricionista le os PROPRIOS convites (sem o hash); escrita so por RPC
alter table public.anamnesis_invites enable row level security;
revoke all on public.anamnesis_invites from public, anon, authenticated;
grant select (id, nutritionist_id, patient_id, encounter_id, status, form_version, form_tipo, expires_at, draft_content, submitted_content,
              save_count, professional_snapshot, imported_anamnesis_id, imported_at, created_at, started_at, last_saved_at, submitted_at, revoked_at)
  on public.anamnesis_invites to authenticated;
drop policy if exists anamnesis_invites_select_proprios on public.anamnesis_invites;
create policy anamnesis_invites_select_proprios on public.anamnesis_invites for select to authenticated
  using (nutritionist_id = (select auth.uid()));

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
