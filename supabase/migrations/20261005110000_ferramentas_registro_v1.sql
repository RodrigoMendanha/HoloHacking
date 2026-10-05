-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.5 (B): TRES REGISTROS CLINICOS ESTRUTURADOS
-- ============================================================================
-- Ferramentas novas: mapa_rotina (CORPO 03), gatilhos_respostas (MENTE 03),
-- conexao_pertencimento (ESPIRITO 04).
--
-- Natureza: REGISTRO CLINICO ESTRUTURADO. Sem score, faixa, diagnostico,
-- classificacao, interpretacao ou recomendacao automatica; nenhum efeito em
-- HOLOSCAN, Indice, Triada, Leitura Integrada ou exames. Nada aqui toca
-- methodology_*, holoscan_*, lab_* nem integrated_reading_*.
--
-- Modelo: as tres reutilizam public.tool_applications (mesmo ciclo
-- rascunho -> concluida -> revisada, mesma RLS por nutritionist_id, FK
-- paciente+nutricionista, bloqueio de paciente arquivado, vinculo ao
-- atendimento, identidade imutavel, sincronizacao e relatorios). O conteudo
-- fica em respostas (jsonb), mas NAO como campo generico livre: o trigger
-- abaixo aceita so as chaves, tipos, tamanhos e opcoes do catalogo
-- (ferramentas.js / REGISTRO_OPCOES — o teste compara as duas listas).
--
-- O que muda:
--   1. tool_applications_ferramenta_valida passa a aceitar os 3 ids novos.
--   2. BEFORE INSERT/UPDATE (so para os 3 ids): respostas validadas por
--      lista branca; resultado sempre NULL (sem sintese automatica).
--   3. BEFORE UPDATE (so para os 3 ids): aplicacao concluida/revisada nao muda
--      mais respostas, resultado nem concluida_em, e nao volta a rascunho.
--      Leitura profissional, prioridade e proximo passo continuam editaveis
--      (e o que a torna "revisada"). Corrigir = nova aplicacao.
--
-- O que NAO muda: as 12 aplicacoes existentes das outras 6 ferramentas (o
-- trigger as ignora pelo ferramenta_id), as policies, os outros triggers,
-- HOLOS-V1@2, LI-V1@2 e as 4 aplicacoes historicas do HOLOSCAN.
-- ============================================================================

-- 1. ids aceitos ---------------------------------------------------------------
alter table public.tool_applications drop constraint if exists tool_applications_ferramenta_valida;
alter table public.tool_applications add constraint tool_applications_ferramenta_valida
  check (ferramenta_id in (
    'oq3', 'pqq', 'linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro',
    'mapa_rotina', 'gatilhos_respostas', 'conexao_pertencimento'
  ));

-- 2. o formato de cada registro --------------------------------------------------
-- Tipos: texto (ate 1000), textarea (ate 8000), hora (HH:MM), data (AAAA-MM-DD),
-- nota (inteiro 0-10, percepcao do paciente), dias (lista de dias), op:<lista>.
create or replace function public.registro_clinico_formato(p_ferramenta text)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case p_ferramenta
    when 'mapa_rotina' then jsonb_build_object(
      'campos', jsonb_build_object(
        'acorda','hora', 'dorme','hora', 'sono','textarea', 'trabalho','textarea', 'deslocamentos','textarea',
        'familia','textarea', 'domesticas','textarea', 'estudos','textarea', 'compromissos','textarea',
        'dificuldade','textarea', 'disponiveis','textarea', 'espacos','textarea', 'observacoes','textarea'),
      'lista', 'eventos',
      'item', jsonb_build_object(
        'inicio','hora', 'fim','hora', 'categoria','op:rotina_categorias', 'titulo','texto', 'descricao','texto',
        'percepcao','op:percepcao', 'dias','dias', 'observacao','texto'))
    when 'gatilhos_respostas' then jsonb_build_object(
      'campos', jsonb_build_object(
        'data','data', 'horario','hora', 'contexto','textarea', 'gatilho','textarea', 'pensamento','textarea',
        'emocao','texto', 'intensidade','nota', 'resposta','textarea', 'consequencia_imediata','textarea',
        'consequencia_posterior','textarea', 'necessidade','textarea', 'observacao_nutri','textarea',
        'alternativa','textarea'))
    when 'conexao_pertencimento' then jsonb_build_object(
      'campos', jsonb_build_object(
        'contar','textarea', 'apoia_mudanca','textarea', 'dificulta_mudanca','textarea', 'pertence','textarea',
        'sozinha','textarea', 'fortalecem','textarea', 'dificultam','textarea', 'referencias','textarea',
        'espacos_seguros','textarea', 'percepcao_apoio','textarea', 'conexao_consigo','textarea',
        'espiritualidade','textarea', 'comunidade_religiosa','textarea', 'pratica_espiritual','textarea',
        'algo_maior','textarea', 'observacoes','textarea'),
      'lista', 'vinculos',
      'item', jsonb_build_object(
        'rotulo','texto', 'natureza','op:vinculo_natureza', 'tipo','op:vinculo_tipo', 'relacao','texto',
        'papel','op:vinculo_papel', 'proximidade','op:vinculo_proximidade', 'momento','op:vinculo_momento',
        'contexto','texto', 'observacao','texto'))
    else null
  end;
