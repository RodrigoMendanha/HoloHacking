-- Harness PONTE HOLOS AI (migration 20261023100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), depois da migration. Paciente, atendimento, HOLOSCAN (v7) e JSON HOLOS_AI_RESULT FICTICIOS
-- (caso "Paciente Teste T5 Ficticia", docs/v1/holos-ai-gpt/exemplo-resultado.json). Nada persiste.
-- ARQUIVO GERADO: edite scripts/holos-ai-ponte-harness.modelo.sql e rode python3 scripts/gerar-harness-holos-ai.py
--   HA00 estrutura: RLS, sem escrita direta, funcoes internas fechadas, RPCs so para authenticated
--   HA01 JSON invalido -> json_invalido; nada salvo        HA02 schema_version 2 -> schema_incompativel; nada salvo
--   HA03 estrutura invalida (MANTER na 1a consulta, 4 ferramentas) -> resultado_invalido; nada salvo
--   HA04 importacao valida (resposta inteira do GPT colada) -> versao 1, texto e JSON originais, um item por elemento
--   HA05 imutabilidade: original, item da IA e apagar recusados; nutricionista nao grava direto
--   HA06 nova importacao no mesmo atendimento -> versao 2; a 1 fica identica     HA07 operation_id repetido -> mesma importacao
--   HA08 revisao: confirmar, editar (so texto), descartar; so profissional nao compartilha; status em_revisao
--   HA09 concluir: pendente -> revisao_incompleta; tudo decidido -> confirmado; depois disso nada muda
--   HA10 Resultado HOLOS: item descartado / so profissional / importacao nao concluida / sem ref / outra paciente recusados
--   HA11 Resultado finalizado + emissao RF-3: so o confirmado e compartilhado vai para a paciente (com o texto EDITADO);
--        descartado, so profissional e nao compartilhado ficam fora
--   HA12 outra nutricionista nao le nem revisa     HA13 descartar importacao; anonimo nao importa
--   HA14 nao interferencia: HOLOSCAN e Resultados de outras pacientes identicos; direcao antiga continua valendo
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _ha (k text primary key, v text) on commit drop;
create temp table _logha (n serial, passo text) on commit drop;
grant select, insert, update on _ha, _logha to authenticated, anon;
grant usage on sequence _logha_n_seq to authenticated, anon;
create or replace function pg_temp.ha_tenta(sql text) returns text language plpgsql as $$
declare h text; m text; c text; r text;
begin
  execute sql into r;
  return 'ACEITO:' || coalesce(r, '');
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text, c = returned_sqlstate;
  return coalesce(nullif(h, ''), c || ':' || m);
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;
insert into _ha values ('json', $J${
  "schema_version": 1,
  "tipo": "primeira_consulta",
  "meta": {
    "agente": "HOLOS-AI-GPT 1.2",
    "kb_version": "HOLOS-KB 0.3 (sistemas HOLOS-V1 v7; ferramentas HOLOS-RECOMENDACOES-V1 / PP-V1; direcionamentos e estratégias sem catálogo homologado)",
    "identificador": "PACIENTE-TESTE-T5",
    "data_atendimento": "2026-10-13",
    "data_analise": "2026-10-13"
  },
  "entrada": {
    "documentos": ["pdf_resultado_holos"],
    "base_principal": "pdf_resultado_holos",
    "observacao": "Só o PDF do Resultado HOLOS foi enviado (fallback temporário). Com o Pacote HOLOS AI, o Pacote prevalece."
  },
  "sintese_integrada": "Primeira consulta, ponto de partida sem evolução registrada. O HOLOSCAN indica o Sistema Metabólico (2,4) e o Fúngico (5,8) como as primeiras áreas para aprofundar. O Mapa da Rotina localizou a dificuldade principal entre 16h e 18h (fome forte e queda de disposição) e um espaço real de mudança: preparar o lanche na noite anterior. Foco, direcionamento e estratégia acordada já conversam entre si. Ainda falta aprofundar o comportamento alimentar fora do fim da tarde (fome logo depois de comer, comer depois do jantar sem fome, vontade de doce ou pão) e os relatos digestivos. Mente e Espírito ainda não foram aprofundados nesta etapa.",
  "o_que_apareceu": [
    { "texto": "Foco atual: organizar o fim da tarde.", "fonte": "Resultado HOLOS: foco" },
    { "texto": "Sistema Metabólico 2,4 e Sistema Fúngico 5,8 como primeira e segunda áreas para aprofundar.", "fonte": "HOLOSCAN (HOLOS-V1 v7)" },
    { "texto": "Muito sono logo depois do almoço; fome novamente pouco tempo depois de comer; comer depois do jantar mesmo sem fome percebida.", "fonte": "HOLOSCAN: sinais do Metabólico" },
    { "texto": "Vontade forte de doce ou pão quase todos os dias; barriga inchada ou gases depois das refeições; relato de camada esbranquiçada na língua.", "fonte": "HOLOSCAN: sinais do Fúngico" },
    { "texto": "Fome forte e queda de disposição entre 16h e 18h; reuniões à tarde; espaço para mudança: preparar o lanche na noite anterior.", "fonte": "Mapa da Rotina" },
    { "texto": "Estratégia acordada: lanche planejado antes da fome forte, por volta das 16h.", "fonte": "Resultado HOLOS: estratégia acordada" }
  ],
  "convergencias": [
    { "tipo": "convergencia", "texto": "Fome forte e queda de disposição no fim da tarde aparecem no Mapa da Rotina e conversam com os sinais do Metabólico (sono depois do almoço, fome pouco depois de comer).", "fontes": ["Mapa da Rotina", "HOLOSCAN: sinais do Metabólico"] },
    { "tipo": "convergencia", "texto": "Vontade forte de doce ou pão e comer depois do jantar sem fome são comportamentos alimentares recorrentes que podem ser investigados em conjunto, sem relação de causa estabelecida.", "fontes": ["HOLOSCAN: sinais do Fúngico", "HOLOSCAN: sinais do Metabólico"] },
    { "tipo": "convergencia", "texto": "O espaço de mudança relatado (preparar o lanche na noite anterior) e a estratégia acordada são coerentes entre si.", "fontes": ["Mapa da Rotina", "Resultado HOLOS: estratégia acordada"] }
  ],
  "padroes_observados": [
    "As dificuldades se concentram em dois momentos do dia: depois do almoço / fim da tarde e depois do jantar.",
    "A rotina de trabalho tem reuniões à tarde, justamente no horário crítico."
  ],
  "pontos_para_aprofundar": [
    { "tipo": "questao", "texto": "O que acontece antes de comer depois do jantar sem fome (situação, pensamento, emoção)?", "so_profissional": false },
    { "tipo": "questao", "texto": "Em que momentos a vontade de doce ou pão aparece?", "so_profissional": false },
    { "tipo": "questao", "texto": "Os gases e o inchaço aparecem depois de quais refeições?", "so_profissional": false },
    { "tipo": "hipotese", "texto": "As reuniões da tarde podem dificultar comer por volta das 16h. Conferir no retorno.", "so_profissional": true },
    { "tipo": "hipotese", "texto": "A fome do fim da tarde e o comer depois do jantar podem fazer parte de um mesmo padrão do dia. Investigar com episódios concretos.", "so_profissional": true }
  ],
  "sistemas_prioritarios": [
    {
      "ordem": 1,
      "sistema": "Sistema Metabólico",
      "nota": "2,4",
      "posicao": "primeira área para aprofundar",
      "o_que_apareceu": "Muito sono logo depois do almoço; fome novamente pouco tempo depois de comer; comer depois do jantar mesmo sem fome percebida; fome forte e queda de disposição entre 16h e 18h (Mapa da Rotina).",
      "o_que_observar": "Horários, intervalos entre refeições, fome, saciedade e energia ao longo do dia, com atenção a 16h–18h e ao período depois do jantar.",
      "como_cuidar": "Alimentação, horários, fome, energia e rotina merecem aprofundamento. O eixo não diagnostica resistência à insulina, diabetes, alterações da tireoide ou outras condições metabólicas."
    },
    {
      "ordem": 2,
      "sistema": "Sistema Fúngico",
      "nota": "5,8",
      "posicao": "segunda área para aprofundar",
      "o_que_apareceu": "Vontade forte de doce ou pão quase todos os dias; barriga inchada ou gases depois das refeições; relato de camada esbranquiçada na língua.",
      "o_que_observar": "Em que situações a vontade de doce ou pão aparece; depois de quais refeições surgem gases e inchaço.",
      "como_cuidar": "Este eixo concentrou mais marcadores nesta aplicação e merece ser aprofundado no contexto da alimentação, rotina e sinais relatados. Não diagnostica candidíase, infecção fúngica, disbiose ou qualquer outra doença."
    }
  ],
  "ferramentas_ja_aplicadas": [
    { "ferramenta": "Mapa da Rotina", "situacao": "concluida", "o_que_esclareceu": "Localizou a dificuldade no fim da jornada (16h–18h), mostrou as reuniões da tarde e revelou um espaço viável de mudança: preparar o lanche na noite anterior." }
  ],
  "ferramentas_recomendadas": [
    {
      "ordem": 1, "papel": "principal", "regra_id": "REC-MET-02", "ferramenta": "Gatilhos & Respostas", "territorio": "Mente", "sistema": "Sistema Metabólico",
      "por_que": "Ajuda a aprofundar comportamentos alimentares recorrentes dentro das situações em que acontecem. REC-MET-01 (Mapa da Rotina) já foi concluída neste atendimento.",
      "como_aplicar": "Escolha episódios concretos e observe o que acontece antes, durante e depois do comportamento. Comece por um episódio de comer depois do jantar sem fome.",
      "o_que_procurar": "Situação, pensamento, emoção e consequência percebida antes de comer sem fome; repetição do padrão em dias diferentes.",
      "status": "SUGERIDO"
    },
    {
      "ordem": 2, "papel": "complementar", "regra_id": "REC-FUN-03", "ferramenta": "Mapa de Crenças Alimentares", "territorio": "Mente", "sistema": "Sistema Fúngico",
      "por_que": "Permite investigar ideias e regras sobre alimentação que podem estar influenciando escolhas. REC-FUN-01 (Mapa da Rotina) já concluída; REC-FUN-02 (Gatilhos & Respostas) já escolhida como principal.",
      "como_aplicar": "Identifique uma crença relevante, sua origem percebida, as situações em que aparece e seu impacto relatado.",
      "o_que_procurar": "Ideias ligadas à vontade de doce ou pão (recompensa, cansaço, merecimento) e onde elas aparecem no dia.",
      "status": "SUGERIDO"
    },
    {
      "ordem": 3, "papel": "complementar", "regra_id": "REC-MET-04", "ferramenta": "Linha do Momentum", "territorio": "Corpo", "sistema": "Sistema Metabólico",
      "por_que": "Ajuda a avaliar a capacidade atual de sustentar mudanças antes de aumentar a exigência. REC-MET-03 (Mapa de Crenças Alimentares) já escolhida como complementar.",
      "como_aplicar": "Avalie as seis dimensões do Momentum e registre o estado escolhido pela profissional.",
      "o_que_procurar": "Quanto espaço existe para acrescentar uma segunda estratégia depois do lanche da tarde.",
      "status": "SUGERIDO"
    }
  ],
  "direcionamentos": [
    {
      "id": "D1", "origem": "existente", "titulo": "Organizar o fim da tarde", "territorio": "Corpo", "sistema": "Sistema Metabólico",
      "por_que": "O fim da tarde concentra fome forte e queda de disposição, e já existe uma ação viável identificada.",
      "objetivo": "Chegar ao fim da jornada com fome mais administrável e mais disposição.",
      "baseado_em": ["Resultado HOLOS: foco e direcionamento registrados", "HOLOSCAN: Metabólico como primeira área (2,4)", "Mapa da Rotina: 16h–18h"],
      "catalogo": "CANDIDATO NÃO CATALOGADO — requer validação profissional",
      "status": "SUGERIDO"
    },
    {
      "id": "D2", "origem": "nova", "titulo": "Compreender os momentos de comer sem fome e de vontade de doce ou pão", "territorio": "Mente", "sistema": "Sistema Fúngico",
      "por_que": "Comer depois do jantar sem fome e vontade forte de doce ou pão aparecem como comportamentos recorrentes ainda não aprofundados.",
      "objetivo": "Identificar em quais situações esses comportamentos aparecem, antes de propor mudanças neles.",
      "baseado_em": ["HOLOSCAN: sinais do Metabólico e do Fúngico", "Catálogo PP-V1: REC-MET-02 e REC-FUN-03"],
      "catalogo": "CANDIDATO NÃO CATALOGADO — requer validação profissional",
      "status": "SUGERIDO"
    }
  ],
  "estrategias": [
    {
      "id": "E1", "origem": "acordada", "titulo": "Lanche planejado antes da fome forte", "territorio": "Corpo", "direcionamento_id": "D1",
      "classificacao": "comportamental_metodologica",
      "decisao_sugerida": "MANTER EM OBSERVAÇÃO — SUGERIDO",
      "motivo_decisao": "Estratégia criada neste encontro; ainda não há dado de aplicação para avaliar resposta.",
      "o_que_fazer": "Preparar o lanche na noite anterior e comer por volta das 16h.",
      "o_que_observar": "Intensidade da fome e disposição entre 16h e 18h.",
      "prazo": "Até o retorno (cerca de 2 semanas)",
      "criterio_sucesso": "Conseguir aplicar na maior parte dos dias de trabalho e perceber fome mais administrável às 18h.",
      "baseado_em": ["Resultado HOLOS: estratégia acordada", "Mapa da Rotina: espaço de mudança na noite anterior"],
      "catalogo": "CANDIDATA NÃO CATALOGADA — requer validação profissional",
      "status": "SUGERIDO"
    },
    {
      "id": "E2", "origem": "nova", "titulo": "Plano B para dias de reunião às 16h", "territorio": "Corpo", "direcionamento_id": "D1",
      "classificacao": "comportamental_metodologica",
      "decisao_sugerida": null,
      "motivo_decisao": null,
      "o_que_fazer": "Combinar um horário alternativo (antes ou logo depois da reunião) para os dias em que 16h estiver ocupado.",
      "o_que_observar": "Em quantos dias a reunião impediu o lanche e se o horário alternativo funcionou.",
      "prazo": "Até o retorno",
      "criterio_sucesso": "A reunião deixar de ser o motivo de pular o lanche.",
      "baseado_em": ["Mapa da Rotina: reuniões à tarde"],
      "catalogo": "CANDIDATA NÃO CATALOGADA — requer validação profissional",
      "status": "SUGERIDO"
    },
    {
      "id": "E3", "origem": "nova", "titulo": "Registro rápido de fome e disposição às 16h e às 18h", "territorio": "Corpo", "direcionamento_id": "D1",
      "classificacao": "observacao",
      "decisao_sugerida": null,
      "motivo_decisao": null,
      "o_que_fazer": "Anotar de 0 a 10 a fome e a disposição às 16h e às 18h e marcar se comeu o lanche.",
      "o_que_observar": "Diferença entre dias com e sem o lanche.",
      "prazo": "Até o retorno",
      "criterio_sucesso": "Ter registros suficientes para comparar no retorno.",
      "baseado_em": ["Resultado HOLOS: o que observar definido"],
      "catalogo": "CANDIDATA NÃO CATALOGADA — requer validação profissional",
      "status": "SUGERIDO"
    },
    {
      "id": "E4", "origem": "nova", "titulo": "Composição do lanche da tarde", "territorio": "Corpo", "direcionamento_id": "D1",
      "classificacao": "requer_decisao_profissional_na_conduta",
      "decisao_sugerida": null,
      "motivo_decisao": null,
      "o_que_fazer": "Definir na Conduta o que compõe o lanche. A HOLOS AI não sugere alimentos, quantidades nem substituições.",
      "o_que_observar": "Sem dado (depende da decisão profissional).",
      "prazo": "Na Conduta deste atendimento",
      "criterio_sucesso": "Composição registrada pela nutricionista na Conduta.",
      "baseado_em": ["Resultado HOLOS: estratégia acordada sem composição definida"],
      "catalogo": "CANDIDATA NÃO CATALOGADA — requer validação profissional",
      "status": "SUGERIDO"
    },
    {
      "id": "E5", "origem": "nova", "titulo": "Anotar um episódio por semana de comer depois do jantar sem fome", "territorio": "Mente", "direcionamento_id": "D2",
      "classificacao": "observacao",
      "decisao_sugerida": null,
      "motivo_decisao": null,
      "o_que_fazer": "Quando acontecer, anotar o que estava fazendo, o que pensou ou sentiu antes e como ficou depois. Sem tentar mudar nada ainda.",
      "o_que_observar": "Situações que se repetem antes do episódio.",
      "prazo": "Até o retorno",
      "criterio_sucesso": "Trazer pelo menos um episódio descrito para aplicar o Gatilhos & Respostas na consulta.",
      "baseado_em": ["HOLOSCAN: comer depois do jantar sem fome", "Catálogo PP-V1: REC-MET-02"],
      "catalogo": "CANDIDATA NÃO CATALOGADA — requer validação profissional",
      "status": "SUGERIDO"
    }
  ],
  "corpo": {
    "situacao": "com_material",
    "resumo": "Lanche planejado por volta das 16h, com plano B para dias de reunião e registro simples de fome e disposição. A composição do lanche fica com a Conduta.",
    "estrategias": ["E1", "E2", "E3", "E4"]
  },
  "mente": {
    "situacao": "nao_aprofundado",
    "resumo": "Ainda não aprofundado nesta etapa. Há relatos do HOLOSCAN para observar (comer depois do jantar sem fome, vontade de doce ou pão), que preparam o Gatilhos & Respostas.",
    "estrategias": ["E5"]
  },
  "espirito": {
    "situacao": "nao_aprofundado",
    "resumo": "Ainda não aprofundado nesta etapa.",
    "estrategias": []
  },
  "o_que_observar": [
    "Fome e disposição entre 16h e 18h",
    "Dias em que a reunião impediu o lanche",
    "Episódios de comer depois do jantar sem fome",
    "Momentos de vontade de doce ou pão",
    "Gases ou inchaço e depois de quais refeições"
  ],
  "plano_acompanhamento": [
    "Registro de 0 a 10 de fome e disposição às 16h e às 18h, marcando se comeu o lanche",
    "Um episódio por semana de comer depois do jantar sem fome, descrito em poucas linhas",
    "Anotar quando a reunião atrapalhou o horário do lanche"
  ],
  "roteiro_proxima_consulta": [
    { "tipo": "ferramenta", "texto": "Aplicar Gatilhos & Respostas (REC-MET-02) com um episódio trazido pela paciente; se houver tempo, Mapa de Crenças Alimentares (REC-FUN-03)." },
    { "tipo": "pergunta", "texto": "Em quantos dias conseguiu fazer o lanche por volta das 16h?" },
    { "tipo": "pergunta", "texto": "O que facilitou e o que dificultou (reuniões, preparo na noite anterior)?" },
    { "tipo": "pergunta", "texto": "Como ficaram a fome e a disposição entre 16h e 18h nos dias com e sem lanche?" },
    { "tipo": "pergunta", "texto": "O que aconteceu antes dos episódios de comer depois do jantar sem fome?" },
    { "tipo": "criterio_decisao", "estrategia_id": "E1", "texto": "MANTER: aplicou na maioria dos dias e percebeu melhora na fome ou na disposição." },
    { "tipo": "criterio_decisao", "estrategia_id": "E1", "texto": "AJUSTAR: a ideia funciona, mas o horário ou o preparo não couberam (usar o plano B ou mudar o horário)." },
    { "tipo": "criterio_decisao", "estrategia_id": "E1", "texto": "SUBSTITUIR: não coube na rotina mesmo depois de ajustar as barreiras." },
    { "tipo": "criterio_decisao", "estrategia_id": "E1", "texto": "CONCLUIR: o fim da tarde deixou de ser dificuldade e não precisa mais de ação ativa." },
    { "tipo": "criterio_decisao", "estrategia_id": "E1", "texto": "ENCERRAR: decisão profissional de retirar a estratégia nesta etapa." }
  ],
  "proxima_etapa": "Retorno em cerca de 2 semanas: rever os registros, decidir sobre o lanche da tarde e aplicar o Gatilhos & Respostas.",
  "rascunho_paciente": "Nesta fase, nosso foco é organizar o fim da tarde. Até o nosso próximo encontro, a combinação é preparar o lanche na noite anterior e comer por volta das 16h. Nos dias de reunião, use o horário alternativo que combinamos. Anote, de 0 a 10, sua fome e sua disposição às 16h e às 18h. E, se acontecer de comer depois do jantar sem fome, escreva em poucas linhas o que estava acontecendo antes. Isso vai nos ajudar a dar o próximo passo.",
  "alertas_profissionais": [
    { "tipo": "metodologico", "texto": "Metabólico 2,4 e Fúngico 5,8 organizam respostas do HOLOSCAN; não são diagnóstico." },
    { "tipo": "avaliacao_profissional", "texto": "A língua esbranquiçada, os gases e o inchaço não foram interpretados; se persistirem ou incomodarem, requerem avaliação profissional." },
    { "tipo": "conduta", "texto": "A composição do lanche e qualquer mudança alimentar específica requerem decisão profissional na Conduta." },
    { "tipo": "catalogo", "texto": "Direcionamentos e estratégias ainda não têm catálogo homologado: validar antes de usar." },
    { "tipo": "informacao_insuficiente", "texto": "Sem evolução registrada: ainda não é possível avaliar a resposta à estratégia." },
    { "tipo": "informacao_insuficiente", "texto": "Mente e Espírito não foram aprofundados nesta etapa." }
  ],
  "fontes_utilizadas": [
    "Resultado HOLOS da Paciente Teste T5 Fictícia (foco, direcionamento, estratégia, HOLOSCAN, Mapa da Rotina)",
    "02-SISTEMAS-E-FERRAMENTAS: textos oficiais do Metabólico e do Fúngico (v7)",
    "05-CATALOGO-FERRAMENTAS-PP-V1: REC-MET-02, REC-FUN-03, REC-MET-04"
  ]
}
$J$),
  ('holo_antes', (select coalesce(md5(string_agg(s.application_id::text || s.sistema || coalesce(s.nota::text, '') || coalesce(s.faixa, ''), ',' order by s.application_id, s.sistema)), '') from public.holoscan_system_scores s)),
  ('rh_antes', (select coalesce(md5(string_agg(id::text || coalesce(content_hash, '') || status, ',' order by id)), '') from public.holos_results)),
  ('em_antes', (select coalesce(md5(string_agg(id::text || content_hash, ',' order by id)), '') from public.holos_result_emissions));

