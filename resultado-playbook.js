/* ===========================================================================
   MONTAR COM O PLAYBOOK — assistente do Resultado HOLOS sem depender da IA
   ===========================================================================

   Uma tela, quatro passos (plano: docs/v1/PLANO-PLAYBOOK-HOLOS.md):
     1. Leitura do paciente: sistemas prioritarios do HOLOSCAN, ferramentas,
        Linha do Momentum e o que o paciente contou (Mapeamento) — ela marca o
        que entra. No RETORNO: como foi cada estrategia anterior e a decisao
        (manter, ajustar, substituir, concluir).
     2. Foco desta fase: 3 cartoes por sistema prioritario (ou escrever outro).
        O foco traz os direcionamentos, o "observe" e a proxima etapa.
     3. Estrategias: 1 a 6, do sistema do foco primeiro e das que combinam com
        as ferramentas aplicadas; tudo editavel.
     4. Previa e Gerar Resultado (o mesmo caminho de gravacao do Resultado).

   Desenha dentro da aba Resultado HOLOS (modo "playbook" de resultado-holos.js).
   Conteudo e selecao: playbook-holos.js. Nada e escolhido sozinho.
   =========================================================================== */
(function () {
  "use strict";

  var esc = function (x) {
    return String(x === null || x === undefined ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  var PB = function () { return window.PlaybookHolos; };
  var R = function () { return window.ResultadoHolos; };
  var alvo = function () { return document.getElementById("aba-resultado-holos"); };
  var toast = function (m) { if (window.avisar) window.avisar(m); };
  var rand = function () { return Math.random().toString(36).slice(2, 8); };

  var LISTAS_REL = ["momento", "dores", "desejos", "avancos", "permaneceu", "acordos_compartilhados"];
  var LIM_REL = { momento: 2, dores: 3, desejos: 2, avancos: 3, permaneceu: 3, acordos_compartilhados: 3 };
  var TIT_REL = { momento: "Seu momento agora", dores: "O que está pesando", desejos: "O que você quer mudar", avancos: "O que já está mudando",
    permaneceu: "O que ainda pesa", acordos_compartilhados: "O que combinamos (acordos)" };
  var APLICOU = { sim: "Conseguiu aplicar.", parte: "Conseguiu aplicar em parte.", nao: "Não conseguiu aplicar." };
  var DECISOES = [["manter", "Manter"], ["ajustar", "Ajustar"], ["substituir", "Substituir"], ["concluir", "Concluir"], ["encerrar", "Encerrar"]];

  var st = null;
  function novo(pid) {
    return { pid: pid, carregando: true, pb: null, erro: "", relSel: {}, foco: null, focoLivre: "", outros: false, ajustar: false,
      dirs: [], observar: [], proxima: "", est: [], gerais: false, acomp: {}, manterFoco: false, previa: "", msg: "", gerando: false };
  }
  function reiniciar() { st = null; }
  function doAnterior(it) { return !!(it && it.origem === "resultado_anterior"); }

  /* ---------- dados ---------------------------------------------------------- */
  function retorno() { return !!(st.pb && st.pb.tipo === "retorno"); }
  function anterior() { return st.pb && st.pb.anterior && st.pb.anterior.direcao_paciente ? st.pb.anterior : null; }
  function focoAnterior() { var a = anterior(); return a && a.direcao_paciente.foco_atual && a.direcao_paciente.foco_atual.texto ? a.direcao_paciente.foco_atual : null; }
  function idFocoAnterior() {
    var d = st.pb && st.pb.anteriorDirecao, f = d && d.foco_atual;
    return f && f.id ? PB().origemPlaybook(f.id) : null;
  }
  function estrategiasAnteriores() { var a = anterior(); return a ? (a.direcao_paciente.estrategias || []).filter(function (x) { return x && x.id; }) : []; }
  function usandoFocoAnterior() { return retorno() && !!focoAnterior() && st.manterFoco; }
  function continuadasN() {
    return estrategiasAnteriores().filter(function (e) { var a = st.acomp[e.id] || {}; return a.decisao === "manter" || a.decisao === "ajustar"; }).length;
  }
  function totalEst() { return st.est.length + continuadasN(); }
  function focoParaOrdem() { return usandoFocoAnterior() ? idFocoAnterior() : (st.foco && st.foco !== "LIVRE" ? st.foco : null); }
  function opcoes() {
    var pb = st.pb;
    return PB().opcoes({ prioritarios: pb.prioritarios, ferramentas: pb.ferramentas, foco: focoParaOrdem(), momentum: pb.momentum });
  }
  function padroes() {
    var rel = st.pb.relato || {};
    /* 16/10: o que veio do Resultado ANTERIOR aparece como referencia ("No encontro anterior") e nunca vem marcado:
       a nutricionista decide o que ainda vale. O limite de pre-marcacao conta so o que e de agora. */
    LISTAS_REL.forEach(function (k) { var n = 0; (rel[k] || []).forEach(function (it, i) { var atual = !doAnterior(it); st.relSel[k + ":" + i] = atual && n < LIM_REL[k]; if (atual) n++; }); });
    var porTerr = {};
    (st.pb.ferramentasRelato || []).forEach(function (x, i) { porTerr[x.lista] = (porTerr[x.lista] || 0) + 1; st.relSel["ferr:" + i] = porTerr[x.lista] <= 2; });
    estrategiasAnteriores().forEach(function (e) { st.acomp[e.id] = { decisao: "", aplicou: "", nota: "", acao: e.acao || "" }; });
    st.manterFoco = retorno() && !!focoAnterior();
  }
  function escolherFoco(id) {
    st.foco = id;
    var def = id && id !== "LIVRE" ? PB().porId(id) : null;
    st.dirs = def ? def.direcionamentos.map(function (d) { return { sel: true, titulo: d.titulo, territorio: d.territorio, objetivo: d.objetivo }; }) : [];
    st.observar = def ? def.observar.slice() : ["", "", ""];
    st.proxima = def ? def.proxima_etapa : "";
  }

  /* a escolha completa, no formato de ResultadoHolos.gerarPorPlaybook / previaPlaybook */
  function escolha() {
    var P = PB(), ant = anterior(), m, extra = {};
    var est = st.est.map(function (s) { return { id: s.id, acao: s.acao, contexto: s.contexto, observar: s.observar }; });
    if (usandoFocoAnterior()) {
      var fid = idFocoAnterior(), def = fid ? P.porId(fid) : null, fa = focoAnterior();
      m = P.montarDirecao({ foco: { livre: fa.texto }, direcionamentos: [], estrategias: est, observar: def ? def.observar : [], proxima_etapa: def ? def.proxima_etapa : "" });
      var base = function (campo, texto) {
        return { texto: texto, texto_sugerido: texto, origem: "resultado_anterior", ref: { tipo: "resultado", id: ant.id, campo: campo }, sugestao: false, confirmado: true, mostrar_paciente: true, descartado: false };
      };
      extra.focoAnterior = Object.assign({ id: "pb1-" + (fid || "FOCO") + "-a-" + rand() }, base("foco_atual", fa.texto));
      extra.direcionamentosAnteriores = (ant.direcao_paciente.direcionamentos || []).filter(function (x) { return x && x.texto; }).map(function (x) {
        return Object.assign({ id: x.id || "pb1-dir-a-" + rand() }, base("direcionamentos", x.texto), { territorio: x.territorio || "integrado", porque: x.porque || "", objetivo: x.objetivo || "",
          status: "ativo", sistemas: (x.sistemas || []).slice(0, 5) });
      });
      m.estrategias.forEach(function (e) {
        var def2 = P.porId(P.origemPlaybook(e.id)), t = def2 ? def2.territorio : null;
        var d = extra.direcionamentosAnteriores.filter(function (x) { return x.territorio === t; })[0] || extra.direcionamentosAnteriores[0];
        e.direcionamento_id = d ? d.id : "";
      });
      m.foco_atual = null;
    } else {
      var foco = st.foco === "LIVRE" ? { livre: st.focoLivre } : { id: st.foco };
      m = P.montarDirecao({ foco: foco, direcionamentos: st.dirs.filter(function (d) { return d.sel; }), estrategias: est,
        observar: st.observar.filter(function (x) { return String(x || "").trim(); }), proxima_etapa: st.proxima });
    }
    var acompanhamento = [], continuadas = [];
    if (retorno() && ant) estrategiasAnteriores().forEach(function (e) {
      var a = st.acomp[e.id] || {};
      if (!a.decisao) return;
      var ref = { tipo: "resultado", id: ant.id, campo: "estrategias" };
      acompanhamento.push({ id: "pb1-acomp-" + rand(), texto: e.texto, texto_sugerido: e.texto, origem: "resultado_anterior", ref: ref, sugestao: false, confirmado: true,
        mostrar_paciente: true, descartado: false, estrategia: { resultado_id: ant.id, estrategia_id: e.id },
        aplicou: ((APLICOU[a.aplicou] || "") + (a.nota ? " " + a.nota : "")).trim(), decisao: a.decisao });
      if (a.decisao === "manter" || a.decisao === "ajustar") {
        var pid = P.origemPlaybook(e.id);
        continuadas.push({ id: "pb1-" + (pid ? pid + "-" : "") + "c-" + rand(), texto: e.texto, texto_sugerido: e.texto, origem: "resultado_anterior", ref: ref, sugestao: false,
          confirmado: true, mostrar_paciente: true, descartado: false, status: a.decisao, anterior: { resultado_id: ant.id, estrategia_id: e.id },
          direcionamento_id: "", finalidade: e.finalidade || "", acao: a.decisao === "ajustar" ? a.acao : (e.acao || ""), observar: e.observar || "", contexto: e.contexto || "",
          prazo: e.prazo || P.PRAZO_PADRAO, responsavel: e.responsavel || "" });
      }
    });
    var relato = [];
    LISTAS_REL.forEach(function (k) { ((st.pb.relato || {})[k] || []).forEach(function (it, i) { if (st.relSel[k + ":" + i]) relato.push({ lista: k, item: it }); }); });
    (st.pb.ferramentasRelato || []).forEach(function (x, i) { if (st.relSel["ferr:" + i]) relato.push(x); });
    var resumo = P.resumo({ foco: { id: usandoFocoAnterior() ? idFocoAnterior() : st.foco }, estrategias: st.est }) +
      (retorno() ? " Retorno: " + acompanhamento.length + " estratégia(s) acompanhada(s), " + continuadas.length + " continuada(s)." : "");
    return Object.assign({ relato: relato, direcao: m, acompanhamento: acompanhamento, continuadas: continuadas, resumo: resumo }, extra);
  }
  function problema() {
    if (!usandoFocoAnterior()) {
      if (!st.foco) return "Escolha o Foco desta fase (passo 2).";
      if (st.foco === "LIVRE" && !String(st.focoLivre || "").trim()) return "Escreva o foco desta fase (passo 2).";
    }
    if (retorno() && estrategiasAnteriores().some(function (e) { return !(st.acomp[e.id] || {}).decisao; })) return "Registre a decisão de cada estratégia do encontro anterior (passo 1).";
    if (!totalEst()) return "Escolha pelo menos 1 estratégia (passo 3).";
    if (totalEst() > PB().MAX_ESTRATEGIAS) return "No máximo " + PB().MAX_ESTRATEGIAS + " estratégias.";
    return null;
  }

  /* ---------- desenho ---------------------------------------------------------- */
  function chip(t, cls) { return '<span class="pb-chip' + (cls ? " " + cls : "") + '">' + esc(t) + "</span>"; }
  function passo(n, titulo, sub, corpo) {
    return '<section class="pb-passo" data-pb-passo="' + n + '"><h4 class="pb-passo-tit"><span class="pb-num">' + n + "</span>" + esc(titulo) + "</h4>" +
      (sub ? '<p class="dash-sub">' + sub + "</p>" : "") + corpo + "</section>";
  }
  function htmlLeitura() {
    var pb = st.pb, P = PB();
    var prio = pb.prioritarios.length ? pb.prioritarios.map(function (s, i) { return chip((i + 1) + "ª área: " + (P.NOME_SISTEMA[s] || s), "pb-chip-sis"); }).join("")
      : chip("O HOLOSCAN não indicou áreas prioritárias", "pb-chip-aviso");
    var fer = pb.nomesFerramentas.length ? pb.nomesFerramentas.map(function (n) { return chip(n); }).join("") : chip("Nenhuma ferramenta concluída neste atendimento", "pb-chip-aviso");
    var mo = P.orientacaoMomentum(pb.momentum);
    var linhas = '<div class="pb-leitura"><p><b>Atendimento:</b> ' + esc(pb.atendimento || "—") + ' · <b>Encontro:</b> ' + (retorno() ? "retorno" : "primeira consulta") + "</p>" +
      '<p class="pb-linha"><b>HOLOSCAN</b> ' + prio + "</p>" + '<p class="pb-linha"><b>Ferramentas</b> ' + fer + "</p>" +
      (mo ? '<p class="pb-linha"><b>Linha do Momentum</b> ' + chip(mo.rotulo) + "</p>" : "") + "</div>";
    var rel = pb.relato || {}, temRel = LISTAS_REL.some(function (k) { return (rel[k] || []).length; });
    var marca = function (k, it, i, extra) {
      var key = k + ":" + i;
      return '<label class="pb-check"><input type="checkbox" data-pb-rel="' + esc(key) + '"' + (st.relSel[key] ? " checked" : "") + "> <span>" + esc(it.texto) + (extra || "") + "</span></label>";
    };
    var grupos = LISTAS_REL.filter(function (k) { return (rel[k] || []).some(function (it) { return !doAnterior(it); }); }).map(function (k) {
      return '<fieldset class="pb-rel"><legend>' + esc(TIT_REL[k]) + "</legend>" + rel[k].map(function (it, i) {
        return doAnterior(it) ? "" : marca(k, it, i);
      }).join("") + "</fieldset>";
    }).join("");
    /* 16/10: referencia do encontro anterior, em bloco separado e desmarcada */
    var antes = [];
    LISTAS_REL.forEach(function (k) { (rel[k] || []).forEach(function (it, i) { if (doAnterior(it)) antes.push(marca(k, it, i, ' <small class="pb-onde">→ ' + esc(TIT_REL[k]) + "</small>")); }); });
    if (antes.length) grupos += '<fieldset class="pb-rel pb-rel-anterior" data-pb-anterior><legend>No encontro anterior</legend>' +
      '<p class="pb-dica">Referência do Resultado anterior. Nada vem marcado: marque só o que ainda vale hoje.</p>' + antes.join("") + "</fieldset>";
    var fr = st.pb.ferramentasRelato || [];
    var ROT_F = { desejos: "O que você quer construir", corpo: "Corpo", mente: "Mente", espirito: "Espírito" };
    var blocoFerr = fr.length ? '<fieldset class="pb-rel pb-rel-ferr"><legend>O que apareceu nas ferramentas</legend>' + fr.map(function (x, i) {
      var key = "ferr:" + i;
      return '<label class="pb-check"><input type="checkbox" data-pb-rel="' + key + '"' + (st.relSel[key] ? " checked" : "") + "> <span>" + esc(x.item.texto) + ' <small class="pb-onde">→ ' + esc(ROT_F[x.lista] || x.lista) + "</small></span></label>";
    }).join("") + "</fieldset>" : "";
    var corpo = linhas + blocoFerr + (temRel ? '<p class="pb-dica">O que o paciente contou (Mapeamento ou anamnese). Marque o que entra no Resultado.</p>' + grupos
      : '<p class="dash-vazio">O paciente ainda não tem Mapeamento nem anamnese neste atendimento: esta parte fica vazia (nada é inventado).</p>');
    return passo(1, "Leitura do paciente", "Confira. O sistema só mostra o que já está registrado.", corpo);
  }
  function htmlRetorno() {
    var ests = estrategiasAnteriores();
    if (!retorno() || !ests.length) return "";
    var corpo = '<ul class="pb-acomp">' + ests.map(function (e) {
      var a = st.acomp[e.id] || {};
      return '<li class="pb-acomp-item"><p class="pb-acomp-tit"><b>' + esc(e.texto) + "</b>" + (e.acao ? "<br><small>" + esc(e.acao) + "</small>" : "") + "</p>" +
        '<label class="pb-campo"><span>Conseguiu aplicar?</span><select data-pb-aplicou="' + esc(e.id) + '"><option value="">—</option>' +
        [["sim", "Sim"], ["parte", "Em parte"], ["nao", "Não"]].map(function (o) { return '<option value="' + o[0] + '"' + (a.aplicou === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>" +
        '<div class="pb-decisoes" role="radiogroup" aria-label="Decisão">' + DECISOES.map(function (d) {
          return '<label class="pb-radio"><input type="radio" name="pb-dec-' + esc(e.id) + '" value="' + d[0] + '" data-pb-decisao="' + esc(e.id) + '"' + (a.decisao === d[0] ? " checked" : "") + "> " + d[1] + "</label>";
        }).join("") + "</div>" +
        '<label class="pb-campo"><span>Comentário (opcional)</span><input type="text" maxlength="300" data-pb-nota="' + esc(e.id) + '" value="' + esc(a.nota) + '"></label>' +
        (a.decisao === "ajustar" ? '<label class="pb-campo"><span>Como fica agora (o que fazer)</span><input type="text" maxlength="600" data-pb-ajuste="' + esc(e.id) + '" value="' + esc(a.acao) + '"></label>' : "") +
        "</li>";
    }).join("") + "</ul>";
    return passo("1b", "Como foi desde o último encontro", "Para cada estratégia do encontro anterior: conseguiu aplicar? E a decisão. <b>Manter</b> e <b>Ajustar</b> levam a estratégia para o novo plano.", corpo);
  }
  function cartaoFoco(f) {
    var sel = st.foco === f.id && !usandoFocoAnterior();
    return '<button type="button" class="pb-foco' + (sel ? " pb-sel" : "") + '" data-pb-acao="foco" data-pb-id="' + esc(f.id) + '" aria-pressed="' + (sel ? "true" : "false") + '">' +
      '<span class="pb-foco-tit">' + esc(f.texto) + '</span><span class="pb-foco-pq">' + esc(f.porque) + "</span></button>";
  }
  function htmlFoco() {
    var op = opcoes(), corpo = "";
    var fa = retorno() ? focoAnterior() : null;
    if (fa) corpo += '<div class="pb-manter-foco"><label class="pb-radio"><input type="radio" name="pb-manter-foco" data-pb-manter="sim"' + (st.manterFoco ? " checked" : "") + "> Manter o foco: <b>" + esc(fa.texto) + "</b></label>" +
      '<label class="pb-radio"><input type="radio" name="pb-manter-foco" data-pb-manter="nao"' + (!st.manterFoco ? " checked" : "") + "> Escolher um novo foco</label></div>";
    if (!usandoFocoAnterior()) {
      var grupo = function (g) {
        return '<div class="pb-focos-grupo"><p class="pb-grupo-tit">' + (g.prioridade ? g.prioridade + "ª área prioritária · " : "") + esc(g.nome) + '</p><div class="pb-focos">' +
          g.focos.map(cartaoFoco).join("") + "</div></div>";
      };
      corpo += op.focos.map(grupo).join("");
      corpo += '<button type="button" class="btn-link pb-mais" data-pb-acao="outros" aria-expanded="' + (st.outros || !op.focos.length ? "true" : "false") + '">' + (st.outros || !op.focos.length ? "Esconder" : "Ver") + " focos de outros sistemas</button>";
      if (st.outros || !op.focos.length) corpo += op.focosOutros.map(grupo).join("");
      var livre = st.foco === "LIVRE";
      corpo += '<button type="button" class="pb-foco pb-foco-livre' + (livre ? " pb-sel" : "") + '" data-pb-acao="foco" data-pb-id="LIVRE" aria-pressed="' + (livre ? "true" : "false") + '"><span class="pb-foco-tit">Escrever outro foco</span><span class="pb-foco-pq">Quando nenhum dos cartões serve.</span></button>';
      if (livre) corpo += '<label class="pb-campo"><span>Foco desta fase</span><input type="text" maxlength="300" data-pb-livre value="' + esc(st.focoLivre) + '" placeholder="Ex.: Organizar a rotina da manhã"></label>';
      if (st.foco) {
        corpo += '<button type="button" class="btn-link pb-mais" data-pb-acao="ajustar" aria-expanded="' + (st.ajustar ? "true" : "false") + '">' + (st.ajustar ? "Fechar ajustes" : "Ajustar o que vem com o foco (direcionamentos, observe, próxima etapa)") + "</button>";
        if (st.ajustar) {
          corpo += '<div class="pb-ajustes">' + st.dirs.map(function (d, i) {
            return '<div class="pb-dir"><label class="pb-check"><input type="checkbox" data-pb-dir-sel="' + i + '"' + (d.sel ? " checked" : "") + "> " + esc(PB().NOME_TERR[d.territorio] || "") + "</label>" +
              '<input type="text" maxlength="300" data-pb-dir="' + i + ':titulo" value="' + esc(d.titulo) + '" aria-label="Direcionamento">' +
              '<input type="text" maxlength="300" data-pb-dir="' + i + ':objetivo" value="' + esc(d.objetivo) + '" aria-label="Objetivo"></div>';
          }).join("") +
          '<p class="pb-grupo-tit">Até o próximo encontro, observe</p>' + st.observar.map(function (o, i) { return '<input type="text" maxlength="300" data-pb-obs="' + i + '" value="' + esc(o) + '" aria-label="Observe ' + (i + 1) + '">'; }).join("") +
          '<label class="pb-campo"><span>Próxima etapa</span><input type="text" maxlength="400" data-pb-prox value="' + esc(st.proxima) + '"></label></div>';
        }
      }
    }
    return passo(2, "Foco desta fase", "Escolha 1. Os cartões vêm das áreas prioritárias do HOLOSCAN.", corpo);
  }
  function cartaoEst(e, cheio) {
    var sel = st.est.filter(function (s) { return s.id === e.id; })[0];
    var bloq = !sel && cheio;
    var grupo = { foco: "Sistema do foco", prioritario: "Outra área prioritária", geral: "Geral" }[e.grupo] || "";
    return '<div class="pb-est' + (sel ? " pb-sel" : "") + '"><label class="pb-check"><input type="checkbox" data-pb-est="' + esc(e.id) + '"' + (sel ? " checked" : "") + (bloq ? " disabled" : "") + "> <b>" + esc(e.titulo) + "</b></label>" +
      '<p class="pb-est-acao">' + esc(e.acao) + "</p>" +
      (e.cuidado ? '<p class="pb-est-cuidado"><b>Cuidado:</b> ' + esc(e.cuidado) + "</p>" : "") +
      '<p class="pb-est-meta">' + chip(PB().TIPO[e.tipo] || "Ação", "pb-chip-tipo pb-tipo-" + e.tipo) + (grupo ? chip(grupo, "pb-chip-" + e.grupo) : "") + (e.combina.length ? chip("Combina com " + e.combina.join(", "), "pb-chip-combina") : "") + "</p>" +
      (sel ? '<div class="pb-est-campos">' +
        '<label class="pb-campo"><span>O que fazer</span><input type="text" maxlength="600" data-pb-campo="' + esc(e.id) + ':acao" value="' + esc(sel.acao) + '"></label>' +
        '<label class="pb-campo"><span>Quando / com que frequência</span><input type="text" maxlength="300" data-pb-campo="' + esc(e.id) + ':contexto" value="' + esc(sel.contexto) + '"></label>' +
        '<label class="pb-campo"><span>O que observar</span><input type="text" maxlength="300" data-pb-campo="' + esc(e.id) + ':observar" value="' + esc(sel.observar) + '"></label></div>' : "") +
      "</div>";
  }
  function colunas(lista, cheio) {
    return '<div class="pb-colunas">' + ["corpo", "mente", "espirito"].map(function (t) {
      var l = lista.filter(function (e) { return e.territorio === t; });
      return '<div class="pb-coluna"><p class="pb-col-tit">' + esc(PB().NOME_TERR[t]) + "</p>" + (l.length ? l.map(function (e) { return cartaoEst(e, cheio); }).join("") : '<p class="pb-vazio">—</p>') + "</div>";
    }).join("") + "</div>";
  }
  function htmlEstrategias() {
    var op = opcoes(), P = PB(), n = totalEst(), cheio = n >= P.MAX_ESTRATEGIAS, mo = op.momentum;
    var cont = continuadasN();
    var rec = P.RECOMENDADO || { min: 2, max: 4 };
    var topo = '<p class="pb-contador" role="status"><b>' + n + "</b> " + (n === 1 ? "estratégia escolhida" : "estratégias escolhidas") + " · recomendado " + rec.min + " a " + rec.max + (cont ? " (" + cont + " continuada" + (cont > 1 ? "s" : "") + " do encontro anterior)" : "") +
      (mo ? ' · <span class="pb-momentum">Linha do Momentum em <b>' + esc(mo.rotulo) + "</b>: o método orienta " + mo.min + " a " + mo.max + " nesta etapa.</span>" : "") + "</p>" +
      (n > rec.max ? '<p class="pb-alerta" role="note">Mais de ' + rec.max + ' estratégias: use só quando houver um motivo concreto. Poucas mudanças por vez cabem melhor na rotina.</p>' : "");
    var principais = op.estrategias.filter(function (e) { return e.grupo !== "geral"; }), gerais = op.estrategias.filter(function (e) { return e.grupo === "geral"; });
    var corpo = topo + (principais.length ? colunas(principais, cheio) : '<p class="dash-vazio">Sem área prioritária no HOLOSCAN: use as estratégias gerais ou escolha um foco de outro sistema.</p>') +
      '<button type="button" class="btn-link pb-mais" data-pb-acao="gerais" aria-expanded="' + (st.gerais ? "true" : "false") + '">' + (st.gerais ? "Esconder" : "Ver") + " estratégias gerais (" + gerais.length + ")</button>" +
      (st.gerais ? colunas(gerais, cheio) : "");
    return passo(3, "Estratégias", "Escolha normalmente 2 a 4, de preferência 1 ou 2 ações e 1 ou 2 observações. Não é obrigatório preencher Corpo, Mente e Espírito: escolha só o que o atendimento sustentou. Ao marcar, os campos já vêm preenchidos.", corpo);
  }
  function htmlGerar() {
    var corpo = '<div class="pb-acoes"><button type="button" class="btn-borda-ouro" data-pb-acao="previa">Ver prévia</button>' +
      '<button type="button" class="btn-verde" data-pb-acao="gerar"' + (st.gerando ? " disabled" : "") + ">" + (st.gerando ? "Gerando…" : "Gerar Resultado") + "</button></div>" +
      '<p class="q-erro" id="pb-msg" role="alert">' + esc(st.msg) + "</p>" +
      (st.previa ? '<div class="pb-previa rh-doc">' + st.previa + "</div>" : "");
    return passo(4, "Revisar e gerar", "A prévia é exatamente o que o paciente vai ver. Ao gerar, o Resultado fica pronto, com PDF e WhatsApp.", corpo);
  }
  function html() {
    var cab = '<header class="pb-cab"><div><span class="eyebrow">Resultado HOLOS · Playbook HOLOS ' + esc(PB() ? PB().VERSAO : "") + '</span><h3>Montar com o Playbook</h3>' +
      '<p class="dash-sub">Você escolhe o foco e as estratégias. Nada vai para o paciente sem a sua escolha.</p></div>' +
      '<button type="button" class="btn-fantasma" data-pb-acao="sair">Voltar</button></header>';
    if (!PB()) return '<section class="pb-wiz">' + cab + '<p class="q-erro">O Playbook não carregou. Recarregue a página.</p></section>';
    if (st.carregando) return '<section class="pb-wiz">' + cab + '<p class="dash-vazio">Preparando o Playbook…</p></section>';
    if (st.erro) return '<section class="pb-wiz">' + cab + '<p class="q-erro" role="alert">' + esc(st.erro) + "</p></section>";
    return '<section class="pb-wiz" aria-label="Montar com o Playbook">' + cab + htmlLeitura() + htmlRetorno() + htmlFoco() + htmlEstrategias() + htmlGerar() + "</section>";
  }
  function repintar() { var a = alvo(); if (a && st) a.innerHTML = html(); }
  function pintar(a, pid) {
    if (!st || st.pid !== pid) {
      st = novo(pid);
      var meu = st;
      R().prepararPlaybook(pid).then(function (pb) {
        if (st !== meu) return;
        st.carregando = false;
        if (!pb || pb.erro) st.erro = (pb && pb.erro) || "Não foi possível preparar o Playbook.";
        else { st.pb = pb; padroes(); }
        repintar();
      });
    }
    a.innerHTML = html();
  }

  /* ---------- eventos ---------------------------------------------------------- */
  function dentro(el) { var a = alvo(); return !!(a && st && el && a.contains(el) && a.querySelector(".pb-wiz")); }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-pb-acao]");
    if (!b || !dentro(b)) return;
    var acao = b.getAttribute("data-pb-acao");
    if (acao === "sair") { st = null; R().sairPlaybook(null); return; }
    if (acao === "foco") { escolherFoco(b.getAttribute("data-pb-id")); st.previa = ""; return repintar(); }
    if (acao === "outros") { st.outros = !st.outros; return repintar(); }
    if (acao === "gerais") { st.gerais = !st.gerais; return repintar(); }
    if (acao === "ajustar") { st.ajustar = !st.ajustar; return repintar(); }
    if (acao === "previa") {
      var p = problema();
      st.msg = p || ""; st.previa = p ? "" : R().previaPlaybook(st.pb, escolha());
      repintar();
      var pv = alvo() && alvo().querySelector(p ? "#pb-msg" : ".pb-previa"); if (pv && pv.scrollIntoView) pv.scrollIntoView({ block: "start" });
      return;
    }
    if (acao === "gerar") {
      if (st.gerando) return;
      var prob = problema();
      if (prob) { st.msg = prob; repintar(); toast(prob); return; }
      st.gerando = true; st.msg = ""; repintar();
      var meu = st;
      R().gerarPorPlaybook(st.pb, escolha()).then(function (r) {
        if (st !== meu) return;
        st.gerando = false;
        if (r && r.salvo) { st = null; toast("Resultado HOLOS gerado com o Playbook."); R().sairPlaybook(r.id); return; }
        st.msg = (r && r.mensagem) || "Não foi possível gerar o Resultado."; repintar(); toast(st.msg);
      });
    }
  });
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (!dentro(t)) return;
    if (t.hasAttribute("data-pb-rel")) { st.relSel[t.getAttribute("data-pb-rel")] = t.checked; st.previa = ""; return; }
    if (t.hasAttribute("data-pb-est")) {
      var id = t.getAttribute("data-pb-est");
      if (t.checked) {
        if (totalEst() >= PB().MAX_ESTRATEGIAS) { t.checked = false; toast("No máximo " + PB().MAX_ESTRATEGIAS + " estratégias."); return; }
        var e = PB().porId(id);
        st.est.push({ id: id, acao: e.acao, contexto: e.contexto, observar: e.observar });
      } else st.est = st.est.filter(function (s) { return s.id !== id; });
      st.previa = ""; return repintar();
    }
    if (t.hasAttribute("data-pb-aplicou")) { (st.acomp[t.getAttribute("data-pb-aplicou")] || {}).aplicou = t.value; st.previa = ""; return; }
    if (t.hasAttribute("data-pb-decisao")) {
      var eid = t.getAttribute("data-pb-decisao"), a = st.acomp[eid] || (st.acomp[eid] = {});
      var antes = a.decisao, conta = function (d) { return d === "manter" || d === "ajustar"; };
      if (conta(t.value) && !conta(antes) && totalEst() >= PB().MAX_ESTRATEGIAS) { toast("No máximo " + PB().MAX_ESTRATEGIAS + " estratégias: desmarque uma estratégia nova antes."); return repintar(); }
      a.decisao = t.value; st.previa = ""; return repintar();
    }
    if (t.hasAttribute("data-pb-manter")) { st.manterFoco = t.getAttribute("data-pb-manter") === "sim"; st.previa = ""; return repintar(); }
    if (t.hasAttribute("data-pb-dir-sel")) { (st.dirs[+t.getAttribute("data-pb-dir-sel")] || {}).sel = t.checked; st.previa = ""; return; }
  });
  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (!dentro(t)) return;
    st.previa = "";
    if (t.hasAttribute("data-pb-campo")) {
      var p = t.getAttribute("data-pb-campo").split(":"), s = st.est.filter(function (x) { return x.id === p[0]; })[0];
      if (s) s[p[1]] = t.value; return;
    }
    if (t.hasAttribute("data-pb-livre")) { st.focoLivre = t.value; return; }
    if (t.hasAttribute("data-pb-dir")) { var q = t.getAttribute("data-pb-dir").split(":"), d = st.dirs[+q[0]]; if (d) d[q[1]] = t.value; return; }
    if (t.hasAttribute("data-pb-obs")) { st.observar[+t.getAttribute("data-pb-obs")] = t.value; return; }
    if (t.hasAttribute("data-pb-prox")) { st.proxima = t.value; return; }
    if (t.hasAttribute("data-pb-nota")) { (st.acomp[t.getAttribute("data-pb-nota")] || {}).nota = t.value; return; }
    if (t.hasAttribute("data-pb-ajuste")) { (st.acomp[t.getAttribute("data-pb-ajuste")] || {}).acao = t.value; return; }
  });

  window.ResultadoPlaybook = { pintar: pintar, reiniciar: reiniciar, estado: function () { return st; } };
})();
