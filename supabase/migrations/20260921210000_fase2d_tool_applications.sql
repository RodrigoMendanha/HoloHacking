-- ============================================================================
-- FASE 2D — TOOL_APPLICATIONS (aplicacoes de ferramentas clinicas)
-- ============================================================================
--
-- Escopo desta migration, e so isto:
--   1. Adicionar UNIQUE em consultations para FK composta
--   2. tool_applications — cada aplicacao de ferramenta a um paciente
--
-- Ferramentas ativas nesta fase (6):
--   CORPO:    oq3, linha_momentum
--   MENTE:    pqq, mapa_crencas
--   ESPIRITO: roda_vida, carta_futuro
--
-- Mapa do Proposito NAO e aplicacao independente: e uma VIEW derivada
-- do campo `verdadeiro` do PQQ. Nao criar tabela para ele.
--
-- O catalogo (ferramentas.js) possui ~23 outras ferramentas que ainda
-- nao participam do ciclo de persistencia. O CHECK restringe
-- ferramenta_id somente as 6 ativas. Quando mais ferramentas forem
-- ativadas, o CHECK sera expandido.
--
-- NAO cria: tabelas individuais por ferramenta, documentos, storage,
--           reports, timeline, professional_assets.
-- NAO altera frontend.
--
-- Projeto: sllhyymeeyoozokgbnuv
-- ============================================================================


-- ============================================================================
-- 1. UNIQUE EM CONSULTATIONS PARA FK COMPOSTA
-- ============================================================================
--
-- tool_applications precisa garantir, no banco, que uma aplicacao do
-- paciente A nao aponte para uma consulta do paciente B, mesmo que ambos
-- pertencam ao mesmo nutricionista.
--
-- Para isso, a FK composta (consultation_id, patient_id, nutritionist_id)
-- precisa de um alvo UNIQUE correspondente em consultations.
--
-- consultations.id ja e PK (unique por si so). Adicionar
-- UNIQUE(id, patient_id, nutritionist_id) nao altera a semantica da
-- tabela — apenas cria o alvo necessario para a FK.

alter table public.consultations
  add constraint consultations_id_patient_nutritionist_unique
  unique (id, patient_id, nutritionist_id);


-- ============================================================================
-- 2. TOOL_APPLICATIONS — cada aplicacao de ferramenta
-- ============================================================================
--
-- Cada vez que uma ferramenta e aplicada a um paciente, gera uma nova linha.
-- Nunca sobrescreve aplicacao anterior. Reaplicar a mesma ferramenta cria
-- outra linha — a anterior continua la, fechada, com a data dela.
--
-- Um rascunho aberto continua sendo o mesmo rascunho ate ser concluido.
-- Concluir uma aplicacao a fecha; a proxima abertura comeca outra.
--
-- Fluxo de status:
--   rascunho  →  concluida  →  revisada
--
-- Campos que mudam apos criacao:
--   - status (rascunho → concluida → revisada)
--   - respostas (atualizadas durante preenchimento)
--   - resultado (calculado/derivado, atualizado junto com respostas)
--   - leitura, prioridade, proximo_passo (set na revisao)
--   - concluida_em (set quando status vira concluida)
--   - atualizada_em (set em cada gravar())
--
-- Campos protegidos por trigger (imutaveis apos criacao):
--   - nutritionist_id, patient_id, ferramenta_id, versao_ferramenta
--   - origem_legada, iniciada_em, consultation_id
--   Auditoria de aplicacoes.js confirmou: NENHUM destes campos e
--   alterado apos a criacao. gravar() so atualiza campos passados em
--   `campos`, e nenhum caller (salvarRespostas, concluir, revisar)
--   passa estes campos. O trigger proteger_identidade_aplicacao()
--   rejeita qualquer tentativa de alteracao no banco.
--
-- Timestamps duplos por intencao:
--   - iniciada_em / concluida_em / atualizada_em: timestamps de FLUXO,
--     representam quando a ACAO aconteceu no workflow do usuario
--   - created_at / updated_at: timestamps de BANCO, representam quando
--     o REGISTRO foi criado/alterado no PostgreSQL
--
-- versao_ferramenta e text: "1" para aplicacoes novas (VERSAO_CATALOGO),
-- "0" para aplicacoes migradas de tabelas legadas.
--
-- origem_legada e a chave de idempotencia da migracao de OQ3/PQQ:
--   "oq3:<uuid>" ou "pqq:<uuid>" identifica a linha legada que gerou
--   esta aplicacao. Nullable: somente aplicacoes migradas a possuem.
--
-- respostas e JSONB: cada ferramenta define seus campos internamente.
-- Nao normalizar campos internos de OQ3/PQQ/etc. nesta fase.
--
-- resultado e JSONB nullable: derivado das respostas, mas persistido
-- como conveniencia/snapshot. OQ3 e PQQ nao produzem resultado (null).

create table public.tool_applications (
  id                  uuid primary key default gen_random_uuid(),
  nutritionist_id     uuid not null default auth.uid()
                        references auth.users(id),
  patient_id          uuid not null,
  consultation_id     uuid,
  ferramenta_id       text not null,
  versao_ferramenta   text not null,
  origem_legada       text,
  status              text not null default 'rascunho',
  iniciada_em         timestamptz not null default now(),
  concluida_em        timestamptz,
  atualizada_em       timestamptz not null default now(),
  respostas           jsonb not null default '{}'::jsonb,
  resultado           jsonb,
  leitura             text,
  prioridade          text,
  proximo_passo       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint tool_applications_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id)
    references public.patients (id, nutritionist_id)
    on delete restrict,

  constraint tool_applications_consultation_fk
    foreign key (consultation_id, patient_id, nutritionist_id)
    references public.consultations (id, patient_id, nutritionist_id)
    on delete set null (consultation_id),

  constraint tool_applications_ferramenta_valida
    check (ferramenta_id in (
      'oq3',
      'pqq',
      'linha_momentum',
      'mapa_crencas',
      'roda_vida',
      'carta_futuro'
    )),

  constraint tool_applications_status_valido
    check (status in ('rascunho', 'concluida', 'revisada'))
);