$$;

-- Opcoes DESCRITIVAS, escolhidas por quem registra (iguais a REGISTRO_OPCOES em ferramentas.js).
create or replace function public.registro_clinico_opcoes()
returns jsonb
language sql
immutable
set search_path = public
as $$
  select '{
    "rotina_categorias": ["sono", "refeição", "trabalho", "deslocamento", "exercício", "pausa", "estudo", "cuidado familiar", "compromisso", "fome", "energia", "estresse", "outro"],
    "percepcao": ["baixa", "média", "alta"],
    "dias": ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"],
    "vinculo_natureza": ["pessoa", "grupo", "ambiente", "comunidade", "outro"],
    "vinculo_tipo": ["família", "amizade", "parceiro(a)", "trabalho", "comunidade", "outro"],
    "vinculo_papel": ["apoia", "dificulta", "neutro", "variável"],
    "vinculo_proximidade": ["próxima", "intermediária", "distante"],
    "vinculo_momento": ["presente no momento", "não presente no momento"]
  }'::jsonb;
$$;

-- Um valor contra o seu tipo. Devolve NULL se esta certo, ou o motivo.
create or replace function public.registro_clinico_valor_invalido(p_tipo text, p_valor jsonb)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  t text := jsonb_typeof(p_valor);
  s text;
  ops jsonb;
  d jsonb;
begin
  if p_valor is null or t = 'null' then return null; end if;
  if p_tipo = 'dias' then
    if t <> 'array' then return 'dias deve ser lista'; end if;
    if jsonb_array_length(p_valor) > 7 then return 'dias: mais de 7'; end if;
    ops := public.registro_clinico_opcoes() -> 'dias';
    for d in select value from jsonb_array_elements(p_valor) loop
      if jsonb_typeof(d) <> 'string' or not (ops @> jsonb_build_array(d)) then return 'dia invalido'; end if;
    end loop;
    if (select count(distinct value) from jsonb_array_elements(p_valor)) <> jsonb_array_length(p_valor) then
      return 'dia repetido';
    end if;
    return null;
  end if;
  if p_tipo = 'nota' then
    if t = 'number' then s := p_valor #>> '{}';
    elsif t = 'string' then s := p_valor #>> '{}';
    else return 'intensidade deve ser numero'; end if;
    if s !~ '^(10|[0-9])$' then return 'intensidade fora de 0 a 10'; end if;
    return null;
  end if;
  if t <> 'string' then return 'valor deve ser texto'; end if;
  s := p_valor #>> '{}';
  if p_tipo = 'texto' then
    if length(s) > 1000 then return 'texto longo demais'; end if;
  elsif p_tipo = 'textarea' then
    if length(s) > 8000 then return 'texto longo demais'; end if;
  elsif p_tipo = 'hora' then
    if s !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then return 'horario invalido'; end if;
  elsif p_tipo = 'data' then
    if s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return 'data invalida'; end if;
    begin perform s::date; exception when others then return 'data invalida'; end;
  elsif p_tipo like 'op:%' then
    ops := public.registro_clinico_opcoes() -> substr(p_tipo, 4);
    if ops is null or not (ops @> jsonb_build_array(p_valor)) then return 'opcao fora da lista'; end if;
  else
    return 'tipo desconhecido';
  end if;
  return null;
end;
$$;

create or replace function public.validar_registro_clinico()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  fmt jsonb := public.registro_clinico_formato(new.ferramenta_id);
  r jsonb := new.respostas;
  k text;
  v jsonb;
  item jsonb;
  ik text;
  motivo text;
  n int;
