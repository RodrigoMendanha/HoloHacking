/* ===========================================================================
   RESULTADO-LEGADO-R3 — o desenho CONGELADO do Resultado HOLOS (templates 1-3) e da emissao RF-1
   ===========================================================================

   Motor de resultados V1 (12/10, item 4.7): uma emissao ja feita nao pode mudar de texto nem de
   layout so porque o codigo atual mudou. Este arquivo e uma COPIA LITERAL do desenho que existia
   ate o commit 4680dbb (ferramentas-fechamento.js, resultado-sintese.js, documentoHtml do
   resultado-holos.js e o documento da emissao do resultado-pagina.js), isolada num objeto proprio
   (R3) para nao se misturar com os modulos atuais. As emissoes RF-1 sao desenhadas SO por aqui.

   NAO EDITAR. Mudanca de desenho = template novo (RF-2 em diante), nunca aqui.
   Prova: testes/testar-emissao-imutavel.mjs desenha a emissao do golden (testes/golden/) e exige
   o MESMO HTML gerado pelo codigo antigo. Dependencias externas que continuam vivas (e que o
   golden tambem vigia): escapar, dataBR, rotuloExibivel, HoloAusencia, RegistroVisual,
   CATALOGO_FERRAMENTAS / FERRAMENTAS_ATIVAS.
   =========================================================================== */
