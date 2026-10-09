/* ===========================================================================
   APROVACOES — revisao publica das perguntas do HOLOSCAN (aprovacoes.html)
   ===========================================================================

   Pagina sem login (pedido de 09/10): o revisor marca, em cada pergunta do
   pacote oficial, Aprovar / Negar / Editar. Cada clique e gravado na hora pelo
   servidor (revisao_perguntas_registrar); o que vale e a ultima decisao de
   cada pergunta, e o historico fica guardado. "Concluir revisao" so com todas
   decididas; depois disso a pagina fica so para leitura.

   Nada clinico passa por aqui, e o pacote oficial nao muda: a revisao e um
   parecer. Textos sempre entram por textContent (nunca innerHTML com dado).
   =========================================================================== */
(function () {
  "use strict";
  var sb = window.supabaseClient;
  var estado = null;          // resposta de revisao_perguntas_ler
  var filtro = "todas";
  var gravando = {};          // stable_id -> true enquanto uma chamada esta em voo
  var msgs = {};              // stable_id -> {texto, erro}
  var abertos = {};           // stable_id -> "negar" | "editar" (campo aberto)
  var conteudo = document.getElementById("conteudo");

  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "class") e.className = attrs[k];
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) e.appendChild(typeof f === "string" ? document.createTextNode(f) : f); });
    return e;
  }
  function data(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  function hora(iso) { return iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""; }
  function msgErro(err) {
    var h = err && err.hint;
    if (h === "revisao_expirada") return "O prazo desta revisão terminou.";
    if (h === "revisao_fechada") return "Esta revisão já foi concluída.";
    if (h === "texto_obrigatorio") return "Escreva como a pergunta deveria ficar.";
    if (h === "texto_longo") return "Texto longo demais (máximo 1000 caracteres).";
    if (h === "revisao_incompleta") return (err && err.message ? err.message.replace("pergunta(s) sem decisao", "pergunta(s) sem decisão") : "Ainda há perguntas sem decisão") + ".";
    return "Não foi possível salvar. Confira a internet e tente de novo.";
  }

  /* ---------- servidor ---------- */
  function carregar() {
    if (!sb) { mostrarAviso("Não foi possível conectar", "Recarregue a página em alguns instantes."); return; }
    Promise.resolve(sb.rpc("revisao_perguntas_ler")).then(function (r) {
      if (r.error) throw r.error;
      estado = r.data || { estado: "nenhuma" };
      desenhar();
    }).catch(function () {
      mostrarAviso("Não foi possível carregar a revisão", "Confira a internet e tente de novo.", true);
    });
  }
  function item(id) { return (estado.itens || []).filter(function (i) { return i.stable_id === id; })[0]; }
  function registrar(id, decisao, texto, comentario) {
    if (gravando[id]) return Promise.resolve(false);
    gravando[id] = true; msgs[id] = { texto: "Salvando…" }; desenhar();
    return Promise.resolve(sb.rpc("revisao_perguntas_registrar", { p_stable_id: id, p_decisao: decisao, p_texto: texto || null, p_comentario: comentario || null }))
      .then(function (r) {
        gravando[id] = false;
        if (r.error) { msgs[id] = { texto: msgErro(r.error), erro: true }; if (/revisao_(expirada|fechada)/.test(r.error.hint || "")) carregar(); else desenhar(); return false; }
        var it = item(id);
        it.decisao = decisao === "limpar" ? null : decisao;
        it.texto_sugerido = decisao === "editar" ? String(texto || "").trim() : null;
        it.comentario = (decisao === "negar" || decisao === "editar") ? (String(comentario || "").trim() || null) : null;
        it.decidido_em = r.data && r.data.decidido_em;
        msgs[id] = { texto: decisao === "limpar" ? "Decisão desfeita." : "Salvo às " + hora(it.decidido_em) + "." };
        desenhar(); return true;
      }, function () {
        gravando[id] = false; msgs[id] = { texto: msgErro(null), erro: true }; desenhar(); return false;
      });
  }

  /* ---------- tela ---------- */
  function mostrarAviso(titulo, texto, tentar) {
    document.getElementById("barra").hidden = true;
    document.getElementById("sub").textContent = "";
    conteudo.replaceChildren(el("div", { class: "aviso" }, [el("h2", { text: titulo }), el("p", { text: texto }),
      tentar ? el("button", { class: "btn", type: "button", text: "Tentar de novo", onclick: carregar }) : null]));
  }
  function contagem() {
    var it = estado.itens || [];
    var c = { total: it.length, feitas: 0, aprovar: 0, negar: 0, editar: 0 };
    it.forEach(function (i) { if (i.decisao) { c.feitas++; c[i.decisao]++; } });
    return c;
  }
  function desenhar() {
    if (!estado) return;
    var sub = document.getElementById("sub");
    if (estado.estado === "nenhuma") { mostrarAviso("Nenhuma revisão aberta", "Não há perguntas para revisar agora."); return; }
    var c = contagem();
    var fechada = estado.estado !== "aberta";
    sub.textContent = (estado.pacote || "") + " · " + c.total + " perguntas" +
      (estado.estado === "aberta" ? " · aberta até " + data(estado.expira_em) : estado.estado === "expirada" ? " · prazo encerrado em " + data(estado.expira_em) : " · concluída em " + data(estado.concluida_em));
    document.getElementById("barra").hidden = false;
    document.getElementById("prog-txt").innerHTML = "";
    document.getElementById("prog-txt").append(el("b", { text: c.feitas + " de " + c.total }), " revisadas · " + c.aprovar + " aprovadas · " + c.negar + " negadas · " + c.editar + " editadas");
    document.getElementById("prog-barra").style.width = (c.total ? 100 * c.feitas / c.total : 0) + "%";
    preencherFiltro();

    var partes = [];
    if (estado.estado === "concluida") partes.push(el("div", { class: "aviso" }, [el("h2", { text: "Revisão concluída. Obrigado!" }),
      el("p", { text: "As respostas foram registradas" + (estado.concluida_por_nome ? " por " + estado.concluida_por_nome : "") + ". Abaixo, o que ficou decidido (só leitura)." })]));
    if (estado.estado === "expirada") partes.push(el("div", { class: "aviso" }, [el("h2", { text: "O prazo desta revisão terminou" }),
      el("p", { text: "As decisões já registradas estão guardadas. Para continuar, peça um novo prazo." })]));

    var grupos = [], porSis = {};
    (estado.itens || []).forEach(function (i) {
      var k = i.sistema_code || "outros";
      if (!porSis[k]) { porSis[k] = { nome: i.sistema_nome || "Outras", itens: [] }; grupos.push(porSis[k]); }
      porSis[k].itens.push(i);
    });
    var algum = false;
    grupos.forEach(function (g) {
      if (filtro !== "todas" && filtro !== "pendentes" && filtro !== g.nome) return;
      var lista = g.itens.filter(function (i) { return filtro !== "pendentes" || !i.decisao; });
      if (!lista.length) return;
      algum = true;
      var pend = g.itens.filter(function (i) { return !i.decisao; }).length;
      var cab = el("div", { class: "sis-cab" }, [el("h2", { text: g.nome }),
        el("span", { class: "sis-cont", text: (g.itens.length - pend) + " de " + g.itens.length + " revisadas" })]);
      var sec = el("section", { class: "sistema", "aria-label": g.nome }, [cab]);
      if (!fechada && pend) sec.appendChild(el("p", {}, [loteBotao(g)]));
      lista.forEach(function (i) { sec.appendChild(cartao(i, fechada)); });
      partes.push(sec);
    });
    if (!algum) partes.push(el("p", { class: "vazio", text: filtro === "pendentes" ? "Nenhuma pergunta pendente. Agora é só concluir, lá embaixo." : "Nada para mostrar." }));
    if (estado.estado === "aberta") partes.push(blocoFinal(c));
    conteudo.replaceChildren.apply(conteudo, partes);
  }
  function preencherFiltro() {
    var s = document.getElementById("filtro");
    if (s.options.length > 2) return;
    var vistos = {};
    (estado.itens || []).forEach(function (i) { var n = i.sistema_nome || "Outras"; if (!vistos[n]) { vistos[n] = 1; s.appendChild(el("option", { value: n, text: n })); } });
  }
  var loteConfirmar = null;
  function loteBotao(g) {
    var pend = g.itens.filter(function (i) { return !i.decisao; });
    if (loteConfirmar === g.nome) {
      return el("span", { class: "linha-acoes" }, [
        el("span", { class: "sis-cont", text: "Aprovar as " + pend.length + " pendentes de " + g.nome + "?" }),
        el("button", { class: "btn", type: "button", text: "Sim, aprovar", onclick: function () {
          loteConfirmar = null;
          pend.reduce(function (p, i) { return p.then(function () { return registrar(i.stable_id, "aprovar"); }); }, Promise.resolve());
        } }),
        el("button", { class: "btn claro", type: "button", text: "Cancelar", onclick: function () { loteConfirmar = null; desenhar(); } })]);
    }
    return el("button", { class: "btn-lote", type: "button", text: "Aprovar as " + pend.length + " pendentes deste sistema", onclick: function () { loteConfirmar = g.nome; desenhar(); } });
  }
  function cartao(i, fechada) {
    var id = i.stable_id, ocupado = !!gravando[id];
    var cls = "cartao" + (i.decisao ? " " + i.decisao : "");
    var botoes = el("div", { class: "acoes", role: "group", "aria-label": "Decisão da pergunta " + i.posicao }, [
      ["aprovar", "Aprovar"], ["negar", "Negar"], ["editar", "Editar"]].map(function (b) {
      var aberto = abertos[id] === b[0];
      return el("button", { type: "button", "data-d": b[0], "aria-pressed": String(i.decisao === b[0] || aberto), disabled: fechada || ocupado, text: b[1], onclick: function () {
        if (b[0] === "aprovar") { abertos[id] = null; registrar(id, "aprovar"); return; }
        if (b[0] === "negar") { abertos[id] = "negar"; if (i.decisao !== "negar") registrar(id, "negar", null, i.comentario); else desenhar(); return; }
        abertos[id] = "editar"; desenhar();
        setTimeout(function () { var t = document.getElementById("ed-" + id); if (t) t.focus(); }, 30);
      } });
    }));
    var corpo = [el("div", { class: "meta" }, [el("span", { text: "Pergunta " + i.posicao }), el("span", { text: id })]),
      el("p", { class: "pergunta", text: i.texto_original }),
      el("p", { class: "escala", text: "Respostas: " + (i.respostas || []).join(" · ") }), botoes];
    if (!fechada && abertos[id] === "negar") {
      var mot = el("textarea", { id: "mot-" + id, rows: "2", maxlength: "1000", placeholder: "Por que tirar esta pergunta? (opcional)" });
      mot.value = i.comentario || "";
      corpo.push(el("div", { class: "extra" }, [el("label", { for: "mot-" + id, text: "Motivo (opcional)" }), mot,
        el("div", { class: "linha-acoes" }, [el("button", { class: "btn", type: "button", disabled: ocupado, text: "Salvar motivo", onclick: function () {
          registrar(id, "negar", null, mot.value).then(function (ok) { if (ok) { abertos[id] = null; desenhar(); } });
        } }), el("button", { class: "btn claro", type: "button", text: "Fechar", onclick: function () { abertos[id] = null; desenhar(); } })])]));
    } else if (!fechada && abertos[id] === "editar") {
      var ed = el("textarea", { id: "ed-" + id, rows: "3", maxlength: "1000" });
      ed.value = i.texto_sugerido || i.texto_original;
      var com = el("input", { type: "text", id: "com-" + id, maxlength: "1000", placeholder: "Comentário (opcional)" });
      com.value = i.comentario || "";
      corpo.push(el("div", { class: "extra" }, [el("label", { for: "ed-" + id, text: "Como a pergunta deveria ficar" }), ed, com,
        el("div", { class: "linha-acoes" }, [el("button", { class: "btn", type: "button", disabled: ocupado, text: "Salvar edição", onclick: function () {
          if (!ed.value.trim()) { msgs[id] = { texto: "Escreva como a pergunta deveria ficar.", erro: true }; desenhar(); return; }
          registrar(id, "editar", ed.value, com.value).then(function (ok) { if (ok) { abertos[id] = null; desenhar(); } });
        } }), el("button", { class: "btn claro", type: "button", text: "Cancelar", onclick: function () { abertos[id] = null; desenhar(); } })])]));
    } else {
      if (i.decisao === "editar" && i.texto_sugerido) corpo.push(el("p", { class: "sugerido" }, [el("b", { text: "Texto sugerido: " }), i.texto_sugerido]));
      if (i.comentario) corpo.push(el("p", { class: "sugerido" }, [el("b", { text: i.decisao === "negar" ? "Motivo: " : "Comentário: " }), i.comentario]));
      if (!fechada && i.decisao && !ocupado) corpo.push(el("div", { class: "linha-acoes" }, [
        i.decisao !== "aprovar" ? el("button", { class: "btn claro", type: "button", text: i.decisao === "editar" ? "Mudar o texto" : "Escrever motivo", onclick: function () { abertos[id] = i.decisao; desenhar(); } }) : null,
        el("button", { class: "btn claro", type: "button", text: "Desfazer", onclick: function () { registrar(id, "limpar"); } })]));
    }
    var m = msgs[id];
    if (m) corpo.push(el("p", { class: "estado" + (m.erro ? " erro" : ""), role: m.erro ? "alert" : null, text: m.texto }));
    return el("article", { class: cls, id: "p-" + id }, corpo);
  }
  var confirmandoFim = false, msgFim = null;
  function blocoFinal(c) {
    var falta = c.total - c.feitas;
    var nome = el("input", { type: "text", id: "nome-revisor", maxlength: "80", placeholder: "Seu nome" });
    nome.value = blocoFinal.nome || "";
    nome.addEventListener("input", function () { blocoFinal.nome = nome.value; });
    var filhos = [el("h2", { text: "Concluir a revisão" }),
      el("p", { text: falta ? "Faltam " + falta + " pergunta(s). Use o filtro “Só pendentes” para achá-las." : "Todas as perguntas foram revisadas. Confira o resumo e conclua." })];
    var neg = (estado.itens || []).filter(function (i) { return i.decisao === "negar"; });
    var edi = (estado.itens || []).filter(function (i) { return i.decisao === "editar"; });
    if (neg.length || edi.length) {
      var ul = el("ul", { class: "resumo-lista" });
      neg.forEach(function (i) { ul.appendChild(el("li", { text: "Negar a pergunta " + i.posicao + ": " + i.texto_original })); });
      edi.forEach(function (i) { ul.appendChild(el("li", { text: "Editar a pergunta " + i.posicao + " para: " + i.texto_sugerido })); });
      filhos.push(ul);
    }
    filhos.push(el("div", { class: "extra" }, [el("label", { for: "nome-revisor", text: "Seu nome (opcional)" }), nome]));
    if (confirmandoFim) {
      filhos.push(el("p", { text: "Depois de concluir, as respostas ficam registradas e a página não aceita mais mudanças." }),
        el("div", { class: "linha-acoes" }, [el("button", { class: "btn", type: "button", text: "Sim, concluir", onclick: concluir }),
          el("button", { class: "btn claro", type: "button", text: "Voltar", onclick: function () { confirmandoFim = false; desenhar(); } })]));
    } else {
      filhos.push(el("div", { class: "linha-acoes" }, [el("button", { class: "btn", type: "button", id: "btn-concluir", disabled: falta > 0, text: "Concluir revisão",
        onclick: function () { confirmandoFim = true; msgFim = null; desenhar(); } })]));
    }
    if (msgFim) filhos.push(el("p", { class: "estado erro", role: "alert", text: msgFim }));
    return el("section", { class: "final", id: "final" }, filhos);
  }
  function concluir() {
    Promise.resolve(sb.rpc("revisao_perguntas_concluir", { p_nome: blocoFinal.nome || null })).then(function (r) {
      confirmandoFim = false;
      if (r.error) { msgFim = msgErro(r.error); desenhar(); return; }
      window.scrollTo(0, 0); carregar();
    }, function () { confirmandoFim = false; msgFim = msgErro(null); desenhar(); });
  }

  document.getElementById("filtro").addEventListener("change", function (ev) { filtro = ev.target.value; desenhar(); });
  carregar();
})();
