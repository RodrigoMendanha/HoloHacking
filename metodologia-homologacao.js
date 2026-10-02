/* ===========================================================================
   METODOLOGIA / HOMOLOGACAO — tela interna de CONSULTA (V1, Etapa 4)
   ===========================================================================

   So aparece com ?homologacao=1 (Metodologia.modoHomologacao()). Mostra o
   inventario recuperado (metodologia-inventario.js) e os pacotes cadastrados
   (PacoteMetodologico): pacote, versao, status, 84 itens, conflitos,
   pendencias do validador, associacoes, pesos, faixas, Indice, Triada.
   Exporta JSON/CSV (so metodologia, nenhum dado de paciente).
   Etapa 4.2: mostra tambem o CANDIDATO V1 (decisoes metodologicas fechadas
   aplicadas sobre o importado, HOLOS-V1@2, em_revisao) e a conferencia dos
   casos de referencia. Gravar o candidato grava em_revisao — nunca aprovado.

   NAO tem botao "aprovar tudo". NAO publica nada. A unica escrita e "importar
   o inventario como RASCUNHO" (status rascunho, elementos para_homologacao),
   e a aprovacao continua sendo exclusiva da RPC com registro de homologacao.
   =========================================================================== */
(function () {
  "use strict";
  var escapar = window.escapar;
  var aba = "resumo", pacoteSel = null, filtroItens = "";
  var hashes = {};   // package_id -> hash do conteudo conferido no servidor (so quando a pessoa pede)

  function inventario() { return window.MetodologiaInventario || null; }
  function decisoes() { return window.MetodologiaDecisoesV1 || null; }
  function P() { return window.PacoteMetodologico; }
  function alvo() { return document.getElementById("metodologia-corpo"); }
  function pacoteAtual() {
    var inv = inventario(); if (!P()) return null;
    if (pacoteSel === "inventario" || !pacoteSel) return inv ? Object.assign(P().importarInventario(inv, "HOLOS-V1", 1), { _inventario: true }) : null;
    if (pacoteSel === "candidato") return inv && decisoes() ? Object.assign(P().aplicarDecisoesV1(P().importarInventario(inv, "HOLOS-V1", 1), decisoes()), { _candidato: true }) : null;
    return P().porId(pacoteSel);
  }
  function baixar(nome, conteudo, tipo) {
    var blob = new Blob([conteudo], { type: tipo }); var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function tag(t) { return '<span class="mh-status ' + escapar(t) + '">' + escapar(t) + "</span>"; }

  function htmlResumo(p) {
    var r = P().resumo(p), v = P().validar(p), M = window.Metodologia;
    var bloqueios = M ? M.motivosBloqueio() : [];
    return '<div class="dash-bloco"><h3 class="dash-titulo">Pacote</h3>' +
      '<div class="mh-grade">' +
      '<div class="fic-det"><span>Código</span><b>' + escapar(p.code) + "</b></div>" +
      '<div class="fic-det"><span>Versão</span><b>' + escapar(String(p.version)) + "</b></div>" +
      '<div class="fic-det"><span>Status</span><b>' + tag(p.status) + (p._inventario ? " (inventário, não gravado)" : p._candidato ? " (candidato, não gravado)" : "") + "</b></div>" +
      '<div class="fic-det"><span>Vigente</span><b>' + (r.vigente ? "sim" : "não") + "</b></div>" +
      '<div class="fic-det"><span>Hash</span><b>' + escapar(p.content_hash || "—") + "</b></div>" +
      '<div class="fic-det"><span>Responsável</span><b>' + escapar(p.responsible || "— (nenhum responsável humano registrado)") + "</b></div>" +
      "</div>" + htmlLinhagem(p) + "</div>" +
      htmlAprovacoes(p) +
      '<div class="dash-bloco"><h3 class="dash-titulo">Saída oficial</h3><p class="dash-sub">' + (bloqueios.length ? "<b>Bloqueada.</b> " + escapar(bloqueios.join("; ")) : "Liberada pelo pacote ativo.") + "</p>" +
      '<p class="dash-sub">Status da barreira: <b>' + escapar(M ? M.status() : "?") + "</b></p></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Validador de publicação <em>' + v.total_erros + "</em></h3>" +
      '<p class="dash-sub">' + (v.publicavel ? "Nenhum erro estrutural. A aprovação continua exigindo registro de homologação com responsável humano (RPC)." : "O validador aponta; não corrige. Cada linha abaixo é uma decisão humana pendente.") + "</p>" +
      '<ul class="mh-lista" id="mh-pendencias">' + v.erros.map(function (e) { return "<li><code>" + escapar(e.codigo) + "</code> <b>" + escapar(e.onde) + "</b> — " + escapar(e.mensagem) + "</li>"; }).join("") + "</ul></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Contagem</h3><div class="mh-grade">' +
      [["Perguntas", r.perguntas], ["Associações", r.associacoes], ["Primárias pontuáveis", r.primarias], ["Secundárias contextuais", r.contextuais], ["Tríada", r.triade], ["Em conflito", r.conflitos], ["Faixas", r.faixas], ["Regras", r.regras], ["Registros de homologação", r.registros]].map(function (x) { return '<div class="fic-det"><span>' + x[0] + "</span><b>" + x[1] + "</b></div>"; }).join("") + "</div></div>";
  }
  function htmlItens(p) {
    var f = filtroItens.toLowerCase();
    var lista = (p.perguntas || []).filter(function (q) { return !f || (q.stable_id + " " + q.statement).toLowerCase().indexOf(f) >= 0; });
    return '<div class="dash-bloco"><h3 class="dash-titulo">Itens da edição <em>' + (p.perguntas || []).length + "</em></h3>" +
      '<input type="search" class="mh-filtro" data-mh-filtro placeholder="filtrar por ID ou enunciado" value="' + escapar(filtroItens) + '">' +
      '<table class="evo-tabela mh-tabela" id="mh-itens"><thead><tr><th>#</th><th>ID</th><th>Bloco</th><th>Enunciado</th><th>Escala</th><th>Orientação</th><th>Contexto temporal</th><th>Associações</th><th>Status</th></tr></thead><tbody>' +
      lista.map(function (q) {
        var as = (p.associacoes || []).filter(function (a) { return a.question_stable_id === q.stable_id; });
        return "<tr" + (as.some(function (a) { return a.conflict; }) ? ' class="mh-conflito"' : "") + "><td>" + (q.position || "") + "</td><td><b>" + escapar(q.stable_id) + "</b></td><td>" + escapar(q.block) + "</td><td>" + escapar(q.statement) + "</td><td>" + escapar(q.scale_code || "AUSENTE") + "</td><td>" + escapar(q.orientation || "AUSENTE") + "</td><td>" + escapar(q.temporal_context || "AUSENTE") + "</td><td>" +
          as.map(function (a) { return escapar(a.destination_type + ":" + a.destination_id + (a.role === "secondary_contextual" ? " (contexto, sem peso)" : " ×" + a.weight)) + (a.conflict ? " ⚠" : ""); }).join("<br>") + "</td><td>" + tag(q.status) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function htmlAssociacoes(p) {
    var as = p.associacoes || [];
    return '<div class="dash-bloco"><h3 class="dash-titulo">Associações e pesos <em>' + as.length + "</em></h3>" +
      (p._inventario || p.status === "rascunho" ? '<p class="dash-sub">Pesos recuperados (1..3; secundárias × fator ' + escapar(String((inventario() || {}).config_recuperada ? inventario().config_recuperada.peso_secundario_fator : "?")) + "). Nenhum normalizado, nenhum substituído, nenhum default oficial.</p>"
        : '<p class="dash-sub">Peso oficial 1 em todos os vínculos primários (Decisão 7). <code>secondary_contextual</code> não pontua (sem peso). O peso recuperado fica só como <code>legacy_recovered_weight</code>.</p>') +
      '<table class="evo-tabela mh-tabela" id="mh-associacoes"><thead><tr><th>Pergunta</th><th>Destino</th><th>Peso</th><th>Papel</th><th>Peso legado</th><th>Conflito</th><th>Fonte</th><th>Status</th></tr></thead><tbody>' +
      as.map(function (a) { return "<tr" + (a.conflict ? ' class="mh-conflito"' : "") + "><td>" + escapar(a.question_stable_id) + "</td><td>" + escapar(a.destination_type + ":" + a.destination_id) + "</td><td>" + escapar(a.weight === null || a.weight === undefined ? (a.role === "secondary_contextual" ? "— (não pontua)" : "AUSENTE") : String(a.weight)) + "</td><td>" + escapar(a.role || "") + "</td><td>" + escapar(a.legacy && a.legacy.legacy_recovered_weight !== undefined && a.legacy.legacy_recovered_weight !== null ? String(a.legacy.legacy_recovered_weight) : "") + "</td><td>" + (a.conflict ? "⚠ " + escapar(a.conflict_note || "") : escapar(a.conflict_note || "")) + "</td><td><small>" + escapar(a.source || "") + "</small></td><td>" + tag(a.status) + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  function htmlFaixas(p) {
    return '<div class="dash-bloco"><h3 class="dash-titulo">Faixas <em>' + (p.faixas || []).length + "</em></h3>" +
      '<table class="evo-tabela mh-tabela" id="mh-faixas"><thead><tr><th>Destino</th><th>Rótulo</th><th>Intervalo</th><th>Mensagem (nutri)</th><th>Status</th></tr></thead><tbody>' +
      (p.faixas || []).map(function (f) { return "<tr><td>" + escapar(f.destination_type + ":" + f.destination_id) + "</td><td>" + escapar(f.label) + "</td><td>" + (f.lower_inclusive ? "[" : "(") + escapar(String(f.lower_bound_exact || f.lower_bound)) + ", " + escapar(String(f.upper_bound_exact || f.upper_bound)) + (f.upper_inclusive ? "]" : ")") + "</td><td><small>" + escapar(f.message_nutri || "") + "</small></td><td>" + tag(f.status) + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  function htmlRegras(p) {
    var inv = inventario();
    if (!p._inventario && p.status !== "rascunho") return htmlRegrasPacote(p);
    return '<div class="dash-bloco"><h3 class="dash-titulo">Índice HOLOS</h3><pre class="mh-pre" id="mh-indice">' + escapar(JSON.stringify(inv ? inv.indice : null, null, 2)) + "</pre></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Tríada</h3><pre class="mh-pre" id="mh-triada">' + escapar(JSON.stringify(inv ? inv.triada : null, null, 2)) + "</pre></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Ausência e cobertura</h3><pre class="mh-pre">' + escapar(JSON.stringify(inv ? { ausencia: inv.ausencia, cobertura: inv.cobertura } : null, null, 2)) + "</pre></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Regras do pacote <em>' + (p.regras || []).length + "</em></h3>" +
      '<table class="evo-tabela mh-tabela" id="mh-regras"><thead><tr><th>Tipo</th><th>Alvo</th><th>Payload</th><th>Status</th></tr></thead><tbody>' +
      (p.regras || []).map(function (r) { return "<tr><td>" + escapar(r.rule_type) + "</td><td>" + escapar(r.target) + "</td><td><small>" + escapar(JSON.stringify(r.payload)).slice(0, 400) + "</small></td><td>" + tag(r.status) + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  /** Regras do proprio pacote (candidato / gravado): Indice, Triada, ausencia, comparabilidade, sugestoes, referencias. */
  function htmlRegrasPacote(p) {
    var regra = function (t, a) { return (p.regras || []).filter(function (r) { return r.rule_type === t && (a === undefined || r.target === a); })[0] || null; };
    var pre = function (titulo, id, obj) { return '<div class="dash-bloco"><h3 class="dash-titulo">' + titulo + '</h3><pre class="mh-pre" id="' + id + '">' + escapar(JSON.stringify(obj, null, 2)) + "</pre></div>"; };
    var sug = regra("suggestion", "global");
    var refs = (p.regras || []).filter(function (r) { return r.rule_type === "example"; });
    var M = window.MotorMetodologico;
    return pre("Índice HOLOS", "mh-indice", regra("index", "global") ? regra("index", "global").payload : null) +
      pre("Tríada", "mh-triada", EIXOS().map(function (e) { var t = regra("triad", e); return t ? Object.assign({ eixo: e }, t.payload) : { eixo: e, ausente: true }; })) +
      pre("Ausência e cobertura", "mh-ausencia", { ausencia: regra("absence") ? regra("absence").payload : null, cobertura: regra("coverage") ? regra("coverage").payload : null }) +
      pre("Comparabilidade", "mh-comparabilidade", regra("comparability", "global") ? regra("comparability", "global").payload : null) +
      '<div class="dash-bloco"><h3 class="dash-titulo">Sugestões automáticas</h3><p class="dash-sub" id="mh-sugestao">' + escapar(sug && sug.payload && sug.payload.automatica === false ? sug.payload.mensagem : "Sem política de sugestão no pacote: nenhuma sugestão automática.") + "</p></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Casos de referência <em>' + refs.length + '</em></h3><ul class="mh-lista" id="mh-referencias">' +
      refs.map(function (r) { var dif = M && r.payload && r.payload.formato === "v1" ? M.conferirExemplo(p, r.payload) : null; return "<li><b>" + escapar(r.target) + "</b> — " + escapar((r.payload && r.payload.descricao) || "") + " · " + (dif === null ? "sem conferência" : dif.length ? "<b>DIVERGE</b>: " + escapar(dif.join("; ")) : "confere (motor = esperado)") + "</li>"; }).join("") + "</ul></div>";
  }
  function EIXOS() { return P().EIXOS; }
  /** Dupla aprovacao: so para pacote GRAVADO. Nenhum campo vem preenchido; nada e registrado sem clique. */
  function htmlAprovacoes(p) {
    if (!p.id || p._inventario || p._candidato || !P().estadoAprovacao) return "";
    var h = hashes[p.id] || null, e = P().estadoAprovacao(p, h), A = P().APROVADORES;
    var linha = function (n, a, valida) {
      return "<li>Aprovação " + n + " — " + escapar(A[n].responsavel) + " (" + escapar(A[n].papel) + "): " +
        (a ? (valida ? "<b>registrada</b>" : "<b>registrada, mas não vale para o conteúdo atual</b>") + " em " + escapar(String(a.approved_at || "").slice(0, 16)) + " · versão " + escapar(String(a.package_version)) + " · hash " + escapar(String(a.content_hash).slice(0, 12)) + "…" : "pendente") + "</li>";
    };
    var html = '<div class="dash-bloco" id="mh-aprovacoes"><h3 class="dash-titulo">Homologação — dupla aprovação</h3>' +
      '<p class="dash-sub">Ordem obrigatória: Aprovação 1 (Daniel), depois Aprovação 2 (Rodrigo), sobre o mesmo pacote, versão e hash de conteúdo. Se o pacote mudar entre as duas, o ciclo recomeça. Nenhuma aprovação é criada automaticamente.</p>' +
      '<ul class="mh-lista">' + linha(1, e.aprovacao1, e.valida1) + linha(2, e.aprovacao2, e.valida2) + "</ul>" +
      (e.invalidadas ? '<p class="dash-sub">' + e.invalidadas + " aprovação(ões) invalidada(s) por mudança no pacote (histórico mantido).</p>" : "");
    if (p.status !== "em_revisao") return html + '<p class="dash-sub">Aprovações só são registradas em pacote <code>em_revisao</code>.</p></div>';
    if (!h) return html + '<p><button type="button" class="btn-fantasma" data-mh-acao="conferir-hash">Conferir o hash do conteúdo no servidor</button></p></div>';
    html += '<p class="dash-sub">Hash do conteúdo atual (servidor): <code id="mh-hash-servidor">' + escapar(h) + "</code> · versão " + escapar(String(p.version)) + "</p>";
    if (e.proxima === 1 || e.proxima === 2) {
      html += '<div class="mh-aprovar" data-mh-etapa="' + e.proxima + '"><label class="evo-campo"><span>Responsável (Aprovação ' + e.proxima + ")</span>" +
        '<input type="text" data-mh-resp autocomplete="off" value=""></label>' +
        '<label class="evo-campo"><span>Justificativa</span><textarea data-mh-just rows="2"></textarea></label>' +
        '<label><input type="checkbox" data-mh-conferi> Conferi o pacote ' + escapar(p.code + " v" + p.version) + " com o hash " + escapar(h.slice(0, 12)) + "…</label> " +
        '<button type="button" class="btn-fantasma" data-mh-acao="registrar-aprovacao">Registrar Aprovação ' + e.proxima + "</button></div>";
    } else if (e.proxima === "homologar") {
      html += '<p><button type="button" class="btn-fantasma" data-mh-acao="homologar">Homologar pacote (Aprovações 1 e 2 válidas)</button></p>';
    }
    return html + "</div>";
  }
  function htmlLinhagem(p) {
    var D = decisoes(), l = p.lineage;
    if (!l) return "";
    return '<p class="dash-sub" id="mh-linhagem"><b>' + escapar(D ? D.status_metodologico : "DECISOES METODOLOGICAS V1 FECHADAS") + "</b> · <b>" + escapar(D ? D.status_tecnico : "PUBLICACAO TECNICA PENDENTE DE VALIDACAO NO BANCO REAL") + "</b><br>" +
      "Nova versão de " + escapar(l.parent_code + "@" + l.parent_version) + " (status " + escapar(l.parent_status || "?") + ", hash " + escapar(String(l.parent_content_hash || "—").slice(0, 16)) + "…) · decisões " + escapar(l.decisoes || "") + "</p>";
  }
  function htmlConflitos(p) {
    var inv = inventario(), c = inv ? inv.conflitos : [];
    return '<div class="dash-bloco"><h3 class="dash-titulo">Conflitos recuperados <em>' + c.length + '</em></h3><ul class="mh-lista" id="mh-conflitos">' +
      c.map(function (x) { return "<li><b>" + escapar(x.tema) + " · " + escapar(x.elemento) + "</b> — " + escapar(x.descricao) + " <small>(" + escapar(x.fonte) + ")</small></li>"; }).join("") + "</ul>" +
      '<p class="dash-sub">SNT-101 e SNT-501: ver <code>docs/v1/metodologia/PENDENCIA-SNT-101-SNT-501.md</code>. Nenhum vencedor é escolhido aqui.</p></div>' +
      '<div class="dash-bloco"><h3 class="dash-titulo">Registros de homologação <em>' + (p.registros || []).length + '</em></h3>' +
      ((p.registros || []).length ? '<ul class="mh-lista">' + p.registros.map(function (r) { return "<li>" + escapar(r.decided_at) + " · <b>" + escapar(r.topic) + " / " + escapar(r.element) + "</b> · " + escapar(r.decision) + " · " + escapar(r.responsible) + (r.justification ? " — " + escapar(r.justification) : "") + "</li>"; }).join("") + "</ul>" : '<p class="dash-vazio">Nenhuma decisão registrada. Nenhum responsável é preenchido pelo sistema.</p>') + "</div>";
  }

  /* ================= V1 Etapa 5.2 — Leitura Integrada: homologacao metodologica =================
     Secao independente do pacote HOLOSCAN. Mesma governanca humana: Aprovacao 1 (Daniel) -> Aprovacao 2
     (Rodrigo) sobre o mesmo package_id, version e content_hash; depois a acao final explicita HOMOLOGAR,
     que o servidor so aceita com a metodologia completa (li_validar_completude sem bloqueio). Nada aqui
     cria aprovacao sem clique; o pacote real LI-V1@1 esta em rascunho e incompleto: Homologar fica bloqueado. */
  var li = { pacotes: null, aprovacoes: [], sel: null, hash: {}, completude: {}, carregando: false, erro: null };
  var LI_APROVADORES = { 1: { responsavel: "Daniel", papel: "responsável primário" }, 2: { responsavel: "Rodrigo", papel: "revisão final" } };
  function liSb() { return window.supabaseClient || null; }
  function liRpc(nome, args) {
    var sb = liSb(); if (!sb) return Promise.reject(new Error("sem sessao"));
    return Promise.resolve(sb.rpc(nome, args)).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function liCarregar() {
    var sb = liSb(); if (!sb || li.carregando) return Promise.resolve();
    li.carregando = true;
    return Promise.all([Promise.resolve(sb.from("integrated_reading_rule_packages").select("*")), Promise.resolve(sb.from("integrated_reading_package_approvals").select("*")),
      Promise.resolve(sb.from("integrated_reading_domains").select("id, package_id, status")), Promise.resolve(sb.from("integrated_reading_exam_domain_links").select("id, package_id, status")), Promise.resolve(sb.from("integrated_reading_rules").select("id, package_id, rule_type, status"))])
      .then(function (rs) {
        li.carregando = false;
        var e = rs.filter(function (r) { return r && r.error; })[0];
        if (e) { li.erro = e.error; li.pacotes = []; return; }
        li.erro = null;
        li.pacotes = (rs[0].data || []).slice().sort(function (a, b) { return String(a.code).localeCompare(String(b.code)) || (b.version - a.version); });
        li.aprovacoes = rs[1].data || []; li.dominios = rs[2].data || []; li.vinculos = rs[3].data || []; li.regras = rs[4].data || [];
        if (!li.sel || !li.pacotes.some(function (p) { return p.id === li.sel; })) { var real = li.pacotes.filter(function (p) { return p.code === "LI-V1"; })[0] || li.pacotes[0]; li.sel = real ? real.id : null; }
      }).catch(function (e) { li.carregando = false; li.erro = e; li.pacotes = []; });
  }
  function liPacote() { return (li.pacotes || []).filter(function (p) { return p.id === li.sel; })[0] || null; }
  function liEstado(p) {
    var todas = li.aprovacoes.filter(function (a) { return a.package_id === p.id; }), vig = todas.filter(function (a) { return !a.invalidated_at; });
    var h = li.hash[p.id] || null;
    var a1 = vig.filter(function (a) { return a.step === 1; })[0] || null, a2 = vig.filter(function (a) { return a.step === 2; })[0] || null;
    var vale = function (a) { return !!a && a.package_version === p.version && (!h || a.content_hash === h); };
    var ok1 = vale(a1), ok2 = ok1 && vale(a2) && a2.content_hash === a1.content_hash;
    var c = li.completude[p.id] || null;
    return { a1: a1, a2: a2, ok1: ok1, ok2: ok2, invalidadas: todas.filter(function (a) { return !!a.invalidated_at; }).length, hash: h, completude: c,
      proxima: p.status !== "em_revisao" ? null : !ok1 ? 1 : !ok2 ? 2 : "homologar",
      homologavel: p.status === "em_revisao" && ok1 && ok2 && !!c && c.publicavel };
  }
  function htmlLI() {
    var html = '<div class="dash-bloco" id="mh-li"><h3 class="dash-titulo">Leitura Integrada — homologação metodológica</h3>' +
      '<p class="dash-sub">Mesma governança do HOLOSCAN: Aprovação 1 (Daniel, responsável primário) → Aprovação 2 (Rodrigo, revisão final), sobre o mesmo pacote, versão e hash de conteúdo; depois a ação explícita <b>Homologar</b>, que o servidor só aceita com a metodologia completa. Qualquer mudança em domínio, vínculo, regra, referência, conversão, cálculo derivado ou versão invalida as aprovações (histórico mantido). Nenhuma aprovação é criada automaticamente.</p>';
    if (!liSb()) return html + '<p class="dash-vazio" id="mh-li-vazio">Sem conta ativa não há pacote da Leitura Integrada para consultar.</p></div>';
    if (li.pacotes === null) return html + '<p class="dash-vazio" id="mh-li-vazio">Carregando…</p></div>';
    if (li.erro) return html + '<p class="dash-vazio" id="mh-li-vazio">Não foi possível ler o pacote da Leitura Integrada no servidor.</p></div>';
    var p = liPacote();
    if (!p) return html + '<p class="dash-vazio" id="mh-li-vazio">Nenhum pacote da Leitura Integrada no servidor.</p></div>';
    var e = liEstado(p);
    var nd = (li.dominios || []).filter(function (d) { return d.package_id === p.id; }), nv = (li.vinculos || []).filter(function (v) { return v.package_id === p.id; }), nr = (li.regras || []).filter(function (r) { return r.package_id === p.id; });
    var contar = function (l) { return l.length + (l.length ? " (" + l.filter(function (x) { return x.status === "aprovado"; }).length + " aprovado(s))" : ""); };
    html += '<label class="evo-campo"><span>Pacote</span><select data-mh-li-pacote>' + li.pacotes.map(function (x) { return '<option value="' + escapar(x.id) + '"' + (x.id === p.id ? " selected" : "") + ">" + escapar(x.code + " v" + x.version + " · " + x.status) + "</option>"; }).join("") + "</select></label>" +
      '<ul class="mh-lista" id="mh-li-pacote"><li>package_id: <code>' + escapar(p.id) + "</code></li><li>version: <b>" + escapar(String(p.version)) + "</b> · status: " + tag(p.status) + "</li>" +
      "<li>domínios: " + contar(nd) + " · vínculos exame → domínio: " + contar(nv) + " · regras: " + contar(nr) + "</li>" +
      "<li>content_hash (servidor): " + (e.hash ? "<code id=\"mh-li-hash\">" + escapar(e.hash) + "</code>" : '<span id="mh-li-hash">não conferido</span>') + (p.content_hash ? " · homologado: <code>" + escapar(String(p.content_hash).slice(0, 12)) + "…</code>" : "") + "</li></ul>";
    if (!nd.filter(function (d) { return d.status === "aprovado"; }).length) html += '<p class="dash-sub mh-li-aviso" id="mh-li-indefinida"><b>Metodologia da Leitura Integrada ainda não definida.</b> Domínios, vínculos exame → domínio, janela temporal, suficiência, resultados mistos, convergência/divergência e textos são decisões humanas pendentes (<code>docs/v1/laboratorio/PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md</code>). Até lá, toda leitura real é "sem dados suficientes".</p>';
    if (e.completude) html += '<div id="mh-li-bloqueios"><p class="dash-sub">Bloqueios metodológicos (validador de completude): <b>' + escapar(String(e.completude.total_bloqueios)) + "</b></p>" + (e.completude.total_bloqueios ? '<ul class="mh-lista">' + (e.completude.bloqueios || []).map(function (b) { return "<li><code>" + escapar(b) + "</code></li>"; }).join("") + "</ul>" : '<p class="dash-sub">Nenhum bloqueio: o conteúdo atual é tecnicamente completo (isto não é homologação).</p>') + "</div>";
    var linha = function (n, a, valida) {
      return '<li data-mh-li-aprovacao="' + n + '">Aprovação ' + n + " — " + escapar(LI_APROVADORES[n].responsavel) + " (" + escapar(LI_APROVADORES[n].papel) + "): " +
        (a ? (valida ? "<b>registrada</b>" : "<b>registrada, mas não vale para o conteúdo atual</b>") + " em " + escapar(String(a.approved_at || "").slice(0, 16)) + " · versão " + escapar(String(a.package_version)) + " · hash " + escapar(String(a.content_hash).slice(0, 12)) + "…" : "<b>pendente</b>") + "</li>";
    };
    html += '<ul class="mh-lista" id="mh-li-aprovacoes">' + linha(1, e.a1, e.ok1) + linha(2, e.a2, e.ok2) + "</ul>" +
      (e.invalidadas ? '<p class="dash-sub">' + e.invalidadas + " aprovação(ões) invalidada(s) por mudança no pacote (histórico mantido).</p>" : "");
    html += '<p class="rel-acoes"><button type="button" class="btn-fantasma" data-mh-li-acao="conferir-hash">Conferir hash</button></p>';
    if (p.status !== "em_revisao") html += '<p class="dash-sub" id="mh-li-status-aviso">Aprovações só são registradas em pacote <code>em_revisao</code>; este está em <code>' + escapar(p.status) + "</code> (a passagem a em_revisao é gestão técnica versionada, não um botão).</p>";
    if (e.hash && (p.status === "em_revisao" || p.status === "rascunho") && e.proxima !== "homologar") {
      var etapa = e.proxima || (!e.ok1 ? 1 : 2);
      html += '<div class="mh-aprovar" id="mh-li-aprovar" data-mh-li-etapa="' + etapa + '"><label class="evo-campo"><span>Responsável (Aprovação ' + etapa + ")</span>" +
        '<input type="text" data-mh-li-resp autocomplete="off" value=""></label>' +
        '<label class="evo-campo"><span>Justificativa</span><textarea data-mh-li-just rows="2"></textarea></label>' +
        '<label><input type="checkbox" data-mh-li-conferi> Conferi o pacote ' + escapar(p.code + " v" + p.version) + " com o hash " + escapar(e.hash.slice(0, 12)) + "…</label> " +
        '<button type="button" class="btn-fantasma" data-mh-li-acao="registrar-aprovacao">Registrar Aprovação ' + etapa + "</button></div>";
    }
    var motivo = !e.hash ? "confira o hash primeiro" : p.status !== "em_revisao" ? "pacote não está em_revisao" : !e.ok1 || !e.ok2 ? "faltam Aprovações 1 e 2 vigentes" : !e.completude ? "confira o hash (traz os bloqueios)" : !e.completude.publicavel ? e.completude.total_bloqueios + " bloqueio(s) metodológico(s)" : "";
    html += '<p><button type="button" class="btn-fantasma" id="mh-li-homologar" data-mh-li-acao="homologar"' + (e.homologavel ? "" : ' disabled title="' + escapar("Bloqueado: " + motivo) + '"') + ">Homologar</button>" + (e.homologavel ? "" : ' <span class="dash-sub" id="mh-li-homologar-motivo">Bloqueado: ' + escapar(motivo) + "</span>") + "</p>";
    html += '<span class="rel-estado" id="mh-li-estado"></span></div>';
    return html;
  }
  function liAvisar(txt) { desenhar(); var e = document.getElementById("mh-li-estado"); if (e) e.textContent = txt; }
  function ligarLI(el) {
    var sel = el.querySelector("[data-mh-li-pacote]"); if (sel) sel.addEventListener("change", function () { li.sel = sel.value; desenhar(); });
    el.querySelectorAll("[data-mh-li-acao]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = liPacote(); if (!p) return;
        var estado = document.getElementById("mh-li-estado");
        if (b.dataset.mhLiAcao === "conferir-hash") {
          Promise.all([liRpc("li_hash_conteudo", { p_package_id: p.id }), liRpc("li_validar_completude", { p_package_id: p.id })])
            .then(function (r) { li.hash[p.id] = r[0]; li.completude[p.id] = r[1]; return liCarregar(); }).then(function () { desenhar(); })
            .catch(function (e) { if (estado) estado.textContent = "Não foi possível conferir: " + (window.mensagemHumana ? window.mensagemHumana(e) : e.message); });
        }
        if (b.dataset.mhLiAcao === "registrar-aprovacao") {
          var caixa = el.querySelector("#mh-li-aprovar"), etapa = Number(caixa.dataset.mhLiEtapa);
          var resp = caixa.querySelector("[data-mh-li-resp]").value, just = caixa.querySelector("[data-mh-li-just]").value;
          if (!caixa.querySelector("[data-mh-li-conferi]").checked) { if (estado) estado.textContent = "Marque que conferiu o pacote e o hash."; return; }
          if (estado) estado.textContent = "Registrando Aprovação " + etapa + "…";
          liRpc("registrar_aprovacao_li", { p_package_id: p.id, p_version: p.version, p_content_hash: li.hash[p.id], p_etapa: etapa, p_responsavel: resp, p_justificativa: just })
            .then(function () { return liCarregar(); }).then(function () { liAvisar("Aprovação " + etapa + " registrada."); })
            .catch(function (e) { delete li.hash[p.id]; liCarregar().then(function () { liAvisar("Aprovação recusada: " + (window.mensagemHumana ? window.mensagemHumana(e) : e.message)); }); });
        }
        if (b.dataset.mhLiAcao === "homologar") {
          if (b.disabled) return;
          var quem = window.prompt ? window.prompt("Quem executa a homologação (Daniel ou Rodrigo)?", "") : "";
          if (!quem) { if (estado) estado.textContent = "Homologação não executada: informe quem executa."; return; }
          if (estado) estado.textContent = "Homologando…";
          liRpc("homologar_pacote_li", { p_package_id: p.id, p_version: p.version, p_content_hash: li.hash[p.id], p_responsavel: quem })
            .then(function () { return liCarregar(); }).then(function () { liAvisar("Pacote da Leitura Integrada homologado (aprovado)."); })
            .catch(function (e) { delete li.hash[p.id]; liCarregar().then(function () { liAvisar("Homologação recusada: " + (window.mensagemHumana ? window.mensagemHumana(e) : e.message)); }); });
        }
      });
    });
  }

  function desenhar() {
    var el = alvo(); if (!el) return;
    var M = window.Metodologia;
    if (!M || !M.modoHomologacao()) { el.innerHTML = '<div class="dash-vazio">Esta tela só existe em modo de homologação (<code>?homologacao=1</code>).</div>'; return; }
    if (!P()) { el.innerHTML = '<div class="dash-vazio">Módulo do pacote indisponível.</div>'; return; }
    var pacotes = P().todos();
    var p = pacoteAtual();
    var html = '<div class="mh-topo"><label class="evo-campo"><span>Pacote</span><select data-mh-pacote>' +
      '<option value="inventario"' + (!pacoteSel || pacoteSel === "inventario" ? " selected" : "") + '>Inventário recuperado (não gravado) — rascunho</option>' +
      (decisoes() ? '<option value="candidato"' + (pacoteSel === "candidato" ? " selected" : "") + '>Candidato V1 — decisões fechadas (não gravado) — em_revisao</option>' : "") +
      pacotes.map(function (x) { return '<option value="' + escapar(x.id) + '"' + (x.id === pacoteSel ? " selected" : "") + ">" + escapar(x.code + " v" + x.version + " · " + x.status) + "</option>"; }).join("") + "</select></label>" +
      '<span class="rel-acoes"><button type="button" class="btn-fantasma" data-mh-acao="exportar-json">Exportar JSON</button>' +
      '<button type="button" class="btn-fantasma" data-mh-acao="exportar-csv">Exportar CSV</button>' +
      (p && p._inventario ? '<button type="button" class="btn-fantasma" data-mh-acao="importar-rascunho">Gravar inventário como RASCUNHO</button>' : "") +
      (p && p._candidato ? '<button type="button" class="btn-fantasma" data-mh-acao="gravar-candidato">Gravar candidato V1 (em_revisao, sem aprovar)</button>' : "") +
      '<span class="rel-estado" id="mh-estado"></span></span></div>' +
      '<div class="abas mh-abas" role="tablist">' + [["resumo", "Resumo e pendências"], ["itens", "84 itens"], ["associacoes", "Associações e pesos"], ["faixas", "Faixas"], ["regras", "Índice, Tríada, ausência"], ["conflitos", "Conflitos e registros"]].map(function (a) {
        return '<button type="button" class="aba' + (aba === a[0] ? " ativa" : "") + '" data-mh-aba="' + a[0] + '" role="tab" aria-selected="' + (aba === a[0]) + '">' + a[1] + "</button>";
      }).join("") + "</div>";
    if (!p) html += '<div class="dash-vazio">Sem inventário carregado.</div>';
    else html += { resumo: htmlResumo, itens: htmlItens, associacoes: htmlAssociacoes, faixas: htmlFaixas, regras: htmlRegras, conflitos: htmlConflitos }[aba](p);
    html += '<p class="dash-sub mh-rodape">Não existe "aprovar tudo". Aprovação = RPC <code>aprovar_pacote_metodologico</code> com validador sem erros e registro de homologação com responsável humano.</p>';
    html += htmlLI();
    el.innerHTML = html;
    ligar(el);
    ligarLI(el);
    if (li.pacotes === null && liSb() && !li.carregando) liCarregar().then(function () { var s2 = document.getElementById("secao-metodologia"); if (s2 && s2.classList.contains("ativa")) desenhar(); });
  }
  /** Redesenha e so depois escreve o aviso (o redesenho troca o #mh-estado). */
  function avisar(txt) { desenhar(); var e = document.getElementById("mh-estado"); if (e) e.textContent = txt; }
  function ligar(el) {
    var sel = el.querySelector("[data-mh-pacote]"); if (sel) sel.addEventListener("change", function () { pacoteSel = sel.value; desenhar(); });
    var filtro = el.querySelector("[data-mh-filtro]"); if (filtro) filtro.addEventListener("input", function () { filtroItens = filtro.value; var corpo = el.querySelector("#mh-itens tbody"); if (corpo) corpo.innerHTML = htmlItens(pacoteAtual()).split("<tbody>")[1].split("</tbody>")[0]; });
    el.querySelectorAll("[data-mh-aba]").forEach(function (b) { b.addEventListener("click", function () { aba = b.dataset.mhAba; desenhar(); }); });
    el.querySelectorAll("[data-mh-acao]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = pacoteAtual(); if (!p) return;
        var estado = document.getElementById("mh-estado");
        if (b.dataset.mhAcao === "exportar-json") baixar("pacote-metodologico-" + p.code + "-v" + p.version + ".json", P().exportarJSON(p), "application/json");
        if (b.dataset.mhAcao === "exportar-csv") baixar("pacote-metodologico-" + p.code + "-v" + p.version + ".csv", P().exportarCSV(p), "text/csv");
        if (b.dataset.mhAcao === "conferir-hash") {
          P().hashNoServidor(p.id).then(function (h) { hashes[p.id] = h; desenhar(); })
            .catch(function (e) { if (estado) estado.textContent = "Não foi possível conferir: " + (window.mensagemHumana ? window.mensagemHumana(e) : e.message); });
        }
        if (b.dataset.mhAcao === "registrar-aprovacao") {
          var caixa = el.querySelector(".mh-aprovar"), etapa = Number(caixa.dataset.mhEtapa);
          var resp = caixa.querySelector("[data-mh-resp]").value, just = caixa.querySelector("[data-mh-just]").value;
          if (!caixa.querySelector("[data-mh-conferi]").checked) { if (estado) estado.textContent = "Marque que conferiu o pacote e o hash."; return; }
          if (estado) estado.textContent = "Registrando Aprovação " + etapa + "…";
          P().registrarAprovacao(p.id, etapa, resp, just, hashes[p.id]).then(function () { avisar("Aprovação " + etapa + " registrada."); })
            .catch(function (e) { delete hashes[p.id]; avisar("Aprovação recusada: " + (window.mensagemHumana ? window.mensagemHumana(e) : e.message)); });
        }
        if (b.dataset.mhAcao === "homologar") {
          if (estado) estado.textContent = "Homologando…";
          P().homologar(p.id).then(function () { avisar("Pacote homologado (aprovado)."); })
            .catch(function (e) { delete hashes[p.id]; avisar("Homologação recusada: " + (window.mensagemHumana ? window.mensagemHumana(e) : e.message)); });
        }
        if (b.dataset.mhAcao === "gravar-candidato") {
          if (estado) estado.textContent = "Gravando candidato…";
          P().salvarRascunho(p).then(function (id) { pacoteSel = id; avisar("Candidato gravado (status em_revisao; nada aprovado; publicação técnica pendente)."); })
            .catch(function (e) { if (estado) estado.textContent = "Não foi possível gravar: " + (window.mensagemHumana ? window.mensagemHumana(e) : e.message); });
        }
        if (b.dataset.mhAcao === "importar-rascunho") {
          if (estado) estado.textContent = "Gravando rascunho…";
          P().salvarRascunho(p).then(function (id) { pacoteSel = id; avisar("Rascunho gravado (status rascunho; nada aprovado)."); })
            .catch(function (e) { if (estado) estado.textContent = "Não foi possível gravar: " + (window.mensagemHumana ? window.mensagemHumana(e) : e.message); });
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var M = window.Metodologia;
    var nav = document.getElementById("nav-metodologia");
    if (nav && M && M.modoHomologacao()) nav.classList.remove("hidden");
    var botao = document.querySelector('.nav-item[data-secao="metodologia"]');
    if (botao) botao.addEventListener("click", function () { setTimeout(desenhar, 50); });
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) window.HoloAuth.aoMudarEstado(function () { li = { pacotes: null, aprovacoes: [], sel: null, hash: {}, completude: {}, carregando: false, erro: null }; if (P()) P().carregar().then(function () { var s = document.getElementById("secao-metodologia"); if (s && s.classList.contains("ativa")) desenhar(); }); });
  });
  window.MetodologiaHomologacao = { desenhar: desenhar, selecionar: function (id) { pacoteSel = id; }, aba: function (a) { aba = a; } };
})();
