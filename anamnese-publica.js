/* ===========================================================================
   ANAMNESE PRE-CONSULTA — a pagina que a PACIENTE abre pelo link (09/10)
   ===========================================================================

   Sem conta. O endereco e /anamnese.html#t=<token>: o token vai depois do "#",
   entao nao chega ao servidor web nem aos logs, e nao ha ID nenhum no link.
   Tudo passa por 3 funcoes publicas do banco, que so enxergam ESTE convite:
     anamnese_publica_abrir   estado, identidade da nutricionista, rascunho
     anamnese_publica_salvar  rascunho (autosave)
     anamnese_publica_enviar  envio final (congela; o link deixa de editar)

   Os campos sao os da Anamnese V2 (anamnese-v2.js, mesma chave bloco.campo),
   para a resposta chegar no formato que o app ja entende. Ficam de fora os
   campos da profissional (medidas aferidas, exames, avaliacoes). Nada aqui e
   obrigatorio. A fonte oficial e o servidor; o navegador guarda so uma copia
   de seguranca (localStorage) para nao perder o que foi digitado sem rede.
   Texto vindo do servidor so entra na tela como texto (sem HTML).
   =========================================================================== */
(function () {
  "use strict";

  var sb = window.supabaseClient;
  var V2 = window.AnamneseV2;
  var token = (/[#&]t=([A-Za-z0-9_-]{40,64})/.exec(window.location.hash || "") || [])[1] || null;
  var CHAVE_LOCAL = token ? "holohacking.preanamnese." + token.slice(0, 12) : null;

  /* Etapas (primeira consulta). Os blocos sao os da V2; titulos e textos para a paciente. */
  var ETAPAS_PRIMEIRA = [
    { bloco: "motivo", titulo: "Sobre você e seu objetivo", intro: "Conte com suas palavras o que te traz à consulta." },
    { bloco: "alimentar", titulo: "Alimentação", intro: "Como costuma ser a sua alimentação no dia a dia. Responda só o que souber." },
    { bloco: "saude", titulo: "Saúde e sintomas", intro: "Condições que você já sabe que tem e sinais que tem percebido." },
    { bloco: "restricoes", titulo: "Medicamentos e suplementos", intro: "O que você usa hoje, e alergias ou intolerâncias que conhece." },
    { bloco: "estilo", titulo: "Sono e rotina", intro: "Sono, movimento e o ritmo da sua semana." },
    { bloco: "contexto", titulo: "Histórico e contexto", intro: "O que ajuda a sua nutricionista a entender o seu momento. Tudo aqui é opcional." },
    { bloco: "objetiva", titulo: "Medidas", intro: "Se souber, informe peso e altura aproximados. A nutricionista confere na consulta.", so: ["peso", "altura"] }
  ];
  var ETAPAS_RETORNO = [{ bloco: "retorno", titulo: "Desde a última consulta", intro: "Conte o que mudou desde o último encontro." }];

  /* Perguntas mais simples para a paciente (a chave continua a mesma da V2). */
  var ROTULO = {
    "motivo.motivo": "O que te trouxe à consulta?", "motivo.objetivo": "Qual é o seu principal objetivo?",
    "motivo.expectativa": "O que você espera do acompanhamento?", "motivo.mudar_primeiro": "O que gostaria de mudar primeiro?",
    "alimentar.refeicoes": "Quantas refeições você costuma fazer por dia?", "alimentar.horarios": "Em que horários, mais ou menos?",
    "alimentar.cafe": "O que costuma comer no café da manhã?", "alimentar.almoco": "E no almoço?", "alimentar.jantar": "E no jantar?",
    "alimentar.lanches": "E nos lanches?", "alimentar.agua": "Quanta água bebe por dia?", "alimentar.alcool": "Consome bebida alcoólica?",
    "alimentar.preferencias": "Alimentos de que mais gosta", "alimentar.evitados": "Alimentos que evita ou não come",
    "alimentar.dificuldade": "Qual a sua maior dificuldade com a alimentação?", "alimentar.maior_fome": "Em que períodos sente mais fome?",
    "alimentar.quem_prepara": "Quem prepara as suas refeições?", "alimentar.comer_fora": "Com que frequência come fora?",
    "alimentar.delivery": "Com que frequência pede delivery?", "alimentar.trabalho": "Como você se alimenta no trabalho?",
    "alimentar.obs": "Quer contar mais alguma coisa sobre a sua alimentação?",
    "saude.condicoes": "Tem alguma condição de saúde ou diagnóstico que já conhece?", "saude.cirurgias": "Já fez alguma cirurgia?",
    "saude.intestino": "Como funciona o seu intestino?", "saude.gastrointestinais": "Desconforto no estômago ou intestino",
    "saude.azia_refluxo": "Azia ou refluxo", "saude.distensao": "Barriga estufada", "saude.nausea": "Enjoo", "saude.dor": "Dor",
    "saude.outros": "Outros sinais que tem percebido",
    "restricoes.medicamentos": "Medicamentos que usa", "restricoes.suplementos": "Suplementos que usa",
    "restricoes.alergias": "Alergias", "restricoes.intolerancias": "Intolerâncias alimentares",
    "estilo.sono": "Como está o seu sono?", "estilo.atividade": "Pratica atividade física?", "estilo.trabalho": "Como é o seu trabalho?",
    "estilo.estresse": "Como está o seu nível de estresse?", "estilo.tabagismo": "Fuma?", "estilo.rotina": "Como é a sua rotina, em poucas palavras?",
    "contexto.familiar_saude": "Alguma condição de saúde importante na família?", "contexto.familiar": "Como é o seu contexto familiar?",
    "contexto.social": "E a sua vida social?", "contexto.financeiro": "Algo sobre condições financeiras que influencia a sua alimentação? (se quiser contar)",
    "contexto.obs": "Algo mais que acha importante a nutricionista saber?",
    "contexto.emocional": "Como você tem se sentido emocionalmente?", "contexto.sentido": "O que dá sentido à sua vida hoje?",
    "objetiva.peso": "Peso aproximado", "objetiva.altura": "Altura"
  };
  var SENSIVEIS = { "contexto.emocional": true, "contexto.sentido": true };
  var TXT_SENSIVEL = "Opcional. Responda só se quiser: não há resposta certa, e você pode deixar em branco ou marcar \"Prefiro não responder\".";

  var estado = { info: null, tipo: "primeira", formulario: {}, passo: 0, salvando: false, sujo: false, timer: null, enviado: false };

  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "texto") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) n.appendChild(typeof f === "string" ? document.createTextNode(f) : f); });
    return n;
  }
  function $(id) { return document.getElementById(id); }
  function etapas() { return estado.tipo === "retorno" ? ETAPAS_RETORNO : ETAPAS_PRIMEIRA; }
  function totalPassos() { return etapas().length + 1; }   // + revisar e enviar
  function blocoDef(id) { return (estado.tipo === "retorno" ? V2.BLOCOS_RETORNO : V2.BLOCOS_PRIMEIRA).filter(function (b) { return b.id === id; })[0]; }
  function dados(b) { return (estado.formulario[b] = estado.formulario[b] || {}); }
  function tem(v) { return v !== null && v !== undefined && (typeof v !== "string" || v.trim() !== "") && (!Array.isArray(v) || v.length > 0); }

  /* ---------- servidor ---------- */
  function rpc(nome, args) {
    if (!sb) return Promise.reject(new Error("sem conexão"));
    return Promise.resolve(sb.rpc(nome, args)).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function conteudo() { return { formulario_versao: 2, tipo: estado.tipo, formulario: estado.formulario }; }
  function copiaLocal(gravar) {
    if (!CHAVE_LOCAL) return null;
    try {
      if (gravar) { localStorage.setItem(CHAVE_LOCAL, JSON.stringify({ em: new Date().toISOString(), formulario: estado.formulario })); return null; }
      return JSON.parse(localStorage.getItem(CHAVE_LOCAL) || "null");
    } catch (e) { return null; }
  }
  function apagarLocal() { try { if (CHAVE_LOCAL) localStorage.removeItem(CHAVE_LOCAL); } catch (e) { /* nada */ } }
  function pintarSalvo(txt, ruim) { var s = $("salvo"); if (s) { s.textContent = txt; s.className = "salvo" + (ruim ? " ruim" : ""); } }
  function hora(iso) { try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }

  function salvar() {
    clearTimeout(estado.timer);
    if (!estado.sujo || estado.enviado) return Promise.resolve(true);
    if (estado.salvando) { estado.timer = setTimeout(salvar, 800); return Promise.resolve(false); }
    estado.salvando = true; estado.sujo = false;
    pintarSalvo("Salvando…");
    return rpc("anamnese_publica_salvar", { p_token: token, p_conteudo: conteudo() }).then(function (r) {
      estado.salvando = false;
      pintarSalvo("Salvo às " + hora(r && r.salvo_em));
      return true;
    }, function (err) {
      estado.salvando = false; estado.sujo = true;
      var h = err && err.hint;
      if (h === "ja_enviada" || h === "link_revogado" || h === "link_expirado" || h === "link_invalido") { telaEstado(h === "ja_enviada" ? "concluido" : h === "link_revogado" ? "revogado" : h === "link_expirado" ? "expirado" : "invalido"); return false; }
      pintarSalvo("Sem conexão agora — o que você escreveu está guardado neste aparelho e será enviado assim que possível.", true);
      estado.timer = setTimeout(salvar, 8000);
      return false;
    });
  }
  function mudou() {
    estado.sujo = true;
    copiaLocal(true);
    pintarSalvo("Alterações não salvas…");
    clearTimeout(estado.timer);
    estado.timer = setTimeout(salvar, 1800);
  }

  /* ---------- campos ---------- */
  function idCampo(b, c, extra) { return "pa-" + b + "-" + c + (extra ? "-" + extra : ""); }
  function rotuloDe(b, f) { return ROTULO[b + "." + f.id] || f.rotulo; }

  function campoTexto(b, f) {
    var id = idCampo(b, f.id), d = dados(b);
    var inp = f.tipo === "area" ? el("textarea", { id: id, rows: 3 }) : el("input", { type: "text", id: id });
    inp.value = d[f.id] || "";
    inp.addEventListener("input", function () { d[f.id] = inp.value; mudou(); });
    var bloco = el("div", { class: "campo" }, [el("label", { for: id, texto: rotuloDe(b, f) })]);
    if (SENSIVEIS[b + "." + f.id]) {
      bloco.appendChild(el("p", { class: "ajuda", id: id + "-ajuda", texto: TXT_SENSIVEL }));
      inp.setAttribute("aria-describedby", id + "-ajuda");
      bloco.appendChild(inp);
      var chk = el("input", { type: "checkbox", id: id + "-nr" });
      chk.checked = d[f.id + "_prefiro_nao"] === true;
      inp.disabled = chk.checked;
      chk.addEventListener("change", function () {
        d[f.id + "_prefiro_nao"] = chk.checked;
        if (chk.checked) { d[f.id] = ""; inp.value = ""; }
        inp.disabled = chk.checked; mudou();
      });
      bloco.appendChild(el("label", { class: "nao-resp", for: id + "-nr" }, [chk, "Prefiro não responder"]));
    } else bloco.appendChild(inp);
    return bloco;
  }
  function campoChips(b, f) {
    var d = dados(b), nome = idCampo(b, f.id);
    var atual = f.multi ? (Array.isArray(d[f.id]) ? d[f.id] : []) : d[f.id];
    var grupo = el("div", { class: "chips" });
    f.opcoes.forEach(function (o, i) {
      var inp = el("input", { type: f.multi ? "checkbox" : "radio", name: nome, id: nome + "-" + i, value: o });
      inp.checked = f.multi ? atual.indexOf(o) >= 0 : atual === o;
      inp.addEventListener("change", function () {
        if (f.multi) {
          var lista = Array.isArray(d[f.id]) ? d[f.id].slice() : [];
          if (inp.checked && lista.indexOf(o) < 0) lista.push(o);
          if (!inp.checked) lista = lista.filter(function (x) { return x !== o; });
          d[f.id] = lista;
        } else d[f.id] = o;
        mudou();
      });
      grupo.appendChild(el("label", { class: "chip", for: nome + "-" + i }, [inp, el("span", { texto: o })]));
    });
    if (!f.multi) {
      var limpar = el("button", { type: "button", class: "btn btn-peq", texto: "Limpar" });
      limpar.addEventListener("click", function () { d[f.id] = ""; grupo.querySelectorAll("input").forEach(function (x) { x.checked = false; }); mudou(); });
      grupo.appendChild(limpar);
    }
    return el("fieldset", { class: "campo" }, [el("legend", { texto: rotuloDe(b, f) + (f.multi ? " (pode marcar mais de um)" : "") }), grupo]);
  }
  function campoSintoma(b, f) {
    var d = dados(b), nome = idCampo(b, f.id);
    var grupo = el("div", { class: "chips" });
    [["nao", "Não"], ["as_vezes", "Às vezes"], ["frequente", "Frequente"]].forEach(function (o, i) {
      var inp = el("input", { type: "radio", name: nome, id: nome + "-" + i, value: o[0] });
      inp.checked = d[f.id] === o[0];
      inp.addEventListener("change", function () { d[f.id] = o[0]; mudou(); });
      grupo.appendChild(el("label", { class: "chip", for: nome + "-" + i }, [inp, el("span", { texto: o[1] })]));
    });
    var det = el("input", { type: "text", id: nome + "-det", "aria-label": rotuloDe(b, f) + ": detalhes (opcional)", placeholder: "Detalhes (opcional)" });
    det.value = d[f.id + "_detalhe"] || "";
    det.style.marginTop = "8px";
    det.addEventListener("input", function () { d[f.id + "_detalhe"] = det.value; mudou(); });
    return el("fieldset", { class: "campo" }, [el("legend", { texto: rotuloDe(b, f) }), grupo, det]);
  }
  function campoMedida(b, f) {
    var d = dados(b), id = idCampo(b, f.id);
    var inp = el("input", { type: "text", inputmode: "decimal", id: id, autocomplete: "off" });
    inp.value = d[f.id] || "";
    inp.addEventListener("input", function () { d[f.id] = inp.value.replace(/[^0-9.,]/g, ""); mudou(); });
    var linha = el("div", { class: "linha-medida" }, [inp]);
    if (f.unidades.length > 1) {
      var sel = el("select", { id: id + "-un", "aria-label": "Unidade" });
      f.unidades.forEach(function (u) { var o = el("option", { value: u, texto: u }); if ((d[f.id + "_unidade"] || f.unidades[0]) === u) o.selected = true; sel.appendChild(o); });
      sel.addEventListener("change", function () { d[f.id + "_unidade"] = sel.value; mudou(); });
      linha.appendChild(sel);
    } else linha.appendChild(el("span", { texto: f.unidades[0], style: "align-self:center" }));
    return el("div", { class: "campo" }, [el("label", { for: id, texto: rotuloDe(b, f) }), linha]);
  }
  function campoLista(b, f) {
    var d = dados(b), id = idCampo(b, f.id);
    var caixa = el("fieldset", { class: "campo" }, [el("legend", { texto: rotuloDe(b, f) })]);
    var itens = el("div");
    var desenharItens = function () {
      itens.textContent = "";
      var lista = Array.isArray(d[f.id]) ? d[f.id] : [];
      lista.forEach(function (linha, i) {
        var item = el("div", { class: "lista-item" });
        f.colunas.forEach(function (col) {
          var ci = el("input", { type: "text", id: id + "-" + i + "-" + col[0], "aria-label": col[1] + " (" + (i + 1) + ")", placeholder: col[1] });
          ci.value = linha[col[0]] || "";
          ci.addEventListener("input", function () { linha[col[0]] = ci.value; mudou(); });
          item.appendChild(ci);
        });
        var tirar = el("button", { type: "button", class: "btn btn-peq", texto: "Remover" });
        tirar.addEventListener("click", function () { lista.splice(i, 1); mudou(); desenharItens(); });
        item.appendChild(tirar);
        itens.appendChild(item);
      });
    };
    desenharItens();
    caixa.appendChild(itens);
    var mais = el("button", { type: "button", class: "btn btn-peq", texto: "+ Adicionar " + (f.item || "item") });
    mais.addEventListener("click", function () {
      d[f.id] = Array.isArray(d[f.id]) ? d[f.id] : [];
      d[f.id].push({});
      d[f.id + "_nega"] = false; if (nega) nega.checked = false;
      mudou(); desenharItens();
      var primeiro = itens.querySelector(".lista-item:last-child input"); if (primeiro) primeiro.focus();
    });
    caixa.appendChild(el("div", { style: "margin-top:8px" }, [mais]));
    var nega = null;
    if (f.nega) {
      nega = el("input", { type: "checkbox", id: id + "-nega" });
      nega.checked = d[f.id + "_nega"] === true;
      nega.addEventListener("change", function () { d[f.id + "_nega"] = nega.checked; if (nega.checked) { d[f.id] = []; desenharItens(); } mudou(); });
      caixa.appendChild(el("label", { class: "nao-resp", for: id + "-nega" }, [nega, f.nega.replace("Nega", "Não tenho").replace("Não usa", "Não uso")]));
    }
    return caixa;
  }
  function campo(b, f) {
    if (f.tipo === "texto" || f.tipo === "area") return campoTexto(b, f);
    if (f.tipo === "chips") return campoChips(b, f);
    if (f.tipo === "sintoma") return campoSintoma(b, f);
    if (f.tipo === "medida") return campoMedida(b, f);
    if (f.tipo === "lista") return campoLista(b, f);
    return null;
  }

  /* ---------- telas ---------- */
  function cabecalho(info) {
    var c = $("cabeca"); c.textContent = "";
    var p = (info && info.profissional) || {};
    if (p.cor_primaria && /^#[0-9a-fA-F]{6}$/.test(p.cor_primaria)) document.documentElement.style.setProperty("--primaria", p.cor_primaria);
    if (p.cor_secundaria && /^#[0-9a-fA-F]{6}$/.test(p.cor_secundaria)) document.documentElement.style.setProperty("--secundaria", p.cor_secundaria);
    if (p.nome) {
      var prof = el("div", { class: "prof" });
      if (p.logo && /^data:image\/(png|jpeg|webp);base64,/.test(p.logo)) prof.appendChild(el("img", { src: p.logo, alt: "Logo de " + p.nome }));
      prof.appendChild(el("div", {}, [el("b", { texto: p.nome }), el("span", { texto: [p.profissao, p.registro].filter(Boolean).join(" · ") })]));
      c.appendChild(prof);
    }
    var nome = info && info.paciente && info.paciente.primeiro_nome;
    c.appendChild(el("p", { class: "olho", texto: "Anamnese pré-consulta" }));
    c.appendChild(el("h1", { texto: nome ? "Olá, " + nome + "!" : "Olá!" }));
    c.appendChild(el("p", { texto: "Antes da consulta, responda com calma. Leva uns 10 minutos, nada é obrigatório e tudo é salvo sozinho: você pode parar e continuar depois por este mesmo link." }));
  }
  function telaEstado(qual, quando) {
    estado.enviado = qual === "concluido";
    clearTimeout(estado.timer);
    $("barra").hidden = true; $("nav").hidden = true;
    var main = $("conteudo"); main.textContent = "";
    var txt = {
      invalido: ["Link não encontrado", "Este link não é válido. Confira se ele foi copiado inteiro ou peça um novo à sua nutricionista."],
      revogado: ["Este link foi substituído", "A sua nutricionista gerou um novo link. Use o mais recente que ela enviou."],
      expirado: ["Este link venceu", "O prazo para responder terminou. Peça um novo link à sua nutricionista."],
      concluido: ["Anamnese enviada!", "Obrigada! Suas respostas chegaram para a sua nutricionista" + (quando ? " em " + new Date(quando).toLocaleString("pt-BR") : "") + ". Se quiser corrigir alguma coisa, fale com ela: o envio não pode ser alterado por este link."],
      erro: ["Não foi possível abrir", "Confira a sua internet e tente de novo em instantes."]
    }[qual] || ["", ""];
    if (qual === "concluido") apagarLocal();
    var h = el("h2", { texto: txt[0], tabindex: "-1" });
    main.appendChild(el("div", { class: "aviso", role: "status" }, [h, el("p", { texto: txt[1] })]));
    if (qual === "erro") { var b = el("button", { type: "button", class: "btn btn-pri", texto: "Tentar de novo" }); b.addEventListener("click", iniciar); main.appendChild(b); }
    h.focus();
  }
  function telaPasso() {
    var main = $("conteudo"); main.textContent = "";
    var total = totalPassos(), i = estado.passo;
    $("passo-txt").innerHTML = "";
    $("passo-txt").appendChild(el("span", {}, ["Etapa ", el("b", { texto: String(i + 1) }), " de " + total]));
    $("trilho").style.width = Math.round(((i + 1) / total) * 100) + "%";
    $("btn-voltar").disabled = i === 0;
    var seguir = $("btn-seguir");
    if (i === total - 1) return telaRevisar();
    seguir.textContent = i === total - 2 ? "Revisar respostas" : "Continuar";
    var et = etapas()[i], b = blocoDef(et.bloco);
    var h = el("h2", { texto: et.titulo, tabindex: "-1" });
    main.appendChild(h);
    main.appendChild(el("p", { class: "intro", texto: et.intro }));
    (b ? b.campos : []).forEach(function (f) {
      if (et.so && et.so.indexOf(f.id) < 0) return;
      var n = campo(et.bloco, f); if (n) main.appendChild(n);
    });
    if (i === 0) main.appendChild(el("p", { class: "privacidade", texto: "Suas respostas vão só para a sua nutricionista e ajudam a preparar o atendimento. Este formulário não é diagnóstico." }));
    h.focus();
    window.scrollTo(0, 0);
  }
  function valorTexto(f, d) {
    var v = d[f.id];
    if (f.tipo === "chips") return Array.isArray(v) ? v.join(", ") : (v || "");
    if (f.tipo === "sintoma") return v ? ({ nao: "Não", as_vezes: "Às vezes", frequente: "Frequente" }[v] || "") + (tem(d[f.id + "_detalhe"]) ? " — " + d[f.id + "_detalhe"] : "") : "";
    if (f.tipo === "medida") return tem(v) ? v + " " + (d[f.id + "_unidade"] || f.unidades[0]) : "";
    if (f.tipo === "lista") {
      var l = (Array.isArray(v) ? v : []).filter(function (x) { return x && tem(x.nome); });
      if (!l.length && d[f.id + "_nega"] === true) return "Não";
      return l.map(function (x) { return f.colunas.map(function (c) { return x[c[0]]; }).filter(tem).join(" · "); }).join("\n");
    }
    if (d[f.id + "_prefiro_nao"] === true) return "Prefiro não responder";
    return v || "";
  }
  function telaRevisar() {
    var main = $("conteudo"); main.textContent = "";
    var seguir = $("btn-seguir"); seguir.textContent = "Enviar anamnese";
    var h = el("h2", { texto: "Revisar e enviar", tabindex: "-1" });
    main.appendChild(h);
    main.appendChild(el("p", { class: "intro", texto: "Confira o que você respondeu. Para mudar algo, volte à etapa. Depois de enviar, as respostas não podem ser alteradas por este link." }));
    var rev = el("div", { class: "revisao" }), algum = false;
    etapas().forEach(function (et, idx) {
      var b = blocoDef(et.bloco), d = dados(et.bloco), dl = el("dl");
      (b ? b.campos : []).forEach(function (f) {
        if (et.so && et.so.indexOf(f.id) < 0) return;
        var t = valorTexto(f, d);
        if (tem(t)) { algum = true; dl.appendChild(el("dt", { texto: rotuloDe(et.bloco, f) })); dl.appendChild(el("dd", { texto: t })); }
      });
      var ir = el("button", { type: "button", class: "btn btn-peq", texto: "Editar esta etapa" });
      ir.addEventListener("click", function () { estado.passo = idx; telaPasso(); });
      rev.appendChild(el("h3", { texto: et.titulo }));
      rev.appendChild(dl.childNodes.length ? dl : el("p", { class: "intro", texto: "Nada respondido." }));
      rev.appendChild(ir);
    });
    main.appendChild(rev);
    main.appendChild(el("p", { class: "erro", id: "erro-envio", role: "alert" }));
    seguir.disabled = !algum;
    if (!algum) $("erro-envio").textContent = "Responda ao menos uma pergunta para enviar.";
    h.focus(); window.scrollTo(0, 0);
  }
  function enviar() {
    var b = $("btn-seguir");
    if (b.disabled) return;
    b.disabled = true; b.textContent = "Enviando…";
    clearTimeout(estado.timer);
    rpc("anamnese_publica_enviar", { p_token: token, p_conteudo: conteudo() }).then(function (r) {
      telaEstado("concluido", r && r.enviado_em);
    }, function (err) {
      var h = err && err.hint;
      if (h === "ja_enviada") return telaEstado("concluido");
      if (h === "link_revogado") return telaEstado("revogado");
      if (h === "link_expirado") return telaEstado("expirado");
      b.disabled = false; b.textContent = "Enviar anamnese";
      var e = $("erro-envio"); if (e) e.textContent = h === "vazio" ? "Responda ao menos uma pergunta para enviar." : "Não foi possível enviar agora. Confira a internet e tente de novo — nada se perdeu.";
    });
  }

  function iniciar() {
    if (!token) { cabecalho(null); return telaEstado("invalido"); }
    if (!V2) { cabecalho(null); return telaEstado("erro"); }
    rpc("anamnese_publica_abrir", { p_token: token }).then(function (info) {
      cabecalho(info && info.estado === "aberto" ? info : null);
      if (!info || info.estado !== "aberto") return telaEstado(info ? info.estado : "invalido", info && info.enviado_em);
      estado.info = info;
      estado.tipo = info.tipo === "retorno" ? "retorno" : "primeira";
      estado.formulario = (info.rascunho && info.rascunho.formulario) || {};
      /* copia de seguranca deste aparelho mais nova que o servidor (ficou sem rede): ela vale e sobe agora */
      var loc = copiaLocal(false);
      if (loc && loc.formulario && (!info.salvo_em || Date.parse(loc.em) > Date.parse(info.salvo_em)) && JSON.stringify(loc.formulario) !== JSON.stringify(estado.formulario)) {
        estado.formulario = loc.formulario; estado.sujo = true; salvar();
      } else if (info.salvo_em) pintarSalvo("Salvo às " + hora(info.salvo_em));
      $("barra").hidden = false; $("nav").hidden = false;
      telaPasso();
    }, function () { cabecalho(null); telaEstado("erro"); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("btn-voltar").addEventListener("click", function () { if (estado.passo > 0) { salvar(); estado.passo--; telaPasso(); } });
    $("btn-seguir").addEventListener("click", function () {
      if (estado.passo >= totalPassos() - 1) return enviar();
      salvar(); estado.passo++; telaPasso();
    });
    /* outro link colado na mesma aba (so o "#" muda): recomeca com o token novo */
    window.addEventListener("hashchange", function () { window.location.reload(); });
    window.addEventListener("pagehide", function () { if (estado.sujo) { copiaLocal(true); salvar(); } });
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden" && estado.sujo) salvar(); });
    iniciar();
  });

  window.AnamnesePublica = { estado: function () { return estado; } };
})();
