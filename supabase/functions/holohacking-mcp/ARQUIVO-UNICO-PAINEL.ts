// @ts-nocheck
// GERADO por scripts/gerar-mcp-unico.mjs — NAO editar a mao (edite index.ts / nucleo.js / os modulos do app e gere de novo).
// Para colar no painel: Supabase > Edge Functions > Deploy a new function > Via Editor, nome "holohacking-mcp";
// depois, em Details, DESLIGUE "Enforce JWT Verification" (quem chama e o assistente de IA, com a chave pessoal).
/* holohacking-mcp — o servidor MCP do HoloHacking (Edge Function, Deno).

   Liga o nucleo (nucleo.js, testado em testes/testar-mcp-servidor.mjs contra o PostgreSQL com todas as migrations) ao banco
   de verdade pela conexao SUPABASE_DB_URL, que o Supabase injeta em toda Edge Function: nenhum segredo novo, nada no
   repositorio nem no navegador.

   Identidade: a chave pessoal hh_mcp_... (no caminho /holohacking-mcp/<chave> ou em Authorization: Bearer <chave>) e
   resolvida por public.mcp_identificar (so o servidor executa). Depois, CADA chamada roda numa transacao COMO a
   nutricionista: set local role authenticated + request.jwt.claims = { sub: <uid> } — o mesmo que o PostgREST faz.
   Valem o mesmo RLS, os mesmos gatilhos (conta ativa, paciente arquivado) e as mesmas RPCs do app.

   Publicar (o JWT do Supabase nao se aplica: quem chama e o assistente de IA, com a chave pessoal):
     node scripts/sincronizar-mcp-shared.mjs
     supabase functions deploy holohacking-mcp --no-verify-jwt --project-ref <projeto> */
import postgres from "npm:postgres@3.4.5";

// ---- shared/resultado-direcao.js (embutido) ----
/* ===========================================================================
   RESULTADO HOLOS — TEMPLATE 5: DIRECIONAMENTO + ESTRATEGIAS + ACOMPANHAMENTO
   ===========================================================================

   O Resultado HOLOS deixa de ser so a leitura do HOLOSCAN e passa a ser a
   DIRECAO do acompanhamento, em tres pilares:

     DIRECIONAMENTO              onde a paciente esta e para onde vamos
                                 (momento, o que pesa, o que quer construir,
                                 o que estamos compreendendo, FOCO ATUAL)
     ESTRATEGIAS                 como vamos caminhar (estrategias, Corpo /
                                 Mente / Espirito, o que combinamos)
     ACOMPANHAMENTO DA EVOLUCAO  como vamos acompanhar (o que ja esta mudando,
                                 o que permaneceu, observar, proxima etapa,
                                 e no retorno: o caminho ate aqui)

   O HOLOSCAN vai para o fim ("Detalhes do mapa").

   Dados: holos_results.direcao (schema_version 1, migration 20261021100000).
   Cada item: { id, texto, texto_sugerido, origem, ref:{tipo,id,campo},
   sugestao, confirmado, mostrar_paciente, descartado, tipo (so padroes) }.
   SUGESTAO DO SISTEMA -> CONFIRMADO PELA NUTRICIONISTA -> COMPARTILHADO COM A
   PACIENTE. Nada e pre-confirmado. HIPOTESE nunca vai para a paciente.

   A visao da paciente, o PDF e o WhatsApp leem SO a projecao montada pelo
   servidor (content_snapshot.direcao_paciente / emissao RF-3). Este modulo
   nao calcula nada do HOLOSCAN e nao gera acao: sugestao so CITA o que ja
   esta registrado (relato, ferramenta, HOLOSCAN, Conduta, acordo, Resultado
   anterior), sempre com origem e referencia.
   =========================================================================== */

