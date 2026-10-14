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
          contexto: CLASSIFICACOES[v.classificacao] || null,
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
