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
  function estrategiaCartao(x) {
    var linha = function (rot, v) { return v ? '<p><span class="rd-rot">' + esc(rot) + "</span> " + esc(v) + "</p>" : ""; };
    return '<li class="rd-est"><div class="rd-dir-topo"><b>' + esc(x.texto) + "</b>" + (x.status ? '<span class="rd-chip">' + esc(STATUS_EST[x.status] || x.status) + "</span>" : "") + "</div>" +
      linha("Para que", x.finalidade) + linha("O que você vai fazer", x.acao) + linha("O que observar", x.observar) + linha("Quando / com que frequência", x.contexto) + linha("Prazo", x.prazo) + "</li>";
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
  function htmlPaciente(dp, caminho, opts) {
    opts = opts || {};
    dp = dp || projecaoPaciente(null);
    var retorno = dp.tipo === "retorno";
    var proxima = dp.proxima_etapa ? secao("proxima", "Próxima etapa", '<p class="rd-proxima">' + esc(dp.proxima_etapa.texto) + "</p>") : "";
    var html = '<header class="rh-doc-cab rd-cab"><span class="eyebrow">Resultado HOLOS</span><h2>' + (retorno ? "Seu acompanhamento" : "Sua direção nesta etapa") +
      (opts.nome ? " &middot; " + esc(opts.nome) : "") + "</h2>" +
      (opts.data || opts.profissional ? '<p class="rh-doc-sub">' + (opts.data ? "Encontro de " + esc(opts.data) : "") + (opts.profissional ? " · com " + esc(opts.profissional) : "") + "</p>" : "") +
      (opts.previa ? '<p class="rh-previa-selo" role="status">PRÉVIA — ainda não salva. Nada aqui foi registrado.</p>' : "") +
      (dp.foco_atual ? "" : '<p class="rd-construcao rd-construcao-selo" role="status">' + esc(EM_CONSTRUCAO) + "</p>") +
      '<p class="rh-intro">Este documento reúne a direção do seu acompanhamento: para onde vamos nesta fase (direcionamentos), como vamos trabalhar na prática (estratégias) e como vamos acompanhar o que acontece (evolução). O mapa do HOLOSCAN fica no fim. Ele não é diagnóstico nem prescrição.</p></header>';
    if (retorno) {
      html += pilarPac("evolucao_retorno", caminhoHtml(caminho, opts.data) + antesAgora(caminho, dp) +
        secaoLista("avancos", "Avanços", dp.avancos, "", "Ainda não há avanço registrado nesta etapa.") +
        secaoLista("permaneceu", "O que permaneceu", dp.permaneceu) + acompanhamentoHtml(dp) + secaoLista("padroes", "O que ficou mais claro", dp.padroes));
      html += pilarPac("direcionamento", foco(dp, "Novo foco") + direcionamentosHtml(dp, "Novo direcionamento") + secaoLista("desejos", "O que você quer construir", dp.desejos));
      html += pilarPac("estrategias", estrategiasHtml(dp, "Novas estratégias") + territorios(dp) + secaoLista("combinamos", "O que combinamos", dp.acordos_compartilhados));
      html += pilarPac("proximo", secaoLista("observar", "Até o próximo encontro, observe", dp.observar) + proxima);
    } else {
      html += pilarPac("direcionamento", secaoLista("momento", "Seu momento agora", dp.momento) + secaoLista("dores", "O que está pesando agora", dp.dores) +
        secaoLista("desejos", "O que você quer construir", dp.desejos) + secaoLista("padroes", "O que estamos compreendendo", dp.padroes) + foco(dp, "Foco atual") +
        direcionamentosHtml(dp, "Direcionamentos desta fase"));
      html += pilarPac("estrategias", estrategiasHtml(dp, "Estratégias combinadas") + territorios(dp) + secaoLista("combinamos", "O que combinamos", dp.acordos_compartilhados));
      html += pilarPac("evolucao", secaoLista("observar", "Até o próximo encontro, observe", dp.observar) + evolucaoPrimeira(dp) + proxima);
    }
    if (opts.detalhes) html += opts.detalhes;
    return html;
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
