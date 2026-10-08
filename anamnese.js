/* ===========================================================================
   ANAMNESE ESTRUTURADA — V1, Etapa 2
   ===========================================================================

   A anamnese pertence a UM atendimento (encounters). Cada revisao e uma linha
   em `anamneses`: o RASCUNHO e editavel e retomavel; SALVO e REVISADO sao
   imutaveis — corrigir cria uma revisao nova e a anterior fica (autoria e
   datas preservadas). Nada aqui interpreta, pontua ou preenche o HOLOSCAN.

   Conteudo (JSONB versionado, validado no servidor):
     dominios -> itens -> { campo, valor, estado, origem, medida?, previo?, fonte_anamnese_id? }
     estado:  informado | negado_explicitamente | desconhecido | nao_investigado | nao_aplicavel | recusado
     origem:  relato_paciente | observacao_profissional | documento_externo | dado_medido
   Item ausente ou valor vazio NAO e "negado": so negado_explicitamente nega.
   Diagnostico informado continua "informado". Medida exige unidade (nenhuma
   unidade padrao, nenhuma conversao).

   "Criar a partir da anamnese anterior" e acao explicita: copia os itens como
   PREVIOS (a revisar), com a origem visivel; nunca toca o HOLOSCAN.

   Com sessao, o servidor e a fonte (RPCs salvar_anamnese e
   criar_anamnese_a_partir_de). Sem sessao (localhost, desenvolvimento) fica em
   memoria nesta pagina.
   =========================================================================== */