create index tool_applications_nutritionist_id_idx
  on public.tool_applications (nutritionist_id);

create index tool_applications_patient_created_idx
  on public.tool_applications (patient_id, created_at desc);

drop trigger if exists tool_applications_tocar_updated_at on public.tool_applications;
create trigger tool_applications_tocar_updated_at
  before update on public.tool_applications
  for each row execute function public.tocar_updated_at();


-- ============================================================================
-- 3. PROTEGER IDENTIDADE DA APLICACAO
-- ============================================================================
--
-- Auditoria de aplicacoes.js confirmou que os 7 campos abaixo sao
-- definidos exclusivamente na criacao (novaAplicacao, migrar,
-- migrarTabelaLegada) e NUNCA aparecem em gravar() ou qualquer caller
-- (salvarRespostas, concluir, revisar):
--
--   nutritionist_id   — default auth.uid(), nunca escrito pelo app
--   patient_id        — set em novaAplicacao/migrar, nunca atualizado
--   ferramenta_id     — set em novaAplicacao/migrar, nunca atualizado
--   versao_ferramenta — set em novaAplicacao/migrar, nunca atualizado
--   origem_legada     — set somente em migrarTabelaLegada, nunca atualizado
--   iniciada_em       — set em novaAplicacao/migrar, nunca atualizado
--   consultation_id   — set em novaAplicacao (consultaDeHoje) e migrar
--                        (null), nunca atualizado; formulario.js le o
--                        campo (linha 233) mas nunca o escreve
--
-- A funcao NAO e SECURITY DEFINER — roda com os privilegios do caller.

create or replace function public.proteger_identidade_aplicacao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.nutritionist_id    is distinct from old.nutritionist_id
  or new.patient_id         is distinct from old.patient_id
  or new.ferramenta_id      is distinct from old.ferramenta_id
  or new.versao_ferramenta  is distinct from old.versao_ferramenta
  or new.origem_legada      is distinct from old.origem_legada
  or new.iniciada_em        is distinct from old.iniciada_em
  or new.consultation_id    is distinct from old.consultation_id
  then
    raise exception 'campos de identidade da aplicacao sao imutaveis; '
      'somente status, respostas, resultado, leitura, prioridade, '
      'proximo_passo, concluida_em e atualizada_em podem ser alterados';
  end if;
  return new;
end;
$$;

drop trigger if exists tool_applications_proteger_identidade
  on public.tool_applications;
create trigger tool_applications_proteger_identidade
  before update on public.tool_applications
  for each row execute function public.proteger_identidade_aplicacao();

alter table public.tool_applications enable row level security;

create policy tool_applications_select_proprios
  on public.tool_applications for select
  to authenticated
  using (nutritionist_id = (select auth.uid()));

create policy tool_applications_insert_proprios
  on public.tool_applications for insert
  to authenticated
  with check (nutritionist_id = (select auth.uid()));

create policy tool_applications_update_proprios
  on public.tool_applications for update
  to authenticated
  using (nutritionist_id = (select auth.uid()))
  with check (nutritionist_id = (select auth.uid()));

create policy tool_applications_delete_proprios
  on public.tool_applications for delete
  to authenticated
  using (nutritionist_id = (select auth.uid()));


-- ============================================================================
-- NOTA: MIGRACAO DOS DADOS LEGADOS
-- ============================================================================
--
-- Tres origens de dados legados:
--
-- 1. Chave localStorage "holohacking.ferramentas"
--    Definida em aplicacoes.js como CAIXA_ANTIGA (linha 47).
--    Registrada em armazenamento.js como CAIXAS_LEGADAS_CONSUMIDAS.
--    Tambem limpa em perfil.js no "apagar tudo" (linha 933).
--    Formato: { pacienteId: { ferramentaId: { campo: valor } } }
--    Sem data. Cada entrada vira uma aplicacao concluida com:
--      iniciada_em = data da migracao (a data real nao existe)
--      leitura = 'Aplicacao anterior ao historico: a data original nao
--                 foi guardada.'
--      versao_ferramenta = "0"
--      consulta_id = null
--    Ao terminar, a chave e removida do localStorage.
--    Ja implementado em aplicacoes.js migrar() (linhas 233-275).
--
-- 2. Tabela legada oq3
--    Cada linha TEM created_at (data real). Vira aplicacao concluida
--    com iniciada_em = created_at original. Identificada por
--    origem_legada = "oq3:<id>".
--    Ja implementado em aplicacoes.js migrarOQ3().
--
-- 3. Tabela legada pqq
--    Mesmo formato do oq3. Identificada por origem_legada = "pqq:<id>".
--    Ja implementado em aplicacoes.js migrarPQQ().
--
-- As tabelas legadas oq3 e pqq NAO sao apagadas — continuam como
-- origem para auditoria.
--
-- Nao migrar dados nesta rodada.
-- Nao alterar frontend.