insert into _logha (passo) select 'HA00 ' || case when
    (select relrowsecurity from pg_class where oid = 'public.holos_ai_imports'::regclass)
    and (select relrowsecurity from pg_class where oid = 'public.holos_ai_import_items'::regclass)
    and not has_table_privilege('authenticated', 'public.holos_ai_imports', 'insert') and not has_table_privilege('authenticated', 'public.holos_ai_imports', 'update')
    and not has_table_privilege('authenticated', 'public.holos_ai_import_items', 'update') and not has_table_privilege('authenticated', 'public.holos_ai_import_items', 'delete')
    and has_table_privilege('authenticated', 'public.holos_ai_imports', 'select') and not has_table_privilege('anon', 'public.holos_ai_imports', 'select')
    and not has_function_privilege('authenticated', 'public.holos_ai_problemas(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.holos_ai_extrair(text)', 'execute')
    and has_function_privilege('authenticated', 'public.importar_holos_ai(uuid, text, uuid)', 'execute')
    and not has_function_privilege('anon', 'public.importar_holos_ai(uuid, text, uuid)', 'execute')
    and not has_function_privilege('anon', 'public.revisar_item_holos_ai(uuid, text, jsonb, boolean)', 'execute')
  then 'ok' else 'FALHOU' end || ': RLS ligada; sem escrita direta; validacao e extracao internas; RPCs so para authenticated';

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare uid uuid := auth.uid(); v6 uuid := (select v::uuid from _pv7 where k = 'v7'); p uuid; p2 uuid; e1 uuid; e9 uuid; h uuid; j jsonb := (select v::jsonb from _ha where k = 'json');
  t text; antes int; r jsonb; ruim jsonb; colado text;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'HA PACIENTE FICTICIA') returning id into p;
  insert into public.patients (nutritionist_id, nome) values (uid, 'HA OUTRA FICTICIA') returning id into p2;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now()) returning id into e1;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p2, now()) returning id into e9;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(v6, p, e1, current_date));
  insert into _ha values ('p', p::text), ('p2', p2::text), ('e1', e1::text), ('e9', e9::text), ('h', h::text);
  antes := (select count(*) from public.holos_ai_imports);

  t := pg_temp.ha_tenta(format('select public.importar_holos_ai(%L::uuid, %L)::text', e1, '{"schema_version": 1, "tipo": '));
  insert into _logha (passo) select 'HA01 ' || case when t = 'json_invalido' and (select count(*) from public.holos_ai_imports) = antes
    and pg_temp.ha_tenta(format('select public.importar_holos_ai(%L::uuid, %L)::text', e1, '[1, 2]')) = 'json_invalido'
    then 'ok' else 'FALHOU: ' || t end || ': JSON invalido (cortado / nao objeto) recusado; nada salvo';

  t := pg_temp.ha_tenta(format('select public.importar_holos_ai(%L::uuid, %L)::text', e1, (j || '{"schema_version": 2}')::text));
  insert into _logha (passo) select 'HA02 ' || case when t = 'schema_incompativel' and (select count(*) from public.holos_ai_imports) = antes
    then 'ok' else 'FALHOU: ' || t end || ': schema_version 2 recusado (schema_incompativel); nada salvo';

  ruim := jsonb_set(j, '{estrategias,0,decisao_sugerida}', '"MANTER"');
  ruim := jsonb_set(ruim, '{ferramentas_recomendadas}', (ruim->'ferramentas_recomendadas') || jsonb_build_array(ruim#>'{ferramentas_recomendadas,0}'));
  t := pg_temp.ha_tenta(format('select public.importar_holos_ai(%L::uuid, %L)::text', e1, ruim::text));
  insert into _logha (passo) select 'HA03 ' || case when t = 'resultado_invalido' and (select count(*) from public.holos_ai_imports) = antes
    and (select count(*) from public.holos_ai_import_items where patient_id = p) = 0
    and pg_temp.ha_tenta(format('select public.importar_holos_ai(%L::uuid, %L)::text', e1, (j - 'espirito')::text)) = 'resultado_invalido'
    then 'ok' else 'FALHOU: ' || t end || ': estrutura invalida (MANTER na 1a consulta, 4 ferramentas, chave faltando) recusada; nada salvo (nem parcial)';

  colado := 'Aqui esta a analise.' || chr(10) || '=== HOLOS_AI_RESULT ===' || chr(10) || 'TIPO: primeira_consulta' || chr(10) || '=== FIM_HOLOS_AI_RESULT ===' || chr(10)
    || '```json' || chr(10) || (select v from _ha where k = 'json') || chr(10) || '```' || chr(10) || 'Tudo acima e SUGERIDO.';
  r := public.importar_holos_ai(e1, colado, 'a0000000-0000-4000-8000-0000000000a1'::uuid);
  insert into _ha values ('i1', r->>'id'), ('colado', colado);
  insert into _logha (passo) select 'HA04 ' || case when (r->>'versao')::int = 1 and (r->>'itens')::int = 62
    and (select status = 'importado' and schema_version = 1 and tipo = 'primeira_consulta' and texto_original = colado and json_original = j
           and texto_sha256 = encode(sha256(convert_to(colado, 'UTF8')), 'hex') and agente = 'HOLOS-AI-GPT 1.2' and encounter_id = e1 and patient_id = p
         from public.holos_ai_imports where id = (r->>'id')::uuid)
    and (select count(*) from public.holos_ai_import_items where import_id = (r->>'id')::uuid and so_profissional) = 41
    and (select count(distinct secao) from public.holos_ai_import_items where import_id = (r->>'id')::uuid) = 20
    and (select valor_ia from public.holos_ai_import_items where import_id = (r->>'id')::uuid and secao = 'estrategias' and chave = 'E1') = j#>'{estrategias,0}'
    and (select count(*) from public.holos_ai_import_items where import_id = (r->>'id')::uuid and estado = 'sugerido' and not compartilhar) = 62
    then 'ok' else 'FALHOU: ' || r::text end || ': resposta inteira do GPT colada -> versao 1; texto, JSON, sha256, agente e atendimento guardados; 62 itens separados (20 secoes), 41 so profissionais, todos SUGESTAO';

  t := pg_temp.ha_tenta(format('update public.holos_ai_imports set status = %L where id = %L', 'confirmado', r->>'id'));
  insert into _logha (passo) select 'HA05a ' || case when t like '42501:%' and pg_temp.ha_tenta(format('update public.holos_ai_import_items set estado = %L where import_id = %L', 'confirmado', r->>'id')) like '42501:%'
    then 'ok' else 'FALHOU: ' || t end || ': a nutricionista nao grava direto (so pelas RPCs)';

  r := public.importar_holos_ai(e1, (select v from _ha where k = 'json'), 'a0000000-0000-4000-8000-0000000000a2'::uuid);
  insert into _ha values ('i2', r->>'id');
  insert into _logha (passo) select 'HA06 ' || case when (r->>'versao')::int = 2
    and (select texto_original from public.holos_ai_imports where id = (select v::uuid from _ha where k = 'i1')) = (select v from _ha where k = 'colado')
    and (select status from public.holos_ai_imports where id = (select v::uuid from _ha where k = 'i1')) = 'importado'
    and (select count(*) from public.holos_ai_imports where encounter_id = e1) = 2
    then 'ok' else 'FALHOU: ' || r::text end || ': nova importacao no mesmo atendimento vira versao 2; a versao 1 continua identica (nada sobrescrito)';
  r := public.importar_holos_ai(e1, 'qualquer coisa', 'a0000000-0000-4000-8000-0000000000a2'::uuid);
  insert into _logha (passo) select 'HA07 ' || case when r->>'id' = (select v from _ha where k = 'i2') and (r->>'repetida')::boolean
    and (select count(*) from public.holos_ai_imports where encounter_id = e1) = 2
    then 'ok' else 'FALHOU: ' || r::text end || ': mesmo operation_id devolve a mesma importacao (clique duplo nao duplica)';
end $$;

reset role;
insert into _logha (passo) select 'HA05b ' || case when
    pg_temp.ha_tenta(format('update public.holos_ai_imports set json_original = ''{}'' where id = %L', (select v from _ha where k = 'i1'))) = 'holos_ai_imutavel'
    and pg_temp.ha_tenta(format('update public.holos_ai_imports set texto_original = ''x'' where id = %L', (select v from _ha where k = 'i1'))) = 'holos_ai_imutavel'
    and pg_temp.ha_tenta(format('update public.holos_ai_import_items set valor_ia = ''"x"'' where import_id = %L and secao = ''sintese_integrada''', (select v from _ha where k = 'i1'))) = 'holos_ai_imutavel'
    and pg_temp.ha_tenta(format('delete from public.holos_ai_imports where id = %L', (select v from _ha where k = 'i1'))) = 'holos_ai_imutavel'
    and pg_temp.ha_tenta(format('delete from public.holos_ai_import_items where import_id = %L', (select v from _ha where k = 'i1'))) = 'holos_ai_imutavel'
    and pg_temp.ha_tenta(format('update public.holos_ai_imports set status = ''importado'' where id = %L returning status', (select v from _ha where k = 'i1'))) = 'ACEITO:importado'
  then 'ok' else 'FALHOU' end || ': JSON/texto originais, valor da IA e apagar recusados mesmo para o dono do banco (holos_ai_imutavel)';

-- HA08 revisao
select pg_temp.como_daniel();
set local role authenticated;
do $$
declare i1 uuid := (select v::uuid from _ha where k = 'i1'); e1 uuid; d1 uuid; s1 uuid; hip uuid; r jsonb; t text; x record;
begin
  select id into e1 from public.holos_ai_import_items where import_id = i1 and secao = 'estrategias' and chave = 'E1';
  select id into d1 from public.holos_ai_import_items where import_id = i1 and secao = 'direcionamentos' and chave = 'D1';
  select id into s1 from public.holos_ai_import_items where import_id = i1 and secao = 'sintese_integrada';
  select id into hip from public.holos_ai_import_items where import_id = i1 and secao = 'pontos_para_aprofundar' and valor_ia->>'tipo' = 'hipotese' order by ordem limit 1;
  insert into _ha values ('it_e1', e1::text), ('it_d1', d1::text), ('it_s1', s1::text), ('it_hip', hip::text);
  r := public.revisar_item_holos_ai(e1, 'editado', '{"o_que_fazer": "Preparar o lanche na noite anterior e comer entre 15h30 e 16h (EDITADO PELA NUTRI)."}'::jsonb, true);
  insert into _logha (passo) select 'HA08a ' || case when r->>'estado' = 'editado' and (r->'compartilhar')::boolean
    and r#>>'{valor_profissional,o_que_fazer}' like '%EDITADO PELA NUTRI%' and r#>>'{valor_ia,o_que_fazer}' not like '%EDITADO%'
    and r#>>'{valor_profissional,titulo}' = r#>>'{valor_ia,titulo}'
    and (select status from public.holos_ai_imports where id = i1) = 'em_revisao'
    then 'ok' else 'FALHOU: ' || r::text end || ': editar estrategia guarda o valor da IA E o editado; compartilhada; importacao passa a EM REVISAO';
  t := pg_temp.ha_tenta(format('select public.revisar_item_holos_ai(%L::uuid, ''editado'', %L::jsonb)::text', e1, '{"classificacao": "observacao"}'));
  insert into _logha (passo) select 'HA08b ' || case when t = 'holos_ai_edicao_invalida'
    and pg_temp.ha_tenta(format('select public.revisar_item_holos_ai(%L::uuid, ''editado'', %L::jsonb)::text', e1, '{"titulo": "  "}')) = 'holos_ai_edicao_invalida'
    then 'ok' else 'FALHOU: ' || t end || ': edicao so troca texto (classificacao/decisao/IDs nao); titulo vazio recusado';
  t := pg_temp.ha_tenta(format('select public.revisar_item_holos_ai(%L::uuid, ''confirmado'', null, true)::text', hip));
  insert into _logha (passo) select 'HA08c ' || case when t = 'holos_ai_so_profissional'
    and pg_temp.ha_tenta(format('select public.revisar_item_holos_ai(%L::uuid, ''confirmado'', null, true)::text', s1)) = 'holos_ai_so_profissional'
    and pg_temp.ha_tenta(format('select public.revisar_item_holos_ai(%L::uuid, ''descartado'', null, true)::text', d1)) = 'holos_ai_so_profissional'
    then 'ok' else 'FALHOU: ' || t end || ': hipotese e sintese (so profissionais) nao podem ir para a paciente; descartado nao se compartilha';
  perform public.revisar_item_holos_ai(d1, 'confirmado', null, true);
  perform public.revisar_item_holos_ai(s1, 'editado', '"Sintese revisada pela nutricionista (EDITADA)."'::jsonb, false);
  -- descartar: E2 (plano B), o padrao 0 e o espirito; o resto da estrategia E3 confirmada SEM compartilhar
  for x in select id, secao, chave, ordem from public.holos_ai_import_items where import_id = i1 and estado = 'sugerido' order by secao, ordem loop
    if (x.secao = 'estrategias' and x.chave = 'E2') or (x.secao = 'padroes_observados' and x.ordem = 0) or x.secao = 'espirito' then
      perform public.revisar_item_holos_ai(x.id, 'descartado');
      if x.secao = 'estrategias' then insert into _ha values ('it_e2', x.id::text); end if;
    elsif x.secao = 'estrategias' and x.chave = 'E3' then
      perform public.revisar_item_holos_ai(x.id, 'confirmado', null, false);
      insert into _ha values ('it_e3', x.id::text);
    elsif x.secao = 'pontos_para_aprofundar' and x.id = hip then
      perform public.revisar_item_holos_ai(x.id, 'confirmado');
    end if;
  end loop;
  t := pg_temp.ha_tenta(format('select public.concluir_revisao_holos_ai(%L::uuid)::text', i1));
  insert into _logha (passo) select 'HA09a ' || case when t = 'holos_ai_revisao_incompleta' and (select status from public.holos_ai_imports where id = i1) = 'em_revisao'
    then 'ok' else 'FALHOU: ' || t end || ': concluir com item ainda SUGERIDO e recusado (revisao_incompleta)';
  for x in select id, so_profissional from public.holos_ai_import_items where import_id = i1 and estado = 'sugerido' loop
    perform public.revisar_item_holos_ai(x.id, 'confirmado', null, not x.so_profissional);
  end loop;
  r := public.concluir_revisao_holos_ai(i1);
  insert into _logha (passo) select 'HA09b ' || case when r->>'status' = 'confirmado' and (select status = 'confirmado' and concluida_em is not null from public.holos_ai_imports where id = i1)
    and pg_temp.ha_tenta(format('select public.revisar_item_holos_ai(%L::uuid, ''descartado'')::text', e1)) = 'holos_ai_revisao_encerrada'
    and pg_temp.ha_tenta(format('select public.descartar_importacao_holos_ai(%L::uuid)::text', i1)) = 'holos_ai_revisao_encerrada'
    then 'ok' else 'FALHOU: ' || r::text end || ': tudo decidido -> CONFIRMADO; depois disso nenhum item muda e a importacao nao e descartada';
end $$;

-- HA10 / HA11 Resultado HOLOS
do $$
declare i1 uuid := (select v::uuid from _ha where k = 'i1'); i2 uuid := (select v::uuid from _ha where k = 'i2'); p uuid := (select v::uuid from _ha where k = 'p');
  e1 uuid := (select v::uuid from _ha where k = 'e1'); h uuid := (select v::uuid from _ha where k = 'h');
  base jsonb; d jsonb; t text; ie1 jsonb; ie2 jsonb; id1 jsonb; ihip jsonb; ie3 jsonb; i2e1 uuid; r1 uuid; snap jsonb; dp jsonb; em jsonb; s jsonb;
  ref_de text := '{"tipo":"holos_ai","id":"%s","campo":"%s"}';
begin
  base := jsonb_build_object('patient_id', p, 'encounter_id', e1, 'holoscan_application_id', h, 'tool_application_ids', '[]'::jsonb,
    'visao_paciente', jsonb_build_object('ferramentas', '{}'::jsonb, 'proximos_passos', false));
  select id into i2e1 from public.holos_ai_import_items where import_id = i2 and secao = 'estrategias' and chave = 'E1';
  ie1 := jsonb_build_object('id', 'hai-e1', 'texto', 'Lanche planejado antes da fome forte', 'texto_sugerido', 'Lanche planejado antes da fome forte', 'origem', 'holos_ai',
    'ref', format(ref_de, i1, (select v from _ha where k = 'it_e1'))::jsonb, 'sugestao', true, 'confirmado', true, 'mostrar_paciente', true, 'descartado', false,
    'acao', 'Preparar o lanche na noite anterior e comer entre 15h30 e 16h (EDITADO PELA NUTRI).', 'direcionamento_id', 'hai-d1', 'status', 'acordada');
  ie2 := jsonb_build_object('id', 'hai-e2', 'texto', 'Plano B para dias de reuniao', 'origem', 'holos_ai',
    'ref', format(ref_de, i1, (select v from _ha where k = 'it_e2'))::jsonb, 'sugestao', true, 'confirmado', true, 'mostrar_paciente', true, 'status', 'proposta');
  ie3 := jsonb_build_object('id', 'hai-e3', 'texto', 'REGISTRO_NAO_COMPARTILHADO', 'origem', 'holos_ai',
    'ref', format(ref_de, i1, (select v from _ha where k = 'it_e3'))::jsonb, 'sugestao', true, 'confirmado', true, 'mostrar_paciente', false, 'status', 'proposta');
  id1 := jsonb_build_object('id', 'hai-d1', 'texto', 'Organizar o fim da tarde', 'origem', 'holos_ai', 'territorio', 'corpo', 'status', 'proposto',
    'ref', format(ref_de, i1, (select v from _ha where k = 'it_d1'))::jsonb, 'sugestao', true, 'confirmado', true, 'mostrar_paciente', true);
  ihip := jsonb_build_object('texto', 'HIPOTESE_HOLOS_AI', 'origem', 'holos_ai', 'tipo', 'hipotese',
    'ref', format(ref_de, i1, (select v from _ha where k = 'it_hip'))::jsonb, 'sugestao', true, 'confirmado', true, 'mostrar_paciente', true);

  -- item DESCARTADO entra confirmado -> recusado
  d := jsonb_build_object('schema_version', 1, 'tipo', 'primeira', 'estrategias', jsonb_build_array(ie2));
  t := pg_temp.ha_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao', d))::text));
  insert into _logha (passo) select 'HA10a ' || case when t = 'holos_ai_item_nao_aceito' then 'ok' else 'FALHOU: ' || t end || ': item DESCARTADO na revisao nao entra confirmado no Resultado';
  -- so profissional para a paciente -> recusado
  d := jsonb_build_object('schema_version', 1, 'tipo', 'primeira', 'padroes', jsonb_build_array(ihip));
  t := pg_temp.ha_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao', d))::text));
  insert into _logha (passo) select 'HA10b ' || case when t = 'holos_ai_so_profissional' then 'ok' else 'FALHOU: ' || t end || ': hipotese da HOLOS AI marcada para a paciente e recusada (holos_ai_so_profissional)';
  -- importacao ainda nao concluida (versao 2)
  d := jsonb_build_object('schema_version', 1, 'tipo', 'primeira', 'estrategias', jsonb_build_array(jsonb_set(ie1, '{ref}', format(ref_de, i2, i2e1)::jsonb)));
  t := pg_temp.ha_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao', d))::text));
  insert into _logha (passo) select 'HA10c ' || case when t = 'holos_ai_nao_concluida' then 'ok' else 'FALHOU: ' || t end || ': item de importacao ainda em revisao nao entra no Resultado';
  -- origem holos_ai sem ref / ref holos_ai com origem errada / item de outra importacao (campo trocado)
  t := pg_temp.ha_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao',
    jsonb_build_object('schema_version', 1, 'estrategias', jsonb_build_array(ie1 - 'ref' - 'sugestao')))) ::text));
  insert into _logha (passo) select 'HA10d ' || case when t = 'direcao_invalida'
    and pg_temp.ha_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao',
          jsonb_build_object('schema_version', 1, 'estrategias', jsonb_build_array(ie1 || '{"origem":"conduta"}'))))::text)) = 'direcao_invalida'
    and pg_temp.ha_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao',
          jsonb_build_object('schema_version', 1, 'estrategias', jsonb_build_array(jsonb_set(ie1, '{ref,campo}', to_jsonb(i2e1::text)))))) ::text)) = 'referencia_cruzada'
    then 'ok' else 'FALHOU: ' || t end || ': item da HOLOS AI sem a referencia ao item importado, com origem trocada ou apontando item de outra importacao e recusado';

  -- HA11: Resultado finalizado com o que foi aceito
  d := jsonb_build_object('schema_version', 1, 'tipo', 'primeira',
    'foco_atual', jsonb_build_object('texto', 'Organizar o fim da tarde', 'origem', 'holos_ai', 'ref', id1->'ref', 'sugestao', true, 'confirmado', true, 'mostrar_paciente', true),
    'direcionamentos', jsonb_build_array(id1), 'estrategias', jsonb_build_array(ie1, ie3));
  t := pg_temp.ha_tenta(format('select public.salvar_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao', d, 'leitura_profissional', 'Sintese revisada pela nutricionista (EDITADA).'))::text));
  if t not like 'ACEITO:%' then raise exception 'HA11 salvar falhou: %', t; end if;
  r1 := substr(t, 8)::uuid;
  select content_snapshot into snap from public.holos_results where id = r1;
  dp := snap->'direcao_paciente';
  em := public.emitir_resultado_final(jsonb_build_object('holos_result_id', r1));
  select content_snapshot into s from public.holos_result_emissions where id = (em->>'id')::uuid;
  insert into _ha values ('r1', r1::text);
  insert into _logha (passo) select 'HA11a ' || case when (snap->>'template_version')::int = 5 and dp#>>'{foco_atual,texto}' = 'Organizar o fim da tarde'
      and jsonb_array_length(dp->'estrategias') = 1 and dp#>>'{estrategias,0,acao}' like '%EDITADO PELA NUTRI%'
      and jsonb_array_length(dp->'direcionamentos') = 1 and dp#>>'{direcionamentos,0,origem}' = 'holos_ai'
    then 'ok' else 'FALHOU: ' || dp::text end || ': Resultado finalizado: foco, direcionamento e estrategia aceitos e compartilhados vao para a paciente, com o texto EDITADO';
  insert into _logha (passo) select 'HA11b ' || case when dp::text not like '%REGISTRO_NAO_COMPARTILHADO%' and s::text not like '%REGISTRO_NAO_COMPARTILHADO%'
      and s::text not like '%Plano B%' and s::text not like '%HIPOTESE%' and s::text not like '%Sintese revisada%'
      and (snap->'direcao')::text like '%REGISTRO_NAO_COMPARTILHADO%' and not (dp#>'{estrategias,0}' ? 'ref')
      and s->>'template' = 'RF-3' and s#>>'{direcao_paciente,estrategias,0,acao}' like '%EDITADO PELA NUTRI%'
    then 'ok' else 'FALHOU' end || ': emissao RF-3 (PDF/WhatsApp): sem o nao compartilhado, sem o descartado, sem hipotese, sem a leitura profissional; com a estrategia editada';
end $$;

-- HA12 outra nutricionista
select pg_temp.como_rodrigo();
insert into _logha (passo) select 'HA12 ' || case when (select count(*) from public.holos_ai_imports) = 0 and (select count(*) from public.holos_ai_import_items) = 0
    and pg_temp.ha_tenta(format('select public.revisar_item_holos_ai(%L::uuid, ''descartado'')::text', (select v from _ha where k = 'it_e1'))) = 'referencia_cruzada'
    and pg_temp.ha_tenta(format('select public.concluir_revisao_holos_ai(%L::uuid)::text', (select v from _ha where k = 'i2'))) = 'referencia_cruzada'
    and pg_temp.ha_tenta(format('select public.importar_holos_ai(%L::uuid, %L)::text', (select v from _ha where k = 'e1'), (select v from _ha where k = 'json'))) = 'atendimento_obrigatorio'
  then 'ok' else 'FALHOU' end || ': outra nutricionista nao le, nao revisa e nao importa em atendimento alheio';

-- HA13 descartar; anonimo
select pg_temp.como_daniel();
insert into _ha select 'desc', (public.descartar_importacao_holos_ai((select v::uuid from _ha where k = 'i2')))->>'status';
insert into _logha (passo) select 'HA13 ' || case when (select v from _ha where k = 'desc') = 'descartado'
    and (select status = 'descartado' and descartada_em is not null from public.holos_ai_imports where id = (select v::uuid from _ha where k = 'i2'))
    and (select count(*) from public.holos_ai_import_items where import_id = (select v::uuid from _ha where k = 'i2')) = 62
  then 'ok' else 'FALHOU' end || ': importacao descartada fica no historico (com os 62 itens), nada apagado';
reset role;
select pg_temp.sem_usuario();
set local role anon;
insert into _ha select 'anon', pg_temp.ha_tenta(format('select public.importar_holos_ai(%L::uuid, %L)::text', (select v from _ha where k = 'e1'), (select v from _ha where k = 'json')));
reset role;
insert into _logha (passo) select 'HA13b ' || case when (select v from _ha where k = 'anon') like '42501:%' then 'ok' else 'FALHOU: ' || (select v from _ha where k = 'anon') end || ': anonimo nao importa';

-- HA14 nao interferencia + direcao antiga
insert into _logha (passo) select 'HA14a ' || case when
    (select coalesce(md5(string_agg(s.application_id::text || s.sistema || coalesce(s.nota::text, '') || coalesce(s.faixa, ''), ',' order by s.application_id, s.sistema)), '')
       from public.holoscan_system_scores s join public.holoscan_applications a on a.id = s.application_id where a.patient_id <> (select v::uuid from _ha where k = 'p'))
    = (select v from _ha where k = 'holo_antes')
    and (select coalesce(md5(string_agg(id::text || coalesce(content_hash, '') || status, ',' order by id)), '') from public.holos_results where patient_id <> (select v::uuid from _ha where k = 'p'))
    = (select v from _ha where k = 'rh_antes')
    and (select coalesce(md5(string_agg(id::text || content_hash, ',' order by id)), '') from public.holos_result_emissions where patient_id <> (select v::uuid from _ha where k = 'p'))
    = (select v from _ha where k = 'em_antes')
  then 'ok' else 'FALHOU' end || ': HOLOSCAN, Resultados e emissoes ja existentes identicos (sem backfill, sem recalculo)';
select pg_temp.como_daniel();
set local role authenticated;
insert into _logha (passo) select 'HA14b ' || case when pg_temp.ha_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text',
      jsonb_build_object('patient_id', (select v from _ha where k = 'p'), 'encounter_id', (select v from _ha where k = 'e1'), 'holoscan_application_id', (select v from _ha where k = 'h'),
        'tool_application_ids', '[]'::jsonb, 'direcao', jsonb_build_object('schema_version', 1,
          'dores', jsonb_build_array(jsonb_build_object('texto', 'x', 'origem', 'conduta', 'sugestao', true, 'confirmado', false))))::text)) = 'direcao_invalida'
    and pg_temp.ha_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text',
      jsonb_build_object('patient_id', (select v from _ha where k = 'p'), 'encounter_id', (select v from _ha where k = 'e1'), 'holoscan_application_id', (select v from _ha where k = 'h'),
        'tool_application_ids', '[]'::jsonb, 'direcao', jsonb_build_object('schema_version', 1,
          'dores', jsonb_build_array(jsonb_build_object('texto', 'Relato antigo', 'origem', 'relato_paciente', 'confirmado', true, 'mostrar_paciente', true))))::text)) like 'ACEITO:%'
  then 'ok' else 'FALHOU' end || ': regras antigas da direcao valem iguais (sugestao sem referencia recusada; item sem HOLOS AI grava)';
reset role;

select passo from _logha order by n;
