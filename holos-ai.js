/* ===========================================================================
   HOLOS AI — assistente profissional integrado à ficha do paciente
   ===========================================================================

   Frontend → Supabase Edge Function → Gemini API.
   A chave da IA fica no servidor. O frontend nunca a ve.
   O contexto do paciente e montado pelo servidor a cada requisicao.
   =========================================================================== */

(function () {
  "use strict";

  var EDGE_FUNCTION = "/functions/v1/holos-ai";
  var threadAtual = null;
  var carregando = false;

  function supabaseUrl() {
    if (window.supabaseClient && window.supabaseClient.supabaseUrl)
      return window.supabaseClient.supabaseUrl;
    var el = document.querySelector('script[src*="supabase-client"]');
    return "https://sllhyymeeyoozokgbnuv.supabase.co";
  }

  function baseUrl() { return supabaseUrl() + EDGE_FUNCTION; }

  async function token() {
    if (!window.supabaseClient) return null;
    var r = await window.supabaseClient.auth.getSession();
    return r?.data?.session?.access_token || null;
  }

  function autenticado() {
    return window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva();
  }

  function pacienteId() {
    return window.pacienteAtivoId ? window.pacienteAtivoId() : null;
  }

  function escapar(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  async function chamar(action, dados) {
    var t = await token();
    if (!t) throw new Error("Não autenticado.");
    var resp = await fetch(baseUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + t
      },
      body: JSON.stringify(Object.assign({ action: action }, dados))
    });
    var json = await resp.json();
    if (!resp.ok) throw new Error(json.error || "Erro " + resp.status);
    return json;
  }

  // --- Markdown basico para HTML ---
  function md(texto) {
    return escapar(texto)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/^### (.+)$/gm, '<h4 class="ai-h">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="ai-h">$1</h3>')
      .replace(/^- (.+)$/gm, '<span class="ai-li">&bull; $1</span>')
      .replace(/\n/g, "<br>");
  }

  // --- Atalhos de prompt ---
  var ATALHOS = [
    { rotulo: "Resumir caso", prompt: "Resuma o caso clínico deste paciente com base nos dados disponíveis: queixa, HOLOSCAN mais recente, exames e ferramentas aplicadas." },
    { rotulo: "Analisar HOLOSCAN", prompt: "Analise o resultado do HOLOSCAN mais recente deste paciente. Quais sistemas estão mais sobrecarregados? O que a Tríade indica? Que investigações você sugere?" },
    { rotulo: "Sugerir próximos passos", prompt: "Com base no estado atual do paciente (mapa, exames, ferramentas já aplicadas), quais seriam os próximos passos clínicos mais indicados dentro do método HoloHacking?" },
    { rotulo: "Correlacionar exames", prompt: "Analise os exames laboratoriais deste paciente em relação ao mapa HOLOSCAN. Há convergências ou divergências entre o relato e os exames? O que merece atenção?" },
  ];

  // --- Desenhar a aba ---

  function desenhar() {
    var alvo = document.getElementById("aba-holos-ai");
    if (!alvo) return;
    var pid = pacienteId();

    if (!autenticado()) {
      alvo.innerHTML =
        '<div class="lista-vazia"><strong>HOLOS AI requer autenticação</strong>' +
        "<span>Faça login para usar o assistente de IA.</span></div>";
      return;
    }

    if (!pid || pid === "_sem_paciente") {
      alvo.innerHTML =
        '<div class="lista-vazia"><strong>Selecione um paciente</strong>' +
        "<span>Abra a ficha de um paciente para conversar com o HOLOS AI.</span></div>";
      return;
    }

    var html =
      '<div class="ai-container">' +
        '<div class="ai-sidebar" id="ai-sidebar">' +
          '<div class="ai-sidebar-topo">' +
            '<button type="button" class="btn-verde ai-nova" id="ai-nova-conversa">Nova conversa</button>' +
          '</div>' +
          '<div class="ai-lista-threads" id="ai-lista-threads">' +
            '<p class="dash-vazio">Carregando…</p>' +
          '</div>' +
        '</div>' +
        '<div class="ai-chat" id="ai-chat">' +
          '<div class="ai-mensagens" id="ai-mensagens">' +
            bemVindo() +
          '</div>' +
          '<div class="ai-atalhos" id="ai-atalhos">' +
            ATALHOS.map(function (a) {
              return '<button type="button" class="ai-atalho" data-prompt="' +
                escapar(a.prompt) + '">' + escapar(a.rotulo) + '</button>';
            }).join("") +
          '</div>' +
          '<form class="ai-form" id="ai-form">' +
            '<textarea class="ai-input" id="ai-input" rows="2" ' +
              'placeholder="Pergunte ao HOLOS AI sobre este paciente…" ' +
              'maxlength="4000"></textarea>' +
            '<button type="submit" class="btn-verde ai-enviar" id="ai-enviar">Enviar</button>' +
          '</form>' +
        '</div>' +
      '</div>';

    alvo.innerHTML = html;
    ligarEventos();
    carregarThreads();
  }

  function bemVindo() {
    return '<div class="ai-boas-vindas">' +
      '<div class="ai-boas-icone">&#9670;</div>' +
      '<strong>HOLOS AI</strong>' +
      '<span>Assistente profissional para apoio ao raciocínio clínico.</span>' +
      '<span class="ai-aviso">A IA não diagnostica, não prescreve e não substitui ' +
      'a nutricionista. Use os atalhos abaixo ou escreva sua pergunta.</span>' +
    '</div>';
  }

  // --- Eventos ---

  function ligarEventos() {
    var form = document.getElementById("ai-form");
    var input = document.getElementById("ai-input");
    var novaBtn = document.getElementById("ai-nova-conversa");
    var atalhos = document.getElementById("ai-atalhos");

    if (form) form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var texto = input.value.trim();
      if (texto && !carregando) enviar(texto);
    });

    if (input) input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        var texto = input.value.trim();
        if (texto && !carregando) enviar(texto);
      }
    });

    if (novaBtn) novaBtn.addEventListener("click", function () {
      if (!carregando) novaConversa();
    });

    if (atalhos) atalhos.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-prompt]");
      if (btn && !carregando) enviar(btn.dataset.prompt);
    });

    var lista = document.getElementById("ai-lista-threads");
    if (lista) lista.addEventListener("click", function (ev) {
      var item = ev.target.closest("[data-thread-id]");
      if (item && !carregando) abrirThread(item.dataset.threadId);

      var del = ev.target.closest(".ai-del-thread");
      if (del) {
        ev.stopPropagation();
        var tid = del.dataset.threadId;
        if (tid && !carregando) apagarThread(tid);
      }
    });
  }

  // --- Threads ---

  async function carregarThreads() {
    var pid = pacienteId();
    if (!pid) return;
    try {
      var r = await chamar("list_threads", { patient_id: pid });
      renderizarThreads(r.threads || []);
    } catch (e) {
      var lista = document.getElementById("ai-lista-threads");
      if (lista) lista.innerHTML = '<p class="dash-vazio">' + escapar(e.message) + '</p>';
    }
  }

  function renderizarThreads(threads) {
    var lista = document.getElementById("ai-lista-threads");
    if (!lista) return;
    if (!threads.length) {
      lista.innerHTML = '<p class="dash-vazio">Nenhuma conversa ainda.</p>';
      return;
    }
    lista.innerHTML = threads.map(function (t) {
      var ativa = threadAtual && threadAtual === t.id ? " ativa" : "";
      return '<div class="ai-thread-item' + ativa + '" data-thread-id="' + t.id + '">' +
        '<span class="ai-thread-titulo">' + escapar(t.titulo) + '</span>' +
        '<button type="button" class="ai-del-thread" data-thread-id="' + t.id +
          '" title="Apagar conversa">&times;</button>' +
      '</div>';
    }).join("");
  }

  async function novaConversa() {
    var pid = pacienteId();
    if (!pid) return;
    threadAtual = null;
    var msgs = document.getElementById("ai-mensagens");
    if (msgs) msgs.innerHTML = bemVindo();
    var atalhos = document.getElementById("ai-atalhos");
    if (atalhos) atalhos.classList.remove("hidden");
    marcarThreadAtiva();
  }

  async function abrirThread(threadId) {
    threadAtual = threadId;
    marcarThreadAtiva();
    var msgs = document.getElementById("ai-mensagens");
    if (msgs) msgs.innerHTML = '<p class="dash-vazio">Carregando…</p>';
    var atalhos = document.getElementById("ai-atalhos");
    if (atalhos) atalhos.classList.add("hidden");
    try {
      var r = await chamar("get_messages", { thread_id: threadId });
      renderizarMensagens(r.messages || []);
    } catch (e) {
      if (msgs) msgs.innerHTML = '<p class="dash-vazio">' + escapar(e.message) + '</p>';
    }
  }

  async function apagarThread(threadId) {
    if (!confirm("Apagar esta conversa? Esta ação não pode ser desfeita.")) return;
    try {
      await chamar("delete_thread", { thread_id: threadId });
      if (threadAtual === threadId) {
        threadAtual = null;
        var msgs = document.getElementById("ai-mensagens");
        if (msgs) msgs.innerHTML = bemVindo();
        var atalhos = document.getElementById("ai-atalhos");
        if (atalhos) atalhos.classList.remove("hidden");
      }
      carregarThreads();
    } catch (e) {
      alert("Erro ao apagar: " + e.message);
    }
  }

  function marcarThreadAtiva() {
    var lista = document.getElementById("ai-lista-threads");
    if (!lista) return;
    lista.querySelectorAll(".ai-thread-item").forEach(function (el) {
      el.classList.toggle("ativa", el.dataset.threadId === threadAtual);
    });
  }

  // --- Mensagens ---

  function renderizarMensagens(msgs) {
    var alvo = document.getElementById("ai-mensagens");
    if (!alvo) return;
    if (!msgs.length) {
      alvo.innerHTML = bemVindo();
      return;
    }
    alvo.innerHTML = msgs
      .filter(function (m) { return m.role !== "system"; })
      .map(function (m) { return bolha(m.role, m.content); })
      .join("");
    alvo.scrollTop = alvo.scrollHeight;
  }

  function bolha(role, content) {
    var classe = role === "assistant" ? "ai-msg ai-assistente" : "ai-msg ai-usuario";
    var label = role === "assistant" ? "HOLOS AI" : "Você";
    return '<div class="' + classe + '">' +
      '<span class="ai-msg-label">' + label + '</span>' +
      '<div class="ai-msg-corpo">' + md(content) + '</div>' +
    '</div>';
  }

  function adicionarBolha(role, content) {
    var alvo = document.getElementById("ai-mensagens");
    if (!alvo) return;
    // Remove boas-vindas se presente
    var bv = alvo.querySelector(".ai-boas-vindas");
    if (bv) bv.remove();
    alvo.insertAdjacentHTML("beforeend", bolha(role, content));
    alvo.scrollTop = alvo.scrollHeight;
  }

  function mostrarDigitando() {
    var alvo = document.getElementById("ai-mensagens");
    if (!alvo) return;
    alvo.insertAdjacentHTML("beforeend",
      '<div class="ai-msg ai-assistente ai-digitando" id="ai-digitando">' +
      '<span class="ai-msg-label">HOLOS AI</span>' +
      '<div class="ai-msg-corpo"><span class="ai-dots"><i></i><i></i><i></i></span></div></div>');
    alvo.scrollTop = alvo.scrollHeight;
  }

  function removerDigitando() {
    var el = document.getElementById("ai-digitando");
    if (el) el.remove();
  }

  // --- Enviar mensagem ---

  async function enviar(texto) {
    if (carregando) return;
    carregando = true;
    var input = document.getElementById("ai-input");
    var btn = document.getElementById("ai-enviar");
    if (input) input.value = "";
    if (btn) btn.disabled = true;

    var atalhos = document.getElementById("ai-atalhos");
    if (atalhos) atalhos.classList.add("hidden");

    try {
      // Criar thread se necessario
      if (!threadAtual) {
        var pid = pacienteId();
        if (!pid) throw new Error("Nenhum paciente selecionado.");
        var titulo = texto.length > 60 ? texto.slice(0, 57) + "…" : texto;
        var r = await chamar("create_thread", { patient_id: pid, titulo: titulo });
        threadAtual = r.thread.id;
        carregarThreads();
      }

      adicionarBolha("user", texto);
      mostrarDigitando();

      var resp = await chamar("send_message", {
        thread_id: threadAtual,
        content: texto
      });

      removerDigitando();
      adicionarBolha("assistant", resp.message.content);
    } catch (e) {
      removerDigitando();
      adicionarBolha("assistant", "Erro: " + e.message);
    } finally {
      carregando = false;
      if (btn) btn.disabled = false;
      if (input) input.focus();
    }
  }

  // --- Hook na troca de aba da ficha ---

  var desenhoOriginal = window.desenharAbaDaFicha;
  window.desenharAbaDaFicha = function (nome) {
    if (typeof desenhoOriginal === "function") desenhoOriginal(nome);
    if (nome === "holos-ai") desenhar();
  };

  // Reset ao trocar de paciente
  var anteriorTrocaPaciente = window.aoTrocarPaciente;
  window.aoTrocarPaciente = function () {
    if (typeof anteriorTrocaPaciente === "function") anteriorTrocaPaciente();
    threadAtual = null;
  };
})();