(function (raiz) {
  "use strict";

  var esc = function (x) {
    return String(x === null || x === undefined ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  var VERSAO = 1;
  var LISTAS = ["momento", "dores", "desejos", "avancos", "permaneceu", "padroes", "direcionamentos", "estrategias", "acompanhamento_estrategias", "acordos_compartilhados", "observar"];
  var TERRITORIOS = ["corpo", "mente", "espirito"];
  var UNICOS = ["foco_atual", "proxima_etapa"];

  /* ---------- textos ------------------------------------------------------- */
  var PERGUNTA = {
    corpo: "O que vamos colocar em prática?",
    mente: "O que queremos compreender nos padrões que se repetem?",
    espirito: "Que direção queremos fortalecer?"
  };
  var NOME_TERR = { corpo: "Corpo", mente: "Mente", espirito: "Espírito" };
  var VAZIO_TERR = "Ainda não aprofundado nesta etapa.";
  var PONTO_DE_PARTIDA = "Este é o ponto de partida: ainda não há evolução registrada. Ela aparece a partir do próximo encontro.";
  var EM_CONSTRUCAO = "RESULTADO EM CONSTRUÇÃO";
  var PILAR = {
    direcionamento: { titulo: "Direcionamento", sub: "Onde você está e para onde vamos" },
    estrategias: { titulo: "Estratégias", sub: "Como vamos caminhar" },
    evolucao: { titulo: "Acompanhamento da evolução", sub: "Como vamos acompanhar o que muda" },
    evolucao_retorno: { titulo: "Acompanhamento da evolução", sub: "Seu caminho até aqui" },
    proximo: { titulo: "Acompanhamento até o próximo encontro", sub: "O que observar e o que vamos revisar" }
  };
  /* secoes: chave -> [titulo para a paciente, titulo no editor, pilar] */
  var SECAO = {
    momento: ["Seu momento agora", "Seu momento agora", "direcionamento"],
    dores: ["O que está pesando agora", "O que está pesando agora (dores)", "direcionamento"],
    desejos: ["O que você quer construir", "O que você quer construir (desejos)", "direcionamento"],
    padroes: ["O que estamos compreendendo", "O que estamos compreendendo (padrões observados)", "direcionamento"],
    foco_atual: ["Foco atual", "Foco atual", "direcionamento"],
    direcionamentos: ["Direcionamentos desta fase", "Direcionamentos desta fase", "direcionamento"],
    estrategias: ["Estratégias combinadas", "Estratégias", "estrategias"],
    acompanhamento_estrategias: ["Estratégias testadas", "Acompanhamento das estratégias anteriores", "evolucao"],
    acordos_compartilhados: ["O que combinamos", "O que combinamos (acordos compartilhados)", "estrategias"],
    avancos: ["O que já está mudando", "O que já está mudando (avanços)", "evolucao"],
    permaneceu: ["O que permaneceu", "O que permaneceu", "evolucao"],
    observar: ["Até o próximo encontro, observe", "Até o próximo encontro, observe", "evolucao"],
    proxima_etapa: ["Próxima etapa", "Próxima etapa (o que vamos revisar)", "evolucao"],
    hipoteses: ["", "Hipóteses (só profissional)", "profissional"]
  };
  var ORIGEM_PROF = { relato_paciente: "Relato da paciente", observacao_profissional: "Observação profissional", holoscan: "HOLOSCAN",
    ferramenta: "Ferramenta", conduta: "Conduta", acordo: "Acordo", nutricionista: "Escrito pela nutricionista", resultado_anterior: "Resultado anterior", holos_ai: "HOLOS AI (revisado pela nutricionista)" };
  var ORIGEM_PAC = { relato_paciente: "você contou", observacao_profissional: "registrado pela sua nutricionista", holoscan: "do HOLOSCAN",
    ferramenta: "de uma ferramenta", conduta: "registrado pela sua nutricionista", acordo: "combinado com a sua nutricionista",
    nutricionista: "registrado pela sua nutricionista", resultado_anterior: "do encontro anterior", holos_ai: "registrado pela sua nutricionista" };
  var REF_ROT = { anamnese: "Anamnese", conduta: "Conduta", acordo: "Acordo", ferramenta: "Ferramenta", holoscan: "HOLOSCAN", resultado: "Resultado anterior", atendimento: "Atendimento", holos_ai: "HOLOS AI" };
  var ESTADO = {
    sugerido: "SUGESTÃO DO SISTEMA",
    confirmado: "CONFIRMADO PELA NUTRICIONISTA",
    compartilhado: "CONFIRMADO · COMPARTILHADO COM A PACIENTE",
    so_profissional: "CONFIRMADO · SÓ PROFISSIONAL"
  };
  /* termos fora do metodo: so AVISO na tela da nutricionista (nunca bloqueia nem entra no PDF) */
  var PROIBIDOS = ["dieta", "calori", "kcal", "cardápio", "prescri", "suplement", "diagnóstic", "encaminh", "isso causou", "seu corpo está mostrando",
    "sua doença vem de", "bloqueio energético", "resistência à insulina", "candid", "toxina", "trauma", "transtorno", "causa emocional", "problema espiritual"];

  /* ---------- direcionamentos, estrategias e acompanhamento (ajuste final 13/10) ---------- */
  /* campos proprios de cada lista (alem do item base) e os que a paciente ve (a mesma regra do servidor) */
  var EXTRAS = {
    padroes: ["tipo"],
    direcionamentos: ["territorio", "porque", "objetivo", "status", "sistemas"],
    estrategias: ["direcionamento_id", "finalidade", "acao", "observar", "contexto", "prazo", "responsavel", "status", "anterior"],
    acompanhamento_estrategias: ["estrategia", "aplicou", "facilitou", "dificultou", "percepcao", "observacao", "mudanca", "decisao"]
  };
  var PUBLICAS = {
    direcionamentos: ["id", "territorio", "porque", "objetivo", "status", "sistemas"],
    estrategias: ["id", "direcionamento_id", "finalidade", "acao", "observar", "contexto", "prazo", "responsavel", "status", "anterior"],
    acompanhamento_estrategias: ["estrategia", "aplicou", "facilitou", "dificultou", "percepcao", "mudanca", "decisao"]
  };
  var TERRITORIO = { corpo: "Corpo", mente: "Mente", espirito: "Espírito", integrado: "Integrado" };
  var STATUS_DIR = { proposto: "Proposto", ativo: "Ativo nesta fase", concluido: "Concluído", encerrado: "Encerrado" };
  var STATUS_EST = { proposta: "Proposta", acordada: "Acordada", em_teste: "Em teste", manter: "Manter", ajustar: "Ajustar", substituir: "Substituir", concluida: "Concluída", encerrada: "Encerrada" };
  var DECISAO = { manter: "Manter", ajustar: "Ajustar", substituir: "Substituir", concluir: "Concluir", encerrar: "Encerrar" };
  var SISTEMAS = [["fungico", "Fúngico"], ["acido_inflamatorio", "Ácido-Inflamatório"], ["metabolico", "Metabólico"], ["detox_linfatico", "Detox + Linfático"], ["mental_emocional_espiritual", "Mental · Emocional · Espiritual"]];
  /* editor: campos de cada lista rica */
  var CAMPOS = {
    direcionamentos: [["territorio", "Território", "select", TERRITORIO], ["porque", "Por que este direcionamento", "texto"], ["objetivo", "Objetivo desta etapa", "texto"],
      ["status", "Status", "select", STATUS_DIR], ["sistemas", "Sistemas ligados (opcional)", "sistemas"]],
    estrategias: [["direcionamento_id", "Direcionamento", "direcionamento"], ["finalidade", "Para que serve", "texto"], ["acao", "O que a paciente fará", "texto"],
      ["observar", "O que observar", "texto"], ["contexto", "Contexto / frequência", "texto"], ["prazo", "Prazo", "texto"], ["responsavel", "Definida por", "texto"],
      ["status", "Status", "select", STATUS_EST]],
    acompanhamento_estrategias: [["aplicou", "Conseguiu aplicar? O que aconteceu", "texto"], ["facilitou", "O que facilitou", "texto"], ["dificultou", "O que dificultou", "texto"],
      ["percepcao", "O que a paciente percebeu", "texto"], ["observacao", "O que a nutricionista observou (só profissional)", "texto"], ["mudanca", "Houve alguma mudança?", "texto"],
      ["decisao", "Decisão", "select", DECISAO]]
  };
  /* OS CINCO SISTEMAS — textos-base do metodo (aprovados por Rodrigo em 13/10; versao CE-1). Explicam POR QUE OLHAMOS;
     o que fazer vem dos direcionamentos e estrategias confirmados. Mudanca de texto = nova versao (CE-2), nunca editar CE-1. */
  var CUIDADO_EIXOS = { versao: "CE-1",
    fungico: { cuidar: "O acompanhamento deste eixo pode envolver organização da alimentação, funcionamento digestivo, hábitos, resposta percebida aos alimentos, mucosas, couro cabeludo e rotina.",
      limite: "Não diagnostica fungos, candidíase ou infecção.",
      observar: ["funcionamento digestivo", "resposta percebida aos alimentos", "hábitos e rotina", "sinais de mucosas e couro cabeludo, quando relatados"] },
    acido_inflamatorio: { cuidar: "O acompanhamento deste eixo pode envolver observação de dor, rigidez, desconforto e reatividade percebida, além de alimentação, sono, movimento, recuperação e rotina quando pertinentes à Conduta.",
      limite: "Não mede inflamação sistêmica, pH ou “acidez corporal”.",
      observar: ["dor", "rigidez", "desconforto", "reatividade percebida", "relação com sono, recuperação, movimento e rotina"] },
    metabolico: { cuidar: "O acompanhamento deste eixo pode envolver organização das refeições, horários, fome, saciedade, energia, comportamento alimentar e resposta percebida à alimentação ao longo do dia.",
      limite: "Não diagnostica resistência à insulina, diabetes, alterações da tireoide ou outras condições metabólicas.",
      observar: ["fome e saciedade", "energia depois das refeições", "intervalos entre as refeições", "comportamento alimentar", "episódios de comer sem fome percebida", "rotina alimentar"] },
    detox_linfatico: { cuidar: "O acompanhamento deste eixo pode envolver funcionamento intestinal, retenção/inchaço percebido, hidratação, movimento, alimentação e rotina.",
      limite: "Não mede toxinas, função hepática, capacidade de detoxificação ou fluxo linfático.",
      observar: ["funcionamento intestinal", "inchaço ou retenção percebida", "hidratação", "movimento", "rotina"] },
    mental_emocional_espiritual: { cuidar: "O acompanhamento deste eixo pode envolver gatilhos, pensamentos, crenças, padrões de comportamento, autorregulação, valores, pertencimento, propósito e direção de vida.",
      limite: "Não diagnostica transtornos mentais e não mede saúde espiritual.",
      observar: ["gatilhos", "pensamentos", "crenças", "respostas automáticas", "autorregulação", "valores", "pertencimento", "propósito", "direção"] }
  };
  var NAO_PRIORITARIO = "Não aparece como um dos focos principais nesta etapa.";

  /* ---------- modelo ------------------------------------------------------- */
  var seq = 0;
  function novoId() { seq += 1; return "i" + Date.now().toString(36) + seq.toString(36); }
  function tem(v) { return v !== null && v !== undefined && !(typeof v === "string" && !v.trim()) && !(Array.isArray(v) && !v.length); }
  function lista(v) { return Array.isArray(v) ? v.filter(tem).join(", ") : String(v); }
  function ehObj(x) { return x !== null && typeof x === "object" && !Array.isArray(x); }
  function nova(tipo) {
    var d = { schema_version: VERSAO, tipo: tipo === "retorno" ? "retorno" : "primeira", foco_atual: null, proxima_etapa: null };
    LISTAS.forEach(function (k) { d[k] = []; });
    TERRITORIOS.forEach(function (k) { d[k] = { itens: [] }; });
    return d;
  }
  /* normaliza (direcao gravada pode nao ter todas as chaves) */
  function normalizar(d, tipo) {
    var n = nova(ehObj(d) && d.tipo ? d.tipo : tipo);
    if (!ehObj(d)) return n;
    LISTAS.forEach(function (k) { if (Array.isArray(d[k])) n[k] = d[k].map(function (it) { return Object.assign({}, it); }); });
    TERRITORIOS.forEach(function (k) { if (ehObj(d[k]) && Array.isArray(d[k].itens)) n[k] = { itens: d[k].itens.map(function (it) { return Object.assign({}, it); }) }; });
    UNICOS.forEach(function (k) { if (ehObj(d[k])) n[k] = Object.assign({}, d[k]); });
    todos(n).forEach(function (it) { if (!it.id) it.id = novoId(); });
    return n;
  }
  function todos(d) {
    var out = [];
    LISTAS.forEach(function (k) { (d[k] || []).forEach(function (it) { out.push(it); }); });
    TERRITORIOS.forEach(function (k) { ((d[k] || {}).itens || []).forEach(function (it) { out.push(it); }); });
    UNICOS.forEach(function (k) { if (ehObj(d[k])) out.push(d[k]); });
    return out;
  }
  function listaDe(d, sec) { return TERRITORIOS.indexOf(sec) >= 0 ? d[sec].itens : d[sec]; }
  /* o que vai para o servidor: so os campos do formato (o id local fica, e um rotulo curto) */
  function paraGravar(d) {
    var limpa = function (it) {
      var o = { id: String(it.id || novoId()).slice(0, 64), texto: String(it.texto || "").slice(0, 1000), origem: it.origem || "nutricionista" };
      if (tem(it.texto_sugerido)) o.texto_sugerido = String(it.texto_sugerido).slice(0, 1000);
      if (it.ref && it.ref.tipo && it.ref.id) o.ref = { tipo: it.ref.tipo, id: it.ref.id, campo: it.ref.campo ? String(it.ref.campo).slice(0, 80) : null };
      ["sugestao", "confirmado", "mostrar_paciente", "descartado"].forEach(function (k) { o[k] = it[k] === true; });
      if (it.tipo) o.tipo = it.tipo;
      return o;
    };
    var limpaLista = function (lista) {
      return function (it) {
        var o = limpa(it);
        if (lista !== "padroes") delete o.tipo;
        (EXTRAS[lista] || []).forEach(function (k) {
          var v = it[k];
          if (v === undefined || v === null || v === "") return;
          if (k === "sistemas") { if (Array.isArray(v) && v.length) o.sistemas = v.slice(0, 5).map(String); return; }
          if (k === "anterior" || k === "estrategia") { if (ehObj(v) && v.resultado_id && v.estrategia_id) o[k] = { resultado_id: v.resultado_id, estrategia_id: String(v.estrategia_id).slice(0, 64) }; return; }
          if (k === "tipo") return;
          o[k] = String(v).slice(0, 1000);
        });
        if (lista === "acompanhamento_estrategias" && o.confirmado && !o.decisao) { o.confirmado = false; o.mostrar_paciente = false; }
        return o;
      };
    };
    var ok = function (it) { return tem(it && it.texto); };
    var o = { schema_version: VERSAO, tipo: d.tipo === "retorno" ? "retorno" : "primeira" };
    LISTAS.forEach(function (k) { o[k] = (d[k] || []).filter(ok).map(limpaLista(k)); });
    TERRITORIOS.forEach(function (k) { o[k] = { itens: ((d[k] || {}).itens || []).filter(ok).map(limpa) }; });
    UNICOS.forEach(function (k) { o[k] = ok(d[k]) ? limpa(d[k]) : null; });
    return o;
  }
  function estadoDe(it) {
    if (!it.confirmado) return "sugerido";
    if (it.tipo === "hipotese" || !it.mostrar_paciente) return "so_profissional";
    return "compartilhado";
  }
  function focoConfirmado(d) { return !!(d && ehObj(d.foco_atual) && d.foco_atual.confirmado === true && !d.foco_atual.descartado && tem(d.foco_atual.texto)); }

  /* projecao da paciente (espelho da funcao do servidor resultado_holos_direcao_paciente; a tela usa a do SERVIDOR) */
  function itemPaciente(it) {
    return ehObj(it) && it.confirmado === true && it.mostrar_paciente === true && it.descartado !== true && it.tipo !== "hipotese" && tem(it.texto);
  }
  function projecaoPaciente(d) {
    d = normalizar(d);
    var l = function (x, lista) {
      return (x || []).filter(function (it) { return itemPaciente(it) && (lista !== "padroes" || it.tipo === "padrao_observado"); }).map(function (it) {
        var o = { texto: it.texto.trim(), origem: it.origem || null };
        (PUBLICAS[lista] || []).forEach(function (k) { if (it[k] !== undefined && it[k] !== null && it[k] !== "") o[k] = JSON.parse(JSON.stringify(it[k])); });
        return o;
      });
    };
    var f = d.foco_atual;
    return { schema_version: 1, tipo: d.tipo, momento: l(d.momento, "momento"), dores: l(d.dores, "dores"), desejos: l(d.desejos, "desejos"), avancos: l(d.avancos, "avancos"),
      permaneceu: l(d.permaneceu, "permaneceu"), padroes: l(d.padroes, "padroes"),
      foco_atual: focoConfirmado(d) && f.tipo !== "hipotese" ? { texto: f.texto.trim(), origem: f.origem || null } : null,
      direcionamentos: l(d.direcionamentos, "direcionamentos"), estrategias: l(d.estrategias, "estrategias"), acompanhamento_estrategias: l(d.acompanhamento_estrategias, "acompanhamento_estrategias"),
      corpo: { itens: l(d.corpo.itens, "corpo") }, mente: { itens: l(d.mente.itens, "mente") }, espirito: { itens: l(d.espirito.itens, "espirito") },
      acordos_compartilhados: l(d.acordos_compartilhados, "acordos_compartilhados"), observar: l(d.observar, "observar"),
      proxima_etapa: itemPaciente(d.proxima_etapa) ? { texto: d.proxima_etapa.texto.trim(), origem: d.proxima_etapa.origem || null } : null };
  }

  function termosFora(texto) {
    var t = String(texto || "").toLowerCase();
    return PROIBIDOS.filter(function (p) { return t.indexOf(p) >= 0; });
  }
  /* avisos: termos fora do metodo nos textos que VAO para a paciente */
  function avisos(d) {
    var achados = {}, n = normalizar(d);
    todos(n).filter(function (it) { return itemPaciente(it) || (it === n.foco_atual && it.confirmado === true); }).forEach(function (it) { termosFora(it.texto).forEach(function (p) { achados[p] = true; }); });
    return Object.keys(achados);
  }

  /* ---------- sugestoes (so citam o que ja foi registrado; nunca inventam acao) ---------- */
  /*
     ctx = {
       tipo: "primeira" | "retorno",
       anamnese: { id, content: { tipo, formulario } } | null,     // a do atendimento do resultado
       conduta: { id, objective, nutrition_strategy, actions, resources, professional_guidance, monitoring, return_plan } | null,
       acordos: [{ id, description, due_text, follow_up, status }],  // da Conduta do atendimento
       acordosAnteriores: [{ id, description, status }],           // da Conduta do atendimento anterior (retorno)
       ferramentas: [{ id, ferramenta_id, modulo, titulo, respostas, proximo_passo }],
       holoscan: { id, areas: [{ nome, dominantes: [{ question_id, enunciado }] }] } | null,
       anterior: { id, direcao_paciente } | null                   // Resultado anterior (retorno)
     }
     Devolve { momento:[], dores:[], ..., corpo:[], mente:[], espirito:[], foco_atual:[], proxima_etapa:[] } (candidatos).
  */
  function sug(texto, origem, tipo, id, campo) {
    if (!tem(texto) || !id) return null;
    var t = String(texto).replace(/\s+/g, " ").trim();
    if (t.length > 1000) t = t.slice(0, 997) + "…";
    return { id: novoId(), texto: t, texto_sugerido: t, origem: origem, ref: { tipo: tipo, id: id, campo: campo || null },
      sugestao: true, confirmado: false, mostrar_paciente: false, descartado: false };
  }
  function com(it, extra) { if (!it) return it; Object.keys(extra).forEach(function (k) { if (extra[k] !== "" && extra[k] !== undefined) it[k] = extra[k]; }); return it; }
  function linhas(txt) {
    return String(txt || "").split(/\n+/).map(function (x) { return x.replace(/^\s*[-•*]\s*/, "").trim(); }).filter(Boolean).slice(0, 6);
  }
  function sugestoes(ctx) {
    ctx = ctx || {};
    var S = {}; LISTAS.concat(TERRITORIOS, UNICOS).forEach(function (k) { S[k] = []; });
    var add = function (k, it) { if (it) S[k].push(it); };
    var retorno = ctx.tipo === "retorno";
    var an = ctx.anamnese, f = an && an.content && an.content.formulario || {};
    var g = function (b, c) { return (f[b] || {})[c]; };
    var aR = function (k, rotulo, campo, bloco, txt) { var v = g(bloco, campo); if (tem(v)) add(k, sug(txt ? txt(lista(v)) : rotulo + lista(v) + ".", "relato_paciente", an.refTipo || "anamnese", an.id, (an.refTipo ? "mapeamento." : "") + bloco + "." + campo)); };
    var ponto = function (s) { s = String(s).trim(); return /[.!?…]$/.test(s) ? s : s + "."; };
    var h = ctx.holoscan;

    // DIRECIONAMENTO
    if (an && !retorno) {
      aR("momento", "", "motivo", "motivo", function (v) { return "Você chegou ao acompanhamento trazendo: " + ponto(v); });
      aR("dores", "", "sinal_principal", "saude", function (v) { return "O sinal que mais tem incomodado: " + ponto(v); });
      aR("dores", "", "dificuldades", "alimentar", function (v) { return "Dificuldades com a alimentação que você apontou: " + ponto(v); });
      aR("dores", "", "dificuldade", "alimentar", function (v) { return "Maior dificuldade alimentar: " + ponto(v); });
      aR("dores", "", "maior_fome", "alimentar", function (v) { return "Períodos de maior fome: " + ponto(v); });
      aR("desejos", "", "objetivo", "motivo", function (v) { return "Seu principal objetivo: " + ponto(v); });
      aR("desejos", "", "melhorar", "motivo", function (v) { return "O que você busca no acompanhamento: " + ponto(v); });   /* MH-3 */
      aR("desejos", "", "mudar_primeiro", "motivo", function (v) { return "O que você gostaria de mudar primeiro: " + ponto(v); });
      aR("desejos", "", "expectativa", "motivo", function (v) { return "O que você espera do acompanhamento: " + ponto(v); });
      aR("avancos", "", "ajudou", "motivo", function (v) { return "O que já ajudou antes: " + ponto(v); });
    }
    if (an && retorno) {
      aR("momento", "", "mudanca_obs", "retorno", function (v) { return "Desde o último encontro, você contou esta mudança: " + ponto(v); });
      aR("momento", "", "praticou_nivel", "retorno", function (v) { return "Quanto você conseguiu colocar em prática: " + ponto(v.toLowerCase()); });
      aR("avancos", "", "melhorou", "retorno", function (v) { return "O que melhorou: " + ponto(v); });
      aR("avancos", "", "melhorou_opcoes", "retorno", function (v) { return "Áreas em que você percebeu melhora: " + ponto(v); });
      aR("avancos", "", "praticou", "retorno", function (v) { return "O que você conseguiu colocar em prática: " + ponto(v); });
      aR("avancos", "", "facilitou", "retorno", function (v) { return "O que facilitou: " + ponto(v); });
      aR("permaneceu", "", "piorou", "retorno", function (v) { return "O que piorou: " + ponto(v); });
      aR("permaneceu", "", "nao_praticou", "retorno", function (v) { return "O que ainda não foi possível colocar em prática: " + ponto(v); });
      aR("permaneceu", "", "dificultou", "retorno", function (v) { return "O que dificultou: " + ponto(v); });
      aR("permaneceu", "", "dificuldade", "retorno", function (v) { return "Principal dificuldade desde o último encontro: " + ponto(v); });
    }
    if (h && h.id && !retorno) {
      var areas = (h.areas || []).slice(0, 2);
      if (areas.length) add("momento", sug("No HOLOSCAN, as primeiras áreas para aprofundar foram " + areas.map(function (a) { return a.nome; }).join(" e ") + ".", "holoscan", "holoscan", h.id, "areas"));
      areas.forEach(function (a) {
        (a.dominantes || []).slice(0, 2).forEach(function (q) { add("dores", sug("Um dos sinais que mais contribuíram no HOLOSCAN: “" + String(q.enunciado || "").replace(/[.]$/, "") + "”", "holoscan", "holoscan", h.id, q.question_id)); });
      });
    }
    var ferr = ctx.ferramentas || [];
    var fr = function (fid) { return ferr.filter(function (t) { return t.ferramenta_id === fid; })[0]; };
    var rF = function (t, campo) { return t && t.respostas ? t.respostas[campo] : null; };
    var oq3 = fr("oq3"), pqq = fr("pqq"), crencas = fr("mapa_crencas"), gat = fr("gatilhos_respostas_v1"), roda = fr("roda_vida"), rotina = fr("mapa_rotina_v1");
    if (oq3 && tem(rF(oq3, "quer"))) add("desejos", sug("O que você quer (OQ³): " + ponto(rF(oq3, "quer")), "ferramenta", "ferramenta", oq3.id, "quer"));
    if (pqq && tem(rF(pqq, "objetivo"))) add("desejos", sug("O objetivo que você declarou na Escada dos Porquês: " + ponto(rF(pqq, "objetivo")), "ferramenta", "ferramenta", pqq.id, "objetivo"));
    // anterior: o que ja era da paciente no Resultado anterior (retorno)
    var ant = ctx.anterior;
    if (retorno && ant && ant.id && ant.direcao_paciente) {
      (ant.direcao_paciente.dores || []).forEach(function (x) { add("permaneceu", sug(x.texto, "resultado_anterior", "resultado", ant.id, "dores")); });
      (ant.direcao_paciente.padroes || []).forEach(function (x) { var s = sug(x.texto, "resultado_anterior", "resultado", ant.id, "padroes"); if (s) { s.tipo = "padrao_observado"; add("padroes", s); } });
      (ant.direcao_paciente.desejos || []).forEach(function (x) { add("desejos", sug(x.texto, "resultado_anterior", "resultado", ant.id, "desejos")); });
    }

    // ESTRATEGIAS: so o que a nutricionista escreveu (Conduta, acordos) ou o que a paciente registrou nas ferramentas
    var c = ctx.conduta;
    if (c && c.id) {
      if (tem(c.objective)) add("foco_atual", sug(c.objective, "conduta", "conduta", c.id, "objective"));
      /* DIRECIONAMENTO: so o que a nutricionista escreveu (objetivo e prioridades da Conduta) — nunca a partir da nota */
      if (tem(c.objective)) add("direcionamentos", com(sug(c.objective, "conduta", "conduta", c.id, "objective"), { territorio: "integrado", status: "proposto" }));
      (Array.isArray(c.priorities) ? c.priorities : []).filter(tem).slice(0, 5).forEach(function (x) {
        add("direcionamentos", com(sug(String(x), "conduta", "conduta", c.id, "priorities"), { territorio: "integrado", status: "proposto" })); });
      /* ESTRATEGIA: a Estrategia escrita na Conduta (nunca do score) */
      linhas(c.nutrition_strategy).forEach(function (x) { add("estrategias", com(sug(x, "conduta", "conduta", c.id, "nutrition_strategy"), { status: "proposta", responsavel: "Nutricionista (Conduta)" })); });
      linhas(c.actions).forEach(function (x) { add("corpo", sug(x, "conduta", "conduta", c.id, "actions")); });
      linhas(c.professional_guidance).forEach(function (x) { add("acordos_compartilhados", sug(x, "conduta", "conduta", c.id, "professional_guidance")); });
      linhas(c.monitoring).forEach(function (x) { add("observar", sug(x, "conduta", "conduta", c.id, "monitoring")); });
      if (tem(c.return_plan)) add("proxima_etapa", sug(c.return_plan, "conduta", "conduta", c.id, "return_plan"));
    }
    (ctx.acordos || []).filter(function (a) { return a && a.id && tem(a.description) && ["revisto", "encerrado"].indexOf(a.status) < 0; }).forEach(function (a) {
      add("acordos_compartilhados", sug(a.description + (tem(a.due_text) ? " (" + String(a.due_text).trim() + ")" : ""), "acordo", "acordo", a.id, "description"));
      if (tem(a.follow_up)) add("observar", sug(a.follow_up, "acordo", "acordo", a.id, "follow_up"));
    });
    if (retorno) (ctx.acordosAnteriores || []).filter(function (a) { return a && a.id && a.status === "concluido" && tem(a.description); }).forEach(function (a) {
      add("avancos", sug("Acordo concluído: " + ponto(a.description), "acordo", "acordo", a.id, "status"));
    });
    if (oq3 && tem(rF(oq3, "consegue"))) add("corpo", sug("O que você disse que consegue fazer agora: " + ponto(rF(oq3, "consegue")), "ferramenta", "ferramenta", oq3.id, "consegue"));
    if (rotina && tem(rF(rotina, "espacos"))) add("corpo", sug("Espaços da rotina que você percebeu como possíveis para mudança: " + ponto(lista(rF(rotina, "espacos"))), "ferramenta", "ferramenta", rotina.id, "espacos"));
    if (crencas && tem(rF(crencas, "mais_atrapalha"))) add("mente", sug("A crença que você apontou como a que mais atrapalha hoje: " + ponto(rF(crencas, "mais_atrapalha")), "ferramenta", "ferramenta", crencas.id, "mais_atrapalha"));
    if (gat && tem(rF(gat, "gatilho"))) add("mente", sug("Episódio registrado — gatilho: " + String(rF(gat, "gatilho")).trim().replace(/[.]$/, "") + (tem(rF(gat, "resposta")) ? "; resposta: " + String(rF(gat, "resposta")).trim().replace(/[.]$/, "") : "") + ".", "ferramenta", "ferramenta", gat.id, "gatilho"));
    if (gat && tem(rF(gat, "alternativa"))) add("mente", sug("Resposta alternativa registrada: " + ponto(rF(gat, "alternativa")), "ferramenta", "ferramenta", gat.id, "alternativa"));
    if (pqq && tem(rF(pqq, "verdadeiro"))) add("espirito", sug("O que é verdadeiro para você (Escada dos Porquês): " + ponto(rF(pqq, "verdadeiro")), "ferramenta", "ferramenta", pqq.id, "verdadeiro"));
    if (roda && tem(rF(roda, "puxa"))) add("espirito", sug("A área da vida que você apontou como a que puxa as outras: " + ponto(lista(rF(roda, "puxa"))), "ferramenta", "ferramenta", roda.id, "puxa"));
    // proximo passo escrito pela nutricionista na propria ferramenta (vai para o territorio da ferramenta)
    ferr.forEach(function (t) {
      if (tem(t.proximo_passo) && TERRITORIOS.indexOf(t.modulo) >= 0) add(t.modulo, sug(t.proximo_passo, "observacao_profissional", "ferramenta", t.id, "proximo_passo"));
      /* prioridade escrita pela nutricionista na ferramenta: candidata a direcionamento, no territorio da ferramenta */
      if (tem(t.prioridade) && TERRITORIOS.indexOf(t.modulo) >= 0) add("direcionamentos", com(sug(t.prioridade, "observacao_profissional", "ferramenta", t.id, "prioridade"), { territorio: t.modulo, status: "proposto" }));
    });
    /* RETORNO: cada estrategia do Resultado anterior vira um acompanhamento a registrar (experiencia, percepcao, decisao) e
       os direcionamentos anteriores podem continuar. O Resultado anterior nao muda: a ligacao e pelo id. */
    if (retorno && ant && ant.id && ant.direcao_paciente) {
      (ant.direcao_paciente.estrategias || []).filter(function (x) { return x && x.id; }).forEach(function (x) {
        add("acompanhamento_estrategias", com(sug(x.texto, "resultado_anterior", "resultado", ant.id, "estrategias"), { estrategia: { resultado_id: ant.id, estrategia_id: x.id } }));
      });
      (ant.direcao_paciente.direcionamentos || []).forEach(function (x) {
        add("direcionamentos", com(sug(x.texto, "resultado_anterior", "resultado", ant.id, "direcionamentos"),
          { territorio: x.territorio || "integrado", porque: x.porque || "", objetivo: x.objetivo || "", sistemas: (x.sistemas || []).slice(), status: "proposto" }));
      });
    }
    /* RETORNO: depois de a nutricionista CONFIRMAR o acompanhamento com a decisao, ele alimenta avancos, o que permaneceu e a
       proxima estrategia (manter/ajustar continuam a mesma estrategia, ligada a anterior; substituir/concluir/encerrar nao geram nada) */
    var atual = ctx.direcaoAtual;
    if (retorno && atual) (atual.acompanhamento_estrategias || []).filter(function (a) { return a && a.confirmado && !a.descartado && a.estrategia; }).forEach(function (a) {
      var rid = a.estrategia.resultado_id, refC = "estrategias";
      if (tem(a.percepcao)) add("avancos", sug("Na estratégia “" + String(a.texto).replace(/[.]$/, "") + "”: " + ponto(a.percepcao), "resultado_anterior", "resultado", rid, refC));
      if (tem(a.dificultou)) add("permaneceu", sug("Na estratégia “" + String(a.texto).replace(/[.]$/, "") + "”, o que dificultou: " + ponto(a.dificultou), "resultado_anterior", "resultado", rid, refC));
      if (a.decisao === "manter" || a.decisao === "ajustar") {
        var prev = ((ant && ant.direcao_paciente && ant.direcao_paciente.estrategias) || []).filter(function (x) { return x.id === a.estrategia.estrategia_id; })[0] || {};
        add("estrategias", com(sug(a.texto, "resultado_anterior", "resultado", rid, refC), { status: a.decisao, anterior: { resultado_id: rid, estrategia_id: a.estrategia.estrategia_id },
          finalidade: prev.finalidade || "", acao: prev.acao || "", observar: prev.observar || "", contexto: prev.contexto || "", prazo: prev.prazo || "", responsavel: prev.responsavel || "" }));
      }
    });
    return S;
  }
  /* chave de rastreabilidade: a mesma fonte nao vira duas sugestoes */
  function chave(it) {
    var r = it.ref || {}, e = it.estrategia ? "acomp:" + it.estrategia.estrategia_id : it.anterior ? "continua:" + it.anterior.estrategia_id : "";
    return [it.origem, r.tipo, r.id, r.campo, e, it.texto_sugerido || it.texto].join("|");
  }
  /* acrescenta as sugestoes novas na direcao (sem tocar no que ja foi confirmado, editado ou descartado). Devolve quantas entraram. */
  function mesclar(d, S) {
    var n = 0, ja = {};
    todos(d).forEach(function (it) { ja[chave(it)] = true; });
    LISTAS.concat(TERRITORIOS).forEach(function (k) {
      (S[k] || []).forEach(function (it) { if (ja[chave(it)]) return; ja[chave(it)] = true; listaDe(d, k).push(it); n++; });
    });
    return n;
  }

  /* ---------- editor profissional: MONTAR RESULTADO PARA A PACIENTE ---------- */
  function rotRef(r, origem) {
    if (!r || !r.tipo) return "";
    var nome = REF_ROT[r.tipo] || r.tipo;
    return (ORIGEM_PROF[origem] === nome ? "" : nome + " · ") + (r.campo ? r.campo + " · " : "") + String(r.id || "").slice(0, 8);
  }
  function chipEstado(it) {
    var e = estadoDe(it);
    return '<span class="rd-estado rd-estado-' + e + '">' + esc(ESTADO[e]) + "</span>";
  }
  function linhaEditor(sec, it, so_prof) {
    var e = estadoDe(it), hip = it.tipo === "hipotese";
    var alerta = termosFora(it.texto);
    return '<li class="rd-ed-item rd-ed-' + e + '" data-rd-sec="' + esc(sec) + '" data-rd-id="' + esc(it.id) + '">' +
      '<div class="rd-ed-topo">' + chipEstado(it) + (it.sugestao && it.confirmado ? '<span class="rd-sug-selo rd-sug-origem">veio de sugestão do sistema</span>' : "") +
        '<span class="rd-origem">' + esc(ORIGEM_PROF[it.origem] || it.origem) + (it.ref ? " · " + esc(rotRef(it.ref, it.origem)) : "") + "</span></div>" +
      '<textarea class="rd-texto" rows="2" maxlength="1000" data-rd-texto="' + esc(sec) + "|" + esc(it.id) + '" aria-label="Texto do item">' + esc(it.texto) + "</textarea>" +
      (it.sugestao && it.texto_sugerido && it.texto_sugerido !== it.texto ? '<p class="rd-orig">Texto sugerido: ' + esc(it.texto_sugerido) + "</p>" : "") +
      (alerta.length ? '<p class="rd-alerta" role="status">Atenção: termos fora do método (' + esc(alerta.join(", ")) + "). Revise antes de compartilhar.</p>" : "") +
      camposExtras(sec, it) +
      (it._semDecisao ? '<p class="rd-alerta" role="status">Escolha a decisão (manter, ajustar, substituir, concluir ou encerrar) antes de confirmar.</p>' : "") +
      '<div class="rd-ed-botoes">' +
        (it.confirmado ? '<button type="button" class="btn-fantasma" data-rd-acao="desconfirmar">Desfazer confirmação</button>'
          : '<button type="button" class="btn-borda-ouro" data-rd-acao="confirmar">Confirmar</button>') +
        (so_prof || hip ? '<span class="rd-so-prof">' + (hip ? "Hipótese: nunca vai para a paciente." : "Só profissional.") + "</span>"
          : '<label class="rd-compartilhar"><input type="checkbox" data-rd-acao="compartilhar"' + (it.mostrar_paciente ? " checked" : "") + (it.confirmado ? "" : " disabled") + "> Compartilhar com a paciente</label>") +
        '<button type="button" class="btn-fantasma rd-excluir" data-rd-acao="excluir">Excluir</button>' +
      "</div></li>";
  }
  /* campos proprios de direcionamento / estrategia / acompanhamento (editaveis enquanto e rascunho) */
  var dirAtual = null;   // a direcao em edicao (para o seletor de direcionamento das estrategias)
  function camposExtras(sec, it) {
    var cs = CAMPOS[sec]; if (!cs) return "";
    var nome = function (k) { return esc(sec) + "|" + esc(it.id) + "|" + k; };
    var html = cs.map(function (c) {
      var k = c[0], v = it[k];
      if (c[2] === "texto") return '<label class="rd-campo"><span>' + esc(c[1]) + '</span><input type="text" maxlength="1000" data-rd-campo="' + nome(k) + '" value="' + esc(v || "") + '"></label>';
      if (c[2] === "select") return '<label class="rd-campo"><span>' + esc(c[1]) + '</span><select data-rd-campo="' + nome(k) + '"><option value="">—</option>' +
        Object.keys(c[3]).map(function (o) { return '<option value="' + o + '"' + (v === o ? " selected" : "") + ">" + esc(c[3][o]) + "</option>"; }).join("") + "</select></label>";
      if (c[2] === "direcionamento") {
        var ds = ((dirAtual && dirAtual.direcionamentos) || []).filter(function (x) { return !x.descartado; });
        return '<label class="rd-campo"><span>' + esc(c[1]) + '</span><select data-rd-campo="' + nome(k) + '"><option value="">— sem vínculo —</option>' +
          ds.map(function (x) { return '<option value="' + esc(x.id) + '"' + (v === x.id ? " selected" : "") + ">" + esc(String(x.texto).slice(0, 80)) + "</option>"; }).join("") + "</select></label>";
      }
      if (c[2] === "sistemas") return '<div class="rd-campo rd-campo-sis"><span>' + esc(c[1]) + "</span>" + SISTEMAS.map(function (x) {
        return '<label><input type="checkbox" data-rd-sis="' + nome(x[0]) + '"' + ((v || []).indexOf(x[0]) >= 0 ? " checked" : "") + "> " + esc(x[1]) + "</label>"; }).join("") + "</div>";
      return "";
    }).join("");
    var nota = it.anterior ? '<p class="rd-orig">Continua a estratégia anterior (' + esc(String(it.anterior.estrategia_id)) + ") do Resultado " + esc(String(it.anterior.resultado_id).slice(0, 8)) + " — o registro anterior não muda.</p>"
      : it.estrategia ? '<p class="rd-orig">Acompanhamento da estratégia do Resultado ' + esc(String(it.estrategia.resultado_id).slice(0, 8)) + " — o registro anterior não muda.</p>" : "";
    return '<div class="rd-campos">' + html + "</div>" + nota;
  }
  function blocoEditor(d, sec, opts) {
    opts = opts || {};
    var itens = listaDe(d, sec === "hipoteses" ? "padroes" : sec).filter(function (it) {
      if (it.descartado) return false;
      if (sec === "padroes") return it.tipo !== "hipotese";
      if (sec === "hipoteses") return it.tipo === "hipotese";
      return true;
    });
    var titulo = TERRITORIOS.indexOf(sec) >= 0 ? NOME_TERR[sec] + " — " + PERGUNTA[sec] : SECAO[sec][1];
    var desc = TERRITORIOS.indexOf(sec) >= 0 ? "Sem item confirmado, a paciente vê: “" + VAZIO_TERR + "”. Ação só se veio da Conduta/acordo ou se você escrever." : (opts.desc || "");
    var pend = itens.filter(function (it) { return !it.confirmado; }).length;
    return '<section class="rd-ed-bloco" data-rd-bloco="' + esc(sec) + '"><h5>' + esc(titulo) + (pend ? ' <small class="rd-pend">' + pend + (pend === 1 ? " sugestão a revisar" : " sugestões a revisar") + "</small>" : "") + "</h5>" +
      (desc ? '<p class="dash-sub">' + esc(desc) + "</p>" : "") +
      (itens.length ? '<ul class="rd-ed-lista">' + itens.map(function (it) { return linhaEditor(sec === "hipoteses" ? "padroes" : sec, it, sec === "hipoteses"); }).join("") + "</ul>"
        : '<p class="rh-vazio">' + (sec === "acompanhamento_estrategias" ? "Nenhuma estratégia anterior compartilhada ainda. Use “Trazer sugestões do sistema”." : "Nada aqui ainda.") + "</p>") +
      (sec === "acompanhamento_estrategias" ? "" :
      '<div class="rd-add"><textarea rows="1" maxlength="1000" data-rd-novo="' + esc(sec) + '" placeholder="Escrever um item' + (sec === "hipoteses" ? " (hipótese — só profissional)" : "") + '…" aria-label="Novo item: ' + esc(titulo) + '"></textarea>' +
        '<button type="button" class="btn-borda-ouro" data-rd-acao="adicionar" data-rd-sec="' + esc(sec) + '">Adicionar</button></div>') + "</section>";
  }
  function unicoEditor(d, sec, candidatos) {
    var it = d[sec], foco = sec === "foco_atual";
    var cand = (candidatos || []).filter(function (c) { return !it || chave(c) !== chave(it); });
    var corpo = it ? '<ul class="rd-ed-lista">' + linhaEditor(sec, it, foco).replace('<span class="rd-so-prof">Só profissional.</span>', foco ? '<span class="rd-so-prof">O foco confirmado sempre aparece para a paciente.</span>' : "") + "</ul>"
      : '<p class="rh-vazio">' + (foco ? "Sem foco atual ainda." : "Não definida.") + "</p>";
    return '<section class="rd-ed-bloco rd-ed-' + esc(sec) + '" data-rd-bloco="' + esc(sec) + '"><h5>' + esc(SECAO[sec][1]) + (foco ? ' <small class="rd-obrig">obrigatório para finalizar, emitir, gerar PDF e enviar</small>' : "") + "</h5>" + corpo +
      (cand.length ? '<div class="rd-candidatos"><span class="rd-sug-selo">SUGESTÃO DO SISTEMA</span>' + cand.map(function (c, i) {
        return '<div class="rd-cand"><p>' + esc(c.texto) + ' <small>' + esc(ORIGEM_PROF[c.origem] || "") + " · " + esc(rotRef(c.ref, c.origem)) + '</small></p><button type="button" class="btn-fantasma" data-rd-acao="usar" data-rd-sec="' + esc(sec) + '" data-rd-cand="' + i + '">Usar esta sugestão</button></div>';
      }).join("") + "</div>" : "") +
      '<div class="rd-add"><textarea rows="1" maxlength="1000" data-rd-novo="' + esc(sec) + '" placeholder="' + (foco ? "Escrever o foco atual…" : "Escrever a próxima etapa…") + '" aria-label="' + esc(SECAO[sec][1]) + '"></textarea>' +
        '<button type="button" class="btn-borda-ouro" data-rd-acao="adicionar" data-rd-sec="' + esc(sec) + '">' + (it ? "Substituir" : "Definir") + "</button></div></section>";
  }
  /* candidatos para foco e proxima etapa ficam fora da direcao ate a nutricionista usar um */
  var candidatosUnicos = { foco_atual: [], proxima_etapa: [] };
  function htmlEditor(d, info) {
    info = info || {};
    var retorno = d.tipo === "retorno";
    var focoOk = focoConfirmado(d);
    var av = avisos(d);
    var nSug = todos(d).filter(function (it) { return !it.confirmado && !it.descartado; }).length;
    var pil = function (k, corpo) { return '<div class="rd-ed-pilar rd-pilar-' + k + '"><h4 class="rd-ed-pilar-tit">' + esc(PILAR[k].titulo) + " <small>" + esc(PILAR[k].sub) + "</small></h4>" + corpo + "</div>"; };
    var html = '<fieldset class="rh-grupo rd-editor" id="rd-editor"><legend>MONTAR RESULTADO PARA A PACIENTE</legend>' +
      '<div class="rd-status ' + (focoOk ? "rd-status-ok" : "rd-status-construcao") + '" role="status" id="rd-status">' +
        (focoOk ? "Foco atual confirmado — o Resultado pode ser finalizado." : EM_CONSTRUCAO + " — defina e confirme o Foco atual para finalizar, emitir, gerar o PDF e enviar.") + "</div>" +
      '<div class="rd-tipo" role="group" aria-label="Tipo de encontro"><span>Encontro:</span>' +
        '<label><input type="radio" name="rd-tipo" value="primeira"' + (retorno ? "" : " checked") + "> Primeira consulta</label>" +
        '<label><input type="radio" name="rd-tipo" value="retorno"' + (retorno ? " checked" : "") + "> Retorno</label></div>" +
      '<p class="dash-sub">O sistema só SUGERE a partir do que já foi registrado (anamnese, HOLOSCAN, ferramentas, Conduta, acordos, Resultado anterior). Nenhuma sugestão vai para a paciente sem você <b>confirmar</b> e <b>compartilhar</b>. Hipóteses nunca vão.</p>' +
      '<div class="rd-ed-acoes"><button type="button" class="btn-borda-ouro" data-rd-acao="sugerir">Trazer sugestões do sistema</button>' +
        (info.sugMsg ? '<span class="rd-sug-msg" role="status">' + esc(info.sugMsg) + "</span>" : "") +
        (nSug ? '<span class="rd-sug-msg">' + nSug + (nSug === 1 ? " sugestão aguardando revisão" : " sugestões aguardando revisão") + "</span>" : "") + "</div>" +
      (av.length ? '<p class="rd-alerta" role="status">Atenção: há termos fora do método no que vai para a paciente (' + esc(av.join(", ")) + "). O HoloHacking não entrega dieta, prescrição, suplementação, diagnóstico nem causalidade.</p>" : "");
    dirAtual = d;
    var dirDesc = { desc: "Para onde o acompanhamento caminha nesta fase. O sistema só sugere o que a nutricionista escreveu (objetivo e prioridades da Conduta, prioridade da ferramenta, Resultado anterior) — nunca a partir da nota. Ligue ao sistema do HOLOSCAN quando fizer sentido." };
    var estDesc = { desc: "Como cada direcionamento será trabalhado na prática. Vem da Conduta, dos acordos, das ferramentas ou do que você escrever — nunca do score." };
    if (retorno) {
      html += pil("evolucao_retorno", '<p class="dash-sub">“Seu caminho até aqui” e “Antes” vêm dos Resultados anteriores, já salvos (somente leitura).</p>' +
        blocoEditor(d, "acompanhamento_estrategias", { desc: "Cada estratégia do encontro anterior: conseguiu aplicar? o que facilitou e dificultou? o que a paciente percebeu? e a decisão (manter, ajustar, substituir, concluir, encerrar). Depois de confirmar, “Trazer sugestões” gera avanços, o que permaneceu e a estratégia continuada." }) +
        blocoEditor(d, "momento", { desc: "Agora: o que aconteceu desde o último encontro." }) + blocoEditor(d, "avancos") + blocoEditor(d, "permaneceu") +
        blocoEditor(d, "padroes", { desc: "O que ficou mais claro (padrão observado: descreve quando e como aparece, sem causa)." }));
      html += pil("direcionamento", unicoEditor(d, "foco_atual", candidatosUnicos.foco_atual) + blocoEditor(d, "direcionamentos", dirDesc) + blocoEditor(d, "desejos"));
      html += pil("estrategias", blocoEditor(d, "estrategias", estDesc) + TERRITORIOS.map(function (t) { return blocoEditor(d, t); }).join("") + blocoEditor(d, "acordos_compartilhados"));
      html += pil("proximo", blocoEditor(d, "observar") + unicoEditor(d, "proxima_etapa", candidatosUnicos.proxima_etapa));
    } else {
      html += pil("direcionamento", blocoEditor(d, "momento") + blocoEditor(d, "dores") + blocoEditor(d, "desejos") +
        blocoEditor(d, "padroes", { desc: "Padrão observado: descreve quando e como aparece, sem causa. Hipóteses ficam na área só profissional." }) +
        unicoEditor(d, "foco_atual", candidatosUnicos.foco_atual) + blocoEditor(d, "direcionamentos", dirDesc));
      html += pil("estrategias", blocoEditor(d, "estrategias", estDesc) + TERRITORIOS.map(function (t) { return blocoEditor(d, t); }).join("") + blocoEditor(d, "acordos_compartilhados"));
      html += pil("evolucao", blocoEditor(d, "observar") + blocoEditor(d, "avancos", { desc: "Primeira consulta: sem avanço confirmado, a paciente vê “ponto de partida”." }) +
        unicoEditor(d, "proxima_etapa", candidatosUnicos.proxima_etapa));
    }
    html += "</fieldset>";
    return html;
  }
  function htmlSoProfissional(d) {
    return '<div class="rd-so-profissional"><h4 class="rd-ed-pilar-tit">SÓ PARA A PROFISSIONAL <small>nada daqui vai para a paciente</small></h4>' + blocoEditor(d, "hipoteses", { desc: "Hipóteses de trabalho: ficam no registro profissional e nunca aparecem para a paciente, no PDF, no WhatsApp ou na emissão." }) + "</div>";
  }
  /* le os textos digitados do editor para a direcao */
  function lerEditor(raizEl, d) {
    if (!raizEl || !d) return;
    [].slice.call(raizEl.querySelectorAll("[data-rd-texto]")).forEach(function (t) {
      var p = t.getAttribute("data-rd-texto").split("|"), it = achar(d, p[0], p[1]);
      if (it) it.texto = t.value;
    });
    [].slice.call(raizEl.querySelectorAll("[data-rd-campo]")).forEach(function (t) {
      var p = t.getAttribute("data-rd-campo").split("|"), it = achar(d, p[0], p[1]);
      if (it) it[p[2]] = t.value;
    });
    var sis = {};
    [].slice.call(raizEl.querySelectorAll("[data-rd-sis]")).forEach(function (t) {
      var p = t.getAttribute("data-rd-sis").split("|"), k = p[0] + "|" + p[1];
      if (!sis[k]) sis[k] = []; if (t.checked) sis[k].push(p[2]);
    });
    Object.keys(sis).forEach(function (k) { var p = k.split("|"), it = achar(d, p[0], p[1]); if (it) it.sistemas = sis[k]; });
    var tipo = raizEl.querySelector('input[name="rd-tipo"]:checked'); if (tipo) d.tipo = tipo.value;
  }
  function achar(d, sec, id) {
    if (UNICOS.indexOf(sec) >= 0) return d[sec] && d[sec].id === id ? d[sec] : null;
    return (listaDe(d, sec) || []).filter(function (it) { return it.id === id; })[0] || null;
  }
  /* acoes do editor (devolve true se a direcao mudou) */
  function acao(d, el, raizEl) {
    var nome = el.getAttribute("data-rd-acao");
    var li = el.closest ? el.closest("[data-rd-id]") : null;
    var sec = li ? li.getAttribute("data-rd-sec") : el.getAttribute("data-rd-sec");
    var it = li ? achar(d, sec, li.getAttribute("data-rd-id")) : null;
    if (nome === "confirmar" && it) {
      if (!tem(it.texto)) return false;
      /* acompanhamento so e confirmado com a decisao registrada */
      if (sec === "acompanhamento_estrategias" && !it.decisao) { it._semDecisao = true; return true; }
      delete it._semDecisao;
      it.confirmado = true; if (it.tipo !== "hipotese") it.mostrar_paciente = true;
      if (sec === "direcionamentos" && (!it.status || it.status === "proposto")) it.status = "ativo";
      if (sec === "estrategias" && (!it.status || it.status === "proposta")) it.status = "acordada";
      return true;
    }
    if (nome === "desconfirmar" && it) { it.confirmado = false; it.mostrar_paciente = false; return true; }
    if (nome === "compartilhar" && it) { it.mostrar_paciente = !!el.checked && it.confirmado === true && it.tipo !== "hipotese"; return true; }
    if (nome === "excluir" && it) {
      if (UNICOS.indexOf(sec) >= 0) { d[sec] = null; return true; }
      if (it.sugestao) { it.descartado = true; it.confirmado = false; it.mostrar_paciente = false; }   // rastreabilidade: a sugestao recusada fica registrada
      else { var l = listaDe(d, sec); l.splice(l.indexOf(it), 1); }
      return true;
    }
    if (nome === "usar") {
      var c = (candidatosUnicos[sec] || [])[Number(el.getAttribute("data-rd-cand"))];
      if (!c) return false;
      d[sec] = Object.assign({}, c, { id: novoId(), confirmado: false, mostrar_paciente: false });
      return true;
    }
    if (nome === "adicionar") {
      var campo = raizEl && raizEl.querySelector('[data-rd-novo="' + sec + '"]');
      var txt = campo ? campo.value.trim() : "";
      if (!txt) return false;
      /* escrever e clicar em Adicionar e um ato explicito da nutricionista: o item entra confirmado */
      var novo = { id: novoId(), texto: txt.slice(0, 1000), origem: "nutricionista", sugestao: false, confirmado: true,
        mostrar_paciente: sec !== "hipoteses", descartado: false };
      if (sec === "padroes") novo.tipo = "padrao_observado";
      if (sec === "direcionamentos") { novo.territorio = "integrado"; novo.status = "ativo"; }
      if (sec === "estrategias") { novo.status = "acordada"; novo.responsavel = "Nutricionista"; }
      if (sec === "hipoteses") { novo.tipo = "hipotese"; novo.mostrar_paciente = false; listaDe(d, "padroes").push(novo); return true; }
      if (UNICOS.indexOf(sec) >= 0) { d[sec] = novo; return true; }
      listaDe(d, sec).push(novo);
      return true;
    }
    return false;
  }
  function definirCandidatos(S) {
    candidatosUnicos = { foco_atual: (S && S.foco_atual) || [], proxima_etapa: (S && S.proxima_etapa) || [] };
  }

  /* ---------- visao da paciente (template 5) ---------- */
  function origemPac(o) { return ORIGEM_PAC[o] ? '<small class="rd-de">' + esc(ORIGEM_PAC[o]) + "</small>" : ""; }
  function listaPac(itens, cls) {
    return '<ul class="rd-lista' + (cls ? " " + cls : "") + '">' + itens.map(function (x) { return "<li><p>" + esc(x.texto).replace(/\n/g, "<br>") + "</p>" + origemPac(x.origem) + "</li>"; }).join("") + "</ul>";
  }
  function secao(id, titulo, corpo, cls) {
    return '<section class="rd-secao' + (cls ? " " + cls : "") + '" id="rd-' + id + '" aria-labelledby="rd-t-' + id + '"><header class="rd-junto"><h3 id="rd-t-' + id + '">' + esc(titulo) + "</h3></header>" + corpo + "</section>";
  }
  function secaoLista(id, titulo, itens, cls, vazio) {
    if (!itens || !itens.length) return vazio ? secao(id, titulo, '<p class="rd-vazio">' + esc(vazio) + "</p>", cls) : "";
    return secao(id, titulo, listaPac(itens), cls);
  }
  function pilarPac(k, corpo) {
    if (!corpo) return "";
    return '<div class="rd-pilar rd-pilar-' + k + '"><div class="rd-pilar-cab"><span class="rd-pilar-tit">' + esc(PILAR[k].titulo) + '</span><span class="rd-pilar-sub">' + esc(PILAR[k].sub) + "</span></div>" + corpo + "</div>";
  }
  function territorios(dp) {
    return secao("cme", "Caminho Corpo · Mente · Espírito", '<div class="rd-cme">' + TERRITORIOS.map(function (t) {
      var it = ((dp[t] || {}).itens) || [];
      return '<div class="rd-territorio rd-terr-' + t + '"><h4>' + esc(NOME_TERR[t]) + '</h4><p class="rd-pergunta">' + esc(PERGUNTA[t]) + "</p>" +
        (it.length ? listaPac(it) : '<p class="rd-vazio">' + esc(VAZIO_TERR) + "</p>") + "</div>";
    }).join("") + "</div>");
  }
  function foco(dp, titulo) {
    var f = dp.foco_atual;
    return secao("foco", titulo, f ? '<p class="rd-foco-txt">' + esc(f.texto).replace(/\n/g, "<br>") + "</p>"
      : '<p class="rd-construcao">' + esc(EM_CONSTRUCAO) + " — o foco desta etapa ainda não foi confirmado.</p>", "rd-foco");
  }
  function dataCurta(iso) {
    var d = String(iso || "").slice(0, 10).split("-");
    return d.length === 3 ? d[2] + "/" + d[1] + "/" + d[0] : "";
  }
  function caminhoHtml(caminho, agora) {
    var etapas = (caminho || []).map(function (c, i) {
      return '<li class="rd-etapa"><span class="rd-etapa-data">' + esc(dataCurta(c.atendimento_em)) + " · etapa " + (i + 1) + "</span>" +
        (c.foco && c.foco.texto ? "<p><b>Foco:</b> " + esc(c.foco.texto) + "</p>" : '<p class="rd-vazio">Registro anterior ao formato com foco.</p>') +
        ((c.avancos || []).length ? "<p><b>Avanços:</b> " + esc(c.avancos.map(function (a) { return a.texto; }).join(" · ")) + "</p>" : "") + "</li>";
    });
    etapas.push('<li class="rd-etapa rd-etapa-agora"><span class="rd-etapa-data">' + esc(agora || "agora") + " · etapa " + (etapas.length + 1) + " (atual)</span></li>");
    return secao("caminho", "Seu caminho até aqui", '<ol class="rd-caminho">' + etapas.join("") + "</ol>");
  }
  function antesAgora(caminho, dp) {
    var ult = (caminho || [])[(caminho || []).length - 1];
    var antes = ult && ult.foco && ult.foco.texto ? "<p>" + esc(ult.foco.texto) + "</p><small class=\"rd-de\">foco do encontro de " + esc(dataCurta(ult.atendimento_em)) + "</small>" +
        ((ult.direcionamentos || []).length ? '<p class="rd-rot">Direcionamento</p>' + listaPac(ult.direcionamentos) : "") +
        ((ult.estrategias || []).length ? '<p class="rd-rot">Estratégias</p>' + listaPac(ult.estrategias) : "")
      : '<p class="rd-vazio">O encontro anterior não tem foco registrado neste formato.</p>';
    var agora = (dp.momento || []).length ? listaPac(dp.momento) : '<p class="rd-vazio">Ainda não registrado.</p>';
    return secao("antes-agora", "Antes / Agora", '<div class="rd-antes-agora"><div class="rd-antes"><h4>Antes</h4>' + antes + '</div><div class="rd-agora"><h4>Agora</h4>' + agora + "</div></div>");
  }
  /* snap: content_snapshot do Resultado (template 5) ou { direcao_paciente, caminho } da emissao RF-3.
     opts: { nome, data, profissional, detalhes (html dos Detalhes do mapa), previa } */
  /* DIRECIONAMENTOS DESTA FASE: titulo, territorio, por que, objetivo, status */
  function direcionamentosHtml(dp, titulo) {
    var ds = dp.direcionamentos || [];
    if (!ds.length) return "";
    return secao("direcionamentos", titulo, '<ol class="rd-dirs">' + ds.map(function (x) {
      return '<li class="rd-dir"><div class="rd-dir-topo"><b>' + esc(x.texto) + "</b>" + (x.territorio ? '<span class="rd-chip rd-chip-' + esc(x.territorio) + '">' + esc(TERRITORIO[x.territorio] || x.territorio) + "</span>" : "") + "</div>" +
        (x.porque ? '<p><span class="rd-rot">Por que</span> ' + esc(x.porque) + "</p>" : "") +
        (x.objetivo ? '<p><span class="rd-rot">Objetivo desta etapa</span> ' + esc(x.objetivo) + "</p>" : "") + "</li>";
    }).join("") + "</ol>", "rd-direcionamentos rd-grande");
  }
  /* ESTRATEGIAS COMBINADAS, agrupadas pelo direcionamento a que pertencem */
  /* Resultados gerados antes de 14/10 guardaram a CLASSIFICACAO da Holos IA no campo de frequencia: ela nao e mostrada */
  var CLASSIFICACAO_TECNICA = /^(Observação|Comportamental\/metodológica|Requer decisão profissional na Conduta)$/;
  function estrategiaCartao(x) {
    var linha = function (rot, v) { return v ? '<p><span class="rd-rot">' + esc(rot) + "</span> " + esc(v) + "</p>" : ""; };
    var freq = x.contexto && !CLASSIFICACAO_TECNICA.test(String(x.contexto).trim()) ? x.contexto : null;
    return '<li class="rd-est"><div class="rd-dir-topo"><b>' + esc(x.texto) + "</b>" + (x.status ? '<span class="rd-chip">' + esc(STATUS_EST[x.status] || x.status) + "</span>" : "") + "</div>" +
      linha("Para que", x.finalidade) + linha("O que você vai fazer", x.acao) + linha("O que observar", x.observar) + linha("Quando / com que frequência", freq) + linha("Prazo", x.prazo) + "</li>";
  }
  function estrategiasHtml(dp, titulo) {
    var es = dp.estrategias || [];
    if (!es.length) return "";
    var ds = dp.direcionamentos || [], usadas = {};
    var grupos = ds.map(function (d) {
      var dele = es.filter(function (x) { return x.direcionamento_id && x.direcionamento_id === d.id; });
      dele.forEach(function (x) { usadas[x.texto + "|" + x.id] = true; });
      return dele.length ? '<div class="rd-est-grupo"><p class="rd-est-dir">Para: ' + esc(d.texto) + '</p><ul class="rd-ests">' + dele.map(estrategiaCartao).join("") + "</ul></div>" : "";
    }).join("");
    var soltas = es.filter(function (x) { return !usadas[x.texto + "|" + x.id]; });
    return secao("estrategias", titulo, grupos + (soltas.length ? '<ul class="rd-ests">' + soltas.map(estrategiaCartao).join("") + "</ul>" : ""), "rd-estrategias rd-grande");
  }
  /* RETORNO: cada estrategia testada — o que aconteceu, o que voce percebeu, decisao */
  function acompanhamentoHtml(dp) {
    var as = dp.acompanhamento_estrategias || [];
    if (!as.length) return "";
    var linha = function (rot, v) { return v ? '<p><span class="rd-rot">' + esc(rot) + "</span> " + esc(v) + "</p>" : ""; };
    return secao("testadas", "Estratégias testadas", '<ul class="rd-ests">' + as.map(function (x) {
      return '<li class="rd-est rd-testada"><div class="rd-dir-topo"><b>' + esc(x.texto) + "</b>" + (x.decisao ? '<span class="rd-chip rd-decisao-' + esc(x.decisao) + '">Decisão: ' + esc(DECISAO[x.decisao] || x.decisao) + "</span>" : "") + "</div>" +
        linha("O que aconteceu", x.aplicou) + linha("O que facilitou", x.facilitou) + linha("O que dificultou", x.dificultou) + linha("O que você percebeu", x.percepcao) + linha("O que mudou", x.mudanca) + "</li>";
    }).join("") + "</ul>", "rd-acomp rd-grande");
  }
  /* 1a consulta: ACOMPANHAMENTO DA EVOLUCAO — o ponto de partida e como cada estrategia sera revisada */
  function evolucaoPrimeira(dp) {
    var es = dp.estrategias || [];
    var corpo = ((dp.avancos || []).length ? '<h4 class="rd-h4">O que já está mudando</h4>' + listaPac(dp.avancos) : '<p class="rd-vazio">' + esc(PONTO_DE_PARTIDA) + "</p>") +
      (es.length ? '<h4 class="rd-h4">Como vamos acompanhar</h4><p class="rd-texto-p">No próximo encontro vamos rever cada estratégia: o que você conseguiu aplicar, o que facilitou, o que dificultou e o que percebeu. Juntas, decidimos manter, ajustar, substituir ou concluir.</p>' +
        '<ul class="rd-lista">' + es.map(function (x) { return "<li><p>" + esc(x.texto) + (x.observar ? " — <i>observar: " + esc(x.observar) + "</i>" : "") + "</p></li>"; }).join("") + "</ul>" : "");
    return secao("evolucao", "Acompanhamento da evolução", corpo, "rd-evolucao rd-grande");
  }
  /* ======================= PDF / VISAO DA PACIENTE — REFINO FINAL (15/10) =======================
     O documento da paciente e o PRODUTO FINAL da consulta: simples, humano e facil de aplicar. Ordem fixa:
     1 Seu momento agora · 2 O que estamos compreendendo · 3 Foco desta fase · 4 O que vamos trabalhar agora (1-3) ·
     5 Seu plano ate a proxima consulta (+ Nesta fase, combinamos) · 6 Corpo · Mente · Espirito · 7 Ate o proximo encontro,
     observe (3-5) · 8 Proxima etapa · [9 Seu mapa HOLOS · 10 Ferramentas utilizadas: opts.detalhes, montado pelo Resultado HOLOS].
     Regra: o que nao ajuda a paciente a compreender, agir, observar ou acompanhar NAO entra (por que tecnico, classificacao,
     status, criterio de sucesso, origem, IDs). Tudo continua salvo no Resultado (visao profissional e Holos IA). */
  var LIM = { momento: 3, dores: 3, desejos: 2, padroes: 4, direcionamentos: 3, estrategias: 6, observar: 5, territorio: 2, combinamos: 6, avancos: 4, permaneceu: 3 };
  var EST_COMBINADA = { acordada: 1, em_teste: 1, manter: 1, ajustar: 1 };
  var PROXIMA_PADRAO = "Na próxima consulta vamos revisar o que aconteceu com essas estratégias e decidir o que vale manter, ajustar ou substituir.";
  function txt(t) { return esc(String(t || "").trim()).replace(/\n/g, "<br>"); }
  function primeiraFrase(t, max) {
    t = String(t || "").trim(); if (!t) return "";
    var m = t.match(/^[\s\S]*?[.!?](\s|$)/); var f = m ? m[0].trim() : t;
    max = max || 220; return f.length > max ? f.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : f;
  }
  function pfBloco(id, titulo, corpo, cls) {
    if (!corpo) return "";
    return '<section class="pf-bloco' + (cls ? " " + cls : "") + '" id="pf-' + id + '" aria-labelledby="pf-t-' + id + '"><h3 class="pf-tit" id="pf-t-' + id + '">' + esc(titulo) + "</h3>" + corpo + "</section>";
  }
  function pfLista(itens, n) {
    var l = (itens || []).filter(function (x) { return x && tem(x.texto); }).slice(0, n || 99);
    return l.length ? '<ul class="pf-lista">' + l.map(function (x) { return '<li><i aria-hidden="true">•</i><span>' + txt(x.texto) + "</span></li>"; }).join("") + "</ul>" : "";
  }
  function pfGrupo(rot, itens, n) { var l = pfLista(itens, n); return l ? '<div class="pf-grupo"><p class="pf-rot">' + esc(rot) + "</p>" + l + "</div>" : ""; }
  function pfMomento(dp) {
    return pfGrupo(dp.tipo === "retorno" ? "Como você chegou hoje" : "O que você trouxe", dp.momento, LIM.momento) + pfGrupo("O que mais incomoda", dp.dores, LIM.dores) + pfGrupo("O que você quer mudar", dp.desejos, LIM.desejos);
  }
  function pfCompreendendo(dp) {
    var l = pfLista(dp.padroes, LIM.padroes);
    return l ? '<p class="pf-intro">Na consulta apareceram alguns pontos que parecem acontecer juntos. Nesta fase, vamos observar como eles se relacionam no seu dia a dia.</p>' + l : "";
  }
  function pfFoco(dp, titulo) {
    var f = dp.foco_atual;
    return pfBloco("foco", titulo, f ? '<p class="pf-foco-txt">' + txt(f.texto) + "</p>" : '<p class="pf-vazio">O foco desta fase ainda vai ser definido com a sua nutricionista.</p>', "pf-foco");
  }
  function pfDirecionamentos(dp, titulo) {
    var ds = (dp.direcionamentos || []).slice(0, LIM.direcionamentos);
    if (!ds.length) return "";
    return pfBloco("trabalhar", titulo, '<div class="pf-dirs">' + ds.map(function (x) {
      var frase = primeiraFrase(x.objetivo) || primeiraFrase(x.porque);
      return '<div class="pf-dir"><p class="pf-dir-tit">' + txt(x.texto) + "</p>" + (frase ? '<p class="pf-dir-txt">' + esc(frase) + "</p>" : "") + "</div>";
    }).join("") + "</div>");
  }
  function freqDe(x) { return x.contexto && !CLASSIFICACAO_TECNICA.test(String(x.contexto).trim()) ? x.contexto : null; }
  function pfEstrategia(x) {
    var linha = function (rot, v) { return tem(v) ? '<div class="pf-campo"><span class="pf-campo-rot">' + esc(rot) + '</span><p>' + txt(v) + "</p></div>" : ""; };
    return '<li class="pf-card"><p class="pf-card-tit">' + txt(x.texto) + "</p>" +
      linha("O que fazer", x.acao) + linha("Quando / com que frequência", freqDe(x)) + linha("O que observar", x.observar) + linha("Até quando", x.prazo) + "</li>";
  }
  function pfPlano(dp, titulo) {
    var es = (dp.estrategias || []).slice(0, LIM.estrategias);
    var plano = es.length ? pfBloco("plano", titulo, '<ul class="pf-cards">' + es.map(pfEstrategia).join("") + "</ul>", "pf-plano") : "";
    /* "Nesta fase, combinamos": so o que foi ACORDADO (estrategia acordada/em teste/mantida/ajustada e acordos compartilhados) —
       nunca uma proposta nova da Holos IA como se ja estivesse combinada */
    var comb = (dp.estrategias || []).filter(function (x) { return EST_COMBINADA[x.status]; }).map(function (x) { return { texto: x.acao ? primeiraFrase(x.acao, 160) : x.texto }; })
      .concat((dp.acordos_compartilhados || []).map(function (a) { return { texto: a.texto }; }));
    var vistos = {}; comb = comb.filter(function (c) { var k = String(c.texto || "").toLowerCase(); if (!k || vistos[k]) return false; vistos[k] = 1; return true; });
    return plano + (comb.length ? pfBloco("combinamos", "Nesta fase, combinamos", pfLista(comb, LIM.combinamos), "pf-combinamos") : "");
  }
  function pfTerritorios(dp) {
    return pfBloco("cme", "Corpo · Mente · Espírito", '<div class="pf-cme">' + TERRITORIOS.map(function (t) {
      var it = ((dp[t] || {}).itens) || [];
      return '<div class="pf-terr pf-terr-' + t + '"><p class="pf-terr-nome">' + esc(NOME_TERR[t]) + '</p><p class="pf-terr-perg">' + esc(PERGUNTA[t]) + "</p>" +
        (it.length ? pfLista(it, LIM.territorio) : '<p class="pf-vazio">' + esc(VAZIO_TERR) + "</p>") + "</div>";
    }).join("") + "</div>");
  }
  function pfObservar(dp) {
    var l = pfLista(dp.observar, LIM.observar);
    return l ? pfBloco("observar", "Até o próximo encontro, observe", l, "pf-observar") : "";
  }
  function pfProxima(dp) {
    var t = dp.proxima_etapa && tem(dp.proxima_etapa.texto) ? dp.proxima_etapa.texto : PROXIMA_PADRAO;
    return pfBloco("proxima", "Próxima etapa", '<p class="pf-proxima">' + txt(t) + '</p><p class="pf-nota">O plano pode evoluir: ele é revisto a cada encontro.</p>', "pf-proxima-bloco");
  }
  /* RETORNO: o que mudou, o que foi possivel fazer, o que manter/ajustar — sem repetir o primeiro documento */
  function pfAcompanhamento(dp) {
    var as = dp.acompanhamento_estrategias || [];
    if (!as.length) return "";
    var linha = function (rot, v) { return tem(v) ? '<div class="pf-campo"><span class="pf-campo-rot">' + esc(rot) + '</span><p>' + txt(v) + "</p></div>" : ""; };
    return pfBloco("testadas", "O que foi possível fazer", '<ul class="pf-cards">' + as.map(function (x) {
      return '<li class="pf-card"><p class="pf-card-tit">' + txt(x.texto) + (x.decisao ? ' <span class="pf-decisao">Decisão: ' + esc(DECISAO[x.decisao] || x.decisao) + "</span>" : "") + "</p>" +
        linha("O que aconteceu", x.aplicou) + linha("O que ajudou", x.facilitou) + linha("O que dificultou", x.dificultou) + linha("O que você percebeu", x.percepcao || x.mudanca) + "</li>";
    }).join("") + "</ul>");
  }
  /* retorno: o que manter / ajustar / substituir / concluir, numa linha por decisao */
  function pfDecisoes(dp) {
    var as = dp.acompanhamento_estrategias || [], ord = ["manter", "ajustar", "substituir", "concluir", "encerrar"];
    var rot = { manter: "Vamos manter", ajustar: "Vamos ajustar", substituir: "Vamos substituir", concluir: "Concluído", encerrar: "Encerrado" };
    var h = ord.map(function (d) { var l = as.filter(function (x) { return x.decisao === d; }).map(function (x) { return { texto: x.texto }; }); return pfGrupo(rot[d], l); }).join("");
    return h ? pfBloco("decisoes", "O que manter e o que ajustar", h) : "";
  }
  function htmlPaciente(dp, caminho, opts) {
    opts = opts || {};
    dp = dp || projecaoPaciente(null);
    var retorno = dp.tipo === "retorno";
    var html = '<header class="rh-doc-cab rd-cab pf-cab"><span class="eyebrow">Resultado HOLOS</span><h2>' + (retorno ? "Seu acompanhamento" : "Sua direção nesta fase") +
      (opts.nome ? " &middot; " + esc(opts.nome) : "") + "</h2>" +
      (opts.data || opts.profissional ? '<p class="rh-doc-sub">' + (opts.data ? "Consulta de " + esc(opts.data) : "") + (opts.profissional ? " · com " + esc(opts.profissional) : "") + "</p>" : "") +
      (opts.previa ? '<p class="rh-previa-selo" role="status">PRÉVIA — ainda não salva. Nada aqui foi registrado.</p>' : "") +
      (dp.foco_atual ? "" : '<p class="rd-construcao rd-construcao-selo" role="status">' + esc(EM_CONSTRUCAO) + "</p>") + "</header>";
    if (retorno) {
      var agora = pfMomento(dp), ult = (caminho || [])[(caminho || []).length - 1];
      var antes = ult && ult.foco && tem(ult.foco.texto) ? pfGrupo("Foco do encontro anterior" + (ult.atendimento_em ? " (" + dataCurta(ult.atendimento_em) + ")" : ""), [{ texto: ult.foco.texto }]) : "";
      html += pfBloco("mudou", "O que mudou desde o último encontro", (antes + pfGrupo("Avanços", dp.avancos, LIM.avancos) + pfGrupo("O que ainda pesa", dp.permaneceu, LIM.permaneceu) + agora) ||
        '<p class="pf-vazio">Ainda não registrado.</p>');
      html += pfAcompanhamento(dp) + pfDecisoes(dp);
      html += pfBloco("compreendendo", "O que estamos compreendendo", pfCompreendendo(dp));
      html += pfFoco(dp, "Novo foco desta fase");
      html += pfDirecionamentos(dp, "O que vamos trabalhar agora");
      html += pfPlano(dp, "Seu plano até a próxima consulta");
    } else {
      html += pfBloco("momento", "Seu momento agora", pfMomento(dp));
      html += pfBloco("compreendendo", "O que estamos compreendendo", pfCompreendendo(dp));
      html += pfFoco(dp, "Foco desta fase");
      html += pfDirecionamentos(dp, "O que vamos trabalhar agora");
      html += pfPlano(dp, "Seu plano até a próxima consulta");
    }
    html += pfTerritorios(dp) + pfObservar(dp) + pfProxima(dp);
    if (opts.detalhes) html += opts.detalhes;
    return '<div class="pf-doc">' + html + "</div>";
  }

  /* OS CINCO SISTEMAS (visao da paciente, template 5): explicam POR QUE OLHAMOS. Prioritario: o que apareceu, o que vale
     observar, como cuidar deste eixo e, quando a nutricionista ligou, o direcionamento e as estrategias PESSOAIS (da direcao,
     nunca da nota). Nao prioritario: compacto, sem "menos marcadores", sem linguagem de saude perfeita. A nota e detalhe. */
  function notaTxt(v) { return v === null || v === undefined || isNaN(Number(v)) ? "—" : Number(v).toFixed(1).replace(".", ","); }
  function htmlCincoSistemas(sistemas, fechs, dp) {
    dp = dp || {};
    var prioridade = {}, fechDe = {};
    (fechs || []).forEach(function (f) { if (!f) return; fechDe[f.sistema] = f; if (f.resultado && f.resultado.prioridade) prioridade[f.sistema] = f.resultado.posicao; });
    /* definicao curta da paciente: a mesma ja aprovada para a paciente ("Este eixo reune ...", do fechamento do sistema);
       sem fechamento, a 1a frase do texto publico */
    var definicao = function (s) {
      var f = fechDe[s.sistema], SF = raiz.SistemasFechamento;
      if (f && f.organiza) return SF && SF.definicaoPaciente ? SF.definicaoPaciente(f.organiza) : f.organiza;
      /* exames nao fazem parte do HOLOSCAN (so ficam guardados em Documentos): definicao que cite exame/laboratorio nao vai */
      var t = s.texto_publico ? String(s.texto_publico).split(/(?<=\.)\s/)[0] : "";
      return /exame|laborat/i.test(t) ? "" : t;
    };
    var ordem = (sistemas || []).slice().sort(function (a, b) {
      var pa = prioridade[a.sistema] || 99, pb = prioridade[b.sistema] || 99; return pa - pb; });
    var cartao = function (s) {
      var base = CUIDADO_EIXOS[s.sistema] || {}, pos = prioridade[s.sistema];
      var nome = String(s.nome || s.sistema).replace(/^Sistema\s+/i, "");
      var nota = '<p class="rd-sis-nota">Nota neste eixo nesta aplicação: ' + esc(notaTxt(s.nota)) + " de 10 · a nota organiza as suas respostas; não indica doença nem saúde.</p>";
      if (!pos) {
        return '<article class="rd-sis rd-sis-compacto" data-rd-sistema="' + esc(s.sistema) + '"><header><h4>' + esc(nome) + '</h4><span class="rd-sis-rotulo">' + esc(NAO_PRIORITARIO) + "</span></header>" +
          (definicao(s) ? '<p class="rd-sis-def">' + esc(definicao(s)) + "</p>" : "") +
          (base.cuidar ? '<p><span class="rd-rot">Como cuidar deste eixo</span> ' + esc(base.cuidar) + "</p>" : "") +
          (base.limite ? '<p class="rd-sis-limite">' + esc(base.limite) + "</p>" : "") + nota + "</article>";
      }
      var dirs = (dp.direcionamentos || []).filter(function (d) { return (d.sistemas || []).indexOf(s.sistema) >= 0; });
      var ids = dirs.map(function (d) { return d.id; });
      var ests = (dp.estrategias || []).filter(function (e) { return e.direcionamento_id && ids.indexOf(e.direcionamento_id) >= 0; });
      var apareceu = (s.dominantes || []).slice(0, 3);
      return '<article class="rd-sis rd-sis-prioritario" data-rd-sistema="' + esc(s.sistema) + '"><header><h4>' + esc(nome) + '</h4><span class="rd-sis-rotulo rd-sis-foco">' +
          (pos === 1 ? "Área principal para aprofundar" : "Área para aprofundar nesta etapa") + "</span></header>" +
        '<div class="rd-sis-bloco"><h5>O que apareceu</h5>' + (apareceu.length ? '<p class="rd-texto-p">Algumas das respostas que mais pesaram neste eixo nesta aplicação:</p><ul class="rd-lista">' +
          apareceu.map(function (q) { return "<li><p>" + esc(q.enunciado) + "</p></li>"; }).join("") + "</ul>" : '<p class="rd-vazio">Sem respostas de destaque registradas.</p>') + "</div>" +
        '<div class="rd-sis-bloco"><h5>O que vale observar</h5><p class="rd-texto-p">' + esc((base.observar || []).join("; ")) + ".</p></div>" +
        '<div class="rd-sis-bloco"><h5>Como cuidar deste eixo</h5><p class="rd-texto-p">' + esc(base.cuidar || "") + '</p><p class="rd-sis-limite">' + esc(base.limite || "") + "</p></div>" +
        (dirs.length ? '<div class="rd-sis-bloco rd-sis-voce"><h5>Para você, nesta fase</h5>' +
          dirs.map(function (d) { return '<p><span class="rd-rot">Direcionamento</span> ' + esc(d.texto) + "</p>"; }).join("") +
          (ests.length ? '<p class="rd-rot">Estratégias</p><ul class="rd-lista">' + ests.map(function (e) { return "<li><p>" + esc(e.texto) + "</p></li>"; }).join("") + "</ul>" : "") + "</div>" : "") +
        nota + "</article>";
    };
    return '<section class="rd-secao rd-cinco rd-grande" id="rd-cinco" aria-labelledby="rd-t-cinco"><header class="rd-junto"><h3 id="rd-t-cinco">Os cinco sistemas</h3></header>' +
      '<p class="rh-intro">Os sistemas explicam por que olhamos para certas áreas. O que vamos fazer está nos direcionamentos e nas estratégias, no começo deste documento.</p>' +
      ordem.map(cartao).join("") + "</section>";
  }


  /* ---------- visao profissional: o que foi montado, com estado e origem ---------- */
  function htmlProfissional(d, dp) {
    d = normalizar(d);
    var item = function (it) {
      return '<li class="rd-pro-item rd-ed-' + estadoDe(it) + '">' + chipEstado(it) + (it.sugestao && it.confirmado ? ' <span class="rd-sug-selo rd-sug-origem">veio de sugestão do sistema</span>' : "") +
        "<p>" + esc(it.texto) + '</p><small class="rd-origem">' + esc(ORIGEM_PROF[it.origem] || it.origem) + (it.ref ? " · " + esc(rotRef(it.ref, it.origem)) : "") +
        (it.sugestao && it.texto_sugerido && it.texto_sugerido !== it.texto ? " · editado a partir da sugestão" : "") + "</small>" + extrasPro(it) + "</li>";
    };
    var extrasPro = function (it) {
      var p = [];
      if (it.territorio) p.push("Território: " + (TERRITORIO[it.territorio] || it.territorio));
      if (it.porque) p.push("Por que: " + it.porque);
      if (it.objetivo) p.push("Objetivo: " + it.objetivo);
      if (it.sistemas && it.sistemas.length) p.push("Sistemas: " + it.sistemas.map(function (c) { return (SISTEMAS.filter(function (x) { return x[0] === c; })[0] || [c, c])[1]; }).join(", "));
      if (it.direcionamento_id) { var dd = (d.direcionamentos || []).filter(function (x) { return x.id === it.direcionamento_id; })[0]; p.push("Direcionamento: " + (dd ? dd.texto : it.direcionamento_id)); }
      [["finalidade", "Para que"], ["acao", "O que fará"], ["observar", "Observar"], ["contexto", "Contexto"], ["prazo", "Prazo"], ["responsavel", "Definida por"],
       ["aplicou", "Aconteceu"], ["facilitou", "Facilitou"], ["dificultou", "Dificultou"], ["percepcao", "Percepção da paciente"], ["observacao", "Observação da nutricionista (só profissional)"], ["mudanca", "Mudança"]]
        .forEach(function (c) { if (it[c[0]]) p.push(c[1] + ": " + it[c[0]]); });
      if (it.status) p.push("Status: " + (STATUS_EST[it.status] || STATUS_DIR[it.status] || it.status));
      if (it.decisao) p.push("Decisão: " + (DECISAO[it.decisao] || it.decisao));
      if (it.anterior) p.push("Continua a estratégia " + it.anterior.estrategia_id + " do Resultado " + String(it.anterior.resultado_id).slice(0, 8));
      if (it.estrategia) p.push("Estratégia acompanhada: " + it.estrategia.estrategia_id + " do Resultado " + String(it.estrategia.resultado_id).slice(0, 8));
      return p.length ? '<ul class="rd-pro-extras">' + p.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "";
    };
    var bloco = function (titulo, itens) {
      itens = (itens || []).filter(function (it) { return it && !it.descartado; });
      return itens.length ? '<div class="rd-pro-bloco"><h5>' + esc(titulo) + '</h5><ul class="rd-pro-lista">' + itens.map(item).join("") + "</ul></div>" : "";
    };
    var desc = todos(d).filter(function (it) { return it.descartado; }).length;
    var pil = function (k, corpo) { return corpo ? '<div class="rd-pro-pilar"><h4>' + esc(PILAR[k].titulo) + "</h4>" + corpo + "</div>" : ""; };
    var html = '<section class="rh-secao rd-pro" aria-labelledby="rd-t-pro"><h3 id="rd-t-pro">Resultado para a paciente — o que foi montado</h3>' +
      '<p class="rh-nota-tec">Cada item com estado (sugestão / confirmado / compartilhado), origem e referência. A paciente vê só o que está COMPARTILHADO; hipóteses nunca. Encontro: ' + (d.tipo === "retorno" ? "retorno" : "primeira consulta") + ".</p>" +
      (focoConfirmado(d) ? "" : '<p class="rd-construcao">' + esc(EM_CONSTRUCAO) + "</p>");
    html += pil("direcionamento", bloco(SECAO.momento[1], d.momento) + bloco(SECAO.dores[1], d.dores) + bloco(SECAO.desejos[1], d.desejos) +
      bloco(SECAO.padroes[1], d.padroes.filter(function (it) { return it.tipo !== "hipotese"; })) + bloco("Foco atual", d.foco_atual ? [d.foco_atual] : []) +
      bloco(SECAO.direcionamentos[1], d.direcionamentos));
    html += pil("estrategias", bloco(SECAO.estrategias[1], d.estrategias) + TERRITORIOS.map(function (t) { return bloco(NOME_TERR[t] + " — " + PERGUNTA[t], d[t].itens); }).join("") +
      bloco(SECAO.acordos_compartilhados[1], d.acordos_compartilhados));
    html += pil("evolucao", bloco(SECAO.acompanhamento_estrategias[1], d.acompanhamento_estrategias) + bloco(SECAO.avancos[1], d.avancos) + bloco(SECAO.permaneceu[1], d.permaneceu) + bloco(SECAO.observar[1], d.observar) +
      bloco(SECAO.proxima_etapa[1], d.proxima_etapa ? [d.proxima_etapa] : []));
    var hip = d.padroes.filter(function (it) { return it.tipo === "hipotese" && !it.descartado; });
    html += '<div class="rd-pro-pilar rd-so-profissional"><h4>Só para a profissional</h4>' + (hip.length ? bloco("Hipóteses", hip) : '<p class="rh-vazio">Nenhuma hipótese registrada.</p>') + "</div>";
    if (desc) html += '<p class="rh-nota-tec">' + desc + (desc === 1 ? " sugestão recusada" : " sugestões recusadas") + " (ficam no registro, nunca na visão da paciente).</p>";
    return html + "</section>";
  }

  /* ---------- WhatsApp ---------- */
  /* com direcionamento compartilhado: cita o principal direcionamento; sem ele, o foco (nunca hipotese nem texto interno) */
  function mensagemWhatsApp(nome, data, foco, direcionamento) {
    var primeiro = String(nome || "").trim().split(/\s+/)[0] || "tudo bem";
    var limpo = function (t) { return String(t || "").trim().replace(/[.]+$/, ""); };
    /* texto aprovado (ajuste final T5); sem direcionamento compartilhado, o foco atual ocupa o lugar dele */
    return "Olá, " + primeiro + "! Segue seu Resultado HOLOS de " + (data || "hoje") +
      ". Nesta fase, nosso principal direcionamento é: " + limpo(tem(direcionamento) ? direcionamento : foco) +
      ". No documento estão as estratégias que combinamos, o que observar até o próximo encontro e como vamos acompanhar a evolução.";
  }

  var api = {
    VERSAO: VERSAO, LISTAS: LISTAS, TERRITORIOS: TERRITORIOS, UNICOS: UNICOS, PERGUNTA: PERGUNTA, VAZIO_TERR: VAZIO_TERR, PONTO_DE_PARTIDA: PONTO_DE_PARTIDA,
    EM_CONSTRUCAO: EM_CONSTRUCAO, ESTADO: ESTADO, PILAR: PILAR, SECAO: SECAO, PROIBIDOS: PROIBIDOS, ORIGEM_PAC: ORIGEM_PAC,
    nova: nova, normalizar: normalizar, todos: todos, paraGravar: paraGravar, estadoDe: estadoDe, focoConfirmado: focoConfirmado,
    projecaoPaciente: projecaoPaciente, termosFora: termosFora, avisos: avisos, sugestoes: sugestoes, mesclar: mesclar, chave: chave,
    htmlEditor: htmlEditor, htmlSoProfissional: htmlSoProfissional, lerEditor: lerEditor, acao: acao, definirCandidatos: definirCandidatos,
    candidatos: function () { return candidatosUnicos; },
    htmlPaciente: htmlPaciente, htmlProfissional: htmlProfissional, mensagemWhatsApp: mensagemWhatsApp, htmlCincoSistemas: htmlCincoSistemas,
    CUIDADO_EIXOS: CUIDADO_EIXOS, NAO_PRIORITARIO: NAO_PRIORITARIO, EXTRAS: EXTRAS, PUBLICAS: PUBLICAS, STATUS_EST: STATUS_EST, DECISAO: DECISAO, TERRITORIO: TERRITORIO
  };
  raiz.ResultadoDirecao = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

// ---- shared/holos-ai-contrato.js (embutido) ----
/* ===========================================================================
   HOLOS AI — CONTRATO DO JSON CANONICO (HOLOS_AI_RESULT schema_version 1)
   ===========================================================================

   A HOLOS AI (agente externo, HOLOS-AI-GPT 1.2) devolve um texto legivel e um
   JSON canonico (docs/v1/holos-ai-gpt/06-SCHEMA-HOLOS-AI-RESULT.json). Este
   modulo e a fonte unica, no navegador e nos testes, de:

     extrairJson(texto)   o JSON do que foi colado (bloco ```json``` ou o texto inteiro)
     validar(obj)         { erros, avisos } — erros impedem importar (nada e salvo);
                          o servidor confere o mesmo (migration 20261023100000)
     explodir(obj)        um item por elemento de cada secao (nunca um textao unico)
     paraDirecao(...)     o que a nutricionista CONFIRMOU vira itens do Resultado HOLOS
                          (template 5), com origem "holos_ai" e referencia ao item importado

   Segregacao: secoes "so profissional" (hipoteses, alertas, fontes, raciocinio,
   pontos para aprofundar...) nunca podem ser marcadas para a paciente — o
   servidor recusa. Nada importado vai para a paciente sem confirmacao + compartilhar.
   Este modulo nao calcula nada do HOLOSCAN, nao escolhe ferramenta e nao muda PP-V1.
   =========================================================================== */

(function (raiz) {
  "use strict";

  var SCHEMA_VERSION = 1;
  var TEXTO_MAX = 400000;       // texto colado
  var STR_MAX = 5000;           // cada campo de texto
  var LISTA_MAX = 60;           // itens por secao
  var NAO_APROFUNDADO = "Ainda não aprofundado nesta etapa.";
  var MANTER_OBS = "MANTER EM OBSERVAÇÃO — SUGERIDO";
  var DECISOES_RETORNO = ["MANTER", "AJUSTAR", "SUBSTITUIR", "CONCLUIR", "ENCERRAR"];
  var CLASSIFICACOES = { observacao: "Observação", comportamental_metodologica: "Comportamental/metodológica",
    requer_decisao_profissional_na_conduta: "Requer decisão profissional na Conduta" };
  var TERRITORIOS = ["Corpo", "Mente", "Espírito"];
  var RE_REGRA = /^REC-(FUN|AIN|MET|DTL|MEE)-0[1-6]$/;

  /* todas obrigatorias (fechamento 14/10/2026: meta, entrada, ferramentas_ja_aplicadas e plano_acompanhamento tambem;
     vazias quando nao houver material). Continua schema_version 1: nenhum campo mudou de nome ou de tipo. */
  var OBRIGATORIAS = ["schema_version", "tipo", "meta", "entrada", "sintese_integrada", "o_que_apareceu", "convergencias",
    "padroes_observados", "pontos_para_aprofundar", "sistemas_prioritarios", "ferramentas_ja_aplicadas", "ferramentas_recomendadas",
    "direcionamentos", "estrategias", "corpo", "mente", "espirito", "o_que_observar", "plano_acompanhamento",
    "roteiro_proxima_consulta", "proxima_etapa", "rascunho_paciente", "alertas_profissionais", "fontes_utilizadas"];
  var SEC_TEXTO = ["sintese_integrada", "proxima_etapa", "rascunho_paciente"];
  var SEC_TERR = ["corpo", "mente", "espirito"];
  var SEC_LISTA = ["o_que_apareceu", "convergencias", "padroes_observados", "pontos_para_aprofundar", "sistemas_prioritarios",
    "ferramentas_ja_aplicadas", "ferramentas_recomendadas", "direcionamentos", "estrategias", "o_que_observar",
    "plano_acompanhamento", "roteiro_proxima_consulta", "alertas_profissionais", "fontes_utilizadas"];
  var OPCIONAIS = [];
  /* ordem de exibicao na revisao */
  var SECOES = ["sintese_integrada", "o_que_apareceu", "convergencias", "padroes_observados", "pontos_para_aprofundar",
    "sistemas_prioritarios", "ferramentas_ja_aplicadas", "ferramentas_recomendadas", "direcionamentos", "estrategias",
    "corpo", "mente", "espirito", "o_que_observar", "plano_acompanhamento", "roteiro_proxima_consulta", "proxima_etapa",
    "rascunho_paciente", "alertas_profissionais", "fontes_utilizadas"];
  /* SO PROFISSIONAL: raciocinio, hipoteses, alertas, fontes, pontos para aprofundar, leitura do HOLOSCAN e das ferramentas,
     roteiro da proxima consulta e o rascunho de mensagem (referencia, nunca enviado sozinho). Nunca vao para a paciente. */
  var SO_PROFISSIONAL = ["sintese_integrada", "o_que_apareceu", "convergencias", "pontos_para_aprofundar", "sistemas_prioritarios",
    "ferramentas_ja_aplicadas", "ferramentas_recomendadas", "roteiro_proxima_consulta", "rascunho_paciente",
    "alertas_profissionais", "fontes_utilizadas"];
  var TITULO = {
    sintese_integrada: "Síntese integrada", o_que_apareceu: "O que apareceu", convergencias: "Convergências e conflitos",
    padroes_observados: "Padrões observados", pontos_para_aprofundar: "Pontos para aprofundar", sistemas_prioritarios: "Sistemas prioritários",
    ferramentas_ja_aplicadas: "Ferramentas já aplicadas", ferramentas_recomendadas: "Ferramentas recomendadas (PP-V1)",
    direcionamentos: "Direcionamentos", estrategias: "Estratégias", corpo: "Corpo", mente: "Mente", espirito: "Espírito",
    o_que_observar: "O que observar", plano_acompanhamento: "Plano de acompanhamento", roteiro_proxima_consulta: "Roteiro da próxima consulta",
    proxima_etapa: "Próxima etapa", rascunho_paciente: "Rascunho de mensagem para a paciente", alertas_profissionais: "Alertas profissionais",
    fontes_utilizadas: "Fontes utilizadas"
  };
  /* termos que nao podem aparecer AFIRMADOS no rascunho para a paciente: so aviso (o rascunho nunca e enviado sozinho) */
  var PROIBIDOS_PACIENTE = ["candid", "disbiose", "resistência à insulina", "diabetes", "tireoide", "inflamação sistêmica", "acidose",
    "toxina", "detox", "hipótese", "sistema metabólico", "sistema fúngico", "sistema ácido", "sistema detox", "sistema mental"];

  function ehObj(x) { return x !== null && typeof x === "object" && !Array.isArray(x); }
  function ehTexto(x) { return typeof x === "string"; }
  function cheio(x) { return typeof x === "string" && x.trim() !== ""; }
  function copia(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }

  /* ---------- 1. o JSON colado -------------------------------------------- */
  /* Aceita o JSON puro ou a resposta inteira do GPT: usa o PRIMEIRO bloco cercado por ``` (```json ... ```).
     A mesma regra roda no servidor (holos_ai_extrair). */
  function trechoJson(texto) {
    var t = String(texto === null || texto === undefined ? "" : texto).trim();
    var i = t.indexOf("```");
    if (i < 0) return t;
    var resto = t.slice(i + 3);
    var j = resto.indexOf("```");
    var dentro = j < 0 ? resto : resto.slice(0, j);
    dentro = dentro.replace(/^\s*json\b/i, "");
    return dentro.trim();
  }
  function extrairJson(texto) {
    if (!cheio(texto)) return { json: null, erro: "Cole o JSON HOLOS_AI_RESULT antes de validar." };
    if (String(texto).length > TEXTO_MAX) return { json: null, erro: "Texto grande demais (limite de " + TEXTO_MAX + " caracteres)." };
    var t = trechoJson(texto);
    try {
      var j = JSON.parse(t);
      if (!ehObj(j)) return { json: null, erro: "O conteúdo colado não é um objeto JSON (precisa começar com { e terminar com })." };
      return { json: j, erro: null };
    } catch (e) {
      return { json: null, erro: "JSON inválido: " + String(e && e.message || e).replace(/^JSON\.parse: /, "") + ". Confira se o bloco foi copiado inteiro (do { inicial ao } final)." };
    }
  }

  /* ---------- 2. validacao (mesmas regras de holos_ai_problemas no servidor) ---------- */
  function validar(r) {
    var erros = [], avisos = [];
    var E = function (m) { erros.push(m); };
    if (!ehObj(r)) return { erros: ["o resultado não é um objeto JSON"], avisos: [] };
    if (!("schema_version" in r)) E('falta a chave "schema_version"');
    else if (r.schema_version !== SCHEMA_VERSION) {
      return { erros: ["schema_version " + JSON.stringify(r.schema_version) + " não é compatível: este HoloHacking importa schema_version 1"], avisos: [], incompativel: true };
    }
    OBRIGATORIAS.forEach(function (k) { if (!(k in r)) E('falta a chave "' + k + '"'); });
    if ("tipo" in r && ["primeira_consulta", "retorno"].indexOf(r.tipo) < 0) E('tipo deve ser "primeira_consulta" ou "retorno"');
    ["meta", "entrada"].forEach(function (k) { if (k in r && !ehObj(r[k])) E('"' + k + '" deve ser objeto (pode ser vazio)'); });
    SEC_TEXTO.forEach(function (k) { if (k in r && !ehTexto(r[k])) E('"' + k + '" deve ser texto'); else if (k in r && r[k].length > STR_MAX) E('"' + k + '" passa de ' + STR_MAX + " caracteres"); });
    SEC_LISTA.forEach(function (k) {
      if (!(k in r)) return;
      if (!Array.isArray(r[k])) return E('"' + k + '" deve ser lista');
      if (r[k].length > LISTA_MAX) E('"' + k + '" tem mais de ' + LISTA_MAX + " itens");
      r[k].forEach(function (x, i) {
        if (!ehTexto(x) && !ehObj(x)) E(k + "[" + i + "] deve ser texto ou objeto");
        var longo = ehTexto(x) ? x.length > STR_MAX : ehObj(x) && Object.keys(x).some(function (c) { return ehTexto(x[c]) && x[c].length > STR_MAX; });
        if (longo) E(k + "[" + i + "] tem texto com mais de " + STR_MAX + " caracteres");
      });
    });
    ["o_que_apareceu", "convergencias", "pontos_para_aprofundar", "sistemas_prioritarios", "ferramentas_ja_aplicadas", "ferramentas_recomendadas",
      "direcionamentos", "estrategias", "roteiro_proxima_consulta", "alertas_profissionais"].forEach(function (k) {
      if (Array.isArray(r[k])) r[k].forEach(function (x, i) { if (!ehObj(x)) E(k + "[" + i + "] deve ser objeto"); });
    });
    ["padroes_observados", "o_que_observar", "plano_acompanhamento", "fontes_utilizadas"].forEach(function (k) {
      if (Array.isArray(r[k])) r[k].forEach(function (x, i) { if (!ehTexto(x)) E(k + "[" + i + "] deve ser texto"); });
    });
    var lista = function (k) { return Array.isArray(r[k]) ? r[k].filter(ehObj) : []; };
    lista("o_que_apareceu").forEach(function (x, i) { if (!cheio(x.texto)) E("o_que_apareceu[" + i + "]: falta texto"); });
    lista("convergencias").forEach(function (x, i) {
      if (["convergencia", "conflito"].indexOf(x.tipo) < 0) E("convergencias[" + i + "]: tipo deve ser convergencia ou conflito");
      if (!cheio(x.texto)) E("convergencias[" + i + "]: falta texto");
    });
    lista("pontos_para_aprofundar").forEach(function (x, i) {
      if (["questao", "hipotese"].indexOf(x.tipo) < 0) E("pontos_para_aprofundar[" + i + "]: tipo deve ser questao ou hipotese");
      if (!cheio(x.texto)) E("pontos_para_aprofundar[" + i + "]: falta texto");
      if (x.tipo === "hipotese" && x.so_profissional !== true) E("pontos_para_aprofundar[" + i + "]: hipótese deve ter so_profissional = true");
    });
    lista("sistemas_prioritarios").forEach(function (x, i) { if (!cheio(x.sistema)) E("sistemas_prioritarios[" + i + "]: falta o sistema"); });
    lista("alertas_profissionais").forEach(function (x, i) {
      if (["metodologico", "avaliacao_profissional", "exames", "conduta", "catalogo", "informacao_insuficiente"].indexOf(x.tipo) < 0) E("alertas_profissionais[" + i + "]: tipo inválido");
      if (!cheio(x.texto)) E("alertas_profissionais[" + i + "]: falta texto");
    });
    lista("roteiro_proxima_consulta").forEach(function (x, i) {
      if (["ferramenta", "pergunta", "criterio_decisao"].indexOf(x.tipo) < 0) E("roteiro_proxima_consulta[" + i + "]: tipo inválido");
      if (!cheio(x.texto)) E("roteiro_proxima_consulta[" + i + "]: falta texto");
    });
    /* ferramentas: ate 3, IDs do catalogo PP-V1, sem duplicatas, exatamente 1 principal, nunca uma concluida no encontro */
    var fr = lista("ferramentas_recomendadas");
    if (Array.isArray(r.ferramentas_recomendadas) && r.ferramentas_recomendadas.length > 3) E("ferramentas_recomendadas: no máximo 3 (veio " + r.ferramentas_recomendadas.length + ")");
    var vistosId = {}, vistosNome = {};
    fr.forEach(function (f) {
      var rid = String(f.regra_id || ""), nome = String(f.ferramenta || "").trim().toLowerCase();
      if (!RE_REGRA.test(rid)) E('ferramenta "' + (f.ferramenta || "") + '": regra_id fora do catálogo PP-V1 (' + rid + ")");
      if (vistosId[rid] || (nome && vistosNome[nome])) E("ferramenta duplicada: " + rid + " " + (f.ferramenta || ""));
      vistosId[rid] = true; if (nome) vistosNome[nome] = true;
      if (["principal", "complementar"].indexOf(f.papel) < 0) E("ferramenta " + rid + ": papel deve ser principal ou complementar");
    });
    if (fr.length && fr.filter(function (f) { return f.papel === "principal"; }).length !== 1) E("ferramentas_recomendadas: deve haver exatamente 1 principal");
    var concluidas = {};
    lista("ferramentas_ja_aplicadas").forEach(function (a) { if (a.situacao === "concluida") concluidas[String(a.ferramenta || "").trim().toLowerCase()] = true; });
    fr.forEach(function (f) { if (concluidas[String(f.ferramenta || "").trim().toLowerCase()]) E('ferramenta "' + f.ferramenta + '" já foi concluída neste atendimento'); });
    /* direcionamentos */
    var idsD = {};
    lista("direcionamentos").forEach(function (d, i) {
      if (!/^D[0-9]+$/.test(String(d.id || ""))) E("direcionamentos[" + i + "]: id deve ser D1, D2...");
      else if (idsD[d.id]) E("direcionamento " + d.id + " repetido");
      idsD[d.id] = true;
      if (!cheio(d.titulo)) E("direcionamento " + (d.id || i) + ": falta o título");
      if (!Array.isArray(d.baseado_em) || !d.baseado_em.length) E("direcionamento " + (d.id || i) + ' sem "baseado_em"');
      if (d.status !== "SUGERIDO") E("direcionamento " + (d.id || i) + ": status deve ser SUGERIDO");
      if (d.territorio !== undefined && d.territorio !== null && TERRITORIOS.indexOf(d.territorio) < 0) E("direcionamento " + (d.id || i) + ": território inválido");
    });
    /* estrategias */
    var idsE = {}, terrE = {};
    lista("estrategias").forEach(function (e, i) {
      var eid = String(e.id || "");
      if (!/^E[0-9]+$/.test(eid)) E("estrategias[" + i + "]: id deve ser E1, E2...");
      else if (idsE[eid]) E("estratégia " + eid + " repetida");
      idsE[eid] = true; terrE[eid] = e.territorio;
      if (!cheio(e.titulo)) E("estratégia " + (eid || i) + ": falta o título");
      if (!CLASSIFICACOES[e.classificacao]) E("estratégia " + (eid || i) + ": classificacao inválida (" + e.classificacao + ")");
      if (TERRITORIOS.indexOf(e.territorio) < 0) E("estratégia " + (eid || i) + ": territorio inválido");
      if (!Array.isArray(e.baseado_em) || !e.baseado_em.length) E("estratégia " + (eid || i) + ' sem "baseado_em"');
      if (e.status !== "SUGERIDO") E("estratégia " + (eid || i) + ": status deve ser SUGERIDO");
      if (e.direcionamento_id && !idsD[e.direcionamento_id]) E("estratégia " + (eid || i) + " aponta para direcionamento inexistente " + e.direcionamento_id);
      if (["acordada", "nova"].indexOf(e.origem) < 0) E("estratégia " + (eid || i) + ": origem deve ser acordada ou nova");
      if (!("decisao_sugerida" in e)) E("estratégia " + (eid || i) + ": falta decisao_sugerida");
      var dec = e.decisao_sugerida;
      if (e.origem === "nova" && dec !== null && dec !== undefined) E("estratégia " + (eid || i) + " é nova: decisao_sugerida deve ser null");
      if (e.origem === "acordada" && r.tipo === "primeira_consulta" && dec !== MANTER_OBS) E("estratégia " + (eid || i) + ': na primeira consulta a decisão é "' + MANTER_OBS + '"');
      if (e.origem === "acordada" && r.tipo === "retorno" && DECISOES_RETORNO.concat([MANTER_OBS]).indexOf(dec) < 0) E("estratégia " + (eid || i) + ": decisão de retorno inválida (" + dec + ")");
    });
    /* Corpo / Mente / Espirito */
    var naoAprof = {};
    SEC_TERR.forEach(function (k, n) { if (ehObj(r[k]) && r[k].situacao === "nao_aprofundado") naoAprof[TERRITORIOS[n]] = true; });
    lista("estrategias").forEach(function (e, i) {
      if (naoAprof[e.territorio]) E("estratégia " + (e.id || i) + " está no território " + e.territorio + ', que está "nao_aprofundado" (sem estratégia ativa nesta etapa)');
      if (Array.isArray(e.baseado_em) && e.baseado_em.some(function (b) { return /hip[oó]tese|pontos_para_aprofundar/i.test(String(b)); }))
        E("estratégia " + (e.id || i) + " se baseia numa hipótese: hipótese vira observação e confirmação, nunca estratégia direto");
    });
    SEC_TERR.forEach(function (k, n) {
      if (!(k in r)) return;
      var t = r[k];
      if (!ehObj(t)) return E('"' + k + '" deve ser objeto {situacao, resumo, estrategias}');
      if (["com_material", "nao_aprofundado"].indexOf(t.situacao) < 0) E(k + ": situacao deve ser com_material ou nao_aprofundado");
      if (!ehTexto(t.resumo)) E(k + ": resumo deve ser texto");
      else if (t.situacao === "nao_aprofundado" && t.resumo.indexOf(NAO_APROFUNDADO) !== 0) E(k + ': sem material, o resumo começa com "' + NAO_APROFUNDADO + '"');
      if (!Array.isArray(t.estrategias)) E(k + ": estrategias deve ser lista");
      else if (t.situacao === "nao_aprofundado" && t.estrategias.length) E(k + ' está "nao_aprofundado": não pode ter estratégia vinculada (' + t.estrategias.join(", ") + ")");
      else t.estrategias.forEach(function (eid) {
        if (!idsE[eid]) E(k + " cita estratégia inexistente " + eid);
        else if (terrE[eid] !== TERRITORIOS[n]) E(k + " cita " + eid + ", que é do território " + terrE[eid]);
      });
    });
    /* rascunho para a paciente: so aviso (nunca e enviado sozinho; a nutricionista revisa) */
    var rp = ehTexto(r.rascunho_paciente) ? r.rascunho_paciente : "";
    PROIBIDOS_PACIENTE.forEach(function (p) { if (rp.toLowerCase().indexOf(p) >= 0) avisos.push('rascunho para a paciente contém "' + p + '"'); });
    if (/\d+,\d/.test(rp)) avisos.push("rascunho para a paciente tem números do HOLOSCAN");
    avisos = avisos.concat(avisosClinicos(r));
    return { erros: erros, avisos: avisos };
  }

  /* ---------- 2b. avisos de linguagem e de raciocinio (nao bloqueiam: a nutricionista revisa cada item) ----------
     Mesmas regras de checar_regras_clinicas (docs/v1/holos-ai-gpt/holos_ai_pdf.py), que no GPT sao corrigidas antes de entregar. */
  function semAcento(t) { return String(t === null || t === undefined ? "" : t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  var PARADAS = ["comer", "volta", "antes", "depoi", "tarde", "noite", "lanch", "podem", "fazer", "parte", "mesmo", "quand", "sobre",
    "entre", "sempr", "ainda", "estar", "pouco", "tempo", "outra", "outro", "desta", "deste", "nesta", "neste", "dessa", "desse",
    "nossa", "nosso", "proxi", "encon", "conve", "retor", "confe", "consu", "parti", "etapa", "pacie", "profi", "nutri", "possi",
    "poder", "deixa", "cerca", "seman", "horas", "combi", "acord"];
  function radicais(t) {
    var o = {};
    (semAcento(t).match(/[a-z]+/g) || []).forEach(function (w) { if (w.length >= 5 && PARADAS.indexOf(w.slice(0, 5)) < 0) o[w.slice(0, 5)] = true; });
    return o;
  }
  function frases(t) { return String(t || "").replace(/([.!?;])\s+/g, "$1\n").split(/\n+/).filter(function (f) { return f.trim(); }); }
  function textos(x, out) {
    out = out || [];
    if (ehTexto(x)) out.push(x);
    else if (Array.isArray(x)) x.forEach(function (v) { textos(v, out); });
    else if (ehObj(x)) Object.keys(x).forEach(function (k) { textos(x[k], out); });
    return out;
  }
  var RE_NOTA = /(mais|menos|maior|menor|melhor|pior)\s+equilibrio|equilibrio\s+(maior|menor)|(nota|score|pontuacao|indice)[^.;]{0,40}(saudavel|saude|normalidade|normal\b|gravidade|grave\b|risco)/;
  var RE_NEGA = /\b(nao|nunca|nem)\b/;
  var RE_CONDUTA = /composicao|cardapio|suplement|\bdose\b|protocolo|prescri|quantidade|gramas|\bkcal\b|calori|definir na conduta|escolha (dos|de) alimentos|substituic|substituto/;
  var RE_CORTE = /maior parte dos dias|maioria dos dias|metade dos dias|\d+ ?%|\d+ ?(vezes|dias|x) ?(por|na|em|ao)? ?semana|em \d+ de \d+|pelo menos \d+|no minimo \d+/;
  var RE_COMBINADO = /combin|acordamos|acordad|vamos fazer|\buse\b|\bfaca\b|a estrategia e\b/;
  function avisosClinicos(r) {
    var A = [];
    if (!ehObj(r)) return A;
    var ests = Array.isArray(r.estrategias) ? r.estrategias.filter(ehObj) : [];
    var novas = ests.filter(function (e) { return e.origem === "nova"; }), acordadas = ests.filter(function (e) { return e.origem === "acordada"; });
    textos(r).forEach(function (t) {
      frases(t).forEach(function (f) {
        var fs = semAcento(f);
        if (RE_NOTA.test(fs) && !RE_NEGA.test(fs)) A.push('linguagem da nota do HOLOSCAN: "' + f.trim().slice(0, 120) + '" (nota maior = menos marcadores; nunca saúde, equilíbrio, normalidade, gravidade ou risco)');
      });
    });
    (Array.isArray(r.sistemas_prioritarios) ? r.sistemas_prioritarios : []).forEach(function (x) {
      if (ehObj(x) && Number(x.ordem) > 1 && semAcento(textos(x).join(" ")).indexOf("concentrou mais marcadores") >= 0)
        A.push(x.sistema + ' não é a primeira área: "concentrou mais marcadores" não se aplica');
    });
    ests.forEach(function (e) {
      if (RE_CONDUTA.test(semAcento(e.titulo + " " + e.o_que_fazer)))
        A.push("estratégia " + e.id + " parece tarefa da Conduta (composição, alimentos, quantidade, suplemento, protocolo, prescrição): decisão da nutricionista, não estratégia da paciente");
      ["o_que_fazer", "o_que_observar", "criterio_sucesso"].forEach(function (c) {
        var m = RE_CORTE.exec(semAcento(e[c]));
        if (m) A.push("estratégia " + e.id + ': corte não definido pela Conduta ("' + m[0] + '")');
      });
    });
    (Array.isArray(r.roteiro_proxima_consulta) ? r.roteiro_proxima_consulta : []).forEach(function (x) {
      var m = ehObj(x) && x.tipo === "criterio_decisao" ? RE_CORTE.exec(semAcento(x.texto)) : null;
      if (m) A.push("roteiro (critério " + (x.estrategia_id || "") + '): corte não definido pela Conduta ("' + m[0] + '")');
    });
    var radHip = {}, radAc = {};
    (Array.isArray(r.pontos_para_aprofundar) ? r.pontos_para_aprofundar : []).forEach(function (x) { if (ehObj(x) && x.tipo === "hipotese") Object.assign(radHip, radicais(x.texto)); });
    acordadas.forEach(function (e) { Object.assign(radAc, radicais(textos(e).join(" "))); });
    var novosDe = function (a, b) { return Object.keys(a).filter(function (k) { return b[k] && !radAc[k]; }); };
    novas.forEach(function (e) {
      var c = novosDe(radicais(e.titulo), radHip);
      if (c.length) A.push("estratégia " + e.id + " repete uma hipótese ainda não confirmada (" + c.sort().join(", ") + "): hipótese → observação → confirmação");
    });
    frases(r.rascunho_paciente).forEach(function (f) {
      var rf = radicais(f), comb = RE_COMBINADO.test(semAcento(f));
      novas.forEach(function (e) {
        var n = novosDe(radicais(e.titulo + " " + e.o_que_fazer), rf);
        if (n.length >= 2 || (n.length && comb)) A.push("rascunho para a paciente apresenta a sugestão nova " + e.id + ' como combinada: "' + f.trim().slice(0, 120) + '"');
      });
      if (!acordadas.length && comb) A.push('rascunho para a paciente fala em combinado sem estratégia acordada: "' + f.trim().slice(0, 120) + '"');
    });
    return A;
  }

  /* ---------- 3. itens separados (um registro por elemento de cada secao) ---------- */
  function soProfissional(secao) { return SO_PROFISSIONAL.indexOf(secao) >= 0; }
  function explodir(r) {
    var out = [];
    SECOES.forEach(function (sec) {
      if (!(sec in r)) return;
      var v = r[sec];
      if (SEC_TEXTO.indexOf(sec) >= 0) { if (cheio(v)) out.push({ secao: sec, ordem: 0, chave: null, valor: v, so_profissional: soProfissional(sec) }); return; }
      if (SEC_TERR.indexOf(sec) >= 0) { if (ehObj(v)) out.push({ secao: sec, ordem: 0, chave: null, valor: copia(v), so_profissional: soProfissional(sec) }); return; }
      (Array.isArray(v) ? v : []).forEach(function (x, i) {
        out.push({ secao: sec, ordem: i, chave: ehObj(x) && typeof x.id === "string" ? x.id : null, valor: copia(x),
          so_profissional: soProfissional(sec) || (sec === "pontos_para_aprofundar") });
      });
    });
    return out;
  }

  /* texto principal de um item (lista, revisao, mapeamento) */
  function textoDe(secao, v) {
    if (ehTexto(v)) return v;
    if (!ehObj(v)) return "";
    if (secao === "direcionamentos" || secao === "estrategias") return v.titulo || "";
    if (secao === "sistemas_prioritarios") return [v.sistema, v.nota ? "(" + v.nota + (v.posicao ? " · " + v.posicao : "") + ")" : ""].filter(Boolean).join(" ");
    if (secao === "ferramentas_recomendadas") return [(v.papel || "").toUpperCase(), v.ferramenta, v.regra_id ? "(" + v.regra_id + ")" : ""].filter(Boolean).join(" ");
    if (secao === "ferramentas_ja_aplicadas") return (v.ferramenta || "") + (v.o_que_esclareceu ? ": " + v.o_que_esclareceu : "");
    if (SEC_TERR.indexOf(secao) >= 0) return v.resumo || "";
    return v.texto || "";
  }
  /* campos de texto editaveis de um item (a edicao so troca texto; nunca estrutura, IDs, classificacao ou decisao) */
  var EDITAVEIS = {
    direcionamentos: ["titulo", "por_que", "objetivo"],
    estrategias: ["titulo", "o_que_fazer", "o_que_observar", "prazo", "criterio_sucesso"],
    corpo: ["resumo"], mente: ["resumo"], espirito: ["resumo"]
  };
  function camposEditaveis(secao, v) {
    if (ehTexto(v)) return [null];
    if (EDITAVEIS[secao]) return EDITAVEIS[secao].filter(function (c) { return c in v ? ehTexto(v[c]) : true; });
    return ehObj(v) && ehTexto(v.texto) ? ["texto"] : [];
  }
  /* valor que vale: o editado pela nutricionista, ou o original da IA */
  function valorFinal(item) {
    return item.estado === "editado" && item.valor_profissional !== null && item.valor_profissional !== undefined ? item.valor_profissional : item.valor_ia;
  }
  /* REGRA FIXA do metodo (aceite automatico, migration 20261024100000 holos_ai_elegivel_paciente): pode ir para a paciente
     tudo o que NAO e so profissional, menos a estrategia que "requer decisao profissional na Conduta" (fica interna). */
  function elegivelPaciente(secao, valor) {
    if (soProfissional(secao)) return false;
    return !(secao === "estrategias" && ehObj(valor) && valor.classificacao === "requer_decisao_profissional_na_conduta");
  }
  function aceito(item) { return item && (item.estado === "confirmado" || item.estado === "editado"); }

  /* ---------- 4. o que foi CONFIRMADO vira Resultado HOLOS (template 5) ---------- */
  var STATUS_DECISAO = { MANTER: "manter", AJUSTAR: "ajustar", SUBSTITUIR: "substituir", CONCLUIR: "concluida", ENCERRAR: "encerrada" };
  var TERR_DIRECAO = { "Corpo": "corpo", "Mente": "mente", "Espírito": "espirito" };
  var SISTEMA_CHAVE = [[/f[uú]ngico/i, "fungico"], [/[aá]cido/i, "acido_inflamatorio"], [/metab[oó]lico/i, "metabolico"], [/detox|linf[aá]tico/i, "detox_linfatico"],
    [/mental|emocional|espiritual/i, "mental_emocional_espiritual"]];
  function sistemaChave(nome) {
    var s = String(nome || "");
    for (var i = 0; i < SISTEMA_CHAVE.length; i++) if (SISTEMA_CHAVE[i][0].test(s)) return SISTEMA_CHAVE[i][1];
    return null;
  }
  function corte(t) { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > 1000 ? t.slice(0, 997) + "…" : t; }
  /* item da direcao a partir de um item importado ACEITO; a revisao da nutricionista ja e a confirmacao */
  function itemDirecao(importId, item, texto, extra) {
    var vIa = item.valor_ia, sug = corte(textoDe(item.secao, vIa));
    var o = { id: "hai-" + String(item.id) + (extra && extra._sufixo ? extra._sufixo : ""), texto: corte(texto), texto_sugerido: sug, origem: "holos_ai",
      ref: { tipo: "holos_ai", id: importId, campo: item.id }, sugestao: true, confirmado: true,
      mostrar_paciente: item.compartilhar === true && !item.so_profissional, descartado: false };
    Object.keys(extra || {}).forEach(function (k) { if (k !== "_sufixo" && extra[k] !== undefined && extra[k] !== null && extra[k] !== "") o[k] = extra[k]; });
    return o;
  }
  /* Devolve { S (sugestoes por lista, para ResultadoDirecao.mesclar), foco, proxima_etapa, leitura } so com itens ACEITOS.
     Nunca: descartado, so sugerido (sem revisao), so profissional marcado para a paciente. Ferramentas recomendadas, sistemas,
     roteiro, alertas e fontes ficam no registro da HOLOS AI (nao entram no documento da paciente). */
  /* termo fora do metodo no texto que iria para a paciente: no aceite automatico o item fica INTERNO (nunca some do registro) */
  function termoProibido(t) {
    var x = String(t || "").toLowerCase();
    return PROIBIDOS_PACIENTE.filter(function (p) { return x.indexOf(p) >= 0; });
  }
  function paraDirecao(importacao, itens, opts) {
    opts = opts || {};
    var S = { padroes: [], direcionamentos: [], estrategias: [], observar: [], corpo: [], mente: [], espirito: [] };
    var res = { S: S, foco: null, proxima_etapa: null, leitura: null };
    if (!importacao || importacao.status !== "confirmado") return res;
    var acc = (itens || []).filter(aceito).sort(function (a, b) { return SECOES.indexOf(a.secao) - SECOES.indexOf(b.secao) || a.ordem - b.ordem; });
    var idDir = {};
    acc.forEach(function (it) {
      var v = valorFinal(it);
      if (it.secao === "sintese_integrada") { res.leitura = String(v); return; }
      if (it.secao === "padroes_observados") { S.padroes.push(itemDirecao(importacao.id, it, v, { tipo: "padrao_observado" })); return; }
      if (it.secao === "o_que_observar" || it.secao === "plano_acompanhamento") { S.observar.push(itemDirecao(importacao.id, it, v)); return; }
      if (it.secao === "proxima_etapa") { res.proxima_etapa = itemDirecao(importacao.id, it, v); return; }
      if (SEC_TERR.indexOf(it.secao) >= 0) {
        if (ehObj(v) && v.situacao === "com_material" && cheio(v.resumo)) S[it.secao].push(itemDirecao(importacao.id, it, v.resumo));
        return;
      }
      if (it.secao === "direcionamentos") {
        var idd = "hai-" + String(it.id);
        idDir[v.id] = idd;
        var sk = sistemaChave(v.sistema);
        S.direcionamentos.push(itemDirecao(importacao.id, it, v.titulo, { territorio: TERR_DIRECAO[v.territorio] || null, porque: v.por_que ? corte(v.por_que) : null,
          objetivo: v.objetivo ? corte(v.objetivo) : null, status: "proposto", sistemas: sk ? [sk] : null }));
        return;
      }
      if (it.secao === "estrategias") {
        S.estrategias.push(itemDirecao(importacao.id, it, v.titulo, {
          direcionamento_id: v.direcionamento_id && idDir[v.direcionamento_id] ? idDir[v.direcionamento_id] : null,
          acao: v.o_que_fazer ? corte(v.o_que_fazer) : null, observar: v.o_que_observar ? corte(v.o_que_observar) : null,
          prazo: v.prazo ? corte(v.prazo) : null, finalidade: v.criterio_sucesso ? corte("Critério de sucesso: " + v.criterio_sucesso) : null,
          /* 14/10 (auditoria Cowork): a classificacao e metadado tecnico da estrategia, NAO frequencia; ela ia para
             "Quando / com que frequência" no Resultado da paciente. O HOLOS_AI_RESULT nao tem campo de frequencia: fica vazio. */
          contexto: null,
          responsavel: v.classificacao === "requer_decisao_profissional_na_conduta" ? "Nutricionista (Conduta)" : null,
          /* retorno: a decisao sugerida antes x agora vira o estado da estrategia (MANTER / AJUSTAR / SUBSTITUIR / CONCLUIR / ENCERRAR) */
          status: STATUS_DECISAO[v.decisao_sugerida] || (v.origem === "acordada" ? "acordada" : "proposta") }));
      }
    });
    /* aceite automatico (simplificacao 14/10): a regra fixa ja decidiu o que e elegivel (compartilhar); aqui so se segura,
       por precaucao, o texto com termo fora do metodo (fica interno, marcado em "retidos") */
    var retidos = [];
    if (opts.automatico) {
      Object.keys(S).forEach(function (k) { S[k].forEach(function (it) {
        if (it.mostrar_paciente && termoProibido(it.texto + " " + (it.acao || "") + " " + (it.porque || "") + " " + (it.objetivo || "")).length) { it.mostrar_paciente = false; retidos.push(it.id); }
      }); });
      if (res.proxima_etapa && res.proxima_etapa.mostrar_paciente && termoProibido(res.proxima_etapa.texto).length) { res.proxima_etapa.mostrar_paciente = false; retidos.push(res.proxima_etapa.id); }
    }
    res.retidos = retidos;
    /* foco atual: o primeiro direcionamento aceito. Revisao manual: entra como SUGESTAO (quem confirma e a nutricionista).
       Aceite automatico: entra confirmado e, se o direcionamento e elegivel, para a paciente (o Resultado fica pronto). */
    var d0 = opts.automatico ? S.direcionamentos.filter(function (d) { return d.mostrar_paciente; })[0] || S.direcionamentos[0] : S.direcionamentos[0];
    if (d0) res.foco = { id: d0.id + "-foco", texto: d0.texto, texto_sugerido: d0.texto, origem: "holos_ai", ref: copia(d0.ref), sugestao: true,
      confirmado: !!opts.automatico, mostrar_paciente: !!opts.automatico && d0.mostrar_paciente === true, descartado: false };
    return res;
  }

  /* resumo para a tela */
  function contagem(itens) {
    var c = { total: 0, sugerido: 0, confirmado: 0, editado: 0, descartado: 0, compartilhar: 0 };
    (itens || []).forEach(function (it) { c.total++; c[it.estado] = (c[it.estado] || 0) + 1; if (it.compartilhar) c.compartilhar++; });
    return c;
  }

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION, TEXTO_MAX: TEXTO_MAX, STR_MAX: STR_MAX, LISTA_MAX: LISTA_MAX, NAO_APROFUNDADO: NAO_APROFUNDADO, MANTER_OBS: MANTER_OBS,
    OBRIGATORIAS: OBRIGATORIAS, SECOES: SECOES, SEC_TEXTO: SEC_TEXTO, SEC_TERR: SEC_TERR, SEC_LISTA: SEC_LISTA, OPCIONAIS: OPCIONAIS,
    SO_PROFISSIONAL: SO_PROFISSIONAL, TITULO: TITULO, CLASSIFICACOES: CLASSIFICACOES, EDITAVEIS: EDITAVEIS,
    trechoJson: trechoJson, extrairJson: extrairJson, validar: validar, avisosClinicos: avisosClinicos, explodir: explodir, soProfissional: soProfissional,
    textoDe: textoDe, camposEditaveis: camposEditaveis, valorFinal: valorFinal, aceito: aceito, elegivelPaciente: elegivelPaciente, termoProibido: termoProibido, paraDirecao: paraDirecao,
    sistemaChave: sistemaChave, contagem: contagem
  };
  raiz.HolosAIContrato = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

// ---- shared/playbook-holos.js (embutido) ----
/* ===========================================================================
   PLAYBOOK HOLOS (PB-V1) — Resultado HOLOS sem depender da IA
   ===========================================================================

   Biblioteca curta de FOCOS e ESTRATEGIAS organizada pelos cinco sistemas do
   HOLOSCAN e por Corpo · Mente · Espirito (plano: docs/v1/PLANO-PLAYBOOK-HOLOS.md).

   O que este modulo FAZ:
     * guarda o conteudo PB-V1 (3 focos por sistema, 12 estrategias por sistema
       e 15 gerais), escrito sem diagnostico, sem prescricao e sem quantidades;
     * escolhe e ORDENA as opcoes para um paciente: focos dos 2 sistemas
       prioritarios do HOLOSCAN; estrategias do sistema do foco primeiro, depois
       as que combinam com as ferramentas aplicadas (as etiquetas so ordenam,
       nunca escondem nada);
     * monta os itens da direcao (template 5) a partir do que a NUTRICIONISTA
       escolheu: origem "nutricionista", confirmados e compartilhados. A
       rastreabilidade fica no id de cada item ("pb1-<ID do playbook>-...").

   O que NAO faz: nao le score, nao muda HOLOSCAN, PP-V1, Indice ou Triade, nao
   escolhe nada sozinho e nao inventa texto (so copia o texto aprovado, que a
   nutricionista pode editar). Funciona tambem no Node (testes).
   =========================================================================== */
(function (raiz) {
  "use strict";

  var VERSAO = "PB-V2";
  var PREFIXO = "pb1-";   /* o prefixo dos ids continua "pb1-": Resultados antigos seguem rastreaveis */
  var SISTEMAS = [
    ["metabolico", "Metabólico"], ["fungico", "Fúngico"], ["acido_inflamatorio", "Ácido Inflamatório"],
    ["detox_linfatico", "Detox e Linfático"], ["mental_emocional_espiritual", "Mental Emocional Espiritual"]
  ];
  var NOME_SISTEMA = {}; SISTEMAS.forEach(function (s) { NOME_SISTEMA[s[0]] = s[1]; });
  var TERR = { C: "corpo", M: "mente", E: "espirito", I: "integrado" };
  var NOME_TERR = { corpo: "Corpo", mente: "Mente", espirito: "Espírito", integrado: "Integrado" };
  /* etiquetas das ferramentas (ids oficiais das 10 ferramentas) */
  var FERR = { OQ3: "oq3", MOM: "linha_momentum", ROT: "mapa_rotina_v1", PQQ: "pqq", CRE: "mapa_crencas", GAT: "gatilhos_respostas_v1",
    PRO: "mapa", RODA: "roda_vida", CARTA: "carta_futuro", CON: "conexao_pertencimento_v1" };
  var NOME_FERR = { oq3: "OQ³", linha_momentum: "Linha do Momentum", mapa_rotina_v1: "Mapa da Rotina", pqq: "Escada dos Porquês",
    mapa_crencas: "Mapa de Crenças", gatilhos_respostas_v1: "Gatilhos & Respostas", mapa: "Mapa do Propósito", roda_vida: "Roda Holística da Vida",
    carta_futuro: "Carta ao Futuro Eu", conexao_pertencimento_v1: "Conexão & Pertencimento" };
  var PRAZO_PADRAO = "Até o próximo encontro.";
  var MAX_ESTRATEGIAS = 6;
  /* PB-V2: o padrao e 2 a 4 estrategias por fase (5 ou mais so com motivo concreto); nao e obrigatorio preencher Corpo, Mente e Espirito */
  var RECOMENDADO = { min: 2, max: 4 };
  /* pagina de cada ferramenta no PDF oficial (docs/v1/PLAYBOOK-ESTRATEGIAS-HOLOS.pdf, capitulo Ferramentas) */
  /* paginas-pdf:inicio (gerado por scripts/gerar-pdf-playbook-estrategias.mjs) */ var PAGINAS_PDF = {"oq3":28,"linha_momentum":28,"mapa_rotina_v1":29,"pqq":29,"mapa_crencas":29,"gatilhos_respostas_v1":30,"mapa":30,"roda_vida":30,"carta_futuro":31}; /* paginas-pdf:fim */

  /* ---------- conteudo ------------------------------------------------------ */
  function F(id, sistema, texto, porque, dirs, observar, proxima) {
    return { id: id, sistema: sistema, texto: texto, porque: porque,
      direcionamentos: dirs.map(function (d) { return { territorio: TERR[d[0]], titulo: d[1], objetivo: d[2] }; }),
      observar: observar, proxima_etapa: proxima };
  }
  function E(id, sistema, t, titulo, acao, contexto, observar, ferr, meta) {
    meta = meta || {};
    return { id: id, sistema: sistema, territorio: TERR[t], titulo: titulo, acao: acao, contexto: contexto, observar: observar,
      ferramentas: (ferr || []).map(function (k) { return FERR[k]; }), tipo: meta.tipo || "acao", nivel: meta.nivel || "N2",
      cuidado: meta.cuidado || "", requer: meta.requer || "" };
  }
  var TIPO = { acao: "Ação", observacao: "Observação", reflexao: "Reflexão" };
  var NIVEL = { N1: "Prática bem estabelecida", N2: "Estratégia comportamental com suporte de literatura", N3: "Experimento individual (hipótese a testar)", N4: "Prática de sentido, autoral ou simbólica" };

  var FOCOS = [
    /* METABOLICO */
    F("ME-F1", "metabolico", "Organizar os horários das refeições para ter mais energia ao longo do dia",
      "Seus relatos mostram fome, energia e horários pedindo mais organização.",
      [["C", "Dar ritmo às refeições", "Ter horários de refeição mais previsíveis no dia a dia."],
       ["M", "Perceber a fome antes que ela fique forte demais", "Reconhecer os sinais de fome mais cedo."]],
      ["Sua energia ao longo do dia.", "A fome entre as refeições.", "Os horários que funcionaram."],
      "Revisar os horários que funcionaram e ajustar os que não couberam na rotina."),
    F("ME-F2", "metabolico", "Entender a sua fome e a sua saciedade",
      "Reconhecer os sinais de fome e de satisfação ajuda a escolher com mais tranquilidade.",
      [["M", "Diferenciar a fome do corpo de outras vontades", "Perceber o que está por trás da vontade de comer."],
       ["C", "Comer com atenção para perceber a saciedade", "Notar quando a refeição já foi suficiente."]],
      ["Suas notas de fome e de saciedade.", "Os momentos em que comeu sem fome.", "Como você termina as refeições."],
      "Olhar juntos os registros de fome e saciedade e escolher o próximo ajuste."),
    F("ME-F3", "metabolico", "Construir uma rotina alimentar que caiba no seu dia real",
      "Mudanças que cabem na rotina são as que se sustentam.",
      [["C", "Encontrar espaço na rotina para as refeições", "Proteger os horários das refeições nos dias comuns."],
       ["E", "Ligar o cuidado com a alimentação ao que importa para você", "Dar sentido às mudanças desta fase."]],
      ["Onde a rotina quebra.", "O que facilitou.", "O que você conseguiu manter."],
      "Revisar o que coube na rotina e o que precisa de outra solução."),
    /* FUNGICO */
    F("FU-F1", "fungico", "Perceber como a alimentação conversa com o seu conforto digestivo",
      "Entender em que refeições e situações o desconforto aparece ajuda a escolher melhor.",
      [["C", "Observar o conforto digestivo depois das refeições", "Identificar as refeições mais e menos confortáveis."],
       ["M", "Notar como a pressa e as emoções aparecem nas refeições", "Perceber o estado em que você come."]],
      ["As refeições com mais e com menos desconforto.", "O ritmo das refeições.", "Os dias mais tranquilos."],
      "Olhar os registros e escolher um ajuste para as refeições mais desconfortáveis."),
    F("FU-F2", "fungico", "Dar mais regularidade e atenção à rotina alimentar",
      "Uma rotina mais regular ajuda a perceber melhor os sinais que você relatou.",
      [["C", "Organizar o ritmo das refeições", "Ter refeições em horários mais parecidos."],
       ["E", "Transformar a refeição num momento de cuidado", "Comer com mais presença."]],
      ["Os horários das refeições.", "As refeições feitas com calma.", "Como você se sentiu."],
      "Revisar o que ficou mais regular e o que ainda falta."),
    F("FU-F3", "fungico", "Observar a relação entre doces, beliscos e os sinais que você relatou",
      "Perceber quando e por que os doces e beliscos aparecem abre espaço para escolhas novas.",
      [["M", "Entender o que vem antes da vontade de doce", "Reconhecer as situações que puxam a vontade."],
       ["C", "Testar uma pausa antes do belisco", "Experimentar decidir com mais calma."]],
      ["Os momentos de vontade de doce.", "O que estava acontecendo.", "Como você se sentiu depois."],
      "Conversar sobre o que apareceu nos registros e escolher a próxima troca."),
    /* ACIDO INFLAMATORIO */
    F("AI-F1", "acido_inflamatorio", "Entender quando e em que situações os desconfortos aparecem",
      "Conhecer o padrão dos desconfortos ajuda a escolher o que ajustar primeiro.",
      [["C", "Registrar os desconfortos e o momento em que aparecem", "Encontrar padrões de horário e de dia."],
       ["M", "Perceber a relação entre a tensão do dia e o desconforto", "Notar se tensão e desconforto andam juntos."]],
      ["A intensidade do desconforto.", "Os horários e os dias.", "O que veio antes."],
      "Olhar juntos o padrão dos desconfortos e escolher um ajuste."),
    F("AI-F2", "acido_inflamatorio", "Cuidar da recuperação: sono, movimento e pausas",
      "Descanso e movimento possível fazem parte do cuidado com o desconforto.",
      [["C", "Dar mais regularidade ao sono e ao movimento possível", "Ter uma rotina de recuperação mais estável."],
       ["E", "Reservar tempo de descanso como cuidado", "Descansar sem culpa."]],
      ["A qualidade do sono.", "A rigidez ao acordar.", "Como o corpo responde ao movimento."],
      "Revisar o que ajudou na recuperação e manter o que funcionou."),
    F("AI-F3", "acido_inflamatorio", "Perceber como a alimentação e a rotina se relacionam com o seu desconforto",
      "Observar a rotina real mostra o que pode estar pesando.",
      [["C", "Comparar dias de mais e de menos desconforto", "Encontrar diferenças entre esses dias."],
       ["M", "Notar a sobrecarga na rotina", "Reconhecer o que pesa no dia a dia."]],
      ["A alimentação nos dias de mais e de menos desconforto.", "A sobrecarga.", "O sono."],
      "Conversar sobre o que os registros mostraram."),
    /* DETOX E LINFATICO */
    F("DL-F1", "detox_linfatico", "Observar o funcionamento do seu intestino no dia a dia",
      "Acompanhar o seu ritmo intestinal ajuda a perceber o que favorece o seu bem-estar.",
      [["C", "Registrar o funcionamento intestinal", "Conhecer o seu ritmo."],
       ["M", "Perceber como a pressa e a rotina interferem", "Notar o que atrapalha o seu ritmo."]],
      ["A frequência e o conforto.", "O que mudou na rotina.", "Os dias mais tranquilos."],
      "Olhar os registros e escolher um ajuste na rotina."),
    F("DL-F2", "detox_linfatico", "Hidratação e movimento ao longo do dia",
      "Água e movimento distribuídos no dia fazem parte do cuidado com o inchaço percebido.",
      [["C", "Distribuir a hidratação ao longo do dia", "Lembrar da água em momentos fixos."],
       ["C", "Quebrar os longos períodos parada", "Incluir pausas de movimento."]],
      ["A sede.", "O inchaço percebido.", "As pausas de movimento."],
      "Revisar o que coube no dia e o que precisa de lembrete."),
    F("DL-F3", "detox_linfatico", "Perceber o que piora ou melhora o inchaço que você sente",
      "Entender os momentos de inchaço ajuda a escolher o que ajustar.",
      [["C", "Registrar quando o inchaço aparece", "Encontrar os momentos e o que veio antes."],
       ["E", "Criar espaço para o seu ritmo", "Ter momentos sem pressa no dia."]],
      ["Os horários do inchaço.", "O que veio antes.", "O sono e o tempo sentada."],
      "Conversar sobre o que os registros mostraram."),
    /* MENTAL EMOCIONAL ESPIRITUAL */
    F("MEE-F1", "mental_emocional_espiritual", "Cuidar do sono e do descanso",
      "O descanso faz parte do cuidado com a alimentação e com a energia.",
      [["C", "Criar um ritual para desacelerar à noite", "Preparar o corpo para o descanso."],
       ["M", "Esvaziar a mente antes de dormir", "Deitar com a cabeça mais leve."]],
      ["O horário de deitar e de acordar.", "Como você acorda.", "As telas à noite."],
      "Revisar o que ajudou o descanso e manter."),
    F("MEE-F2", "mental_emocional_espiritual", "Perceber como as emoções aparecem na alimentação",
      "Reconhecer a emoção antes de comer abre espaço para outras respostas.",
      [["M", "Nomear a emoção antes de comer fora do combinado", "Reconhecer o que você está sentindo."],
       ["M", "Testar uma pausa antes de decidir", "Ganhar alguns minutos para escolher."]],
      ["As emoções mais frequentes.", "As situações.", "As respostas que funcionaram."],
      "Conversar sobre o que apareceu e escolher a próxima resposta."),
    F("MEE-F3", "mental_emocional_espiritual", "Fortalecer o sentido e a direção do seu cuidado",
      "Quando o cuidado se conecta ao que importa, ele fica mais leve de manter.",
      [["E", "Lembrar o seu “pra quê”", "Manter a mudança ligada ao que importa para você."],
       ["E", "Fortalecer o apoio e o pertencimento", "Contar com quem está perto."]],
      ["Os momentos em que o propósito ajudou.", "O apoio que você recebeu.", "Como você se sentiu."],
      "Revisar o que trouxe mais sentido e dar o próximo passo.")
  ];

  /* PB-V2 (revisao metodologica de 14/10): cada estrategia tem TIPO (acao: o paciente faz; observacao: o paciente acompanha;
     reflexao: algo para perceber e trazer ao retorno), NIVEL de sustentacao (N1 pratica/fisiologia bem estabelecida; N2
     estrategia comportamental com suporte de literatura; N3 experimento individual / hipotese a testar; N4 pratica autoral,
     simbolica ou de sentido), CUIDADO (quando nao usar automaticamente) e REQUER (ferramenta que precisa ter sido aplicada). */
  var A = "acao", O = "observacao", R = "reflexao";
  var ESTRATEGIAS = [
    /* METABOLICO */
    E("ME-C1", "metabolico", "C", "Horários âncora", "Combinar 2 ou 3 horários de refeição e tentar mantê-los.", "Todos os dias.", "Sua energia e sua fome entre as refeições.", ["ROT", "OQ3"], { tipo: A, nivel: "N2" }),
    E("ME-C2", "metabolico", "C", "Fome de 0 a 10", "Antes de comer, dar uma nota para a fome; ao terminar, uma nota para a saciedade.", "Em pelo menos 1 refeição por dia.", "Se você começa a comer com a fome muito alta.", ["GAT"], { tipo: O, nivel: "N2",
      cuidado: "Evitar uso rígido ou controlador; adaptar ou não usar com histórico ou suspeita de transtorno alimentar, ou quando monitorar aumenta o sofrimento." }),
    E("ME-C3", "metabolico", "C", "Energia depois de comer", "Anotar como está a sua energia 1 a 2 horas depois das refeições principais.", "3 dias na semana.", "Em quais refeições a energia cai ou se mantém.", ["ROT"], { tipo: O, nivel: "N3" }),
    E("ME-C4", "metabolico", "C", "Preparar o horário difícil", "Deixar planejado o que fazer no horário em que a fome mais aperta.", "Nos dias úteis.", "Se você chega com menos fome à refeição seguinte.", ["ROT", "GAT"], { tipo: A, nivel: "N2" }),
    E("ME-M1", "metabolico", "M", "O que está pedindo comida agora?", "Antes de comer fora do habitual, observar: há fome física? Vontade de algo específico? Cansaço? Emoção? Hábito? Mais de uma dessas coisas?", "Sempre que acontecer.", "O que apareceu com mais frequência.", ["GAT"], { tipo: R, nivel: "N2" }),
    E("ME-M2", "metabolico", "M", "Comer sem fome: o que veio antes", "Registrar a situação, o pensamento percebido e a emoção quando comer sem fome.", "Sempre que acontecer.", "As situações que se repetem.", ["GAT"], { tipo: O, nivel: "N2",
      cuidado: "A nutricionista mapeia a situação; não aprofunda conteúdo emocional. Sofrimento intenso: acompanhamento especializado." }),
    E("ME-M3", "metabolico", "M", "Sem compensação", "Notar se, depois de comer mais, aparece a vontade de pular a refeição seguinte, e trazer isso para a próxima conversa.", "Durante a semana.", "Quando isso aparece e como você se sente.", ["CRE"], { tipo: R, nivel: "N2",
      cuidado: "Restrição e compensação frequentes podem sinalizar transtorno alimentar: avaliar e encaminhar quando houver suspeita." }),
    E("ME-M4", "metabolico", "M", "Resposta combinada", "Usar a resposta alternativa que combinamos para o gatilho mais frequente.", "Sempre que o gatilho aparecer.", "Se você conseguiu usar a resposta e o que mudou.", ["GAT"], { tipo: A, nivel: "N2" }),
    E("ME-E1", "metabolico", "E", "Energia para o que importa", "Escolher uma atividade para a qual você quer ter mais energia e observar como a alimentação aparece nesses dias.", "Durante a semana.", "Sua energia nos dias dessa atividade.", ["PQQ", "RODA"], { tipo: R, nivel: "N4" }),
    E("ME-E2", "metabolico", "E", "Intenção do dia", "Ao acordar, escolher uma intenção simples para o dia (por exemplo: comer com calma no almoço).", "Todas as manhãs.", "Em quantos dias você lembrou da intenção.", ["PRO"], { tipo: A, nivel: "N2" }),
    E("ME-E3", "metabolico", "E", "Refeição com presença", "Fazer uma refeição na semana com tempo e atenção, sozinha ou acompanhada.", "1 vez na semana.", "Como você se sentiu nessa refeição.", [], { tipo: A, nivel: "N2" }),
    E("ME-E4", "metabolico", "E", "Ritmo que respeita você", "Identificar um compromisso que atropela as refeições e pensar numa forma de proteger esse horário.", "Durante a semana.", "Se você conseguiu proteger o horário.", ["ROT", "RODA"], { tipo: A, nivel: "N2" }),
    /* FUNGICO */
    E("FU-C1", "fungico", "C", "Diário do conforto digestivo", "Anotar como você se sentiu depois das refeições principais (estufamento, desconforto ou bem-estar).", "No almoço e no jantar.", "Em quais refeições o desconforto aparece.", ["ROT"], { tipo: O, nivel: "N3",
      cuidado: "Sintomas digestivos importantes, persistentes ou com sinais de alarme pedem avaliação clínica adequada." }),
    E("FU-C2", "fungico", "C", "Mastigar com calma", "Em uma refeição do dia, comer sentada e mastigar com calma, sem pressa.", "1 refeição por dia.", "Se o conforto muda depois dessa refeição.", ["ROT"], { tipo: A, nivel: "N2" }),
    E("FU-C3", "fungico", "C", "Mapa dos doces e beliscos", "Anotar quando come doce ou belisca e o que estava acontecendo.", "Sempre que acontecer.", "Os horários e as situações que se repetem.", ["GAT", "ROT"], { tipo: O, nivel: "N3" }),
    E("FU-C4", "fungico", "C", "Pausa antes do belisco", "Quando vier a vontade de beliscar fora de hora, fazer uma pequena pausa, respirar e observar a vontade antes de decidir.", "Sempre que acontecer.", "Se a vontade muda depois da pausa.", ["GAT"], { tipo: A, nivel: "N2" }),
    E("FU-M1", "fungico", "M", "Emoção e digestão", "Nos dias de mais desconforto, anotar também como estava o seu dia emocionalmente.", "Nos dias de desconforto.", "Se dias tensos e desconforto variam juntos.", ["GAT"], { tipo: O, nivel: "N3" }),
    E("FU-M2", "fungico", "M", "O que a vontade de doce está pedindo", "Perguntar a si mesma se é cansaço, recompensa, tédio, fome ou outra coisa.", "Sempre que aparecer.", "O que aparece com mais frequência.", ["GAT"], { tipo: R, nivel: "N2",
      cuidado: "A resposta é da paciente: a nutricionista não interpreta por ela." }),
    E("FU-M3", "fungico", "M", "Comida sem culpa", "Escolher uma ideia sobre comida que traz culpa e trazer para a próxima conversa.", "Durante a semana.", "Quando essa ideia aparece.", ["CRE"], { tipo: R, nivel: "N2" }),
    E("FU-M4", "fungico", "M", "Plano para o momento difícil", "Usar o que combinamos para o horário em que a vontade de doce mais aparece.", "No horário combinado.", "Se você conseguiu seguir o plano.", ["GAT", "ROT"], { tipo: A, nivel: "N2" }),
    E("FU-E1", "fungico", "E", "Refeição como cuidado", "Preparar ou montar uma refeição na semana com atenção e carinho por você.", "1 vez na semana.", "Como você se sentiu ao cuidar de si.", ["PRO"], { tipo: A, nivel: "N4" }),
    E("FU-E2", "fungico", "E", "Um momento antes de comer", "Fazer uma pausa de três respirações antes da refeição principal.", "1 vez por dia.", "Se a refeição fica mais tranquila.", [], { tipo: A, nivel: "N2" }),
    E("FU-E3", "fungico", "E", "Cuidar do ambiente da refeição", "Deixar o lugar da refeição mais agradável (mesa arrumada, sem telas).", "Quando possível.", "Se isso muda a forma de comer.", ["RODA"], { tipo: A, nivel: "N2" }),
    E("FU-E4", "fungico", "E", "Gentileza com o processo", "Anotar uma pequena conquista do cuidado com a alimentação na semana.", "1 vez na semana.", "O que já está mudando.", ["CARTA"], { tipo: R, nivel: "N2" }),
    /* ACIDO INFLAMATORIO */
    E("AI-C1", "acido_inflamatorio", "C", "Diário do desconforto", "Dar uma nota de 0 a 10 para o desconforto e anotar o momento do dia.", "1 vez por dia.", "Os padrões de horário e de dia.", ["ROT"], { tipo: O, nivel: "N3",
      cuidado: "Dor persistente, intensa ou que piora pede avaliação de quem acompanha a saúde do paciente." }),
    E("AI-C2", "acido_inflamatorio", "C", "Movimento possível", "Retomar ou manter um movimento já considerado seguro para você (caminhar, alongar).", "Na frequência combinada no atendimento.", "Como o corpo responde nas horas seguintes.", ["MOM", "OQ3"], { tipo: A, nivel: "N1",
      cuidado: "Não é prescrição de exercício: com dor, limitação ou condição clínica, respeitar a orientação do profissional responsável." }),
    E("AI-C3", "acido_inflamatorio", "C", "Dias bons e dias difíceis", "Anotar o que comeu e como foi o dia em 2 dias de mais e 2 dias de menos desconforto.", "4 dias na semana.", "As diferenças entre esses dias.", ["ROT"], { tipo: O, nivel: "N3" }),
    E("AI-C4", "acido_inflamatorio", "C", "Hora regular para deitar", "Escolher um horário para deitar e tentar mantê-lo.", "Todas as noites.", "A rigidez e a disposição ao acordar.", ["ROT"], { tipo: A, nivel: "N1" }),
    E("AI-M1", "acido_inflamatorio", "M", "Tensão e desconforto", "Anotar o nível de tensão do dia (0 a 10) ao lado da nota do desconforto.", "1 vez por dia.", "Se tensão e desconforto variam juntos.", ["GAT"], { tipo: O, nivel: "N3" }),
    E("AI-M2", "acido_inflamatorio", "M", "Pausa breve de respiração e percepção corporal", "Fazer pausas curtas para respirar e perceber o corpo.", "3 vezes por dia.", "Se algo muda depois das pausas.", [], { tipo: A, nivel: "N2" }),
    E("AI-M3", "acido_inflamatorio", "M", "Como o desconforto muda o seu cuidado?", "Quando o desconforto aparecer, anotar o que muda na sua alimentação, no descanso ou na rotina.", "Quando acontecer.", "O que muda no cuidado nos dias de desconforto.", ["ROT"], { tipo: R, nivel: "N3" }),
    E("AI-M4", "acido_inflamatorio", "M", "Proteger uma pausa de cuidado", "Identificar uma parte da rotina que está impedindo alimentação, descanso ou autocuidado e testar uma proteção possível.", "Durante a semana.", "Se você conseguiu proteger essa pausa.", ["ROT"], { tipo: A, nivel: "N2" }),
    E("AI-E1", "acido_inflamatorio", "E", "Prazer que cabe no corpo de hoje", "Escolher uma atividade prazerosa que respeite o seu ritmo atual.", "1 vez na semana.", "Como você se sentiu depois.", ["RODA"], { tipo: A, nivel: "N4",
      cuidado: "Se a atividade envolver esforço físico e houver dor, respeitar a orientação do profissional responsável." }),
    E("AI-E2", "acido_inflamatorio", "E", "Reservar espaço para descanso", "Reservar um momento da semana para descansar.", "1 vez na semana.", "Se foi possível descansar.", ["MOM"], { tipo: A, nivel: "N1" }),
    E("AI-E3", "acido_inflamatorio", "E", "Reconhecer o que o corpo permitiu hoje", "Anotar uma coisa que o seu corpo permitiu fazer no dia, sem obrigação de sentir gratidão.", "3 vezes na semana.", "O que você percebeu ao anotar.", ["CARTA"], { tipo: R, nivel: "N4",
      cuidado: "Opcional: com relação difícil com o corpo, pode soar artificial. Use só se fizer sentido para a pessoa." }),
    E("AI-E4", "acido_inflamatorio", "E", "Ritmo com sentido", "Ligar o cuidado com o corpo a algo que você quer continuar fazendo.", "Durante a semana.", "Se isso ajuda a manter o cuidado.", ["PQQ", "PRO"], { tipo: R, nivel: "N4" }),
    /* DETOX E LINFATICO */
    E("DL-C1", "detox_linfatico", "C", "Registro do intestino", "Anotar como foi o funcionamento intestinal (frequência e conforto).", "Todos os dias.", "O que muda nos dias diferentes.", ["ROT"], { tipo: O, nivel: "N3",
      cuidado: "Mudança importante do hábito intestinal, dor, sangue ou outros sinais de alarme pedem avaliação clínica." }),
    E("DL-C2", "detox_linfatico", "C", "Água em momentos fixos", "Ligar a água a momentos do dia: ao acordar, nas pausas e nas refeições.", "Todos os dias.", "A facilidade de lembrar da água, a sede e a rotina.", ["ROT"], { tipo: A, nivel: "N1" }),
    E("DL-C3", "detox_linfatico", "C", "Pausas de movimento", "Levantar e se movimentar alguns minutos nos períodos longos sentada.", "Várias vezes ao dia.", "Como você se sente no fim do dia.", ["ROT", "MOM"], { tipo: A, nivel: "N1" }),
    E("DL-C4", "detox_linfatico", "C", "Diário do inchaço", "Anotar em que momento o inchaço aparece e o que veio antes.", "Quando acontecer.", "A relação com alimentação, tempo sentada e sono.", ["ROT"], { tipo: O, nivel: "N3",
      cuidado: "Inchaço novo, importante, de um lado só, doloroso ou persistente precisa de avaliação clínica." }),
    E("DL-M1", "detox_linfatico", "M", "Sem adiar", "Notar se a rotina corrida faz você adiar a ida ao banheiro.", "Durante a semana.", "Quando isso acontece.", ["ROT"], { tipo: O, nivel: "N2" }),
    E("DL-M2", "detox_linfatico", "M", "Tensão e intestino", "Anotar os dias de mais tensão ao lado do registro do intestino.", "Todos os dias.", "Se tensão e intestino variam juntos.", ["GAT"], { tipo: O, nivel: "N3" }),
    E("DL-M3", "detox_linfatico", "M", "Ideias sobre “limpar o corpo”", "Observar ideias que levam a restrições ou a “compensar” e trazer para a próxima conversa.", "Durante a semana.", "Quando essas ideias aparecem.", ["CRE"], { tipo: R, nivel: "N2" }),
    E("DL-M4", "detox_linfatico", "M", "Plano para os dias corridos", "Usar o mínimo que combinamos para os dias mais corridos.", "Nos dias corridos.", "Se você conseguiu manter o mínimo.", ["GAT", "ROT"], { tipo: A, nivel: "N2" }),
    E("DL-E1", "detox_linfatico", "E", "Manhã sem pressa", "Criar alguns minutos tranquilos no começo do dia.", "Todas as manhãs.", "Como o seu dia começa.", ["ROT"], { tipo: A, nivel: "N2" }),
    E("DL-E2", "detox_linfatico", "E", "Tempo ao ar livre", "Ter um momento ao ar livre, com calma.", "1 a 2 vezes na semana.", "Sua disposição e seu humor.", ["RODA"], { tipo: A, nivel: "N2" }),
    E("DL-E3", "detox_linfatico", "E", "Proteger um horário de cuidado", "Escolher um horário de refeição, pausa ou cuidado que costuma ser tomado por outras demandas e testar protegê-lo nesta semana.", "Durante a semana.", "Se você conseguiu proteger o horário.", ["ROT", "RODA"], { tipo: A, nivel: "N2" }),
    E("DL-E4", "detox_linfatico", "E", "Ajuda na rotina", "Combinar com alguém da casa uma ajuda concreta (por exemplo, dividir uma tarefa).", "Durante a semana.", "Se sobrou mais espaço para o seu cuidado.", [], { tipo: A, nivel: "N2" }),
    /* MENTAL EMOCIONAL ESPIRITUAL */
    E("MEE-C1", "mental_emocional_espiritual", "C", "Ritual de desacelerar", "Nos 30 minutos antes de dormir, ficar sem telas e repetir a mesma sequência (por exemplo: banho, luz baixa, leitura).", "Todas as noites.", "O tempo para pegar no sono e como você acorda.", ["ROT"], { tipo: A, nivel: "N1" }),
    E("MEE-C2", "mental_emocional_espiritual", "C", "Hora de acordar regular", "Manter um horário parecido para acordar, inclusive no fim de semana.", "Todos os dias.", "Sua disposição pela manhã.", ["ROT"], { tipo: A, nivel: "N1" }),
    E("MEE-C3", "mental_emocional_espiritual", "C", "Última refeição e sono", "Observar o horário, o volume e o contexto da última refeição e como foi o sono.", "Todas as noites.", "Se há diferença no sono conforme a última refeição.", ["ROT"], { tipo: O, nivel: "N3" }),
    E("MEE-C4", "mental_emocional_espiritual", "C", "Luz da manhã", "Ter alguns minutos de luz natural ou de caminhada pela manhã.", "Quando possível.", "Sua disposição e seu humor no dia.", ["ROT", "MOM"], { tipo: A, nivel: "N1" }),
    E("MEE-M1", "mental_emocional_espiritual", "M", "Nomear a emoção", "Antes de comer fora do combinado, dar nome ao que está sentindo e ao que o corpo está sinalizando.", "Sempre que acontecer.", "As emoções e os sinais que se repetem.", ["GAT"], { tipo: R, nivel: "N2" }),
    E("MEE-M2", "mental_emocional_espiritual", "M", "Três respirações", "Fazer três respirações lentas antes de decidir o que comer quando estiver tensa.", "Sempre que acontecer.", "Se a decisão muda depois da pausa.", ["GAT"], { tipo: A, nivel: "N2",
      cuidado: "É uma pausa de decisão, não tratamento de ansiedade. Sofrimento intenso: acompanhamento especializado." }),
    E("MEE-M3", "mental_emocional_espiritual", "M", "Trocar a frase dura", "Quando surgir uma frase dura sobre a alimentação (“comi fora do planejado, estraguei tudo”), anotar e reescrever de forma mais gentil (“uma escolha não define o meu dia”).", "Quando acontecer.", "Como você se sente com a nova frase.", ["CRE"], { tipo: R, nivel: "N2",
      cuidado: "Só frases ligadas à alimentação e ao autocuidado. Não trabalhar crenças centrais, traumas ou autoestima global." }),
    E("MEE-M4", "mental_emocional_espiritual", "M", "Tirar as pendências da cabeça", "Antes de dormir, anotar pendências ou coisas que não quer esquecer e deixá-las para o dia seguinte.", "Nas noites agitadas.", "Se o sono fica mais tranquilo.", [], { tipo: A, nivel: "N2" }),
    E("MEE-E1", "mental_emocional_espiritual", "E", "Um passo alinhado ao propósito", "Escolher uma ação da semana ligada ao que dá sentido à sua vida.", "1 vez na semana.", "Como você se sentiu.", ["PRO", "PQQ"], { tipo: A, nivel: "N4" }),
    E("MEE-E2", "mental_emocional_espiritual", "E", "Contato que nutre", "Ter um contato significativo com alguém de apoio.", "1 vez na semana.", "Como você se sentiu depois.", [], { tipo: A, nivel: "N2" }),
    E("MEE-E3", "mental_emocional_espiritual", "E", "Prática de sentido", "Se já fizer parte da sua vida, reservar um tempo para a sua prática (oração, meditação, contemplação).", "No ritmo combinado com você.", "Como fica o seu dia.", [], { tipo: A, nivel: "N4",
      cuidado: "Somente quando espiritualidade, oração ou meditação já fizerem sentido para o paciente. A nutricionista não indica crença nem prática religiosa." }),
    E("MEE-E4", "mental_emocional_espiritual", "E", "Olhar para o caminho", "No fim da semana, anotar o que te aproximou do cuidado que você deseja manter.", "1 vez na semana.", "O que já está mudando.", ["CARTA"], { tipo: R, nivel: "N4" }),
    /* GERAIS */
    E("G01", "geral", "C", "Registro de 3 dias", "Anotar o que comeu, o horário e como se sentiu.", "3 dias (2 dias úteis e 1 de fim de semana).", "Os horários, a fome e a energia.", ["ROT"], { tipo: O, nivel: "N2",
      cuidado: "Evitar quando registrar aumenta obsessão, culpa ou sofrimento." }),
    E("G02", "geral", "C", "Uma refeição com atenção", "Fazer uma refeição por dia sentada e sem telas.", "Todos os dias.", "O sabor, a saciedade e a calma.", [], { tipo: A, nivel: "N2" }),
    E("G03", "geral", "C", "Planejar a semana", "Reservar um tempo curto para pensar nas refeições da semana.", "1 vez na semana.", "Se os dias ficaram mais fáceis.", ["ROT", "OQ3"], { tipo: A, nivel: "N2" }),
    E("G04", "geral", "C", "Sono regular", "Manter horários parecidos para deitar e acordar.", "Todos os dias.", "Sua disposição.", ["ROT"], { tipo: A, nivel: "N1" }),
    E("G05", "geral", "C", "Movimento de que você gosta", "Escolher um movimento prazeroso, dentro do que é seguro para você.", "Na frequência combinada no atendimento.", "Sua disposição e seu humor.", ["MOM"], { tipo: A, nivel: "N1",
      cuidado: "Incentivo geral, não prescrição de exercício. Com dor ou limitação, respeitar o profissional responsável." }),
    E("G06", "geral", "C", "Água à vista", "Deixar água por perto e beber ao longo do dia.", "Todos os dias.", "A sede e a facilidade de lembrar.", [], { tipo: A, nivel: "N1" }),
    E("G07", "geral", "M", "O momento mais difícil do dia", "Identificar o horário mais difícil e o que acontece antes dele.", "Durante a semana.", "O que se repete.", ["ROT", "GAT"], { tipo: O, nivel: "N3" }),
    E("G08", "geral", "M", "Pausa antes de decidir", "Antes de comer fora do combinado, esperar alguns minutos.", "Sempre que acontecer.", "Se a vontade muda.", ["GAT"], { tipo: A, nivel: "N2" }),
    E("G09", "geral", "M", "Sem tudo ou nada", "Quando algo sair do plano, seguir na próxima refeição como combinado, sem “chutar o balde”.", "Sempre que acontecer.", "Como você lidou com o deslize.", ["CRE"], { tipo: A, nivel: "N2" }),
    E("G10", "geral", "M", "Um avanço por semana", "Anotar uma coisa que deu certo.", "1 vez na semana.", "O que está mudando.", [], { tipo: R, nivel: "N2" }),
    E("G11", "geral", "E", "Lembrar o seu “pra quê”", "Reler a síntese da Escada dos Porquês ou o seu motivo principal.", "2 vezes na semana.", "Se isso ajuda nos momentos difíceis.", ["PQQ", "PRO"], { tipo: R, nivel: "N4" }),
    E("G12", "geral", "E", "Uma área da vida com cuidado", "Escolher uma área da Roda da Vida e um pequeno gesto semanal para ela.", "1 vez na semana.", "Como você se sentiu.", ["RODA"], { tipo: A, nivel: "N4", requer: "roda_vida" }),
    E("G13", "geral", "E", "Pessoa de apoio", "Combinar com alguém de confiança como essa pessoa pode te apoiar nesta fase.", "Durante a semana.", "Se você se sentiu apoiada.", [], { tipo: A, nivel: "N2" }),
    E("G14", "geral", "E", "Pausa de presença", "Antes de uma refeição, fazer uma pequena pausa para chegar àquele momento. Se gratidão fizer sentido para você, ela pode fazer parte da pausa.", "1 vez por dia.", "Como fica a refeição.", [], { tipo: A, nivel: "N2" }),
    E("G15", "geral", "E", "Frase da Carta", "Escolher uma frase da Carta ao Futuro Eu para lembrar durante a semana.", "Todos os dias.", "Se a frase ajudou.", ["CARTA"], { tipo: R, nivel: "N4", requer: "carta_futuro" })
  ];

  var POR_ID = {};
  FOCOS.forEach(function (f) { POR_ID[f.id] = f; });
  ESTRATEGIAS.forEach(function (e) { POR_ID[e.id] = e; });

  /* Linha do Momentum: orientacao de QUANTIDADE (decisao D2 do plano; so orienta, nunca trava) */
  var MOMENTUM = {
    preservar: { min: 1, max: 2, rotulo: "Preservar" }, reorganizar: { min: 2, max: 3, rotulo: "Reorganizar" },
    construir: { min: 3, max: 4, rotulo: "Construir" }, expandir: { min: 4, max: 5, rotulo: "Expandir" }
  };
  function chaveMomentum(v) {
    var s = String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return Object.keys(MOMENTUM).filter(function (k) { return s.indexOf(k) >= 0; })[0] || null;
  }
  function orientacaoMomentum(v) { var k = chaveMomentum(v); return k ? Object.assign({ chave: k }, MOMENTUM[k]) : null; }

  /* ---------- selecao das opcoes --------------------------------------------- */
  /* ctx = { prioritarios: [codigos dos sistemas, na ordem do HOLOSCAN], ferramentas: [ferramenta_id aplicadas], foco: id do foco escolhido } */
  function opcoes(ctx) {
    ctx = ctx || {};
    var prio = (ctx.prioritarios || []).filter(function (s) { return NOME_SISTEMA[s]; }).slice(0, 2);
    var aplicadas = ctx.ferramentas || [];
    var outros = SISTEMAS.map(function (s) { return s[0]; }).filter(function (s) { return prio.indexOf(s) < 0; });
    var focos = prio.map(function (s) { return { sistema: s, nome: NOME_SISTEMA[s], prioridade: prio.indexOf(s) + 1, focos: FOCOS.filter(function (f) { return f.sistema === s; }) }; });
    var focosOutros = outros.map(function (s) { return { sistema: s, nome: NOME_SISTEMA[s], prioridade: null, focos: FOCOS.filter(function (f) { return f.sistema === s; }) }; });
    var foco = ctx.foco ? POR_ID[ctx.foco] : null;
    var sisFoco = foco && foco.sistema ? foco.sistema : prio[0] || null;
    var ordemSis = [sisFoco].concat(prio.filter(function (s) { return s !== sisFoco; })).filter(Boolean);
    var combina = function (e) { return e.ferramentas.filter(function (f) { return aplicadas.indexOf(f) >= 0; }).map(function (f) { return NOME_FERR[f]; }); };
    var grupo = function (e) { return e.sistema === sisFoco ? "foco" : ordemSis.indexOf(e.sistema) >= 0 ? "prioritario" : e.sistema === "geral" ? "geral" : "outro"; };
    var peso = { foco: 0, prioritario: 1, geral: 2, outro: 3 };
    var est = ESTRATEGIAS.map(function (e, i) { return { e: e, i: i, g: grupo(e), c: combina(e) }; })
      .filter(function (o) { return o.g !== "outro" && (!o.e.requer || aplicadas.indexOf(o.e.requer) >= 0); })   /* PB-V2: "requer" = so quando a ferramenta foi aplicada */
      .sort(function (a, b) { return peso[a.g] - peso[b.g] || (b.c.length ? 1 : 0) - (a.c.length ? 1 : 0) || a.i - b.i; })
      .map(function (o) { return Object.assign({}, o.e, { grupo: o.g, combina: o.c }); });
    return { versao: VERSAO, focos: focos, focosOutros: focosOutros, sistemaFoco: sisFoco, estrategias: est,
      momentum: orientacaoMomentum(ctx.momentum) };
  }

  /* ---------- itens da direcao ------------------------------------------------ */
  function sufixo() { return Math.random().toString(36).slice(2, 8); }
  function idDe(base) { return (PREFIXO + base + "-" + sufixo()).slice(0, 64); }
  /* id do playbook a partir do id de um item gerado (para a rastreabilidade na visao profissional) */
  function origemPlaybook(itemId) {
    var s = String(itemId || "");
    if (s.indexOf(PREFIXO) !== 0) return null;
    var p = s.slice(PREFIXO.length).split("-");
    while (p.length) { if (POR_ID[p.join("-")]) return p.join("-"); p.pop(); }
    return null;
  }
  function item(base, texto, extra) {
    return Object.assign({ id: idDe(base), texto: String(texto).slice(0, 1000), texto_sugerido: String(texto).slice(0, 1000), origem: "nutricionista", ref: null,
      sugestao: false, confirmado: true, mostrar_paciente: true, descartado: false }, extra || {});
  }
  /* escolha = { foco: { id, texto?, porque? } | { livre: texto }, direcionamentos: [{ titulo, territorio, objetivo, porque? }] (opcional: padrao = os do foco),
     estrategias: [{ id, titulo?, acao?, contexto?, observar?, prazo? }], observar: [texto] (opcional), proxima_etapa: texto (opcional) } */
  function montarDirecao(escolha) {
    escolha = escolha || {};
    var fx = escolha.foco || {}, def = fx.id ? POR_ID[fx.id] : null;
    var focoTxt = (fx.texto || (def && def.texto) || fx.livre || "").trim();
    var porque = (fx.porque !== undefined ? fx.porque : def ? def.porque : "") || "";
    var base = def ? def.id : "LIVRE";
    var out = { foco_atual: focoTxt ? item(base, focoTxt) : null, direcionamentos: [], estrategias: [], corpo: [], mente: [], espirito: [], observar: [], proxima_etapa: null };
    var dirs = escolha.direcionamentos || (def ? def.direcionamentos : []);
    dirs.filter(function (d) { return d && String(d.titulo || "").trim(); }).forEach(function (d, i) {
      out.direcionamentos.push(item(base + "-d" + (i + 1), d.titulo.trim(), { territorio: d.territorio || "integrado", porque: (d.porque !== undefined ? d.porque : porque) || "",
        objetivo: d.objetivo || "", status: "ativo", sistemas: def && def.sistema ? [def.sistema] : [] }));
    });
    var dirPorTerr = function (t) { var d = out.direcionamentos.filter(function (x) { return x.territorio === t; })[0] || out.direcionamentos[0]; return d ? d.id : ""; };
    (escolha.estrategias || []).slice(0, MAX_ESTRATEGIAS).forEach(function (s) {
      var e = POR_ID[s.id] || {};
      var titulo = String(s.titulo || e.titulo || "").trim();
      if (!titulo) return;
      var terr = e.territorio || s.territorio || "corpo";
      var it = item(e.id || "LIVRE-E", titulo, { direcionamento_id: dirPorTerr(terr), finalidade: "", acao: s.acao !== undefined ? s.acao : e.acao || "",
        observar: s.observar !== undefined ? s.observar : e.observar || "", contexto: s.contexto !== undefined ? s.contexto : e.contexto || "",
        prazo: s.prazo !== undefined ? s.prazo : PRAZO_PADRAO, responsavel: "Nutricionista (Playbook HOLOS)", status: "proposta" });
      out.estrategias.push(it);
      if (out[terr]) out[terr].push(item((e.id || "LIVRE-E") + "-t", titulo));
    });
    (escolha.observar || (def ? def.observar : [])).filter(function (x) { return String(x || "").trim(); }).forEach(function (x, i) { out.observar.push(item(base + "-o" + (i + 1), String(x).trim())); });
    var prox = escolha.proxima_etapa !== undefined ? escolha.proxima_etapa : def ? def.proxima_etapa : "";
    if (String(prox || "").trim()) out.proxima_etapa = item(base + "-p", String(prox).trim());
    return out;
  }
  /* resumo para a leitura profissional (rastreabilidade: versao do playbook e ids escolhidos) */
  function resumo(escolha) {
    var f = escolha && escolha.foco || {};
    var ids = (escolha && escolha.estrategias || []).map(function (s) { return s.id; }).filter(function (id) { return POR_ID[id]; });
    return "Montado com o Playbook HOLOS " + VERSAO + " · Foco " + (f.id && POR_ID[f.id] ? f.id : "escrito pela nutricionista") +
      (ids.length ? " · Estratégias " + ids.join(", ") : "") + ".";
  }

  /* todos os textos (para o teste de termos fora do metodo) */
  function textos() {
    var t = [];
    FOCOS.forEach(function (f) { t.push(f.texto, f.porque, f.proxima_etapa); f.observar.forEach(function (x) { t.push(x); }); f.direcionamentos.forEach(function (d) { t.push(d.titulo, d.objetivo); }); });
    ESTRATEGIAS.forEach(function (e) { t.push(e.titulo, e.acao, e.contexto, e.observar); });
    return t;
  }

  var api = { VERSAO: VERSAO, PREFIXO: PREFIXO, SISTEMAS: SISTEMAS, NOME_SISTEMA: NOME_SISTEMA, NOME_TERR: NOME_TERR, NOME_FERR: NOME_FERR,
    FOCOS: FOCOS, ESTRATEGIAS: ESTRATEGIAS, porId: function (id) { return POR_ID[id] || null; }, MAX_ESTRATEGIAS: MAX_ESTRATEGIAS, RECOMENDADO: RECOMENDADO, PAGINAS_PDF: PAGINAS_PDF, paginaPdf: function (f) { return PAGINAS_PDF[f] || null; }, TIPO: TIPO, NIVEL: NIVEL, PRAZO_PADRAO: PRAZO_PADRAO,
    opcoes: opcoes, montarDirecao: montarDirecao, resumo: resumo, textos: textos, origemPlaybook: origemPlaybook, orientacaoMomentum: orientacaoMomentum };
  raiz.PlaybookHolos = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

// ---- shared/sistemas-fechamento.js (embutido) ----
/* ===========================================================================
   SISTEMAS-FECHAMENTO — fechamento deterministico dos CINCO SISTEMAS (MR-V1)
   ===========================================================================

   Motor de resultados HOLOHACKING V1 (12/10, itens 5-14 do pedido). Para cada
   sistema do HOLOSCAN, a partir SO do snapshot salvo do Resultado HOLOS
   (nada recalculado, nenhuma nota alterada):

     A. O QUE ESTE EIXO ORGANIZA          definicao segura aprovada (itens 7-11)
     B. SEU RESULTADO NESTA APLICACAO     nota/faixa salvas, posicao na ordem
                                          "Por onde investigar" (1a/2a area para
                                          aprofundar), cobertura
     C. O QUE MAIS CONTRIBUIU             ate 3 sinais dominantes reais (texto
                                          aprovado da pergunta; item 12)
     D. O QUE ISSO SIGNIFICA              significado comum das notas (item 6)
     E. O QUE ISSO NAO SIGNIFICA          ressalva segura (item 6)
     F. O QUE PODE MERECER APROFUNDAMENTO texto aprovado do sistema, quando
                                          existe (itens 7-11); senao PENDENCIA
     G. PROXIMO PASSO                     so o catalogo vigente (PP-V1, item 14):
                                          SISTEMA -> CATALOGO -> FERRAMENTA. Os
                                          sinais NAO escolhem a ferramenta.

   Nao gera: diagnostico, doenca, gravidade, risco, causa, prescricao, conduta.
   Onde nao ha texto aprovado: PENDENCIA METODOLOGICA (so na visao profissional).

   Funciona no navegador (window.SistemasFechamento) e no Node (testes).
   =========================================================================== */
(function (raiz) {
  "use strict";

  var VERSAO = "MR-V1";
  var SELO_PENDENCIA = "PENDÊNCIA METODOLÓGICA";

  /* A + F: textos do pedido de 12/10 (itens 7-11), literais. Onde o pedido descreve o que dizer sem dar a frase
     ("indicar que ..."), a frase abaixo diz exatamente aquilo, sem acrescentar tema. */
  var SISTEMAS = {
    fungico: {
      definicao: "Categoria autoral que organiza determinados relatos digestivos, alimentares, sensoriais, de hábitos e vitalidade previstos pelo HOLOSCAN.",
      prioritario: "Este eixo concentrou mais marcadores nesta aplicação e merece ser aprofundado no contexto da alimentação, rotina e sinais relatados."
    },
    acido_inflamatorio: {
      definicao: "Categoria autoral que organiza relatos relacionados a desconfortos, dor, irritação e reatividade percebida.",
      prioritario: "Vale contextualizar quando e em que situações os desconfortos aparecem."
    },
    metabolico: {
      definicao: "Organiza relatos relacionados a energia, fome, comportamento alimentar, refeições e resposta percebida à alimentação e à rotina.",
      prioritario: "Alimentação, horários, fome, energia e rotina merecem aprofundamento."
    },
    detox_linfatico: {
      definicao: "Categoria autoral que organiza determinados relatos ligados a eliminação, funcionamento intestinal, retenção percebida, rotina e outros elementos previstos no questionário.",
      /* homologado em 13/10 (fechamento de homologacao do MR-V1), literal; a ressalva vai sempre junto */
      prioritario: "Quando este eixo aparece entre as primeiras áreas para aprofundar, vale observar como funcionamento intestinal, retenção percebida, alimentação, hidratação, movimento e organização da rotina aparecem no contexto real da paciente.",
      ressalva: "Esse resultado não mede toxinas, capacidade de detoxificação, função hepática ou fluxo linfático."
    },
    mental_emocional_espiritual: {
      definicao: "Organiza relatos relacionados a pensamentos, emoções, comportamento, autorregulação, identidade, conexão, pertencimento, valores e sentido.",
      prioritario: "Este domínio concentrou marcadores que merecem aprofundamento dentro dos limites da atuação nutricional."
    }
  };
  /* item 7, "se nao prioritario": frase transversal HOMOLOGADA em 13/10 para os cinco sistemas (fora das 2 primeiras areas) */
  var NAO_PRIORITARIO = "Este eixo apresentou relativamente menos marcadores do que as áreas prioritárias desta aplicação.";
  var PENDENCIA_PRIORITARIO = "Não há texto aprovado de aprofundamento para este sistema quando ele aparece como área prioritária.";

  /* Termos que NUNCA aparecem no fechamento (itens 7-11 e 13). Usado pelos testes de linguagem proibida. Os de "todos"
     so podem aparecer NEGADOS no bloco E (item 6: "nao significa doenca, gravidade, risco...") — o teste tira o bloco E. */
  var PROIBIDOS = {
    fungico: ["candid", "fungo", "fúngica", "infecç", "microbi"],
    acido_inflamatorio: ["inflamação sistêmica", "corpo ácido", "acidose", "pH"],
    metabolico: ["resistência à insulina", "diabet", "doença metabólica", "tireoid"],
    detox_linfatico: ["toxina", "detoxificação", "falha linfática", "hepátic"],
    mental_emocional_espiritual: ["transtorno", "doença psicológica", "problema espiritual", "trauma", "causa emocional"],
    todos: ["mais grave", "pior sistema", "prioridade clínica", "risco", "isso causou", "diagnóstico de "]
  };

  /* D: significado comum das notas (item 6), pela faixa salva */
  var SIGNIFICADO = {
    baixa: "Nota mais baixa indica maior concentração dos marcadores contemplados neste eixo dentro do instrumento e, por isso, maior motivo de aprofundamento.",
    intermediaria: "Nota intermediária indica uma posição intermediária dentro da escala do instrumento. Não possui significado clínico independente.",
    alta: "Nota mais alta indica menor carga relativa dos itens que reduzem a nota neste eixo nesta aplicação."
  };
  /* E: o que NAO significa (item 6) */
  var NAO_SIGNIFICA = {
    baixa: "Não significa doença, gravidade, risco nem pior saúde.",
    intermediaria: "Não indica doença nem normalidade.",
    alta: "Não significa ausência de doença, \"sistema saudável\" nem normalidade clínica."
  };
  var SEM_NOTA = "Sem nota nesta aplicação (menos respostas do que o mínimo): este eixo não entra na ordem de aprofundamento.";
  var INTRO_SINAIS = "Alguns dos sinais que mais contribuíram para este eixo nesta aplicação:";
  var RESSALVA_SINAIS = "Estes foram alguns dos itens que mais contribuíram para a pontuação deste eixo.";
  var SINAIS_FORA = "Os sinais que mais contribuíram não foram registrados neste resultado.";
  /* G: item 14, texto seguro */
  var PP_POR_QUE = "A ferramenta é sugerida pelo catálogo para aprofundar este sistema.";
  var PP_SINAIS = "Estes sinais mostram por que o sistema apareceu como prioridade. Não foram eles que escolheram a ferramenta: a ferramenta vem do catálogo, pelo sistema.";

  var NOME_FERRAMENTA = {
    oq3: "OQ³", linha_momentum: "Linha do Momentum", mapa_rotina_v1: "Mapa da Rotina",
    pqq: "PQQ", mapa_crencas: "Mapa de Crenças Alimentares", gatilhos_respostas_v1: "Gatilhos & Respostas",
    mapa: "Mapa do Propósito", roda_vida: "Roda Holística da Vida", carta_futuro: "Carta ao Futuro Eu", conexao_pertencimento_v1: "Conexão & Pertencimento"
  };

  function num(v) { return typeof v === "number" && !isNaN(v); }
  function temNota(s) { return !!s && s.avaliavel !== false && num(s.nota); }
  function fmt(v) { return num(v) ? (Math.round(v * 10) / 10).toString().replace(".", ",") : "—"; }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* a MESMA ordem de "Por onde investigar" do HOLOSCAN, da Sintese e dos Proximos Passos */
  function ordem(sistemas) {
    if (raiz.ResultadoSintese && raiz.ResultadoSintese.ordenar) return raiz.ResultadoSintese.ordenar(sistemas);
    var A = raiz.HoloAusencia, l = (sistemas || []).slice();
    if (A && A.porLeitura) l.sort(A.porLeitura); else l.sort(function (a, b) { return (a.nota || 0) - (b.nota || 0); });
    return l.filter(temNota);
  }

  /* C: dominantes do snapshot (template 4); em resultado anterior, os congelados nos Proximos Passos (mesma conta);
     sem nenhum dos dois, nada (nunca recalculado aqui) */
  function sinaisDe(s, pp) {
    if (Array.isArray(s.dominantes)) return { origem: "resultado", lista: s.dominantes.slice(0, 3).map(function (d) { return { question_id: d.question_id, texto: d.enunciado || d.rotulo || d.question_id }; }) };
    var o = pp && pp.registrado ? (pp.systems_order || []).filter(function (x) { return x.system_id === s.sistema; })[0] : null;
    if (o && Array.isArray(o.dominantes)) return { origem: "proximos_passos", lista: o.dominantes.slice(0, 3).map(function (d) { return { question_id: d.question_id, texto: d.rotulo || d.enunciado || d.question_id }; }) };
    return { origem: "nenhuma", lista: [] };
  }

  /* G: as ferramentas que o catalogo vigente congelou para ESTE sistema (pendentes do atendimento, template 3+;
     senao a selecao original). Nunca escolhidas aqui. */
  function proximoPasso(s, pp, sinais, nomeF) {
    if (!pp || !pp.registrado) return [];
    var pend = pp.pendentes && Array.isArray(pp.pendentes.selection) ? pp.pendentes.selection : null;
    var sel = pend || (Array.isArray(pp.selection) ? pp.selection : []);
    var vis = function (id) { return (raiz.FERRAMENTAS_OCULTAS || []).indexOf(id) < 0; };
    return sel.filter(function (x) { return x.system_id === s.sistema && vis(x.tool_id); }).map(function (x) {
      return { tool_id: x.tool_id, nome: nomeF(x.tool_id), papel: x.papel, rule_id: x.rule_id || null,
        por_que: PP_POR_QUE, investiga: x.professional_reason || null, fazer_agora: x.next_action || null,
        sinais_intro: PP_SINAIS, sinais: sinais.lista.slice() };
    });
  }

  /* O fechamento de UM sistema. pos = 1, 2, ... na ordem de investigacao (null sem nota). */
  function fechamento(s, pos, pp, nomeF) {
    var def = SISTEMAS[s.sistema] || null, avaliavel = temNota(s);
    /* V6 (13/10): sistema sem carga (nota maxima, nenhum item pontuou) nao e "area prioritaria" mesmo na posicao 1-2 da ordem */
    var semCarga = avaliavel && s.nota >= 10;
    var prioritario = avaliavel && (pos === 1 || pos === 2) && !semCarga;
    var sinais = avaliavel ? sinaisDe(s, pp) : { origem: "nenhuma", lista: [] };
    var pend = [];
    var aprofundar = null, ressalva = null;
    if (!def) pend.push("Sistema sem definição aprovada no motor de resultados (" + s.sistema + ").");
    if (avaliavel && def) {
      if (prioritario) {
        if (def.prioritario) { aprofundar = def.prioritario; ressalva = def.ressalva || null; }
        else pend.push(PENDENCIA_PRIORITARIO);
      } else aprofundar = NAO_PRIORITARIO;
    }
    return {
      motor: VERSAO,
      sistema: s.sistema,
      nome: s.nome || s.sistema,
      organiza: def ? def.definicao : null,                                  // A
      resultado: {                                                           // B
        avaliavel: avaliavel, nota: avaliavel ? s.nota : null, faixa: avaliavel ? (s.faixa || null) : null,
        posicao: avaliavel ? pos : null, prioridade: prioritario ? pos + "ª área para aprofundar" : null,
        respondidos: num(s.respondidos) ? s.respondidos : null, total: num(s.total_marcadores) ? s.total_marcadores : null
      },
      contribuiu: { intro: INTRO_SINAIS, ressalva: RESSALVA_SINAIS, origem: sinais.origem, sinais: sinais.lista },   // C
      significado: avaliavel ? (SIGNIFICADO[s.faixa] || null) : SEM_NOTA,    // D
      nao_significa: avaliavel ? (NAO_SIGNIFICA[s.faixa] || null) : null,    // E
      aprofundamento: aprofundar,                                            // F
      ressalva_aprofundamento: ressalva,
      proximo_passo: prioritario ? proximoPasso(s, pp, sinais, nomeF) : [],  // G
      pendencias: pend
    };
  }

  /* Os cinco fechamentos, na ordem do pacote (como o snapshot traz). */
  function deResultado(snap, nomeFerramenta) {
    snap = snap || {};
    var nomeF = nomeFerramenta || function (id) { return NOME_FERRAMENTA[id] || id; };
    var h = snap.holoscan || {}, sis = h.sistemas || [], pp = snap.proximos_passos || null;
    var ord = ordem(sis).map(function (s) { return s.sistema; });
    return sis.map(function (s) { var i = ord.indexOf(s.sistema); return fechamento(s, i >= 0 ? i + 1 : null, pp, nomeF); });
  }

  /* Template < 4 desenhado com o motor atual: item 40 do pedido */
  var ROTULO_HISTORICO = "Gerado com o motor de resultados atual a partir do registro histórico.";
  function historico(snap) { return ((snap && snap.template_version) || 1) < 4; }

  /* ---------- desenho ----------------------------------------------------------- */
  function lista(itens) { return '<ul class="sf-sinais">' + itens.map(function (d) { return "<li>" + esc(d.texto) + "</li>"; }).join("") + "</ul>"; }
  function blocoPP(p, paciente) {
    if (paciente) return '<p class="sf-pp-pac"><b>Próximo aprofundamento sugerido:</b> ' + esc(p.nome) + "</p>";
    return '<div class="sf-pp" data-sf-pp="' + esc(p.tool_id) + '">' +
      '<p class="sf-pp-tit"><span class="sf-rot">Ferramenta sugerida pelo catálogo' + (p.papel === "principal" ? " (principal)" : "") + "</span> <b>" + esc(p.nome) + "</b></p>" +
      '<p><span class="sf-rot">Por que esta ferramenta aparece aqui</span> ' + esc(p.por_que) + "</p>" +
      (p.investiga ? '<p><span class="sf-rot">O que ela ajuda a investigar</span> ' + esc(p.investiga) + "</p>" : "") +
      (p.fazer_agora ? '<p><span class="sf-rot">O que fazer agora</span> ' + esc(p.fazer_agora) + "</p>" : "") +
      /* V6 (13/10): os sinais ficam so no bloco C ("Pontuou neste sistema"); aqui nao, para nao parecer que a pergunta escolheu a ferramenta */
      "</div>";
  }
  /* ---------- visao da PACIENTE: linguagem simples (rodada de UX de 13/10) — a profissional continua com o texto tecnico ---------- */
  var INTRO_SINAIS_PACIENTE = "Os itens abaixo são alguns dos que mais contribuíram matematicamente para este eixo dentro da organização autoral do HOLOSCAN. Essa associação ajuda a orientar a investigação e não significa que um desses fatores cause os outros.";
  var PP_PACIENTE_TITULO = "Possíveis próximos aprofundamentos";
  var PP_PACIENTE_ESCOLHA = "A escolha do que aplicar e em qual momento é feita com sua nutricionista.";
  /* "Categoria autoral que organiza..." / "Organiza..." -> "Este eixo reune..." (mesmo conteudo, sem jargao) */
  function definicaoPaciente(t) { return String(t || "").replace(/^(Categoria autoral que organiza|Organiza)\s+/, "Este eixo reúne "); }
  function significadoPaciente(t) { return String(t || "").replace("Não possui significado clínico independente.", "Essa nota, sozinha, não indica uma condição de saúde."); }
  /* pos-teste MR-V1 13/10: dentro de um sistema nao ha "Principal" (o papel principal/complementar e do motor global PP-V1):
     so a frase neutra e as ferramentas na ordem do catalogo */
  var PP_PACIENTE_LEAD = "Ferramenta que pode ajudar a aprofundar este eixo:";
  var PP_PACIENTE_LEAD_VARIAS = "Ferramentas que podem ajudar a aprofundar este eixo:";
  function ppPaciente(lista) {
    var nomes = lista.map(function (p) { return esc(p.nome); });
    var txt = nomes.length > 1 ? nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1] : nomes[0];
    return '<div class="sf-bloco sf-g sf-g-pac"><span class="sf-rot">' + PP_PACIENTE_TITULO + "</span>" +
      '<p class="sf-pp-lead">' + (lista.length > 1 ? PP_PACIENTE_LEAD_VARIAS : PP_PACIENTE_LEAD) + ' <b>' + txt + "</b></p>" +
      '<p class="sf-nota">' + PP_PACIENTE_ESCOLHA + "</p></div>";
  }
  /* versao COMPACTA (paciente, "Detalhes do mapa"): nome, nota, marcadores, definicao curta */
  function htmlSistemaCompacto(f, extras) {
    var r = f.resultado; extras = extras || {};
    return '<article class="rh-sis sf-sis sf-compacto rh-faixa-' + esc(r.faixa || "sem") + '" data-sf-sistema="' + esc(f.sistema) + '">' +
      "<header><h4>" + esc(f.nome) + '</h4><span class="rh-sis-nota">' + (r.avaliavel ? fmt(r.nota) : "—") + "</span></header>" +
      '<p class="rh-sis-faixa">' + (r.prioridade ? '<b class="sf-prioridade">' + esc(r.prioridade) + "</b> · " : "") +
        esc(r.avaliavel ? (extras.faixaPaciente ? extras.faixaPaciente(r.faixa) : "") : "sem nota") + "</p>" +
      (f.organiza ? '<p class="sf-def-curta">' + esc(definicaoPaciente(f.organiza)) + "</p>" : "") + "</article>";
  }

  /* visao: "profissional" | "paciente". Paciente: sem faixa tecnica, sem cobertura, sem pendencia, sem regra. */
  function htmlSistema(f, visao, extras) {
    var paciente = visao === "paciente", r = f.resultado;
    extras = extras || {};
    var faixaTxt = r.avaliavel ? (paciente ? (extras.faixaPaciente ? extras.faixaPaciente(r.faixa) : "") : "faixa " + (extras.faixaTxt ? extras.faixaTxt(r.faixa) : r.faixa)) : "sem nota";
    var h = '<article class="rh-sis sf-sis rh-faixa-' + esc(r.faixa || "sem") + (r.prioridade ? " sf-prioritario" : "") + '" data-sf-sistema="' + esc(f.sistema) + '">' +
      "<header><h4>" + esc(f.nome) + '</h4><span class="rh-sis-nota">' + (r.avaliavel ? fmt(r.nota) : "—") + "</span></header>" +
      '<p class="rh-sis-faixa">' + (r.prioridade ? '<b class="sf-prioridade">' + esc(r.prioridade) + "</b> · " : "") + esc(faixaTxt) +
        (!paciente && r.total !== null ? " · " + esc(r.respondidos + " de " + r.total) + " respondidas" : "") + "</p>";
    if (f.organiza) h += '<div class="sf-bloco sf-a"><span class="sf-rot">O que este eixo ' + (paciente ? "reúne" : "organiza") + "</span><p>" + esc(paciente ? definicaoPaciente(f.organiza) : f.organiza) + "</p></div>";
    if (r.avaliavel) {
      h += '<div class="sf-bloco sf-c"><span class="sf-rot">O que mais contribuiu para este resultado</span>' +
        (f.contribuiu.sinais.length ? (paciente ? '<p class="sf-nota">' + esc(INTRO_SINAIS_PACIENTE) + "</p>" + lista(f.contribuiu.sinais)
            : '<p class="sf-nota">' + esc(f.contribuiu.intro) + "</p>" + lista(f.contribuiu.sinais) + '<p class="sf-nota">' + esc(f.contribuiu.ressalva) + "</p>")
          : '<p class="sf-nota">' + esc(f.contribuiu.origem === "nenhuma" && !paciente ? SINAIS_FORA : "Nenhum sinal pontuou neste eixo nesta aplicação.") + "</p>") + "</div>";
    }
    if (f.significado) h += '<div class="sf-bloco sf-d"><span class="sf-rot">O que isso significa dentro do HOLOSCAN</span><p>' + esc(paciente ? significadoPaciente(f.significado) : f.significado) + "</p></div>";
    if (f.nao_significa) h += '<div class="sf-bloco sf-e"><span class="sf-rot">O que isso não significa</span><p>' + esc(f.nao_significa) + " O HOLOSCAN não é diagnóstico.</p></div>";
    if (f.aprofundamento) h += '<div class="sf-bloco sf-f"><span class="sf-rot">O que pode merecer aprofundamento</span><p>' + esc(f.aprofundamento) + "</p>" +
      (f.ressalva_aprofundamento ? '<p class="sf-ressalva">' + esc(f.ressalva_aprofundamento) + "</p>" : "") + "</div>";
    if (!paciente && f.pendencias.length) h += '<div class="sf-bloco sf-f sf-pend"><span class="sf-rot">' + SELO_PENDENCIA + "</span>" + f.pendencias.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
    if (f.proximo_passo.length && paciente && extras.mostrarPP) h += ppPaciente(f.proximo_passo);
    else if (f.proximo_passo.length && !paciente) {
      h += '<div class="sf-bloco sf-g"><span class="sf-rot">Próximo passo pelo catálogo</span>' + f.proximo_passo.map(function (p) { return blocoPP(p, paciente); }).join("") + "</div>";
    }
    return h + "</article>";
  }

  var api = {
    VERSAO: VERSAO, SISTEMAS: SISTEMAS, NAO_PRIORITARIO: NAO_PRIORITARIO, SIGNIFICADO: SIGNIFICADO, NAO_SIGNIFICA: NAO_SIGNIFICA,
    PROIBIDOS: PROIBIDOS, PP_POR_QUE: PP_POR_QUE, PP_SINAIS: PP_SINAIS, INTRO_SINAIS: INTRO_SINAIS, RESSALVA_SINAIS: RESSALVA_SINAIS,
    ROTULO_HISTORICO: ROTULO_HISTORICO, SELO_PENDENCIA: SELO_PENDENCIA, PENDENCIA_PRIORITARIO: PENDENCIA_PRIORITARIO,
    fechamento: fechamento, deResultado: deResultado, historico: historico, htmlSistema: htmlSistema, htmlSistemaCompacto: htmlSistemaCompacto,
    INTRO_SINAIS_PACIENTE: INTRO_SINAIS_PACIENTE, PP_PACIENTE_TITULO: PP_PACIENTE_TITULO, PP_PACIENTE_ESCOLHA: PP_PACIENTE_ESCOLHA, PP_PACIENTE_LEAD: PP_PACIENTE_LEAD, PP_PACIENTE_LEAD_VARIAS: PP_PACIENTE_LEAD_VARIAS, definicaoPaciente: definicaoPaciente
  };
  raiz.SistemasFechamento = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

// ---- contrato e exemplo HOLOS_AI_RESULT v1 (embutidos) ----
const contrato = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"holohacking:holos-ai-result:1","title":"HOLOS_AI_RESULT (schema_version 1)","description":"Saída canônica da HOLOS AI, importável pelo HoloHacking. Tudo é SUGERIDO; a nutricionista confirma, edita ou descarta. Todas as chaves são obrigatórias (meta, entrada, ferramentas_ja_aplicadas e plano_acompanhamento também; {} ou [] quando não houver material). Campos sem material: lista vazia, \"Sem dado\" ou \"Ainda não aprofundado nesta etapa.\" — nunca conteúdo inventado. Fechamento 14/10/2026 (mesmo schema_version 1).","type":"object","required":["schema_version","tipo","meta","entrada","sintese_integrada","o_que_apareceu","convergencias","padroes_observados","pontos_para_aprofundar","sistemas_prioritarios","ferramentas_ja_aplicadas","ferramentas_recomendadas","direcionamentos","estrategias","corpo","mente","espirito","o_que_observar","plano_acompanhamento","roteiro_proxima_consulta","proxima_etapa","rascunho_paciente","alertas_profissionais","fontes_utilizadas"],"properties":{"schema_version":{"const":1},"tipo":{"enum":["primeira_consulta","retorno"]},"meta":{"type":"object","description":"Obrigatório (pode ser {}).","properties":{"agente":{"type":"string"},"kb_version":{"type":"string"},"identificador":{"type":"string","description":"Iniciais ou ID que vieram no documento. Nunca CPF, telefone ou endereço."},"data_atendimento":{"type":"string","description":"AAAA-MM-DD ou \"Sem dado\""},"data_analise":{"type":"string"}}},"entrada":{"type":"object","description":"Obrigatório (pode ser {}).","properties":{"documentos":{"type":"array","items":{"enum":["pacote_holos_ai","pdf_resultado_holos"]}},"base_principal":{"enum":["pacote_holos_ai","pdf_resultado_holos"],"description":"Com os dois, sempre pacote_holos_ai."},"observacao":{"type":"string"}}},"sintese_integrada":{"type":"string"},"o_que_apareceu":{"type":"array","items":{"type":"object","required":["texto","fonte"],"properties":{"texto":{"type":"string"},"fonte":{"type":"string"}}}},"convergencias":{"type":"array","items":{"type":"object","required":["tipo","texto"],"properties":{"tipo":{"enum":["convergencia","conflito"]},"texto":{"type":"string"},"fontes":{"type":"array","items":{"type":"string"}}}}},"padroes_observados":{"type":"array","items":{"type":"string"}},"pontos_para_aprofundar":{"type":"array","items":{"type":"object","required":["tipo","texto","so_profissional"],"properties":{"tipo":{"enum":["questao","hipotese"]},"texto":{"type":"string"},"so_profissional":{"type":"boolean","description":"Hipótese é sempre true: nunca vai para a paciente."}}}},"sistemas_prioritarios":{"type":"array","description":"Como vieram no documento. Nunca recalcular nota, faixa ou ordem.","items":{"type":"object","required":["ordem","sistema","nota","posicao"],"properties":{"ordem":{"type":"integer","minimum":1},"sistema":{"type":"string"},"nota":{"type":"string","description":"Exatamente como no documento (ex.: \"2,4\")."},"posicao":{"type":"string"},"o_que_apareceu":{"type":"string"},"o_que_observar":{"type":"string"},"como_cuidar":{"type":"string","description":"Texto oficial do arquivo 02 + limite do eixo."}}}},"ferramentas_ja_aplicadas":{"type":"array","description":"Obrigatório (pode ser []).","items":{"type":"object","required":["ferramenta","situacao","o_que_esclareceu"],"properties":{"ferramenta":{"type":"string"},"situacao":{"enum":["concluida","em_andamento","aplicada_anteriormente"]},"o_que_esclareceu":{"type":"string"}}}},"ferramentas_recomendadas":{"type":"array","maxItems":3,"description":"Até 3, pela regra PP-V1 do arquivo 05. Sem duplicatas; nunca uma ferramenta concluída no mesmo encontro enquanto houver alternativa.","items":{"type":"object","required":["ordem","papel","regra_id","ferramenta","territorio","sistema","por_que","status"],"properties":{"ordem":{"type":"integer","minimum":1,"maximum":3},"papel":{"enum":["principal","complementar"]},"regra_id":{"type":"string","pattern":"^REC-(FUN|AIN|MET|DTL|MEE)-0[1-6]$"},"ferramenta":{"type":"string"},"territorio":{"enum":["Corpo","Mente","Espírito"]},"sistema":{"type":"string"},"por_que":{"type":"string"},"como_aplicar":{"type":"string"},"o_que_procurar":{"type":"string"},"status":{"const":"SUGERIDO"}}}},"direcionamentos":{"type":"array","items":{"type":"object","required":["id","origem","titulo","por_que","objetivo","baseado_em","catalogo","status"],"properties":{"id":{"type":"string","pattern":"^D[0-9]+$"},"origem":{"enum":["existente","nova"]},"titulo":{"type":"string"},"territorio":{"enum":["Corpo","Mente","Espírito",null]},"sistema":{"type":["string","null"],"description":"null quando não há vínculo. Nunca inventar vínculo."},"por_que":{"type":"string"},"objetivo":{"type":"string"},"baseado_em":{"type":"array","minItems":1,"items":{"type":"string"}},"catalogo":{"type":"string","description":"Status técnico. Sem catálogo homologado: \"not_catalogued\" (na tela: SUGESTÃO HOLOS AI — REQUER REVISÃO PROFISSIONAL)."},"status":{"const":"SUGERIDO"}}}},"estrategias":{"type":"array","items":{"type":"object","required":["id","origem","titulo","territorio","classificacao","decisao_sugerida","o_que_fazer","baseado_em","catalogo","status"],"properties":{"id":{"type":"string","pattern":"^E[0-9]+$"},"origem":{"enum":["acordada","nova"],"description":"acordada = já estava no documento; nova = sugerida pela HOLOS AI."},"titulo":{"type":"string"},"territorio":{"enum":["Corpo","Mente","Espírito"]},"direcionamento_id":{"type":["string","null"]},"classificacao":{"enum":["observacao","comportamental_metodologica","requer_decisao_profissional_na_conduta"],"description":"Estratégia é da paciente. Tarefa da Conduta (composição, alimentos, quantidade, suplemento, protocolo, prescrição) não é estratégia: vai para alertas_profissionais tipo conduta. requer_decisao_profissional_na_conduta só para um comportamento da paciente que depende de decisão já pendente na Conduta."},"decisao_sugerida":{"enum":["MANTER EM OBSERVAÇÃO — SUGERIDO","MANTER","AJUSTAR","SUBSTITUIR","CONCLUIR","ENCERRAR",null],"description":"Só para origem=acordada. Primeira consulta: MANTER EM OBSERVAÇÃO — SUGERIDO. Retorno com dado de evolução: MANTER/AJUSTAR/SUBSTITUIR/CONCLUIR/ENCERRAR. Retorno sem dado: MANTER EM OBSERVAÇÃO — SUGERIDO. origem=nova: null."},"motivo_decisao":{"type":["string","null"]},"o_que_fazer":{"type":"string"},"o_que_observar":{"type":"string"},"prazo":{"type":"string"},"criterio_sucesso":{"type":"string"},"baseado_em":{"type":"array","minItems":1,"items":{"type":"string"},"description":"Nunca uma hipótese: hipótese → observação → confirmação → possível estratégia."},"catalogo":{"type":"string","description":"Status técnico. Sem catálogo homologado: \"not_catalogued\" (na tela: SUGESTÃO HOLOS AI — REQUER REVISÃO PROFISSIONAL)."},"status":{"const":"SUGERIDO"}}}},"corpo":{"$ref":"#/$defs/territorio"},"mente":{"$ref":"#/$defs/territorio"},"espirito":{"$ref":"#/$defs/territorio"},"o_que_observar":{"type":"array","items":{"type":"string"}},"plano_acompanhamento":{"type":"array","items":{"type":"string"},"description":"Obrigatório (pode ser [])."},"roteiro_proxima_consulta":{"type":"array","items":{"type":"object","required":["tipo","texto"],"properties":{"tipo":{"enum":["ferramenta","pergunta","criterio_decisao"]},"estrategia_id":{"type":"string"},"texto":{"type":"string"}}}},"proxima_etapa":{"type":"string"},"rascunho_paciente":{"type":"string","description":"Rascunho para revisão. Linguagem simples, sem números do HOLOSCAN, sem nomes de sistemas, sem hipótese. Só o que foi acordado no documento ou confirmado; nunca uma sugestão nova como combinada."},"alertas_profissionais":{"type":"array","items":{"type":"object","required":["tipo","texto"],"properties":{"tipo":{"enum":["metodologico","avaliacao_profissional","exames","conduta","catalogo","informacao_insuficiente"]},"texto":{"type":"string"}}}},"fontes_utilizadas":{"type":"array","items":{"type":"string"}}},"$defs":{"territorio":{"type":"object","required":["situacao","resumo","estrategias"],"if":{"properties":{"situacao":{"const":"nao_aprofundado"}}},"then":{"properties":{"estrategias":{"maxItems":0}}},"properties":{"situacao":{"enum":["com_material","nao_aprofundado"],"description":"nao_aprofundado: nenhuma estratégia ligada a este território."},"resumo":{"type":"string","description":"Sem material: exatamente \"Ainda não aprofundado nesta etapa.\" (pode vir seguido de uma frase sobre o que já há para observar)."},"estrategias":{"type":"array","items":{"type":"string","pattern":"^E[0-9]+$"}}}}}};
const exemplo = {"schema_version":1,"tipo":"primeira_consulta","meta":{"agente":"HOLOS-AI-GPT 1.2","kb_version":"HOLOS-KB 0.3 (sistemas HOLOS-V1 v7; ferramentas HOLOS-RECOMENDACOES-V1 / PP-V1; direcionamentos e estratégias sem catálogo homologado)","identificador":"PACIENTE-TESTE-T5","data_atendimento":"2026-10-13","data_analise":"2026-10-13"},"entrada":{"documentos":["pdf_resultado_holos"],"base_principal":"pdf_resultado_holos","observacao":"Só o PDF do Resultado HOLOS foi enviado (fallback temporário). Com o Pacote HOLOS AI, o Pacote prevalece."},"sintese_integrada":"Primeira consulta, ponto de partida sem evolução registrada. O HOLOSCAN indica o Sistema Metabólico (2,4) e o Fúngico (5,8) como a primeira e a segunda áreas para aprofundar. O Mapa da Rotina localizou a dificuldade principal entre 16h e 18h (fome forte e queda de disposição) e um espaço real de mudança: preparar o lanche na noite anterior. Foco, direcionamento e estratégia acordada já conversam entre si. As reuniões da tarde ficam como ponto de observação, ainda sem dado de que atrapalhem o lanche. Ainda falta aprofundar o comportamento alimentar fora do fim da tarde (fome logo depois de comer, comer depois do jantar sem fome, vontade de doce ou pão) e os relatos digestivos. Mente e Espírito ainda não foram aprofundados nesta etapa.","o_que_apareceu":[{"texto":"Foco atual: organizar o fim da tarde.","fonte":"Resultado HOLOS: foco"},{"texto":"Sistema Metabólico 2,4 e Sistema Fúngico 5,8 como primeira e segunda áreas para aprofundar.","fonte":"HOLOSCAN (HOLOS-V1 v7)"},{"texto":"Muito sono logo depois do almoço; fome novamente pouco tempo depois de comer; comer depois do jantar mesmo sem fome percebida.","fonte":"HOLOSCAN: sinais do Metabólico"},{"texto":"Vontade forte de doce ou pão quase todos os dias; barriga inchada ou gases depois das refeições; relato de camada esbranquiçada na língua.","fonte":"HOLOSCAN: sinais do Fúngico"},{"texto":"Fome forte e queda de disposição entre 16h e 18h; reuniões à tarde; espaço para mudança: preparar o lanche na noite anterior.","fonte":"Mapa da Rotina"},{"texto":"Estratégia acordada: lanche planejado antes da fome forte, por volta das 16h.","fonte":"Resultado HOLOS: estratégia acordada"}],"convergencias":[{"tipo":"convergencia","texto":"Fome forte e queda de disposição no fim da tarde aparecem no Mapa da Rotina e conversam com os sinais do Metabólico (sono depois do almoço, fome pouco depois de comer).","fontes":["Mapa da Rotina","HOLOSCAN: sinais do Metabólico"]},{"tipo":"convergencia","texto":"Vontade forte de doce ou pão e comer depois do jantar sem fome são comportamentos alimentares recorrentes que podem ser investigados em conjunto, sem relação de causa estabelecida.","fontes":["HOLOSCAN: sinais do Fúngico","HOLOSCAN: sinais do Metabólico"]},{"tipo":"convergencia","texto":"O espaço de mudança relatado (preparar o lanche na noite anterior) e a estratégia acordada são coerentes entre si.","fontes":["Mapa da Rotina","Resultado HOLOS: estratégia acordada"]}],"padroes_observados":["As dificuldades se concentram em dois momentos do dia: depois do almoço / fim da tarde e depois do jantar.","A rotina de trabalho tem reuniões à tarde, justamente no horário crítico."],"pontos_para_aprofundar":[{"tipo":"questao","texto":"O que acontece antes de comer depois do jantar sem fome (situação, pensamento, emoção)?","so_profissional":false},{"tipo":"questao","texto":"Em que momentos a vontade de doce ou pão aparece?","so_profissional":false},{"tipo":"questao","texto":"Os gases e o inchaço aparecem depois de quais refeições?","so_profissional":false},{"tipo":"hipotese","texto":"As reuniões da tarde podem dificultar comer por volta das 16h. É um ponto de observação: confirmar no retorno antes de pensar em qualquer estratégia.","so_profissional":true},{"tipo":"hipotese","texto":"A fome do fim da tarde e o comer depois do jantar podem fazer parte de um mesmo padrão do dia. Investigar com episódios concretos.","so_profissional":true}],"sistemas_prioritarios":[{"ordem":1,"sistema":"Sistema Metabólico","nota":"2,4","posicao":"primeira área para aprofundar","o_que_apareceu":"Muito sono logo depois do almoço; fome novamente pouco tempo depois de comer; comer depois do jantar mesmo sem fome percebida; fome forte e queda de disposição entre 16h e 18h (Mapa da Rotina).","o_que_observar":"Horários, intervalos entre refeições, fome, saciedade e energia ao longo do dia, com atenção a 16h–18h e ao período depois do jantar.","como_cuidar":"Alimentação, horários, fome, energia e rotina merecem aprofundamento. O eixo não diagnostica resistência à insulina, diabetes, alterações da tireoide ou outras condições metabólicas."},{"ordem":2,"sistema":"Sistema Fúngico","nota":"5,8","posicao":"segunda área para aprofundar","o_que_apareceu":"Vontade forte de doce ou pão quase todos os dias; barriga inchada ou gases depois das refeições; relato de camada esbranquiçada na língua.","o_que_observar":"Em que situações a vontade de doce ou pão aparece; depois de quais refeições surgem gases e inchaço.","como_cuidar":"Este eixo aparece como a segunda área para aprofundar nesta aplicação e merece ser observado no contexto da alimentação, rotina e sinais relatados. Não diagnostica candidíase, infecção fúngica, disbiose ou qualquer outra doença."}],"ferramentas_ja_aplicadas":[{"ferramenta":"Mapa da Rotina","situacao":"concluida","o_que_esclareceu":"Localizou a dificuldade no fim da jornada (16h–18h), mostrou as reuniões da tarde e revelou um espaço viável de mudança: preparar o lanche na noite anterior."}],"ferramentas_recomendadas":[{"ordem":1,"papel":"principal","regra_id":"REC-MET-02","ferramenta":"Gatilhos & Respostas","territorio":"Mente","sistema":"Sistema Metabólico","por_que":"Ajuda a aprofundar comportamentos alimentares recorrentes dentro das situações em que acontecem. REC-MET-01 (Mapa da Rotina) já foi concluída neste atendimento.","como_aplicar":"Escolha episódios concretos e observe o que acontece antes, durante e depois do comportamento. Comece por um episódio de comer depois do jantar sem fome.","o_que_procurar":"Situação, pensamento, emoção e consequência percebida antes de comer sem fome; repetição do padrão em dias diferentes.","status":"SUGERIDO"},{"ordem":2,"papel":"complementar","regra_id":"REC-FUN-03","ferramenta":"Mapa de Crenças Alimentares","territorio":"Mente","sistema":"Sistema Fúngico","por_que":"Permite investigar ideias e regras sobre alimentação que podem estar influenciando escolhas. REC-FUN-01 (Mapa da Rotina) já concluída; REC-FUN-02 (Gatilhos & Respostas) já escolhida como principal.","como_aplicar":"Identifique uma crença relevante, sua origem percebida, as situações em que aparece e seu impacto relatado.","o_que_procurar":"Ideias ligadas à vontade de doce ou pão (recompensa, cansaço, merecimento) e onde elas aparecem no dia.","status":"SUGERIDO"},{"ordem":3,"papel":"complementar","regra_id":"REC-MET-04","ferramenta":"Linha do Momentum","territorio":"Corpo","sistema":"Sistema Metabólico","por_que":"Ajuda a avaliar a capacidade atual de sustentar mudanças antes de aumentar a exigência. REC-MET-03 (Mapa de Crenças Alimentares) já escolhida como complementar.","como_aplicar":"Avalie as seis dimensões do Momentum e registre o estado escolhido pela profissional.","o_que_procurar":"Quanto espaço existe para acrescentar uma segunda estratégia depois do lanche da tarde.","status":"SUGERIDO"}],"direcionamentos":[{"id":"D1","origem":"existente","titulo":"Organizar o fim da tarde","territorio":"Corpo","sistema":"Sistema Metabólico","por_que":"O fim da tarde concentra fome forte e queda de disposição, e já existe uma ação viável identificada.","objetivo":"Chegar ao fim da jornada com fome mais administrável e mais disposição.","baseado_em":["Resultado HOLOS: foco e direcionamento registrados","HOLOSCAN: Metabólico como primeira área (2,4)","Mapa da Rotina: 16h–18h"],"catalogo":"not_catalogued","status":"SUGERIDO"},{"id":"D2","origem":"nova","titulo":"Compreender os momentos de comer sem fome e de vontade de doce ou pão","territorio":null,"sistema":null,"por_que":"Comer depois do jantar sem fome (sinal do Metabólico) e vontade forte de doce ou pão (sinal do Fúngico) aparecem como comportamentos recorrentes ainda não aprofundados.","objetivo":"Identificar em quais situações esses comportamentos aparecem, antes de propor qualquer mudança neles.","baseado_em":["HOLOSCAN: sinais do Metabólico e do Fúngico","Catálogo PP-V1: REC-MET-02 e REC-FUN-03"],"catalogo":"not_catalogued","status":"SUGERIDO"}],"estrategias":[{"id":"E1","origem":"acordada","titulo":"Lanche planejado antes da fome forte","territorio":"Corpo","direcionamento_id":"D1","classificacao":"comportamental_metodologica","decisao_sugerida":"MANTER EM OBSERVAÇÃO — SUGERIDO","motivo_decisao":"Estratégia criada neste encontro; ainda não há dado de aplicação para avaliar resposta.","o_que_fazer":"Preparar o lanche na noite anterior e comer por volta das 16h.","o_que_observar":"Intensidade da fome e disposição entre 16h e 18h.","prazo":"Até o retorno (cerca de 2 semanas)","criterio_sucesso":"Aplicar com frequência suficiente para permitir avaliação no retorno e perceber como ficam a fome e a disposição às 18h.","baseado_em":["Resultado HOLOS: estratégia acordada","Mapa da Rotina: espaço de mudança na noite anterior"],"catalogo":"not_catalogued","status":"SUGERIDO"},{"id":"E2","origem":"nova","titulo":"Registro rápido de fome e disposição às 16h e às 18h","territorio":"Corpo","direcionamento_id":"D1","classificacao":"observacao","decisao_sugerida":null,"motivo_decisao":null,"o_que_fazer":"Anotar de 0 a 10 a fome e a disposição às 16h e às 18h e marcar se comeu o lanche.","o_que_observar":"Diferença entre dias com e sem o lanche.","prazo":"Até o retorno","criterio_sucesso":"Ter registros suficientes para comparar, no retorno, os dias com e sem o lanche.","baseado_em":["Resultado HOLOS: o que observar acordado (fome e disposição entre 16h e 18h)"],"catalogo":"not_catalogued","status":"SUGERIDO"}],"corpo":{"situacao":"com_material","resumo":"Lanche planejado por volta das 16h, preparado na noite anterior, e observação de fome e disposição entre 16h e 18h.","estrategias":["E1","E2"]},"mente":{"situacao":"nao_aprofundado","resumo":"Ainda não aprofundado nesta etapa.","estrategias":[]},"espirito":{"situacao":"nao_aprofundado","resumo":"Ainda não aprofundado nesta etapa.","estrategias":[]},"o_que_observar":["Fome e disposição entre 16h e 18h, nos dias com e sem o lanche","Se as reuniões da tarde atrapalham o horário do lanche","Episódios de comer depois do jantar sem fome","Momentos de vontade de doce ou pão","Gases ou inchaço e depois de quais refeições"],"plano_acompanhamento":["Conferir no retorno como foram o preparo na noite anterior e o lanche por volta das 16h","Comparar fome e disposição entre 16h e 18h nos dias com e sem o lanche","Perguntar se as reuniões da tarde atrapalharam o lanche antes de propor qualquer ajuste","Levar os episódios de comer depois do jantar sem fome e de vontade de doce ou pão para o Gatilhos & Respostas"],"roteiro_proxima_consulta":[{"tipo":"ferramenta","texto":"Aplicar Gatilhos & Respostas (REC-MET-02) com um episódio relatado pela paciente; se houver tempo, Mapa de Crenças Alimentares (REC-FUN-03)."},{"tipo":"pergunta","texto":"Com que frequência conseguiu fazer o lanche por volta das 16h?"},{"tipo":"pergunta","texto":"O que facilitou e o que dificultou (preparo na noite anterior, horário)?"},{"tipo":"pergunta","texto":"As reuniões da tarde atrapalharam o lanche? Em que dias e de que forma?"},{"tipo":"pergunta","texto":"Como ficaram a fome e a disposição entre 16h e 18h nos dias com e sem lanche?"},{"tipo":"pergunta","texto":"O que aconteceu antes dos episódios de comer depois do jantar sem fome?"},{"tipo":"criterio_decisao","estrategia_id":"E1","texto":"MANTER: aplicou com frequência suficiente para avaliar e percebeu fome mais administrável ou mais disposição no fim da tarde."},{"tipo":"criterio_decisao","estrategia_id":"E1","texto":"AJUSTAR: a ideia funciona, mas o horário ou o preparo não couberam na rotina. Se as reuniões da tarde se confirmarem como barreira, a nutricionista decide o ajuste."},{"tipo":"criterio_decisao","estrategia_id":"E1","texto":"SUBSTITUIR: não coube na rotina mesmo depois de ajustar as barreiras."},{"tipo":"criterio_decisao","estrategia_id":"E1","texto":"CONCLUIR: o fim da tarde deixou de ser dificuldade e não precisa mais de ação ativa."},{"tipo":"criterio_decisao","estrategia_id":"E1","texto":"ENCERRAR: decisão profissional de retirar a estratégia nesta etapa."}],"proxima_etapa":"Retorno em cerca de 2 semanas: rever como foi o lanche da tarde, confirmar se as reuniões atrapalham, decidir sobre a estratégia e aplicar o Gatilhos & Respostas.","rascunho_paciente":"Nesta fase, nosso foco é organizar o fim da tarde. Até o nosso próximo encontro, a combinação é preparar o lanche na noite anterior e comer por volta das 16h. Observe como ficam sua fome e sua disposição entre 16h e 18h. No próximo encontro, conversamos sobre como foi.","alertas_profissionais":[{"tipo":"metodologico","texto":"No HOLOSCAN, nota maior = menos marcadores; nota menor = mais marcadores. Metabólico 2,4 e Fúngico 5,8 indicam onde aprofundar primeiro; a nota não é diagnóstico nem medida de saúde, equilíbrio, normalidade, gravidade ou risco."},{"tipo":"avaliacao_profissional","texto":"A língua esbranquiçada, os gases e o inchaço não foram interpretados; se persistirem ou incomodarem, requerem avaliação profissional."},{"tipo":"conduta","texto":"A composição do lanche da tarde (alimentos, quantidades, substituições) requer decisão profissional na Conduta. Não foi sugerida como estratégia para a paciente."},{"tipo":"catalogo","texto":"Direcionamentos e estratégias são sugestões da HOLOS AI sem catálogo homologado: requerem revisão profissional antes de usar."},{"tipo":"informacao_insuficiente","texto":"Sem evolução registrada: ainda não é possível avaliar a resposta à estratégia acordada."},{"tipo":"informacao_insuficiente","texto":"As reuniões da tarde aparecem no Mapa da Rotina, mas não há dado de que impeçam o lanche: ficam como ponto de observação, sem estratégia."},{"tipo":"informacao_insuficiente","texto":"Mente e Espírito não foram aprofundados nesta etapa. Os relatos de comer depois do jantar sem fome e de vontade de doce ou pão ficam para observação e para o Gatilhos & Respostas."}],"fontes_utilizadas":["Resultado HOLOS da Paciente Teste T5 Fictícia (foco, direcionamento, estratégia acordada, o que observar, HOLOSCAN, Mapa da Rotina)","02-SISTEMAS-E-FERRAMENTAS: textos oficiais do Metabólico e do Fúngico (v7) e frase da HOLOS AI para a segunda área","05-CATALOGO-FERRAMENTAS-PP-V1: REC-MET-02, REC-FUN-03, REC-MET-04"]};

// ---- nucleo.js (embutido) ----
/* holohacking-mcp — NUCLEO (sem Deno, sem rede): o servidor MCP do HoloHacking.

   Substitui o "agente" (Holos IA por copiar e colar o Pacote num GPT e colar o JSON de volta): a nutricionista conecta o
   HoloHacking no assistente uma vez e pede "gere o Resultado da Marina". A IA busca o contexto aqui, escreve a analise no
   contrato HOLOS_AI_RESULT v1 (o MESMO do agente) ou escolhe foco e estrategias do Playbook, e o Resultado HOLOS e gravado
   na ficha, finalizado para a nutricionista revisar e emitir no app.

   Transporte: MCP Streamable HTTP (POST JSON-RPC 2.0, resposta application/json). tratarHttp() recebe o pedido HTTP ja
   lido e devolve { status, headers, corpo } — o index.ts (Deno) e os testes (Node) usam a MESMA funcao.

   Dependencias (injetadas; nada de rede aqui):
     identificar(chave)            -> { nutritionist_id, key_id } | null   (RPC mcp_identificar, so o servidor)
     comoNutri(uid, fn)            -> executa fn(q) numa transacao COMO a nutricionista (role authenticated + claims):
                                      q(sql, params) -> linhas. Mesmo RLS, mesmos gatilhos e RPCs do app.
     registrarUso(uid, key, ferramenta, patient, ok, erro)   (RPC mcp_registrar_uso; sem conteudo clinico)
     mod: { RD: ResultadoDirecao, C: HolosAIContrato, PB: PlaybookHolos, SF: SistemasFechamento }
     uuid(): string ; agora(): Date ; site: URL do app (texto das respostas)
   Seguranca: a chave nunca aparece em resposta nem em registro. Nada aqui emite o Resultado Final nem envia ao paciente. */

const VERSAO = '1.0.0';
const PROTOCOLOS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FERRAMENTAS_RESULTADO = ['oq3', 'linha_momentum', 'mapa_rotina_v1', 'pqq', 'mapa_crencas', 'gatilhos_respostas_v1', 'mapa', 'roda_vida', 'carta_futuro'];
const MODULO = { oq3: 'corpo', linha_momentum: 'corpo', mapa_rotina_v1: 'corpo', pqq: 'mente', mapa_crencas: 'mente', gatilhos_respostas_v1: 'mente', mapa: 'espirito', roda_vida: 'espirito', carta_futuro: 'espirito' };
const LISTAS_RELATO = ['momento', 'dores', 'desejos', 'avancos', 'permaneceu', 'acordos_compartilhados'];
const ORIGENS_RELATO = ['relato_paciente', 'acordo', 'resultado_anterior'];
/* o MESMO limite do Resultado automatico do app (resultado-holos.js): PDF da paciente de 2 a 4 paginas */
const LIMITE_PACIENTE = { momento: 2, dores: 3, desejos: 2, avancos: 3, permaneceu: 3, padroes: 3, direcionamentos: 3, estrategias: 4,
  corpo: 2, mente: 2, espirito: 2, acordos_compartilhados: 3, observar: 4 };

const INSTRUCOES = [
  'HoloHacking — plataforma clínica da Nutrição Holística. Você atende SOMENTE a nutricionista dona desta conexão.',
  '"O sistema organiza. O método orienta. A IA sugere. A nutricionista interpreta e decide."',
  'Para gerar o Resultado HOLOS de um paciente: (1) buscar_pacientes pelo nome; (2) contexto_paciente; (3) escreva a análise no',
  'contrato HOLOS_AI_RESULT v1 (instrucoes_resultado traz o contrato completo e um exemplo) e chame gerar_resultado; OU, mais simples,',
  'escolha 1 foco e 2 a 4 estratégias do Playbook (vêm no contexto) e chame gerar_resultado_playbook.',
  'O Resultado fica gravado na ficha, finalizado; a nutricionista revisa e emite o PDF no app. Nada é enviado ao paciente por aqui.',
  'INEGOCIÁVEL: não diagnosticar (candidíase, disbiose, resistência à insulina, diabetes, tireoide, inflamação, pH, toxinas, função',
  'hepática/linfática, transtorno mental, "saúde espiritual"); não afirmar causalidade; não prescrever (alimentos, quantidades,',
  'suplementos, protocolos); não recalcular o HOLOSCAN; não inventar dados ("Sem dado"). Os sistemas são eixos do método, não doenças:',
  'nota menor = mais marcadores. Tudo é SUGERIDO até a nutricionista confirmar. Português do Brasil, direto, sem emojis.'
].join('\n');

/* ---------------------------------------------------------------- utilidades */
const tem = (x) => x !== null && x !== undefined && String(x).trim() !== '';
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
function sem(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function iniciais(nome) { return String(nome || '').trim().split(/\s+/).filter(Boolean).map(p => p[0].toUpperCase() + '.').join(' ') || '—'; }
function idade(nasc, agora) {
  if (!nasc) return null;
  const iso = nasc instanceof Date ? nasc.getFullYear() + '-' + String(nasc.getMonth() + 1).padStart(2, '0') + '-' + String(nasc.getDate()).padStart(2, '0') : String(nasc).slice(0, 10);
  const d = new Date(iso + 'T12:00:00Z'); if (isNaN(d)) return null;
  let a = agora.getUTCFullYear() - d.getUTCFullYear(); const m = agora.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && agora.getUTCDate() < d.getUTCDate())) a--; return a >= 0 && a < 130 ? a : null;
}
const dia = (x) => (!x ? null : x instanceof Date ? x.toISOString().slice(0, 10) : String(x).slice(0, 10));
class ErroFerramenta extends Error { constructor(msg, codigo) { super(msg); this.codigo = codigo || 'erro'; } }

/* mensagens das recusas do servidor (hint do PostgreSQL) */
const HINTS = {
  holoscan_obrigatorio: 'Este paciente ainda não tem HOLOSCAN oficial salvo. Aplique e salve o HOLOSCAN no app primeiro.',
  foco_obrigatorio: 'Sem Foco atual confirmado o Resultado não fica pronto.',
  paciente_arquivado: 'O paciente está arquivado: reative-o no app para gerar o Resultado.',
  conta_nao_liberada: 'A conta ainda não foi liberada pela equipe HoloHacking.',
  holos_ai_json_invalido: 'O JSON não está no contrato HOLOS_AI_RESULT v1.',
  holos_ai_contrato: 'O JSON não está no contrato HOLOS_AI_RESULT v1.'
};
function mensagemPg(e) {
  const h = e && (e.hint || (e.cause && e.cause.hint));
  if (h && HINTS[h]) return HINTS[h];
  if (h) return 'O servidor recusou (' + h + '): ' + String(e.message || '').slice(0, 200);
  return 'Não foi possível concluir agora: ' + String((e && e.message) || e).slice(0, 200);
}

/* ---------------------------------------------------------------- leitura (sempre COMO a nutricionista) */
async function paciente(q, pid) {
  if (!UUID.test(String(pid || ''))) throw new ErroFerramenta('paciente_id inválido: use o id que buscar_pacientes devolveu.', 'paciente_id');
  const [p] = await q('select id, nome, nascimento, sexo, status from public.patients where id = $1', [pid]);
  if (!p) throw new ErroFerramenta('Paciente não encontrado nesta conta.', 'paciente_nao_encontrado');
  return p;
}
async function holoscansOficiais(q, pid) {
  return q("select id, encounter_id, quando, created_at, indice, triada from public.holoscan_applications where patient_id = $1 and methodology_package_id is not null order by created_at desc", [pid]);
}
async function atendimentos(q, pid) {
  return q('select id, occurred_at, weight_kg, height_cm from public.encounters where patient_id = $1 order by occurred_at desc', [pid]);
}
async function resultados(q, pid) {
  return q('select id, encounter_id, status, revision_number, supersedes_id, superseded_at, saved_at, created_at, direcao, content_snapshot is not null as tem_snapshot from public.holos_results where patient_id = $1 order by created_at desc', [pid]);
}
/* o atendimento do Resultado: o pedido; senao o do HOLOSCAN oficial mais recente; senao o mais recente (como o app) */
function escolherAtendimento(encs, hs, pedido) {
  if (pedido) { const e = encs.find(x => x.id === pedido); if (!e) throw new ErroFerramenta('Atendimento não encontrado para este paciente.', 'atendimento'); return e; }
  const h = hs.find(x => x.encounter_id); if (h) { const e = encs.find(x => x.id === h.encounter_id); if (e) return e; }
  return encs[0] || null;
}
async function vigente(q, tabela, eid) {
  const l = await q(`select * from public.${tabela} where encounter_id = $1 and superseded_at is null order by revision_number desc, created_at desc`, [eid]);
  return l.find(x => x.status === 'salvo' || x.status === 'revisado') || l.find(x => x.status === 'rascunho') || null;
}
async function anteriorDe(q, pid, eid, encs) {
  const atual = encs.find(e => e.id === eid), ref = atual ? String(atual.occurred_at instanceof Date ? atual.occurred_at.toISOString() : atual.occurred_at) : '';
  const l = await q("select id, encounter_id, saved_at, direcao, content_snapshot->'direcao_paciente' as direcao_paciente from public.holos_results where patient_id = $1 and status <> 'rascunho' and superseded_at is null and content_snapshot is not null and encounter_id is distinct from $2 order by saved_at desc nulls last", [pid, eid]);
  return l.find(r => { const e = encs.find(x => x.id === r.encounter_id); const oc = e ? String(e.occurred_at instanceof Date ? e.occurred_at.toISOString() : e.occurred_at) : null; return !ref || !oc || oc < ref; }) || null;
}

/* Monta TUDO o que o Resultado precisa (as mesmas fontes do caminho automatico do app) */
async function preparar(q, mod, pid, pedidoEid) {
  const { RD, SF } = mod;
  const p = await paciente(q, pid);
  if (p.status === 'inativo') throw new ErroFerramenta(HINTS.paciente_arquivado, 'paciente_arquivado');
  /* uma conexao por transacao: as consultas vao em sequencia */
  const encs = await atendimentos(q, pid), hs = await holoscansOficiais(q, pid), res = await resultados(q, pid);
  const e = escolherAtendimento(encs, hs, pedidoEid);
  if (!e) throw new ErroFerramenta('Este paciente ainda não tem atendimento. Inicie um atendimento no app.', 'sem_atendimento');
  const h = hs.find(x => x.encounter_id === e.id) || hs[0];
  if (!h) throw new ErroFerramenta(HINTS.holoscan_obrigatorio, 'holoscan_obrigatorio');
  const ferrs = await q("select id, ferramenta_id, status, concluida_em, respostas, resultado, leitura, prioridade, proximo_passo from public.tool_applications where encounter_id = $1 and status in ('concluida', 'revisada') order by concluida_em desc nulls last", [e.id]);
  const visto = {}, tools = [];
  FERRAMENTAS_RESULTADO.forEach(fid => { const t = ferrs.find(x => x.ferramenta_id === fid); if (t && !visto[fid]) { visto[fid] = 1; tools.push(t.id); } });
  const finais = res.filter(r => r.status !== 'rascunho' && r.encounter_id === e.id && !r.superseded_at && !res.some(x => x.supersedes_id === r.id));
  const an0 = await vigente(q, 'anamneses', e.id), cd = await vigente(q, 'conducts', e.id), ant = await anteriorDe(q, pid, e.id, encs);
  let an = an0 ? { id: an0.id, refTipo: null, content: an0.content } : null;
  if (!an) {
    const [cv] = await q("select id, form_tipo, submitted_content, submitted_at from public.anamnesis_invites where patient_id = $1 and submitted_content is not null order by submitted_at desc nulls last limit 1", [pid]);
    if (cv && cv.submitted_content && cv.submitted_content.formulario) an = { id: e.id, refTipo: 'atendimento', content: { tipo: cv.submitted_content.tipo || cv.form_tipo, formulario: cv.submitted_content.formulario }, convite: true };
  }
  const acordos = cd ? await q('select * from public.agreements where conduct_id = $1 order by position', [cd.id]) : [];
  let acordosAnt = [];
  if (ant && ant.encounter_id) { const cdA = await vigente(q, 'conducts', ant.encounter_id); if (cdA) acordosAnt = await q('select * from public.agreements where conduct_id = $1 order by position', [cdA.id]); }
  const tipo = (an && an.content && an.content.tipo === 'retorno') || ant ? 'retorno' : 'primeira';
  const form = { pid, encounter_id: e.id, holoscan_application_id: h.id, tools, supersedes_id: finais[0] ? finais[0].id : null };
  const payloadBase = { id: null, supersedes_id: form.supersedes_id, patient_id: pid, encounter_id: e.id, holoscan_application_id: h.id, tool_application_ids: tools.slice(),
    visao_paciente: { ferramentas: Object.fromEntries(tools.map(id => [id, { mostrar: false, ocultar: [] }])), proximos_passos: false },
    leitura_profissional: '', pontos_acompanhar: '', questoes_aprofundar: '', expected_updated_at: null };
  const [{ r: snap }] = await q('select public.previa_resultado_holos($1::jsonb) as r', [Object.assign({}, payloadBase, { direcao: null })]);
  const fechs = SF ? SF.deResultado(snap, (id) => id) : [];
  const sis = (snap && snap.holoscan && snap.holoscan.sistemas) || [];
  const prioridade = fechs.map((x, i) => ({ x, s: sis[i] })).filter(o => o.x && o.x.resultado && o.x.resultado.prioridade).sort((a, b) => a.x.resultado.posicao - b.x.resultado.posicao);
  const areas = prioridade.map(o => ({ nome: o.x.nome, dominantes: (o.s && o.s.dominantes) || [] }));
  const ctxSug = {
    tipo, anamnese: an ? { id: an.id, refTipo: an.refTipo, content: an.content } : null, conduta: cd, acordos, acordosAnteriores: acordosAnt,
    ferramentas: ((snap && snap.ferramentas) || []).map(t => ({ id: t.id, ferramenta_id: t.ferramenta_id, modulo: MODULO[t.ferramenta_id] || null, respostas: t.respostas || {}, proximo_passo: t.proximo_passo, prioridade: t.prioridade })),
    direcaoAtual: RD.normalizar(null, tipo), holoscan: h.id ? { id: h.id, areas } : null,
    anterior: ant && ant.direcao_paciente ? { id: ant.id, direcao_paciente: ant.direcao_paciente } : null
  };
  const momentum = ((snap && snap.ferramentas) || []).find(t => t.ferramenta_id === 'linha_momentum');
  return { p, e, h, snap, form, payloadBase, tipo, an, cd, acordos, ant, ctxSug, sis, prioridade, fechs,
    momentum: momentum && momentum.respostas ? momentum.respostas.estado_confirmado || momentum.respostas.estado || null : null };
}

/* ---------------------------------------------------------------- ferramentas MCP */
async function buscarPacientes(q, a) {
  const busca = sem(a.nome || a.busca || '');
  const l = await q("select p.id, p.nome, p.status, (select max(e.occurred_at) from public.encounters e where e.patient_id = p.id) as ultimo_atendimento, (select max(h.created_at) from public.holoscan_applications h where h.patient_id = p.id and h.methodology_package_id is not null) as ultimo_holoscan, (select count(*)::int from public.holos_results r where r.patient_id = p.id and r.status <> 'rascunho') as resultados from public.patients p order by p.nome limit 2000", []);
  const palavras = busca.split(/\s+/).filter(Boolean);
  const achados = l.filter(p => (a.incluir_arquivados || p.status !== 'inativo') && palavras.every(w => sem(p.nome).includes(w))).slice(0, 15);
  return { total: achados.length, pacientes: achados.map(p => ({ paciente_id: p.id, nome: p.nome, arquivado: p.status === 'inativo',
    ultimo_atendimento: dia(p.ultimo_atendimento), ultimo_holoscan: dia(p.ultimo_holoscan), resultados_salvos: p.resultados })),
    dica: achados.length > 1 ? 'Mais de um paciente: confirme com a nutricionista qual é antes de gerar.' : achados.length ? null : 'Nenhum paciente com esse nome nesta conta.' };
}

function textoMapeamento(an) {
  if (!an || !an.content) return null;
  const f = an.content.formulario || {}, out = {};
  Object.keys(f).forEach(sec => { const o = f[sec]; if (o && typeof o === 'object') { const v = {}; Object.keys(o).forEach(k => { if (Array.isArray(o[k]) ? o[k].length : tem(o[k])) v[k] = o[k]; }); if (Object.keys(v).length) out[sec] = v; } });
  return { tipo: an.content.tipo || null, origem: an.convite ? 'respostas originais do Mapeamento (link)' : 'Mapeamento/anamnese do atendimento', respostas: out };
}

async function contextoPaciente(q, mod, a, agora) {
  const { PB, RD } = mod;
  const x = await preparar(q, mod, a.paciente_id, a.atendimento_id || null);
  const snap = x.snap || {}, h = snap.holoscan || {};
  const prio = x.prioridade.map(o => o.x.sistema);
  const ferrIds = ((snap.ferramentas) || []).map(t => t.ferramenta_id);
  const op = PB.opcoes({ prioritarios: prio, ferramentas: ferrIds, momentum: x.momentum });
  const S = RD.sugestoes(x.ctxSug), relato = {};
  LISTAS_RELATO.forEach(k => { relato[k] = (S[k] || []).filter(it => it && ORIGENS_RELATO.includes(it.origem) && !RD.termosFora(it.texto).length).map(it => it.texto); });
  const anterior = x.ant && x.ant.direcao_paciente ? x.ant.direcao_paciente : null;
  return {
    paciente: { paciente_id: x.p.id, iniciais: iniciais(x.p.nome), idade: idade(x.p.nascimento, agora), sexo: x.p.sexo || null },
    atendimento: { atendimento_id: x.e.id, data: dia(x.e.occurred_at), tipo: x.tipo === 'retorno' ? 'retorno' : 'primeira_consulta',
      medidas: { peso_kg: num(x.e.weight_kg), altura_cm: num(x.e.height_cm) } },
    holoscan: { holoscan_id: x.h.id, data: dia(x.h.quando || x.h.created_at), indice: num(h.indice), triade: h.triada || null,
      sistemas: (h.sistemas || []).map(s => ({ sistema: s.sistema, nome: s.nome, nota: num(s.nota), faixa: s.faixa || null,
        sinais_que_mais_pontuaram: (s.dominantes || []).slice(0, 3).map(d => d.enunciado || d.rotulo || d.question_id) })),
      areas_prioritarias: x.prioridade.map(o => ({ posicao: o.x.resultado.posicao, sistema: o.x.sistema, nome: o.x.nome, nota: o.x.resultado.nota })),
      leitura: 'Nota menor = mais marcadores. Os sistemas são eixos do método, não doenças nem diagnóstico.' },
    ferramentas_aplicadas: ((snap.ferramentas) || []).map(t => ({ ferramenta: t.ferramenta_id, nome: PB.NOME_FERR[t.ferramenta_id] || t.ferramenta_id, respostas: t.respostas || {}, leitura: t.leitura || null, prioridade: t.prioridade || null, proximo_passo: t.proximo_passo || null })),
    mapeamento: textoMapeamento(x.an),
    conduta: x.cd ? { objetivo: x.cd.objective || null, estrategia: x.cd.nutrition_strategy || null, acoes: x.cd.actions || null, acordos: x.acordos.map(c => c.description) } : null,
    relato_para_o_resultado: relato,
    resultado_anterior: anterior ? { foco: anterior.foco_atual || null, estrategias: (anterior.estrategias || []).map(e => ({ texto: e.texto, acao: e.acao || null })), proxima_etapa: anterior.proxima_etapa || null } : null,
    linha_do_momentum: x.momentum ? { estado: x.momentum, orientacao: op.momentum } : null,
    playbook: { versao: op.versao, recomendado: '2 a 4 estratégias (máximo ' + PB.MAX_ESTRATEGIAS + ')',
      focos: op.focos.map(g => ({ area: g.nome, prioridade: g.prioridade, focos: g.focos.map(f => ({ foco_id: f.id, texto: f.texto, por_que: f.porque })) })),
      estrategias: op.estrategias.filter(e => e.grupo !== 'outro').map(e => ({ estrategia_id: e.id, titulo: e.titulo, territorio: e.territorio, sistema: e.sistema, tipo: PB.TIPO[e.tipo], acao: e.acao, quando: e.contexto, observar: e.observar,
        cuidado: e.cuidado || null, combina_com_ferramentas: e.combina })) },
    como_gerar: 'Opção A (análise completa): chame instrucoes_resultado, escreva o JSON HOLOS_AI_RESULT v1 e envie em gerar_resultado. Opção B (rápida): gerar_resultado_playbook com 1 foco_id e 2 a 4 estrategia_id desta lista.'
  };
}

/* Resultado AUTOMATICO a partir da analise (a mesma regra do app: resultado-holos.js gerarAutomatico) */
function direcaoAutomatica(mod, x, imp, itens) {
  const { RD, C } = mod;
  const d = RD.normalizar(null, imp.tipo === 'retorno' ? 'retorno' : x.tipo);
  const Ssis = RD.sugestoes(Object.assign({}, x.ctxSug, { direcaoAtual: d })), Srel = {};
  let nRel = 0;
  LISTAS_RELATO.forEach(k => {
    Srel[k] = (Ssis[k] || []).filter(it => it && ORIGENS_RELATO.includes(it.origem)).map(it => { nRel++; return Object.assign({}, it, { confirmado: true, mostrar_paciente: !RD.termosFora(it.texto).length, descartado: false }); });
  });
  RD.mesclar(d, Srel);
  const m = C.paraDirecao(imp, itens, { automatico: true });
  RD.mesclar(d, m.S);
  Object.keys(LIMITE_PACIENTE).forEach(k => {
    const l = k === 'corpo' || k === 'mente' || k === 'espirito' ? (d[k] || {}).itens : d[k]; let n = 0;
    (l || []).forEach(it => { if (it.mostrar_paciente && ++n > LIMITE_PACIENTE[k]) it.mostrar_paciente = false; });
  });
  if (m.foco) d.foco_atual = m.foco;
  if (m.proxima_etapa) d.proxima_etapa = m.proxima_etapa;
  return { d, m, nRel };
}

async function salvar(q, mod, x, d, leitura, uuid) {
  const payload = Object.assign({}, x.payloadBase, { leitura_profissional: leitura || '', direcao: mod.RD.paraGravar(d), operation_id: uuid() });
  const [{ r: id }] = await q('select public.salvar_resultado_holos($1::jsonb) as r', [payload]);
  const [row] = await q('select id, revision_number, status, saved_at from public.holos_results where id = $1', [id]);
  return row;
}

function resumoGravado(mod, d, row, x, site) {
  const dp = mod.RD.projecaoPaciente(d) || {};
  const txt = (it) => (it && (it.texto || it.titulo)) || null;
  return { gravado: true, resultado_id: row.id, versao: row.revision_number, status: row.status, substituiu_versao_anterior: !!x.form.supersedes_id,
    foco: txt(dp.foco_atual) || txt(d.foco_atual), direcionamentos: (dp.direcionamentos || []).map(txt).filter(Boolean),
    estrategias: (dp.estrategias || []).map(e => ({ texto: txt(e), acao: e.acao || null, quando: e.contexto || null, observar: e.observar || null })),
    proxima_etapa: txt(dp.proxima_etapa) || txt(d.proxima_etapa),
    proximo_passo: 'Resultado HOLOS gravado na ficha (aba Resultado HOLOS), finalizado. A nutricionista revisa e, na página Resultado, gera o Resultado Final (PDF e WhatsApp)' + (site ? ' em ' + site : '') + '. Nada foi enviado ao paciente.' };
}

async function gerarResultado(q, mod, a, dep) {
  const { C } = mod;
  const bruto = a.resultado === undefined ? a.resultado_json : a.resultado;
  if (bruto === undefined || bruto === null || bruto === '') throw new ErroFerramenta('Envie a análise em "resultado" (objeto JSON no contrato HOLOS_AI_RESULT v1).', 'sem_resultado');
  let obj = bruto;
  if (typeof bruto === 'string') {
    const x = C.extrairJson(bruto);   // aceita o texto inteiro ou o 1o bloco ```json``` (como o agente)
    if (!x || !x.json) throw new ErroFerramenta('Não encontrei um JSON válido em "resultado"' + (x && x.erro ? ': ' + x.erro : '') + '.', 'json_invalido');
    obj = x.json;
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new ErroFerramenta('Não encontrei um JSON válido em "resultado".', 'json_invalido');
  const texto = JSON.stringify(obj);
  const v = C.validar(obj);
  if (v.erros && v.erros.length) {
    const err = new ErroFerramenta('A análise não está no contrato HOLOS_AI_RESULT v1. Corrija e chame gerar_resultado de novo.', 'contrato');
    err.detalhes = { erros: v.erros.slice(0, 40), avisos: (v.avisos || []).slice(0, 20) }; throw err;
  }
  const x = await preparar(q, mod, a.paciente_id, a.atendimento_id || null);
  let r;
  try { [{ r }] = await q('select public.importar_holos_ai($1::uuid, $2::text, $3::uuid) as r', [x.e.id, texto, dep.uuid()]); }
  catch (e) { throw new ErroFerramenta(mensagemPg(e), (e && e.hint) || 'importar'); }
  await q('select public.aceitar_importacao_holos_ai($1::uuid) as r', [r.id]);
  const [imp] = await q('select * from public.holos_ai_imports where id = $1', [r.id]);
  const itens = await q('select * from public.holos_ai_import_items where import_id = $1 order by secao, ordem', [r.id]);
  const { d, m, nRel } = direcaoAutomatica(mod, x, imp, itens);
  if (!mod.RD.focoConfirmado(d)) throw new ErroFerramenta('A análise não trouxe nenhum direcionamento: sem foco, o Resultado não fica pronto. Inclua pelo menos 1 direcionamento e envie de novo.', 'sem_foco');
  const leitura = m.leitura ? 'Síntese HOLOS AI via MCP (importação v' + imp.versao + ', aceite automático): ' + m.leitura : '';
  const row = await salvar(q, mod, x, d, leitura, dep.uuid);
  return Object.assign(resumoGravado(mod, d, row, x, dep.site), { importacao_versao: imp.versao, itens_do_relato: nRel, itens_so_profissional: (m.retidos || []).length,
    avisos: (v.avisos || []).slice(0, 10) });
}

async function gerarPlaybook(q, mod, a, dep) {
  const { PB, RD } = mod;
  const x = await preparar(q, mod, a.paciente_id, a.atendimento_id || null);
  const prio = x.prioridade.map(o => o.x.sistema), ferrIds = ((x.snap && x.snap.ferramentas) || []).map(t => t.ferramenta_id);
  const op = PB.opcoes({ prioritarios: prio, ferramentas: ferrIds });
  const focosValidos = [].concat(...op.focos.map(g => g.focos), ...op.focosOutros.map(g => g.focos)).map(f => f.id);
  if (!a.foco_id && !tem(a.foco_texto)) throw new ErroFerramenta('Escolha 1 foco: foco_id (dos focos do contexto) ou foco_texto.', 'foco');
  if (a.foco_id && !focosValidos.includes(a.foco_id)) throw new ErroFerramenta('foco_id desconhecido: use um foco_id de contexto_paciente.', 'foco');
  const ests = Array.isArray(a.estrategias) ? a.estrategias : [];
  if (!ests.length) throw new ErroFerramenta('Escolha de 2 a 4 estratégias (estrategia_id).', 'estrategias');
  if (ests.length > PB.MAX_ESTRATEGIAS) throw new ErroFerramenta('No máximo ' + PB.MAX_ESTRATEGIAS + ' estratégias (o recomendado é 2 a 4).', 'estrategias');
  const validas = op.estrategias.map(e => e.id);
  const escolhidas = ests.map(e => (typeof e === 'string' ? { id: e } : { id: e.estrategia_id || e.id, acao: e.acao, contexto: e.quando || e.contexto, observar: e.observar }));
  const ruins = escolhidas.filter(e => !validas.includes(e.id)).map(e => e.id);
  if (ruins.length) throw new ErroFerramenta('Estratégia(s) fora das opções deste paciente: ' + ruins.join(', ') + '. Use estrategia_id de contexto_paciente.', 'estrategias');
  const escolha = { foco: a.foco_id ? { id: a.foco_id } : { livre: String(a.foco_texto).trim() }, estrategias: escolhidas };
  if (Array.isArray(a.observar) && a.observar.length) escolha.observar = a.observar.filter(tem).map(String);
  if (tem(a.proxima_etapa)) escolha.proxima_etapa = String(a.proxima_etapa);
  const m = PB.montarDirecao(escolha);
  /* o relato do paciente (Mapeamento, acordos, Resultado anterior) entra como no assistente do app */
  const S = RD.sugestoes(x.ctxSug), rel = {};
  LISTAS_RELATO.forEach(k => { rel[k] = (S[k] || []).filter(it => it && ORIGENS_RELATO.includes(it.origem) && !RD.termosFora(it.texto).length).map(it => Object.assign({}, it, { confirmado: true, mostrar_paciente: true, descartado: false })); });
  const d = RD.normalizar(null, x.tipo);
  RD.mesclar(d, rel);
  d.foco_atual = m.foco_atual || null;
  d.direcionamentos = (m.direcionamentos || []).slice();
  d.estrategias = (m.estrategias || []).slice(0, PB.MAX_ESTRATEGIAS);
  ['corpo', 'mente', 'espirito'].forEach(t => { d[t].itens = (m[t] || []).slice(); });
  d.observar = (m.observar || []).slice();
  d.proxima_etapa = m.proxima_etapa || null;
  if (!RD.focoConfirmado(d)) throw new ErroFerramenta(HINTS.foco_obrigatorio, 'foco');
  const row = await salvar(q, mod, x, d, PB.resumo(escolha) + ' (via MCP)', dep.uuid);
  return Object.assign(resumoGravado(mod, d, row, x, dep.site), { playbook: PB.VERSAO, aviso: escolhidas.length > 4 ? 'Mais de 4 estratégias: o método recomenda 2 a 4, 5 ou mais só com motivo concreto.' : null });
}

async function resultadosPaciente(q, a) {
  await paciente(q, a.paciente_id);
  const l = await resultados(q, a.paciente_id);
  return { resultados: l.filter(r => r.status !== 'rascunho').map(r => ({ resultado_id: r.id, versao: r.revision_number, status: r.status, salvo_em: r.saved_at ? new Date(r.saved_at).toISOString() : null,
    vigente: !r.superseded_at && !l.some(x => x.supersedes_id === r.id), foco: r.direcao && r.direcao.foco_atual ? r.direcao.foco_atual.texto || null : null })) };
}

async function agenda(q, a, agora) {
  const d = tem(a.data) ? String(a.data).slice(0, 10) : agora.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new ErroFerramenta('data no formato AAAA-MM-DD.', 'data');
  const l = await q("select c.id, c.hora, c.duracao_min, c.tipo, p.id as paciente_id, p.nome from public.consultations c join public.patients p on p.id = c.patient_id where c.data = $1 and c.cancelled_at is null order by c.hora", [d]);
  return { data: d, consultas: l.map(c => ({ hora: c.hora ? String(c.hora).slice(0, 5) : null, duracao_min: c.duracao_min, tipo: c.tipo, paciente_id: c.paciente_id, nome: c.nome })) };
}

function estrategiasPlaybook(mod, a) {
  const { PB } = mod;
  const s = a.sistema ? String(a.sistema) : null;
  if (s && !PB.NOME_SISTEMA[s] && s !== 'geral') throw new ErroFerramenta('sistema: ' + Object.keys(PB.NOME_SISTEMA).concat('geral').join(', '), 'sistema');
  return { versao: PB.VERSAO, focos: PB.FOCOS.filter(f => !s || f.sistema === s).map(f => ({ foco_id: f.id, sistema: f.sistema, texto: f.texto, por_que: f.porque })),
    estrategias: PB.ESTRATEGIAS.filter(e => !s || e.sistema === s).map(e => ({ estrategia_id: e.id, sistema: e.sistema, territorio: e.territorio, titulo: e.titulo, tipo: PB.TIPO[e.tipo], nivel: e.nivel,
      acao: e.acao, quando: e.contexto, observar: e.observar, cuidado: e.cuidado || null, so_com_ferramenta: e.requer || null })) };
}

/* ---------------------------------------------------------------- catalogo das ferramentas */
const P = (props, req) => ({ type: 'object', properties: props, required: req || [], additionalProperties: false });
const ID = { type: 'string', description: 'paciente_id devolvido por buscar_pacientes' };
const FERRAMENTAS = [
  { name: 'buscar_pacientes', title: 'Buscar paciente', description: 'Encontra pacientes desta nutricionista pelo nome (ou parte dele). Devolve paciente_id, último atendimento e último HOLOSCAN. Use antes de qualquer outra ferramenta.',
    inputSchema: P({ nome: { type: 'string', description: 'nome ou parte do nome; vazio lista todos' }, incluir_arquivados: { type: 'boolean' } }), annotations: { readOnlyHint: true } },
  { name: 'contexto_paciente', title: 'Contexto do paciente', description: 'O contexto do Resultado HOLOS (substitui o Pacote do agente): atendimento, tipo (primeira consulta/retorno), HOLOSCAN com as áreas prioritárias, ferramentas aplicadas, Mapeamento, Conduta, Resultado anterior e as opções do Playbook (focos e estratégias com ids). Só iniciais e idade: sem contatos.',
    inputSchema: P({ paciente_id: ID, atendimento_id: { type: 'string', description: 'opcional; padrão: o atendimento do HOLOSCAN mais recente' } }, ['paciente_id']), annotations: { readOnlyHint: true } },
  { name: 'instrucoes_resultado', title: 'Instruções e contrato do Resultado', description: 'As regras do método e o contrato JSON HOLOS_AI_RESULT v1 (com exemplo) para escrever a análise que gerar_resultado recebe.',
    inputSchema: P({}), annotations: { readOnlyHint: true } },
  { name: 'gerar_resultado', title: 'Gerar Resultado HOLOS (análise)', description: 'Grava o Resultado HOLOS a partir da análise escrita no contrato HOLOS_AI_RESULT v1 (o mesmo do agente HOLOS AI). O servidor valida; havendo erro, devolve a lista para corrigir. O Resultado fica finalizado na ficha para a nutricionista revisar e emitir. Não envia nada ao paciente.',
    inputSchema: P({ paciente_id: ID, atendimento_id: { type: 'string' }, resultado: { type: ['object', 'string'], description: 'objeto JSON HOLOS_AI_RESULT v1 (24 chaves); aceita também o texto com um bloco ```json```' } }, ['paciente_id', 'resultado']), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } },
  { name: 'gerar_resultado_playbook', title: 'Gerar Resultado HOLOS (Playbook)', description: 'Caminho rápido: grava o Resultado HOLOS com 1 foco e 2 a 4 estratégias do Playbook HOLOS (ids de contexto_paciente). O relato do paciente (Mapeamento, acordos) entra junto. Não envia nada ao paciente.',
    inputSchema: P({ paciente_id: ID, atendimento_id: { type: 'string' }, foco_id: { type: 'string' }, foco_texto: { type: 'string', description: 'foco escrito pela nutricionista, se nenhum dos focos servir' },
      estrategias: { type: 'array', minItems: 1, maxItems: 6, items: { anyOf: [{ type: 'string' }, { type: 'object', properties: { estrategia_id: { type: 'string' }, acao: { type: 'string' }, quando: { type: 'string' }, observar: { type: 'string' } }, required: ['estrategia_id'] }] } },
      observar: { type: 'array', items: { type: 'string' } }, proxima_etapa: { type: 'string' } }, ['paciente_id', 'estrategias']), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } },
  { name: 'resultados_paciente', title: 'Resultados do paciente', description: 'As versões do Resultado HOLOS deste paciente (vigente, foco e data).',
    inputSchema: P({ paciente_id: ID }, ['paciente_id']), annotations: { readOnlyHint: true } },
  { name: 'agenda', title: 'Agenda do dia', description: 'Consultas marcadas num dia (padrão: hoje), com o paciente_id para preparar a consulta.',
    inputSchema: P({ data: { type: 'string', description: 'AAAA-MM-DD' } }), annotations: { readOnlyHint: true } },
  { name: 'estrategias_playbook', title: 'Playbook HOLOS', description: 'Consulta o Playbook HOLOS: focos e estratégias de um sistema (fungico, acido_inflamatorio, metabolico, detox_linfatico, mental_emocional_espiritual ou geral), com tipo, nível e cuidados.',
    inputSchema: P({ sistema: { type: 'string' } }), annotations: { readOnlyHint: true } }
];
const PROMPTS = [{ name: 'gerar_resultado', title: 'Gerar o Resultado HOLOS', description: 'Gera o Resultado HOLOS de um paciente com os dados do HoloHacking.',
  arguments: [{ name: 'paciente', description: 'nome do paciente', required: true }] }];

/* ---------------------------------------------------------------- servidor */
function criarServidor(dep) {
  const agora = () => (dep.agora ? dep.agora() : new Date());
  async function chamar(auth, nome, a) {
    a = a && typeof a === 'object' ? a : {};
    const f = FERRAMENTAS.find(x => x.name === nome);
    if (!f) return { erroProtocolo: { code: -32602, message: 'Ferramenta desconhecida: ' + nome } };
    if (nome === 'instrucoes_resultado') return { ok: { instrucoes: INSTRUCOES, contrato: dep.contrato || null, exemplo: dep.exemplo || null,
      lembretes: ['schema_version 1; exatamente as 24 chaves do contrato.', 'tipo: primeira_consulta ou retorno (o do contexto).', 'Direcionamentos e estratégias com status SUGERIDO; hipótese sempre so_profissional true.', 'rascunho_paciente simples, sem números do HOLOSCAN.'] } };
    if (nome === 'estrategias_playbook') { try { return { ok: estrategiasPlaybook(dep.mod, a) }; } catch (e) { return { falha: e }; } }
    const pid = UUID.test(String(a.paciente_id || '')) ? a.paciente_id : null;
    try {
      const r = await dep.comoNutri(auth.nutritionist_id, (q) => {
        if (nome === 'buscar_pacientes') return buscarPacientes(q, a);
        if (nome === 'contexto_paciente') return contextoPaciente(q, dep.mod, a, agora());
        if (nome === 'gerar_resultado') return gerarResultado(q, dep.mod, a, dep);
        if (nome === 'gerar_resultado_playbook') return gerarPlaybook(q, dep.mod, a, dep);
        if (nome === 'resultados_paciente') return resultadosPaciente(q, a);
        if (nome === 'agenda') return agenda(q, a, agora());
        throw new ErroFerramenta('não implementada');
      });
      await uso(auth, nome, pid, true, null);
      return { ok: r };
    } catch (e) {
      await uso(auth, nome, pid, false, e instanceof ErroFerramenta ? e.codigo : ((e && e.hint) || 'erro'));
      return { falha: e };
    }
  }
  async function uso(auth, nome, pid, ok, erro) { try { if (dep.registrarUso) await dep.registrarUso(auth.nutritionist_id, auth.key_id, nome, pid, ok, erro); } catch (e) { /* o registro nunca derruba a resposta */ } }

  function conteudo(r) {
    if (r.ok !== undefined) return { content: [{ type: 'text', text: JSON.stringify(r.ok, null, 2) }], structuredContent: r.ok, isError: false };
    const e = r.falha, msg = e instanceof ErroFerramenta ? e.message : mensagemPg(e);
    const corpo = { erro: e instanceof ErroFerramenta ? e.codigo : 'servidor', mensagem: msg }; if (e && e.detalhes) corpo.detalhes = e.detalhes;
    return { content: [{ type: 'text', text: JSON.stringify(corpo, null, 2) }], structuredContent: corpo, isError: true };
  }

  async function mensagem(auth, m) {
    const resp = (result) => ({ jsonrpc: '2.0', id: m.id, result });
    const erro = (code, message) => ({ jsonrpc: '2.0', id: m && m.id !== undefined ? m.id : null, error: { code, message } });
    if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return erro(-32600, 'Pedido inválido');
    const notificacao = m.id === undefined || m.id === null;
    if (notificacao) return null;   // notifications/initialized, cancelled, ...: sem resposta
    switch (m.method) {
      case 'initialize': {
        const pedida = m.params && m.params.protocolVersion;
        return resp({ protocolVersion: PROTOCOLOS.includes(pedida) ? pedida : PROTOCOLOS[0], capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
          serverInfo: { name: 'holohacking', title: 'HoloHacking', version: VERSAO }, instructions: INSTRUCOES });
      }
      case 'ping': return resp({});
      case 'tools/list': return resp({ tools: FERRAMENTAS });
      case 'prompts/list': return resp({ prompts: PROMPTS });
      case 'prompts/get': {
        const nomeP = m.params && m.params.name, arg = (m.params && m.params.arguments) || {};
        if (nomeP !== 'gerar_resultado') return erro(-32602, 'Prompt desconhecido');
        return resp({ description: PROMPTS[0].description, messages: [{ role: 'user', content: { type: 'text', text:
          'Gere o Resultado HOLOS de ' + (arg.paciente || 'o paciente') + ' no HoloHacking: busque o paciente, leia o contexto, escreva a análise no contrato HOLOS_AI_RESULT v1 seguindo as instruções do método e grave com gerar_resultado. Depois me mostre o foco e as estratégias gravadas.' } }] });
      }
      case 'resources/list': return resp({ resources: [] });
      case 'tools/call': {
        const nome = m.params && m.params.name;
        if (typeof nome !== 'string') return erro(-32602, 'name obrigatório');
        const r = await chamar(auth, nome, m.params.arguments);
        if (r.erroProtocolo) return { jsonrpc: '2.0', id: m.id, error: r.erroProtocolo };
        return resp(conteudo(r));
      }
      default: return erro(-32601, 'Método não suportado: ' + m.method);
    }
  }

  /* pedido HTTP -> resposta. chave: do caminho (/holohacking-mcp/<chave>) ou Authorization: Bearer <chave> */
  async function tratarHttp({ metodo, caminho, headers, corpo }) {
    const h = {};
    Object.keys(headers || {}).forEach(k => { h[k.toLowerCase()] = headers[k]; });
    const base = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE', 'Cache-Control': 'no-store' };
    const json = (status, obj) => ({ status, headers: Object.assign({ 'Content-Type': 'application/json' }, base), corpo: obj === null ? '' : JSON.stringify(obj) });
    if (metodo === 'OPTIONS') return { status: 204, headers: base, corpo: '' };
    if (metodo === 'GET' || metodo === 'DELETE') return { status: 405, headers: Object.assign({ Allow: 'POST' }, base), corpo: '' };
    if (metodo !== 'POST') return { status: 405, headers: base, corpo: '' };
    const seg = String(caminho || '').split('/').filter(Boolean);
    const doCaminho = seg.find(s => /^hh_mcp_/.test(s)) || null;
    const doHeader = String(h.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const chave = doCaminho || (/^hh_mcp_/.test(doHeader) ? doHeader : null);
    const negado = { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Chave do HoloHacking inválida, revogada ou conta não liberada. Gere uma nova chave no Perfil do app.' } };
    let auth = null;
    try { auth = chave ? await dep.identificar(chave) : null; } catch (e) { auth = null; }
    if (!auth || !auth.nutritionist_id) return json(401, negado);
    let msg;
    try { msg = typeof corpo === 'string' ? JSON.parse(corpo) : corpo; } catch (e) { return json(400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }); }
    if (Array.isArray(msg)) {
      if (!msg.length) return json(400, { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Lote vazio' } });
      const rs = [];
      for (const m of msg) { const r = await mensagem(auth, m); if (r) rs.push(r); }   // em sequencia: uma transacao por vez
      return rs.length ? json(200, rs) : { status: 202, headers: base, corpo: '' };
    }
    const r = await mensagem(auth, msg);
    return r ? json(200, r) : { status: 202, headers: base, corpo: '' };
  }
  return { tratarHttp, mensagem };
}
// ---- fim do nucleo ----

const G = globalThis as Record<string, unknown>;
const URL_BANCO = Deno.env.get("SUPABASE_DB_URL") ?? "";
const SITE = (Deno.env.get("SITE_URL") ?? "https://holohacking.com.br").replace(/\/+$/, "");
const sql = URL_BANCO ? postgres(URL_BANCO, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 }) : null;

type Q = (texto: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const servidor = criarServidor({
  mod: { RD: G.ResultadoDirecao, C: G.HolosAIContrato, PB: G.PlaybookHolos, SF: G.SistemasFechamento },
  uuid: () => crypto.randomUUID(),
  site: SITE,
  contrato,
  exemplo,
  identificar: async (chave: string) => {
    if (!sql) return null;
    const [l] = await sql`select public.mcp_identificar(${chave}) as r`;
    return l?.r ?? null;
  },
  comoNutri: (uid: string, fn: (q: Q) => Promise<unknown>) => {
    if (!sql) throw new Error("nao_configurado");
    return sql.begin(async (tx) => {
      await tx.unsafe("set local role authenticated");
      await tx.unsafe("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
      const q: Q = (texto, params) => tx.unsafe(texto, (params ?? []) as never[]) as unknown as Promise<Record<string, unknown>[]>;
      return await fn(q);
    });
  },
  registrarUso: async (uid: string, key: string, ferramenta: string, paciente: string | null, ok: boolean, erro: string | null) => {
    if (!sql) return;
    await sql`select public.mcp_registrar_uso(${uid}, ${key}, ${ferramenta}, ${paciente}, ${ok}, ${erro})`;
  },
});

async function tratar(req: Request): Promise<Response> {
  const corpo = req.method === "POST" ? await req.text() : "";
  if (corpo.length > 600_000) return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Pedido grande demais" } }), { status: 413, headers: { "Content-Type": "application/json" } });
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });
  const r = await servidor.tratarHttp({ metodo: req.method, caminho: new URL(req.url).pathname, headers, corpo });
  return new Response(r.corpo || null, { status: r.status, headers: r.headers });
}
/* MCP_PORTA_LOCAL: so nos testes locais (testes/testar-mcp-funcao.mjs); no Supabase, Deno.serve padrao */
const portaLocal = Deno.env.get("MCP_PORTA_LOCAL");
if (portaLocal) Deno.serve({ port: Number(portaLocal), hostname: "127.0.0.1" }, tratar); else Deno.serve(tratar);
