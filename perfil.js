/* ===========================================================================
   PERFIL — quem assina o que sai daqui
   ===========================================================================

   O app sabia tudo sobre o paciente e nada sobre quem o atende. O relatorio
   impresso saía com "HoloHacking" no topo e uma frase generica no rodape: o
   nome da nutricionista, o CRN dela, o telefone do consultorio — nada disso
   existia em lugar nenhum, e receita sem registro profissional nao vale.

   Quatro abas, e cada uma existe por um motivo:

     PERFIL        o que sai impresso: nome, registro, especialidade, contato
     MARCA         a cara do documento: cores, logo, assinatura, carimbo
     PREFERENCIAS  como o app se comporta: modulos do menu e aparencia
     CONTA         onde os dados estao, como levar embora

   O que NAO esta aqui, e por que: o app de referencia tem "Plano e Pagamento"
   e um bloco de troca de senha em Seguranca. Este app nao tem cobranca, e a
   troca de senha (fluxo de recuperacao com pagina de redirect) ainda nao
   chegou na Fase 1 do Supabase — um campo "nova senha" pela metade e pior do
   que nenhum. O que a Fase 1 trouxe (quem esta logado, e sair) esta na aba
   Conta, abaixo.

   Onde as coisas ficam: com conta, o servidor e a fonte oficial — os campos
   em `profiles` e as imagens (foto, logo, assinatura, carimbo) em
   `professional_assets` + bucket `professional-assets`. Sem conta (modo local
   de desenvolvimento), a tabela local `perfil` e o IndexedDB.

   CORRECOES DE 09/10 (auditoria do cadastro):
   - leitura do servidor que falha NAO vira formulario vazio: a tela mostra o
     erro com "Tentar novamente" e nada pode ser salvo ate carregar de verdade
     (antes, salvar ali apagava registro, cidade etc. no servidor);
   - salvar manda SO os campos que mudaram, e so se a linha ainda estiver na
     versao lida (updated_at). Se outro dispositivo salvou no meio: campos
     diferentes sao mesclados; o MESMO campo mudado nos dois vira conflito
     explicito — nunca sobrescrita silenciosa;
   - trocar imagem: sobe a nova, registra, e so entao apaga a antiga. Upload
     que falha deixa a antiga intacta.
   =========================================================================== */