(function () {
  "use strict";

  var DOMINIOS = [
    ["motivo_objetivo", "Motivo e objetivo"],
    ["historia_alimentar", "História alimentar"],
    ["rotina_acesso", "Rotina e acesso a alimentos"],
    ["sono", "Sono"],
    ["atividade_fisica", "Atividade física"],
    ["sintomas_relatados", "Sintomas relatados"],
    ["condicoes_diagnosticos_informados", "Condições e diagnósticos informados"],
    ["medicamentos", "Medicamentos"],
    ["suplementos", "Suplementos"],
    ["alergias_informadas", "Alergias informadas"],
    ["intolerancias_informadas", "Intolerâncias informadas"],
    ["antecedentes", "Antecedentes relevantes"],
    ["contexto_familiar", "Contexto familiar"],
    ["contexto_social", "Contexto social"],
    ["avaliacoes", "Avaliações pertinentes"],
    ["medidas", "Medidas pertinentes"],
    ["emocional", "Campos emocionais (opcional)"],
    ["sentido_pessoal", "Sentido pessoal (opcional)"]
  ];
  var ESTADOS = [
    ["informado", "Informado"], ["negado_explicitamente", "Negado explicitamente"],
    ["desconhecido", "Desconhecido"], ["nao_investigado", "Não investigado"],
    ["nao_aplicavel", "Não aplicável"], ["recusado", "Recusado"]
  ];
  var ORIGENS = [
    ["relato_paciente", "Relato do paciente"], ["observacao_profissional", "Observação profissional"],
    ["documento_externo", "Documento externo"], ["dado_medido", "Dado medido"]
  ];
  var ROTULO = {};
  ESTADOS.concat(ORIGENS).forEach(function (p) { ROTULO[p[0]] = p[1]; });
  DOMINIOS.forEach(function (p) { ROTULO[p[0]] = p[1]; });
  var MSG_SEM_ATENDIMENTO = "Selecione ou inicie um atendimento para registrar a anamnese.";
  var MSG_INFORMADO = "Informado pelo paciente: não é diagnóstico confirmado.";

  var cache = [];           // todas as revisoes carregadas (sessao) ou em memoria (local)
  var locais = [];
  var carregando = false;
  var rascunho = null;      // { id|null, encounter_id, content } em edicao nesta tela
  var estadoSalvo = "";     // "" | salvando | rascunho | salvo | revisado | falha | conflito
  var abertos = {};         // dominios expandidos
  var escapar = window.escapar;

  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function tabela() { return window.DadosRouter ? window.DadosRouter.from("anamneses") : null; }
  function novoId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16); });
  }
  function agora() { return new Date().toISOString(); }
  function consolidada(a) { return a && (a.status === "salvo" || a.status === "revisado"); }

  /* ---------- dados ---------------------------------------------------------- */

  function carregar() {
    if (!temSupa()) { cache = locais.slice(); return Promise.resolve(cache); }
    var t = tabela(); if (!t) return Promise.resolve(cache);
    carregando = true;
    return Promise.resolve(t.select("*").order("created_at", { ascending: true }))
      .then(function (r) { if (r && !r.error && Array.isArray(r.data)) cache = r.data; return cache; })
      .catch(function (e) { console.error("[anamnese] carregar:", e); return cache; })
      .finally(function () { carregando = false; });
  }
  function doAtendimento(eid) {
    return cache.filter(function (a) { return a.encounter_id === eid; })
      .sort(function (a, b) { return a.revision_number - b.revision_number; })
      .map(function (a) { return Object.assign({}, a); });
  }
  /** A revisao vigente: a maior revision_number salva/revisada. Rascunho nunca. */
  function vigente(eid) {
    var l = doAtendimento(eid).filter(consolidada);
    return l.length ? l[l.length - 1] : null;
  }
  function rascunhoDe(eid) { return doAtendimento(eid).filter(function (a) { return a.status === "rascunho"; })[0] || null; }
  function doPaciente(pid) {
    return cache.filter(function (a) { return a.patient_id === pid; }).map(function (a) { return Object.assign({}, a); });
  }
  /** A ultima anamnese consolidada do paciente em OUTRO atendimento (para copiar). */
  function anteriorDe(pid, eid) {
    var A = window.AtendimentoAtual;
    var l = doPaciente(pid).filter(function (a) { return a.encounter_id !== eid && consolidada(a) && !a.superseded_at; });
    l.sort(function (a, b) {
      var ea = A && A.porId(a.encounter_id), eb = A && A.porId(b.encounter_id);
      return String((eb && eb.occurred_at) || b.created_at).localeCompare(String((ea && ea.occurred_at) || a.created_at));
    });
    return l[0] || null;
  }

  /** A ultima anamnese COMPLETA consolidada (primeira consulta V2 ou formato antigo) de outro atendimento:
      e dela que se copia e e ela que o retorno mostra em "Ver anamnese completa anterior". */
  function anteriorCompletaDe(pid, eid) {
    var A = window.AtendimentoAtual, V2 = window.AnamneseV2;
    var l = doPaciente(pid).filter(function (a) { return a.encounter_id !== eid && consolidada(a) && !a.superseded_at &&
      !(V2 && V2.ehV2(a.content) && a.content.tipo === "retorno"); });
    l.sort(function (a, b) {
      var ea = A && A.porId(a.encounter_id), eb = A && A.porId(b.encounter_id);
      return String((eb && eb.occurred_at) || b.created_at).localeCompare(String((ea && ea.occurred_at) || a.created_at));
    });
    return l[0] || null;
  }

  /* ---------- gravar ------------------------------------------------------------ */

  function gravarLocal(payload) {
    var a = payload.id ? locais.filter(function (x) { return x.id === payload.id; })[0] : null;
    var status = payload.status || "rascunho";
    if (payload.operation_id) {
      var ja = locais.filter(function (x) { return x.operation_id === payload.operation_id; })[0];
      if (ja) return Promise.resolve(ja.id);
    }
    if (a && a.status === "rascunho") {
      if (payload.expected_updated_at && a.updated_at !== payload.expected_updated_at) return Promise.reject(new Error("conflito"));
      Object.assign(a, { content: payload.content || a.content, status: status, updated_at: agora(),
        reviewed_at: status === "revisado" ? agora() : null, revision_note: payload.revision_note || a.revision_note || null });
      return Promise.resolve(a.id);
    }
    var eid = a ? a.encounter_id : payload.encounter_id;
    var e = window.AtendimentoAtual && window.AtendimentoAtual.porId(eid);
    if (!e) return Promise.reject(new Error("atendimento nao encontrado"));
    var rev = locais.filter(function (x) { return x.encounter_id === eid; }).length + 1;
    var linha = { id: novoId(), nutritionist_id: null, patient_id: e.patient_id, encounter_id: eid, revision_number: rev,
      status: status, content_version: 1, content: payload.content || (a ? a.content : {}),
      source_anamnesis_id: a ? a.source_anamnesis_id : (payload.source_anamnesis_id || null),
      copied_from_previous: a ? a.copied_from_previous : !!payload.copied_from_previous,
      supersedes_id: a ? a.id : null, superseded_at: null, revision_note: payload.revision_note || null,
      reviewed_at: status === "revisado" ? agora() : null, reviewed_by: null, operation_id: payload.operation_id || null,
      created_at: agora(), updated_at: agora() };
    if (a) a.superseded_at = agora();
    locais.push(linha);
    return Promise.resolve(linha.id);
  }

  /** Grava (rascunho, salvo ou revisado). So devolve depois do servidor. */
  function salvar(payload) {
    if (!payload || !payload.encounter_id && !payload.id) return Promise.reject(new Error("anamnese sem atendimento"));
    var p = Object.assign({ operation_id: novoId() }, payload);
    var feito = temSupa()
      ? Promise.resolve(window.supabaseClient.rpc("salvar_anamnese", { payload: p })).then(function (r) {
          if (!r || r.error) throw (r && r.error) || new Error("sem resposta do servidor");
          return r.data;
        })
      : gravarLocal(p);
    return feito.then(function (id) { return carregar().then(function () { avisarMudanca(); return cache.filter(function (a) { return a.id === id; })[0] || { id: id }; }); });
  }

  function criarAPartirDe(eid, sourceId) {
    var op = novoId();
    var feito;
    if (temSupa()) {
      feito = Promise.resolve(window.supabaseClient.rpc("criar_anamnese_a_partir_de",
        { p_encounter_id: eid, p_source_id: sourceId, p_operation_id: op })).then(function (r) {
          if (!r || r.error) throw (r && r.error) || new Error("sem resposta do servidor");
          return r.data;
        });
    } else {
      var fonte = locais.filter(function (x) { return x.id === sourceId; })[0];
      if (!fonte || !consolidada(fonte)) return Promise.reject(new Error("anamnese de origem nao encontrada"));
      var e = window.AtendimentoAtual && window.AtendimentoAtual.porId(eid);
      if (!e || e.patient_id !== fonte.patient_id) return Promise.reject(new Error("anamnese de origem e de outro paciente"));
      if (rascunhoDe(eid)) return Promise.reject(new Error("este atendimento ja tem um rascunho"));
      var conteudo = { dominios: {} };
      Object.keys((fonte.content || {}).dominios || {}).forEach(function (k) {
        conteudo.dominios[k] = { itens: ((fonte.content.dominios[k] || {}).itens || []).map(function (it) {
          return Object.assign({}, it, { previo: true, fonte_anamnese_id: fonte.id }); }) };
      });
      feito = gravarLocal({ encounter_id: eid, content: conteudo, status: "rascunho", source_anamnesis_id: fonte.id,
        copied_from_previous: true, operation_id: op });
    }
    return feito.then(function (id) { return carregar().then(function () { avisarMudanca(); return cache.filter(function (a) { return a.id === id; })[0]; }); });
  }

  var ouvintes = [];
  function avisarMudanca() { ouvintes.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }

  /* ---------- resumo (visao geral, timeline, contexto, exportacao) ------------- */

  function contarItens(c) {
    var n = 0, d = (c || {}).dominios || {};
    Object.keys(d).forEach(function (k) { n += ((d[k] || {}).itens || []).length; });
    return n;
  }
  /** Texto bruto de UMA anamnese consolidada: so o que a profissional registrou,
      com estado e origem explicitos. Nenhuma interpretacao. */
  function textoBruto(a) {
    if (!a || !consolidada(a)) return "";
    var d = (a.content || {}).dominios || {}, t = "";
    DOMINIOS.forEach(function (p) {
      var itens = ((d[p[0]] || {}).itens || []);
      if (!itens.length) return;
      t += "- " + p[1] + ":\n";
      itens.forEach(function (it) {
        t += "  - " + (it.campo || "(sem rótulo)") + ": " + (it.estado === "informado" ? (it.valor || "") : "[" + ROTULO[it.estado] + "]") +
          (it.medida && it.medida.valor != null ? " " + it.medida.valor + " " + (it.medida.unidade || "") + (it.medida.data ? " em " + it.medida.data : "") : "") +
          " (" + (ROTULO[it.origem] || it.origem) + (it.previo ? "; informação prévia copiada, a revisar" : "") +
          (p[0] === "condicoes_diagnosticos_informados" && it.origem === "relato_paciente" ? "; informado, não confirmado" : "") + ")\n";
      });
    });
    return t;
  }

  /* ---------- a tela ------------------------------------------------------------ */

  function atendimentoAtivo() {
    var A = window.AtendimentoAtual; var pid = window.pacienteAtivoId ? window.pacienteAtivoId() : null;
    var e = A && A.atual ? A.atual() : null;
    return e && e.patient_id === pid ? e : null;
  }

  function conteudoVazio() { return { dominios: {} }; }

  function itemNovo() { return { campo: "", valor: "", estado: "informado", origem: "relato_paciente", medida: null, previo: false }; }

  function selectHtml(nome, opcoes, valor) {
    return '<select data-an-campo="' + nome + '">' + opcoes.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === valor ? " selected" : "") + ">" + escapar(o[1]) + "</option>";
    }).join("") + "</select>";
  }

  function itemHtml(dom, it, i, editavel) {
    var medida = it.medida || null;
    var informado = dom === "condicoes_diagnosticos_informados" && it.origem === "relato_paciente";
    var cab = '<div class="an-item' + (it.previo ? " previo" : "") + '" data-an-dom="' + dom + '" data-an-i="' + i + '">' +
      (it.previo ? '<span class="an-selo previo" title="Copiado da anamnese anterior; precisa ser revisado">prévio — a revisar</span>' : "") +
      (informado ? '<span class="an-selo informado" title="' + MSG_INFORMADO + '">informado, não confirmado</span>' : "");
    if (!editavel) {
      return cab + "<b>" + escapar(it.campo || "(sem rótulo)") + "</b> " +
        (it.estado === "informado" ? escapar(it.valor || "") : '<i class="an-estado">' + escapar(ROTULO[it.estado] || it.estado) + "</i>") +
        (medida && medida.valor != null ? ' <span class="an-medida">' + escapar(String(medida.valor)) + " " + escapar(medida.unidade || "") +
          (medida.data ? " · " + escapar(window.dataBR ? window.dataBR(medida.data) : medida.data) : "") +
          (medida.metodo ? " · " + escapar(medida.metodo) : "") + (medida.responsavel ? " · " + escapar(medida.responsavel) : "") + "</span>" : "") +
        ' <span class="an-origem">' + escapar(ROTULO[it.origem] || it.origem) + "</span></div>";
    }
    return cab +
      '<div class="an-linha">' +
        '<input type="text" data-an-campo="campo" placeholder="O que foi perguntado/observado" value="' + escapar(it.campo || "") + '">' +
        selectHtml("estado", ESTADOS, it.estado) +
        selectHtml("origem", ORIGENS, it.origem) +
        '<button type="button" class="btn-fantasma" data-an-remover="1" aria-label="Remover item">remover</button>' +
      "</div>" +
      '<div class="an-linha">' +
        '<input type="text" data-an-campo="valor" placeholder="' + (it.estado === "informado" ? "O que foi informado" : "Observação (opcional)") + '" value="' + escapar(it.valor || "") + '">' +
        '<label class="an-check"><input type="checkbox" data-an-campo="tem_medida"' + (medida ? " checked" : "") + "> medida</label>" +
      "</div>" +
      (medida ? '<div class="an-linha an-medida-form">' +
        '<input type="number" step="any" data-an-campo="m_valor" placeholder="valor" value="' + (medida.valor != null ? escapar(String(medida.valor)) : "") + '">' +
        '<input type="text" data-an-campo="m_unidade" placeholder="unidade (obrigatória)" value="' + escapar(medida.unidade || "") + '">' +
        '<input type="date" data-an-campo="m_data" value="' + escapar(medida.data || "") + '">' +
        '<input type="text" data-an-campo="m_metodo" placeholder="método" value="' + escapar(medida.metodo || "") + '">' +
        '<input type="text" data-an-campo="m_responsavel" placeholder="responsável" value="' + escapar(medida.responsavel || "") + '">' +
      "</div>" : "") +
    "</div>";
  }

  function dominioHtml(dom, rot, itens, editavel) {
    var aberto = abertos[dom] || itens.length > 0;
    return '<details class="an-dominio" data-an-dominio="' + dom + '"' + (aberto ? " open" : "") + ">" +
      "<summary><b>" + escapar(rot) + "</b> <span class=\"an-conta\">" + (itens.length ? itens.length + (itens.length === 1 ? " item" : " itens") : "nada registrado") + "</span></summary>" +
      itens.map(function (it, i) { return itemHtml(dom, it, i, editavel); }).join("") +
      (editavel ? '<button type="button" class="btn-fantasma" data-an-adicionar="' + dom + '">+ adicionar item</button>' : "") +
      (!itens.length && !editavel ? '<p class="perf-ajuda">Nada registrado neste domínio — ausência de registro não é negação.</p>' : "") +
    "</details>";
  }

  function textoEstado() {
    return { "": "", salvando: "Salvando…", rascunho: "Rascunho salvo", salvo: "Salvo", revisado: "Revisado",
             falha: "Não foi possível salvar — nada mudou no servidor", conflito: "Alterada em outro lugar — recarregue antes de salvar" }[estadoSalvo] || "";
  }

  function revisoesHtml(lista) {
    if (!lista.length) return "";
    return '<div class="an-revisoes"><span class="fic-rot">Revisões deste atendimento</span><ul>' + lista.map(function (a) {
      return "<li" + (a.status === "rascunho" ? ' class="rascunho"' : "") + '><b>rev. ' + a.revision_number + "</b> · " + a.status +
        (a.copied_from_previous ? " · criada a partir da anterior" : "") +
        (a.reviewed_at ? " · revisada em " + escapar((window.dataBR ? window.dataBR(a.reviewed_at.slice(0, 10)) : a.reviewed_at)) : "") +
        (a.superseded_at ? " · substituída" : "") +
        (a.revision_note ? " · " + escapar(a.revision_note) : "") +
        (consolidada(a) && !a.superseded_at ? "" : (consolidada(a) ? ' <button type="button" class="btn-fantasma" data-an-ver="' + a.id + '">ver</button>' : "")) +
        "</li>";
    }).join("") + "</ul></div>";
  }

  var vendo = null;   // id de uma revisao antiga aberta so para leitura
  var v2Corrigindo = null;   // id da revisao V2 vigente sendo corrigida (antes do 1o salvamento automatico)

  function desenhar() {
    var alvo = document.getElementById("aba-anamnese");
    if (!alvo) return;
    var e = atendimentoAtivo();
    if (!e) {
      rascunho = null;
      alvo.innerHTML = '<div class="lista-vazia" id="an-sem-atendimento"><strong>' + MSG_SEM_ATENDIMENTO + "</strong>" +
        "<span>A anamnese pertence a um atendimento. Na aba Atendimentos, selecione um ou inicie um novo.</span></div>";
      return;
    }
    var pid = e.patient_id;
    var nome = window.pacienteAtivoNome ? window.pacienteAtivoNome() : "Paciente";
    var A = window.AtendimentoAtual;
    var lista = doAtendimento(e.id);
    var rasc = rascunhoDe(e.id);
    var vig = vigente(e.id);
    var anterior = !lista.length ? anteriorDe(pid, e.id) : null;
    var arquivado = window.pacienteArquivado && window.pacienteArquivado(pid);

    if (rasc && (!rascunho || rascunho.id !== rasc.id)) rascunho = { id: rasc.id, encounter_id: e.id, content: JSON.parse(JSON.stringify(rasc.content || conteudoVazio())), updated_at: rasc.updated_at };
    if (!rasc && rascunho && rascunho.id) rascunho = null;

    /* ANAMNESE V2 (anamnese-v2.js): rascunho novo nasce V2; anamnese antiga (sem formulario_versao) segue no
       formato antigo, sem conversao. O roteamento e so pelo marcador do conteudo gravado. */
    var V2 = window.AnamneseV2;
    var vendoLinha = vendo ? lista.filter(function (a) { return a.id === vendo; })[0] : null;
    var modoV2 = null;
    if (V2) {
      if (vendoLinha) modoV2 = V2.ehV2(vendoLinha.content) ? { ro: true, base: vendoLinha } : null;
      else if (rasc) modoV2 = V2.ehV2(rasc.content) ? { base: rasc } : null;
      else if (rascunho) modoV2 = null;                                   // correcao de anamnese ANTIGA em memoria
      else if (v2Corrigindo && vig && v2Corrigindo === vig.id) modoV2 = { base: vig, corrigir: true };
      else if (vig) modoV2 = V2.ehV2(vig.content) ? { ro: true, base: vig } : null;
      else modoV2 = { base: null };                                       // nova: sempre V2
    }

    var html = '<div class="an-topo">' +
      '<div><span class="fic-rot">Anamnese</span><b>' + escapar(nome) + "</b> · atendimento de " + escapar(A.rotuloQuando(e)) +
        (e.consultation_id ? " (com agendamento)" : " (sem agendamento)") + "</div>" +
      '<span class="an-salvo" id="an-estado" role="status" aria-live="polite">' + escapar(textoEstado()) + "</span>" +
    "</div>";

    if (vig) {
      html += '<p class="perf-ajuda">Revisão vigente: <b>rev. ' + vig.revision_number + " · " + vig.status + "</b>" +
        (vig.reviewed_at ? ", conferida em " + escapar(window.dataBR ? window.dataBR(vig.reviewed_at.slice(0, 10)) : vig.reviewed_at) : "") + ".</p>";
    }
    html += revisoesHtml(lista);

    if (modoV2) {
      html += '<div class="an-acoes">';
      if (vendo) html += '<button type="button" class="perf-botao" data-an-acao="fechar-ver">Voltar</button>';
      else if (modoV2.ro && !arquivado) {
        html += '<button type="button" class="perf-botao" data-an-acao="corrigir">Corrigir (nova revisão)</button>';
        if (vig && vig.status === "salvo") html += '<button type="button" class="btn-dourado" data-an-acao="revisar">Marcar como revisada</button>';
      }
      html += "</div>";
      if (modoV2.ro) html += '<p class="an-titulo"><b>' + escapar(vendo ? "Revisão " + vendoLinha.revision_number + " (histórico, somente leitura)" : "Revisão vigente (rev. " + vig.revision_number + ")") + "</b></p>";
      if (arquivado && !modoV2.ro) html += '<p class="perf-ajuda">' + escapar(window.MSG_ARQUIVADO || "Paciente arquivado.") + "</p>";
      html += '<div id="an2-corpo"></div>';
      alvo.innerHTML = html;
      var ant = anteriorCompletaDe(pid, e.id);
      var antHtml = ant ? '<p class="perf-ajuda">Anamnese de ' + escapar(A.porId(ant.encounter_id) ? A.rotuloQuando(A.porId(ant.encounter_id)) : "atendimento anterior") + " · rev. " + ant.revision_number + " · " + escapar(ant.status) + " (somente leitura)</p>" +
        (V2.ehV2(ant.content) ? V2.resumoHtml(ant.content) : "") +
        '<div class="an-dominios">' + DOMINIOS.map(function (p) { var it = (((ant.content || {}).dominios || {})[p[0]] || {}).itens || []; return it.length ? dominioHtml(p[0], p[1], it, false) : ""; }).join("") + "</div>" : "";
      var perfil = window.PerfilProfissional && window.PerfilProfissional.dados ? window.PerfilProfissional.dados() : {};
      V2.desenhar(document.getElementById("an2-corpo"), {
        encounter: e, base: modoV2.base, somenteLeitura: !!modoV2.ro || !!arquivado, recomecar: !!modoV2.corrigir && !V2.estado(),
        anterior: ant, anteriorHtml: antHtml, sugerirRetorno: !!anteriorDe(pid, e.id) && !modoV2.base,
        linha: modoV2.base || null, autoria: perfil && perfil.nome ? perfil.nome : null, consulta: A.rotuloQuando(e),
        salvar: salvar, redesenhar: desenhar, recarregar: function () { carregar().then(desenhar); }
      });
      return;
    }

    var mostrar = null, editavel = false, titulo = "";
    if (vendo) { mostrar = lista.filter(function (a) { return a.id === vendo; })[0]; titulo = mostrar ? "Revisão " + mostrar.revision_number + " (histórico, somente leitura)" : ""; }
    if (!mostrar && rascunho) { mostrar = { content: rascunho.content, status: "rascunho" }; editavel = !arquivado; titulo = rascunho.id ? "Rascunho em edição" : "Nova anamnese (ainda não salva)"; }
    if (!mostrar && vig) { mostrar = vig; titulo = "Revisão vigente (rev. " + vig.revision_number + ")"; }

    html += '<div class="an-acoes">';
    if (vendo) html += '<button type="button" class="perf-botao" data-an-acao="fechar-ver">Voltar</button>';
    else if (!rascunho && !vig && !arquivado) {
      html += '<button type="button" class="btn-verde" data-an-acao="nova">Iniciar anamnese</button>';
      if (anterior) html += '<button type="button" class="perf-botao" data-an-acao="copiar" data-an-fonte="' + escapar(anterior.id) + '">Criar a partir da anamnese anterior</button>';
    } else if (!rascunho && vig && !arquivado) {
      html += '<button type="button" class="perf-botao" data-an-acao="corrigir">Corrigir (nova revisão)</button>';
      if (vig.status === "salvo") html += '<button type="button" class="btn-dourado" data-an-acao="revisar">Marcar como revisada</button>';
    } else if (rascunho && !arquivado) {
      html += '<button type="button" class="perf-botao" data-an-acao="rascunho">Salvar rascunho</button>' +
        '<button type="button" class="btn-verde" data-an-acao="salvar">Salvar</button>' +
        (rascunho.id && vig ? '<button type="button" class="btn-fantasma" data-an-acao="descartar">Descartar correção</button>' : "");
    }
    html += "</div>";

    if (mostrar) {
      html += '<p class="an-titulo"><b>' + escapar(titulo) + "</b>" +
        (mostrar.copied_from_previous || (rascunho && rasc && rasc.copied_from_previous) ? ' <span class="an-selo previo">criada a partir da anamnese anterior — itens prévios precisam ser revisados</span>' : "") + "</p>";
      html += '<p class="perf-ajuda">Cada item diz o <b>estado</b> (campo vazio não é "não") e a <b>origem</b> da informação. ' + MSG_INFORMADO + "</p>";
      var d = (mostrar.content || {}).dominios || {};
      html += '<div class="an-dominios">' + DOMINIOS.map(function (p) {
        return dominioHtml(p[0], p[1], (d[p[0]] || {}).itens || [], editavel);
      }).join("") + "</div>";
    }
    alvo.innerHTML = html;
  }

  /* ---------- ler o formulario de volta para o rascunho ---------------------- */

  function lerFormulario() {
    if (!rascunho) return;
    var alvo = document.getElementById("aba-anamnese"); if (!alvo) return;
    var c = { dominios: {} };
    alvo.querySelectorAll(".an-dominio").forEach(function (det) {
      var dom = det.dataset.anDominio; var itens = [];
      det.querySelectorAll(".an-item").forEach(function (el) {
        var g = function (n) { var x = el.querySelector('[data-an-campo="' + n + '"]'); return x ? x.value : ""; };
        var tem = el.querySelector('[data-an-campo="tem_medida"]');
        var antigo = ((rascunho.content.dominios[dom] || {}).itens || [])[Number(el.dataset.anI)] || {};
        var it = { campo: g("campo"), valor: g("valor"), estado: g("estado") || "informado", origem: g("origem") || "relato_paciente",
          previo: !!antigo.previo, fonte_anamnese_id: antigo.fonte_anamnese_id || null, medida: null };
        if (tem && tem.checked) {
          var v = g("m_valor");
          it.medida = { valor: v === "" ? null : Number(v), unidade: g("m_unidade") || "", data: g("m_data") || null,
                        metodo: g("m_metodo") || null, responsavel: g("m_responsavel") || null };
        }
        itens.push(it);
      });
      if (itens.length) c.dominios[dom] = { itens: itens };
      if (det.open) abertos[dom] = true; else delete abertos[dom];
    });
    rascunho.content = c;
  }

  function problema(c) {
    var d = (c || {}).dominios || {}, erro = null;
    Object.keys(d).forEach(function (k) { (d[k].itens || []).forEach(function (it) {
      if (it.medida && it.medida.valor != null && !it.medida.unidade) erro = erro || "Medida sem unidade em “" + (it.campo || k) + "”: informe a unidade (não há unidade padrão).";
    }); });
    return erro;
  }

  function mostrarEstado(s) { estadoSalvo = s; var el = document.getElementById("an-estado"); if (el) el.textContent = textoEstado(); }

  function gravar(status) {
    var e = atendimentoAtivo();
    if (!e) { if (window.avisar) window.avisar(MSG_SEM_ATENDIMENTO); return Promise.resolve(null); }
    if (!rascunho) return Promise.resolve(null);
    lerFormulario();
    var erro = problema(rascunho.content);
    if (erro) { if (window.avisar) window.avisar(erro); return Promise.resolve(null); }
    mostrarEstado("salvando");
    var payload = { id: rascunho.id || null, encounter_id: e.id, content: rascunho.content, status: status, expected_updated_at: rascunho.updated_at || null };
    if (rascunho.corrigeDe) { payload.id = rascunho.corrigeDe; payload.revision_note = rascunho.nota || null; delete payload.expected_updated_at; }
    return salvar(payload).then(function (a) {
      if (status === "rascunho") rascunho = { id: a.id, encounter_id: e.id, content: a.content || rascunho.content, updated_at: a.updated_at };
      else rascunho = null;
      vendo = null;
      desenhar();
      mostrarEstado(status);
      if (window.avisar) window.avisar(status === "rascunho" ? "Rascunho da anamnese salvo." : "Anamnese salva (rev. " + a.revision_number + ").");
      return a;
    }).catch(function (err) {
      console.error("[anamnese] salvar:", err);
      mostrarEstado(/conflito|alterada em outro lugar/i.test(err && err.message) ? "conflito" : "falha");
      if (window.avisar) window.avisar(window.mensagemHumana ? window.mensagemHumana(err) : "Não foi possível salvar a anamnese. Nada foi gravado; tente de novo.");
      return null;
    });
  }

  function ligar() {
    var alvo = document.getElementById("aba-anamnese"); if (!alvo) return;
    alvo.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-an-acao]");
      if (b) {
        var acao = b.dataset.anAcao, e = atendimentoAtivo();
        if (!e) return;
        if (acao === "nova") { rascunho = { id: null, encounter_id: e.id, content: conteudoVazio() }; vendo = null; desenhar(); return; }
        var V2a = window.AnamneseV2;
        if (acao === "copiar") {
          var fonte = b.dataset.anFonte;
          if (!window.abrirModalConfirmar) return;
          window.abrirModalConfirmar({ titulo: "Criar a partir da anamnese anterior",
            corpo: "<p>Os itens da anamnese anterior serão copiados para este atendimento <b>marcados como informação prévia, a revisar</b>. " +
                   "A origem de cada item continua visível. Nada é copiado para o HOLOSCAN.</p>",
            botaoConfirmar: "Copiar como prévia", classeConfirmar: "btn-verde" }).then(function (r) {
            if (r !== "confirmar") return;
            mostrarEstado("salvando");
            var linhaFonte = cache.filter(function (a) { return a.id === fonte; })[0];
            /* anamnese V2 anterior: copia V2, campo a campo, como previo; anamnese ANTIGA: a copia antiga (RPC), sem conversao */
            var copia = V2a && linhaFonte && V2a.ehV2(linhaFonte.content)
              ? V2a.prepararCopia({ salvar: salvar, redesenhar: desenhar, recarregar: function () { carregar().then(desenhar); } }, e, linhaFonte)
              : criarAPartirDe(e.id, fonte);
            copia.then(function () { rascunho = null; vendo = null; desenhar(); mostrarEstado("rascunho"); })
              .catch(function (err) { mostrarEstado("falha"); if (window.avisar) window.avisar(window.mensagemHumana ? window.mensagemHumana(err) : "Não foi possível copiar a anamnese anterior."); });
          });
          return;
        }
        if (acao === "corrigir") {
          var vig = vigente(e.id); if (!vig) return;
          if (V2a && V2a.ehV2(vig.content)) { if (V2a.esquecer) V2a.esquecer(); v2Corrigindo = vig.id; vendo = null; desenhar(); return; }
          rascunho = { id: null, corrigeDe: vig.id, encounter_id: e.id, content: JSON.parse(JSON.stringify(vig.content || conteudoVazio())) };
          vendo = null; desenhar(); return;
        }
        if (acao === "descartar") { rascunho = null; vendo = null; v2Corrigindo = null; if (V2a) V2a.esquecer(); desenhar(); return; }
        if (acao === "rascunho") { gravar("rascunho"); return; }
        if (acao === "salvar") { gravar("salvo"); return; }
        if (acao === "revisar") {
          var v2 = vigente(e.id); if (!v2) return;
          mostrarEstado("salvando");
          salvar({ id: v2.id, status: "revisado" }).then(function () { desenhar(); mostrarEstado("revisado"); })
            .catch(function (err) { mostrarEstado("falha"); if (window.avisar) window.avisar(window.mensagemHumana ? window.mensagemHumana(err) : "Não foi possível marcar como revisada."); });
          return;
        }
        if (acao === "fechar-ver") { vendo = null; desenhar(); return; }
      }
      var ver = ev.target.closest("[data-an-ver]");
      if (ver) { lerFormulario(); vendo = ver.dataset.anVer; desenhar(); return; }
      var add = ev.target.closest("[data-an-adicionar]");
      if (add && rascunho) {
        lerFormulario();
        var dom = add.dataset.anAdicionar;
        rascunho.content.dominios[dom] = rascunho.content.dominios[dom] || { itens: [] };
        rascunho.content.dominios[dom].itens.push(itemNovo());
        abertos[dom] = true; desenhar(); mostrarEstado(""); return;
      }
      var rem = ev.target.closest("[data-an-remover]");
      if (rem && rascunho) {
        var item = rem.closest(".an-item"); lerFormulario();
        var lst = rascunho.content.dominios[item.dataset.anDom]; if (lst) lst.itens.splice(Number(item.dataset.anI), 1);
        desenhar(); mostrarEstado(""); return;
      }
    });
    alvo.addEventListener("change", function (ev) {
      if (!rascunho) return;
      if (ev.target.dataset.anCampo === "tem_medida" || ev.target.dataset.anCampo === "estado") { lerFormulario(); desenhar(); }
      mostrarEstado("");
    });
    alvo.addEventListener("input", function () { if (rascunho && estadoSalvo !== "salvando") mostrarEstado(""); });
  }

  /* ---------- integracao ------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("aba-anamnese")) return;
    ligar();
    carregar();
    if (window.AtendimentoAtual && window.AtendimentoAtual.aoMudar) {
      window.AtendimentoAtual.aoMudar(function () { rascunho = null; vendo = null; v2Corrigindo = null; estadoSalvo = ""; if (window.AnamneseV2) { window.AnamneseV2.salvarAgora(); window.AnamneseV2.esquecer(); } if (document.getElementById("aba-anamnese")) desenhar(); });
    }
    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () { if (typeof anterior === "function") anterior(); rascunho = null; vendo = null; v2Corrigindo = null; estadoSalvo = ""; if (window.AnamneseV2) { window.AnamneseV2.salvarAgora(); window.AnamneseV2.esquecer(); } };
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) {
      window.HoloAuth.aoMudarEstado(function (estado) { if (estado === "pendente") return; if (estado !== "autenticado") { cache = []; rascunho = null; v2Corrigindo = null; if (window.AnamneseV2) window.AnamneseV2.esquecer(); } carregar(); });
    }
  });

  window.Anamnese = {
    MSG_SEM_ATENDIMENTO: MSG_SEM_ATENDIMENTO,
    DOMINIOS: DOMINIOS, ESTADOS: ESTADOS, ORIGENS: ORIGENS, rotulo: function (k) { return ROTULO[k] || k; },
    carregar: carregar, carregando: function () { return carregando; },
    salvar: salvar, criarAPartirDe: criarAPartirDe,
    doAtendimento: doAtendimento, vigente: vigente, rascunhoDe: rascunhoDe, doPaciente: doPaciente, anteriorDe: anteriorDe, anteriorCompletaDe: anteriorCompletaDe,
    consolidada: consolidada, contarItens: contarItens, textoBruto: textoBruto,
    desenhar: desenhar, aoMudar: function (f) { if (typeof f === "function") ouvintes.push(f); },
    rascunhoLocal: function () { lerFormulario(); return rascunho ? JSON.parse(JSON.stringify(rascunho)) : null; },
    esquecer: function () { cache = []; locais = []; rascunho = null; vendo = null; v2Corrigindo = null; if (window.AnamneseV2) window.AnamneseV2.esquecer(); },
    /** resumo da anamnese vigente (so V2; a antiga nao e reinterpretada) */
    resumoHtml: function (a) { return a && window.AnamneseV2 && window.AnamneseV2.ehV2(a.content) ? window.AnamneseV2.resumoHtml(a.content) : ""; }
  };
})();
