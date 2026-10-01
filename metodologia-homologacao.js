/* ===========================================================================
   METODOLOGIA / HOMOLOGACAO — tela interna de CONSULTA (V1, Etapa 4)
   ===========================================================================

   So aparece com ?homologacao=1 (Metodologia.modoHomologacao()). Mostra o
   inventario recuperado (metodologia-inventario.js) e os pacotes cadastrados
   (PacoteMetodologico): pacote, versao, status, 84 itens, conflitos,
   pendencias do validador, associacoes, pesos, faixas, Indice, Triada.
   Exporta JSON/CSV (so metodologia, nenhum dado de paciente).

   NAO tem botao "aprovar tudo". NAO publica nada. A unica escrita e "importar
   o inventario como RASCUNHO" (status rascunho, elementos para_homologacao),
   e a aprovacao continua sendo exclusiva da RPC com registro de homologacao.
   =========================================================================== */
(function () {
  "use strict";
  var escapar = window.escapar;
  var aba = "resumo", pacoteSel = null, filtroItens = "";

  function inventario() { return window.MetodologiaInventario || null; }
  function P() { return window.PacoteMetodologico; }
  function alvo() { return document.getElementById("metodologia-corpo"); }
  function pacoteAtual() {
    var inv = inventario(); if (!P()) return null;
    if (pacoteSel === "inventario" || !pacoteSel) return inv ? Object.assign(P().importarInventario(inv, "HOLOS-V1", 1), { _inventario: true }) : null;
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
      '<div class="fic-det"><span>Status</span><b>' + tag(p.status) + (p._inventario ? " (inventário, não gravado)" : "") + "</b></div>" +
      '<div class="fic-det"><span>Vigente</span><b>' + (r.vigente ? "sim" : "não") + "</b></div>" +
      '<div class="fic-det"><span>Hash</span><b>' + escapar(p.content_hash || "—") + "</b></div>" +
      '<div class="fic-det"><span>Responsável</span><b>' + escapar(p.responsible || "— (nenhum responsável humano registrado)") + "</b></div>" +
      "</div></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Saída oficial</h3><p class="dash-sub">' + (bloqueios.length ? "<b>Bloqueada.</b> " + escapar(bloqueios.join("; ")) : "Liberada pelo pacote ativo.") + "</p>" +
      '<p class="dash-sub">Status da barreira: <b>' + escapar(M ? M.status() : "?") + "</b></p></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Validador de publicação <em>' + v.total_erros + "</em></h3>" +
      '<p class="dash-sub">' + (v.publicavel ? "Nenhum erro estrutural. A aprovação continua exigindo registro de homologação com responsável humano (RPC)." : "O validador aponta; não corrige. Cada linha abaixo é uma decisão humana pendente.") + "</p>" +
      '<ul class="mh-lista" id="mh-pendencias">' + v.erros.map(function (e) { return "<li><code>" + escapar(e.codigo) + "</code> <b>" + escapar(e.onde) + "</b> — " + escapar(e.mensagem) + "</li>"; }).join("") + "</ul></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Contagem</h3><div class="mh-grade">' +
      [["Perguntas", r.perguntas], ["Associações", r.associacoes], ["Em conflito", r.conflitos], ["Faixas", r.faixas], ["Regras", r.regras], ["Registros de homologação", r.registros]].map(function (x) { return '<div class="fic-det"><span>' + x[0] + "</span><b>" + x[1] + "</b></div>"; }).join("") + "</div></div>";
  }
  function htmlItens(p) {
    var f = filtroItens.toLowerCase();
    var lista = (p.perguntas || []).filter(function (q) { return !f || (q.stable_id + " " + q.statement).toLowerCase().indexOf(f) >= 0; });
    return '<div class="dash-bloco"><h3 class="dash-titulo">Itens da edição <em>' + (p.perguntas || []).length + "</em></h3>" +
      '<input type="search" class="mh-filtro" data-mh-filtro placeholder="filtrar por ID ou enunciado" value="' + escapar(filtroItens) + '">' +
      '<table class="evo-tabela mh-tabela" id="mh-itens"><thead><tr><th>#</th><th>ID</th><th>Bloco</th><th>Enunciado</th><th>Escala</th><th>Orientação</th><th>Associações</th><th>Status</th></tr></thead><tbody>' +
      lista.map(function (q) {
        var as = (p.associacoes || []).filter(function (a) { return a.question_stable_id === q.stable_id; });
        return "<tr" + (as.some(function (a) { return a.conflict; }) ? ' class="mh-conflito"' : "") + "><td>" + (q.position || "") + "</td><td><b>" + escapar(q.stable_id) + "</b></td><td>" + escapar(q.block) + "</td><td>" + escapar(q.statement) + "</td><td>" + escapar(q.scale_code || "AUSENTE") + "</td><td>" + escapar(q.orientation || "AUSENTE") + "</td><td>" +
          as.map(function (a) { return escapar(a.destination_type + ":" + a.destination_id + " ×" + a.weight) + (a.conflict ? " ⚠" : ""); }).join("<br>") + "</td><td>" + tag(q.status) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function htmlAssociacoes(p) {
    var as = p.associacoes || [];
    return '<div class="dash-bloco"><h3 class="dash-titulo">Associações e pesos <em>' + as.length + "</em></h3>" +
      '<p class="dash-sub">Pesos recuperados (1..3; secundárias × fator ' + escapar(String((inventario() || {}).config_recuperada ? inventario().config_recuperada.peso_secundario_fator : "?")) + "). Nenhum normalizado, nenhum substituído, nenhum default oficial.</p>" +
      '<table class="evo-tabela mh-tabela" id="mh-associacoes"><thead><tr><th>Pergunta</th><th>Destino</th><th>Peso</th><th>Papel</th><th>Conflito</th><th>Fonte</th><th>Status</th></tr></thead><tbody>' +
      as.map(function (a) { return "<tr" + (a.conflict ? ' class="mh-conflito"' : "") + "><td>" + escapar(a.question_stable_id) + "</td><td>" + escapar(a.destination_type + ":" + a.destination_id) + "</td><td>" + escapar(a.weight === null || a.weight === undefined ? "AUSENTE" : String(a.weight)) + "</td><td>" + escapar(a.role || "") + "</td><td>" + (a.conflict ? "⚠ " + escapar(a.conflict_note || "") : escapar(a.conflict_note || "")) + "</td><td><small>" + escapar(a.source || "") + "</small></td><td>" + tag(a.status) + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  function htmlFaixas(p) {
    return '<div class="dash-bloco"><h3 class="dash-titulo">Faixas <em>' + (p.faixas || []).length + "</em></h3>" +
      '<table class="evo-tabela mh-tabela" id="mh-faixas"><thead><tr><th>Destino</th><th>Rótulo</th><th>Intervalo</th><th>Mensagem (nutri)</th><th>Status</th></tr></thead><tbody>' +
      (p.faixas || []).map(function (f) { return "<tr><td>" + escapar(f.destination_type + ":" + f.destination_id) + "</td><td>" + escapar(f.label) + "</td><td>" + (f.lower_inclusive ? "[" : "(") + f.lower_bound + ", " + f.upper_bound + (f.upper_inclusive ? "]" : ")") + "</td><td><small>" + escapar(f.message_nutri || "") + "</small></td><td>" + tag(f.status) + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  function htmlRegras(p) {
    var inv = inventario();
    return '<div class="dash-bloco"><h3 class="dash-titulo">Índice HOLOS</h3><pre class="mh-pre" id="mh-indice">' + escapar(JSON.stringify(inv ? inv.indice : null, null, 2)) + "</pre></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Tríada</h3><pre class="mh-pre" id="mh-triada">' + escapar(JSON.stringify(inv ? inv.triada : null, null, 2)) + "</pre></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Ausência e cobertura</h3><pre class="mh-pre">' + escapar(JSON.stringify(inv ? { ausencia: inv.ausencia, cobertura: inv.cobertura } : null, null, 2)) + "</pre></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Regras do pacote <em>' + (p.regras || []).length + "</em></h3>" +
      '<table class="evo-tabela mh-tabela" id="mh-regras"><thead><tr><th>Tipo</th><th>Alvo</th><th>Payload</th><th>Status</th></tr></thead><tbody>' +
      (p.regras || []).map(function (r) { return "<tr><td>" + escapar(r.rule_type) + "</td><td>" + escapar(r.target) + "</td><td><small>" + escapar(JSON.stringify(r.payload)).slice(0, 400) + "</small></td><td>" + tag(r.status) + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  function htmlConflitos(p) {
    var inv = inventario(), c = inv ? inv.conflitos : [];
    return '<div class="dash-bloco"><h3 class="dash-titulo">Conflitos recuperados <em>' + c.length + '</em></h3><ul class="mh-lista" id="mh-conflitos">' +
      c.map(function (x) { return "<li><b>" + escapar(x.tema) + " · " + escapar(x.elemento) + "</b> — " + escapar(x.descricao) + " <small>(" + escapar(x.fonte) + ")</small></li>"; }).join("") + "</ul>" +
      '<p class="dash-sub">SNT-101 e SNT-501: ver <code>docs/v1/metodologia/PENDENCIA-SNT-101-SNT-501.md</code>. Nenhum vencedor é escolhido aqui.</p></div>' +
      '<div class="dash-bloco"><h3 class="dash-titulo">Registros de homologação <em>' + (p.registros || []).length + '</em></h3>' +
      ((p.registros || []).length ? '<ul class="mh-lista">' + p.registros.map(function (r) { return "<li>" + escapar(r.decided_at) + " · <b>" + escapar(r.topic) + " / " + escapar(r.element) + "</b> · " + escapar(r.decision) + " · " + escapar(r.responsible) + (r.justification ? " — " + escapar(r.justification) : "") + "</li>"; }).join("") + "</ul>" : '<p class="dash-vazio">Nenhuma decisão registrada. Nenhum responsável é preenchido pelo sistema.</p>') + "</div>";
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
      pacotes.map(function (x) { return '<option value="' + escapar(x.id) + '"' + (x.id === pacoteSel ? " selected" : "") + ">" + escapar(x.code + " v" + x.version + " · " + x.status) + "</option>"; }).join("") + "</select></label>" +
      '<span class="rel-acoes"><button type="button" class="btn-fantasma" data-mh-acao="exportar-json">Exportar JSON</button>' +
      '<button type="button" class="btn-fantasma" data-mh-acao="exportar-csv">Exportar CSV</button>' +
      (p && p._inventario ? '<button type="button" class="btn-fantasma" data-mh-acao="importar-rascunho">Gravar inventário como RASCUNHO</button>' : "") +
      '<span class="rel-estado" id="mh-estado"></span></span></div>' +
      '<div class="abas mh-abas" role="tablist">' + [["resumo", "Resumo e pendências"], ["itens", "84 itens"], ["associacoes", "Associações e pesos"], ["faixas", "Faixas"], ["regras", "Índice, Tríada, ausência"], ["conflitos", "Conflitos e registros"]].map(function (a) {
        return '<button type="button" class="aba' + (aba === a[0] ? " ativa" : "") + '" data-mh-aba="' + a[0] + '" role="tab" aria-selected="' + (aba === a[0]) + '">' + a[1] + "</button>";
      }).join("") + "</div>";
    if (!p) html += '<div class="dash-vazio">Sem inventário carregado.</div>';
    else html += { resumo: htmlResumo, itens: htmlItens, associacoes: htmlAssociacoes, faixas: htmlFaixas, regras: htmlRegras, conflitos: htmlConflitos }[aba](p);
    html += '<p class="dash-sub mh-rodape">Não existe "aprovar tudo". Aprovação = RPC <code>aprovar_pacote_metodologico</code> com validador sem erros e registro de homologação com responsável humano.</p>';
    el.innerHTML = html;
    ligar(el);
  }
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
        if (b.dataset.mhAcao === "importar-rascunho") {
          if (estado) estado.textContent = "Gravando rascunho…";
          P().salvarRascunho(p).then(function (id) { pacoteSel = id; if (estado) estado.textContent = "Rascunho gravado (status rascunho; nada aprovado)."; desenhar(); })
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
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) window.HoloAuth.aoMudarEstado(function () { if (P()) P().carregar().then(function () { var s = document.getElementById("secao-metodologia"); if (s && s.classList.contains("ativa")) desenhar(); }); });
  });
  window.MetodologiaHomologacao = { desenhar: desenhar, selecionar: function (id) { pacoteSel = id; }, aba: function (a) { aba = a; } };
})();