(function () {
  "use strict";

  var DONO = "_perfil";          // as imagens do perfil no ArquivoStore
  var LINHA = "eu";              // a unica linha da tabela perfil

  var perfil = null;
  var aba = "perfil";
  var urls = {};                 // id do arquivo -> objectURL ja criado
  var supaAssets = {};           // "supa:uuid" -> storage_path (para download)
  var desenhando = false;        // a assinatura desenhada a mao esta aberta?

  /* Estado da leitura do servidor: "ok" | "erro". base = os valores do servidor
     (no formato das colunas) na ultima leitura; versao = o updated_at dela. */
  var estadoCarga = "ok";
  var base = null, versao = null, existeLinha = false;

  window.limparEstadoPerfil = function () {
    perfil = null;
    urls = {};
    supaAssets = {};
    ligado = false;
    estadoCarga = "ok"; base = null; versao = null; existeLinha = false;
  };

  var PADRAO = {
    id: LINHA,
    nome: "", email: "", profissao: "Nutricionista", registro: "",
    especialidade: "", cidade: "", instagram: "", telefone: "",
    email_resposta: "", fuso: "America/Sao_Paulo",
    cor_primaria: "#0b3325", cor_secundaria: "#c9a35a",
    foto_id: "", logo_id: "", assinatura_id: "", carimbo_id: "",
    modulos: { consultas: true, agenda: true }
  };

  /* Fusos do Brasil, e mais nada: o app atende aqui. Uma lista mundial de 400
     entradas para escolher entre quatro seria um campo pior. */
  var FUSOS = [
    { id: "America/Sao_Paulo", nome: "Brasília (BRT, UTC-3)" },
    { id: "America/Manaus", nome: "Manaus (AMT, UTC-4)" },
    { id: "America/Rio_Branco", nome: "Rio Branco (ACT, UTC-5)" },
    { id: "America/Noronha", nome: "Fernando de Noronha (UTC-2)" }
  ];

  var MODULOS = [
    { id: "consultas", nome: "Consultas",
      resumo: "O histórico de atendimentos da carteira inteira",
      texto: "Cada aplicação do HOLOSCAN vira uma linha, em ordem de tempo. " +
             "Se você só olha paciente por paciente, pela ficha, pode deixar desativado." },
    { id: "agenda", nome: "Agenda",
      resumo: "Quem precisa voltar, e quando",
      texto: "Calcula o retorno de 4 semanas a partir da última aplicação e deixa " +
             "você marcar o dia combinado. Se a sua agenda vive em outro lugar, " +
             "pode deixar desativado." }
  ];
  /* "Documentos" saiu daqui em 09/10: o menu global de documentos foi removido
     (os documentos ficam na ficha do paciente) e a chave nao controlava nada.
     A chave antiga em profiles.modulos fica onde esta e e ignorada. */

  var APARENCIAS = [
    { id: "claro", nome: "Claro" },
    { id: "escuro", nome: "Escuro" },
    { id: "sistema", nome: "Seguir o sistema" }
  ];

  /* O que faz um perfil estar pronto. A ordem e a da tela, e o peso e igual:
     nenhum destes campos e mais opcional que o outro na hora de imprimir. */
  var CHECKLIST = [
    { campo: "nome", rotulo: "Nome completo" },
    { campo: "foto_id", rotulo: "Foto de perfil" },
    { campo: "profissao", rotulo: "Profissão" },
    { campo: "registro", rotulo: "Registro/Conselho" },
    { campo: "especialidade", rotulo: "Especialidade" },
    { campo: "cidade", rotulo: "Cidade/UF" },
    { campo: "logo_id", rotulo: "Logo" },
    { campo: "assinatura_id", rotulo: "Assinatura" },
    { campo: "telefone", rotulo: "Telefone" }
  ];

  var escapar = window.escapar;

  /* CONTA PENDENTE (09/10): o texto do aviso fica AQUI, num lugar so — mudar a
     redacao e mudar estas duas linhas. Sem data no texto. */
  var TEXTO_CONTA_PENDENTE = {
    titulo: "Seu cadastro profissional está sendo preparado.",
    corpo: "Complete seu perfil agora. O acesso completo à plataforma será liberado em breve."
  };
  /* O que mais importa preencher enquanto espera (destaque, nao obrigatorio). */
  var PRIORIDADES_PENDENTE = [
    /* alvo: o que recebe a rolagem e o foco ao clicar no item (campo ou botao de enviar) */
    { rotulo: "Foto", feito: function (p) { return !!p.foto_id; }, aba: "perfil", alvo: '[data-enviar="foto_id"]' },
    { rotulo: "CRN (registro profissional)", feito: function (p) { return !!String(p.registro || "").trim(); }, aba: "perfil", alvo: "#pf-registro" },
    { rotulo: "Logo", feito: function (p) { return !!p.logo_id; }, aba: "marca", alvo: '[data-enviar="logo_id"]' },
    { rotulo: "Assinatura", feito: function (p) { return !!p.assinatura_id; }, aba: "marca", alvo: '[data-enviar="assinatura_id"]' },
    { rotulo: "Carimbo", feito: function (p) { return !!p.carimbo_id; }, aba: "marca", alvo: '[data-enviar="carimbo_id"]' },
    { rotulo: "Contato (telefone ou e-mail)", feito: function (p) { return !!(String(p.telefone || "").trim() || String(p.email || "").trim()); }, aba: "perfil", alvo: "#pf-telefone" }
  ];

  function contaRestrita() { return !!(window.ContaAcesso && window.ContaAcesso.restrito && window.ContaAcesso.restrito()); }

  function desenharAvisoConta() {
    var el = document.getElementById("perfil-aviso-conta");
    var abaPrefs = document.getElementById("tab-prefs");
    var restrita = contaRestrita();
    /* pendente: Preferencias (modulos do menu clinico) nao se aplica */
    if (abaPrefs) abaPrefs.hidden = restrita;
    if (restrita && aba === "prefs") aba = "perfil";
    if (!el) return;
    el.hidden = !restrita;
    if (!restrita) { el.innerHTML = ""; return; }
    var p = perfil || PADRAO;
    var itens = PRIORIDADES_PENDENTE.map(function (i) { return { rotulo: i.rotulo, feito: i.feito(p), aba: i.aba, alvo: i.alvo }; });
    var feitos = itens.filter(function (i) { return i.feito; }).length;
    el.innerHTML =
      '<div class="pac-topo"><b class="pac-titulo">' + escapar(TEXTO_CONTA_PENDENTE.titulo) + "</b>" +
      "<p>" + escapar(TEXTO_CONTA_PENDENTE.corpo) + "</p></div>" +
      '<p class="pac-sub">Para os seus documentos saírem completos: <b>' + feitos + " de " + itens.length + "</b></p>" +
      '<ul class="pac-lista">' + itens.map(function (i) {
        return '<li class="' + (i.feito ? "feito" : "") + '"><span class="perf-marca" aria-hidden="true"></span>' +
          (i.feito ? escapar(i.rotulo) : '<button type="button" class="pac-ir" data-pac-aba="' + i.aba + '" data-pac-alvo="' + escapar(i.alvo) + '">' + escapar(i.rotulo) + "</button>") +
          (i.feito ? '<span class="sr-only"> (feito)</span>' : '<span class="sr-only"> (falta)</span>') + "</li>";
      }).join("") + "</ul>" +
      '<div class="pac-acoes"><button type="button" class="perf-botao" id="btn-verificar-acesso">Verificar acesso novamente</button>' +
      '<span class="pac-msg" id="pac-msg" role="status"></span></div>';
    /* primeira entrada da conta pendente: janela "o proximo passo e completar o perfil" (boas-vindas.js).
       So com o perfil de verdade carregado, para a lista do que falta estar certa. */
    if (perfil && window.BoasVindas && (!temSupa() || existeLinha)) {
      var u = window.HoloAuth && window.HoloAuth.usuarioAtual();
      window.BoasVindas.perfilPendente(uidAtual(), perfil.nome || (u && u.user_metadata && u.user_metadata.nome),
        itens.filter(function (i) { return !i.feito; }).map(function (i) { return i.rotulo; }),
        function (acao) {
          if (acao !== "completar") return;
          var ir = document.querySelector("#perfil-aviso-conta .pac-ir");
          if (ir) ir.click();
        });
    }
  }

  /* O dia de hoje no fuso de quem usa: toISOString() é UTC, e depois das 21h
     no Brasil ele já virou amanhã. */
  function hojeISO() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  /* ---------- ler e gravar ------------------------------------------------ */

  function banco() {
    return window.DadosLocais || null;
  }

  function temSupa() {
    return window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva();
  }

  function uidAtual() {
    var u = window.HoloAuth && window.HoloAuth.usuarioAtual();
    return u ? u.id : null;
  }

  var TIPO_CAMPO = { foto: "foto_id", logo: "logo_id",
                     assinatura: "assinatura_id", carimbo: "carimbo_id" };
  var CAMPO_TIPO = {};
  for (var _t in TIPO_CAMPO) { CAMPO_TIPO[TIPO_CAMPO[_t]] = _t; }

  var CAMPOS_SUPA = ["nome", "profissao", "registro", "especialidade", "cidade",
                     "instagram", "telefone", "fuso", "cor_primaria", "cor_secundaria",
                     "modulos"];

  function localParaSupa(p) {
    var out = {};
    CAMPOS_SUPA.forEach(function (c) { if (p[c] !== undefined) out[c] = p[c]; });
    if (p.email !== undefined) out.email_contato = p.email;
    return out;
  }

  function carregar() {
    if (temSupa()) return carregarSupa();
    var b = banco();
    if (!b) { perfil = Object.assign({}, PADRAO); return Promise.resolve(perfil); }
    return Promise.resolve(b.from("perfil").select("*")).then(function (r) {
      var linha = (r.data || [])[0] || null;
      perfil = Object.assign({}, PADRAO, linha || {});
      perfil.modulos = Object.assign({}, PADRAO.modulos, perfil.modulos || {});
      perfil.id = LINHA;
      return perfil;
    });
  }

  /* A linha do servidor no formato do perfil (so os campos de texto). */
  function perfilDeLinha(row) {
    var p = {};
    CAMPOS_SUPA.forEach(function (c) { p[c] = PADRAO[c]; });
    p.email = PADRAO.email;
    if (row) {
      CAMPOS_SUPA.forEach(function (c) {
        if (row[c] !== undefined && row[c] !== null) p[c] = row[c];
      });
      if (row.email_contato) p.email = row.email_contato;
    }
    p.modulos = Object.assign({}, PADRAO.modulos, p.modulos || {});
    return p;
  }

  /* Comparacao no formato das colunas: null e "" sao o mesmo vazio; jsonb por conteudo. */
  function normal(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return JSON.stringify(Object.keys(v).sort().reduce(function (o, k) { o[k] = v[k]; return o; }, {}));
    return String(v);
  }
  function igual(a, b) { return normal(a) === normal(b); }

  /* Aplica a linha lida do servidor: campos de texto, base e versao. */
  function aplicarLinha(row) {
    var p = perfilDeLinha(row);
    Object.keys(p).forEach(function (k) { perfil[k] = p[k]; });
    base = localParaSupa(p);
    versao = row ? row.updated_at || null : null;
    existeLinha = !!row;
  }

  function carregarSupa() {
    var uid = uidAtual();
    return Promise.all([
      window.supabaseClient.from("profiles").select("*").eq("id", uid),
      window.supabaseClient.from("professional_assets")
        .select("id, tipo, storage_path")
    ]).then(function (res) {
      /* leitura que falhou NAO vira perfil vazio: sem isto, "Salvar" apagava o servidor */
      if (!res[0] || res[0].error || !res[1] || res[1].error) {
        throw (res[0] && res[0].error) || (res[1] && res[1].error) || new Error("sem resposta do servidor");
      }
      var row = ((res[0].data || [])[0]) || null;
      var assets = res[1].data || [];

      perfil = Object.assign({}, PADRAO);
      aplicarLinha(row);
      perfil.id = LINHA;

      supaAssets = {};
      assets.forEach(function (a) {
        var campo = TIPO_CAMPO[a.tipo];
        if (campo) {
          var sid = "supa:" + a.id;
          perfil[campo] = sid;
          supaAssets[sid] = a.storage_path;
        }
      });

      estadoCarga = "ok";
      gravarLocal();
      return perfil;
    }).catch(function (e) {
      console.error("[perfil] leitura do servidor:", e && e.message ? e.message : e);
      estadoCarga = "erro";
      perfil = Object.assign({}, PADRAO, { id: LINHA });
      base = null; versao = null;
      return perfil;
    });
  }

  /** O perfil esta bloqueado para gravar? (com conta e sem leitura valida do servidor) */
  function bloqueado() { return !!(temSupa() && estadoCarga !== "ok"); }
  var MSG_BLOQUEADO = "O perfil não foi carregado do servidor, então nada foi salvo. Use \"Tentar novamente\".";

  function gravarLocal() {
    var b = banco();
    if (!b) return;
    var copia = Object.assign({}, perfil);
    delete copia.created_at;
    delete copia.updated_at;
    Promise.resolve(b.from("perfil").select("*")).then(function (r) {
      var existe = (r.data || []).length > 0;
      return existe
        ? b.from("perfil").update(copia).eq("id", LINHA)
        : b.from("perfil").insert(copia).select().single();
    }).catch(function () {});
  }

  function gravar() {
    if (temSupa()) return gravarSupa();
    var b = banco();
    if (!b) return Promise.resolve({ error: null });
    var copia = Object.assign({}, perfil);
    delete copia.created_at;
    return Promise.resolve(b.from("perfil").select("*")).then(function (r) {
      var existe = (r.data || []).length > 0;
      return existe
        ? b.from("perfil").update(copia).eq("id", LINHA)
        : b.from("perfil").insert(copia).select().single();
    });
  }

  var ROTULO_CAMPO = { nome: "Nome completo", profissao: "Profissão", registro: "Registro profissional",
    especialidade: "Especialidade", cidade: "Cidade/UF", instagram: "Instagram", telefone: "Telefone",
    email_contato: "E-mail", fuso: "Fuso horário", cor_primaria: "Cor primária", cor_secundaria: "Cor secundária",
    modulos: "Módulos do menu" };

  /* Salva SO o que mudou desde a ultima leitura, e so se a linha ainda estiver
     na versao lida. Se outro dispositivo salvou no meio, rele: campos que so o
     outro mudou sao mantidos (mescla); o mesmo campo mudado nos dois e conflito. */
  function gravarSupa() {
    if (bloqueado() || !base) return Promise.resolve({ error: { message: MSG_BLOQUEADO }, bloqueado: true });
    var atual = localParaSupa(perfil), mud = {};
    Object.keys(atual).forEach(function (c) { if (!igual(atual[c], base[c])) mud[c] = atual[c]; });
    if (!Object.keys(mud).length) return Promise.resolve({ error: null, nada: true });
    var sb = window.supabaseClient, uid = uidAtual();
    if (!existeLinha) {
      /* conta sem linha em profiles (nao deveria existir: o gatilho do cadastro cria) — cria em vez de "salvar" nada */
      return Promise.resolve(sb.from("profiles").insert(Object.assign({ id: uid }, atual)).select("*")).then(function (r) {
        if (r.error) return r;
        aplicarLinha((r.data || [])[0] || null); gravarLocal();
        return r;
      });
    }
    function tentar(m, n) {
      var q = sb.from("profiles").update(m).eq("id", uid);
      if (versao) q = q.eq("updated_at", versao);
      return Promise.resolve(q.select("*")).then(function (r) {
        if (r.error) return r;
        if (r.data && r.data.length) { aplicarLinha(r.data[0]); gravarLocal(); return n > 0 ? { data: r.data, error: null, mesclou: true } : r; }
        return Promise.resolve(sb.from("profiles").select("*").eq("id", uid)).then(function (rr) {
          if (rr.error) return rr;
          var row = (rr.data || [])[0];
          if (!row) { existeLinha = false; return { error: { message: "Seu perfil não foi encontrado no servidor. Recarregue a página." } }; }
          var serv = localParaSupa(perfilDeLinha(row));
          var conflitos = Object.keys(m).filter(function (c) { return !igual(serv[c], base[c]) && !igual(serv[c], m[c]); });
          if (conflitos.length || n >= 3) {
            aplicarLinha(row); gravarLocal();
            return { error: { message: "Este perfil foi alterado em outro dispositivo enquanto você editava (" +
              conflitos.map(function (c) { return ROTULO_CAMPO[c] || c; }).join(", ") +
              "). Para não apagar a outra alteração, nada foi salvo. A tela agora mostra o que está no servidor: confira e salve de novo." }, conflito: conflitos };
          }
          var resta = {};
          Object.keys(m).forEach(function (c) { if (!igual(serv[c], m[c])) resta[c] = m[c]; });
          /* o que o outro dispositivo mudou (e eu nao) passa a valer aqui tambem */
          var meus = {}; Object.keys(m).forEach(function (c) { meus[c] = perfil[c === "email_contato" ? "email" : c]; });
          aplicarLinha(row);
          Object.keys(meus).forEach(function (k) { perfil[k === "email_contato" ? "email" : k] = meus[k]; });
          if (!Object.keys(resta).length) { gravarLocal(); return { error: null, mesclou: true }; }
          return tentar(resta, n + 1);
        });
      });
    }
    return tentar(mud, 0);
  }

  function salvar(mensagem) {
    return Promise.resolve(gravar()).then(function (r) {
      if (r && (r.bloqueado || r.conflito)) { if (r.conflito) { desenhar(); trocarAba(aba); } aviso(r.error.message, true); return false; }
      if (r && r.error) { console.error("[perfil] salvar:", r.error); aviso(window.mensagemHumana(r.error), true); return false; }
      /* outro dispositivo tinha salvo outros campos: a tela passa a mostrar o perfil inteiro do servidor */
      if (r && r.mesclou) { desenhar(); trocarAba(aba); }
      espalhar();
      if (mensagem && window.avisar) window.avisar(mensagem);
      return true;
    });
  }

  /* Quem mais precisa saber que o perfil mudou: o rodape da sidebar, o menu
     (modulos ligados e desligados) e o relatorio, que e o consumidor final. */
  function espalhar() {
    desenharAvisoConta();
    desenharRodape();
    aplicarModulos();
    if (typeof window.redesenharRelatorio === "function") window.redesenharRelatorio();
  }

  function aviso(texto, ruim) {
    var alvo = document.getElementById("perfil-aviso");
    if (!alvo) { if (window.avisar) window.avisar(texto); return; }
    alvo.textContent = texto;
    alvo.className = ruim ? "perf-aviso ruim" : "perf-aviso";   // (antes "perfil-aviso": classe sem estilo, o erro nao ficava em destaque)
    /* o aviso mora na aba Perfil: estando em outra aba (Marca), tambem vira toast */
    if (texto && window.avisar && alvo.closest(".hidden")) window.avisar(texto);
  }

  /* ---------- as imagens -------------------------------------------------- */

  /* rodada 08: varios blocos pedem a mesma imagem ao mesmo tempo (foto no
     rodape, no cabecalho, no relatorio) — um download so por imagem */
  var baixando = {};
  function urlDe(id) {
    if (!id) return Promise.resolve("");
    if (urls[id]) return Promise.resolve(urls[id]);
    if (baixando[id]) return baixando[id];
    var p = urlDeAgora(id);
    baixando[id] = p;
    p.then(function () { delete baixando[id]; }, function () { delete baixando[id]; });
    return p;
  }

  function urlDeAgora(id) {

    if (id.indexOf("supa:") === 0 && temSupa()) {
      var path = supaAssets[id];
      if (!path) return Promise.resolve("");
      return window.supabaseClient.storage
        .from("professional-assets")
        .download(path)
        .then(function (r) {
          if (r.error || !r.data) return "";
          urls[id] = URL.createObjectURL(r.data);
          return urls[id];
        })
        .catch(function () { return ""; });
    }

    if (!window.ArquivoStore) return Promise.resolve("");
    return window.ArquivoStore.pegar(id).then(function (r) {
      if (!r || !r.arquivo) return "";
      urls[id] = URL.createObjectURL(r.arquivo);
      return urls[id];
    }).catch(function () { return ""; });
  }

  /** Troca a imagem de um campo, apagando a anterior: guardar as duas encheria
      o navegador de logos velhos que ninguem mais vai ver. */
  function guardarImagem(campo, arquivo, tipo) {
    if (bloqueado()) { aviso(MSG_BLOQUEADO, true); desenhar(); return Promise.resolve(false); }
    if (temSupa()) return guardarImagemSupa(campo, arquivo, tipo);
    if (!window.ArquivoStore) return Promise.resolve(false);
    var antiga = perfil[campo];
    return window.ArquivoStore.salvar(DONO, arquivo, {
      nome: tipo, tipo: tipo, data: hojeISO()
    }).then(function (reg) {
      perfil[campo] = reg.id;
      if (antiga) {
        if (urls[antiga]) { URL.revokeObjectURL(urls[antiga]); delete urls[antiga]; }
        return window.ArquivoStore.remover(antiga).catch(function () {});
      }
    }).then(function () {
      return salvar(tipo + " atualizado.");
    }).then(function () { desenhar(); return true; })
      .catch(function (e) { console.error("[perfil] imagem:", e); aviso("Não foi possível guardar a imagem. " + window.mensagemHumana(e), true); return false; });
  }

  function guardarImagemSupa(campo, arquivo, tipo) {
    var uid = uidAtual();
    var tipoSupa = CAMPO_TIPO[campo];
    if (!tipoSupa || !uid) return Promise.resolve(false);

    var ext = (arquivo.name || "img.png").split(".").pop();
    var path = uid + "/" + tipoSupa + "/" + Date.now() + "." + ext;
    var antiga = perfil[campo];
    var antigaPath = antiga ? supaAssets[antiga] : null;

    var bucket = function () { return window.supabaseClient.storage.from("professional-assets"); };
    var subiu = false;

    /* 09/10: a ordem importa. Primeiro sobe a nova e registra; so depois apaga
       a antiga. Se o upload ou o registro falhar, a imagem antiga continua
       valendo (antes ela era apagada primeiro e ficava quebrada). */
    return Promise.resolve(bucket().upload(path, arquivo, { contentType: arquivo.type })).then(function (r) {
      if (!r || r.error) throw (r && r.error) || new Error("o envio do arquivo falhou");
      subiu = true;
      return window.supabaseClient
        .from("professional_assets")
        .upsert({
          nutritionist_id: uid, tipo: tipoSupa,
          nome: arquivo.name || tipoSupa + ".png",
          mime_type: arquivo.type || "image/png",
          tamanho_bytes: arquivo.size, storage_path: path
        }, { onConflict: "nutritionist_id,tipo" })
        .select("id").single();
    }).then(function (r) {
      if (!r || r.error) throw (r && r.error) || new Error("o registro da imagem falhou");
      if (antigaPath && antigaPath !== path) {
        Promise.resolve(bucket().remove([antigaPath])).catch(function (e) { console.error("[perfil] apagar imagem antiga:", e && e.message ? e.message : e); });
      }
      if (antiga && urls[antiga]) { URL.revokeObjectURL(urls[antiga]); delete urls[antiga]; }
      if (antiga) delete supaAssets[antiga];

      var novoId = "supa:" + r.data.id;
      perfil[campo] = novoId;
      supaAssets[novoId] = path;

      if (antiga && antiga.indexOf("supa:") !== 0 && window.ArquivoStore) {
        window.ArquivoStore.remover(antiga).catch(function () {});
      }
      return salvar(tipo + " atualizado.");
    }).then(function () { desenhar(); return true; })
    .catch(function (e) {
      console.error("[perfil] imagem:", e);
      /* o arquivo novo subiu mas o registro falhou: tira o orfao; a antiga segue valendo */
      if (subiu) Promise.resolve(bucket().remove([path])).catch(function () {});
      desenhar(); trocarAba(aba);
      aviso("Não foi possível guardar a imagem: " + window.mensagemHumana(e) + " A imagem anterior continua no perfil.", true);
      return false;
    });
  }

  /* Rodada 08: remover uma imagem do perfil (foto, logo, assinatura,
     carimbo) pede confirmacao, e so tira da tela depois que o servidor
     confirmou que a linha saiu. Se o arquivo do bucket nao puder ser
     removido, a tela diz isso em vez de engolir. */
  var NOME_IMAGEM = { foto_id: "a foto", logo_id: "o logo", assinatura_id: "a assinatura",
                      carimbo_id: "o carimbo" };

  function tirarImagem(campo) {
    var id = perfil[campo];
    if (!id) return Promise.resolve(false);
    if (bloqueado()) { aviso(MSG_BLOQUEADO, true); return Promise.resolve(false); }
    var oque = NOME_IMAGEM[campo] || "a imagem";
    var perguntar = window.abrirModalConfirmar
      ? window.abrirModalConfirmar({
          titulo: "Remover " + oque.replace(/^(a|o) /, ""),
          corpo: "<p>Remover " + oque + " do seu perfil? Documentos já gerados não mudam.</p>",
          botaoConfirmar: "Remover"
        })
      : Promise.resolve(confirm("Remover " + oque + "?") ? "confirmar" : null);
    return perguntar.then(function (r) {
      if (r !== "confirmar") return false;
      return removerImagem(campo, id);
    });
  }

  function removerImagem(campo, id) {
    var soltar = function () {
      perfil[campo] = "";
      if (urls[id]) { URL.revokeObjectURL(urls[id]); delete urls[id]; }
    };

    if (id.indexOf("supa:") === 0 && temSupa()) {
      var realId = id.slice(5);
      var path = supaAssets[id];
      return Promise.resolve(window.supabaseClient.from("professional_assets")
        .delete().eq("id", realId).select("id"))
        .then(function (d) {
          if (!d || d.error) throw (d && d.error) || new Error("sem resposta do servidor");
          if (!Array.isArray(d.data) || !d.data.length) throw new Error("o servidor não confirmou a remoção");
          delete supaAssets[id];
          soltar();
          if (!path) return "ok";
          return Promise.resolve(window.supabaseClient.storage.from("professional-assets").remove([path]))
            .then(function (x) { if (x && x.error) throw x.error; return "ok"; })
            .catch(function (e) { console.error("storage remove:", e && e.message ? e.message : e); return "arquivo"; });
        })
        .then(function (estado) {
          return salvar(estado === "arquivo"
            ? "Imagem removida do perfil; o arquivo não pôde ser apagado do armazenamento agora."
            : "Imagem removida.");
        })
        .then(function () { desenhar(); return true; })
        .catch(function (e) {
          console.error("[perfil] remover imagem:", e && e.message ? e.message : e);
          aviso("Não foi possível remover a imagem — ela continua no perfil. Tente de novo.", true);
          return false;
        });
    }

    return (window.ArquivoStore ? window.ArquivoStore.remover(id) : Promise.resolve())
      .then(function () {
        soltar();
        return salvar("Imagem removida.");
      })
      .then(function () { desenhar(); return true; })
      .catch(function (e) {
        aviso("Não foi possível remover a imagem — ela continua no perfil.", true);
        return false;
      });
  }

  /* ---------- a completude ------------------------------------------------ */

  function completude() {
    if (!perfil) return { itens: [], feitos: 0, total: CHECKLIST.length, pct: 0 };
    var feitos = CHECKLIST.filter(function (i) { return !!perfil[i.campo]; });
    return {
      itens: CHECKLIST.map(function (i) {
        return { rotulo: i.rotulo, feito: !!perfil[i.campo] };
      }),
      feitos: feitos.length,
      total: CHECKLIST.length,
      pct: Math.round(feitos.length / CHECKLIST.length * 100)
    };
  }

  function desenharCompletude() {
    var alvo = document.getElementById("perfil-completude");
    if (!alvo) return;
    var c = completude();

    alvo.innerHTML = '<div class="perf-completo">' +
      '<div class="perf-completo-topo">' +
        "<b>Perfil " + (c.pct === 100 ? "completo" : c.pct + "% completo") + "</b>" +
        '<span>' + c.feitos + " de " + c.total + "</span>" +
      "</div>" +
      '<ul class="perf-lista">' + c.itens.map(function (i) {
        return '<li class="' + (i.feito ? "feito" : "") + '">' +
          '<span class="perf-marca" aria-hidden="true"></span>' +
          escapar(i.rotulo) + "</li>";
      }).join("") + "</ul>" +
      /* so diz o que de fato falta (auditoria: o aviso ficava mesmo com registro e assinatura) */
      (function () {
        var falta = [];
        if (!String(perfil.registro || "").trim()) falta.push("registro profissional");
        if (!perfil.assinatura_id) falta.push("assinatura");
        return falta.length ? '<p class="perf-porque">O que falta aqui é o que some do papel: sem ' + falta.join(" e sem ") +
          ", o documento impresso não identifica bem quem o emitiu.</p>" : "";
      })() +
      "</div>";
  }

  /* ---------- o rodape da sidebar ----------------------------------------- */

  function desenharRodape() {
    var nome = document.getElementById("sr-nome");
    if (!nome) return;
    var c = completude();
    nome.textContent = perfil.nome || "Profissional";
    document.getElementById("sr-papel").textContent =
      perfil.profissao || "Nutricionista";
    document.getElementById("sr-barra").style.width = c.pct + "%";
    document.getElementById("sr-pct").textContent = c.pct + "%";

    var av = document.getElementById("sr-avatar");
    var quem = perfil;   // a imagem chega depois: a conta pode ter saido no meio (perfil = null)
    urlDe(quem.foto_id).then(function (u) {
      if (u) {
        av.innerHTML = '<img src="' + u + '" alt="">';
        av.classList.add("com-foto");
      } else {
        av.textContent = (quem.nome || "P").trim().charAt(0).toUpperCase();
        av.classList.remove("com-foto");
      }
    });
  }

  /* ---------- os modulos do menu ------------------------------------------ */

  function aplicarModulos() {
    MODULOS.forEach(function (m) {
      var ligado = perfil.modulos[m.id] !== false;
      var botao = document.querySelector('.nav-item[data-secao="' + m.id + '"]');
      if (botao) botao.classList.toggle("hidden", !ligado);
      /* Desligar o modulo que esta aberto deixaria a pessoa numa tela sem
         volta pelo menu. Ela vai para o Dashboard, que existe sempre. */
      var secao = document.getElementById("secao-" + m.id);
      if (!ligado && secao && secao.classList.contains("ativa")) {
        if (window.irParaSecao) window.irParaSecao("dashboard");
      }
    });
  }

  /* ---------- peças de formulário ----------------------------------------- */

  function campo(o) {
    return '<div class="perf-campo' + (o.largo ? " largo" : "") + '">' +
      '<label for="pf-' + o.id + '">' +
        (o.icone ? '<span class="perf-ico">' + o.icone + "</span>" : "") +
        escapar(o.rotulo) + "</label>" +
      '<input id="pf-' + o.id + '" type="' + (o.tipo || "text") +
        '" value="' + escapar(perfil[o.id] || "") + '"' +
        (o.dica ? ' placeholder="' + escapar(o.dica) + '"' : "") +
        (o.auto ? ' autocomplete="' + o.auto + '"' : "") + ">" +
      (o.ajuda ? '<p class="perf-ajuda">' + o.ajuda + "</p>" : "") +
      "</div>";
  }

  function cartao(titulo, sub, corpo, icone) {
    return '<section class="perf-cartao">' +
      '<h3 class="perf-titulo">' + (icone ? '<span class="perf-ico">' + icone + "</span>" : "") +
        escapar(titulo) + "</h3>" +
      (sub ? '<p class="perf-sub">' + sub + "</p>" : "") +
      corpo + "</section>";
  }

  /* ======================================================= ABA: PERFIL ==== */

  function painelPerfil() {
    var alvo = document.getElementById("painel-perfil");

    var foto = cartao("Foto de perfil",
      "Aparece no canto da tela e identifica quem está usando o app.",
      '<div class="perf-foto">' +
        '<span class="perf-foto-alvo" id="perf-foto-alvo">' +
          (perfil.nome || "P").trim().charAt(0).toUpperCase() + "</span>" +
        '<div class="perf-foto-acoes">' +
          '<button type="button" class="perf-botao" data-enviar="foto_id">Trocar foto</button>' +
          (perfil.foto_id
            ? '<button type="button" class="perf-tirar" data-tirar="foto_id">remover</button>'
            : "") +
        "</div>" +
      "</div>");

    var profissionais = cartao("Dados profissionais",
      "O que identifica você nos documentos que imprime.",
      '<div class="perf-grade">' +
        campo({ id: "nome", rotulo: "Nome completo", dica: "Como você assina", auto: "name" }) +
        campo({ id: "profissao", rotulo: "Profissão", dica: "Nutricionista" }) +
        campo({ id: "registro", rotulo: "Registro profissional", dica: "Ex: CRN-3 12345",
                ajuda: "Sai impresso no rodapé dos relatórios, embaixo da sua assinatura. " +
                       "Sem ele o documento não identifica quem o emitiu." }) +
        campo({ id: "especialidade", rotulo: "Especialidade/Atuação", dica: "Nutrição Holística" }) +
      "</div>");

    var contato = cartao("Contato e localização",
      "Aparece no rodapé dos documentos gerados para os pacientes.",
      '<div class="perf-grade">' +
        campo({ id: "email", rotulo: "E-mail", tipo: "email", dica: "seu@email.com", auto: "email" }) +
        campo({ id: "telefone", rotulo: "Telefone / WhatsApp", tipo: "tel",
                dica: "(11) 99999-9999", auto: "tel" }) +
        campo({ id: "cidade", rotulo: "Cidade/UF", dica: "Ex: Goiânia/GO ou Atendimento online" }) +
        campo({ id: "instagram", rotulo: "Instagram", dica: "@seu_perfil" }) +
      "</div>" +
      '<div class="perf-campo largo">' +
        '<label for="pf-fuso">Fuso horário</label>' +
        '<select id="pf-fuso">' + FUSOS.map(function (f) {
          return '<option value="' + f.id + '"' +
            (f.id === perfil.fuso ? " selected" : "") + ">" + escapar(f.nome) + "</option>";
        }).join("") + "</select>" +
        '<p class="perf-ajuda">Define a data e a hora dos <b>registros clínicos</b> (atendimentos, ' +
        "aplicações) e da Agenda. Mudar o fuso muda como os horários são registrados e mostrados " +
        "daqui em diante.</p>" +
      "</div>");

    alvo.innerHTML = foto + profissionais + contato +
      '<div class="perf-acoes">' +
        '<p class="perf-aviso" id="perfil-aviso"></p>' +
        '<button type="button" class="btn-verde" id="btn-salvar-perfil">Salvar alterações</button>' +
      "</div>";

    urlDe(perfil.foto_id).then(function (u) {
      var el = document.getElementById("perf-foto-alvo");
      if (el && u) { el.innerHTML = '<img src="' + u + '" alt="">'; el.classList.add("com-foto"); }
    });
  }

  function lerFormulario() {
    ["nome", "email", "profissao", "registro", "especialidade", "cidade",
     "instagram", "telefone"].forEach(function (c) {
      var el = document.getElementById("pf-" + c);
      if (el) perfil[c] = el.value.trim();
    });
    var f = document.getElementById("pf-fuso");
    if (f) perfil.fuso = f.value;
  }

  /* ======================================================== ABA: MARCA ==== */

  function painelMarca() {
    var alvo = document.getElementById("painel-marca");

    var cores =
      '<div class="perf-grade">' +
        corCampo("cor_primaria", "Cor primária") +
        corCampo("cor_secundaria", "Cor secundária") +
      "</div>" +
      '<div class="perf-campo largo">' +
        "<label>Logo</label>" +
        '<div class="perf-foto">' +
          '<span class="perf-logo-alvo" id="perf-logo-alvo">sem logo</span>' +
          '<div class="perf-foto-acoes">' +
            '<button type="button" class="perf-botao" data-enviar="logo_id">Trocar logo</button>' +
            (perfil.logo_id
              ? '<button type="button" class="perf-tirar" data-tirar="logo_id">remover</button>'
              : "") +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="perf-campo largo">' +
        "<label>Pré-visualização</label>" +
        previa() +
      "</div>" +
      '<div class="perf-acoes">' +
        '<button type="button" class="btn-verde" id="btn-salvar-marca">Salvar alterações</button>' +
      "</div>";

    var assinatura =
      '<div class="perf-imagem">' +
        '<div class="perf-imagem-topo"><b>Assinatura</b></div>' +
        '<div class="perf-imagem-corpo">' +
          '<span class="perf-imagem-alvo" id="perf-assinatura-alvo">nenhuma</span>' +
          '<div class="perf-imagem-lado">' +
            "<p>Envie um PNG com fundo transparente, ou desenhe aqui mesmo &mdash; " +
            "é o que resolve para quem não tem a assinatura digitalizada.</p>" +
            '<div class="perf-foto-acoes">' +
              '<button type="button" class="perf-botao" data-enviar="assinatura_id">Enviar</button>' +
              '<button type="button" class="perf-botao" id="btn-desenhar">Desenhar</button>' +
              (perfil.assinatura_id
                ? '<button type="button" class="perf-tirar" data-tirar="assinatura_id">remover</button>'
                : "") +
            "</div>" +
          "</div>" +
        "</div>" +
        (desenhando ? prancheta() : "") +
      "</div>" +
      '<div class="perf-imagem">' +
        '<div class="perf-imagem-topo"><b>Carimbo profissional</b></div>' +
        '<div class="perf-imagem-corpo">' +
          '<span class="perf-imagem-alvo" id="perf-carimbo-alvo">nenhum</span>' +
          '<div class="perf-imagem-lado">' +
            "<p>A imagem do seu carimbo, de preferência em PNG com fundo transparente.</p>" +
            '<div class="perf-foto-acoes">' +
              '<button type="button" class="perf-botao" data-enviar="carimbo_id">Enviar</button>' +
              (perfil.carimbo_id
                ? '<button type="button" class="perf-tirar" data-tirar="carimbo_id">remover</button>'
                : "") +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>" +
      /* O app de referencia diz "bucket privado". Aqui nao ha bucket: ha o
         IndexedDB desta maquina. Dizer a mesma frase seria mentir sobre onde
         a assinatura da pessoa esta. */
      /* Correcao (auditoria Perfil): com conta, as imagens sobem para o servidor
         (professional_assets + armazenamento da conta) — "neste navegador" era falso. */
      '<p class="perf-nota">' + (window.HoloAuth && window.HoloAuth.sessaoAtiva && window.HoloAuth.sessaoAtiva()
        ? "As imagens ficam salvas <b>na sua conta</b>, no servidor do HoloHacking, protegidas pelo seu login, "
        : "Modo local, sem conta: as imagens ficam guardadas <b>neste navegador</b> ") +
      "e só são usadas para montar os documentos que você imprime. " +
      "Não constituem assinatura digital ICP-Brasil e podem ser removidas a qualquer momento.</p>";

    alvo.innerHTML =
      cartao("Personalização de Materiais",
        "As cores e o logo dos relatórios que você imprime para os pacientes.", cores) +
      cartao("Assinatura e carimbo",
        "Imagens opcionais usadas no rodapé dos relatórios.", assinatura);

    urlDe(perfil.logo_id).then(function (u) {
      var el = document.getElementById("perf-logo-alvo");
      if (el && u) el.innerHTML = '<img src="' + u + '" alt="">';
      var pv = document.getElementById("previa-logo");
      if (pv && u) pv.innerHTML = '<img src="' + u + '" alt="">';
    });
    urlDe(perfil.assinatura_id).then(function (u) {
      var el = document.getElementById("perf-assinatura-alvo");
      if (el && u) el.innerHTML = '<img src="' + u + '" alt="">';
    });
    urlDe(perfil.carimbo_id).then(function (u) {
      var el = document.getElementById("perf-carimbo-alvo");
      if (el && u) el.innerHTML = '<img src="' + u + '" alt="">';
    });
    if (desenhando) ligarPrancheta();
  }

  function corCampo(id, rotulo) {
    return '<div class="perf-campo">' +
      '<label for="pf-' + id + '-texto">' + escapar(rotulo) + "</label>" +
      '<div class="perf-cor">' +
        '<input type="color" id="pf-' + id + '" value="' + escapar(perfil[id]) +
          '" aria-label="' + escapar(rotulo) + '">' +
        '<input type="text" id="pf-' + id + '-texto" value="' + escapar(perfil[id]) +
          '" spellcheck="false">' +
      "</div></div>";
  }

  /* A previa e o proprio cabecalho do relatorio, com os mesmos dados. Se ela
     mostrasse um exemplo bonito e o impresso saisse diferente, ela mentiria. */
  function previa() {
    return '<div class="perf-previa" style="--p:' + escapar(perfil.cor_primaria) +
      ";--s:" + escapar(perfil.cor_secundaria) + '">' +
      '<div class="perf-previa-topo">' +
        '<span class="perf-previa-logo" id="previa-logo">' +
          (perfil.logo_id ? "" : "sem logo") + "</span>" +
        '<span class="perf-previa-quem">' +
          "<b>" + escapar(perfil.nome || "Seu nome") + "</b>" +
          "<i>" + escapar(perfil.especialidade || "Especialidade") + "</i>" +
          "<i>" + escapar(perfil.cidade || "Cidade/UF") + "</i>" +
        "</span>" +
      "</div>" +
      '<p class="perf-previa-linha primaria">Cabeçalho de documento</p>' +
      '<p class="perf-previa-linha secundaria">Acompanhamento</p>' +
      "</div>";
  }

  /* ---------- desenhar a assinatura --------------------------------------- */

  function prancheta() {
    return '<div class="perf-prancheta">' +
      '<canvas id="perf-canvas" width="720" height="220" ' +
        'aria-label="Área para desenhar a assinatura"></canvas>' +
      '<div class="perf-foto-acoes">' +
        '<button type="button" class="btn-verde" id="btn-usar-desenho">Usar esta assinatura</button>' +
        '<button type="button" class="perf-botao" id="btn-limpar-desenho">Limpar</button>' +
        '<button type="button" class="perf-tirar" id="btn-fechar-desenho">cancelar</button>' +
      "</div></div>";
  }

  function ligarPrancheta() {
    var cv = document.getElementById("perf-canvas");
    if (!cv) return;
    var ctx = cv.getContext("2d");
    var traçou = false;
    var pondo = false;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";

    /* O canvas e desenhado em 720x220 mas exibido menor: sem converter a
       coordenada, o traço sai deslocado do dedo. */
    function ponto(ev) {
      var r = cv.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * (cv.width / r.width),
               y: (ev.clientY - r.top) * (cv.height / r.height) };
    }
    cv.addEventListener("pointerdown", function (ev) {
      pondo = true; traçou = true;
      cv.setPointerCapture(ev.pointerId);
      var p = ponto(ev);
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
    });
    cv.addEventListener("pointermove", function (ev) {
      if (!pondo) return;
      var p = ponto(ev);
      ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (e) {
      cv.addEventListener(e, function () { pondo = false; });
    });

    document.getElementById("btn-limpar-desenho").addEventListener("click", function () {
      ctx.clearRect(0, 0, cv.width, cv.height); traçou = false;
    });
    document.getElementById("btn-fechar-desenho").addEventListener("click", function () {
      desenhando = false; desenhar();
    });
    document.getElementById("btn-usar-desenho").addEventListener("click", function () {
      if (!traçou) { aviso("Desenhe a assinatura antes de salvar.", true); return; }
      cv.toBlob(function (blob) {
        if (!blob) return;
        var arq = new File([blob], "assinatura.png", { type: "image/png" });
        desenhando = false;
        guardarImagem("assinatura_id", arq, "Assinatura");
      }, "image/png");
    });
  }

  /* ================================================ ABA: PREFERENCIAS ==== */

  function painelPrefs() {
    var alvo = document.getElementById("painel-prefs");

    var modulos = MODULOS.map(function (m) {
      var ligado = perfil.modulos[m.id] !== false;
      return '<div class="perf-modulo">' +
        '<div class="perf-modulo-topo">' +
          '<span class="perf-modulo-quem"><b>' + escapar(m.nome) + "</b>" +
            "<span>" + escapar(m.resumo) + "</span></span>" +
          '<button type="button" class="perf-chave' + (ligado ? " ligada" : "") +
            '" role="switch" aria-checked="' + ligado + '" data-modulo="' + m.id +
            '" aria-label="' + escapar(m.nome) + '"><i></i></button>' +
        "</div>" +
        "<p>" + escapar(m.texto) + "</p>" +
        '<p class="perf-modulo-estado">' + (ligado ? "&#10003; Ativo no menu" : "Desativado") +
        "</p></div>";
    }).join("");

    var atual = window.aparenciaAtual ? window.aparenciaAtual() : "sistema";
    var aparencia = '<div class="perf-temas">' + APARENCIAS.map(function (a) {
      return '<button type="button" class="perf-tema' + (a.id === atual ? " ativo" : "") +
        '" data-aparencia="' + a.id + '" aria-pressed="' + (a.id === atual) + '">' +
        '<span class="perf-tema-amostra ' + a.id + '" aria-hidden="true">' +
          "<i></i><i></i><i></i></span>" +
        "<b>" + escapar(a.nome) + "</b></button>";
    }).join("") + "</div>";

    alvo.innerHTML =
      cartao("Módulos do menu",
        "Telas que você pode desligar se não usa. Desligar esconde do menu e não " +
        "apaga nada: o que já foi registrado continua lá, e volta quando você religar.",
        modulos) +
      cartao("Aparência",
        "Como o app é exibido. A escolha fica salva neste navegador &mdash; é " +
        "preferência de quem olha a tela, não um dado da clínica.",
        aparencia);
  }

  /* Rodada 08 — BUILD AUDITAVEL: /version.json e gerado no build da imagem
     (Dockerfile) com versao, commit e data. Lido uma vez por pagina. Sem o
     arquivo (servidor local de desenvolvimento), a tela diz isso. */
  var versaoApp = null;
  function lerVersao() {
    if (!versaoApp) {
      if (typeof fetch !== "function") { versaoApp = Promise.resolve(null); return versaoApp; }
      versaoApp = fetch("/version.json", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return versaoApp;
  }
  window.versaoDoApp = lerVersao;
  function mostrarVersao() {
    lerVersao().then(function (v) {
      var el = document.getElementById("conta-versao");
      if (!el) return;
      if (!v || !v.version) {
        el.textContent = "Versão local de desenvolvimento (este servidor não publicou version.json).";
        return;
      }
      var quando = v.builtAt ? new Date(v.builtAt) : null;
      el.textContent = "Versão " + v.version + " · commit " + (v.commit || "desconhecido") +
        (quando && !isNaN(quando) ? " · construída em " + quando.toLocaleString("pt-BR") : "");
    });
  }

  /* ========================================================= ABA: CONTA === */

  function painelConta() {
    var alvo = document.getElementById("painel-conta");
    var b = banco();
    var r = b ? b.resumo() : {};
    var onde = b ? b.onde : "neste navegador";

    var linhas = [
      { n: r.pacientes || 0, r: (r.pacientes === 1 ? "paciente" : "pacientes") },
      { n: r.holoscan || 0, r: "mapas guardados" },
      { n: (r.oq3 || 0) + (r.pqq || 0), r: "formulários" },
      { n: "—", r: "arquivos", id: "conta-arquivos" }
    ];

    /* Rodada 08: o texto diz onde o dado REALMENTE esta. Com conta, o dado
       clinico fica no servidor (Supabase, sob login e RLS) — "tudo esta
       neste navegador" e "nao ha servidor no meio" eram falsos. O backup
       completo local (exportar/importar) so existe no modo local sem conta,
       onde ele e de fato o dado todo; com conta, a exportacao e por
       paciente, na ficha, lida do servidor. "Apagar tudo" nao existe mais:
       nenhuma tela destroi a carteira inteira de uma vez. */
    var comConta = !!(window.HoloAuth && window.HoloAuth.sessaoAtiva && window.HoloAuth.sessaoAtiva());
    var dados = comConta
      ? '<p class="perf-onde">Os dados clínicos que você registra ficam <b>na sua conta</b>, ' +
          "no servidor do HoloHacking, protegidos pelo seu login — só a sua conta os lê.</p>" +
        '<p class="perf-ajuda">Este navegador guarda uma cópia de trabalho para a tela abrir ' +
          "rápido. Ao sair da conta, essa cópia sai da tela e fica guardada neste navegador, separada " +
          "por conta, só para devolver rascunhos que ainda não subiram quando você voltar; em computador " +
          "compartilhado, use uma janela anônima. Para levar os dados de um paciente, use " +
          "<b>Exportar</b> na ficha dele.</p>"
      : '<p class="perf-onde">Modo local, sem conta: o que você registrou está <b>' + escapar(onde) +
          "</b> e em nenhum outro lugar.</p>" +
        '<div class="dash-numeros">' + linhas.map(function (l) {
          return '<div class="dash-tile"' + (l.id ? ' id="' + l.id + '"' : "") + "><b>" +
            escapar(l.n) + "</b><span>" + escapar(l.r) + "</span></div>";
        }).join("") + "</div>" +
        '<p class="perf-ajuda">Limpar os dados do navegador apaga esta cópia. ' +
          "<b>Exporte de vez em quando.</b> O backup leva cadastro, mapas HOLOSCAN, respostas, " +
          "exames, consultas, ferramentas, perfil e arquivos; fica de fora só a aparência.</p>" +
        '<div class="perf-foto-acoes">' +
          '<button type="button" class="btn-verde" id="btn-exportar">Exportar backup deste navegador</button>' +
          '<button type="button" class="perf-botao" id="btn-importar">Importar backup</button>' +
          '<input type="file" id="arq-importar" accept=".json,application/json" class="hidden">' +
        "</div>" +
        '<p class="perf-aviso" id="conta-aviso"></p>';

    var usuario = window.HoloAuth && window.HoloAuth.usuarioAtual && window.HoloAuth.usuarioAtual();
    var acesso = usuario
      ? '<p>Você está conectado como <b>' + escapar(usuario.email || "") + "</b>.</p>" +
        '<p class="perf-ajuda">A sessão fica neste navegador. Se for sair de uma máquina ' +
        "compartilhada, encerre a sessão em vez de só fechar a aba.</p>" +
        '<div class="perf-foto-acoes">' +
          '<button type="button" class="perf-tirar" id="btn-sair">Sair da conta</button>' +
        "</div>"
      : '<p>Nenhuma sessão do Supabase ativa neste navegador — normal se você ' +
        "entrou pelo atalho de desenvolvimento local. Fora de localhost, isto " +
        "deveria ter te levado para a tela de entrada.</p>";

    var trocarSenhaHtml = usuario
      ? '<div style="margin-bottom:14px">' +
          '<label for="conta-nova-senha" style="display:block;font-size:.72rem;letter-spacing:.15em;text-transform:uppercase;color:var(--realce);font-weight:600;margin-bottom:6px">Nova senha</label>' +
          '<input type="password" id="conta-nova-senha" autocomplete="new-password" style="width:100%;padding:10px 14px;border:1px solid var(--input-borda);border-radius:8px;background:var(--input-fundo);color:var(--texto);font-size:.88rem">' +
        '</div>' +
        '<div style="margin-bottom:14px">' +
          '<label for="conta-confirmar-senha" style="display:block;font-size:.72rem;letter-spacing:.15em;text-transform:uppercase;color:var(--realce);font-weight:600;margin-bottom:6px">Confirmar nova senha</label>' +
          '<input type="password" id="conta-confirmar-senha" autocomplete="new-password" style="width:100%;padding:10px 14px;border:1px solid var(--input-borda);border-radius:8px;background:var(--input-fundo);color:var(--texto);font-size:.88rem">' +
        '</div>' +
        '<div class="perf-foto-acoes">' +
          '<button type="button" class="perf-botao" id="btn-trocar-senha">Alterar senha</button>' +
        '</div>' +
        '<p class="perf-aviso" id="conta-senha-aviso"></p>'
      : '';

    alvo.innerHTML =
      cartao("Onde ficam os seus dados", "", dados) +
      cartao("Acesso", "", acesso) +
      (trocarSenhaHtml ? cartao("Alterar senha", "", trocarSenhaHtml) : "") +
      cartao("Versão do app", "", '<p class="perf-ajuda" id="conta-versao">Lendo a versão…</p>');
    mostrarVersao();

    if (window.ArquivoStore && window.ArquivoStore.listarTudo) {
      window.ArquivoStore.listarTudo().then(function (itens) {
        var el = document.getElementById("conta-arquivos");
        if (el) el.querySelector("b").textContent = itens.length;
      });
    }
  }

  /* ---------- exportar e importar -----------------------------------------

     O BOTAO PASSOU A CHAMAR O BACKUP V2.

     Ate aqui, "Exportar" chamava DadosLocais.exportar(), que empacota as OITO
     tabelas da fachada e mais nada. Ficavam de fora quatro armazenamentos que
     ninguem consegue regerar — as respostas do questionario, a serie historica
     de mapas, os valores de exame — e TODOS os arquivos do IndexedDB: laudo em
     PDF, foto de exame, a assinatura da nutricionista. Um backup que nao leva
     isso nao e um backup incompleto: e um backup que mente, porque a pessoa
     guarda o arquivo achando que guardou o prontuario.

     O motor V2 ja existia inteiro em armazenamento.js, validar-backup.js,
     restaurar-backup.js e importar-v1.js — com hash canonico, snapshot,
     rollback, verificacao pos-escrita e recuperacao pos-crash. O que faltava
     era so o fio ate o botao. Esta rodada e o fio. Nenhuma linha do motor
     mudou.

     DadosLocais.exportar() continua existindo: dados.js e a fachada, e outras
     coisas dependem dela. O que deixou de existir e trata-la como backup. */

  function armaz() { return window.Armazenamento || null; }

  function exportar() {
    var A = armaz();
    if (!A || !A.gerarBackupV2) {
      contaAviso("O módulo de backup não carregou. Recarregue a página.", true);
      return;
    }
    var botao = document.getElementById("btn-exportar");
    if (botao) botao.disabled = true;
    contaAviso("Gerando o backup completo — os arquivos entram junto, pode demorar.");

    /* gerarBackupV2 le as 12 caixas exportaveis MAIS os documentos do
       IndexedDB, calcula o sha256 do conteudo canonico e devolve o pacote. */
    A.gerarBackupV2().then(function (pacote) {
      var r = A.baixarBackupV2(pacote);
      var docs = (pacote.conteudo.arquivos || []).length;
      var mb = (r.bytes / 1048576).toFixed(1);
      contaAviso("Backup completo gerado: " + pacote.armazenamentos.length +
                 " armazenamentos e " + docs + (docs === 1 ? " documento" : " documentos") +
                 " · " + mb + " MB. Guarde o arquivo fora deste computador.");
    }).catch(function (e) {
      /* O gerador e ESTRITO com o IndexedDB de proposito: se a leitura dos
         documentos falhar, ele rejeita em vez de entregar um pacote que diz
         "zero documentos" com alegria. Aqui isso vira recusa visivel — nunca
         um download pela metade. */
      contaAviso("O backup NÃO foi gerado: " + (e && e.message ? e.message : "falha ao ler os arquivos") +
                 ". Nada foi salvo — tente de novo.", true);
    }).then(function () {
      if (botao) botao.disabled = false;
    });
  }

  /* Os quatro grupos que um V1 nunca carregou, em portugues de gente. */
  var NOME_CAIXA = {
    questionario: "as respostas do questionário",
    pontuacao: "o histórico de mapas HOLOSCAN",
    exames: "os valores de exame",
    arquivos: "os arquivos (laudos, fotos, assinatura)"
  };
  function listarCaixas(ids) {
    return (ids || []).map(function (id) { return NOME_CAIXA[id] || id; }).join(", ");
  }

  function importar(arquivo) {
    var A = armaz();
    if (!A || !A.reconhecerBackup) {
      contaAviso("O módulo de backup não carregou. Recarregue a página.", true);
      return;
    }
    var leitor = new FileReader();
    leitor.onerror = function () {
      contaAviso("Não foi possível ler o arquivo do disco.", true);
    };
    leitor.onload = function () {
      var pacote;
      try { pacote = JSON.parse(leitor.result); }
      catch (e) { contaAviso("Esse arquivo não é um backup do HoloHacking.", true); return; }

      var qual = A.reconhecerBackup(pacote);
      if (qual.tipo === "v2") return importarV2(pacote);
      if (qual.tipo === "v1_legado") return importarV1(pacote);
      contaAviso("Esse arquivo não é um backup do HoloHacking: " + qual.porque, true);
    };
    leitor.readAsText(arquivo);
  }

  /** V2: valida, simula, mostra o que vai ser substituido, e so entao aplica. */
  function importarV2(pacote) {
    var A = armaz();
    contaAviso("Conferindo o arquivo...");
    /* O DRY-RUN e obrigatorio, nao cortesia: e a unica chance de a pessoa ver
       o tamanho do que vai ser substituido ANTES de perder o que tem. Ele nao
       escreve nada — simularImportacaoV2 devolve escreveu:false sempre. */
    A.simularImportacaoV2(pacote).then(function (sim) {
      if (!sim.valido) {
        contaAviso("Backup inválido — NADA foi alterado. " +
                   primeiroErro(sim) , true);
        return;
      }
      var linhas = sim.substituidos.map(function (s) {
        return "  · " + (NOME_CAIXA[s.id] || s.id) + ": " + s.registros;
      }).join("\n");
      var alerta = sim.orfaos > 0
        ? "\n\nAVISO: o pacote traz " + sim.registros_orfaos + " registro(s) de " +
          "paciente que não existe mais no cadastro. Eles serão restaurados assim mesmo."
        : "";
      if (!confirm("Restaurar SUBSTITUI tudo o que está neste navegador.\n\n" +
                   "O backup traz:\n" + linhas + "\n  · " + sim.documentos + " documento(s)" +
                   alerta + "\n\nSe algo falhar no meio, o estado anterior é restaurado " +
                   "automaticamente.\n\nContinuar?")) {
        contaAviso("Importação cancelada. Nada foi alterado.");
        return;
      }
      aplicar(A.aplicarBackupV2(pacote));
    }).catch(function (e) {
      contaAviso("Não foi possível conferir o arquivo: " + descrever(e) +
                 ". Nada foi alterado.", true);
    });
  }

  /** V1 legado: restauracao PARCIAL, e o motor exige confirmacao explicita. */
  function importarV1(pacote) {
    var A = armaz();
    contaAviso("Conferindo o arquivo...");
    var plano;
    try { plano = A.planejarImportacaoV1(pacote); }
    catch (e) { contaAviso("Não foi possível ler esse backup antigo: " + descrever(e), true); return; }

    if (!plano.valido) {
      contaAviso("Backup antigo inválido — NADA foi alterado.", true);
      return;
    }
    /* A API recusa sem confirmarRestauracaoParcial:true justamente para que
       esta frase exista. Nao e burocracia: o V1 nunca guardou estes quatro
       grupos, e restaurar um V1 ESVAZIA o que houver deles aqui. */
    if (!confirm("Este é um BACKUP PARCIAL LEGADO (formato antigo).\n\n" +
                 "Ele traz: " + plano.pacientes + " paciente(s), " +
                 plano.consultas + " consulta(s), " + plano.aplicacoes + " aplicação(ões).\n\n" +
                 "Ele NÃO contém " + listarCaixas(plano.limpa_por_ausencia_no_formato) +
                 ".\nRestaurar APAGA esses grupos deste navegador — não porque o backup " +
                 "disse que estão vazios, mas porque o formato antigo nunca os guardou.\n\n" +
                 "Continuar mesmo assim?")) {
      contaAviso("Importação cancelada. Nada foi alterado.");
      return;
    }
    aplicar(A.aplicarBackupV1(pacote, { confirmarRestauracaoParcial: true }));
  }

  /** O desfecho, igual para os dois formatos: o V1 passa pelo motor do V2. */
  function aplicar(promessa) {
    contaAviso("Restaurando — não feche esta aba.");
    promessa.then(function (r) {
      if (r.aplicado) {
        contaAviso("Restaurado: " + (r.armazenamentos || []).length + " armazenamentos e " +
                   (r.documentos || 0) + " documento(s). Recarregando...");
        /* O motor diz precisa_recarregar: as telas em memoria nao sabem que o
           disco inteiro mudou embaixo delas. */
        if (r.precisa_recarregar) setTimeout(function () { location.reload(); }, 1200);
        return;
      }
      if (r.revertido) {
        contaAviso("A restauração falhou no meio e o estado anterior foi DEVOLVIDO por " +
                   "completo. Seus dados continuam como estavam.", true);
        return;
      }
      contaAviso(explicarRecusa(r), true);
    }).catch(function (e) {
      contaAviso("A restauração não pôde ser concluída: " + descrever(e), true);
    });
  }

  /** Por que o motor recusou — em vez de "erro". Cada motivo tem uma saida. */
  function explicarRecusa(r) {
    var nada = " NADA foi alterado.";
    switch (r.motivo) {
      case "RECUPERACAO_PENDENTE":
        return "Há uma restauração anterior que não terminou neste navegador. " +
               "Recupere-a antes de restaurar outra coisa." + nada;
      case "ESTADO_DESATUALIZADO":
        return "Outra aba do HoloHacking escreveu enquanto esta esperava. " +
               "Feche as outras abas e tente de novo." + nada;
      case "PACOTE_INVALIDO":
        return "O arquivo não passou na verificação de integridade." + nada;
      case "FALHA_ANTES_DO_SNAPSHOT":
        return "A restauração parou antes de começar a escrever." + nada;
      case "RECUPERACAO_MANUAL_NECESSARIA":
        return "A restauração falhou E a volta automática também falhou. " +
               "NÃO feche esta aba: use a recuperação pendente.";
      default:
        return "A restauração não foi aplicada" +
               (r.motivo ? " (" + r.motivo + ")" : "") + "." + nada;
    }
  }

  function primeiroErro(sim) {
    var e = (sim.erros || [])[0];
    return e ? (e.codigo + (e.onde ? " em " + e.onde : "")) : "";
  }
  function descrever(e) {
    return (e && e.message) ? e.message : String(e);
  }

  /* Encerra a sessao Supabase de verdade (auth.signOut). login.js escuta
     onAuthStateChange e bloqueia o app sozinho quando o evento chega — esta
     funcao nao mexe em tela nenhuma diretamente. */
  function sair() {
    if (!window.HoloAuth) return;
    window.HoloAuth.sair();
  }

  function trocarSenhaConta() {
    var nova = document.getElementById("conta-nova-senha");
    var confirmar = document.getElementById("conta-confirmar-senha");
    var aviso = document.getElementById("conta-senha-aviso");
    if (!nova || !confirmar) return;

    var novaSenha = nova.value;
    var confirmarSenha = confirmar.value;

    if (!novaSenha) {
      if (aviso) { aviso.textContent = "Informe a nova senha."; aviso.className = "perf-aviso ruim"; }
      nova.focus(); return;
    }
    if (novaSenha.length < 8) {
      if (aviso) { aviso.textContent = "A senha precisa ter pelo menos 8 caracteres."; aviso.className = "perf-aviso ruim"; }
      nova.focus(); return;
    }
    if (novaSenha !== confirmarSenha) {
      if (aviso) { aviso.textContent = "As senhas não coincidem."; aviso.className = "perf-aviso ruim"; }
      confirmar.focus(); return;
    }

    var btn = document.getElementById("btn-trocar-senha");
    if (btn) btn.disabled = true;
    if (aviso) { aviso.textContent = "Alterando…"; aviso.className = "perf-aviso"; }

    window.AuthService.trocarSenha(novaSenha)
      .then(function (r) {
        if (r.ok) {
          if (aviso) { aviso.textContent = "Senha alterada com sucesso."; aviso.className = "perf-aviso"; }
          nova.value = ""; confirmar.value = "";
        } else {
          if (aviso) { aviso.textContent = r.mensagem || "Não foi possível alterar a senha."; aviso.className = "perf-aviso ruim"; }
        }
      })
      .catch(function () {
        if (aviso) { aviso.textContent = "Não foi possível alterar a senha."; aviso.className = "perf-aviso ruim"; }
      })
      .then(function () {
        if (btn) btn.disabled = false;
      });
  }

  function contaAviso(texto, ruim) {
    var el = document.getElementById("conta-aviso");
    if (!el) { if (window.avisar) window.avisar(texto); return; }
    el.textContent = texto;
    el.className = ruim ? "perf-aviso ruim" : "perf-aviso";
  }

  /* ---------- desenhar e ligar -------------------------------------------- */

  /* A leitura do servidor falhou: no lugar dos formularios, o erro e o
     "Tentar novamente". A aba Conta (sair, senha) continua funcionando. */
  function painelErroCarga() {
    var html = cartao("Não foi possível carregar o seu perfil",
      "",
      '<p class="perf-ajuda">O servidor não respondeu. Para não apagar nada, o perfil não pode ser editado nem salvo ' +
      "até carregar de verdade. Confira sua internet e tente de novo.</p>" +
      '<div class="perf-foto-acoes"><button type="button" class="btn-verde" data-perfil-recarregar>Tentar novamente</button></div>' +
      '<p class="perf-aviso" id="perfil-aviso"></p>');
    ["painel-perfil", "painel-marca", "painel-prefs"].forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = i === 0 ? '<div class="perf-erro-carga">' + html + "</div>" : '<div class="perf-erro-carga">' + html.replace(' id="perfil-aviso"', "") + "</div>";
    });
    var c = document.getElementById("perfil-completude");
    if (c) c.innerHTML = "";
  }

  function desenhar() {
    if (!document.getElementById("painel-perfil")) return;
    desenharAvisoConta();
    if (bloqueado()) {
      painelErroCarga();
      painelConta();
      ligar();
      return;
    }
    desenharCompletude();
    painelPerfil();
    painelMarca();
    painelPrefs();
    painelConta();
    desenharRodape();
    aplicarModulos();
    ligar();
  }

  function trocarAba(qual) {
    if (qual === "prefs" && contaRestrita()) qual = "perfil";
    aba = qual;
    document.querySelectorAll("[data-aba-perfil]").forEach(function (b) {
      var meu = b.dataset.abaPerfil === qual;
      b.classList.toggle("ativa", meu);
      b.setAttribute("aria-selected", meu ? "true" : "false");
    });
    ["perfil", "marca", "prefs", "conta"].forEach(function (n) {
      document.getElementById("painel-" + n).classList.toggle("hidden", n !== qual);
    });
  }

  var ligado = false;

  function ligar() {
    if (ligado) return;
    ligado = true;

    document.querySelectorAll("[data-aba-perfil]").forEach(function (b) {
      b.addEventListener("click", function () { trocarAba(b.dataset.abaPerfil); });
    });

    var secao = document.getElementById("secao-perfil");

    secao.addEventListener("click", function (ev) {
      var irAba = ev.target.closest("[data-pac-aba]");
      if (irAba) {
        /* a aba fica abaixo da parte visivel: trocar so a aba parecia nao fazer nada.
           Troca, rola ate o campo (ou o botao de enviar) e poe o foco nele. */
        trocarAba(irAba.dataset.pacAba);
        var destino = irAba.dataset.pacAlvo && document.querySelector("#painel-" + irAba.dataset.pacAba + " " + irAba.dataset.pacAlvo);
        if (destino) {
          if (destino.scrollIntoView) destino.scrollIntoView({ behavior: "smooth", block: "center" });
          try { destino.focus({ preventScroll: true }); } catch (x) { destino.focus(); }
        }
        return;
      }
      if (ev.target.closest("#btn-verificar-acesso")) {
        var bv = ev.target.closest("#btn-verificar-acesso"), msg = document.getElementById("pac-msg");
        bv.disabled = true;
        if (msg) msg.textContent = "Verificando…";
        Promise.resolve(window.ContaAcesso && window.ContaAcesso.verificar ? window.ContaAcesso.verificar() : null).then(function (st) {
          bv.disabled = false;
          if (!msg) return;
          msg.textContent = st === "ativo" ? "Acesso liberado! Abrindo a plataforma…"
            : st === "pendente" ? "Ainda aguardando liberação. Você pode continuar completando o perfil."
            : st === "recusado" ? "O acesso não foi liberado." : "Não foi possível verificar agora. Tente de novo.";
        });
        return;
      }
      var recarregar = ev.target.closest("[data-perfil-recarregar]");
      if (recarregar) {
        recarregar.disabled = true;
        recarregar.textContent = "Carregando…";
        carregar().then(function () {
          desenhar(); trocarAba(aba);
          if (bloqueado()) aviso("Ainda não foi possível carregar. Tente de novo em instantes.", true);
        });
        return;
      }
      var enviar = ev.target.closest("[data-enviar]");
      if (enviar) { if (bloqueado()) { aviso(MSG_BLOQUEADO, true); return; } pedirArquivo(enviar.dataset.enviar); return; }

      var tirar = ev.target.closest("[data-tirar]");
      if (tirar) { tirarImagem(tirar.dataset.tirar); return; }

      var chave = ev.target.closest("[data-modulo]");
      if (chave) {
        var id = chave.dataset.modulo;
        perfil.modulos[id] = perfil.modulos[id] === false;
        salvar(perfil.modulos[id] ? "Módulo ativado." : "Módulo desativado.")
          .then(function () { painelPrefs(); });
        return;
      }

      var tema = ev.target.closest("[data-aparencia]");
      if (tema) {
        if (window.definirAparencia) window.definirAparencia(tema.dataset.aparencia);
        painelPrefs();
        return;
      }

      if (ev.target.closest("#btn-salvar-perfil")) {
        var btnPerfil = ev.target.closest("#btn-salvar-perfil");
        if (window.travarBotao && !window.travarBotao(btnPerfil, "Salvando…")) return;
        /* Correcao (auditoria Perfil): o nome assina os relatorios impressos — nao pode
           ficar vazio; e-mail validado como no cadastro de paciente. Valida ANTES de
           mexer no perfil em memoria (nada muda se for recusado). */
        var vNome = ((document.getElementById("pf-nome") || {}).value || "").trim();
        var vEmail = ((document.getElementById("pf-email") || {}).value || "").trim();
        var invalido = !vNome ? ["Informe o nome completo: ele assina os documentos impressos.", "pf-nome"]
          : vEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vEmail) ? ["E-mail inválido. Verifique e tente novamente.", "pf-email"] : null;
        if (invalido) {
          aviso(invalido[0], true);
          var foco = document.getElementById(invalido[1]); if (foco) foco.focus();
          if (window.destravarBotao) window.destravarBotao(btnPerfil);
          return;
        }
        lerFormulario();
        aviso("");
        salvar("Perfil salvo.").then(function () { desenharCompletude(); painelMarca(); })
          .finally(function () { if (window.destravarBotao) window.destravarBotao(btnPerfil); });
        return;
      }
      if (ev.target.closest("#btn-salvar-marca")) {
        var btnMarca = ev.target.closest("#btn-salvar-marca");
        if (window.travarBotao && !window.travarBotao(btnMarca, "Salvando…")) return;
        salvar("Marca salva.")
          .finally(function () { if (window.destravarBotao) window.destravarBotao(btnMarca); });
        return;
      }
      if (ev.target.closest("#btn-desenhar")) {
        desenhando = true;
        painelMarca();
        return;
      }
      if (ev.target.closest("#btn-exportar")) { exportar(); return; }
      if (ev.target.closest("#btn-importar")) {
        document.getElementById("arq-importar").click();
        return;
      }
      if (ev.target.closest("#btn-sair")) { sair(); return; }
      if (ev.target.closest("#btn-trocar-senha")) { trocarSenhaConta(); return; }
    });

    // as cores andam em par: mexer no seletor escreve no texto, e vice-versa
    secao.addEventListener("input", function (ev) {
      var alvo = ev.target;
      ["cor_primaria", "cor_secundaria"].forEach(function (c) {
        if (alvo.id === "pf-" + c) {
          perfil[c] = alvo.value;
          document.getElementById("pf-" + c + "-texto").value = alvo.value;
          atualizarPrevia();
        } else if (alvo.id === "pf-" + c + "-texto") {
          var v = alvo.value.trim();
          if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            perfil[c] = v;
            document.getElementById("pf-" + c).value = v;
            atualizarPrevia();
            alvo.classList.remove("perf-invalido");
          } else {
            /* auditoria: "azul" nao salvava e nada explicava */
            alvo.classList.add("perf-invalido");
            aviso("Cor inválida: use o formato #RRGGBB (ex.: #0b3325) ou o seletor ao lado. A cor salva continua " + perfil[c] + ".", true);
          }
        }
      });
    });

    secao.addEventListener("change", function (ev) {
      if (ev.target.id === "arq-importar" && ev.target.files[0]) {
        importar(ev.target.files[0]);
        ev.target.value = "";
      }
    });
  }

  function atualizarPrevia() {
    var pv = document.querySelector(".perf-previa");
    if (!pv) return;
    pv.style.setProperty("--p", perfil.cor_primaria);
    pv.style.setProperty("--s", perfil.cor_secundaria);
  }

  /** Um <input type=file> descartavel: mais simples do que manter quatro no
      HTML, um por campo, e sem risco de o arquivo de um cair no outro. */
  function pedirArquivo(campo) {
    var tipos = { foto_id: "Foto", logo_id: "Logo",
                  assinatura_id: "Assinatura", carimbo_id: "Carimbo" };
    var alvos = { foto_id: "perf-foto-alvo", logo_id: "perf-logo-alvo",
                  assinatura_id: "perf-assinatura-alvo", carimbo_id: "perf-carimbo-alvo" };
    var entrada = document.createElement("input");
    entrada.type = "file";
    /* rodada 08: sem SVG (pode carregar script) — so PNG, JPG e WEBP */
    entrada.accept = "image/png,image/jpeg,image/webp";
    entrada.addEventListener("change", function () {
      var arq = entrada.files[0];
      if (!arq) return;
      if (["image/png", "image/jpeg", "image/webp"].indexOf(String(arq.type).toLowerCase()) < 0) {
        aviso("Tipo de imagem não aceito. Envie PNG, JPG ou WEBP.", true);
        return;
      }
      if (arq.size > 4 * 1024 * 1024) {
        aviso("Imagem muito grande (máximo 4 MB).", true);
        return;
      }
      var elAlvo = document.getElementById(alvos[campo]);
      if (elAlvo) {
        var previa = URL.createObjectURL(arq);
        elAlvo.innerHTML = '<img src="' + previa + '" alt="" class="perf-img-carregando">';
        elAlvo.classList.add("com-foto");
      }
      guardarImagem(campo, arq, tipos[campo] || "Imagem");
    });
    entrada.click();
  }

  /* ---------- o que o relatorio precisa saber ------------------------------ */

  /** O perfil, para quem monta documento. Devolve sempre um objeto: quem
      imprime nao pode ter que checar se o perfil existe. */
  window.PerfilProfissional = {
    dados: function () { return Object.assign({}, PADRAO, perfil || {}); },
    imagem: urlDe,
    modulo: function (id) {
      return !perfil || perfil.modulos[id] !== false;
    }
  };

  window.Perfil = {
    atual: function () { return Object.assign({}, PADRAO, perfil || {}); },
    completude: completude
  };

  document.addEventListener("DOMContentLoaded", function () {
    carregar().then(function () {
      desenhar();
      trocarAba(aba);
      /* a aba Conta le window.HoloAuth.usuarioAtual() — que so tem valor de
         verdade depois que getSession() resolve. Sem isto, um refresh com
         sessao restaurada desenhava a aba antes da sessao ser conhecida, e
         o botao "Sair da conta" nunca aparecia ate a pessoa trocar de aba
         na mao. aoMudarEstado ja avisa na hora se o estado ja resolveu. */
      if (window.HoloAuth && window.HoloAuth.aoMudarEstado) {
        window.HoloAuth.aoMudarEstado(function (estado) {
          if (estado !== "pendente") {
            carregar().then(function () { desenhar(); trocarAba(aba); });
          }
        });
      }
    });
  });

  /* login.js avisa quando o status da conta e conhecido ou muda (pendente/ativo) */
  document.addEventListener("holo:conta-status", function (ev) {
    var st = ev && ev.detail ? ev.detail.status : null;
    if (perfil && st) { desenhar(); trocarAba(aba); } else desenharAvisoConta();
  });

  window.redesenharPerfil = function () {
    if (perfil) { desenhar(); trocarAba(aba); }
  };
})();