begin
  if fmt is null then return new; end if;   -- as outras ferramentas nao mudam

  if new.resultado is not null and jsonb_typeof(new.resultado) <> 'null' then
    raise exception 'registro clinico estruturado nao tem resultado automatico (resultado deve ser nulo)'
      using errcode = 'P0001', hint = 'registro_resultado';
  end if;
  if r is null or jsonb_typeof(r) <> 'object' then
    raise exception 'respostas do registro devem ser um objeto' using errcode = 'P0001', hint = 'registro_formato';
  end if;
  if length(r::text) > 200000 then
    raise exception 'registro grande demais' using errcode = 'P0001', hint = 'registro_formato';
  end if;

  for k, v in select key, value from jsonb_each(r) loop
    if k = 'origem_id' then
      if jsonb_typeof(v) = 'null' then continue; end if;
      if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        raise exception 'origem_id invalido' using errcode = 'P0001', hint = 'registro_formato';
      end if;
      select count(*) into n from public.tool_applications t
       where t.id = (v #>> '{}')::uuid and t.patient_id = new.patient_id
         and t.nutritionist_id = new.nutritionist_id and t.ferramenta_id = new.ferramenta_id
         and t.id is distinct from new.id;
      if n = 0 then
        raise exception 'origem_id nao e uma aplicacao desta ferramenta para este paciente'
          using errcode = 'P0001', hint = 'registro_formato';
      end if;
    elsif fmt ? 'lista' and k = (fmt ->> 'lista') then
      if jsonb_typeof(v) = 'null' then continue; end if;
      if jsonb_typeof(v) <> 'array' then
        raise exception 'campo % deve ser lista', k using errcode = 'P0001', hint = 'registro_formato';
      end if;
      if jsonb_array_length(v) > 100 then
        raise exception 'campo % com mais de 100 itens', k using errcode = 'P0001', hint = 'registro_formato';
      end if;
      for item in select value from jsonb_array_elements(v) loop
        if jsonb_typeof(item) <> 'object' then
          raise exception 'item de % deve ser objeto', k using errcode = 'P0001', hint = 'registro_formato';
        end if;
        for ik in select key from jsonb_each(item) loop
          if not ((fmt -> 'item') ? ik) then
            raise exception 'campo % nao existe nos itens de %', ik, k using errcode = 'P0001', hint = 'registro_formato';
          end if;
          motivo := public.registro_clinico_valor_invalido(fmt -> 'item' ->> ik, item -> ik);
          if motivo is not null then
            raise exception '%.%: %', k, ik, motivo using errcode = 'P0001', hint = 'registro_formato';
          end if;
        end loop;
      end loop;
    elsif (fmt -> 'campos') ? k then
      motivo := public.registro_clinico_valor_invalido(fmt -> 'campos' ->> k, v);
      if motivo is not null then
        raise exception '%: %', k, motivo using errcode = 'P0001', hint = 'registro_formato';
      end if;
    else
      raise exception 'campo % nao existe neste registro', k using errcode = 'P0001', hint = 'registro_formato';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.validar_registro_clinico() from public, anon, authenticated;

drop trigger if exists tool_applications_validar_registro on public.tool_applications;
create trigger tool_applications_validar_registro
  before insert or update on public.tool_applications
  for each row execute function public.validar_registro_clinico();

-- 3. concluido nao se reescreve ------------------------------------------------------
create or replace function public.registro_clinico_concluido_imutavel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.registro_clinico_formato(old.ferramenta_id) is null then return new; end if;
  if old.status in ('concluida', 'revisada') then
    if new.status not in ('concluida', 'revisada')
    or new.respostas is distinct from old.respostas
    or new.resultado is distinct from old.resultado
    or new.concluida_em is distinct from old.concluida_em
    or new.encounter_id is distinct from old.encounter_id then
      raise exception 'registro concluido nao e reescrito: para corrigir, crie uma nova aplicacao (a anterior fica no historico)'
        using errcode = 'P0001', hint = 'registro_concluido';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.registro_clinico_concluido_imutavel() from public, anon, authenticated;

drop trigger if exists tool_applications_registro_concluido on public.tool_applications;
create trigger tool_applications_registro_concluido
  before update on public.tool_applications
  for each row execute function public.registro_clinico_concluido_imutavel();

-- As funcoes de formato sao so leitura de constantes; o trigger (que roda com os privilegios de quem grava)
-- precisa delas. Nada para anon.
revoke all on function public.registro_clinico_formato(text) from public, anon;
revoke all on function public.registro_clinico_opcoes() from public, anon;
revoke all on function public.registro_clinico_valor_invalido(text, jsonb) from public, anon;
grant execute on function public.registro_clinico_formato(text) to authenticated;
grant execute on function public.registro_clinico_opcoes() to authenticated;
grant execute on function public.registro_clinico_valor_invalido(text, jsonb) to authenticated;
