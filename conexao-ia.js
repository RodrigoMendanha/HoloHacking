/* ===========================================================================
   CONEXAO COM ASSISTENTE DE IA (MCP) — aba "Assistente de IA" do Perfil (27/10)

   A nutricionista gera uma CHAVE pessoal e cola a URL de conexao no assistente
   (Claude, ChatGPT ou outro compativel com MCP). Depois e so pedir:
   "@HoloHacking gere o Resultado da Marina" — o assistente busca o contexto no
   HoloHacking e grava o Resultado HOLOS na ficha, para ela revisar e emitir.
   Substitui o "agente" (copiar o Pacote, colar no GPT, colar o JSON de volta).

   - a chave aparece UMA vez (o banco guarda so o SHA-256); pode ser revogada;
   - conta pendente/recusada nao gera chave (o servidor recusa);
   - lista as chaves (nome, inicio, criada, ultimo uso) e o uso recente
     (ferramenta, ok/erro, data) — nunca conteudo clinico.
   Servidor: supabase/functions/holohacking-mcp. Banco: migration 20261027100000.
   =========================================================================== */
(function () {
  "use strict";

  var FUNCAO = "holohacking-mcp";
  var NOME_FERR = { buscar_pacientes: "Buscar paciente", contexto_paciente: "Contexto do paciente", instrucoes_resultado: "Instruções do Resultado",
    gerar_resultado: "Gerar Resultado (análise)", gerar_resultado_playbook: "Gerar Resultado (Playbook)", resultados_paciente: "Resultados do paciente",
    agenda: "Agenda", estrategias_playbook: "Playbook" };
  var novaChave = null;   // so na memoria desta tela, ate sair dela

  function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function sb() { return window.supabaseClient || null; }
  function painel() { return document.getElementById("painel-ia"); }
  function dataBR(iso) {
    if (!iso) return "—";
    var d = new Date(iso); if (isNaN(d)) return "—";
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  function urlConexao(chave) {
    var base = String(window.HOLO_SUPABASE_URL || "").replace(/\/+$/, "");
    return base + "/functions/v1/" + FUNCAO + "/" + chave;
  }
  function restrita() { return !!(window.ContaAcesso && window.ContaAcesso.restrito && window.ContaAcesso.restrito()); }
  function msg(t, tipo) { var m = document.getElementById("ia-msg"); if (m) { m.textContent = t || ""; m.className = "ia-msg" + (tipo ? " ia-msg-" + tipo : ""); } }

  function carregar() {
    var c = sb(); if (!c) return Promise.resolve({ chaves: [], usos: [] });
    return Promise.all([
      Promise.resolve(c.from("mcp_keys").select("id, nome, prefixo, created_at, last_used_at, revoked_at").order("created_at", { ascending: false })),
      Promise.resolve(c.from("mcp_usage_log").select("ferramenta, ok, erro, created_at").order("created_at", { ascending: false }).limit(10))
    ]).then(function (r) {
      return { chaves: (r[0] && r[0].data) || [], usos: (r[1] && r[1].data) || [], erro: (r[0] && r[0].error) || null };
    }, function (e) { return { chaves: [], usos: [], erro: e }; });
  }

  var PASSOS = '<ol class="ia-passos">' +
    '<li><b>Claude</b> (claude.ai ou app): Configurações → <b>Conectores</b> → <b>Adicionar conector personalizado</b> → nome <i>HoloHacking</i> → cole a URL → Adicionar.</li>' +
    '<li><b>ChatGPT</b>: Configurações → <b>Conectores</b> (modo desenvolvedor) → <b>Criar</b> → cole a URL em "URL do servidor MCP" → sem autenticação.</li>' +
    '<li>Na conversa, ative o HoloHacking e peça: <i>"Gere o Resultado HOLOS da Marina"</i>.</li></ol>';

  function desenhar() {
    var p = painel(); if (!p) return;
    if (!sb()) { p.innerHTML = '<div class="card ia-card"><p>Entre com a sua conta para conectar um assistente de IA.</p></div>'; return; }
    if (restrita()) {
      p.innerHTML = '<div class="card ia-card"><h3 class="ia-tit">Assistente de IA</h3><p>A conexão com assistentes de IA fica disponível quando a equipe HoloHacking liberar a sua conta.</p></div>';
      return;
    }
    p.innerHTML = '<div class="card ia-card"><p class="ia-carregando">Carregando…</p></div>';
    carregar().then(function (d) {
      var ativas = d.chaves.filter(function (k) { return !k.revoked_at; });
      var html = '<div class="card ia-card">' +
        '<p class="eyebrow">Novo · Assistente de IA (MCP)</p>' +
        '<h3 class="ia-tit">Gere o Resultado HOLOS conversando com a sua IA</h3>' +
        '<p class="ia-lead">Conecte o HoloHacking ao seu assistente (Claude, ChatGPT ou outro compatível com MCP) <b>uma vez</b>. Depois é só pedir <i>"gere o Resultado da Marina"</i>: ' +
        'o assistente lê o HOLOSCAN, as ferramentas e o Mapeamento aqui no sistema e grava o Resultado na ficha, para você revisar e emitir. Sem copiar e colar.</p>' +
        '<ul class="ia-garantias"><li>Só você: o assistente enxerga apenas os seus pacientes.</li><li>Nada vai para o paciente sem você: o PDF continua saindo da página Resultado.</li><li>Pode desligar quando quiser: revogue a chave abaixo.</li></ul>';
      if (novaChave) {
        html += '<div class="ia-nova" role="status"><p class="ia-nova-tit">Sua URL de conexão — copie agora</p>' +
          '<div class="ia-url"><input type="text" id="ia-url" readonly value="' + esc(urlConexao(novaChave.chave)) + '" aria-label="URL de conexão do HoloHacking">' +
          '<button type="button" class="btn-verde" data-ia-acao="copiar">Copiar</button></div>' +
          '<p class="ia-aviso">Por segurança ela <b>não aparece de novo</b>. Guarde como uma senha: quem tiver esta URL acessa os seus pacientes pelo assistente. Se perder, gere outra e revogue esta.</p>' +
          PASSOS + '</div>';
      }
      html += '<div class="ia-gerar"><label for="ia-nome">Nome da conexão</label><input type="text" id="ia-nome" maxlength="60" placeholder="Ex.: Claude do consultório">' +
        '<button type="button" class="btn-verde" data-ia-acao="gerar"' + (ativas.length >= 5 ? ' disabled title="No máximo 5 conexões ativas: revogue uma"' : "") + '>Gerar URL de conexão</button></div>' +
        '<p id="ia-msg" class="ia-msg" role="status" aria-live="polite"></p>';
      html += '<h4 class="ia-sub">Conexões</h4>' + (d.chaves.length ? '<table class="ia-tabela"><thead><tr><th>Nome</th><th>Chave</th><th>Criada</th><th>Último uso</th><th></th></tr></thead><tbody>' +
        d.chaves.map(function (k) {
          return '<tr data-ia-chave="' + esc(k.id) + '"' + (k.revoked_at ? ' class="ia-revogada"' : "") + '><td>' + esc(k.nome) + '</td><td><code>' + esc(k.prefixo) + '…</code></td><td>' + esc(dataBR(k.created_at)) +
            '</td><td>' + esc(dataBR(k.last_used_at)) + '</td><td>' + (k.revoked_at ? '<span class="ia-selo">Revogada</span>' : '<button type="button" class="btn-borda-ouro" data-ia-acao="revogar" data-ia-id="' + esc(k.id) + '">Revogar</button>') + "</td></tr>";
        }).join("") + "</tbody></table>" : '<p class="ia-vazio">Nenhuma conexão ainda.</p>');
      if (d.usos.length) html += '<h4 class="ia-sub">Uso recente</h4><ul class="ia-usos">' + d.usos.map(function (u) {
        return '<li><span class="' + (u.ok ? "ia-ok" : "ia-erro") + '">' + (u.ok ? "✓" : "✗") + "</span> " + esc(NOME_FERR[u.ferramenta] || u.ferramenta) + ' <small>' + esc(dataBR(u.created_at)) + "</small></li>";
      }).join("") + "</ul>";
      if (!novaChave) html += '<details class="ia-como"><summary>Como conectar no Claude ou no ChatGPT</summary>' + PASSOS + "</details>";
      html += "</div>";
      p.innerHTML = html;
    });
  }

  function gerar() {
    var c = sb(); if (!c) return;
    var nome = (document.getElementById("ia-nome") || {}).value || "";
    var b = painel().querySelector('[data-ia-acao="gerar"]'); if (b) b.disabled = true;
    msg("Gerando…");
    Promise.resolve(c.rpc("criar_chave_mcp", { p_nome: nome })).then(function (r) {
      if (r && r.error) {
        var h = r.error.hint;
        msg(h === "conta_nao_liberada" ? "A sua conta ainda não foi liberada." : h === "mcp_limite_chaves" ? "No máximo 5 conexões ativas: revogue uma antes." : "Não foi possível gerar agora. Tente de novo.", "erro");
        if (b) b.disabled = false; return;
      }
      novaChave = r.data; desenhar();
    }, function () { msg("Não foi possível gerar agora. Tente de novo.", "erro"); if (b) b.disabled = false; });
  }
  function revogar(id) {
    var c = sb(); if (!c) return;
    var faz = function () {
      Promise.resolve(c.rpc("revogar_chave_mcp", { p_id: id })).then(function (r) {
        if (r && r.error) { msg("Não foi possível revogar agora.", "erro"); return; }
        if (novaChave && novaChave.id === id) novaChave = null;
        desenhar();
      });
    };
    var conf = window.abrirModalConfirmar ? window.abrirModalConfirmar({ titulo: "Revogar conexão", corpo: "<p>O assistente perde o acesso ao HoloHacking na hora. Os Resultados já gravados continuam na ficha.</p>", botaoConfirmar: "Revogar" })
      : Promise.resolve(window.confirm("Revogar esta conexão? O assistente perde o acesso na hora.") ? "confirmar" : null);
    conf.then(function (r) { if (r === "confirmar") faz(); });
  }

  document.addEventListener("click", function (ev) {
    var aba = ev.target.closest && ev.target.closest('[data-aba-perfil="ia"]');
    if (aba) { setTimeout(desenhar, 0); return; }
    var a = ev.target.closest && ev.target.closest("[data-ia-acao]");
    if (!a || !painel() || !painel().contains(a)) return;
    var acao = a.dataset.iaAcao;
    if (acao === "gerar") gerar();
    else if (acao === "revogar") revogar(a.dataset.iaId);
    else if (acao === "copiar") {
      var i = document.getElementById("ia-url"); if (!i) return;
      i.select();
      var ok = function () { msg("URL copiada. Cole no seu assistente.", "ok"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(i.value).then(ok, function () { document.execCommand("copy"); ok(); });
      else { document.execCommand("copy"); ok(); }
    }
  });
  /* sair do Perfil (ou da conta) esquece a chave recem-gerada */
  document.addEventListener("click", function (ev) { if (novaChave && ev.target.closest && ev.target.closest(".nav-item:not([data-secao='perfil'])")) novaChave = null; }, true);
  window.ConexaoIA = { desenhar: desenhar, esquecer: function () { novaChave = null; }, urlConexao: urlConexao };
})();
