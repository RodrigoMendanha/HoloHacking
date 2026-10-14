/* ===========================================================================
   HOLOS AI — PONTE PARA O RESULTADO HOLOS (aba HOLOS AI do atendimento)
   ===========================================================================

   1. Copiar Pacote HOLOS AI   so dados reais ja registrados, sem nome/contatos, sem exames
   2. Abrir HOLOS AI           o agente externo (a nutricionista leva o Pacote)
   3. Importar Resultado       cola o JSON HOLOS_AI_RESULT (schema_version 1) -> validar e importar
                               (invalido: nada e salvo e o texto colado fica na tela para corrigir)
   4. Revisar analise          cada item comeca como SUGESTAO HOLOS AI: confirmar, editar ou descartar;
                               compartilhar com a paciente so o que pode (so profissional nunca)
   5. Gerar Resultado HOLOS    o que foi CONFIRMADO entra no Resultado HOLOS deste atendimento
                               (ResultadoHolos.receberHolosAI); quem finaliza e emite e a nutricionista

   Dados: holos_ai_imports / holos_ai_import_items (migration 20261023100000). Escrita so por RPC; cada
   importacao e uma versao nova (nunca sobrescreve). Contrato do JSON: holos-ai-contrato.js.
   A HOLOS AI nao substitui o Resultado HOLOS: ela fornece inteligencia para ele.
   =========================================================================== */

