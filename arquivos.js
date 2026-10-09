/* ===========================================================================
   ARQUIVOS — documentos e exames do prontuario, e relatorio da ficha
   ===========================================================================

   DOCUMENTOS E EXAMES (decisao de produto 09/10)
   Biblioteca do paciente: o arquivo (PDF do exame, foto do laudo, receita)
   fica guardado no armazenamento privado da conta (bucket patient-documents
   + tabela documents), com copia neste navegador (IndexedDB, arquivo-store.js).
   Abre em qualquer aparelho. O sistema NAO le, nao extrai, nao interpreta,
   nao estrutura, nao classifica e nao compara exame, e o arquivo nao entra
   em HOLOSCAN, Resultado HOLOS, Indice, Triade, relatorio clinico, Evolucao
   nem HOLOS AI. Documento nao e excluido: e arquivado.

   O painel de exames (valores digitados, coletas, confronto com o HOLOSCAN)
   e a Leitura Integrada sairam do fluxo: o historico antigo fica no banco,
   so leitura, e nao aparece na interface.

   RELATORIO
   Checklist imprimivel da ficha (HOLOSCAN, consultas, referencia
   administrativa aos documentos e interpretacao profissional).
   =========================================================================== */

(function () {
  "use strict";

  var SEM_PACIENTE = "_sem_paciente";

  function motor() { return window.HOLOSCAN || null; }
  function paciente() {
    try { return (window.pacienteAtivoId && window.pacienteAtivoId()) || SEM_PACIENTE; }
    catch (e) { return SEM_PACIENTE; }
  }
  function nomePaciente() {
    try { return (window.pacienteAtivoNome && window.pacienteAtivoNome()) || null; }
    catch (e) { return null; }
  }
  var escapar = window.escapar;
  var dataBR = window.dataBR;
  function hoje() {
    var d = new Date();
    return String(d.getDate()).padStart(2, "0") + "/" +
           String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
  }
  function temSupa() {
    return window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva();
  }
  function pontuacaoGuardada() {
    return window.ultimaPontuacao ? window.ultimaPontuacao() : null;
  }

  /* ==================================================== DOCUMENTOS E EXAMES
     BIBLIOTECA DO PACIENTE (decisao de produto 09/10). Exame e documento sao
     SO arquivos do prontuario: ficam guardados (servidor + copia neste
     navegador) para a nutricionista abrir e baixar em qualquer aparelho. O
     sistema nao le, nao extrai, nao interpreta, nao classifica, nao compara e
     nao usa o arquivo em nenhum calculo, resultado, relatorio ou HOLOS AI.

     Documento nao e excluido: e ARQUIVADO. Sai da lista, mas o registro e o
     arquivo continuam guardados; "Ver arquivados" mostra e permite restaurar. */

  var TIPOS_BIBLIOTECA = ["Exame", "Laudo", "Receita", "Encaminhamento", "Documento", "Outro"];
  /* documentos antigos guardaram outros nomes de tipo: so a TELA traduz, o registro fica como esta */
  function rotuloTipo(t) {
    if (!t) return "Outro";
    if (/^exame/i.test(t)) return "Exame";
    return t;
  }
  function dataHoraBR(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear() +
      " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function responsavel() {
    var eu = window.PerfilProfissional ? window.PerfilProfissional.dados() : null;
    return (eu && eu.nome) || "Você";
  }

  /* ARQUIVAR DOCUMENTO — um caminho so, para a aba da ficha e a tela
     Documentos: confirma no modal global, arquiva no servidor (ou neste
     aparelho, se o documento so existe aqui) e diz o que aconteceu de
     verdade. Paciente arquivado nao tem documento mexido. Resolve true se
     arquivou. */
  window.arquivarDocumento = function (id, nome, pid) {
    if (pid && window.bloqueioArquivado && window.bloqueioArquivado(pid)) return Promise.resolve(false);
    var perguntar = window.abrirModalConfirmar
      ? window.abrirModalConfirmar({
          titulo: "Arquivar documento",
          subtitulo: nome || "",
          corpo: "<p>O documento sai da lista do prontuário, mas <b>não é apagado</b>: o registro e o arquivo " +
                 "continuam guardados e podem ser restaurados em “Ver arquivados”.</p>",
          botaoConfirmar: "Arquivar"
        })
      : Promise.resolve(confirm("Arquivar este documento? Ele continua guardado e pode ser restaurado.") ? "confirmar" : null);
    return perguntar.then(function (r) {
      if (r !== "confirmar") return false;
      return window.ArquivoStore.arquivar(id, true).then(function () {
        if (window.avisar) window.avisar("Documento arquivado. Ele continua guardado no prontuário.");
        return true;
      }, function (err) {
        console.error("[documentos] arquivar:", err && err.message ? err.message : err);
        if (window.avisar) window.avisar("Não foi possível arquivar o documento — ele continua na lista. Tente de novo.");
        return false;
      });
    });
  };
  /* nome antigo: qualquer tela esquecida que ainda chame "excluir" ARQUIVA */
  window.excluirDocumento = window.arquivarDocumento;

  window.restaurarDocumento = function (id, pid) {
    if (pid && window.bloqueioArquivado && window.bloqueioArquivado(pid)) return Promise.resolve(false);
    return window.ArquivoStore.arquivar(id, false).then(function () {
      if (window.avisar) window.avisar("Documento restaurado para a lista.");
      return true;
    }, function (err) {
      console.error("[documentos] restaurar:", err && err.message ? err.message : err);
      if (window.avisar) window.avisar("Não foi possível restaurar o documento. Tente de novo.");
      return false;
    });
  };

  /* abrir e baixar: o arquivo vem do servidor (ou da copia deste aparelho) como blob; nenhum link publico */
  function abrirOuBaixar(id, baixar) {
    return window.ArquivoStore.pegar(id).then(function (r) {
      if (!r || !r.arquivo) {
        if (window.avisar) window.avisar("Arquivo indisponível neste momento. Verifique a conexão e tente de novo.");
        return;
      }
      var url = URL.createObjectURL(r.arquivo);
      if (baixar) {
        var a = document.createElement("a");
        a.href = url;
        a.download = r.nome || "documento";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(url, "_blank");
      }
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }).catch(function () {
      if (window.avisar) window.avisar("Erro ao abrir o arquivo.");
    });
  }
  window.abrirDocumentoDoProntuario = abrirOuBaixar;

  var verArquivados = false;
  var painelLigado = false;

  /** O que é delegado no container: prende uma vez, para a vida da página. */
  function ligarPainel() {
    if (painelLigado) return;
    painelLigado = true;
    var painel = document.getElementById("aba-documentos");
    if (!painel) return;

    painel.addEventListener("click", function (ev) {
      var a = ev.target.closest("[data-acao]");
      if (a) {
        if (a.dataset.acao === "adicionar-documento") {
          var campoArq = document.getElementById("doc-arquivo");
          if (campoArq) campoArq.click();
        }
        if (a.dataset.acao === "ver-arquivados") { verArquivados = !verArquivados; listarDocumentos(); }
        return;
      }
      var abrir = ev.target.closest("[data-abrir]");
      if (abrir) { abrirOuBaixar(abrir.dataset.abrir, false); return; }
      var baixar = ev.target.closest("[data-baixar]");
      if (baixar) { abrirOuBaixar(baixar.dataset.baixar, true); return; }
      var arq = ev.target.closest("[data-arquivar]");
      if (arq) {
        window.arquivarDocumento(arq.dataset.arquivar, arq.dataset.nome, paciente())
          .then(function (saiu) { if (saiu) listarDocumentos(); });
        return;
      }
      var rest = ev.target.closest("[data-restaurar]");
      if (rest) {
        window.restaurarDocumento(rest.dataset.restaurar, paciente()).then(function (ok) { if (ok) listarDocumentos(); });
      }
    });
  }

  function desenharDocumentos() {
    var alvo = document.getElementById("aba-documentos");
    if (!window.ArquivoStore) {
      alvo.innerHTML = '<p class="q-erro">O guardador de arquivos não carregou.</p>';
      return;
    }
    verArquivados = false;

    alvo.innerHTML =
      '<div class="fic-consultas-topo">' +
        '<button type="button" class="btn-verde" data-acao="adicionar-documento">+ Adicionar arquivo</button>' +
      "</div>" +

      '<p class="arq-intro">Exames, laudos, receitas e outros documentos do paciente ficam guardados aqui para você consultar. ' +
      "O sistema <b>não lê nem interpreta</b> os arquivos: eles não entram no HOLOSCAN, no Resultado, em relatórios nem no HOLOS AI. " +
      (temSupa()
        ? "O arquivo vai para o <b>armazenamento privado da sua conta</b> e abre em qualquer aparelho em que você entrar.</p>"
        : "<b>Sem login, o arquivo fica só neste navegador.</b></p>") +

      '<section class="arq-cartao bib-form" aria-label="Adicionar arquivo">' +
        '<h4 class="arq-titulo">Adicionar arquivo</h4>' +
        '<div class="bib-campos">' +
          '<label class="bib-campo"><span>Tipo</span><select id="doc-tipo">' +
            TIPOS_BIBLIOTECA.map(function (x) { return "<option>" + x + "</option>"; }).join("") + "</select></label>" +
          '<label class="bib-campo bib-largo"><span>Título</span><input type="text" id="doc-titulo" maxlength="200" ' +
            'placeholder="Ex.: Hemograma completo, Receita da dermatologista" autocomplete="off"></label>' +
          '<label class="bib-campo"><span>Data do documento/exame</span><input type="date" id="doc-data"></label>' +
        "</div>" +
        '<div class="doc-solta" id="doc-solta">' +
          '<input type="file" id="doc-arquivo" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,.csv" aria-label="Arquivo">' +
          '<div class="doc-solta-texto"><b>Arraste o arquivo aqui</b>' +
          "<span>ou clique para escolher &middot; PDF, foto ou texto &middot; até 10 MB</span></div>" +
        "</div>" +
        '<label class="bib-campo bib-largo"><span>Observação (opcional)</span>' +
          '<textarea id="doc-observacao" maxlength="2000" rows="2" placeholder="Ex.: trazido pela paciente na consulta de retorno"></textarea></label>' +
        '<div id="doc-pendente" class="doc-pendente hidden"></div>' +
        '<div id="doc-aviso"></div>' +
      "</section>" +

      '<section class="arq-cartao" aria-label="Documentos e exames do paciente">' +
        '<div class="bib-cab"><h4 class="arq-titulo" id="doc-lista-titulo">Documentos e exames</h4>' +
          '<button type="button" class="btn-fantasma bib-ver-arq" data-acao="ver-arquivados" aria-pressed="false">Ver arquivados</button></div>' +
        '<p class="dash-sub" id="doc-total"></p>' +
        '<div id="doc-lista"></div>' +
        '<p class="arq-nota" id="doc-espaco"></p>' +
      "</section>";

    ligarDocumentos();
    listarDocumentos();
  }

  function itemHtml(d) {
    var titulo = d.titulo || d.nome || "Documento";
    var acoes = '<button type="button" class="doc-abrir" data-abrir="' + escapar(d.id) + '">Abrir</button>' +
      '<button type="button" class="doc-abrir" data-baixar="' + escapar(d.id) + '">Baixar</button>' +
      (verArquivados
        ? '<button type="button" class="doc-abrir" data-restaurar="' + escapar(d.id) + '">Restaurar</button>'
        : '<button type="button" class="doc-arquivar" data-arquivar="' + escapar(d.id) + '" data-nome="' + escapar(titulo) + '">Arquivar</button>');
    return '<article class="bib-item">' +
      '<div class="bib-topo"><span class="doc-tipo">' + escapar(rotuloTipo(d.tipo)) + "</span>" +
        "<b class=\"bib-titulo\">" + escapar(titulo) + "</b>" +
        (d.so_local ? '<span class="doc-tipo" title="O envio ao servidor falhou: este arquivo não aparece em outro aparelho.">só neste dispositivo</span>' : "") +
      "</div>" +
      '<dl class="bib-meta">' +
        "<div><dt>Data</dt><dd>" + (d.data ? escapar(dataBR(d.data)) : "sem data") + "</dd></div>" +
        "<div><dt>Arquivo</dt><dd>" + escapar(d.nome || "") + " &middot; " + window.ArquivoStore.tamanhoLegivel(d.tamanho) + "</dd></div>" +
        (d.enviado_em ? "<div><dt>Enviado em</dt><dd>" + escapar(dataHoraBR(d.enviado_em)) + "</dd></div>" : "") +
        "<div><dt>Responsável</dt><dd>" + escapar(responsavel()) + "</dd></div>" +
        (verArquivados && d.arquivado_em ? "<div><dt>Arquivado em</dt><dd>" + escapar(dataHoraBR(d.arquivado_em)) + "</dd></div>" : "") +
      "</dl>" +
      (d.observacao ? '<p class="bib-obs">' + escapar(d.observacao) + "</p>" : "") +
      '<div class="bib-acoes">' + acoes + "</div>" +
      "</article>";
  }

  function listarDocumentos() {
    var alvo = document.getElementById("doc-lista");
    if (!alvo) return;
    var botao = document.querySelector("#aba-documentos [data-acao=\"ver-arquivados\"]");
    if (botao) {
      botao.textContent = verArquivados ? "Voltar à lista" : "Ver arquivados";
      botao.setAttribute("aria-pressed", verArquivados ? "true" : "false");
    }
    var tit = document.getElementById("doc-lista-titulo");
    if (tit) tit.textContent = verArquivados ? "Documentos arquivados" : "Documentos e exames";
    var pid = paciente();
    window.ArquivoStore.listar(pid, { arquivados: verArquivados }).then(function (itens) {
      if (pid !== paciente()) return;
      var total = document.getElementById("doc-total");
      if (itens.length === 0) {
        if (total) total.textContent = "";
        alvo.innerHTML = itens.falhaServidor
          ? '<div class="lista-vazia"><strong>Não foi possível carregar os documentos do servidor</strong>' +
            "<span>Verifique a conexão e abra a aba de novo. Nenhum documento foi apagado.</span></div>"
          : verArquivados
            ? '<div class="lista-vazia"><strong>Nenhum documento arquivado</strong></div>'
            : '<div class="lista-vazia"><strong>Nenhum documento adicionado</strong>' +
              "<span>Use “Adicionar arquivo” para guardar exames, laudos e receitas deste paciente.</span></div>";
      } else {
        if (total) total.textContent = itens.length + (verArquivados
          ? (itens.length === 1 ? " documento arquivado" : " documentos arquivados")
          : (itens.length === 1 ? " documento" : " documentos"));
        alvo.innerHTML = '<div class="bib-lista">' + itens.map(itemHtml).join("") + "</div>";
      }
      mostrarEspaco();
    });
  }

  function mostrarEspaco() {
    var el = document.getElementById("doc-espaco");
    if (!el) return;
    window.ArquivoStore.espaco().then(function (e) {
      if (!e) { el.textContent = ""; return; }
      el.innerHTML = (temSupa()
        ? "Os arquivos ficam no armazenamento privado da sua conta, com cópia neste navegador. "
        : "Os arquivos ficam <b>neste navegador</b>, não no servidor: " +
          "trocar de computador não os leva junto. ") +
        "Espaço usado neste navegador: " + window.ArquivoStore.tamanhoLegivel(e.usado) + " de " +
        window.ArquivoStore.tamanhoLegivel(e.total) + ".";
    });
  }

  /* Rodada 08 — tipos aceitos para documento de paciente. Confere o tipo que
     o navegador informa e a extensao (alguns navegadores mandam HEIC/CSV sem
     tipo); o resto e recusado antes de sair do aparelho. */
  var TIPOS_DOC = {
    "application/pdf": ["pdf"], "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"],
    "image/webp": ["webp"], "image/heic": ["heic"], "image/heif": ["heic", "heif"],
    "text/plain": ["txt"], "text/csv": ["csv"]
  };
  var EXT_SEM_TIPO = ["heic", "heif", "csv", "txt"];
  var LIMITE_BYTES = 10 * 1024 * 1024;   // mesmo limite do bucket patient-documents
  function tipoAceito(a) {
    var ext = String(a.name || "").toLowerCase().split(".").pop();
    var t = String(a.type || "").toLowerCase();
    if (!t) return EXT_SEM_TIPO.indexOf(ext) >= 0;
    return !!TIPOS_DOC[t] && TIPOS_DOC[t].indexOf(ext) >= 0;
  }

  function receberArquivos(lista) {
    if (!lista || lista.length === 0) return;
    var avisoTipo = document.getElementById("doc-aviso");
    var recusados = Array.prototype.filter.call(lista, function (a) { return !tipoAceito(a) || a.size > LIMITE_BYTES; });
    if (recusados.length) {
      var msg = "Tipo de arquivo não aceito: " + recusados.map(function (a) { return a.name; }).join(", ") +
        ". Envie PDF, imagem (PNG, JPG, WEBP, HEIC), TXT ou CSV de até 10 MB.";
      if (avisoTipo) avisoTipo.innerHTML = '<p class="q-erro">' + escapar(msg) + "</p>";
      else if (window.avisar) window.avisar(msg);
      lista = Array.prototype.filter.call(lista, function (a) { return tipoAceito(a) && a.size <= LIMITE_BYTES; });
      if (!lista.length) return;
    }
    if (window.pacienteArquivado && window.pacienteArquivado()) {
      if (window.avisar) window.avisar(window.MSG_ARQUIVADO);
      return;
    }
    /* Simulacao 08/10: escolher o arquivo so PREPARA; o envio acontece em
       "Guardar", depois de tipo, titulo e data. */
    escolhidos = Array.prototype.slice.call(lista);
    var campoTitulo = document.getElementById("doc-titulo");
    if (campoTitulo && !campoTitulo.value.trim() && escolhidos.length === 1) {
      campoTitulo.value = String(escolhidos[0].name || "").replace(/\.[^.]+$/, "");
    }
    desenharEscolhidos(false);
  }

  var escolhidos = [];
  function desenharEscolhidos(pedirData, erroTitulo) {
    var caixa = document.getElementById("doc-pendente");
    if (!caixa) return;
    if (!escolhidos.length) { caixa.innerHTML = ""; caixa.classList.add("hidden"); return; }
    caixa.classList.remove("hidden");
    caixa.innerHTML = '<p><b>' + (escolhidos.length === 1 ? "Arquivo escolhido: " : escolhidos.length + " arquivos escolhidos: ") + "</b>" +
      escolhidos.map(function (a) { return escapar(a.name); }).join(", ") + "</p>" +
      '<p class="dash-sub">Confira o tipo, o título e a data e clique em Guardar. Nada foi enviado ainda.</p>' +
      (erroTitulo ? '<p class="q-erro" id="doc-sem-titulo">Dê um título ao documento.</p>' : "") +
      (pedirData ? '<p class="q-erro" id="doc-sem-data">Este documento está sem data. Informe a data acima ou clique em "Guardar sem data".</p>' : "") +
      '<div class="acoes-form"><button type="button" class="btn-verde" id="doc-guardar"' + (pedirData ? ' data-sem-data="1"' : "") + ">" +
      (pedirData ? "Guardar sem data" : "Guardar") + "</button>" +
      '<button type="button" class="btn-fantasma" id="doc-cancelar">Cancelar</button></div>';
    document.getElementById("doc-guardar").addEventListener("click", function (ev) { guardarEscolhidos(!!ev.currentTarget.dataset.semData); });
    document.getElementById("doc-cancelar").addEventListener("click", function () {
      escolhidos = [];
      ["doc-titulo", "doc-observacao"].forEach(function (i) { var c = document.getElementById(i); if (c) c.value = ""; });
      desenharEscolhidos(false);
    });
    var campoData = document.getElementById("doc-data");
    if (pedirData && campoData) { campoData.focus(); campoData.addEventListener("change", function () { if (campoData.value) desenharEscolhidos(false); }, { once: true }); }
    if (erroTitulo) { var ct = document.getElementById("doc-titulo"); if (ct) ct.focus(); }
  }

  function guardarEscolhidos(semDataConfirmado) {
    var lista = escolhidos;
    if (!lista.length) return;
    var tipo = document.getElementById("doc-tipo").value;
    var titulo = document.getElementById("doc-titulo").value.trim();
    var observacao = document.getElementById("doc-observacao").value.trim();
    var data = document.getElementById("doc-data").value;
    if (window.bloqueioArquivado && window.bloqueioArquivado(paciente())) return;   // paciente arquivado: nada e enviado
    if (!titulo) { desenharEscolhidos(false, true); return; }
    if (!data && !semDataConfirmado && /Exame|Laudo/.test(tipo)) { desenharEscolhidos(true); return; }
    escolhidos = [];
    desenharEscolhidos(false);
    var aviso = document.getElementById("doc-aviso");
    var pid = paciente();
    var erros = [];
    var soLocal = [];

    Promise.all(lista.map(function (a, i) {
      return window.ArquivoStore.salvar(pid, a, {
        nome: a.name,
        titulo: lista.length === 1 ? titulo : titulo + " (" + (i + 1) + ")",
        tipo: tipo, data: data, observacao: observacao
      }).then(function (reg) {
        // guardado aqui, mas o envio ao servidor falhou: dizer isso, nao "ok"
        if (reg && reg.sincronizado === false) soLocal.push(a.name);
      }).catch(function (e) { erros.push(a.name + ": " + e.message); });
    })).then(function () {
      ["doc-titulo", "doc-observacao", "doc-data"].forEach(function (i) { var c = document.getElementById(i); if (c) c.value = ""; });
      var html = "";
      if (erros.length) html += '<p class="q-erro">' + erros.map(escapar).join("<br>") + "</p>";
      if (soLocal.length) {
        html += '<p class="q-erro">' + soLocal.length +
          (soLocal.length === 1 ? " arquivo ficou" : " arquivos ficaram") +
          " salvo(s) <b>somente neste dispositivo</b> — o envio ao servidor falhou e " +
          (soLocal.length === 1 ? "ele não aparece" : "eles não aparecem") +
          " em outro aparelho. Tente adicionar de novo com conexão: " +
          soLocal.map(escapar).join(", ") + "</p>";
      }
      var certos = lista.length - erros.length - soLocal.length;
      if (certos > 0) html += '<p class="doc-ok">' + certos + " arquivo(s) guardado(s)" +
        (temSupa() ? " no prontuário." : " neste navegador.") + "</p>";
      if (aviso) aviso.innerHTML = html;
      if (aviso && !erros.length && !soLocal.length) setTimeout(function () { aviso.innerHTML = ""; }, 3500);
      verArquivados = false;
      listarDocumentos();
    });
  }

  /** O que é do elemento recriado: a zona de arrastar nasce de novo a cada
      desenho, então é religada a cada desenho. */
  function ligarDocumentos() {
    ligarPainel();
    var solta = document.getElementById("doc-solta");
    var campo = document.getElementById("doc-arquivo");
    if (!solta || !campo) return;

    campo.addEventListener("change", function () { receberArquivos(campo.files); campo.value = ""; });
    solta.addEventListener("click", function (ev) {
      if (ev.target !== campo) campo.click();
    });
    ["dragenter", "dragover"].forEach(function (e) {
      solta.addEventListener(e, function (ev) {
        ev.preventDefault(); solta.classList.add("sobre");
      });
    });
    ["dragleave", "drop"].forEach(function (e) {
      solta.addEventListener(e, function (ev) {
        ev.preventDefault(); solta.classList.remove("sobre");
      });
    });
    solta.addEventListener("drop", function (ev) {
      receberArquivos(ev.dataTransfer.files);
    });
  }

  /* ============================================================ RELATORIO */

  var registroAtual = "nutri";

  function desenharRelatorio() {
    /* V1 Etapa 3: as emissoes versionadas ficam em #relatorios-emissoes
       (relatorios.js); o checklist da rodada 08 continua abaixo. */
    if (window.Relatorios) window.Relatorios.desenhar();
    var alvo = document.getElementById("relatorio-checklist") || document.getElementById("aba-relatorio");
    var p = pontuacaoGuardada();
    var g = motor();

    if (!p || !g) {
      alvo.innerHTML = '<div class="lista-vazia"><strong>Relatório ainda sem dados suficientes</strong>' +
        "<span>Conclua etapas da jornada clínica para gerar uma consolidação mais completa.</span></div>";
      return;
    }

    var nome = nomePaciente();
    var eu = window.PerfilProfissional
      ? window.PerfilProfissional.dados()
      : { nome: "", cor_primaria: "", cor_secundaria: "" };

    /* Quem imprime aparece no topo. Sem nome preenchido continua valendo a
       marca do app: melhor a marca do que um cabecalho vazio. */
    function juntar(pedacos) {
      return pedacos.filter(Boolean).map(escapar).join(" &middot; ");
    }
    var assina = juntar([eu.especialidade, eu.cidade]);

    var html =
      '<div class="rel-acoes">' +
      '<div class="rel-registro" role="group" aria-label="Registro">' +
      '<button type="button" class="rel-btn' + (registroAtual === "nutri" ? " ativo" : "") +
        '" data-registro="nutri" aria-pressed="' + (registroAtual === "nutri") + '">' +
        'Para a nutricionista</button>' +
      '<button type="button" class="rel-btn' + (registroAtual === "paciente" ? " ativo" : "") +
        '" data-registro="paciente" aria-pressed="' + (registroAtual === "paciente") + '">' +
        'Para o paciente</button>' +
      "</div>" +
      '<button type="button" class="btn-verde" data-acao="imprimir">' +
        '<span aria-hidden="true">&#128438; </span>Imprimir ou salvar em PDF</button>' +
      "</div>" +
      '<article class="relatorio" id="relatorio" aria-label="Relatório do paciente"' +
        (eu.cor_primaria ? ' style="--rel-p:' + escapar(eu.cor_primaria) +
          ";--rel-s:" + escapar(eu.cor_secundaria) + '"' : "") + ">" +
      '<header class="rel-topo">' +
      '<div class="rel-emissor">' +
        '<span class="rel-logo" id="rel-logo"></span>' +
        '<span class="rel-quem">' +
          "<b>" + escapar(eu.nome || "HoloHacking") + "</b>" +
          (assina ? "<i>" + assina + "</i>" : "") +
        "</span>" +
      "</div>" +
      "<h3>Mapa HOLOS" + (nome ? " &middot; " + escapar(nome) : "") + "</h3>" +
      /* Mesma defesa de app.js: snapshot antigo pode nao ter `cobertura`, e o
         relatorio nao pode quebrar por causa disso. Sem o dado, o segmento
         simplesmente nao aparece — a data continua. */
      '<p class="rel-meta">' + hoje() +
        (p.cobertura && typeof p.cobertura.percentual === "number"
          ? " &middot; cobertura " + p.cobertura.percentual + "%" : "") + "</p>" +
      '<p class="rel-fronteira">Avaliação nutricional integral construída a partir ' +
        "do que o paciente relata. Não é exame, não é diagnóstico médico e não " +
        "substitui avaliação clínica.</p>" +
      "</header>";

    /* ====================================================================
       A. HOLOSCAN — autorrelato, prioridades, sistemas, triade, cobertura.
       O Indice entra no FIM desta secao, como informacao secundaria — nao
       no cabecalho — e as CMB/textos interpretativos nao confirmados nao
       aparecem (ver decisoes 1 e 2 da revisao clinica do HOLOSCAN). */
    html += '<section class="rel-parte" data-origem="automatico">' +
      "<h3>A. HOLOSCAN — o que o paciente relatou</h3>" +
      // Secao 3 da Etapa 6: a data da APLICACAO, nao a de hoje (.rel-meta do
      // cabecalho ja mostra quando o relatorio foi gerado — sao datas
      // diferentes, e a antiga faltava aqui).
      (p.quando ? '<p class="rel-meta">Aplicado em ' + escapar(dataBR(p.quando)) + "</p>" : "") +
      // Correcao P0: o aviso diz a proveniencia desta aplicacao (oficial V1 / historica sem pacote V1)
      (window.Metodologia ? window.Metodologia.avisoAplicacaoHtml(p) : "");

    var A = window.HoloAusencia;
    var ordenados = p.sistemas.slice().sort(A.porLeitura);
    html += '<div class="rel-bloco"><h4>Mapa de prioridades</h4>';
    ordenados.forEach(function (s) {
      var semDado = A.semNota(s), insuf = !semDado && !A.suficiente(s);
      // respondidos/total_marcadores podem faltar num snapshot bem antigo —
      // nao inventa numero quando o campo nao existe.
      var temContagem = typeof s.respondidos === "number" && typeof s.total_marcadores === "number";
      var partes = [
        semDado ? (temContagem && s.respondidos > 0 ? s.respondidos + " de " + s.total_marcadores + " respondidas · abaixo da cobertura mínima do pacote: sem nota" : "nenhuma pergunta respondida")
          : (temContagem ? s.respondidos + " de " + s.total_marcadores + " respondidas" : ""),
        insuf ? "dados insuficientes" : "",
        s.faixa && !insuf ? "faixa " + escapar(window.rotuloExibivel(s.faixa)) : ""
      ].filter(Boolean);
      html += '<p class="rel-prioridade"><b>' + escapar(s.nome) + "</b> — " +
        A.notaTexto(s) +
        (partes.length ? " &middot; " + partes.join(" &middot; ") : "") +
        "</p>";
    });
    html += "</div>";

    var comDominantes = p.sistemas.filter(function (s) { return s.dominantes && s.dominantes.length; });
    if (comDominantes.length > 0) {
      html += '<div class="rel-bloco"><h4>Sinais dominantes</h4>';
      comDominantes.forEach(function (s) {
        html += "<p><b>" + escapar(s.nome) + "</b> — " +
          s.dominantes.map(function (d) { return escapar(d.rotulo || d.marcador_id); }).join(", ") +
          "</p>";
      });
      html += "</div>";
    }

    if (p.triada) {
      html += '<div class="rel-bloco"><h4>Tríada</h4><p class="rel-triada">' +
        "Físico <b>" + A.fmt(p.triada.fisico) + "</b> &middot; " +
        "Mental <b>" + A.fmt(p.triada.mental) + "</b> &middot; " +
        "Espiritual <b>" + A.fmt(p.triada.espiritual) + "</b></p></div>";
    }

    // Revisao clinica do HOLOSCAN: nenhuma CMB aparece no relatorio nesta
    // rodada (ver app.js, cmbParaExibir()) — inclusive a CMB-001, e nos dois
    // registros ("nutricionista" e "paciente"). Bloco so nasce se houver algo.
    var combinacoesParaExibir = window.cmbParaExibir ? window.cmbParaExibir(p.combinacoes) : [];
    if (combinacoesParaExibir.length > 0) {
      html += '<div class="rel-bloco"><h4>Leitura combinada</h4>';
      combinacoesParaExibir.forEach(function (c) {
        html += '<p class="rel-combinada">&ldquo;' + escapar(c.leitura) + "&rdquo;</p>";
      });
      html += "</div>";
    }

    // Revisao clinica do HOLOSCAN (decisao 2): o paragrafo interpretativo de
    // mensagens.csv (status=rascunho nas 30 linhas) sai da saida clinica; a
    // secao "Os cinco sistemas" continua, so com dado objetivo/calculado.
    html += '<div class="rel-bloco"><h4>Os cinco sistemas</h4>';
    ordenados.forEach(function (s) {
      html += '<div class="rel-sistema"><div class="rel-sistema-topo">' +
        "<b>" + escapar(s.nome) + "</b>" +
        '<span class="rel-nota">' + A.notaTexto(s) + "</span>" +
        '<span class="rel-faixa">' + escapar(A.semNota(s) ? "sem dado"
          : !A.suficiente(s) ? "dados insuficientes" : (window.rotuloExibivel(s.faixa) || "")) + "</span></div>" +
        '<p class="rel-passos">Área do mapa. Investigar com mais profundidade na consulta.</p>' +
        "</div>";
    });
    html += '<p class="rel-fronteira">Os cinco sistemas são categorias de organização do mapa, ' +
      "não categorias de doença.</p></div>";

    html += '<div class="rel-bloco rel-indice"><h4>Índice HOLOS (informação secundária)</h4>' +
      "<p><b>" + escapar(window.HoloAusencia.indiceTexto(p)) + "</b> de " + p.indice_maximo + "</p>" +
      '<p class="rel-fronteira">O Índice HOLOS resume as respostas deste mapa e não ' +
      "representa percentual de saúde.</p></div>";

    html += "</section>";

    /* ====================================================================
       B. CONSULTAS E ACOMPANHAMENTO — window.Agenda.todas() ja e a mesma
       lista, em ordem decrescente, que a aba Consultas da ficha usa. Aparece
       sempre: "nenhuma consulta" tambem e informacao da jornada. */
    var consultas = (window.Agenda && window.Agenda.todas) ? window.Agenda.todas(paciente()) : [];
    html += '<section class="rel-parte" data-origem="automatico">' +
      "<h3>B. Consultas e acompanhamento</h3><div class=\"rel-bloco\">";
    if (consultas.length === 0) {
      html += '<p class="rel-vazio">Nenhuma consulta registrada até o momento.</p>';
    } else {
      html += "<p>" + consultas.length +
        (consultas.length === 1 ? " consulta registrada." : " consultas registradas.") + "</p>";
      consultas.forEach(function (c) {
        html += '<p class="rel-prioridade"><b>' + escapar(dataBR(c.data)) + "</b> &middot; " +
          escapar(c.hora) + " &middot; " + escapar(c.tipo || "Consulta") + "</p>";
      });
    }
    html += "</div></section>";

    /* ====================================================================
       C. DOCUMENTOS — so a referencia administrativa: quantos documentos/exames
       estao guardados no prontuario. Nome, tipo e conteudo do arquivo nao
       entram no relatorio (decisao de produto 09/10). */
    html += '<section class="rel-parte" data-origem="automatico">' +
      "<h3>C. Documentos do prontuário</h3>" +
      '<div class="rel-bloco" id="rel-documentos-corpo"><p class="rel-vazio">Carregando…</p></div></section>';

    /* ====================================================================
       D. INTERPRETACAO PROFISSIONAL — texto que a nutricionista escreveu,
       nunca gerado automaticamente. Nunca misturado com A/B/C sem etiqueta.
       Editavel so no registro "nutri"; no registro "paciente" e so leitura,
       exatamente com o que foi escrito — sem gerar nada em cima. */
    var interpretacao = window.interpretacaoDe ? window.interpretacaoDe() : null;
    var textoInterpretacao = (interpretacao && interpretacao.texto) || "";
    html += '<section class="rel-parte" data-origem="profissional">' +
      "<h3>D. Interpretação profissional</h3><div class=\"rel-bloco\">";
    if (registroAtual === "nutri") {
      html += '<textarea id="rel-interpretacao" class="rel-interpretacao-campo" ' +
        'placeholder="Registre aqui a leitura profissional deste mapa.">' +
        escapar(textoInterpretacao) + "</textarea>" +
        '<div class="acoes-form"><button type="button" class="btn-verde" ' +
        'data-acao="salvar-interpretacao">Salvar interpretação</button>' +
        '<span class="rel-interpretacao-aviso" id="rel-interpretacao-aviso"></span></div>';
    } else {
      html += (textoInterpretacao
        ? "<p>" + escapar(textoInterpretacao).replace(/\n/g, "<br>") + "</p>"
        : '<p class="rel-vazio">Sem interpretação registrada.</p>');
    }
    html += "</div></section>";

    /* A assinatura e o carimbo vem antes da identificacao, como no papel:
       a imagem, e embaixo dela quem assinou e sob qual registro. */
    var temImagem = eu.assinatura_id || eu.carimbo_id;
    var identidade = juntar([eu.nome, eu.registro]);
    var contato = juntar([eu.telefone, eu.instagram]);

    html += '<footer class="rel-rodape">';
    if (temImagem) {
      html += '<div class="rel-assinaturas">' +
        (eu.assinatura_id ? '<span class="rel-imagem" id="rel-assinatura"></span>' : "") +
        (eu.carimbo_id ? '<span class="rel-imagem" id="rel-carimbo"></span>' : "") +
        "</div>";
    }
    if (identidade) html += '<p class="rel-emitiu">' + identidade + "</p>";
    if (contato) html += '<p class="rel-contato">' + contato + "</p>";
    html += "<p>Documento gerado pelo HoloHacking. " +
      "Notas e faixas seguem o pacote metodológico indicado na aplicação do HOLOSCAN. " +
      "Queixa que sugira doença deve ser encaminhada ao médico.</p></footer></article>";

    alvo.innerHTML = html;
    pintarImagensDoPerfil(eu);
    preencherDocumentosRelatorio(paciente());
  }

  /* Mesmo padrao de pintarImagensDoPerfil(): o HTML sincrono ja foi escrito
     com um "carregando", e o real entra no buraco quando a promessa do
     ArquivoStore resolve. Confere se a secao ainda existe — trocar de aba
     ou de paciente antes da promise resolver nao pode escrever por cima da
     tela errada. */
  function preencherDocumentosRelatorio(pid) {
    if (!window.ArquivoStore) return;
    window.ArquivoStore.listar(pid).then(function (itens) {
      var alvo = document.getElementById("rel-documentos-corpo");
      if (!alvo) return;
      if (!itens.length) {
        alvo.innerHTML = itens.falhaServidor
          ? '<p class="rel-vazio">Não foi possível carregar os documentos do servidor agora. Abra o relatório de novo em instantes.</p>'
          : '<p class="rel-vazio">Nenhum documento registrado até o momento.</p>';
        return;
      }
      alvo.innerHTML = "<p>" + itens.length +
        (itens.length === 1 ? " documento/exame armazenado no prontuário." : " documentos/exames armazenados no prontuário.") + "</p>";
    });
  }

  /* As imagens do perfil vivem no IndexedDB e chegam por promessa; o HTML ja
     foi escrito, entao elas entram nos buracos deixados para elas. */
  function pintarImagensDoPerfil(eu) {
    if (!window.PerfilProfissional) return;
    var por = [["logo_id", "rel-logo"], ["assinatura_id", "rel-assinatura"],
               ["carimbo_id", "rel-carimbo"]];
    por.forEach(function (par) {
      if (!eu[par[0]]) return;
      window.PerfilProfissional.imagem(eu[par[0]]).then(function (url) {
        var el = document.getElementById(par[1]);
        if (el && url) el.innerHTML = '<img src="' + url + '" alt="">';
      });
    });
  }

  /* ================================================================= abas */

  function trocarAba(nome) {
    // compatibilidade: nomes antigos redirecionam para os novos
    if (nome === "exames") nome = "documentos";
    if (nome === "formularios") nome = "ferramentas";
    if (nome === "confronto") nome = "holoscan";
    if (nome === "linha") nome = "visao";
    document.querySelectorAll("#ficha-arquivos .aba[data-aba]").forEach(function (b) {
      var ativa = b.dataset.aba === nome;
      b.classList.toggle("ativa", ativa);
      b.setAttribute("aria-selected", ativa ? "true" : "false");
      b.setAttribute("tabindex", ativa ? "0" : "-1");
    });
    /* V1 Etapa 2/3: anamnese, conduta e evolucao tambem sao paineis da ficha
       (antes ficavam fora desta lista e nunca eram mostrados/escondidos). */
    ["visao", "consultas", "anamnese", "conduta", "evolucao", "holoscan", "ferramentas", "resultado-holos", "documentos", "relatorio", "holos-ai"]
      .forEach(function (n) {
        var painel = document.getElementById("aba-" + n);
        if (painel) {
          var visivel = n === nome;
          painel.classList.toggle("hidden", !visivel);
          painel.setAttribute("role", "tabpanel");
          painel.setAttribute("aria-hidden", visivel ? "false" : "true");
        }
      });
    if (nome === "documentos") desenharDocumentos();
    if (nome === "relatorio") desenharRelatorio();
    if (window.desenharAbaDaFicha) window.desenharAbaDaFicha(nome);
  }

  function ligarRelatorio() {
    var alvo = document.getElementById("aba-relatorio");
    if (!alvo) return;
    alvo.addEventListener("click", function (ev) {
      var r = ev.target.closest("[data-registro]");
      if (r) { registroAtual = r.dataset.registro; desenharRelatorio(); return; }
      if (ev.target.closest('[data-acao="imprimir"]')) { window.print(); return; }
      if (ev.target.closest('[data-acao="salvar-interpretacao"]')) {
        var campo = document.getElementById("rel-interpretacao");
        var aviso = document.getElementById("rel-interpretacao-aviso");
        if (!campo) return;
        if (window.bloqueioArquivado && window.bloqueioArquivado(paciente())) {
          if (aviso) aviso.textContent = window.MSG_ARQUIVADO;
          return;
        }
        var salvou = window.guardarInterpretacao && window.guardarInterpretacao(campo.value);
        if (!salvou) {
          if (aviso) aviso.textContent = "Aplique o HOLOSCAN hoje antes de registrar a interpretação.";
          return;
        }
        /* so diz "Salvo." quando o servidor confirmou (ou quando nao ha
           servidor nenhum envolvido) — nunca antes de saber */
        if (aviso) aviso.textContent = "Salvando…";
        Promise.resolve(salvou.remoto).then(function (destino) {
          if (!aviso) return;
          if (destino === "sincronizado" || destino === "local") {
            aviso.textContent = "Salvo.";
          } else if (destino === "pendente") {
            aviso.textContent = "Salvo neste dispositivo. O HOLOSCAN deste dia ainda não foi " +
              "sincronizado — salve o HOLOSCAN para enviar também a interpretação.";
          } else {
            aviso.textContent = window.MSG_NAO_SINCRONIZADO ||
              "Salvo neste dispositivo, mas não foi possível sincronizar.";
            if (window.avisar) window.avisar(aviso.textContent);
          }
        });
        return;
      }
    });
  }

  function atualizarAviso() {
    // a ficha inteira ja diz de quem e; nao precisa repetir aqui
  }

  document.addEventListener("DOMContentLoaded", function () {
    var secao = document.getElementById("ficha-arquivos");
    if (!secao) return;
    var abas = [].slice.call(secao.querySelectorAll(".aba[data-aba]"));
    abas.forEach(function (b, i) {
      b.addEventListener("click", function () { trocarAba(b.dataset.aba); });
      b.setAttribute("tabindex", i === 0 ? "0" : "-1");
    });
    var tablist = secao.querySelector('[role="tablist"]');
    if (tablist) tablist.addEventListener("keydown", function (ev) {
      var cur = abas.indexOf(document.activeElement);
      if (cur < 0) return;
      var prox = -1;
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") prox = (cur + 1) % abas.length;
      else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") prox = (cur - 1 + abas.length) % abas.length;
      else if (ev.key === "Home") prox = 0;
      else if (ev.key === "End") prox = abas.length - 1;
      if (prox < 0) return;
      ev.preventDefault();
      abas[cur].setAttribute("tabindex", "-1");
      abas[prox].setAttribute("tabindex", "0");
      abas[prox].focus();
      trocarAba(abas[prox].dataset.aba);
    });
    atualizarAviso();
    ligarRelatorio();
    trocarAba("visao");

    /* O perfil muda em outra tela. Quando muda, o cabecalho e o rodape do
       relatorio mudam junto — senao a pessoa salva o CRN e imprime sem ele. */
    window.redesenharRelatorio = function () {
      var aba = document.getElementById("aba-relatorio");
      if (aba && !aba.classList.contains("hidden")) desenharRelatorio();
    };

    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      atualizarAviso();
      var ativa = secao.querySelector(".aba.ativa");
      if (ativa) trocarAba(ativa.dataset.aba);
    };
  });
})();
