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
  var LISTAS = ["momento", "dores", "desejos", "avancos", "permaneceu", "padroes", "estrategias", "acordos_compartilhados", "observar"];
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
    estrategias: ["Como vamos caminhar", "Estratégias (como vamos caminhar)", "estrategias"],
    acordos_compartilhados: ["O que combinamos", "O que combinamos (acordos compartilhados)", "estrategias"],
    avancos: ["O que já está mudando", "O que já está mudando (avanços)", "evolucao"],
    permaneceu: ["O que permaneceu", "O que permaneceu", "evolucao"],
    observar: ["Até o próximo encontro, observe", "Até o próximo encontro, observe", "evolucao"],
    proxima_etapa: ["Próxima etapa", "Próxima etapa (o que vamos revisar)", "evolucao"],
    hipoteses: ["", "Hipóteses (só profissional)", "profissional"]
  };
  var ORIGEM_PROF = { relato_paciente: "Relato da paciente", observacao_profissional: "Observação profissional", holoscan: "HOLOSCAN",
    ferramenta: "Ferramenta", conduta: "Conduta", acordo: "Acordo", nutricionista: "Escrito pela nutricionista", resultado_anterior: "Resultado anterior" };
  var ORIGEM_PAC = { relato_paciente: "você contou", observacao_profissional: "registrado pela sua nutricionista", holoscan: "do HOLOSCAN",
    ferramenta: "de uma ferramenta", conduta: "registrado pela sua nutricionista", acordo: "combinado com a sua nutricionista",
    nutricionista: "registrado pela sua nutricionista", resultado_anterior: "do encontro anterior" };
  var REF_ROT = { anamnese: "Anamnese", conduta: "Conduta", acordo: "Acordo", ferramenta: "Ferramenta", holoscan: "HOLOSCAN", resultado: "Resultado anterior", atendimento: "Atendimento" };
  var ESTADO = {
    sugerido: "SUGESTÃO DO SISTEMA",
    confirmado: "CONFIRMADO PELA NUTRICIONISTA",
    compartilhado: "CONFIRMADO · COMPARTILHADO COM A PACIENTE",
    so_profissional: "CONFIRMADO · SÓ PROFISSIONAL"
  };
  /* termos fora do metodo: so AVISO na tela da nutricionista (nunca bloqueia nem entra no PDF) */
  var PROIBIDOS = ["dieta", "calori", "kcal", "cardápio", "prescri", "suplement", "diagnóstic", "encaminh", "isso causou", "seu corpo está mostrando",
    "sua doença vem de", "bloqueio energético", "resistência à insulina", "candid", "toxina", "trauma", "transtorno", "causa emocional", "problema espiritual"];

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
    var ok = function (it) { return tem(it && it.texto); };
    var o = { schema_version: VERSAO, tipo: d.tipo === "retorno" ? "retorno" : "primeira" };
    LISTAS.forEach(function (k) { o[k] = (d[k] || []).filter(ok).map(limpa); });
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
    var l = function (x, so) { return (x || []).filter(function (it) { return itemPaciente(it) && (!so || it.tipo === "padrao_observado"); }).map(function (it) { return { texto: it.texto.trim(), origem: it.origem || null }; }); };
    var f = d.foco_atual;
    return { schema_version: 1, tipo: d.tipo, momento: l(d.momento), dores: l(d.dores), desejos: l(d.desejos), avancos: l(d.avancos), permaneceu: l(d.permaneceu),
      padroes: l(d.padroes, true),
      foco_atual: focoConfirmado(d) && f.tipo !== "hipotese" ? { texto: f.texto.trim(), origem: f.origem || null } : null,
      estrategias: l(d.estrategias), corpo: { itens: l(d.corpo.itens) }, mente: { itens: l(d.mente.itens) }, espirito: { itens: l(d.espirito.itens) },
      acordos_compartilhados: l(d.acordos_compartilhados), observar: l(d.observar),
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
    var aR = function (k, rotulo, campo, bloco, txt) { var v = g(bloco, campo); if (tem(v)) add(k, sug(txt ? txt(lista(v)) : rotulo + lista(v) + ".", "relato_paciente", "anamnese", an.id, bloco + "." + campo)); };
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
      linhas(c.nutrition_strategy).forEach(function (x) { add("estrategias", sug(x, "conduta", "conduta", c.id, "nutrition_strategy")); });
      linhas(c.resources).forEach(function (x) { add("estrategias", sug(x, "conduta", "conduta", c.id, "resources")); });
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
    });
    return S;
  }
  /* chave de rastreabilidade: a mesma fonte nao vira duas sugestoes */
  function chave(it) { var r = it.ref || {}; return [it.origem, r.tipo, r.id, r.campo, it.texto_sugerido || it.texto].join("|"); }
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
      '<div class="rd-ed-botoes">' +
        (it.confirmado ? '<button type="button" class="btn-fantasma" data-rd-acao="desconfirmar">Desfazer confirmação</button>'
          : '<button type="button" class="btn-borda-ouro" data-rd-acao="confirmar">Confirmar</button>') +
        (so_prof || hip ? '<span class="rd-so-prof">' + (hip ? "Hipótese: nunca vai para a paciente." : "Só profissional.") + "</span>"
          : '<label class="rd-compartilhar"><input type="checkbox" data-rd-acao="compartilhar"' + (it.mostrar_paciente ? " checked" : "") + (it.confirmado ? "" : " disabled") + "> Compartilhar com a paciente</label>") +
        '<button type="button" class="btn-fantasma rd-excluir" data-rd-acao="excluir">Excluir</button>' +
      "</div></li>";
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
      (itens.length ? '<ul class="rd-ed-lista">' + itens.map(function (it) { return linhaEditor(sec === "hipoteses" ? "padroes" : sec, it, sec === "hipoteses"); }).join("") + "</ul>" : '<p class="rh-vazio">Nada aqui ainda.</p>') +
      '<div class="rd-add"><textarea rows="1" maxlength="1000" data-rd-novo="' + esc(sec) + '" placeholder="Escrever um item' + (sec === "hipoteses" ? " (hipótese — só profissional)" : "") + '…" aria-label="Novo item: ' + esc(titulo) + '"></textarea>' +
        '<button type="button" class="btn-borda-ouro" data-rd-acao="adicionar" data-rd-sec="' + esc(sec) + '">Adicionar</button></div></section>';
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
    if (retorno) {
      html += pil("evolucao_retorno", '<p class="dash-sub">“Seu caminho até aqui” e “Antes” vêm dos Resultados anteriores, já salvos (somente leitura).</p>' +
        blocoEditor(d, "momento", { desc: "Agora: o que aconteceu desde o último encontro." }) + blocoEditor(d, "avancos") + blocoEditor(d, "permaneceu") +
        blocoEditor(d, "padroes", { desc: "O que ficou mais claro (padrão observado: descreve quando e como aparece, sem causa)." }));
      html += pil("direcionamento", unicoEditor(d, "foco_atual", candidatosUnicos.foco_atual) + blocoEditor(d, "desejos"));
      html += pil("estrategias", blocoEditor(d, "estrategias") + TERRITORIOS.map(function (t) { return blocoEditor(d, t); }).join("") + blocoEditor(d, "acordos_compartilhados"));
      html += pil("proximo", blocoEditor(d, "observar") + unicoEditor(d, "proxima_etapa", candidatosUnicos.proxima_etapa));
    } else {
      html += pil("direcionamento", blocoEditor(d, "momento") + blocoEditor(d, "dores") + blocoEditor(d, "desejos") +
        blocoEditor(d, "padroes", { desc: "Padrão observado: descreve quando e como aparece, sem causa. Hipóteses ficam na área só profissional." }) +
        unicoEditor(d, "foco_atual", candidatosUnicos.foco_atual));
      html += pil("estrategias", blocoEditor(d, "estrategias") + TERRITORIOS.map(function (t) { return blocoEditor(d, t); }).join("") + blocoEditor(d, "acordos_compartilhados"));
      html += pil("evolucao", blocoEditor(d, "avancos", { desc: "Primeira consulta: sem avanço confirmado, a paciente vê “ponto de partida”." }) + blocoEditor(d, "observar") +
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
    if (nome === "confirmar" && it) { if (!tem(it.texto)) return false; it.confirmado = true; if (it.tipo !== "hipotese") it.mostrar_paciente = true; return true; }
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
    var antes = ult && ult.foco && ult.foco.texto ? "<p>" + esc(ult.foco.texto) + "</p><small class=\"rd-de\">foco do encontro de " + esc(dataCurta(ult.atendimento_em)) + "</small>"
      : '<p class="rd-vazio">O encontro anterior não tem foco registrado neste formato.</p>';
    var agora = (dp.momento || []).length ? listaPac(dp.momento) : '<p class="rd-vazio">Ainda não registrado.</p>';
    return secao("antes-agora", "Antes / Agora", '<div class="rd-antes-agora"><div class="rd-antes"><h4>Antes</h4>' + antes + '</div><div class="rd-agora"><h4>Agora</h4>' + agora + "</div></div>");
  }
  /* snap: content_snapshot do Resultado (template 5) ou { direcao_paciente, caminho } da emissao RF-3.
     opts: { nome, data, profissional, detalhes (html dos Detalhes do mapa), previa } */
  function htmlPaciente(dp, caminho, opts) {
    opts = opts || {};
    dp = dp || projecaoPaciente(null);
    var retorno = dp.tipo === "retorno";
    var html = '<header class="rh-doc-cab rd-cab"><span class="eyebrow">Resultado HOLOS</span><h2>' + (retorno ? "Seu acompanhamento" : "Sua direção nesta etapa") +
      (opts.nome ? " &middot; " + esc(opts.nome) : "") + "</h2>" +
      (opts.data || opts.profissional ? '<p class="rh-doc-sub">' + (opts.data ? "Encontro de " + esc(opts.data) : "") + (opts.profissional ? " · com " + esc(opts.profissional) : "") + "</p>" : "") +
      (opts.previa ? '<p class="rh-previa-selo" role="status">PRÉVIA — ainda não salva. Nada aqui foi registrado.</p>' : "") +
      (dp.foco_atual ? "" : '<p class="rd-construcao rd-construcao-selo" role="status">' + esc(EM_CONSTRUCAO) + "</p>") +
      '<p class="rh-intro">Este documento reúne a direção do seu acompanhamento: onde você está, para onde vamos, como vamos caminhar e como vamos acompanhar o que muda. Ele não é diagnóstico nem prescrição.</p></header>';
    if (retorno) {
      html += pilarPac("evolucao_retorno", caminhoHtml(caminho, opts.data) + antesAgora(caminho, dp) +
        secaoLista("avancos", "Avanços", dp.avancos, "", "Ainda não há avanço registrado nesta etapa.") +
        secaoLista("permaneceu", "O que permaneceu", dp.permaneceu) + secaoLista("padroes", "O que ficou mais claro", dp.padroes));
      html += pilarPac("direcionamento", foco(dp, "Novo foco") + secaoLista("desejos", "O que você quer construir", dp.desejos));
      html += pilarPac("estrategias", secaoLista("estrategias", "Como vamos caminhar", dp.estrategias) + territorios(dp) + secaoLista("combinamos", "O que combinamos", dp.acordos_compartilhados));
      html += pilarPac("proximo", secaoLista("observar", "Até o próximo encontro, observe", dp.observar) +
        (dp.proxima_etapa ? secao("proxima", "Próxima etapa", '<p class="rd-proxima">' + esc(dp.proxima_etapa.texto) + "</p>") : ""));
    } else {
      html += pilarPac("direcionamento", secaoLista("momento", "Seu momento agora", dp.momento) + secaoLista("dores", "O que está pesando agora", dp.dores) +
        secaoLista("desejos", "O que você quer construir", dp.desejos) + secaoLista("padroes", "O que estamos compreendendo", dp.padroes) + foco(dp, "Foco atual"));
      html += pilarPac("estrategias", secaoLista("estrategias", "Como vamos caminhar", dp.estrategias) + territorios(dp) + secaoLista("combinamos", "O que combinamos", dp.acordos_compartilhados));
      html += pilarPac("evolucao", secaoLista("avancos", "O que já está mudando", dp.avancos, "", PONTO_DE_PARTIDA) +
        secaoLista("observar", "Até o próximo encontro, observe", dp.observar) +
        (dp.proxima_etapa ? secao("proxima", "Próxima etapa", '<p class="rd-proxima">' + esc(dp.proxima_etapa.texto) + "</p>") : ""));
    }
    if (opts.detalhes) html += opts.detalhes;
    return html;
  }

  /* ---------- visao profissional: o que foi montado, com estado e origem ---------- */
  function htmlProfissional(d, dp) {
    d = normalizar(d);
    var item = function (it) {
      return '<li class="rd-pro-item rd-ed-' + estadoDe(it) + '">' + chipEstado(it) + (it.sugestao && it.confirmado ? ' <span class="rd-sug-selo rd-sug-origem">veio de sugestão do sistema</span>' : "") +
        "<p>" + esc(it.texto) + '</p><small class="rd-origem">' + esc(ORIGEM_PROF[it.origem] || it.origem) + (it.ref ? " · " + esc(rotRef(it.ref, it.origem)) : "") +
        (it.sugestao && it.texto_sugerido && it.texto_sugerido !== it.texto ? " · editado a partir da sugestão" : "") + "</small></li>";
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
      bloco(SECAO.padroes[1], d.padroes.filter(function (it) { return it.tipo !== "hipotese"; })) + bloco("Foco atual", d.foco_atual ? [d.foco_atual] : []));
    html += pil("estrategias", bloco(SECAO.estrategias[1], d.estrategias) + TERRITORIOS.map(function (t) { return bloco(NOME_TERR[t] + " — " + PERGUNTA[t], d[t].itens); }).join("") +
      bloco(SECAO.acordos_compartilhados[1], d.acordos_compartilhados));
    html += pil("evolucao", bloco(SECAO.avancos[1], d.avancos) + bloco(SECAO.permaneceu[1], d.permaneceu) + bloco(SECAO.observar[1], d.observar) +
      bloco(SECAO.proxima_etapa[1], d.proxima_etapa ? [d.proxima_etapa] : []));
    var hip = d.padroes.filter(function (it) { return it.tipo === "hipotese" && !it.descartado; });
    html += '<div class="rd-pro-pilar rd-so-profissional"><h4>Só para a profissional</h4>' + (hip.length ? bloco("Hipóteses", hip) : '<p class="rh-vazio">Nenhuma hipótese registrada.</p>') + "</div>";
    if (desc) html += '<p class="rh-nota-tec">' + desc + (desc === 1 ? " sugestão recusada" : " sugestões recusadas") + " (ficam no registro, nunca na visão da paciente).</p>";
    return html + "</section>";
  }

  /* ---------- WhatsApp ---------- */
  function mensagemWhatsApp(nome, data, foco) {
    return "Olá, " + (String(nome || "").trim().split(/\s+/)[0] || "tudo bem") + "! Segue o seu Resultado HOLOS de " + (data || "hoje") +
      ". Nesta etapa, nosso foco é: " + String(foco || "").trim().replace(/[.]+$/, "") +
      ". No documento você encontra o que estamos observando, o que combinamos e o que vamos revisar no próximo encontro.";
  }

  var api = {
    VERSAO: VERSAO, LISTAS: LISTAS, TERRITORIOS: TERRITORIOS, UNICOS: UNICOS, PERGUNTA: PERGUNTA, VAZIO_TERR: VAZIO_TERR, PONTO_DE_PARTIDA: PONTO_DE_PARTIDA,
    EM_CONSTRUCAO: EM_CONSTRUCAO, ESTADO: ESTADO, PILAR: PILAR, SECAO: SECAO, PROIBIDOS: PROIBIDOS, ORIGEM_PAC: ORIGEM_PAC,
    nova: nova, normalizar: normalizar, todos: todos, paraGravar: paraGravar, estadoDe: estadoDe, focoConfirmado: focoConfirmado,
    projecaoPaciente: projecaoPaciente, termosFora: termosFora, avisos: avisos, sugestoes: sugestoes, mesclar: mesclar, chave: chave,
    htmlEditor: htmlEditor, htmlSoProfissional: htmlSoProfissional, lerEditor: lerEditor, acao: acao, definirCandidatos: definirCandidatos,
    candidatos: function () { return candidatosUnicos; },
    htmlPaciente: htmlPaciente, htmlProfissional: htmlProfissional, mensagemWhatsApp: mensagemWhatsApp
  };
  raiz.ResultadoDirecao = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