(function () {
  "use strict";

  function C() { return window.HolosAIContrato; }
  function e(x) { return window.escapar ? window.escapar(x === null || x === undefined ? "" : String(x)) : String(x === null || x === undefined ? "" : x); }
  function toast(m) { if (window.avisar) window.avisar(m); }
  function pacienteId() { return window.pacienteAtivoId ? window.pacienteAtivoId() : null; }
  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function uuid() { return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : null; }
  function arquivado() { try { return !!(window.pacienteArquivado && window.pacienteArquivado()); } catch (x) { return false; } }
  function dataHora(iso) {
    var d = String(iso || ""); if (!d) return "";
    var dia = window.dataBR ? window.dataBR(d.slice(0, 10)) : d.slice(0, 10);
    var dt = new Date(d); var h = isNaN(dt) ? "" : String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0");
    return dia + (h ? " · " + h : "");
  }

  var STATUS = { importado: "IMPORTADO", em_revisao: "EM REVISÃO", confirmado: "CONFIRMADO", descartado: "DESCARTADO" };
  var ESTADO = { sugerido: "SUGESTÃO HOLOS AI", confirmado: "CONFIRMADO", editado: "EDITADO", descartado: "DESCARTADO" };
  var MSG = {
    json_invalido: "JSON inválido: confira se o bloco foi copiado inteiro (do { inicial ao } final). Nada foi salvo.",
    schema_incompativel: "Este JSON usa uma versão de schema que este HoloHacking não importa (aceita schema_version 1). Nada foi salvo.",
    resultado_invalido: "O JSON não segue a estrutura HOLOS_AI_RESULT v1. Nada foi salvo.",
    atendimento_obrigatorio: "Escolha um atendimento desta paciente antes de importar.",
    holos_ai_revisao_incompleta: "Ainda há itens só como SUGESTÃO: confirme, edite ou descarte cada um antes de concluir.",
    holos_ai_nada_confirmado: "Nenhum item foi confirmado. Se nada serve, descarte a importação.",
    holos_ai_revisao_encerrada: "Esta importação já foi concluída ou descartada: os itens não mudam mais.",
    holos_ai_so_profissional: "Este item é só profissional (ou ainda não foi confirmado) e não pode ir para a paciente.",
    holos_ai_edicao_invalida: "A edição só troca o texto, e o título/texto principal não pode ficar vazio.",
    paciente_arquivado: window.MSG_ARQUIVADO || "Paciente arquivado: reative antes de registrar novas informações.",
    conta_nao_liberada: "Sua conta ainda aguarda liberação."
  };
  function msgErro(err) {
    if (err && err.hint && MSG[err.hint]) return MSG[err.hint] + (err.hint === "resultado_invalido" && err.message ? " " + String(err.message).replace(/^HOLOS_AI_RESULT invalido \(\d+ problema\(s\)\): /, "Problemas: ") : "");
    return (err && err.message) || "Não foi possível concluir. Tente de novo.";
  }

  /* ---------- estado da tela ---------- */
  var cache = { pid: null, imports: [], itens: [], carregado: false, erro: null };
  var tela = { eid: null, texto: {}, erros: [], avisos: [], aberto: null, editando: null, ocupado: false, pacoteTxt: "" };

  function carregar(pid) {
    if (!pid || !temSupa()) { cache = { pid: pid, imports: [], itens: [], carregado: true, erro: null }; return Promise.resolve(); }
    var sb = window.supabaseClient;
    return new Promise(function (ok) { ok(); }).then(function () { return Promise.all([
      Promise.resolve(sb.from("holos_ai_imports").select("id, patient_id, encounter_id, versao, schema_version, tipo, origem, agente, kb_version, entrada, texto_sha256, status, imported_at, revisao_iniciada_em, concluida_em, descartada_em, updated_at")
        .eq("patient_id", pid).order("imported_at", { ascending: false })),
      Promise.resolve(sb.from("holos_ai_import_items").select("id, import_id, secao, ordem, chave, valor_ia, so_profissional, estado, valor_profissional, compartilhar, revisado_em")
        .eq("patient_id", pid))
    ]); }).then(function (r) {
      var err = (r[0] && r[0].error) || (r[1] && r[1].error) || null;
      cache = { pid: pid, imports: err ? [] : (r[0].data || []), itens: err ? [] : (r[1].data || []), carregado: true, erro: err };
    }, function (err) { cache = { pid: pid, imports: [], itens: [], carregado: true, erro: err }; });
  }
  function importsDoAtendimento(eid) {
    return cache.imports.filter(function (i) { return i.encounter_id === eid; }).sort(function (a, b) { return b.versao - a.versao; });
  }
  function itensDe(iid) {
    return cache.itens.filter(function (x) { return x.import_id === iid; }).sort(function (a, b) {
      return C().SECOES.indexOf(a.secao) - C().SECOES.indexOf(b.secao) || a.ordem - b.ordem;
    });
  }
  function importPorId(id) { return cache.imports.filter(function (i) { return i.id === id; })[0] || null; }
  function rpc(nome, args) {
    return Promise.resolve(window.supabaseClient.rpc(nome, args)).then(function (r) { if (r && r.error) throw r.error; return r ? r.data : null; });
  }

  /* ---------- atendimento ---------- */
  function atendimentos(pid) {
    var A = window.AtendimentoAtual; if (!A || !A.doPaciente) return [];
    return A.doPaciente(pid).slice().sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); });
  }
  function atendimentoEscolhido(pid) {
    var lista = atendimentos(pid);
    if (tela.eid && lista.some(function (x) { return x.id === tela.eid; })) return tela.eid;
    var A = window.AtendimentoAtual, at = A && A.idPara ? A.idPara(pid) : null;
    tela.eid = at && lista.some(function (x) { return x.id === at; }) ? at : (lista[0] ? lista[0].id : null);
    return tela.eid;
  }
  function rotuloAt(x) { var A = window.AtendimentoAtual; return A && A.rotuloQuando ? A.rotuloQuando(x) : String(x.occurred_at || "").slice(0, 10); }

  /* ---------- Pacote HOLOS AI (MVP) ---------- */
  function iniciais(nome) {
    return String(nome || "").trim().split(/\s+/).filter(Boolean).map(function (p) { return p.charAt(0).toUpperCase() + "."; }).join("") || "Sem dado";
  }
  function idade(nasc) {
    if (!nasc) return null;
    var n = Math.floor((Date.now() - new Date(nasc + "T00:00:00").getTime()) / 31557600000);
    return n > 0 && n < 150 ? n : null;
  }
  function direcaoVigente(pid, eid) {
    var R = window.ResultadoHolos; if (!R || !R.doPaciente) return null;
    var linhas = R.doPaciente(pid).filter(function (r) { return r.direcao; });
    var doAt = linhas.filter(function (r) { return r.encounter_id === eid; })[0];
    var salvo = linhas.filter(function (r) { return r.status !== "rascunho" && !r.superseded_at; })
      .sort(function (a, b) { return String(b.saved_at || "").localeCompare(String(a.saved_at || "")); })[0];
    var r = doAt || salvo; if (!r) return null;
    var d = r.direcao, ok = function (it) { return it && it.confirmado === true && !it.descartado && it.tipo !== "hipotese" && typeof it.texto === "string" && it.texto.trim(); };
    var txt = function (l) { return (l || []).filter(ok).map(function (it) { return it.texto; }); };
    return { resultado: r.status === "rascunho" ? "rascunho deste atendimento" : "Resultado HOLOS salvo",
      foco_atual: ok(d.foco_atual) ? d.foco_atual.texto : null, direcionamentos: txt(d.direcionamentos), estrategias: txt(d.estrategias),
      acordos: txt(d.acordos_compartilhados), observar: txt(d.observar) };
  }
  function tipoAtendimento(pid, eid) {
    var R = window.ResultadoHolos, A = window.AtendimentoAtual;
    var atual = A && A.porId ? A.porId(eid) : null;
    var antes = R && R.doPaciente ? R.doPaciente(pid).filter(function (r) {
      if (r.status === "rascunho" || r.encounter_id === eid) return false;
      var x = A && A.porId ? A.porId(r.encounter_id) : null;
      return !atual || !x || String(x.occurred_at) < String(atual.occurred_at);
    }) : [];
    return antes.length ? "retorno" : "primeira_consulta";
  }
  /* Mapeamento Holistico V2 do atendimento em texto: as respostas da paciente, por etapa, com as palavras dela
     (o mesmo criterio da resposta completa da ficha; nada interpretado). Formato antigo: o texto da anamnese. */
  function mapeamentoTexto(eid, legado) {
    var An = window.Anamnese, M = window.MapeamentoHolistico;
    var v = An && eid ? (An.vigente(eid) || (An.rascunhoDe ? An.rascunhoDe(eid) : null)) : null;
    var c = v && v.content;
    if (!c || !c.formulario || !M) return legado || "";
    var tipo = c.tipo === "retorno" ? "retorno" : "primeira", form = c.formulario, out = [];
    var tem = function (x) { return x !== null && x !== undefined && String(x).trim() !== ""; };
    M.etapasDe(tipo).forEach(function (et) {
      var l = [];
      M.camposDa(tipo, et).forEach(function (cp) {
        if (cp.secao || !M.visivel(form, cp.b, cp.f)) return;
        var t = M.valorTexto(cp.f, form[cp.b] || {}, cp.b);
        if (tem(t)) l.push("- " + M.rotuloDe(cp.b, cp.f) + ": " + String(t).trim());
      });
      if (l.length) out.push("### " + et.titulo + "\n" + l.join("\n"));
    });
    var fin = M.FINAL && M.FINAL[tipo], fd = fin ? M.campoDef(tipo, fin.bloco, fin.campo) : null;
    if (fd) { var tf = M.valorTexto(fd, form[fin.bloco] || {}, fin.bloco); if (tem(tf)) out.push("### Algo mais que a paciente quis contar\n- " + String(tf).trim()); }
    /* respostas de versoes anteriores do formulario (fora das etapas atuais): nada se perde */
    var V2 = window.AnamneseV2, vistos = {};
    M.etapasDe(tipo).forEach(function (et) { M.camposDa(tipo, et).forEach(function (cp) { if (!cp.secao) vistos[cp.b + "." + cp.f.id] = true; }); });
    if (fin) vistos[fin.bloco + "." + fin.campo] = true;
    var outros = [];
    ((V2 && (tipo === "retorno" ? V2.BLOCOS_RETORNO : V2.BLOCOS_PRIMEIRA)) || []).forEach(function (b) {
      (b.campos || []).forEach(function (f) {
        if (vistos[b.id + "." + f.id]) return;
        var t = M.valorTexto(f, form[b.id] || {}, b.id);
        if (tem(t)) outros.push("- " + M.rotuloDe(b.id, f) + ": " + String(t).trim());
      });
    });
    if (outros.length) out.push("### Outras respostas\n" + outros.join("\n"));
    return (v.status ? "Revisão " + (v.revision_number || 1) + " · " + v.status + "\n\n" : "") + out.join("\n\n");
  }
  function montarPacote(pid, eid) {
    var p = window.pacientesTodos ? window.pacientesTodos().filter(function (x) { return x.id === pid; })[0] : null;
    var A = window.AtendimentoAtual, at = A && A.porId ? A.porId(eid) : null;
    var sec = window.HolosAI && window.HolosAI.secoesPacote ? window.HolosAI.secoesPacote(eid) : {};
    var t = function (x) { x = String(x || "").trim(); return x || "Sem dado"; };
    return {
      pacote: "HOLOS_AI_PACOTE", pacote_version: 1, gerado_em: new Date().toISOString(), origem: "HoloHacking",
      instrucao: "Analise este atendimento com o método HOLOS AI (HOLOS-AI-GPT 1.2) e devolva o texto HOLOS_AI_RESULT e o JSON HOLOS_AI_RESULT schema_version 1.",
      atendimento: { referencia: String(eid || "").slice(0, 8), data: at ? rotuloAt(at) : "Sem dado", tipo: tipoAtendimento(pid, eid) },
      paciente_contexto_minimo: { identificador: p ? iniciais(p.nome) : "Sem dado", idade: p ? idade(p.nascimento) : null, sexo: p && p.sexo ? p.sexo : null },
      mapeamento: t(mapeamentoTexto(eid, sec.anamnese)),
      holoscan: t(sec.holoscan),
      evolucao_holoscan: t(sec.evolucao),
      ferramentas_aplicadas: t(sec.ferramentas),
      conduta: t(sec.conduta),
      resultado_holos: t(sec.resultado),
      direcao_atual: direcaoVigente(pid, eid) || "Sem dado",
      historico_atendimentos: t(sec.atendimentos),
      fora_do_pacote: ["nome, telefone, e-mail, CPF e endereço da paciente", "exames e documentos (não participam do HOLOSCAN nem desta análise)",
        "conteúdo da Carta ao Futuro Eu e nomes de terceiros", "hipóteses e observações só profissionais de Resultados anteriores"]
    };
  }
  function copiar(texto, btn, rotulo) {
    var ok = function () { if (btn) { btn.textContent = "Copiado!"; setTimeout(function () { btn.textContent = rotulo; }, 2000); } toast("Pacote HOLOS AI copiado. Cole no agente HOLOS AI."); };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(texto).then(ok, function () { toast("Não foi possível copiar: selecione o texto do pacote e copie."); });
    var ta = document.createElement("textarea"); ta.value = texto; ta.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (x) { /* sem copia */ } document.body.removeChild(ta); ok();
    return Promise.resolve();
  }

  /* ---------- desenho ---------- */
  function chip(txt, cls) { return '<span class="hai-chip hai-chip-' + cls + '">' + e(txt) + "</span>"; }
  function passo(n, titulo, sub, corpo, estado) {
    return '<li class="hai-passo hai-passo-' + estado + '" data-hai-passo="' + n + '"><div class="hai-passo-num" aria-hidden="true">' + n + '</div>' +
      '<div class="hai-passo-corpo"><h4>' + e(titulo) + '</h4><p class="hai-passo-sub">' + e(sub) + "</p>" + corpo + "</div></li>";
  }
  function htmlCampos(secao, v) {
    if (typeof v === "string") return "";
    if (!v || typeof v !== "object") return "";
    var principal = { direcionamentos: "titulo", estrategias: "titulo", corpo: "resumo", mente: "resumo", espirito: "resumo" }[secao] || "texto";
    var rot = { por_que: "Por que", objetivo: "Objetivo desta etapa", o_que_fazer: "O que fazer", o_que_observar: "O que observar", prazo: "Prazo",
      criterio_sucesso: "Critério de sucesso", baseado_em: "Baseado em", classificacao: "Classificação", decisao_sugerida: "Decisão sugerida",
      motivo_decisao: "Motivo", territorio: "Território", sistema: "Sistema", origem: "Origem", nota: "Nota", posicao: "Posição", o_que_apareceu: "O que apareceu",
      como_cuidar: "Como cuidar", como_aplicar: "Como aplicar", o_que_procurar: "O que procurar", regra_id: "Regra", fonte: "Fonte", fontes: "Fontes",
      situacao: "Situação", estrategias: "Estratégias", tipo: "Tipo", papel: "Papel", ferramenta: "Ferramenta", direcionamento_id: "Direcionamento", catalogo: "Catálogo",
      estrategia_id: "Estratégia", o_que_esclareceu: "O que esclareceu" };
    var fora = [principal, "id", "status", "ordem", "so_profissional"];
    var linhas = Object.keys(v).filter(function (k) { return fora.indexOf(k) < 0 && v[k] !== null && v[k] !== "" && !(Array.isArray(v[k]) && !v[k].length); }).map(function (k) {
      var val = Array.isArray(v[k]) ? v[k].join("; ") : k === "classificacao" ? (C().CLASSIFICACOES[v[k]] || v[k]) : typeof v[k] === "object" ? JSON.stringify(v[k]) : String(v[k]);
      return "<dt>" + e(rot[k] || k) + "</dt><dd>" + e(val) + "</dd>";
    }).join("");
    return linhas ? '<dl class="hai-campos">' + linhas + "</dl>" : "";
  }
  function htmlItem(imp, it, aberta) {
    var v = C().valorFinal(it), txt = C().textoDe(it.secao, v), editavel = aberta && tela.editando === it.id;
    var est = it.estado, cls = { sugerido: "sug", confirmado: "ok", editado: "ed", descartado: "desc" }[est];
    var h = '<li class="hai-item hai-item-' + cls + '" data-hai-item="' + e(it.id) + '">' +
      '<div class="hai-item-topo">' + chip(ESTADO[est], cls) + (it.so_profissional ? chip("SÓ PROFISSIONAL", "prof") : "") +
      (it.compartilhar ? chip("COMPARTILHAR COM A PACIENTE", "pac") : "") + (it.chave ? '<span class="hai-chave">' + e(it.chave) + "</span>" : "") + "</div>";
    if (editavel) {
      var campos = C().camposEditaveis(it.secao, it.valor_ia);
      h += '<div class="hai-editor">' + campos.map(function (c) {
        var atual = c === null ? (typeof v === "string" ? v : "") : (v && v[c]) || "";
        return '<label class="hai-ed-campo"><span>' + e(c === null ? "Texto" : ({ titulo: "Título", texto: "Texto", resumo: "Resumo", por_que: "Por que", objetivo: "Objetivo", o_que_fazer: "O que fazer",
          o_que_observar: "O que observar", prazo: "Prazo", criterio_sucesso: "Critério de sucesso" }[c] || c)) + '</span><textarea rows="' + (String(atual).length > 120 ? 4 : 2) + '" data-hai-campo="' + e(c === null ? "" : c) + '">' + e(atual) + "</textarea></label>";
      }).join("") + '<div class="hai-acoes"><button type="button" class="btn-verde" data-hai-acao="salvar-edicao">Salvar edição</button>' +
        '<button type="button" class="btn-fantasma" data-hai-acao="cancelar-edicao">Cancelar</button></div></div>';
    } else {
      h += '<p class="hai-item-texto">' + e(txt) + "</p>" + htmlCampos(it.secao, v);
      if (est === "editado") h += '<details class="hai-original"><summary>Ver o original da HOLOS AI</summary><p>' + e(C().textoDe(it.secao, it.valor_ia)) + "</p>" + htmlCampos(it.secao, it.valor_ia) + "</details>";
    }
    if (aberta && !editavel) {
      h += '<div class="hai-acoes">' +
        (est !== "confirmado" ? '<button type="button" class="btn-fantasma" data-hai-acao="confirmar">Confirmar</button>' : "") +
        (C().camposEditaveis(it.secao, it.valor_ia).length ? '<button type="button" class="btn-fantasma" data-hai-acao="editar">Editar</button>' : "") +
        (est !== "descartado" ? '<button type="button" class="btn-fantasma hai-btn-desc" data-hai-acao="descartar">Descartar</button>' : "") +
        (est !== "sugerido" ? '<button type="button" class="btn-link" data-hai-acao="desfazer">Voltar a sugestão</button>' : "") +
        (!it.so_profissional && (est === "confirmado" || est === "editado")
          ? '<label class="hai-compartilhar"><input type="checkbox" data-hai-acao="compartilhar"' + (it.compartilhar ? " checked" : "") + "> Compartilhar com a paciente</label>"
          : it.so_profissional ? '<span class="hai-so-prof">Só profissional: nunca vai para a paciente</span>' : "") +
        "</div>";
    }
    return h + "</li>";
  }
  function htmlRevisao(imp) {
    var itens = itensDe(imp.id), aberta = imp.status === "importado" || imp.status === "em_revisao";
    var cont = C().contagem(itens);
    var html = '<section class="hai-revisao" id="hai-revisao" data-hai-import="' + e(imp.id) + '">' +
      '<div class="hai-rev-topo"><h4>Revisar análise · importação v' + e(imp.versao) + " " + chip(STATUS[imp.status], imp.status) + "</h4>" +
      '<p class="hai-rev-resumo">' + cont.total + " itens · " + (cont.sugerido || 0) + " sugestões a revisar · " + ((cont.confirmado || 0) + (cont.editado || 0)) + " aceitos (" + (cont.editado || 0) +
      " editados) · " + (cont.descartado || 0) + " descartados · " + cont.compartilhar + " para a paciente</p>" +
      '<p class="hai-aviso">Tudo começa como SUGESTÃO HOLOS AI. Só o que você confirmar entra no Resultado HOLOS, e só o que você marcar para compartilhar chega à paciente. Hipóteses, alertas, fontes e o raciocínio da IA ficam só com você.</p></div>';
    C().SECOES.forEach(function (sec) {
      var doSec = itens.filter(function (x) { return x.secao === sec; });
      if (!doSec.length) return;
      var prof = C().soProfissional(sec);
      html += '<fieldset class="hai-secao" data-hai-secao="' + sec + '"><legend>' + e(C().TITULO[sec] || sec) + (prof ? " " + chip("SÓ PROFISSIONAL", "prof") : "") + "</legend>" +
        (aberta ? '<div class="hai-secao-lote"><button type="button" class="btn-link" data-hai-acao="confirmar-secao">Confirmar todos desta seção</button>' +
          '<button type="button" class="btn-link" data-hai-acao="descartar-secao">Descartar todos desta seção</button></div>' : "") +
        '<ul class="hai-itens">' + doSec.map(function (it) { return htmlItem(imp, it, aberta); }).join("") + "</ul></fieldset>";
    });
    if (aberta) {
      html += '<div class="hai-rev-fim"><button type="button" class="btn-verde" data-hai-acao="concluir"' + (cont.sugerido ? ' disabled title="Revise todos os itens antes de concluir"' : "") + ">Concluir revisão</button>" +
        '<button type="button" class="btn-fantasma hai-btn-desc" data-hai-acao="descartar-import">Descartar esta importação</button>' +
        (cont.sugerido ? '<span class="hai-pend">' + cont.sugerido + " itens ainda como sugestão</span>" : "") + "</div>";
    }
    return html + "</section>";
  }
  function desenhar(alvo) {
    alvo = alvo || document.getElementById("hai-ponte");
    if (!alvo || !C()) return;
    var pid = pacienteId();
    if (!pid || pid === "_sem_paciente") { alvo.innerHTML = ""; return; }
    if (cache.pid !== pid || !cache.carregado) {
      if (cache.pid !== pid) tela = { eid: null, texto: {}, erros: [], avisos: [], aberto: null, editando: null, ocupado: false, pacoteTxt: "" };
      alvo.innerHTML = '<section class="hai-ponte"><p class="dash-vazio">Carregando a HOLOS AI…</p></section>';
      var R = window.ResultadoHolos;
      Promise.all([carregar(pid), R && R.carregar ? Promise.resolve(R.carregar(pid)).catch(function () {}) : null]).then(function () { if (pacienteId() === pid) desenhar(); });
      return;
    }
    var eid = atendimentoEscolhido(pid), lista = atendimentos(pid);
    var imps = eid ? importsDoAtendimento(eid) : [], atual = imps[0] || null;
    if (tela.aberto && !importPorId(tela.aberto)) tela.aberto = null;
    var revisando = tela.aberto ? importPorId(tela.aberto) : (atual && (atual.status === "importado" || atual.status === "em_revisao" || atual.status === "confirmado") ? atual : null);
    var confirmada = imps.filter(function (i) { return i.status === "confirmado"; })[0] || null;
    var urls = window.HolosAI && window.HolosAI.urls ? window.HolosAI.urls() : {};
    var bloq = arquivado();

    var html = '<section class="hai-ponte" aria-labelledby="hai-titulo">' +
      '<div class="hai-cab"><div><h3 id="hai-titulo">HOLOS AI do atendimento</h3>' +
      '<p class="hai-sub">A HOLOS AI sugere. Você revisa e decide. O que você confirmar vira o Resultado HOLOS — a HOLOS AI não o substitui.</p></div>' +
      (lista.length ? '<label class="hai-at"><span>Atendimento</span><select id="hai-atendimento">' + lista.map(function (x) {
        return '<option value="' + e(x.id) + '"' + (x.id === eid ? " selected" : "") + ">" + e(rotuloAt(x)) + "</option>";
      }).join("") + "</select></label>" : "") + "</div>";
    if (!lista.length) {
      html += '<p class="hai-aviso">Inicie um atendimento para usar a HOLOS AI (a análise fica ligada a um atendimento).</p></section>';
      alvo.innerHTML = html; return;
    }
    if (cache.erro) html += '<p class="hai-erro" role="alert">Não foi possível carregar as importações da HOLOS AI. Recarregue a aba.</p>';
    if (bloq) html += '<p class="hai-aviso">' + e(MSG.paciente_arquivado) + "</p>";
    var texto = tela.texto[eid] || "";
    html += '<ol class="hai-passos">' +
      passo(1, "Copiar Pacote HOLOS AI", "Só dados já registrados: Mapeamento, HOLOSCAN, ferramentas, leitura profissional, Conduta, direção atual e histórico. Sem nome, contatos ou exames.",
        '<div class="hai-acoes"><button type="button" class="btn-verde" data-hai-acao="copiar-pacote">Copiar Pacote HOLOS AI</button>' +
        '<button type="button" class="btn-link" data-hai-acao="ver-pacote">' + (tela.pacoteTxt ? "Esconder o pacote" : "Ver o pacote") + "</button></div>" +
        (tela.pacoteTxt ? '<pre class="hai-pacote" id="hai-pacote" tabindex="0">' + e(tela.pacoteTxt) + "</pre>" : ""), "pronto") +
      passo(2, "Abrir HOLOS AI", "Abra o agente HOLOS AI, cole o Pacote e peça a análise. Ele devolve um texto e um bloco JSON.",
        '<div class="hai-acoes">' + (urls.chatgpt ? '<a class="btn-fantasma" id="hai-abrir" href="' + e(urls.chatgpt) + '" target="_blank" rel="noopener noreferrer">Abrir HOLOS AI</a>'
          : '<span class="btn-fantasma hai-indisp" aria-disabled="true" title="O endereço do agente ainda não foi configurado">Abrir HOLOS AI <small>(endereço não configurado — abra o seu GPT HOLOS AI)</small></span>') + "</div>", "pronto") +
      passo(3, "Importar Resultado HOLOS AI", "Cole o JSON HOLOS_AI_RESULT (pode colar a resposta inteira: o primeiro bloco ```json``` é usado). Nada é salvo se o JSON estiver inválido.",
        '<label class="hai-colar"><span>Cole aqui o JSON HOLOS_AI_RESULT</span><textarea id="hai-json" rows="9" spellcheck="false" placeholder="{ &quot;schema_version&quot;: 1, &quot;tipo&quot;: &quot;primeira_consulta&quot;, … }">' + e(texto) + "</textarea></label>" +
        (tela.erros.length ? '<div class="hai-erro" role="alert"><b>Não importado.</b><ul>' + tela.erros.slice(0, 15).map(function (x) { return "<li>" + e(x) + "</li>"; }).join("") +
          (tela.erros.length > 15 ? "<li>… e mais " + (tela.erros.length - 15) + "</li>" : "") + "</ul><p>O texto colado continua acima para você corrigir.</p></div>" : "") +
        (tela.avisos.length ? '<div class="hai-aviso"><b>Avisos (não impedem):</b><ul>' + tela.avisos.map(function (x) { return "<li>" + e(x) + "</li>"; }).join("") + "</ul></div>" : "") +
        '<div class="hai-acoes"><button type="button" class="btn-verde" data-hai-acao="importar"' + (bloq ? " disabled" : "") + ">Validar e importar</button>" +
        (atual && atual.status !== "descartado" ? '<span class="hai-nota">Já existe a importação v' + atual.versao + " (" + STATUS[atual.status] + "). Uma nova vira v" + (atual.versao + 1) + "; a anterior fica no histórico.</span>" : "") + "</div>",
        atual ? "feito" : "pronto") +
      passo(4, "Revisar análise", "Confirme, edite ou descarte cada sugestão; marque o que pode ir para a paciente. Depois, conclua a revisão.",
        revisando ? '<p class="hai-nota">Importação v' + revisando.versao + " " + chip(STATUS[revisando.status], revisando.status) + "</p>" : '<p class="hai-nota">Importe um resultado para revisar.</p>',
        revisando ? (revisando.status === "confirmado" ? "feito" : "pronto") : "bloqueado") +
      passo(5, "Gerar Resultado HOLOS", "O que você confirmou entra no Resultado HOLOS deste atendimento (rascunho). Lá você confirma o Foco atual, finaliza e emite o PDF oficial.",
        '<div class="hai-acoes"><button type="button" class="btn-verde" data-hai-acao="gerar"' + (confirmada && !bloq ? ' data-hai-import="' + e(confirmada.id) + '"' : " disabled") + ">Gerar Resultado HOLOS</button>" +
        (confirmada ? '<span class="hai-nota">Usa a importação v' + confirmada.versao + " (confirmada em " + e(dataHora(confirmada.concluida_em)) + ").</span>" : '<span class="hai-nota">Disponível depois de concluir a revisão.</span>') + "</div>",
        confirmada ? "pronto" : "bloqueado") +
      "</ol>";
    if (revisando) html += htmlRevisao(revisando);
    if (imps.length) {
      html += '<section class="hai-hist"><h4>Importações deste atendimento</h4><table class="hai-tabela"><thead><tr><th>Versão</th><th>Importada em</th><th>Status</th><th>Itens</th><th></th></tr></thead><tbody>' +
        imps.map(function (i) {
          var c = C().contagem(itensDe(i.id));
          return "<tr><td>v" + i.versao + "</td><td>" + e(dataHora(i.imported_at)) + "</td><td>" + chip(STATUS[i.status], i.status) + "</td><td>" + c.total + " (" + ((c.confirmado || 0) + (c.editado || 0)) + " aceitos)</td>" +
            '<td><button type="button" class="btn-link" data-hai-acao="abrir" data-hai-import="' + e(i.id) + '">' + (revisando && revisando.id === i.id ? "Aberta" : "Abrir") + "</button></td></tr>";
        }).join("") + "</tbody></table><p class=\"hai-nota\">O JSON original de cada importação fica guardado sem alteração (sha256 " + e(String(imps[0].texto_sha256 || "").slice(0, 12)) + "… na mais recente).</p></section>";
    }
    alvo.innerHTML = html + "</section>";
  }

  /* ---------- acoes ---------- */
  function lerTexto() { var t = document.getElementById("hai-json"); if (t && tela.eid) tela.texto[tela.eid] = t.value; return t ? t.value : ""; }
  function travar(p, btn) {
    tela.ocupado = true; if (btn && window.travarBotao) window.travarBotao(btn, "Aguarde…");
    return Promise.resolve(p).then(function (x) { tela.ocupado = false; return x; }, function (err) { tela.ocupado = false; throw err; });
  }
  function recarregar() { var pid = pacienteId(); return carregar(pid).then(function () { desenhar(); }); }
  function revisarItem(id, estado, valor, compartilhar) {
    return rpc("revisar_item_holos_ai", { p_item_id: id, p_estado: estado, p_valor: valor === undefined ? null : valor, p_compartilhar: !!compartilhar });
  }
  function importar(btn) {
    var pid = pacienteId(), eid = tela.eid, texto = lerTexto();
    tela.erros = []; tela.avisos = [];
    var x = C().extrairJson(texto);
    if (!x.json) { tela.erros = [x.erro]; return desenhar(); }
    var v = C().validar(x.json);
    if (v.erros.length) { tela.erros = (v.incompativel ? [MSG.schema_incompativel] : [MSG.resultado_invalido]).concat(v.erros); return desenhar(); }
    tela.avisos = v.avisos;
    return travar(rpc("importar_holos_ai", { p_encounter_id: eid, p_texto: texto, p_operation_id: uuid() }), btn).then(function (r) {
      tela.texto[eid] = ""; tela.aberto = r && r.id ? r.id : null; tela.editando = null;
      toast("Resultado HOLOS AI importado (v" + (r && r.versao) + "). Revise cada item.");
      return carregar(pid).then(function () { desenhar(); var rv = document.getElementById("hai-revisao"); if (rv && rv.scrollIntoView) rv.scrollIntoView({ block: "start" }); });
    }, function (err) { tela.erros = [msgErro(err)]; desenhar(); });
  }
  function acao(nome, el) {
    if (tela.ocupado) return;
    var li = el.closest("[data-hai-item]"), itemId = li ? li.getAttribute("data-hai-item") : null;
    var it = itemId ? cache.itens.filter(function (x) { return x.id === itemId; })[0] : null;
    var falhou = function (err) { toast(msgErro(err)); return recarregar(); };
    if (nome === "copiar-pacote" || nome === "ver-pacote") {
      var txt = JSON.stringify(montarPacote(pacienteId(), tela.eid), null, 2);
      if (nome === "ver-pacote") { tela.pacoteTxt = tela.pacoteTxt ? "" : txt; lerTexto(); return desenhar(); }
      tela.pacoteTxt = txt; lerTexto();
      return copiar(txt, el, "Copiar Pacote HOLOS AI");
    }
    if (nome === "importar") return importar(el);
    if (nome === "abrir") { tela.aberto = el.getAttribute("data-hai-import"); tela.editando = null; lerTexto(); return desenhar(); }
    if (nome === "editar") { tela.editando = itemId; lerTexto(); return desenhar(); }
    if (nome === "cancelar-edicao") { tela.editando = null; return desenhar(); }
    if (nome === "salvar-edicao" && it) {
      var areas = [].slice.call(li.querySelectorAll("[data-hai-campo]")), valor;
      if (typeof it.valor_ia === "string") valor = areas[0] ? areas[0].value : "";
      else { valor = {}; areas.forEach(function (a) { var c = a.getAttribute("data-hai-campo"), orig = (C().valorFinal(it) || {})[c]; if (a.value !== (orig || "")) valor[c] = a.value; }); }
      if (valor && typeof valor === "object" && !Object.keys(valor).length) { tela.editando = null; return desenhar(); }
      return travar(revisarItem(it.id, "editado", valor, it.compartilhar), el).then(function () { tela.editando = null; return recarregar(); }, falhou);
    }
    if ((nome === "confirmar" || nome === "descartar" || nome === "desfazer") && it) {
      var est = { confirmar: "confirmado", descartar: "descartado", desfazer: "sugerido" }[nome];
      return travar(revisarItem(it.id, est, null, false), el).then(recarregar, falhou);
    }
    if (nome === "compartilhar" && it) {
      return travar(revisarItem(it.id, it.estado, it.estado === "editado" ? diffEditado(it) : null, el.checked), null).then(recarregar, falhou);
    }
    if (nome === "confirmar-secao" || nome === "descartar-secao") {
      var sec = el.closest("[data-hai-secao]").getAttribute("data-hai-secao"), iid = el.closest("[data-hai-import]").getAttribute("data-hai-import");
      var alvos = itensDe(iid).filter(function (x) { return x.secao === sec && x.estado === "sugerido"; });
      var estS = nome === "confirmar-secao" ? "confirmado" : "descartado";
      return travar(alvos.reduce(function (p, x) { return p.then(function () { return revisarItem(x.id, estS, null, false); }); }, Promise.resolve()), el).then(recarregar, falhou);
    }
    if (nome === "concluir" || nome === "descartar-import") {
      var imp = importPorId(el.closest("[data-hai-import]").getAttribute("data-hai-import"));
      var rp = nome === "concluir" ? "concluir_revisao_holos_ai" : "descartar_importacao_holos_ai";
      var pergunta = nome === "concluir" ? "Concluir a revisão? Depois disso os itens não mudam mais. O que foi confirmado pode entrar no Resultado HOLOS."
        : "Descartar esta importação? Ela fica no histórico, mas nada dela entra no Resultado HOLOS.";
      return confirmar(nome === "concluir" ? "Concluir revisão" : "Descartar importação", pergunta).then(function (ok) {
        if (!ok) return;
        return travar(rpc(rp, { p_import_id: imp.id }), el).then(function () { toast(nome === "concluir" ? "Revisão concluída. Agora gere o Resultado HOLOS." : "Importação descartada."); return recarregar(); }, falhou);
      });
    }
    if (nome === "gerar") {
      var impG = importPorId(el.getAttribute("data-hai-import"));
      var R = window.ResultadoHolos;
      if (!impG || !R || !R.receberHolosAI) return;
      return travar(R.receberHolosAI(impG, itensDe(impG.id)), el).then(function (r) { return r; }, falhou);
    }
  }
  /* compartilhar um item editado reenvia so os campos editados (o servidor junta com o original da IA) */
  function diffEditado(it) {
    if (typeof it.valor_ia === "string") return it.valor_profissional;
    var o = {}; (C().camposEditaveis(it.secao, it.valor_ia) || []).forEach(function (c) { if (c && it.valor_profissional && it.valor_profissional[c] !== it.valor_ia[c]) o[c] = it.valor_profissional[c]; });
    return Object.keys(o).length ? o : (function () { var c = C().camposEditaveis(it.secao, it.valor_ia)[0]; var x = {}; x[c] = it.valor_profissional[c]; return x; })();
  }
  function confirmar(titulo, texto) {
    if (window.abrirModalConfirmar) return Promise.resolve(window.abrirModalConfirmar({ titulo: titulo, corpo: "<p>" + e(texto) + "</p>", botaoConfirmar: titulo })).then(function (r) { return r === "confirmar"; });
    return Promise.resolve(window.confirm(texto));
  }

  document.addEventListener("click", function (ev) {
    var raiz = document.getElementById("hai-ponte"); if (!raiz || !raiz.contains(ev.target)) return;
    var b = ev.target.closest("[data-hai-acao]");
    if (!b || b.tagName === "INPUT") return;
    ev.preventDefault();
    acao(b.getAttribute("data-hai-acao"), b);
  });
  document.addEventListener("change", function (ev) {
    var raiz = document.getElementById("hai-ponte"); if (!raiz || !raiz.contains(ev.target)) return;
    if (ev.target.id === "hai-atendimento") { lerTexto(); tela.eid = ev.target.value; tela.aberto = null; tela.editando = null; tela.erros = []; tela.avisos = []; return desenhar(); }
    if (ev.target.matches('input[data-hai-acao="compartilhar"]')) acao("compartilhar", ev.target);
  });
  document.addEventListener("input", function (ev) { if (ev.target && ev.target.id === "hai-json") lerTexto(); });
  document.addEventListener("DOMContentLoaded", function () {
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) window.HoloAuth.aoMudarEstado(function () { cache = { pid: null, imports: [], itens: [], carregado: false, erro: null }; });
  });

  window.HolosAIPonte = {
    desenhar: desenhar, carregar: carregar, montarPacote: montarPacote, importsDoAtendimento: importsDoAtendimento, itensDe: itensDe,
    esquecer: function () { cache = { pid: null, imports: [], itens: [], carregado: false, erro: null }; },
    estado: function () { return { cache: cache, tela: tela }; }
  };
})();
