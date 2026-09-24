/* ===========================================================================
   HOLOS AI — hub de inteligencia profissional na ficha do paciente
   ===========================================================================

   A nutricionista acessa agentes externos (ChatGPT, Gemini) e cola o
   contexto do paciente gerado aqui. Nenhum dado e enviado automaticamente.
   =========================================================================== */

(function () {
  "use strict";

  // --- Configuracao centralizada dos URLs dos agentes ---
  var HOLOS_AI_URLS = {
    chatgpt: "",
    gemini:  ""
  };

  function escapar(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function pacienteId() {
    return window.pacienteAtivoId ? window.pacienteAtivoId() : null;
  }

  function pacienteAtivo() {
    if (!window.pacientesTodos) return null;
    var id = pacienteId();
    return id ? window.pacientesTodos().find(function (p) { return p.id === id; }) : null;
  }

  function autenticado() {
    return window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva();
  }

  // --- Montagem de contexto ---

  function dataBR(iso) {
    if (!iso) return "";
    var p = String(iso).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso;
  }

  function linhaSe(rotulo, valor) {
    if (valor == null || valor === "" || valor === undefined) return "";
    return rotulo + ": " + String(valor) + "\n";
  }

  function secaoSe(titulo, corpo) {
    corpo = (corpo || "").trim();
    if (!corpo) return "";
    return "\n## " + titulo + "\n" + corpo + "\n";
  }

  function dadosPaciente() {
    var p = pacienteAtivo();
    if (!p) return "";
    var t = "";
    t += linhaSe("Nome", p.nome);
    t += linhaSe("Sexo", p.sexo);
    if (p.nascimento) {
      t += linhaSe("Nascimento", dataBR(p.nascimento));
      var idade = Math.floor((Date.now() - new Date(p.nascimento).getTime()) / 31557600000);
      if (idade > 0 && idade < 150) t += linhaSe("Idade", idade + " anos");
    }
    t += linhaSe("Queixa principal", p.queixa);
    t += linhaSe("Objetivo", p.objetivo);
    return t;
  }

  function dadosHoloscan() {
    var pid = pacienteId();
    if (!pid || !window.ultimaPontuacao) return "";
    var p = window.ultimaPontuacao(pid);
    if (!p) return "";
    var t = "";
    t += linhaSe("Data da aplicação", dataBR(p.quando));
    if (p.cobertura && typeof p.cobertura.percentual === "number")
      t += linhaSe("Cobertura", p.cobertura.percentual + "%");
    t += "\n### Sistemas (do mais sobrecarregado ao mais equilibrado)\n";
    var ordenados = p.sistemas.slice().sort(function (a, b) { return a.nota - b.nota; });
    ordenados.forEach(function (s) {
      var partes = [s.faixa ? "faixa " + s.faixa : ""];
      if (typeof s.respondidos === "number" && typeof s.total_marcadores === "number")
        partes.push(s.respondidos + "/" + s.total_marcadores + " respondidas");
      if (s.avaliavel === false) partes.push("sem dados suficientes");
      t += "- " + s.nome + ": " + (s.avaliavel === false ? "—" : s.nota.toFixed(1)) +
        (partes.filter(Boolean).length ? " (" + partes.filter(Boolean).join(", ") + ")" : "") + "\n";
    });
    if (p.triada) {
      t += "\n### Tríada\n";
      t += "- Físico: " + p.triada.fisico.toFixed(1) + "\n";
      t += "- Mental: " + p.triada.mental.toFixed(1) + "\n";
      t += "- Espiritual: " + p.triada.espiritual.toFixed(1) + "\n";
    }
    if (typeof p.indice === "number") {
      t += "\n### Índice HOLOS\n";
      t += linhaSe("Valor", p.indice);
      if (typeof p.indice_maximo === "number")
        t += linhaSe("Máximo possível", p.indice_maximo);
    }
    var comDominantes = p.sistemas.filter(function (s) { return s.dominantes && s.dominantes.length; });
    if (comDominantes.length) {
      t += "\n### Sinais dominantes\n";
      comDominantes.forEach(function (s) {
        t += "- " + s.nome + ": " + s.dominantes.map(function (d) { return d.rotulo || d.marcador_id; }).join(", ") + "\n";
      });
    }
    if (p.combinacoes && p.combinacoes.length) {
      t += "\n### Leituras combinadas\n";
      p.combinacoes.forEach(function (c) {
        if (c.leitura) t += "- " + c.id + ": " + c.leitura + "\n";
      });
    }
    var interp = window.interpretacaoDe ? window.interpretacaoDe(p.quando, pid) : null;
    if (interp && interp.texto) {
      t += "\n### Interpretação profissional\n" + interp.texto + "\n";
    }
    return t;
  }

  function dadosExames() {
    var pid = pacienteId();
    if (!pid) return "";
    var exames;
    try {
      exames = JSON.parse(localStorage.getItem("holohacking.exames")) || {};
    } catch (e) { return ""; }
    var d = exames[pid];
    if (!d || typeof d !== "object") return "";
    var g = window.HOLOSCAN || null;
    var mapa = g && g.questionario ? g.questionario() : [];
    var exDef = g && g.exames ? g.exames() : [];
    var nomes = {};
    exDef.forEach(function (e) { nomes[e.id] = e.nome; });
    var chaves = Object.keys(d).filter(function (k) { return d[k] !== "" && d[k] != null; });
    if (!chaves.length) return "";
    var t = "";
    chaves.forEach(function (k) {
      var nome = nomes[k] || k;
      var ref = exDef.find(function (e) { return e.id === k; });
      var linha = "- " + nome + ": " + d[k];
      if (ref) {
        if (ref.unidade) linha += " " + ref.unidade;
        if (ref.min != null && ref.max != null)
          linha += " (ref: " + ref.min + "–" + ref.max + ")";
      }
      t += linha + "\n";
    });
    return t;
  }

  function dadosEvolucao() {
    var pid = pacienteId();
    if (!pid || !window.historicoPontuacao) return "";
    var hist = window.historicoPontuacao(pid);
    if (hist.length < 2) return "";
    var t = "";
    hist.forEach(function (snap, i) {
      t += "\n### Aplicação " + (i + 1) + " — " + dataBR(snap.quando) + "\n";
      var ordenados = snap.sistemas.slice().sort(function (a, b) { return a.nota - b.nota; });
      ordenados.forEach(function (s) {
        t += "- " + s.nome + ": " + (s.avaliavel === false ? "—" : s.nota.toFixed(1)) +
          (s.faixa ? " (" + s.faixa + ")" : "") + "\n";
      });
      if (snap.triada)
        t += "- Tríada: F " + snap.triada.fisico.toFixed(1) +
          " / M " + snap.triada.mental.toFixed(1) +
          " / E " + snap.triada.espiritual.toFixed(1) + "\n";
      if (typeof snap.indice === "number")
        t += "- Índice HOLOS: " + snap.indice + "\n";
    });
    return t;
  }

  function dadosFerramentas() {
    var pid = pacienteId();
    if (!pid) return "";
    var t = "";
    // OQ3
    var p = pacienteAtivo();
    if (p && p.oq3) {
      var o = p.oq3;
      if (o.quer || o.precisa || o.consegue) {
        t += "\n### OQ3\n";
        t += linhaSe("O que quer", o.quer);
        t += linhaSe("O que precisa", o.precisa);
        t += linhaSe("O que consegue", o.consegue);
        t += linhaSe("Alavancas", o.alavancas);
      }
    }
    // PQQ
    if (p && p.pqq) {
      var q = p.pqq;
      if (q.objetivo || q.verdadeiro) {
        t += "\n### PQQ\n";
        t += linhaSe("Objetivo", q.objetivo);
        t += linhaSe("Verdadeiro objetivo", q.verdadeiro);
        ["r1", "r2", "r3", "r4", "r5"].forEach(function (k, i) {
          if (q[k]) t += linhaSe("Porquê " + (i + 1), q[k]);
        });
      }
    }
    // Aplicacoes de ferramentas (se disponivel)
    var dados;
    try {
      dados = JSON.parse(localStorage.getItem("holohacking.dados.aplicacoes")) || [];
    } catch (e) { dados = []; }
    var doP = dados.filter(function (a) { return a.paciente_id === pid; });
    if (doP.length) {
      t += "\n### Ferramentas aplicadas\n";
      doP.forEach(function (a) {
        t += "- " + (a.ferramenta || a.tool_id || "Ferramenta") +
          " em " + dataBR(a.data || a.created_at) + "\n";
        if (a.resultado) t += "  Resultado: " + String(a.resultado).slice(0, 200) + "\n";
      });
    }
    return t;
  }

  function dadosConsultas() {
    var pid = pacienteId();
    if (!pid) return "";
    var dados;
    try {
      dados = JSON.parse(localStorage.getItem("holohacking.dados.consultas")) || [];
    } catch (e) { dados = []; }
    var doP = dados.filter(function (c) { return c.patient_id === pid; })
      .sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); });
    if (!doP.length) return "";
    var t = "";
    doP.slice(0, 5).forEach(function (c, i) {
      t += "\n### " + (i === 0 ? "Última consulta" : "Consulta " + (i + 1)) +
        " — " + dataBR(c.data) + "\n";
      t += linhaSe("Tipo", c.tipo);
      t += linhaSe("Observações", c.observacoes);
      t += linhaSe("Conduta", c.conduta);
    });
    return t;
  }

  // --- Geradores por tipo de atalho ---

  var ATALHOS_CONTEXTO = [
    { id: "completo",  rotulo: "Caso completo",  gerar: gerarCompleto },
    { id: "holoscan",  rotulo: "HOLOSCAN",        gerar: gerarHoloscan },
    { id: "exames",    rotulo: "Exames",           gerar: gerarExames },
    { id: "evolucao",  rotulo: "Evolução / retorno", gerar: gerarEvolucao }
  ];

  function cabecalhoContexto(tipo) {
    var p = pacienteAtivo();
    return "# Contexto HOLOS AI — " + tipo + "\n" +
      "Paciente: " + (p ? p.nome : "desconhecido") + "\n" +
      "Gerado em: " + new Date().toLocaleString("pt-BR") + "\n" +
      "---\n";
  }

  function gerarCompleto() {
    var t = cabecalhoContexto("Caso completo");
    t += secaoSe("Paciente", dadosPaciente());
    t += secaoSe("HOLOSCAN — Mapa HOLOS atual", dadosHoloscan());
    t += secaoSe("Exames laboratoriais", dadosExames());
    t += secaoSe("Consultas recentes", dadosConsultas());
    t += secaoSe("Ferramentas (OQ3, PQQ e outras)", dadosFerramentas());
    var evo = dadosEvolucao();
    if (evo) t += secaoSe("Evolução do HOLOSCAN", evo);
    return t.trim() || "Nenhum dado disponível para este paciente.";
  }

  function gerarHoloscan() {
    var t = cabecalhoContexto("HOLOSCAN");
    t += secaoSe("Paciente", dadosPaciente());
    t += secaoSe("HOLOSCAN — Mapa HOLOS atual", dadosHoloscan());
    return t.trim() || "Nenhuma aplicação do HOLOSCAN disponível.";
  }

  function gerarExames() {
    var t = cabecalhoContexto("Exames");
    t += secaoSe("Paciente", dadosPaciente());
    t += secaoSe("Exames laboratoriais", dadosExames());
    var holoscan = dadosHoloscan();
    if (holoscan) t += secaoSe("HOLOSCAN (referência)", holoscan);
    return t.trim() || "Nenhum exame registrado para este paciente.";
  }

  function gerarEvolucao() {
    var t = cabecalhoContexto("Evolução / retorno");
    t += secaoSe("Paciente", dadosPaciente());
    var evo = dadosEvolucao();
    if (evo) t += secaoSe("Evolução do HOLOSCAN", evo);
    else t += secaoSe("HOLOSCAN — Mapa HOLOS atual", dadosHoloscan());
    t += secaoSe("Consultas recentes", dadosConsultas());
    t += secaoSe("Ferramentas (OQ3, PQQ e outras)", dadosFerramentas());
    return t.trim() || "Nenhum dado de evolução disponível.";
  }

  // --- Desenhar o hub ---

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
        "<span>Abra a ficha de um paciente para usar a HOLOS AI.</span></div>";
      return;
    }

    var html =
      '<div class="ai-hub">' +
        '<div class="ai-hub-intro">' +
          '<div class="ai-hub-icone">&#9670;</div>' +
          '<h3 class="ai-hub-titulo">HOLOS AI</h3>' +
          '<p class="ai-hub-descricao">Inteligência profissional para apoio à leitura ' +
            'e ao raciocínio sobre o caso.</p>' +
        '</div>' +

        '<div class="ai-hub-agentes">' +
          '<a class="ai-hub-btn ai-btn-chatgpt" id="ai-btn-chatgpt" ' +
            'href="#" target="_blank" rel="noopener noreferrer">' +
            '<span class="ai-btn-icone">&#9671;</span>' +
            'Abrir HOLOS AI no ChatGPT</a>' +
          '<a class="ai-hub-btn ai-btn-gemini" id="ai-btn-gemini" ' +
            'href="#" target="_blank" rel="noopener noreferrer">' +
            '<span class="ai-btn-icone">&#9670;</span>' +
            'Abrir HOLOS AI no Gemini</a>' +
        '</div>' +

        '<div class="ai-hub-contexto">' +
          '<h4>Contexto para HOLOS AI</h4>' +
          '<p class="ai-hub-instrucao">Gere um resumo estruturado do paciente atual. ' +
            'Copie o texto e cole no agente externo.</p>' +
          '<div class="ai-hub-atalhos" id="ai-hub-atalhos">' +
            ATALHOS_CONTEXTO.map(function (a) {
              return '<button type="button" class="ai-atalho-ctx" data-ctx="' +
                a.id + '">' + escapar(a.rotulo) + '</button>';
            }).join("") +
          '</div>' +
          '<div class="ai-hub-saida hidden" id="ai-hub-saida">' +
            '<div class="ai-hub-acoes">' +
              '<span class="ai-hub-tipo" id="ai-hub-tipo"></span>' +
              '<button type="button" class="btn-verde ai-hub-copiar" id="ai-hub-copiar">' +
                'Copiar contexto</button>' +
            '</div>' +
            '<pre class="ai-hub-texto" id="ai-hub-texto"></pre>' +
          '</div>' +
        '</div>' +

        '<p class="ai-hub-privacidade">Os dados permanecem neste navegador. ' +
          'Nenhuma informação é enviada automaticamente para serviços externos. ' +
          'A ação de copiar e usar o contexto parte de você.</p>' +
      '</div>';

    alvo.innerHTML = html;
    atualizarLinksAgentes();
    ligarEventos();
  }

  function atualizarLinksAgentes() {
    var chatgpt = document.getElementById("ai-btn-chatgpt");
    var gemini = document.getElementById("ai-btn-gemini");
    if (chatgpt) {
      if (HOLOS_AI_URLS.chatgpt) {
        chatgpt.href = HOLOS_AI_URLS.chatgpt;
      } else {
        chatgpt.removeAttribute("href");
        chatgpt.classList.add("ai-btn-indisponivel");
        chatgpt.title = "Link será configurado em breve";
      }
    }
    if (gemini) {
      if (HOLOS_AI_URLS.gemini) {
        gemini.href = HOLOS_AI_URLS.gemini;
      } else {
        gemini.removeAttribute("href");
        gemini.classList.add("ai-btn-indisponivel");
        gemini.title = "Link será configurado em breve";
      }
    }
  }

  function ligarEventos() {
    var atalhos = document.getElementById("ai-hub-atalhos");
    if (atalhos) atalhos.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-ctx]");
      if (!btn) return;
      var tipo = btn.dataset.ctx;
      var def = ATALHOS_CONTEXTO.find(function (a) { return a.id === tipo; });
      if (!def) return;
      var texto = def.gerar();
      var saida = document.getElementById("ai-hub-saida");
      var area = document.getElementById("ai-hub-texto");
      var tipoEl = document.getElementById("ai-hub-tipo");
      if (saida) saida.classList.remove("hidden");
      if (area) area.textContent = texto;
      if (tipoEl) tipoEl.textContent = def.rotulo;
      // marca ativo
      atalhos.querySelectorAll(".ai-atalho-ctx").forEach(function (b) {
        b.classList.toggle("ativo", b.dataset.ctx === tipo);
      });
    });

    var copiar = document.getElementById("ai-hub-copiar");
    if (copiar) copiar.addEventListener("click", function () {
      var area = document.getElementById("ai-hub-texto");
      if (!area) return;
      var texto = area.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function () {
          copiar.textContent = "Copiado!";
          setTimeout(function () { copiar.textContent = "Copiar contexto"; }, 2000);
        });
      } else {
        var ta = document.createElement("textarea");
        ta.value = texto;
        ta.style.cssText = "position:fixed;left:-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        copiar.textContent = "Copiado!";
        setTimeout(function () { copiar.textContent = "Copiar contexto"; }, 2000);
      }
    });

    // Prevenir navegacao em links sem URL
    document.querySelectorAll(".ai-btn-indisponivel").forEach(function (el) {
      el.addEventListener("click", function (ev) { ev.preventDefault(); });
    });
  }

  // --- Expor configuracao dos URLs ---
  window.HolosAI = {
    configurarUrls: function (urls) {
      if (urls.chatgpt !== undefined) HOLOS_AI_URLS.chatgpt = urls.chatgpt;
      if (urls.gemini !== undefined) HOLOS_AI_URLS.gemini = urls.gemini;
      atualizarLinksAgentes();
    },
    urls: function () {
      return { chatgpt: HOLOS_AI_URLS.chatgpt, gemini: HOLOS_AI_URLS.gemini };
    }
  };

  // --- Hook na troca de aba da ficha ---

  var desenhoOriginal = window.desenharAbaDaFicha;
  window.desenharAbaDaFicha = function (nome) {
    if (typeof desenhoOriginal === "function") desenhoOriginal(nome);
    if (nome === "holos-ai") desenhar();
  };

  var anteriorTrocaPaciente = window.aoTrocarPaciente;
  window.aoTrocarPaciente = function () {
    if (typeof anteriorTrocaPaciente === "function") anteriorTrocaPaciente();
  };
})();
