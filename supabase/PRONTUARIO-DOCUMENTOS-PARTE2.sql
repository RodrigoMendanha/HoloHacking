-- =====================================================================
-- PRONTUARIO (09/10): exames e documentos sao SO arquivos — PARTE 2 de 4 — rodar INTEIRA no SQL Editor (uma transacao).
-- Laboratorio estruturado desativado (4 RPCs recusam, escrita revogada), Leitura Integrada fora do fluxo, Conduta sem os 3 campos.
-- Rode as partes NA ORDEM (1, 2, 3, 4). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema (tudo e "if not exists" / "create or replace").
-- NAO DESTRUTIVA: nenhuma tabela, coluna, linha ou arquivo e apagado; metodologia, HOLOSCAN e Resultado HOLOS intocados.
-- Conteudo identico a supabase/migrations/20261011100000_prontuario_documentos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'documents' and column_name = 'arquivado_em') then raise exception 'rode a PARTE 1 antes (documents.arquivado_em nao existe)'; end if;
end $$;
-- ----------------------------------------------------------------------------
-- 2. LABORATORIO ESTRUTURADO: desativado (historico so leitura)
-- ----------------------------------------------------------------------------
create or replace function public.salvar_coleta_exames(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'resultados laboratoriais estruturados foram desativados: exame e guardado so como arquivo do prontuario'
    using errcode = 'P0001', hint = 'laboratorio_desativado';
end $$;
revoke all on function public.salvar_coleta_exames(jsonb) from public, anon;
grant execute on function public.salvar_coleta_exames(jsonb) to authenticated;

create or replace function public.salvar_coleta_laboratorial(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'resultados laboratoriais estruturados foram desativados: exame e guardado so como arquivo do prontuario'
    using errcode = 'P0001', hint = 'laboratorio_desativado';
end $$;
revoke all on function public.salvar_coleta_laboratorial(jsonb) from public, anon;
grant execute on function public.salvar_coleta_laboratorial(jsonb) to authenticated;

create or replace function public.revisar_coleta_laboratorial(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'resultados laboratoriais estruturados foram desativados: as coletas antigas ficam so para leitura'
    using errcode = 'P0001', hint = 'laboratorio_desativado';
end $$;
revoke all on function public.revisar_coleta_laboratorial(jsonb) from public, anon;
grant execute on function public.revisar_coleta_laboratorial(jsonb) to authenticated;

create or replace function public.marcar_coleta_revisada(p_collection_id uuid, p_responsible text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'resultados laboratoriais estruturados foram desativados: as coletas antigas ficam so para leitura'
    using errcode = 'P0001', hint = 'laboratorio_desativado';
end $$;
revoke all on function public.marcar_coleta_revisada(uuid, text) from public, anon;
grant execute on function public.marcar_coleta_revisada(uuid, text) to authenticated;

-- escrita direta pela API (painel legado gravava direto nas tabelas): sai. Leitura (select) continua.
revoke insert, update, delete on table public.lab_collections from authenticated;
revoke insert, update, delete on table public.lab_results from authenticated;
revoke insert, update, delete on table public.lab_result_components from authenticated;
revoke insert, update, delete on table public.lab_custom_exams from authenticated;

-- ----------------------------------------------------------------------------
-- 3. LEITURA INTEGRADA: fora do fluxo (leituras salvas e pacotes ficam, so leitura)
-- ----------------------------------------------------------------------------
create or replace function public.salvar_leitura_integrada(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'a Leitura Integrada foi retirada do fluxo: exame nao produz resultado. As leituras salvas ficam so para leitura'
    using errcode = 'P0001', hint = 'li_desativada';
end $$;
revoke all on function public.salvar_leitura_integrada(jsonb) from public, anon;
grant execute on function public.salvar_leitura_integrada(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. CONDUTA: sem prescricao dietetica, diagnostico nutricional e encaminhamentos
-- ----------------------------------------------------------------------------
-- O sistema nao prescreve dieta. Revisao NOVA nasce sem esses tres campos; revisao existente nao muda (o que foi
-- gravado continua no historico, mas nao e mais exibido nem copiado para relatorio, Resultado ou HOLOS AI).
create or replace function public.conduta_sem_prescricao()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.dietary_prescription := null;
    new.nutrition_diagnosis := null;
    new.referrals := null;
  else
    new.dietary_prescription := old.dietary_prescription;
    new.nutrition_diagnosis := old.nutrition_diagnosis;
    new.referrals := old.referrals;
  end if;
  return new;
end $$;
revoke all on function public.conduta_sem_prescricao() from public, anon, authenticated;
drop trigger if exists conducts_sem_prescricao on public.conducts;
create trigger conducts_sem_prescricao before insert or update on public.conducts
  for each row execute function public.conduta_sem_prescricao();

commit;
