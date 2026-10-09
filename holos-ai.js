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

  var escapar = window.escapar;

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

  var dataBR = window.dataBR;

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
      var idade = Math.floor((Date.now() - new Date(p.nascimento + "T00:00:00").getTime()) / 31557600000);
      if (idade > 0 && idade < 150) t += linhaSe("Idade", idade + " anos");
    }
    t += linhaSe("Queixa principal", p.queixa);
    t += linhaSe("Objetivo", p.objetivo);
    return t;
  }

  /* Etapa 0 da V1 — o que ENTRA e o que NAO entra no contexto assistivo.

     Documento Mestre §36.1: o contexto reune SOMENTE registros salvos
     autorizados e conteudos APROVADOS. Enquanto o Pacote Metodologico V1 nao
     for homologado, nada que dependa de perguntas, pesos, faixas ou regras
     em rascunho entra aqui — nem rotulado "em homologacao". Ficam de fora:
     notas dos cinco sistemas, faixas, Indice HOLOS, Triada numerica,
     prioridades calculadas, sinais dominantes, combinacoes CMB, Leitura
     Integrada deterministica, recomendacoes REC/SEL e qualquer
     interpretacao derivada de regra nao aprovada.

     O que entra e DADO BRUTO consolidado e texto de autoria humana:
       - cadastro do paciente;
       - aplicacoes do HOLOSCAN aceitas pelo servidor: data e cobertura
         bruta (respondidas de 84, uma contagem, nao uma regra) — mapa gerado
         e nao salvo e previa e fica de fora;
       - a interpretacao profissional escrita pela nutricionista;
       - consultas da agenda;
       - respostas das ferramentas e a leitura profissional delas.

     Decisao de produto 09/10: exames e documentos NAO entram — nem valor
     laboratorial, nem resultado estruturado, nem PDF/imagem, nem Leitura
     Integrada. Sao so arquivos do prontuario. */
  function consolidada(p) {
    return window.Panorama && window.Panorama.consolidada ? window.Panorama.consolidada(p) : !!p;
  }
  function historicoConsolidado(pid) {
    var h = window.historicoPontuacao ? window.historicoPontuacao(pid) : [];
    return h.filter(consolidada);
  }
  function ultimaConsolidada(pid) {
    var c = historicoConsolidado(pid);
    return c.length ? c[c.length - 1] : null;
  }
  function linhaCobertura(p) {
    if (!p.cobertura || typeof p.cobertura.respondidos !== "number" || typeof p.cobertura.total !== "number") return "";
    return linhaSe("Cobertura bruta", p.cobertura.respondidos + " de " + p.cobertura.total + " perguntas respondidas");
  }

  function dadosHoloscan() {
    var pid = pacienteId();
    if (!pid || !window.historicoPontuacao) return "";
    var p = ultimaConsolidada(pid);
    if (!p) return "";
    var t = "";
    t += linhaSe("Data da aplicação", dataBR(p.quando));
    t += linhaCobertura(p);
    /* Simulacao 08/10: o texto dizia "pacote ainda nao aprovado" mesmo com a aplicacao
       calculada pelo HOLOS-V1 oficial. Agora depende da PROVENIENCIA da aplicacao. */
    var nat = window.Metodologia && window.Metodologia.naturezaAplicacao ? window.Metodologia.naturezaAplicacao(p) : "historica_sem_pacote";
    if (nat === "oficial_v1" && Array.isArray(p.sistemas)) {
      var A = window.HoloAusencia;
      t += linhaSe("Metodologia", (p.methodology_package_code || "HOLOS-V1") + (p.methodology_package_version ? " v" + p.methodology_package_version : "") + " (oficial)");
      t += "\n### Sistemas (nota 0–10; quanto mais baixa, mais sinais relatados)\n";
      p.sistemas.forEach(function (x) {
        var sem = A ? A.semNota(x) : (x.nota === null || x.nota === undefined);
        t += "- " + (x.nome || x.sistema) + ": " + (sem ? "sem nota (cobertura abaixo do mínimo)" : (A ? A.notaTexto(x) : String(x.nota)) + (x.faixa ? " · faixa " + (window.rotuloExibivel ? window.rotuloExibivel(x.faixa) : x.faixa) : "")) + "\n";
      });
      if (A && A.indiceTexto) t += linhaSe("Índice HOLOS", A.indiceTexto(p) + (p.indice_maximo ? " de " + p.indice_maximo : ""));
      if (p.triada) t += linhaSe("Tríade", ["fisico", "mental", "espiritual"].filter(function (k) { return typeof p.triada[k] === "number"; }).map(function (k) { return { fisico: "Físico", mental: "Mental", espiritual: "Espiritual" }[k] + " " + (A ? A.fmt(p.triada[k]) : p.triada[k]); }).join(" · "));
    } else {
      t += linhaSe("Resultados calculados", "não incluídos — aplicação " + (nat === "homologacao" ? "de homologação" : "histórica, sem o pacote metodológico oficial HOLOS-V1"));
    }
    var interp = window.interpretacaoDe ? window.interpretacaoDe(p.quando, pid) : null;
    if (interp && interp.texto) {
      t += "\n### Interpretação profissional (texto da nutricionista)\n" + interp.texto + "\n";
    }
    return t;
  }

  /* Aplicacoes consolidadas, lado a lado: data e cobertura bruta de cada
     uma. Sem notas, Indice ou Triada (metodologia nao aprovada) e sem
     comparabilidade (Mestre §19). */
  function dadosEvolucao() {
    var pid = pacienteId();
    if (!pid || !window.historicoPontuacao) return "";
    var hist = historicoConsolidado(pid);
    if (hist.length < 2) return "";
    var t = "(sem comparação calculada: a regra de comparabilidade não está homologada)\n";
    hist.forEach(function (snap, i) {
      t += "- Aplicação " + (i + 1) + " — " + dataBR(snap.quando) +
        (snap.cobertura && typeof snap.cobertura.respondidos === "number"
          ? " — " + snap.cobertura.respondidos + " de " + snap.cobertura.total + " respondidas" : "") + "\n";
    });
    return t;
  }

  function respostasDe(fid, pid) {
    var a = window.Aplicacoes && window.Aplicacoes.ultima ? window.Aplicacoes.ultima(fid, pid) : null;
    return a ? { app: a, r: a.respostas || {} } : null;
  }

  /* OQ3, PQQ e Mapa do Proposito: a ultima aplicacao concluida (ou o que a
     ficha tem). O Mapa do Proposito e montado do OQ3 + PQQ, como na tela —
     sem inferir nada que nao esteja escrito. */
  function dadosOQ3PQQ() {
    var pid = pacienteId();
    if (!pid) return "";
    var p = pacienteAtivo() || {};
    var oq3 = respostasDe("oq3", pid), pqq = respostasDe("pqq", pid);
    var o = oq3 ? oq3.r : (p.oq3 || {}), q = pqq ? pqq.r : (p.pqq || {});
    var t = "";
    if (o.quer || o.precisa || o.consegue || o.alavancas) {
      t += "\n### OQ³" + (oq3 && oq3.app.concluida_em ? " — " + dataBR(oq3.app.concluida_em) : "") + "\n";
      t += linhaSe("O que quer", o.quer);
      t += linhaSe("O que precisa", o.precisa);
      t += linhaSe("O que consegue", o.consegue);
      t += linhaSe("Alavancas", o.alavancas);
    }
    if (q.objetivo || q.verdadeiro || q.r1) {
      t += "\n### PQQ" + (pqq && pqq.app.concluida_em ? " — " + dataBR(pqq.app.concluida_em) : "") + "\n";
      t += linhaSe("Objetivo", q.objetivo);
      ["r1", "r2", "r3", "r4", "r5"].forEach(function (k, i) {
        if (q[k]) t += linhaSe("Por quê " + (i + 1), q[k]);
      });
      t += linhaSe("O verdadeiro", q.verdadeiro);
    }
    if (t) {
      t += "\n### Mapa do Propósito\n";
      t += linhaSe("Quer", o.quer);
      t += linhaSe("Precisa", o.precisa);
      t += linhaSe("Consegue", o.consegue);
      t += linhaSe("Alavancas", o.alavancas);
      t += linhaSe("Objetivo", q.objetivo);
      t += q.verdadeiro ? linhaSe("Propósito", "“" + q.verdadeiro + "”")
                        : "- Propósito: não definido (o PQQ não tem \"O verdadeiro\" preenchido)\n";
    }
    return t;
  }

  var FERRAMENTAS_CONTEXTO = ["linha_momentum", "mapa_crencas", "roda_vida", "carta_futuro"];

  function valorLegivel(v) {
    if (v === null || v === undefined || v === "") return "";
    if (Array.isArray(v)) return v.map(valorLegivel).filter(Boolean).join("; ");
    if (typeof v === "object") return Object.keys(v).map(function (k) { return valorLegivel(v[k]); }).filter(Boolean).join(", ");
    return String(v);
  }

  /* Linha do Momentum, Mapa de Crencas, Roda da Vida e Carta ao Futuro: a
     ultima aplicacao concluida de cada uma, campo a campo, com o rotulo do
     catalogo. Campo sem resposta nao entra. */
  function dadosFerramentasCatalogo() {
    var pid = pacienteId();
    if (!pid || !window.CATALOGO_FERRAMENTAS) return "";
    var t = "";
    FERRAMENTAS_CONTEXTO.forEach(function (fid) {
      var f = window.CATALOGO_FERRAMENTAS.filter(function (x) { return x.id === fid; })[0];
      var ap = respostasDe(fid, pid);
      if (!f || !ap) return;
      var linhas = "";
      (f.grupos || []).forEach(function (g) {
        if (g.origem === "momentum_dimensoes" && window.CorpoBancos && window.CorpoBancos.MOMENTUM) {
          window.CorpoBancos.MOMENTUM.dimensoes.forEach(function (d) {
            var v = valorLegivel(ap.r[d.id]);
            if (v) linhas += "- " + d.rotulo + ": " + v + "\n";
          });
        }
      });
      (f.campos || []).forEach(function (c) {
        var v = valorLegivel(ap.r[c.id]);
        if (v) linhas += "- " + c.rotulo + ": " + v + "\n";
      });
      if (f.lista && Array.isArray(ap.r[f.lista.id])) {
        ap.r[f.lista.id].forEach(function (item, i) {
          var v = valorLegivel(item);
          if (v) linhas += "- " + (f.lista.titulo_item || "Item") + " " + (i + 1) + ": " + v + "\n";
        });
      }
      if (ap.app.leitura) linhas += "- Leitura profissional: " + ap.app.leitura + "\n";
      if (!linhas) return;
      t += "\n### " + f.titulo + (ap.app.concluida_em ? " — " + dataBR(ap.app.concluida_em) : "") + "\n" + linhas;
    });
    return t;
  }

  function dadosFerramentas() {
    return dadosOQ3PQQ() + dadosFerramentasCatalogo();
  }

  /* Rodada 08: as consultas vem da agenda (que, com conta, e o servidor):
     proximas e anteriores, com data, hora, tipo e observacao. */
  function dadosConsultas() {
    var pid = pacienteId();
    if (!pid || !window.Agenda || !window.Agenda.todas) return "";
    var todas = window.Agenda.todas(pid);
    if (!todas.length) return "";
    var hoje = window.hojeISO ? window.hojeISO() : new Date().toISOString().slice(0, 10);
    var t = "";
    /* V1, Etapa 1: a agenda e AGENDAMENTO. Data passada nao quer dizer
       atendimento realizado — o atendimento e fato proprio (dadosAtendimentos). */
    todas.slice(0, 8).forEach(function (c) {
      t += "- " + (c.data >= hoje ? "Marcada" : "Marcada (data já passou; não é registro de atendimento)") + " — " + dataBR(c.data) +
        (c.hora ? " às " + String(c.hora).slice(0, 5) : "") +
        (c.tipo ? " · " + c.tipo : "") + (c.duracao ? " · " + c.duracao + " min" : "") +
        (c.nota ? " · " + c.nota : "") + "\n";
    });
    return t;
  }

  /* V1, Etapa 1: os ATENDIMENTOS clinicos registrados (encounters) — dado
     factual salvo: quando, origem (com/sem agendamento), tipo, e qual esta
     selecionado agora. Nenhuma nota, nenhum indice, nenhuma leitura. */
  function dadosAtendimentos() {
    var pid = pacienteId();
    var A = window.AtendimentoAtual;
    if (!pid || !A || !A.doPaciente) return "";
    var lista = A.doPaciente(pid);
    if (!lista.length) return "";
    var ativo = A.atual();
    var t = "";
    lista.slice(0, 8).forEach(function (e) {
      t += "- " + A.rotuloQuando(e) + (e.type ? " · " + e.type : "") +
        " · " + (e.consultation_id ? "com agendamento de origem" : "sem agendamento") +
        (ativo && ativo.id === e.id ? " · SELECIONADO" : "") + "\n";
    });
    return t;
  }

  /* V1, Etapa 2: anamnese e conduta SALVAS/REVISADAS do atendimento
     selecionado (ou, sem selecao, do ultimo atendimento com registro). So
     o que a profissional escreveu, com estado e origem; rascunho nunca;
     nenhum texto assistido existe para ser incluido. */
  function atendimentoDeContexto() {
    var pid = pacienteId(); var A = window.AtendimentoAtual; if (!pid || !A) return null;
    var ativo = A.atual(); if (ativo && ativo.patient_id === pid) return ativo;
    return A.doPaciente(pid).sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); })[0] || null;
  }
  function dadosAnamnese() {
    var e = atendimentoDeContexto(); var An = window.Anamnese; if (!e || !An) return "";
    var v = An.vigente(e.id); if (!v) return "";
    return "Atendimento de " + window.AtendimentoAtual.rotuloQuando(e) + " · rev. " + v.revision_number + " · " + v.status + "\n" + An.textoBruto(v);
  }
  function dadosConduta() {
    var e = atendimentoDeContexto(); var Cd = window.Conduta; if (!e || !Cd) return "";
    var v = Cd.vigente(e.id); if (!v) return "";
    return "Atendimento de " + window.AtendimentoAtual.rotuloQuando(e) + " · rev. " + v.revision_number + " · " + v.status + "\n" + Cd.textoBruto(v);
  }

  /* V1, Etapa 3: a timeline CONSOLIDADA (timeline.js) — so o que foi
     registrado; agendamento fora; o HOLOSCAN entra com data, versao e
     cobertura (nenhum Indice, nota ou faixa). */
  function dadosTimeline() {
    var pid = pacienteId(); if (!pid || !window.Timeline) return "";
    var ev = window.Timeline.eventos(pid, { semAgenda: true });
    if (!ev.length) return "";
    return ev.map(function (e) {
      var titulo = String(e.titulo).replace(/<[^>]+>/g, "");
      var det = e.tipo === "mapa" ? String(e.detalhe).replace(/Índice [^·]*·?\s*/, "").trim() : String(e.detalhe || "").replace(/<[^>]+>/g, "").replace(/&middot;/g, "·");
      return "- " + (e.quando ? dataBR(e.quando) : "sem data clínica") + " — " + titulo + (det ? " — " + det : "") +
        (e.revisao ? " [revisão ligada ao registro original]" : "") + (e.registrado_em ? " (registrado em " + dataBR(String(e.registrado_em).slice(0, 10)) + ")" : "");
    }).join("\n");
  }

  /* Relatorios EMITIDOS (snapshot), so quando a profissional escolhe o
     atalho; rascunho de relatorio nunca entra. */
  function dadosRelatorios() {
    var pid = pacienteId(); var R = window.Relatorios; if (!pid || !R) return "";
    var lista = R.emitidos(pid); if (!lista.length) return "";
    return lista.map(function (r) {
      return "## Emissão nº " + r.revision_number + " — " + (r.title || "Relatório clínico") + " — emitida em " + dataBR(String(r.issued_at).slice(0, 10)) +
        (r.supersedes_report_id ? " (retifica " + r.supersedes_report_id + ")" : "") + (r.superseded_at ? " (substituída por retificação)" : "") + "\n" + R.textoBruto(r);
    }).join("\n\n");
  }
  function gerarRelatorios() {
    var t = cabecalhoContexto("Relatórios emitidos");
    t += secaoSe("Paciente", dadosPaciente());
    t += secaoSe("Relatórios emitidos (snapshots, nunca rascunho)", dadosRelatorios() || "(nenhum relatório emitido)");
    return t.trim();
  }

  // --- Geradores por tipo de atalho ---

  var ATALHOS_CONTEXTO = [
    { id: "completo",  rotulo: "Caso completo",  gerar: gerarCompleto },
    { id: "holoscan",  rotulo: "HOLOSCAN",        gerar: gerarHoloscan },
    { id: "evolucao",  rotulo: "Evolução / retorno", gerar: gerarEvolucao },
    { id: "relatorios", rotulo: "Relatórios emitidos", gerar: gerarRelatorios }
  ];

  function cabecalhoContexto(tipo) {
    var p = pacienteAtivo();
    return "# Contexto HOLOS AI — " + tipo + "\n" +
      "Paciente: " + (p ? p.nome : "desconhecido") + "\n" +
      "Gerado em: " + new Date().toLocaleString("pt-BR") + "\n" +
      "Conteúdo: só registros salvos no servidor e texto da profissional. Notas, faixas, " +
      "Índice e Tríada entram só de aplicação calculada pelo pacote oficial HOLOS-V1. " +
      "Já prioridades, combinações, Leitura Integrada e sugestões automáticas NÃO estão incluídos. " +
      "Exames e documentos do prontuário (arquivos e valores) também NÃO estão incluídos.\n" +
      "---\n";
  }

  /* Leitura Integrada: NAO entra no contexto (regra nota <= 3 x exame fora
     da faixa ainda nao homologada — Mestre §24, §36.1). */

  function gerarCompleto() {
    var t = cabecalhoContexto("Caso completo");
    t += secaoSe("Paciente", dadosPaciente());
    t += secaoSe("HOLOSCAN — Mapa HOLOS atual", dadosHoloscan());
    t += secaoSe("Atendimentos registrados", dadosAtendimentos());
    t += secaoSe("Anamnese (salva/revisada, texto da profissional)", dadosAnamnese());
    t += secaoSe("Conduta e acordos (salvos/revisados)", dadosConduta());
    t += secaoSe("Linha do tempo consolidada (data clínica e data de registro)", dadosTimeline());
    t += secaoSe("Agenda (agendamentos)", dadosConsultas());
    t += secaoSe("Ferramentas (OQ³, PQQ, Mapa do Propósito e outras)", dadosFerramentas());
    var evo = dadosEvolucao();
    if (evo) t += secaoSe("Aplicações do HOLOSCAN (datas e cobertura)", evo);
    return t.trim() || "Nenhum dado disponível para este paciente.";
  }

  function gerarHoloscan() {
    var t = cabecalhoContexto("HOLOSCAN");
    t += secaoSe("Paciente", dadosPaciente());
    t += secaoSe("HOLOSCAN — Mapa HOLOS atual", dadosHoloscan());
    return t.trim() || "Nenhuma aplicação do HOLOSCAN disponível.";
  }

  function gerarEvolucao() {
    var t = cabecalhoContexto("Evolução / retorno");
    t += secaoSe("Paciente", dadosPaciente());
    var evo = dadosEvolucao();
    if (evo) t += secaoSe("Aplicações do HOLOSCAN (datas e cobertura)", evo);
    else t += secaoSe("HOLOSCAN — Mapa HOLOS atual", dadosHoloscan());
    t += secaoSe("Atendimentos registrados", dadosAtendimentos());
    t += secaoSe("Anamnese (salva/revisada, texto da profissional)", dadosAnamnese());
    t += secaoSe("Conduta e acordos (salvos/revisados)", dadosConduta());
    t += secaoSe("Linha do tempo consolidada (data clínica e data de registro)", dadosTimeline());
    t += secaoSe("Agenda (agendamentos recentes)", dadosConsultas());
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

    var p = pacienteAtivo();
    var nomeP = p ? p.nome : "paciente";

    var html =
      '<div class="ai-hub">' +
        '<div class="ai-hub-intro">' +
          '<div class="ai-hub-icone" aria-hidden="true">&#9670;</div>' +
          '<h3 class="ai-hub-titulo">HOLOS AI</h3>' +
          '<p class="ai-hub-descricao">Inteligência profissional para apoio à leitura ' +
            'e ao raciocínio sobre o caso de ' + escapar(nomeP) + '.</p>' +
        '</div>' +

        '<div class="ai-hub-agentes" role="group" aria-label="Agentes externos">' +
          '<a class="ai-hub-btn ai-btn-chatgpt" id="ai-btn-chatgpt" ' +
            'href="#" target="_blank" rel="noopener noreferrer" ' +
            'aria-label="Abrir HOLOS AI no ChatGPT">' +
            '<span class="ai-btn-icone" aria-hidden="true">&#9671;</span>' +
            'Abrir HOLOS AI no ChatGPT</a>' +
          '<a class="ai-hub-btn ai-btn-gemini" id="ai-btn-gemini" ' +
            'href="#" target="_blank" rel="noopener noreferrer" ' +
            'aria-label="Abrir HOLOS AI no Gemini">' +
            '<span class="ai-btn-icone" aria-hidden="true">&#9670;</span>' +
            'Abrir HOLOS AI no Gemini</a>' +
        '</div>' +

        '<div class="ai-hub-contexto">' +
          '<h4>Contexto para HOLOS AI</h4>' +
          '<p class="ai-hub-instrucao">Gere um resumo estruturado do paciente atual. ' +
            'Copie o texto e cole no agente externo.</p>' +
          '<div class="ai-hub-atalhos" id="ai-hub-atalhos" role="group" ' +
            'aria-label="Tipo de contexto">' +
            ATALHOS_CONTEXTO.map(function (a) {
              return '<button type="button" class="ai-atalho-ctx" data-ctx="' +
                a.id + '" aria-pressed="false">' + escapar(a.rotulo) + '</button>';
            }).join("") +
          '</div>' +
          '<div class="ai-hub-saida hidden" id="ai-hub-saida" ' +
            'aria-live="polite">' +
            '<div class="ai-hub-acoes">' +
              '<span class="ai-hub-tipo" id="ai-hub-tipo"></span>' +
              '<button type="button" class="btn-verde ai-hub-copiar" id="ai-hub-copiar">' +
                'Copiar contexto</button>' +
            '</div>' +
            '<pre class="ai-hub-texto" id="ai-hub-texto" tabindex="0"></pre>' +
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

  /* Rodada 08: sem URL configurada, o botao nao pode parecer que funciona.
     Fica marcado "Em desenvolvimento", com aria-disabled, sem href — e o
     clique nao faz nada (ligarEventos). Com URL, vira link normal. */
  function ajustarAgente(el, url, nome) {
    if (!el) return;
    var selo = el.querySelector(".ai-selo-dev");
    if (url) {
      el.href = url;
      el.classList.remove("ai-btn-indisponivel");
      el.removeAttribute("title");
      el.removeAttribute("aria-disabled");
      el.setAttribute("aria-label", "Abrir HOLOS AI no " + nome);
      if (selo) selo.remove();
    } else {
      el.removeAttribute("href");
      el.classList.add("ai-btn-indisponivel");
      el.setAttribute("aria-disabled", "true");
      el.setAttribute("aria-label", "HOLOS AI no " + nome + " — em desenvolvimento");
      el.title = "Em desenvolvimento: o agente ainda não foi configurado. O contexto abaixo já pode ser copiado.";
      if (!selo) {
        selo = document.createElement("span");
        selo.className = "ai-selo-dev";
        selo.textContent = "Em desenvolvimento";
        el.appendChild(selo);
      }
    }
  }

  function atualizarLinksAgentes() {
    ajustarAgente(document.getElementById("ai-btn-chatgpt"), HOLOS_AI_URLS.chatgpt, "ChatGPT");
    ajustarAgente(document.getElementById("ai-btn-gemini"), HOLOS_AI_URLS.gemini, "Gemini");
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
      atalhos.querySelectorAll(".ai-atalho-ctx").forEach(function (b) {
        var ativo = b.dataset.ctx === tipo;
        b.classList.toggle("ativo", ativo);
        b.setAttribute("aria-pressed", ativo ? "true" : "false");
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
