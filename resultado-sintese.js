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

  var F = raiz.FerramentasFechamento || (typeof require === "function" ? require("./ferramentas-fechamento.js") : null);

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
    var selecao = pp && pp.registrado && Array.isArray(pp.selection) ? pp.selection : [];
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
      add("catalogo", "regra", "Pelo catálogo vigente" + cat + ", as ferramentas indicadas para aprofundamento são " +
        lista(f.sugeridas.map(function (s) { return s.nome + (s.papel === "principal" ? " (principal)" : ""); })) + ".");
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
    if (!f.compartilhar_pp || !f.sugeridas.length) return "";
    return '<section class="rh-secao rh-pp-paciente" aria-labelledby="rh-t-pp-pac"><h3 id="rh-t-pp-pac">Próximos passos de aprofundamento</h3>' +
      '<p class="rh-intro">Ferramentas do método que podem ajudar a aprofundar a conversa com a sua nutricionista. Nenhuma é obrigatória; a escolha e o momento são combinados em consulta.</p>' +
      '<ul class="rh-resumo-lista">' + f.sugeridas.map(function (s) { return "<li>" + esc(s.nome) + "</li>"; }).join("") + "</ul></section>";
  }

  var api = { fatos: fatos, frases: frases, frasesPaciente: frasesPaciente, html: html, htmlFechamento: htmlFechamento,
    htmlProximosPassosPaciente: htmlProximosPassosPaciente, PENDENCIAS: PENDENCIAS, SELO: SELO, LIMITE: LIMITE, ordenar: ordenar };
  raiz.ResultadoSintese = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