(function () {
  "use strict";
  var R3 = Object.create(window);

/* ===========================================================================
   FERRAMENTAS-FECHAMENTO — o "resultado estruturado" de cada ferramenta
   ===========================================================================

   Decisao metodologica aprovada (10/10, DECISOES-V1 item 180, Decisao 2):
   toda ferramenta pode ter um resultado estruturado, e RESULTADO NAO E SCORE.
   Este modulo so ORGANIZA o que foi registrado na aplicacao, com os rotulos do
   metodo. Nao classifica (baixo/medio/alto), nao interpreta, nao cria
   categoria, nao infere causa, trauma, padrao ou diagnostico, nao calcula
   media e nao indica proxima ferramenta. Le so as respostas do snapshot.

     OQ3                Quero / Preciso / Consigo / Alavancas
     Linha do Momentum  estado ESCOLHIDO pela nutricionista + justificativa +
                        dimensoes registradas (o sistema nunca sugere estado)
     Mapa da Rotina     a realidade pratica, descritiva
     PQQ                os cinco niveis + a sintese construida com a paciente
     Mapa de Crencas    descritivo, sem taxonomia
     Gatilhos           a cadeia registrada, sem causalidade
     Mapa do Proposito  derivado de OQ3 + PQQ (unica relacao ferramenta ->
                        ferramenta homologada; opcional)
     Roda Holistica     a percepcao da pessoa por area, sem media obrigatoria
     Carta ao Futuro Eu so "realizada" (sem interpretar; o conteudo nao vai
                        para a paciente automaticamente)
     Conexao            mapa contextual, sem score nem classificacao; na
                        sintese, so contagens (minimiza dado de terceiros)

   Funciona no navegador (window.FerramentasFechamento) e no Node (testes).
   =========================================================================== */
(function (raiz) {
  "use strict";

  var ESTADOS_MOMENTUM = { preservar: "Preservar", reorganizar: "Reorganizar", construir: "Construir", expandir: "Expandir" };
  var DIM_MOMENTUM = [["energia", "Energia disponível"], ["carga", "Carga de vida"], ["controle", "Controle sobre a rotina"],
    ["suporte", "Suporte"], ["espaco", "Espaço mental"], ["estabilidade", "Estabilidade atual"]];
  var AREAS_RODA = [["saude", "Saúde"], ["relacoes", "Relações"], ["trabalho", "Trabalho"], ["financas", "Finanças"],
    ["espiritualidade", "Espiritualidade"], ["lazer", "Lazer"], ["desenvolvimento", "Desenvolvimento"], ["proposito", "Propósito"]];
  var NOMES = {
    oq3: "OQ³", pqq: "PQQ — Escada dos Porquês", linha_momentum: "Linha do Momentum", mapa_rotina_v1: "Mapa da Rotina",
    mapa_crencas: "Mapa de Crenças Alimentares", gatilhos_respostas_v1: "Gatilhos & Respostas", roda_vida: "Roda Holística da Vida",
    carta_futuro: "Carta ao Futuro Eu", conexao_pertencimento_v1: "Conexão & Pertencimento", mapa: "Mapa do Propósito"
  };

  function tem(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }
  function txt(v) { return Array.isArray(v) ? v.filter(tem).join(", ") : String(v); }
  function num(v) { var n = Number(v); return v !== null && v !== undefined && v !== "" && !isNaN(n) ? n : null; }

  /* item: { rotulo, valor, so_profissional? } — so entra se houver valor */
  function itens(r, pares) {
    return pares.filter(function (p) { return tem(r[p[0]]); }).map(function (p) {
      return { rotulo: p[1], valor: txt(r[p[0]]), so_profissional: !!p[2] };
    });
  }

  function oq3(r) {
    var it = itens(r, [["quer", "O que quer"], ["precisa", "O que precisa de atenção"], ["consegue", "O que consegue sustentar agora"], ["alavancas", "Alavancas"]]);
    var partes = [["quer", "Quero"], ["precisa", "Preciso"], ["consegue", "Consigo"]].filter(function (p) { return tem(r[p[0]]); }).map(function (p) { return p[1]; });
    return { itens: it, linha: partes.length ? partes.join(", ").replace(/, ([^,]*)$/, " e $1") + (partes.length > 1 ? " registrados." : " registrado.") : "nada preenchido." };
  }
  function pqq(r) {
    var niveis = ["r1", "r2", "r3", "r4", "r5"].filter(function (k) { return tem(r[k]); });
    var it = itens(r, [["objetivo", "Objetivo declarado"]]);
    niveis.forEach(function (k) { it.push({ rotulo: "Nível " + k.slice(1) + " — por que importa", valor: txt(r[k]) }); });
    if (tem(r.verdadeiro)) it.push({ rotulo: "Síntese construída com a paciente", valor: txt(r.verdadeiro) });
    return { itens: it, linha: niveis.length + " de 5 níveis registrados" + (tem(r.verdadeiro) ? "; síntese final registrada." : ".") };
  }
  function momentum(r) {
    var est = r.estado_confirmado ? (ESTADOS_MOMENTUM[r.estado_confirmado] || String(r.estado_confirmado)) : null;
    var it = [];
    it.push({ rotulo: "Estado escolhido pela nutricionista", valor: est || "não registrado" });
    if (tem(r.justificativa_estado)) it.push({ rotulo: "Justificativa / registro profissional", valor: txt(r.justificativa_estado), so_profissional: true });
    var dims = DIM_MOMENTUM.filter(function (d) { return num(r[d[0]]) !== null; });
    if (dims.length) it.push({ rotulo: "Dimensões registradas", valor: dims.map(function (d) { return d[1] + " " + num(r[d[0]]); }).join(" · ") });
    it = it.concat(itens(r, [["sustenta", "O que sustenta"], ["limita", "O que limita"], ["nao_pedir", "O que não pedir agora"]]));
    return { itens: it, linha: est ? "estado escolhido pela nutricionista: " + est + "." : "estado não registrado.", estado: est };
  }
  function rotina(r) {
    var it = [];
    var sono = [tem(r.acorda) ? "acorda " + r.acorda : "", tem(r.dorme) ? "dorme " + r.dorme : "", tem(r.sono) ? txt(r.sono) : ""].filter(Boolean).join(" · ");
    if (sono) it.push({ rotulo: "Sono", valor: sono });
    it = it.concat(itens(r, [["trabalho", "Trabalho"], ["deslocamentos", "Deslocamento"]]));
    var resp = [["familia", "família"], ["domesticas", "tarefas domésticas"], ["estudos", "estudos"], ["compromissos", "compromissos"]]
      .filter(function (p) { return tem(r[p[0]]); }).map(function (p) { return p[1] + ": " + txt(r[p[0]]); });
    if (resp.length) it.push({ rotulo: "Responsabilidades", valor: resp.join(" · ") });
    var ev = Array.isArray(r.eventos) ? r.eventos : [];
    if (ev.length) {
      it.push({ rotulo: "O dia registrado (refeições, atividade, pausas…)", valor: ev.map(function (e) {
        return [e.inicio, e.titulo || e.categoria, e.percepcao ? "(" + txt(e.percepcao) + ")" : ""].filter(tem).join(" ");
      }).join(" · ") });
    }
    it = it.concat(itens(r, [["dificuldade", "Momentos de dificuldade"], ["disponiveis", "Momentos disponíveis"],
      ["espacos", "Oportunidades / espaços para a mudança"], ["observacoes", "Observações"]]));
    return { itens: it, linha: ev.length + (ev.length === 1 ? " momento do dia registrado" : " momentos do dia registrados") + (tem(r.espacos) ? "; espaços para a mudança registrados." : ".") };
  }
  function crencas(r) {
    return { itens: itens(r, [["crencas", "Crença(s) relatada(s)"], ["origem", "Contexto / origem relatada"], ["mais_atrapalha", "Efeito percebido (o que mais atrapalha)"], ["alternativa", "Alternativa registrada"]]),
      linha: tem(r.crencas) ? "crença(s) relatada(s) registrada(s), sem classificação." : "nada preenchido." };
  }
  function gatilhos(r) {
    var quando = [r.data, r.horario].filter(tem).join(" ");
    var it = [];
    if (quando || tem(r.contexto)) it.push({ rotulo: "Situação", valor: [quando, tem(r.contexto) ? txt(r.contexto) : ""].filter(Boolean).join(" · ") });
    it = it.concat(itens(r, [["gatilho", "Gatilho"], ["pensamento", "Pensamento relatado"]]));
    if (tem(r.emocao)) it.push({ rotulo: "Emoção relatada", valor: txt(r.emocao) + (num(r.intensidade) !== null ? " (intensidade " + num(r.intensidade) + ")" : "") });
    it = it.concat(itens(r, [["resposta", "Resposta / comportamento"], ["consequencia_imediata", "Consequência percebida (logo depois)"],
      ["consequencia_posterior", "Consequência percebida (mais tarde)"], ["necessidade", "Necessidade relatada"], ["alternativa", "Recurso / alternativa"],
      ["observacao_nutri", "Observação da nutricionista", true]]));
    var elos = ["gatilho", "pensamento", "emocao", "resposta", "consequencia_imediata", "alternativa"].filter(function (k) { return tem(r[k]); }).length;
    return { itens: it, linha: "cadeia registrada como foi relatada (" + elos + " de 6 elos: gatilho → pensamento/emoção → resposta → consequência → recurso)." };
  }
  function roda(r) {
    var areas = AREAS_RODA.filter(function (a) { return num(r[a[0]]) !== null; }).map(function (a) { return { nome: a[1], valor: num(r[a[0]]) }; });
    var it = [];
    if (areas.length) {
      it.push({ rotulo: "Percepção por área", valor: areas.map(function (a) { return a.nome + " " + a.valor; }).join(" · ") });
      var max = Math.max.apply(null, areas.map(function (a) { return a.valor; })), min = Math.min.apply(null, areas.map(function (a) { return a.valor; }));
      if (max !== min) {
        it.push({ rotulo: "Áreas percebidas como mais cuidadas", valor: areas.filter(function (a) { return a.valor === max; }).map(function (a) { return a.nome; }).join(", ") });
        it.push({ rotulo: "Áreas percebidas como menos cuidadas", valor: areas.filter(function (a) { return a.valor === min; }).map(function (a) { return a.nome; }).join(", ") });
      } else it.push({ rotulo: "Distribuição", valor: "todas as áreas registradas com a mesma nota" });
    }
    it = it.concat(itens(r, [["puxa", "Área que a pessoa disse que puxa para baixo"]]));
    return { itens: it, linha: areas.length + " de 8 áreas com percepção registrada (sem média)." };
  }
  function carta(r) {
    return { itens: [{ rotulo: "Carta ao Futuro Eu", valor: "realizada" + (tem(r.para_quando) ? " (para " + txt(r.para_quando) + ")" : "") }],
      linha: "realizada.", conteudo_privado: true };
  }
  function conexao(r) {
    var it = itens(r, [["contar", "Com quem pode contar"], ["apoia_mudanca", "Quem apoia a mudança"], ["dificulta_mudanca", "O que dificulta a mudança"],
      ["pertence", "Pertencimento"], ["sozinha", "Quando se sente só"], ["fortalecem", "Ambientes que fortalecem"], ["dificultam", "Ambientes que dificultam"],
      ["referencias", "Referências"], ["espacos_seguros", "Espaços seguros"], ["percepcao_apoio", "Percepção de apoio"], ["conexao_consigo", "Conexão consigo"]]);
    var esp = itens(r, [["espiritualidade", "Espiritualidade"], ["comunidade_religiosa", "Comunidade"], ["pratica_espiritual", "Prática"], ["algo_maior", "Algo maior"]]);
    if (esp.length) it.push({ rotulo: "Espiritualidade (registrada porque fez sentido para a pessoa)", valor: esp.map(function (x) { return x.rotulo + ": " + x.valor; }).join(" · ") });
    var v = Array.isArray(r.vinculos) ? r.vinculos : [];
    if (v.length) it.push({ rotulo: "Vínculos registrados", valor: v.length + (v.length === 1 ? " vínculo" : " vínculos"), so_profissional: false });
    it = it.concat(itens(r, [["observacoes", "Observações"]]));
    return { itens: it, linha: v.length + (v.length === 1 ? " vínculo registrado" : " vínculos registrados") + " (mapa contextual, sem classificação)." };
  }

  var POR_FERRAMENTA = { oq3: oq3, pqq: pqq, linha_momentum: momentum, mapa_rotina_v1: rotina, mapa_crencas: crencas,
    gatilhos_respostas_v1: gatilhos, roda_vida: roda, carta_futuro: carta, conexao_pertencimento_v1: conexao };

  /** Fechamento estruturado de uma aplicacao do snapshot ({ferramenta_id, respostas}). */
  function de(t) {
    if (!t) return null;
    var fn = POR_FERRAMENTA[t.ferramenta_id];
    var r = t.respostas || {};
    var f = fn ? fn(r) : { itens: [], linha: "registrada." };
    f.ferramenta_id = t.ferramenta_id;
    f.nome = NOMES[t.ferramenta_id] || t.ferramenta_id;
    return f;
  }

  /* OQ3 + PQQ -> Mapa do Proposito: a unica relacao ferramenta -> ferramenta homologada (opcional).
     Criterio: aplicacoes validas (concluidas/revisadas — as unicas que entram no snapshot) de OQ3 e de
     PQQ, cada uma com conteudo (OQ3: quer, precisa ou consegue; PQQ: objetivo, algum nivel ou a sintese). */
  function temConteudoOq3(t) { var r = (t && t.respostas) || {}; return tem(r.quer) || tem(r.precisa) || tem(r.consegue); }
  function temConteudoPqq(t) { var r = (t && t.respostas) || {}; return tem(r.objetivo) || tem(r.verdadeiro) || ["r1", "r2", "r3", "r4", "r5"].some(function (k) { return tem(r[k]); }); }
  function valida(t) { return !!t && (t.status === undefined || t.status === "concluida" || t.status === "revisada"); }
  function propositoDisponivel(ferramentas) {
    var fs = ferramentas || [];
    var a = fs.filter(function (t) { return t.ferramenta_id === "oq3"; })[0], b = fs.filter(function (t) { return t.ferramenta_id === "pqq"; })[0];
    return !!(valida(a) && valida(b) && temConteudoOq3(a) && temConteudoPqq(b));
  }
  function proposito(ferramentas) {
    if (!propositoDisponivel(ferramentas)) return null;
    var fs = ferramentas || [];
    var a = (fs.filter(function (t) { return t.ferramenta_id === "oq3"; })[0].respostas) || {}, b = (fs.filter(function (t) { return t.ferramenta_id === "pqq"; })[0].respostas) || {};
    return { ferramenta_id: "mapa", nome: NOMES.mapa,
      itens: itens({ quer: a.quer, importa: b.verdadeiro, direcao: b.objetivo, sustenta: a.consegue },
        [["quer", "O que quer"], ["importa", "Por que importa"], ["direcao", "Direção"], ["sustenta", "O que consegue sustentar"]]),
      linha: "organizado a partir do OQ³ e do PQQ (opcional)." };
  }

  /* As relacoes ferramenta -> ferramenta que o sistema gera sozinho: so esta. */
  var RELACOES_AUTOMATICAS = [{ de: ["oq3", "pqq"], para: "mapa", obrigatoria: false }];

  var api = { de: de, proposito: proposito, propositoDisponivel: propositoDisponivel, RELACOES_AUTOMATICAS: RELACOES_AUTOMATICAS,
    ESTADOS_MOMENTUM: ESTADOS_MOMENTUM, NOMES: NOMES, AREAS_RODA: AREAS_RODA };
  raiz.FerramentasFechamento = api;
  
})(R3);

/* ===========================================================================
   RESULTADO-SINTESE — a SINTESE HOLOS deterministica do Resultado HOLOS
   ===========================================================================

   Decisao metodologica aprovada em 10/10 (DECISOES-V1 item 180, Decisao 1).
   A Sintese HOLOS NAO e conclusao clinica: e a organizacao automatica e
   factual do que o metodo ja produziu, derivada SO do snapshot salvo (nada
   recalculado, nada lido ao vivo — um resultado antigo mostra so o que tem).

   Usa: HOLOSCAN oficial (Indice, 5 sistemas, cobertura), a ordem "Por onde
   investigar" (menor nota = maior prioridade DE INVESTIGACAO, nao gravidade),
   a Triade (contextual: nao escolhe ferramenta nem muda ranking), os Proximos
   Passos HOLOS congelados no snapshot (template 2), as ferramentas aplicadas e
   os seus resultados estruturados (ferramentas-fechamento.js), o estado da
   Linha do Momentum escolhido pela nutricionista e o Mapa do Proposito (OQ3 +
   PQQ, opcional).

   Nunca gera: diagnostico, causa, prognostico, gravidade, leve/moderado/grave,
   risco, interpretacao psicologica ou espiritual, conduta, prescricao,
   orientacao nutricional, causalidade corpo <-> emocao, "mapeamento
   concluido". Onde nao ha regra, diz que nao ha regra.

   Funciona no navegador (window.ResultadoSintese) e no Node (testes).
   =========================================================================== */
(function (raiz) {
  "use strict";

  var F = raiz.FerramentasFechamento;

  /* Pendencias que CONTINUAM abertas (as PM-01..PM-05 de 09/10 foram decididas no item 180). */
  var PENDENCIAS = [
    { id: "PM-06", titulo: "Diferença pequena / grande na Tríade", texto: "Não há corte homologado: a Tríade mostra só a menor dimensão (ou o empate)." },
    { id: "PM-07", titulo: "Fórmula integrada Corpo + Mente + Espírito", texto: "Não há fórmula que junte o HOLOSCAN e as ferramentas numa conclusão." },
    { id: "PM-08", titulo: "Mapeamento concluído e suficiência de informação", texto: "Não há critério automático (percentual, selo, número mínimo de ferramentas). A nutricionista decide quando há informação suficiente." },
    { id: "PM-09", titulo: "Outras transições ferramenta → ferramenta", texto: "A única relação automática é OQ³ + PQQ → Mapa do Propósito (opcional)." },
    { id: "PM-10", titulo: "Taxonomia automática de crenças", texto: "O Mapa de Crenças é descritivo; não há categorias homologadas." },
    { id: "PM-11", titulo: "Padrão automático em Gatilhos & Respostas", texto: "A cadeia é registrada como foi relatada; não há padrão nem causa inferidos." },
    { id: "PM-12", titulo: "Intervalo de reaplicação do HOLOSCAN", texto: "Não há intervalo automático; reaplicar é decisão profissional." },
    { id: "PM-13", titulo: "Conduta automática", texto: "O resultado informa a Conduta; não a gera. Objetivo, estratégia, ações e combinados são da nutricionista." },
    { id: "PM-14", titulo: "Conteúdo da Carta ao Futuro Eu para a paciente", texto: "Não há regra de consentimento: na visão da paciente aparece só \"realizada\", nunca o texto." }
  ];
  var SELO = "PENDÊNCIA METODOLÓGICA — AGUARDANDO RODRIGO/DANIEL";
  var LIMITE = "O sistema não possui regra homologada para afirmar gravidade, diagnóstico ou causa, nem para dizer que o mapeamento está concluído. A leitura do conjunto e a Conduta são da nutricionista.";

  var EIXOS = [["corpo", "Corpo", "fisico"], ["mente", "Mente", "mental"], ["espirito", "Espírito", "espiritual"]];

  function num(v) { return typeof v === "number" && !isNaN(v); }
  function temNota(s) { return !!s && s.avaliavel !== false && num(s.nota); }
  function fmt(v) { return num(v) ? (Math.round(v * 10) / 10).toString().replace(".", ",") : "—"; }
  function rotuloFaixa(f) { return raiz.rotuloExibivel ? raiz.rotuloExibivel(f) : String(f).replace(/_/g, " "); }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function lista(nomes) {
    if (!nomes.length) return "";
    if (nomes.length === 1) return nomes[0];
    return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
  }
  function dataBR(iso) { var d = String(iso || "").slice(0, 10).split("-"); return d.length === 3 ? d[2] + "/" + d[1] + "/" + d[0] : String(iso || ""); }

  /* "Por onde investigar": sistemas COM nota, do mais baixo ao mais alto (mesma ordem do HOLOSCAN e do motor:
     HoloAusencia.porLeitura quando carregado; senao nota crescente com sort estavel = empate na ordem do pacote). */
  function ordenar(sistemas) {
    var A = raiz.HoloAusencia;
    var l = (sistemas || []).slice();
    if (A && A.porLeitura) l.sort(A.porLeitura);
    else l.sort(function (a, b) { return (a.nota || 0) - (b.nota || 0); });
    return l.filter(temNota);
  }

  /* moduloDe(ferramenta_id) -> "corpo" | "mente" | "espirito"; nomeFerramenta(id) -> nome */
  function fatos(snap, moduloDe, nomeFerramenta) {
    snap = snap || {};
    var nomeF = nomeFerramenta || function (id) { return (F && F.NOMES[id]) || id; };
    var h = snap.holoscan || {}, sis = h.sistemas || [];
    var tri = h.triada || {}, triOk = h.triada_com_dado || {};
    var ordem = ordenar(sis).map(function (s) { return { sistema: s.sistema, nome: s.nome || s.sistema, nota: s.nota, faixa: s.faixa || null }; });
    var investigar = ordem.slice(0, 2);
    /* empate que decide a 2a area (ou a 1a): a ordem oficial do motor desempata — o fato e dito */
    var empateInvestigar = ordem.length > 2 && ordem[1].nota === ordem[2].nota ? ordem.filter(function (s) { return s.nota === ordem[1].nota; }).map(function (s) { return s.nome; }) : [];
    var triade = EIXOS.map(function (x) { var v = tri[x[2]]; return { eixo: x[0], nome: x[1], valor: (triOk[x[2]] === false || !num(v)) ? null : v }; });
    var comValor = triade.filter(function (t) { return t.valor !== null; });
    var minimo = comValor.length > 1 ? Math.min.apply(null, comValor.map(function (t) { return t.valor; })) : null;
    var noMinimo = minimo === null ? [] : comValor.filter(function (t) { return t.valor === minimo; });
    var ferr = snap.ferramentas || [];
    var porEixo = {};
    EIXOS.forEach(function (x) { porEixo[x[0]] = []; });
    ferr.forEach(function (t) { var m = moduloDe ? moduloDe(t.ferramenta_id) : null; if (porEixo[m]) porEixo[m].push(t); });
    var aplicadas = ferr.map(function (t) { return t.ferramenta_id; });

    /* Proximos Passos: SO o que esta congelado no snapshot (template 2). Template 1: nao existem neste resultado. */
    var pp = snap.proximos_passos || null;
    var ppEstado = !pp ? "fora_do_snapshot" : (pp.registrado ? "registrado" : "nao_registrado");
    /* Template 3 (12/10): o Resultado congela tambem os PENDENTES — a escolha do catalogo sem as ferramentas ja concluidas no
       atendimento. Template 2 continua mostrando o registro original (congelado como foi emitido). */
    var pend = pp && pp.registrado && pp.pendentes && Array.isArray(pp.pendentes.selection) ? pp.pendentes : null;
    var selecao = pend ? pend.selection : (pp && pp.registrado && Array.isArray(pp.selection) ? pp.selection : []);
    var todasRealizadas = !!(pend && pend.todas_realizadas);
    var sugeridas = selecao.map(function (s) { return { tool_id: s.tool_id, nome: nomeF(s.tool_id), papel: s.papel, rank: s.rank, sistema: s.system_id, motivo: s.professional_reason, acao: s.next_action, rule_id: s.rule_id }; });
    var principal = sugeridas.filter(function (s) { return s.papel === "principal"; })[0] || null;
    var disponiveis = sugeridas.filter(function (s) { return aplicadas.indexOf(s.tool_id) < 0; });
    var fechamentos = F ? ferr.map(function (t) { var x = F.de(t); x.nome = nomeF(t.ferramenta_id); x.mostrar_paciente = !!t.mostrar_paciente; return x; }) : [];
    var momentum = fechamentos.filter(function (x) { return x.ferramenta_id === "linha_momentum"; })[0];
    var obs = snap.observacoes || {};

    return {
      template: snap.template_version || 1,
      quando: h.quando || null,
      indice: num(h.indice) ? h.indice : null,
      indice_maximo: h.indice_maximo || 100,
      sistemas_total: sis.length,
      sistemas_com_nota: ordem.length,
      sem_nota: sis.filter(function (s) { return !temNota(s); }).map(function (s) { return s.nome || s.sistema; }),
      ordem: ordem,
      investigar: investigar,
      empate_investigar: empateInvestigar,
      triade: triade,
      triade_com_valor: comValor.length,
      triade_menor: noMinimo.length === 1 ? noMinimo[0].nome : null,
      triade_empate: noMinimo.length > 1 ? (noMinimo.length === comValor.length && comValor.length === 3 ? ["todas"] : noMinimo.map(function (t) { return t.nome; })) : [],
      ferramentas: porEixo,
      ferramentas_total: ferr.length,
      aplicadas: aplicadas,
      proximos_passos: ppEstado,
      catalogo: pp && pp.catalogo ? pp.catalogo : null,
      sugeridas: sugeridas,
      pp_pendentes: !!pend,
      todas_realizadas: todasRealizadas,
      principal: principal,
      disponiveis: disponiveis,
      fechamentos: fechamentos,
      momentum: momentum ? momentum.estado || null : null,
      proposito_disponivel: F ? F.propositoDisponivel(ferr) : false,
      compartilhar_pp: !!(snap.visibilidade && snap.visibilidade.proximos_passos === true),
      leituras_nutri: ferr.filter(function (t) { return !!(t.leitura || t.prioridade || t.proximo_passo); }).length,
      observacoes_nutri: ["leitura_profissional", "pontos_acompanhar", "questoes_aprofundar"].filter(function (k) { return obs[k] && String(obs[k]).trim(); }).length
    };
  }

  /* As frases da Sintese HOLOS (profissional). Cada uma: { chave, natureza: fato|regra|nutri, texto }. Texto puro. */
  function frases(f) {
    var out = [];
    var add = function (chave, natureza, texto) { out.push({ chave: chave, natureza: natureza, texto: texto }); };
    var quando = f.quando ? "Na aplicação de " + dataBR(f.quando) : "Na aplicação selecionada";
    if (f.investigar.length >= 2) {
      add("investigar", "regra", quando + ", " + f.investigar[0].nome + " e " + f.investigar[1].nome + " aparecem como as primeiras áreas para aprofundar (1ª área para investigar: " +
        f.investigar[0].nome + ", nota " + fmt(f.investigar[0].nota) + "; 2ª área para investigar: " + f.investigar[1].nome + ", nota " + fmt(f.investigar[1].nota) + ").");
    } else if (f.investigar.length === 1) {
      add("investigar", "regra", quando + ", só " + f.investigar[0].nome + " teve nota: é a 1ª área para investigar (nota " + fmt(f.investigar[0].nota) + ").");
    } else {
      add("investigar", "regra", quando + ", nenhum sistema teve nota: o HOLOSCAN não definiu área para investigar.");
    }
    if (f.empate_investigar.length) add("empate", "fato", "Empate na nota " + fmt(f.investigar[1].nota) + " entre " + lista(f.empate_investigar) + ": a ordem segue a ordem oficial do motor.");
    if (f.ordem.length > 2) add("ordem", "fato", "Ordem de investigação: " + f.ordem.map(function (s, i) { return (i + 1) + "ª " + s.nome + " (" + fmt(s.nota) + ")"; }).join(" · ") + ".");
    if (f.sem_nota.length) add("sem_nota", "fato", "Sem nota (respostas abaixo do mínimo): " + lista(f.sem_nota) + ".");
    if (f.indice === null) add("cobertura", "fato", "O Índice HOLOS não foi calculado nesta aplicação (cobertura insuficiente).");
    var triV = f.triade.map(function (t) { return t.nome + " " + fmt(t.valor); }).join(" · ");
    if (f.triade_com_valor < 2) add("triade", "fato", "Tríade sem dado suficiente para comparar as dimensões (" + triV + ").");
    else if (f.triade_menor) add("triade", "fato", "Na Tríade, " + f.triade_menor + " apresentou a menor nota (" + triV + ").");
    else if (f.triade_empate[0] === "todas") add("triade", "fato", "Na Tríade, as três dimensões têm a mesma nota: sem predominância (" + triV + ").");
    else add("triade", "fato", "Na Tríade, " + lista(f.triade_empate) + " empataram na menor nota: não existe dimensão única menor (" + triV + ").");
    if (f.proximos_passos === "registrado" && f.sugeridas.length) {
      var cat = f.catalogo ? " (" + f.catalogo.code + " v" + f.catalogo.version + ")" : "";
      add("catalogo", "regra", "Pelo catálogo vigente" + cat + ", as ferramentas indicadas para aprofundamento" + (f.pp_pendentes ? " (sem as já realizadas neste atendimento)" : "") + " são " +
        lista(f.sugeridas.map(function (s) { return s.nome + (s.papel === "principal" ? " (principal)" : ""); })) + ".");
    } else if (f.proximos_passos === "registrado" && f.todas_realizadas) {
      add("catalogo", "fato", "As ferramentas indicadas pelo catálogo para as áreas prioritárias desta aplicação já foram realizadas neste atendimento.");
    } else if (f.proximos_passos === "registrado") {
      add("catalogo", "regra", "Os Próximos Passos HOLOS registrados não trazem ferramenta para esta aplicação (sem sistema com nota).");
    } else if (f.proximos_passos === "nao_registrado") {
      add("catalogo", "fato", "Os Próximos Passos HOLOS não estavam registrados para esta aplicação quando o resultado foi salvo; o sistema não os calcula depois.");
    } else {
      add("catalogo", "fato", "Este resultado foi salvo antes de os Próximos Passos HOLOS fazerem parte do Resultado; eles não são buscados ao vivo.");
    }
    add("aplicadas", "fato", f.ferramentas_total ? "Até o momento, neste resultado, foram aplicadas: " + lista(f.fechamentos.map(function (x) { return x.nome; })) + "." : "Nenhuma ferramenta foi incluída neste resultado.");
    if (f.fechamentos.length) {
      add("estruturados", "fato", "Resultados estruturados registrados: " + f.fechamentos.map(function (x) {
        return x.ferramenta_id === "carta_futuro" ? "Carta ao Futuro Eu realizada" : x.nome + " — " + x.linha.replace(/\.$/, "");
      }).join("; ") + ".");
    }
    if (f.momentum) add("momentum", "nutri", "Linha do Momentum: estado escolhido pela nutricionista — " + f.momentum + ". Ele informa a Conduta; não a determina.");
    if (f.principal) add("proximo", "regra", "Próximo passo metodológico sustentado pelo catálogo: " + f.principal.nome + ". Nenhuma ferramenta é obrigatória: a ordem é a recomendação do motor, não uma sequência de atendimento.");
    if (f.proximos_passos === "registrado" && f.sugeridas.length) {
      add("disponivel", "regra", f.disponiveis.length ? "Ainda disponíveis para aprofundar (sugeridas e não aplicadas neste resultado): " + lista(f.disponiveis.map(function (s) { return s.nome; })) + "."
        : "As ferramentas sugeridas pelo catálogo já estão neste resultado.");
    }
    if (f.proposito_disponivel) add("proposito", "regra", "Com OQ³ e PQQ aplicados, o Mapa do Propósito está disponível como aprofundamento opcional.");
    return out;
  }

  var MSG_TODAS_PACIENTE = "As ferramentas sugeridas para esta etapa já foram feitas. Os próximos passos são combinados com a sua nutricionista em consulta.";

  /* As frases para a PACIENTE (linguagem simples; so o que a decisao permite). */
  function frasesPaciente(f) {
    var out = [];
    if (f.investigar.length >= 2) out.push("Nesta avaliação, as áreas que aparecem primeiro para aprofundar com a sua nutricionista são " + f.investigar[0].nome + " e " + f.investigar[1].nome + ".");
    else if (f.investigar.length === 1) out.push("Nesta avaliação, a área que aparece para aprofundar com a sua nutricionista é " + f.investigar[0].nome + ".");
    if (f.triade_com_valor >= 2) {
      if (f.triade_menor) out.push("Entre Corpo, Mente e Espírito, " + f.triade_menor + " foi a dimensão com a menor nota.");
      else if (f.triade_empate[0] === "todas") out.push("Corpo, Mente e Espírito ficaram com a mesma nota.");
      else out.push(lista(f.triade_empate) + " ficaram com a mesma nota, a menor entre as três dimensões.");
    }
    var autorizadas = f.fechamentos.filter(function (x) { return x.mostrar_paciente; }).map(function (x) { return x.nome; });
    if (autorizadas.length) out.push("Ferramentas que você fez e que a sua nutricionista compartilhou com você: " + lista(autorizadas) + ".");
    if (f.compartilhar_pp && f.sugeridas.length) out.push("Próximos passos de aprofundamento: " + lista(f.sugeridas.map(function (s) { return s.nome; })) + ". A escolha e o momento são combinados com a sua nutricionista.");
    else if (f.compartilhar_pp && f.todas_realizadas) out.push(MSG_TODAS_PACIENTE);
    return out;
  }

  function rotulo(n) {
    return n === "regra" ? '<span class="rh-rotulo rh-rotulo-regra">Regra oficial</span>' : n === "nutri" ? '<span class="rh-rotulo rh-rotulo-nutri">Decisão da nutricionista</span>' : '<span class="rh-rotulo rh-rotulo-fato">Fato</span>';
  }

  function htmlFechamento(x, paciente) {
    if (!x) return "";
    var itens = (x.itens || []).filter(function (i) { return !paciente || !i.so_profissional; });
    if (paciente && x.conteudo_privado) itens = [{ rotulo: x.nome, valor: "realizada" }];
    if (!itens.length) return '<p class="rh-vazio">Nada preenchido nesta aplicação.</p>';
    return '<dl class="rh-fech">' + itens.map(function (i) { return "<div><dt>" + esc(i.rotulo) + "</dt><dd>" + esc(i.valor).replace(/\n/g, "<br>") + "</dd></div>"; }).join("") + "</dl>";
  }

  /* HTML da Sintese HOLOS. visao "profissional" ou "paciente". */
  function html(snap, visao, opts) {
    opts = opts || {};
    var f = fatos(snap, opts.moduloDe, opts.nomeFerramenta);
    if (visao === "paciente") {
      var fp = frasesPaciente(f);
      return '<section class="rh-secao rh-resumo rh-sintese" aria-labelledby="rh-t-resumo"><h3 id="rh-t-resumo">Resumo da sua avaliação</h3>' +
        (fp.length ? '<ul class="rh-resumo-lista">' + fp.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "") +
        '<p class="rh-intro">Este resumo só organiza o que foi registrado. Ele não é diagnóstico; o que fazer com ele é combinado com a sua nutricionista.</p></section>';
    }
    var fr = frases(f);
    var h = '<section class="rh-secao rh-resumo rh-sintese" aria-labelledby="rh-t-resumo"><h3 id="rh-t-resumo">Síntese HOLOS</h3>' +
      '<p class="rh-nota-tec">Organização automática e factual do que o método já produziu, a partir só dos dados salvos neste resultado. Não é conclusão clínica.</p>' +
      '<ul class="rh-resumo-lista rh-sintese-lista">' + fr.map(function (x) { return '<li data-sintese="' + esc(x.chave) + '">' + rotulo(x.natureza) + " " + esc(x.texto) + "</li>"; }).join("") + "</ul>" +
      '<p class="rh-sintese-limite">' + esc(LIMITE) + "</p>";

    h += '<div class="rh-resumo-grade">';
    h += '<div class="rh-resumo-bloco"><h4>' + rotulo("regra") + " Por onde investigar</h4>" +
      (f.investigar.length ? '<ol class="rh-resumo-lista rh-investigar">' + f.investigar.map(function (s, i) {
        return "<li><b>" + (i + 1) + "ª área para investigar: " + esc(s.nome) + "</b> — nota " + fmt(s.nota) + (s.faixa ? " · faixa " + esc(rotuloFaixa(s.faixa)) : "") + "</li>";
      }).join("") + '</ol><p class="rh-nota-tec">Menor nota = maior prioridade de investigação dentro do HOLOSCAN. Não significa gravidade, risco ou prioridade clínica.</p>'
        : '<p class="rh-vazio">Nenhum sistema com nota.</p>') + "</div>";
    h += '<div class="rh-resumo-bloco rh-pp" data-rh-pp><h4>' + rotulo("regra") + " Próximos Passos HOLOS</h4>" + htmlProximosPassos(f) + "</div>";
    h += '<div class="rh-resumo-bloco"><h4>' + rotulo("fato") + " Resultados estruturados</h4>" +
      (f.fechamentos.length ? '<ul class="rh-resumo-lista">' + f.fechamentos.map(function (x) {
        return "<li><b>" + esc(x.nome) + ":</b> " + esc(x.ferramenta_id === "carta_futuro" ? "realizada." : x.linha) + "</li>";
      }).join("") + (f.proposito_disponivel ? "<li><b>Mapa do Propósito:</b> disponível (OQ³ + PQQ), opcional.</li>" : "") + "</ul>"
        : '<p class="rh-vazio">Nenhuma ferramenta neste resultado.</p>') + "</div>";
    h += '<div class="rh-resumo-bloco"><h4>' + rotulo("nutri") + " Registros da nutricionista</h4><ul class=\"rh-resumo-lista\">" +
      "<li>Leituras de ferramenta registradas: <b>" + f.leituras_nutri + "</b> de " + f.ferramentas_total + ".</li>" +
      "<li>Observações deste resultado preenchidas: <b>" + f.observacoes_nutri + "</b> de 3 (nenhuma é obrigatória).</li>" +
      "<li>Próximos Passos na visão da paciente: <b>" + (f.compartilhar_pp ? "compartilhados" : "não compartilhados") + "</b>.</li></ul></div>";
    h += "</div>";
    h += '<details class="rh-pendencias"><summary>Pendências metodológicas (' + PENDENCIAS.length + ") — o que o sistema não faz sozinho</summary>" +
      '<p class="rh-selo-pend">' + esc(SELO) + "</p><ul>" +
      PENDENCIAS.map(function (x) { return "<li><b>" + esc(x.id) + " · " + esc(x.titulo) + ".</b> " + esc(x.texto) + "</li>"; }).join("") + "</ul></details></section>";
    return h;
  }

  /* Proximos Passos HOLOS do SNAPSHOT (visao profissional): principal + complementares, com a justificativa do catalogo. */
  function htmlProximosPassos(f) {
    if (f.proximos_passos === "fora_do_snapshot") return '<p class="rh-nota-tec">Este resultado foi salvo antes de os Próximos Passos HOLOS fazerem parte do Resultado. Eles não são buscados ao vivo.</p>';
    if (f.proximos_passos === "nao_registrado") return '<p class="rh-nota-tec">Não estavam registrados para esta aplicação quando o resultado foi salvo.</p>';
    if (!f.sugeridas.length && f.todas_realizadas) return '<p class="rh-nota-tec">As ferramentas indicadas para as áreas prioritárias desta aplicação já foram realizadas neste atendimento.</p>';
    if (!f.sugeridas.length) return '<p class="rh-nota-tec">Nenhuma recomendação para esta aplicação.</p>';
    return '<ul class="rh-resumo-lista">' + f.sugeridas.map(function (s) {
      var feita = f.aplicadas.indexOf(s.tool_id) >= 0;
      return "<li><b>" + esc(s.nome) + "</b> (" + (s.papel === "principal" ? "principal" : "complementar") + (feita ? " · aplicada neste resultado" : "") + ")" +
        (s.motivo ? ' <span class="rh-pp-motivo">' + esc(s.motivo) + "</span>" : "") + "</li>";
    }).join("") + '</ul><p class="rh-nota-tec">Catálogo ' + esc(f.catalogo ? f.catalogo.code + " v" + f.catalogo.version : "") +
      ", congelado neste resultado. Rank = ordem de recomendação do motor; nenhuma ferramenta é obrigatória." +
      (f.compartilhar_pp ? " Compartilhados com a paciente." : " Só na visão profissional.") + "</p>";
  }

  /* Bloco dos Proximos Passos na visao da PACIENTE (so quando compartilhados). */
  function htmlProximosPassosPaciente(snap, nomeFerramenta) {
    var f = fatos(snap, null, nomeFerramenta);
    if (f.compartilhar_pp && !f.sugeridas.length && f.todas_realizadas) {
      return '<section class="rh-secao rh-pp-paciente" aria-labelledby="rh-t-pp-pac"><h3 id="rh-t-pp-pac">Próximos passos de aprofundamento</h3>' +
        '<p class="rh-intro">' + esc(MSG_TODAS_PACIENTE) + "</p></section>";
    }
    if (!f.compartilhar_pp || !f.sugeridas.length) return "";
    return '<section class="rh-secao rh-pp-paciente" aria-labelledby="rh-t-pp-pac"><h3 id="rh-t-pp-pac">Próximos passos de aprofundamento</h3>' +
      '<p class="rh-intro">Ferramentas do método que podem ajudar a aprofundar a conversa com a sua nutricionista. Nenhuma é obrigatória; a escolha e o momento são combinados em consulta.</p>' +
      '<ul class="rh-resumo-lista">' + f.sugeridas.map(function (s) { return "<li>" + esc(s.nome) + "</li>"; }).join("") + "</ul></section>";
  }

  var api = { fatos: fatos, frases: frases, frasesPaciente: frasesPaciente, html: html, htmlFechamento: htmlFechamento,
    htmlProximosPassosPaciente: htmlProximosPassosPaciente, PENDENCIAS: PENDENCIAS, SELO: SELO, LIMITE: LIMITE, ordenar: ordenar };
  raiz.ResultadoSintese = api;
  
})(R3);

  /* ---- resultado-holos.js (desenho do documento), copia literal ---- */
  (function () {
  var escapar = window.escapar;
  var EIXOS = [["corpo", "Corpo", "fisico"], ["mente", "Mente", "mental"], ["espirito", "Espírito", "espiritual"]];
  var NOMES_EXTRA = { oq3: { titulo: "OQ³", modulo: "corpo" }, pqq: { titulo: "PQQ — Escada dos Porquês", modulo: "mente" } };
  /* ordem e lista vem do catalogo (ferramentas.js): OQ3/PQQ + as ferramentas ativas, por eixo */
  function ordemFerr() {
    var ativas = window.FERRAMENTAS_ATIVAS || [], cat = window.CATALOGO_FERRAMENTAS || [];
    var mod = function (id) { var f = cat.filter(function (x) { return x.id === id; })[0]; return f ? f.modulo : (NOMES_EXTRA[id] || {}).modulo; };
    var base = ["oq3", "pqq"].concat(ativas);
    return ["corpo", "mente", "espirito"].reduce(function (acc, m) { return acc.concat(base.filter(function (id) { return mod(id) === m; })); }, []);
  }
  var ROTULO_STATUS = { rascunho: "Rascunho", salvo: "Salvo", revisado: "Revisado" };
  var MSG_HINT = {
    holoscan_obrigatorio: "Escolha a aplicação HOLOSCAN que compõe o resultado.",
    holoscan_nao_oficial: "Essa aplicação HOLOSCAN é histórica, sem o pacote metodológico oficial: ela não entra no Resultado HOLOS.",
    atendimento_obrigatorio: "Escolha o atendimento ao qual o Resultado HOLOS fica ligado.",
    referencia_cruzada: "Uma das fontes não pertence a este paciente (ou a esta conta). Nada foi salvo.",
    fonte_nao_consolidada: "Ferramenta em rascunho não entra no Resultado HOLOS: conclua a aplicação antes.",
    fonte_repetida: "Escolha só uma aplicação de cada ferramenta.",
    revisao_imutavel: "Resultado salvo não muda. Para corrigir, use “Nova versão a partir desta”.",
    conflito: "Esta versão já tem uma versão seguinte (ou o rascunho mudou em outra sessão). Recarregue a aba.",
    paciente_arquivado: window.MSG_ARQUIVADO || "Paciente arquivado: reative antes de registrar novas informações.",
    conta_inativa: "Sua conta ainda aguarda liberação.",
    payload_invalido: "Seleção inválida. Recarregue a aba e tente de novo."
  };

  var cache = { pid: null, linhas: [], erro: null, carregado: false };
  var modo = "lista";       // lista | editar | ver
  var form = null;          // rascunho em edicao
  var vendo = null;         // { id, visao: "profissional" | "paciente" }
  var previa = null;        // snapshot devolvido pelo servidor (nao gravado)
  var ocupado = false;

  /* ---------- utilitarios -------------------------------------------------- */
  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function pacienteId() { return window.pacienteAtivoId ? window.pacienteAtivoId() : null; }
  function alvo() { return document.getElementById("aba-resultado-holos"); }
  function toast(m) { if (window.avisar) window.avisar(m); }
  function uuid() { return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : null; }
  function dataBR(iso) { var d = String(iso || "").slice(0, 10); return window.dataBR ? window.dataBR(d) : d; }
  function hora(iso) {
    if (!iso || String(iso).length <= 10) return "";
    var d = new Date(iso); if (isNaN(d)) return "";
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function dataHora(iso) { var h = hora(iso); return dataBR(iso) + (h ? " · " + h : ""); }
  function curto(id) { return String(id || "").slice(0, 8); }
  function e(x) { return escapar(x === null || x === undefined ? "" : String(x)); }
  function num(v, casas) {
    if (v === null || v === undefined || v === "" || isNaN(Number(v))) return "—";
    return Number(v).toFixed(casas === undefined ? 1 : casas).replace(".", ",");
  }
  function faixaTxt(f) { return f ? (window.rotuloExibivel ? window.rotuloExibivel(f) : f) : ""; }
  function arquivado() { try { return !!(window.pacienteArquivado && window.pacienteArquivado()); } catch (x) { return false; } }
  function mensagemErro(err) {
    if (err && err.hint && MSG_HINT[err.hint]) return MSG_HINT[err.hint];
    return window.mensagemHumana ? window.mensagemHumana(err) : (err && err.message) || String(err);
  }
  function defFerr(fid) {
    var f = (window.CATALOGO_FERRAMENTAS || []).filter(function (x) { return x.id === fid; })[0];
    if (f) return f;
    return NOMES_EXTRA[fid] ? { id: fid, titulo: NOMES_EXTRA[fid].titulo, modulo: NOMES_EXTRA[fid].modulo } : { id: fid, titulo: fid, modulo: "corpo" };
  }
  function moduloDe(fid) { return defFerr(fid).modulo || "corpo"; }
  function rotuloAtendimento(eid) {
    var A = window.AtendimentoAtual, x = A && eid ? A.porId(eid) : null;
    return x ? A.rotuloQuando(x) : (eid ? "atendimento " + curto(eid) : "sem atendimento");
  }

  /* ---------- dados -------------------------------------------------------- */
  function carregar(pid) {
    pid = pid || pacienteId();
    if (!pid || !temSupa()) { cache = { pid: pid, linhas: [], erro: null, carregado: true }; return Promise.resolve(cache.linhas); }
    return Promise.resolve(window.supabaseClient.from("holos_results").select("*").eq("patient_id", pid).order("created_at", { ascending: false }))
      .then(function (r) {
        if (r && r.error) { cache = { pid: pid, linhas: [], erro: r.error, carregado: true }; return []; }
        cache = { pid: pid, linhas: (r && r.data) || [], erro: null, carregado: true };
        return cache.linhas;
      }, function (err) { cache = { pid: pid, linhas: [], erro: err, carregado: true }; return []; });
  }
  function doPaciente(pid) { return cache.pid === pid ? cache.linhas.slice() : []; }
  function porId(id) { return cache.linhas.filter(function (r) { return r.id === id; })[0] || null; }
  function rpc(nome, args) {
    return Promise.resolve(window.supabaseClient.rpc(nome, args)).then(function (r) {
      if (r && r.error) throw r.error;
      return r ? r.data : null;
    });
  }

  /* fontes elegiveis (o servidor confere de novo; aqui so se oferece o que pode entrar) */
  function aplicacoesHoloscan(pid) {
    var h = window.historicoPontuacao ? (window.historicoPontuacao(pid) || []) : [];
    var M = window.Metodologia;
    return h.filter(function (x) { return x._supa_id; }).map(function (x) {
      var oficial = M && M.naturezaAplicacao ? M.naturezaAplicacao(x) === "oficial_v1" : !!x.methodology_package_id;
      return { id: x._supa_id, quando: x.quando, criado: x._supa_criado_em || x.calculado_em || null, oficial: oficial && !!x.methodology_package_id,
        pacote: x.methodology_package_id ? (x.methodology_package_code || "HOLOS-V1") + (x.methodology_package_version ? " v" + x.methodology_package_version : "") : null,
        encounter_id: x._supa_encounter_id || null, indice: x.indice };
    }).sort(function (a, b) { return String(b.criado || b.quando).localeCompare(String(a.criado || a.quando)); });
  }
  function aplicacoesFerramentas(pid) {
    var A = window.Aplicacoes;
    var lista = A && A.doPaciente ? A.doPaciente(pid) : [];
    return lista.filter(function (a) { return a.id && ordemFerr().indexOf(a.ferramenta_id) >= 0 && (a.status === "concluida" || a.status === "revisada"); })
      .sort(function (a, b) { var o = ordemFerr(); return o.indexOf(a.ferramenta_id) - o.indexOf(b.ferramenta_id) || String(b.concluida_em || "").localeCompare(String(a.concluida_em || "")); });
  }

  /* ---------- formulario (rascunho) ---------------------------------------- */
  function novoForm(pid, base) {
    var at = window.AtendimentoAtual && window.AtendimentoAtual.idPara ? window.AtendimentoAtual.idPara(pid) : null;
    /* 12/10 (bug 10d): sem atendimento ativo na memoria (recarregou a pagina, trocou de paciente), o formulario vinha
       vazio. Agora: o atendimento ativo; senao, o da aplicacao HOLOSCAN mais recente; senao, o atendimento mais recente.
       O HOLOSCAN continua sem pre-marcacao (escolha explicita, decisao do Resultado HOLOS). A nutricionista pode trocar. */
    var hs0 = aplicacoesHoloscan(pid).filter(function (h) { return h.oficial; });
    if (!at && hs0.length && hs0[0].encounter_id) at = hs0[0].encounter_id;
    if (!at && window.AtendimentoAtual && window.AtendimentoAtual.doPaciente) {
      var ult = window.AtendimentoAtual.doPaciente(pid).slice().sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); })[0];
      if (ult) at = ult.id;
    }
    var f = { pid: pid, id: null, supersedes_id: null, encounter_id: at || "", holoscan_application_id: "", tools: [], mostrar: {}, compartilhar_pp: false,
      leitura_profissional: "", pontos_acompanhar: "", questoes_aprofundar: "", expected_updated_at: null };
    if (base) {
      var s = base.selected_sources || {};
      f.id = base.status === "rascunho" ? base.id : null;
      f.expected_updated_at = base.status === "rascunho" ? base.updated_at : null;
      f.supersedes_id = base.status === "rascunho" ? (base.supersedes_id || null) : base.id;
      f.encounter_id = base.status === "rascunho" ? base.encounter_id : (at || base.encounter_id);
      f.holoscan_application_id = s.holoscan_application_id || "";
      f.tools = (s.tool_application_ids || []).slice();
      var vis = (s.visao_paciente && s.visao_paciente.ferramentas) || {};
      Object.keys(vis).forEach(function (k) { f.mostrar[k] = !!(vis[k] && vis[k].mostrar); });
      f.compartilhar_pp = !!(s.visao_paciente && s.visao_paciente.proximos_passos === true);
      f.leitura_profissional = base.leitura_profissional || ""; f.pontos_acompanhar = base.pontos_acompanhar || ""; f.questoes_aprofundar = base.questoes_aprofundar || "";
    }
    return f;
  }
  function payloadDe(f) {
    var vis = {};
    f.tools.forEach(function (id) { vis[id] = { mostrar: !!f.mostrar[id], ocultar: [] }; });
    return { id: f.id || null, supersedes_id: f.supersedes_id || null, patient_id: f.pid, encounter_id: f.encounter_id || null,
      holoscan_application_id: f.holoscan_application_id || null, tool_application_ids: f.tools.slice(), visao_paciente: { ferramentas: vis, proximos_passos: !!f.compartilhar_pp },
      leitura_profissional: f.leitura_profissional, pontos_acompanhar: f.pontos_acompanhar, questoes_aprofundar: f.questoes_aprofundar,
      expected_updated_at: f.expected_updated_at || null };
  }
  function lerForm() {
    var a = alvo(); if (!a || !form) return;
    var enc = a.querySelector("#rh-atendimento"); if (enc) form.encounter_id = enc.value;
    var h = a.querySelector('input[name="rh-holoscan"]:checked'); form.holoscan_application_id = h ? h.value : "";
    form.tools = [].slice.call(a.querySelectorAll("[data-rh-ferr]:checked")).map(function (c) { return c.value; });
    [].slice.call(a.querySelectorAll("[data-rh-mostrar]")).forEach(function (c) { form.mostrar[c.dataset.rhMostrar] = c.checked; });
    var cpp = a.querySelector("#rh-compartilhar-pp"); if (cpp) form.compartilhar_pp = cpp.checked;
    ["leitura_profissional", "pontos_acompanhar", "questoes_aprofundar"].forEach(function (k) { var t = a.querySelector("#rh-" + k); if (t) form[k] = t.value; });
  }

  /* ---------- desenho: radar ----------------------------------------------- */
  function radarSvg(sistemas, tam) {
    tam = tam || 300;
    var n = sistemas.length, c = tam / 2, R = tam / 2 - 46;
    if (!n) return "";
    var ang = function (i) { return -Math.PI / 2 + (2 * Math.PI * i) / n; };
    var pt = function (i, v) { var r = R * v / 10; return [c + Math.cos(ang(i)) * r, c + Math.sin(ang(i)) * r]; };
    var grade = [2, 4, 6, 8, 10].map(function (v) {
      return '<polygon class="rh-radar-grade" points="' + sistemas.map(function (s, i) { return pt(i, v).map(function (x) { return x.toFixed(1); }).join(","); }).join(" ") + '"/>';
    }).join("");
    var eixos = sistemas.map(function (s, i) { var p = pt(i, 10); return '<line class="rh-radar-eixo" x1="' + c + '" y1="' + c + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>'; }).join("");
    var comNota = sistemas.every(function (s) { return s.avaliavel && s.nota !== null && s.nota !== undefined; });
    var area = comNota ? '<polygon class="rh-radar-area" points="' + sistemas.map(function (s, i) { return pt(i, Number(s.nota)).map(function (x) { return x.toFixed(1); }).join(","); }).join(" ") + '"/>' : "";
    var pontos = sistemas.map(function (s, i) {
      if (!s.avaliavel || s.nota === null || s.nota === undefined) return "";
      var p = pt(i, Number(s.nota)); return '<circle class="rh-radar-ponto" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5"/>';
    }).join("");
    var rot = sistemas.map(function (s, i) {
      var p = pt(i, 12.6), anc = Math.abs(p[0] - c) < 8 ? "middle" : (p[0] > c ? "start" : "end");
      return '<text class="rh-radar-rotulo" x="' + p[0].toFixed(1) + '" y="' + p[1].toFixed(1) + '" text-anchor="' + anc + '">' + e(abreviar(s.nome || s.sistema)) +
        ' <tspan class="rh-radar-nota">' + (s.avaliavel ? num(s.nota) : "—") + "</tspan></text>";
    }).join("");
    var desc = sistemas.map(function (s) { return (s.nome || s.sistema) + " " + (s.avaliavel ? num(s.nota) : "sem nota"); }).join("; ");
    /* margem lateral no viewBox: os nomes dos sistemas nas pontas nao sao cortados */
    return '<svg class="rh-radar" viewBox="-95 -6 ' + (tam + 190) + " " + (tam + 12) + '" role="img" aria-label="Radar dos cinco sistemas: ' + e(desc) + '">' + grade + eixos + area + pontos + rot + "</svg>";
  }
  function abreviar(nome) {
    return String(nome).replace(/^Sistema\s+/i, "").replace(/Mental[- ]Emocional[- ]Espiritual/i, "Mental-Emocional").replace(/Detox (e )?Linf[aá]tico/i, "Detox").replace(/[ÁA]cido[- ]Inflamat[oó]rio/i, "Ácido-Inflam.");
  }

  /* ---------- desenho: ferramentas ----------------------------------------- */
  function tem(v) { return v !== null && v !== undefined && !(typeof v === "string" && !v.trim()) && !(Array.isArray(v) && !v.length); }
  function valorTxt(v) { return Array.isArray(v) ? v.join(", ") : String(v); }
  function camposDe(f) {
    var out = [];
    (f.grupos || []).forEach(function (g) {
      var cs = g.origem === "momentum_dimensoes" && window.CorpoBancos && window.CorpoBancos.MOMENTUM
        ? window.CorpoBancos.MOMENTUM.dimensoes.map(function (d) { return { id: d.id, rotulo: d.rotulo, tipo: "nota" }; }) : (g.campos || []);
      out.push({ titulo: g.titulo, campos: cs });
    });
    if ((f.campos || []).length) out.push({ titulo: null, campos: f.campos });
    return out;
  }
  function barra(rot, v) {
    var n = Number(v), ok = !isNaN(n);
    return '<div class="rh-barra"><span class="rh-barra-rot">' + e(rot) + '</span><span class="rh-barra-trilho" aria-hidden="true"><span class="rh-barra-cheio" style="width:' +
      (ok ? Math.max(0, Math.min(100, n * 10)) : 0) + '%"></span></span><b class="rh-barra-val">' + (ok ? e(v) : "—") + "</b></div>";
  }
  function linhaCampo(rot, v) { return '<div class="rh-campo"><span>' + e(rot) + "</span><p>" + e(valorTxt(v)).replace(/\n/g, "<br>") + "</p></div>"; }
  function corpoGenerico(f, r, paciente) {
    var html = "";
    camposDe(f).forEach(function (g) {
      var barras = "", textos = "";
      g.campos.forEach(function (c) {
        var v = r[c.id];
        if (!tem(v)) return;
        if (c.tipo === "nota") barras += barra(c.rotulo, v);
        else textos += linhaCampo(c.rotulo, v);
      });
      if (barras || textos) html += (g.titulo && !paciente ? '<h6 class="rh-grupo-tit">' + e(g.titulo) + "</h6>" : "") + (barras ? '<div class="rh-barras">' + barras + "</div>" : "") + textos;
    });
    return html;
  }
  function corpoFerramenta(t, paciente) {
    var r = t.respostas || {}, f = defFerr(t.ferramenta_id), html = "";
    if (t.ferramenta_id === "oq3") {
      html = [["quer", "O que quer"], ["precisa", "O que precisa"], ["consegue", "O que consegue fazer agora"], ["alavancas", "Alavancas"]]
        .filter(function (k) { return tem(r[k[0]]); }).map(function (k) { return linhaCampo(k[1], r[k[0]]); }).join("");
    } else if (t.ferramenta_id === "pqq") {
      var degraus = ["r1", "r2", "r3", "r4", "r5"].filter(function (k) { return tem(r[k]); });
      html = (tem(r.objetivo) ? linhaCampo("Objetivo declarado", r.objetivo) : "") +
        (degraus.length ? '<ol class="rh-escada">' + degraus.map(function (k) { return "<li>" + e(r[k]) + "</li>"; }).join("") + "</ol>" : "") +
        (tem(r.verdadeiro) ? linhaCampo("O verdadeiro motivo, nas palavras registradas", r.verdadeiro) : "");
    } else {
      if (f.visualizacao && window.RegistroVisual) html += '<div class="rh-visual">' + window.RegistroVisual.desenhar(f, r) + "</div>";
      if (!f.visualizacao) html += corpoGenerico(f, r, paciente);
      else if (!paciente) html += corpoGenerico(f, r, paciente);
      if (f.lista && Array.isArray(r[f.lista.id]) && !f.visualizacao) {
        html += '<ul class="rh-lista">' + r[f.lista.id].map(function (it) { return "<li>" + f.lista.campos.filter(function (c) { return tem(it[c.id]); }).map(function (c) { return "<b>" + e(c.rotulo) + ":</b> " + e(valorTxt(it[c.id])); }).join(" · ") + "</li>"; }).join("") + "</ul>";
      }
    }
    if (!html) html = '<p class="rh-vazio">Nada preenchido nesta aplicação.</p>';
    if (!paciente && (tem(t.leitura) || tem(t.prioridade) || tem(t.proximo_passo))) {
      html += '<div class="rh-leitura-ferr"><span class="rh-tag">Leitura profissional registrada na ferramenta</span>' +
        (tem(t.leitura) ? "<p>" + e(t.leitura) + "</p>" : "") +
        (tem(t.prioridade) ? "<p><b>Prioridade:</b> " + e(t.prioridade) + "</p>" : "") +
        (tem(t.proximo_passo) ? "<p><b>Próximo passo:</b> " + e(t.proximo_passo) + "</p>" : "") + "</div>";
    }
    return html;
  }
  /* Resultado estruturado da ferramenta (decisao 2, item 180): organiza o registro, sem score nem interpretacao.
     Profissional: o fechamento + o registro completo (recolhido). Paciente: so o fechamento (sem o que e so da
     profissional; a Carta ao Futuro Eu aparece so como "realizada") e, nos registros visuais, o desenho. */
  function fechamentoHtml(t, paciente) {
    var FF = R3.FerramentasFechamento, S = R3.ResultadoSintese;
    if (!FF || !S) return "";
    var x = FF.de(t); x.nome = defFerr(t.ferramenta_id).titulo;
    return '<div class="rh-fech-caixa"><span class="rh-tag">Resultado estruturado</span>' + S.htmlFechamento(x, paciente) + "</div>";
  }
  function cartaoFerramenta(t, paciente) {
    var f = defFerr(t.ferramenta_id);
    var fech = fechamentoHtml(t, paciente);
    var corpo;
    if (!fech) corpo = corpoFerramenta(t, paciente);
    else if (paciente) corpo = fech + (t.ferramenta_id !== "carta_futuro" && f.visualizacao && window.RegistroVisual ? '<div class="rh-visual">' + window.RegistroVisual.desenhar(f, t.respostas || {}) + "</div>" : "");
    else corpo = fech + '<details class="rh-registro"><summary>Registro completo da aplicação</summary>' + corpoFerramenta(t, false) + "</details>";
    return '<article class="rh-ferr' + (f.visualizacao ? " rh-ferr-largo" : "") + '" data-rh-ferr-snap="' + e(t.ferramenta_id) + '">' +
      '<header class="rh-ferr-topo"><h5>' + e(f.titulo) + "</h5>" +
      '<span class="rh-ferr-meta">' + e(dataBR(t.concluida_em || t.iniciada_em)) + (paciente ? "" : " · " + e(t.status === "revisada" ? "revisada" : "concluída") +
        (t.mostrar_paciente ? ' · <span class="rh-selo-paciente">na visão do paciente</span>' : ' · <span class="rh-selo-privado">só na visão profissional</span>')) + "</span></header>" +
      corpo + "</article>";
  }
  function mapaProposito(snap, paciente) {
    var fs = snap.ferramentas || [], oq3 = fs.filter(function (t) { return t.ferramenta_id === "oq3"; })[0], pqq = fs.filter(function (t) { return t.ferramenta_id === "pqq"; })[0];
    if (!oq3 || !pqq) return "";
    /* OQ3 + PQQ -> Mapa do Proposito: a unica relacao ferramenta -> ferramenta homologada (opcional, item 180) */
    if (R3.FerramentasFechamento && !R3.FerramentasFechamento.propositoDisponivel(fs)) return "";
    if (paciente && !(oq3.mostrar_paciente && pqq.mostrar_paciente)) return "";
    var a = oq3.respostas || {}, b = pqq.respostas || {};
    return '<article class="rh-ferr rh-ferr-mapa" data-rh-ferr-snap="mapa_proposito"><header class="rh-ferr-topo"><h5>Mapa do Propósito</h5>' +
      '<span class="rh-ferr-meta">montado a partir do OQ³ e do PQQ selecionados · aprofundamento opcional</span></header>' +
      '<div class="rh-mapa-grade">' +
      [["Quer", a.quer], ["Precisa", a.precisa], ["Consegue", a.consegue], ["Objetivo", b.objetivo], ["Propósito registrado", b.verdadeiro]]
        .map(function (k) { return '<div class="rh-mapa-item"><span>' + e(k[0]) + "</span><p>" + (tem(k[1]) ? e(k[1]) : "—") + "</p></div>"; }).join("") +
      "</div></article>";
  }

  /* ---------- desenho: resumo de cada eixo (visao conjunta, sem conclusao) -- */
  function resumoFerr(t) {
    var r = t.respostas || {}, f = defFerr(t.ferramenta_id), linhas = [];
    var add = function (rot, v) { if (tem(v)) linhas.push("<li><b>" + e(rot) + ":</b> " + e(String(valorTxt(v)).slice(0, 140)) + "</li>"); };
    var visual = f.visualizacao;   // registros clinicos: timeline (rotina), fluxo (gatilhos), rede (conexao)
    if (visual === "timeline") { add("Acorda", r.acorda); add("Dorme", r.dorme); if (Array.isArray(r.eventos)) add("Eventos do dia", r.eventos.length + " registrado(s)"); add("Espaços para mudança", r.espacos); }
    else if (visual === "fluxo") { add("Gatilho", r.gatilho); add("Resposta", r.resposta); add("Necessidade", r.necessidade); }
    else if (visual === "rede") { if (Array.isArray(r.vinculos)) add("Vínculos registrados", r.vinculos.length); add("Com quem pode contar", r.contar); }
    else switch (t.ferramenta_id) {
      case "oq3": add("Quer", r.quer); add("Precisa", r.precisa); add("Consegue", r.consegue); break;
      case "linha_momentum": add("Estado registrado", r.estado_confirmado); add("O que sustenta", r.sustenta); add("O que limita", r.limita); break;
      case "pqq": add("Objetivo", r.objetivo); add("Verdadeiro motivo", r.verdadeiro); break;
      case "mapa_crencas": add("Crenças", r.crencas); add("Alternativa", r.alternativa); break;
      case "roda_vida": add("Área que puxa para baixo (registrada)", r.puxa); break;
      case "carta_futuro": add("Para quando", r.para_quando); break;
    }
    return '<li class="rh-conj-ferr"><b>' + e(f.titulo) + "</b>" + (linhas.length ? "<ul>" + linhas.join("") + "</ul>" : "") + "</li>";
  }

  /* ---------- documento (profissional | paciente) --------------------------- */
  /* texto da faixa para a PACIENTE: o que a nota quer dizer, sem instrucao tecnica nem leitura clinica */
  function textoPacienteFaixa(s) {
    if (!s || !s.avaliavel) return "Não houve respostas suficientes para dar nota a esta área nesta avaliação.";
    if (s.faixa === "baixa") return "Esta área apareceu com mais sinais nas suas respostas e será conversada com a sua nutricionista.";
    if (s.faixa === "intermediaria") return "Esta área apareceu com alguns sinais nas suas respostas e pode ser conversada com a sua nutricionista.";
    if (s.faixa === "alta") return "Esta área apareceu com poucos sinais nas suas respostas.";
    return "Esta área faz parte do seu mapa e é conversada com a sua nutricionista.";
  }

  function documentoHtml(snap, visao, meta) {
    meta = meta || {};
    var paciente = visao === "paciente";
    var h = snap.holoscan || {}, sis = h.sistemas || [], tri = h.triada || {}, triOk = h.triada_com_dado || {};
    var ferr = (snap.ferramentas || []).filter(function (t) { return !paciente || t.mostrar_paciente; });
    var obs = snap.observacoes || meta.observacoes || {};
    var html = '<article class="rh-doc rh-doc-' + (paciente ? "paciente" : "profissional") + '" id="rh-doc" aria-label="Resultado HOLOS — ' + (paciente ? "visão do paciente" : "visão profissional") + '">';

    // 1. identificacao
    html += '<header class="rh-doc-cab"><span class="eyebrow">' + (paciente ? "Resultado HOLOS" : "Resultado HOLOS · visão profissional") + "</span>" +
      "<h2>" + (paciente ? "Seu Mapa HOLOS" : "Resultado HOLOS") + (snap.paciente && snap.paciente.nome ? " &middot; " + e(snap.paciente.nome) : "") + "</h2>";
    if (meta.previa) html += '<p class="rh-previa-selo" role="status">PRÉVIA — ainda não salva. Nada aqui foi registrado.</p>';
    if (paciente) {
      html += '<p class="rh-doc-sub">Avaliação de ' + e(dataBR(h.quando)) + (snap.profissional && snap.profissional.nome ? " · com " + e(snap.profissional.nome) : "") + "</p>";
    } else {
      var r = snap.resultado || {};
      html += '<dl class="rh-ident">' +
        "<div><dt>Paciente</dt><dd>" + e(snap.paciente && snap.paciente.nome) + "</dd></div>" +
        "<div><dt>Data do resultado</dt><dd>" + (r.salvo_em ? e(dataHora(r.salvo_em)) : "prévia") + "</dd></div>" +
        "<div><dt>Nutricionista</dt><dd>" + e(snap.profissional && snap.profissional.nome || "—") + "</dd></div>" +
        "<div><dt>Atendimento</dt><dd>" + e(snap.atendimento ? dataHora(snap.atendimento.occurred_at) : "—") + "</dd></div>" +
        "<div><dt>HOLOSCAN</dt><dd>" + e(dataBR(h.quando)) + (h.registrado_em ? " · registrado " + e(dataHora(h.registrado_em)) : "") + " · " + e(curto(h.id)) + "</dd></div>" +
        "<div><dt>Ferramentas incluídas</dt><dd>" + (snap.ferramentas || []).length + "</dd></div>" +
        "<div><dt>Versão do resultado</dt><dd>" + (r.revision_number ? "nº " + e(r.revision_number) + (meta.status ? " · " + e(ROTULO_STATUS[meta.status] || meta.status) : "") : "—") + "</dd></div>" +
        "<div><dt>Pacote metodológico</dt><dd>" + e(h.pacote ? h.pacote.code + " v" + h.pacote.version : "—") + "</dd></div>" +
        "</dl>";
    }
    html += "</header>";

    // 1b. resumo estruturado (09/10): fatos + regra oficial + pendencias metodologicas, so a partir do snapshot
    if (R3.ResultadoSintese) {
      html += R3.ResultadoSintese.html(snap, visao, { moduloDe: moduloDe, nomeFerramenta: function (id) { return defFerr(id).titulo; } });
      /* Modelo B: Proximos Passos na visao da paciente SO quando a nutricionista compartilhou (padrao desligado) */
      if (paciente) html += R3.ResultadoSintese.htmlProximosPassosPaciente(snap, function (id) { return defFerr(id).titulo; });
    }

    // 2. visao geral HOLOSCAN
    var cob = h.cobertura || {};
    html += '<section class="rh-secao rh-geral" aria-labelledby="rh-t-geral"><h3 id="rh-t-geral">' + (paciente ? "Seu Mapa HOLOS" : "Visão geral HOLOSCAN") + "</h3>" +
      (paciente ? '<p class="rh-intro">Nesta avaliação, as suas respostas ao HOLOSCAN foram organizadas em cinco sistemas. Notas mais baixas indicam onde mais sinais foram relatados. O mapa não é um diagnóstico: ele mostra por onde a conversa com a sua nutricionista pode seguir.</p>' : "") +
      '<div class="rh-geral-grade"><div class="rh-radar-caixa">' + radarSvg(sis) + "</div>" +
      '<div class="rh-numeros">' +
        '<div class="rh-num"><span>Índice HOLOS</span><b>' + (h.indice === null || h.indice === undefined ? "—" : num(h.indice)) + "</b><small>de " + e(h.indice_maximo || 100) + "</small></div>" +
        EIXOS.map(function (x) { return '<div class="rh-num"><span>' + e(x[1]) + "</span><b>" + (triOk[x[2]] === false || tri[x[2]] === null || tri[x[2]] === undefined ? "—" : num(tri[x[2]])) + "</b><small>Tríade</small></div>"; }).join("") +
        (paciente ? "" : '<div class="rh-num rh-num-cob"><span>Cobertura</span><b>' + (typeof cob.respondidos === "number" ? e(cob.respondidos + "/" + cob.total) : "—") + "</b><small>respostas</small></div>") +
      "</div></div>" +
      (paciente ? "" : '<p class="rh-nota-tec">Dados oficiais salvos da aplicação HOLOSCAN selecionada (' + e(h.pacote ? h.pacote.code + " v" + h.pacote.version : "") + '). Nada foi recalculado nesta página.</p>') +
      "</section>";

    // 3. cinco sistemas
    html += '<section class="rh-secao" aria-labelledby="rh-t-sis"><h3 id="rh-t-sis">' + (paciente ? "Os cinco sistemas" : "Cinco sistemas") + '</h3><div class="rh-sistemas">' +
      sis.map(function (s) {
        /* 12/10 (bug 3): a mensagem da faixa do pacote e escrita para a profissional ("Revise os itens..."). Na visao da
           paciente, Resultado novo (template 3) usa linguagem simples; template 1/2 (ja emitidos) ficam como foram. */
        var msg = paciente ? ((snap.template_version || 1) >= 3 ? textoPacienteFaixa(s) : s.mensagem_paciente) : s.mensagem_nutri;
        return '<article class="rh-sis rh-faixa-' + e(s.faixa || "sem") + '"><header><h4>' + e(s.nome || s.sistema) + "</h4>" +
          '<span class="rh-sis-nota">' + (s.avaliavel ? num(s.nota) : "—") + "</span></header>" +
          '<p class="rh-sis-faixa">' + (s.avaliavel ? "faixa " + e(faixaTxt(s.faixa)) : "sem nota (menos respostas do que o mínimo)") +
            (paciente ? "" : " · " + e(s.respondidos + " de " + s.total_marcadores) + " respondidas" + (s.avaliavel ? "" : " · não avaliável")) + "</p>" +
          (msg ? '<p class="rh-sis-msg">' + e(msg) + "</p>" : "") +
          (!paciente && s.texto_publico ? '<p class="rh-sis-pub">' + e(s.texto_publico) + "</p>" : "") +
          (paciente ? "" :
            '<details class="rh-sis-det"><summary>Pontuou neste sistema (' + (s.pontuou || []).length + ")</summary>" + listaRespostas(s.pontuou) + "</details>" +
            '<details class="rh-sis-det"><summary>Contexto, sem pontuar (' + (s.contexto || []).length + ")</summary>" +
              ((s.contexto || []).length ? listaRespostas(s.contexto) : '<p class="rh-vazio">Nenhuma resposta de contexto neste sistema.</p>') + "</details>") +
          "</article>";
      }).join("") + "</div>" +
      (!paciente && h.interpretacao_texto ? '<div class="rh-interp"><span class="rh-tag">Interpretação registrada no HOLOSCAN</span><p>' + e(h.interpretacao_texto).replace(/\n/g, "<br>") + "</p></div>" : "") +
      "</section>";

    // 4-6. Corpo, Mente, Espirito
    EIXOS.forEach(function (x) {
      var doEixo = ferr.filter(function (t) { return moduloDe(t.ferramenta_id) === x[0]; });
      var mapa = x[0] === "espirito" ? mapaProposito(snap, paciente) : "";
      if (paciente && !doEixo.length && !mapa) return;
      html += '<section class="rh-secao rh-eixo rh-eixo-' + x[0] + '" aria-labelledby="rh-t-' + x[0] + '"><h3 id="rh-t-' + x[0] + '">' + e(x[1]) + "</h3>" +
        (paciente ? '<p class="rh-intro">Foi registrado nesta avaliação:</p>' : "") +
        (doEixo.length || mapa ? '<div class="rh-ferrs">' + mapa + doEixo.map(function (t) { return cartaoFerramenta(t, paciente); }).join("") + "</div>"
          : '<p class="rh-vazio">Nenhuma ferramenta de ' + e(x[1]) + " selecionada para este resultado.</p>") + "</section>";
    });

    // 7. visao conjunta (so profissional)
    if (!paciente) {
      html += '<section class="rh-secao" aria-labelledby="rh-t-conj"><h3 id="rh-t-conj">Visão conjunta — Corpo | Mente | Espírito</h3>' +
        '<p class="rh-nota-tec">Os registros lado a lado, como foram feitos. O sistema não tira conclusões: a leitura do conjunto é sua.</p><div class="rh-conjunta">' +
        EIXOS.map(function (x) {
          var doEixo = (snap.ferramentas || []).filter(function (t) { return moduloDe(t.ferramenta_id) === x[0]; });
          return '<div class="rh-conj-col rh-eixo-' + x[0] + '"><h4>' + e(x[1]) + ' <small>Tríade ' + (tri[x[2]] === null || tri[x[2]] === undefined ? "—" : num(tri[x[2]])) + "</small></h4>" +
            (doEixo.length ? '<ul class="rh-conj-lista">' + doEixo.map(resumoFerr).join("") + "</ul>" : '<p class="rh-vazio">Sem ferramentas selecionadas.</p>') + "</div>";
        }).join("") + "</div></section>";
    }

    // 8. observacoes
    if (paciente) {
      if (tem(obs.leitura_profissional)) html += '<section class="rh-secao rh-obs" aria-labelledby="rh-t-obs"><h3 id="rh-t-obs">O que sua nutricionista observou</h3><p>' + e(obs.leitura_profissional).replace(/\n/g, "<br>") + "</p></section>";
      if (tem(obs.pontos_acompanhar)) html += '<section class="rh-secao rh-obs" aria-labelledby="rh-t-pts"><h3 id="rh-t-pts">Pontos que serão acompanhados</h3><p>' + e(obs.pontos_acompanhar).replace(/\n/g, "<br>") + "</p></section>";
    } else {
      html += '<section class="rh-secao rh-obs" aria-labelledby="rh-t-obs"><h3 id="rh-t-obs">Observações da nutricionista</h3>' +
        [["leitura_profissional", "Leitura profissional da nutricionista"], ["pontos_acompanhar", "Pontos para acompanhar"], ["questoes_aprofundar", "Questões para aprofundar"]].map(function (k) {
          return '<div class="rh-obs-item"><h4>' + e(k[1]) + "</h4>" + (tem(obs[k[0]]) ? "<p>" + e(obs[k[0]]).replace(/\n/g, "<br>") + "</p>" : '<p class="rh-vazio">Não registrado.</p>') + "</div>";
        }).join("") + "</section>";
      html += '<p class="rh-futuro">Exames e Leitura Integrada — não incluídos nesta versão do Resultado HOLOS.</p>';
    }
    html += '<footer class="rh-doc-rodape">' + (paciente
      ? "Este material organiza o que foi registrado na sua avaliação. Ele não é diagnóstico nem prescrição: os próximos passos são combinados com a sua nutricionista em consulta."
      : "Snapshot do Resultado HOLOS" + (meta.hash ? " · hash técnico " + e(String(meta.hash).slice(0, 16)) + "…" : "") + ". Documento organizado a partir de registros salvos; não é diagnóstico.") + "</footer>";
    return html + "</article>";
  }
  function listaRespostas(lista) {
    if (!(lista || []).length) return '<p class="rh-vazio">Nenhuma.</p>';
    return '<ul class="rh-respostas">' + lista.map(function (q) {
      return "<li><span>" + e(q.enunciado) + '</span><b class="rh-resp">' + e(q.resposta !== null && q.resposta !== undefined ? q.resposta : q.valor) + "</b></li>";
    }).join("") + "</ul>";
  }

    R3.documentoResultado = documentoHtml;
  })();

  /* ---- resultado-pagina.js (documento da emissao), copia literal ---- */
  (function () {
  var escapar = window.escapar;
  var dataBR = window.dataBR;
  var HTML2PDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";
  /* termos fora do metodo: so AVISA a nutricionista na tela; nao bloqueia, nao edita, nao entra no PDF */
  var TERMOS_FORA = /\b(dieta|d[eé]ficit|cal[oó]ric|kcal|calorias?|card[aá]pio|prescri[cç]|diagn[oó]stic|encaminh)/i;
  var CAMPOS_CONDUTA = [
    ["objective", "Objetivo desta etapa"], ["nutrition_strategy", "Estratégia"], ["actions", "Ações combinadas"],
    ["resources", "Recursos e apoios"], ["professional_guidance", "Orientações da nutricionista"], ["return_plan", "Retorno"]
  ];

  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function alvo() { return document.getElementById("resultado-pagina-corpo"); }
  function pacienteId() { return window.pacienteAtivoId ? window.pacienteAtivoId() : null; }
  function pacienteObj(pid) { return ((window.pacientesTodos && window.pacientesTodos()) || []).filter(function (p) { return p.id === pid; })[0] || null; }
  function perfil() { return window.PerfilProfissional ? window.PerfilProfissional.dados() : {}; }
  function toast(m) { if (window.avisar) window.avisar(m); }
  function tem(v) { return v !== null && v !== undefined && String(v).trim() !== ""; }
  function quebras(t) { return escapar(t).replace(/\n/g, "<br>"); }
  function dataHora(iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return String(iso);
    return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear() + " " +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function primeiroNome(nome) { return String(nome || "").trim().split(/\s+/)[0] || ""; }

  /* ---------- HTML ------------------------------------------------------------ */

  function imgCongelada(src) {
    return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(String(src || "")) ? '<img src="' + escapar(src) + '" alt="">' : "";
  }
  function cabecalhoProfissional(eu, imagens) {
    var linha2 = [eu.profissao, eu.registro].filter(Boolean).map(escapar).join(" &middot; ");
    var linha3 = [eu.especialidade, eu.cidade].filter(Boolean).map(escapar).join(" &middot; ");
    return '<header class="rp-cab">' +
      '<span class="rp-logo" id="rp-logo" aria-hidden="true">' + (imagens ? imgCongelada(imagens.logo) : "") + "</span>" +
      '<div class="rp-quem"><b>' + escapar(eu.nome || "HoloHacking") + "</b>" +
        (linha2 ? "<span>" + linha2 + "</span>" : "") + (linha3 ? "<span>" + linha3 + "</span>" : "") + "</div>" +
      '<div class="rp-marca"><span class="eyebrow">HoloHacking &middot; HOLOSCAN</span></div>' +
    "</header>";
  }

  function blocoConduta(cv) {
    if (!cv) return "";
    var c = cv.conduta;
    var campos = CAMPOS_CONDUTA.filter(function (f) { return tem(c[f[0]]); });
    var acordos = (cv.acordos || []).filter(function (g) { return tem(g.description); });
    if (!campos.length && !acordos.length) return "";
    return '<section class="rh-secao rp-conduta" aria-labelledby="rp-t-cond"><h3 id="rp-t-cond">Próximos passos combinados</h3>' +
      '<p class="rh-intro">O que foi combinado com a sua nutricionista nesta etapa. Não é dieta nem prescrição: são passos do método, escritos por ela para você.</p>' +
      campos.map(function (f) { return '<div class="rp-campo"><h4>' + escapar(f[1]) + "</h4><p>" + quebras(c[f[0]]) + "</p></div>"; }).join("") +
      (acordos.length ? '<div class="rp-campo"><h4>Combinados</h4><ul class="rp-acordos">' + acordos.map(function (g) {
        return "<li>" + escapar(g.description) + (tem(g.due_text) ? ' <small>(' + escapar(g.due_text) + ")</small>" : "") + "</li>";
      }).join("") + "</ul></div>" : "") +
    "</section>";
  }

  function rodapeProfissional(eu, imagens) {
    var identidade = [eu.nome, eu.registro].filter(Boolean).map(escapar).join(" &middot; ");
    var contato = [eu.telefone, eu.instagram].filter(Boolean).map(escapar).join(" &middot; ");
    return '<footer class="rp-rodape">' +
      ((eu.assinatura_id || eu.carimbo_id)
        ? '<div class="rp-assinaturas">' + (eu.assinatura_id ? '<span class="rp-imagem" id="rp-assinatura">' + (imagens ? imgCongelada(imagens.assinatura) : "") + "</span>" : "") +
            (eu.carimbo_id ? '<span class="rp-imagem" id="rp-carimbo">' + (imagens ? imgCongelada(imagens.carimbo) : "") + "</span>" : "") + "</div>"
        : "") +
      (identidade ? '<p class="rp-emitiu">' + identidade + "</p>" : "") +
      (contato ? '<p class="rp-contato">' + contato + "</p>" : "") +
      '<p class="rp-fronteira">Este material organiza o que foi registrado na sua avaliação com a sua nutricionista. Não é exame, não é diagnóstico e não é prescrição. Os próximos passos são combinados em consulta.</p>' +
    "</footer>";
  }

  function documentoHtml(pid, r, cv, eu, imagens) {
    var snap = r.content_snapshot;
    var meta = { status: r.status, hash: r.content_hash };
    var corpo = R3.documentoResultado(snap, "paciente", meta);
    return '<article class="rp-doc" id="rp-doc" aria-label="Resultado para a paciente">' +
      cabecalhoProfissional(eu, imagens) +
      '<div class="rp-corpo">' + corpo + blocoConduta(cv) + "</div>" +
      rodapeProfissional(eu, imagens) +
    "</article>";
  }

  /* Documento de uma EMISSAO (template RF-1): SO o que ela congelou + o snapshot imutavel do Resultado HOLOS
     (conferido pelo hash). Mesma entrada -> mesmo HTML, sempre. */
  function documentoEmissao(em, r) {
    var s = em.content_snapshot || {};
    var c = s.conduta;
    var cv = c ? { conduta: Object.assign({}, c.campos || {}), acordos: (c.acordos || []).map(function (a) { return { description: a.description, due_text: a.due_text }; }) } : null;
    var eu = Object.assign({}, s.profissional || {});
    var im = s.imagens || {};
    eu.assinatura_id = im.assinatura ? "congelada" : null; eu.carimbo_id = im.carimbo ? "congelada" : null;
    return documentoHtml(null, r, cv, eu, im);
  }
    R3.documentoEmissao = documentoEmissao;
  })();

  window.ResultadoLegadoR3 = { documentoEmissao: R3.documentoEmissao, documentoResultado: R3.documentoResultado };
})();
