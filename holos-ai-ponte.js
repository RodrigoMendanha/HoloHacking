/* ===========================================================================
   HOLOS AI — PONTE PARA O RESULTADO HOLOS (aba HOLOS AI do atendimento)
   ===========================================================================

   SIMPLIFICACAO DEFINITIVA (14/10): "Fiz a consulta, mandei os dados para a HOLOS AI, trouxe a resposta e o
   Resultado ficou pronto."
   1. Copiar Pacote HOLOS AI     so dados reais ja registrados, sem nome/contatos, sem exames
   2. Abrir HOLOS AI             o agente externo
   3. Colar + Importar e gerar   valida o schema (invalido: nada e salvo), guarda o original imutavel e versionado,
                                 aceita pela REGRA FIXA do metodo (aceitar_importacao_holos_ai: so profissional fica
                                 interno; o elegivel vai para a paciente) e monta o Resultado HOLOS FINALIZADO
                                 (ResultadoHolos.gerarAutomatico). Nenhuma confirmacao item a item.
   Depois: Ver resultado · Gerar PDF (emite o Resultado Final e baixa o PDF) · Editar resultado (nova versao, opcional).
   A revisao item a item saiu do fluxo: o registro da IA fica so em "Detalhes tecnicos da analise" (fechado, so leitura).

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
  var tela = { eid: null, texto: {}, erros: [], avisos: [], ocupado: false, pacoteTxt: "", falha: "" };

  function carregar(pid) {
    if (!pid || !temSupa()) { cache = { pid: pid, imports: [], itens: [], carregado: true, erro: null }; return Promise.resolve(); }
    var sb = window.supabaseClient;
    return new Promise(function (ok) { ok(); }).then(function () { return Promise.all([
      Promise.resolve(sb.from("holos_ai_imports").select("id, patient_id, encounter_id, versao, schema_version, tipo, origem, agente, kb_version, entrada, texto_sha256, status, aceite, imported_at, revisao_iniciada_em, concluida_em, descartada_em, updated_at")
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
      acordos: txt(d.acordos_compartilhados), observar: txt(d.observar), proxima_etapa: ok(d.proxima_etapa) ? d.proxima_etapa.texto : null };
  }
  /* RETORNO: o Resultado HOLOS salvo do atendimento ANTERIOR (foco, estrategias, o que observar, proxima etapa) para a
     HOLOS AI comparar antes x agora (MANTER / AJUSTAR / SUBSTITUIR / CONCLUIR / ENCERRAR). So o que foi para a paciente. */
  function resultadoAnterior(pid, eid) {
    var R = window.ResultadoHolos, A = window.AtendimentoAtual; if (!R || !R.doPaciente) return null;
    var atual = A && A.porId ? A.porId(eid) : null;
    var r = R.doPaciente(pid).filter(function (x) {
      if (x.status === "rascunho" || x.superseded_at || x.encounter_id === eid || !x.content_snapshot) return false;
      var y = A && A.porId ? A.porId(x.encounter_id) : null;
      return !atual || !y || String(y.occurred_at) < String(atual.occurred_at);
    }).sort(function (a, b) { return String(b.saved_at || "").localeCompare(String(a.saved_at || "")); })[0];
    var dp = r && r.content_snapshot.direcao_paciente; if (!dp) return null;
    var tx = function (l) { return (l || []).map(function (it) { return it && it.texto; }).filter(Boolean); };
    return { salvo_em: String(r.saved_at || "").slice(0, 10), foco_atual: dp.foco_atual ? dp.foco_atual.texto : null,
      direcionamentos: tx(dp.direcionamentos), estrategias: (dp.estrategias || []).map(function (x) { return { id: x.id, texto: x.texto, acao: x.acao || null, status: x.status || null }; }),
      o_que_observar: tx(dp.observar), acordos: tx(dp.acordos_compartilhados), proxima_etapa: dp.proxima_etapa ? dp.proxima_etapa.texto : null };
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
      resultado_anterior: resultadoAnterior(pid, eid) || "Sem dado",
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
  /* o Resultado HOLOS gerado a partir desta importacao (o vigente: uma edicao vira versao nova, com as mesmas referencias) */
  function resultadoDaImportacao(pid, imp) {
    var R = window.ResultadoHolos; if (!R || !R.doPaciente || !imp) return null;
    return R.doPaciente(pid).filter(function (r) {
      return r.status !== "rascunho" && !r.superseded_at && r.encounter_id === imp.encounter_id && r.direcao && JSON.stringify(r.direcao).indexOf(imp.id) >= 0;
    }).sort(function (a, b) { return String(b.saved_at || "").localeCompare(String(a.saved_at || "")); })[0] || null;
  }
  /* DETALHES TECNICOS (fechado por padrao, so leitura): o que a IA devolveu, item a item, com a regra aplicada */
  function htmlDetalhes(imps, atual) {
    var html = '<details class="hai-detalhes" id="hai-detalhes"><summary>Detalhes técnicos da análise</summary>' +
      '<p class="hai-nota">Registro interno (só profissional). O JSON original de cada importação fica guardado sem alteração; a regra fixa do método marca o que pode ir para a paciente. Hipóteses, conflitos, alertas, fontes, raciocínio, sistemas, ferramentas, roteiro e IDs nunca vão para a paciente.</p>' +
      '<div class="hai-acoes"><button type="button" class="btn-link" data-hai-acao="ver-pacote">' + (tela.pacoteTxt ? "Esconder o Pacote" : "Ver o Pacote enviado") + "</button></div>" +
      (tela.pacoteTxt ? '<pre class="hai-pacote" id="hai-pacote" tabindex="0">' + e(tela.pacoteTxt) + "</pre>" : "");
    if (atual) {
      var itens = itensDe(atual.id), cont = C().contagem(itens);
      html += '<h5 class="hai-det-tit">Importação v' + e(atual.versao) + " " + chip(STATUS[atual.status], atual.status) +
        (atual.aceite === "automatico" ? " " + chip("ACEITE AUTOMÁTICO", "ok") : atual.aceite === "revisao" || (atual.status === "confirmado" && !atual.aceite) ? " " + chip("REVISÃO MANUAL", "ed") : "") + "</h5>" +
        '<p class="hai-rev-resumo">' + cont.total + " itens · " + cont.compartilhar + " elegíveis para a paciente · " + (cont.total - cont.compartilhar) + " internos</p>";
      C().SECOES.forEach(function (sec) {
        var doSec = itens.filter(function (x) { return x.secao === sec; });
        if (!doSec.length) return;
        html += '<div class="hai-det-secao" data-hai-secao="' + sec + '"><b>' + e(C().TITULO[sec] || sec) + "</b> " + (C().soProfissional(sec) ? chip("SÓ PROFISSIONAL", "prof") : "") +
          '<ul class="hai-det-itens">' + doSec.map(function (it) {
            return '<li data-hai-item="' + e(it.id) + '">' + (it.compartilhar ? chip("PACIENTE", "pac") : chip("INTERNO", "prof")) + " " + e(C().textoDe(it.secao, C().valorFinal(it))) + "</li>";
          }).join("") + "</ul></div>";
      });
    }
    if (imps.length) {
      html += '<table class="hai-tabela"><thead><tr><th>Versão</th><th>Importada em</th><th>Status</th><th>Itens</th></tr></thead><tbody>' +
        imps.map(function (i) { return "<tr><td>v" + i.versao + "</td><td>" + e(dataHora(i.imported_at)) + "</td><td>" + chip(STATUS[i.status], i.status) + "</td><td>" + itensDe(i.id).length + "</td></tr>"; }).join("") +
        '</tbody></table><p class="hai-nota">sha256 da mais recente: ' + e(String(imps[0].texto_sha256 || "").slice(0, 12)) + "…</p>";
    }
    return html + "</details>";
  }
  function htmlPronto(pid, imp, res) {
    var bloq = arquivado();
    if (res) {
      return '<section class="hai-pronto" id="hai-pronto" aria-labelledby="hai-pronto-t"><h4 id="hai-pronto-t">' + chip("RESULTADO PRONTO", "ok") + " Resultado HOLOS deste atendimento</h4>" +
        '<p class="hai-nota">Montado automaticamente a partir da análise v' + e(imp.versao) + " (" + e(dataHora(res.saved_at)) + "). Só o que a regra do método permite chega à paciente.</p>" +
        (tela.avisos.length ? '<div class="hai-aviso"><b>Avisos da análise (não impedem):</b><ul>' + tela.avisos.map(function (x) { return "<li>" + e(x) + "</li>"; }).join("") + "</ul></div>" : "") +
        '<div class="hai-acoes"><button type="button" class="btn-verde" data-hai-acao="ver-resultado" data-hai-res="' + e(res.id) + '">Ver resultado</button>' +
        '<button type="button" class="btn-verde" data-hai-acao="pdf"' + (bloq ? " disabled" : "") + ">Gerar PDF</button>" +
        '<button type="button" class="btn-fantasma" data-hai-acao="editar-resultado" data-hai-res="' + e(res.id) + '"' + (bloq ? " disabled" : "") + ">Editar resultado</button></div></section>";
    }
    /* importacao aceita sem Resultado (ex.: faltava o HOLOSCAN salvo) ou importacao antiga ainda em revisao: um clique resolve */
    var antiga = imp.status === "importado" || imp.status === "em_revisao";
    return '<section class="hai-pronto hai-pronto-pendente" id="hai-pronto"><h4>' + chip("RESULTADO AINDA NÃO GERADO", "sug") + " Análise v" + e(imp.versao) + "</h4>" +
      (tela.falha ? '<p class="hai-erro" role="alert">' + e(tela.falha) + "</p>" : "") +
      '<div class="hai-acoes"><button type="button" class="btn-verde" data-hai-acao="gerar" data-hai-import="' + e(imp.id) + '"' + (bloq ? " disabled" : "") + ">" +
      (antiga ? "Aceitar análise e gerar resultado" : "Gerar resultado") + "</button></div></section>";
  }
  function desenhar(alvo) {
    alvo = alvo || document.getElementById("hai-ponte");
    if (!alvo || !C()) return;
    var pid = pacienteId();
    if (!pid || pid === "_sem_paciente") { alvo.innerHTML = ""; return; }
    if (cache.pid !== pid || !cache.carregado) {
      if (cache.pid !== pid) tela = { eid: null, texto: {}, erros: [], avisos: [], ocupado: false, pacoteTxt: "", falha: "" };
      alvo.innerHTML = '<section class="hai-ponte"><p class="dash-vazio">Carregando a HOLOS AI…</p></section>';
      var R = window.ResultadoHolos;
      Promise.all([carregar(pid), R && R.carregar ? Promise.resolve(R.carregar(pid)).catch(function () {}) : null]).then(function () { if (pacienteId() === pid) desenhar(); });
      return;
    }
    var eid = atendimentoEscolhido(pid), lista = atendimentos(pid);
    var imps = eid ? importsDoAtendimento(eid) : [];
    var vigente = imps.filter(function (i) { return i.status !== "descartado"; })[0] || null;
    var res = vigente && vigente.status === "confirmado" ? resultadoDaImportacao(pid, vigente) : null;
    var urls = window.HolosAI && window.HolosAI.urls ? window.HolosAI.urls() : {};
    var bloq = arquivado();

    var html = '<section class="hai-ponte" aria-labelledby="hai-titulo">' +
      '<div class="hai-cab"><div><h3 id="hai-titulo">HOLOS AI do atendimento</h3>' +
      '<p class="hai-sub">Mande os dados da consulta para a HOLOS AI, traga a resposta e o Resultado HOLOS fica pronto.</p></div>' +
      (lista.length ? '<label class="hai-at"><span>Atendimento</span><select id="hai-atendimento">' + lista.map(function (x) {
        return '<option value="' + e(x.id) + '"' + (x.id === eid ? " selected" : "") + ">" + e(rotuloAt(x)) + "</option>";
      }).join("") + "</select></label>" : "") + "</div>";
    if (!lista.length) {
      html += '<p class="hai-aviso">Inicie um atendimento para usar a HOLOS AI (a análise fica ligada a um atendimento).</p></section>';
      alvo.innerHTML = html; return;
    }
    if (cache.erro) html += '<p class="hai-erro" role="alert">Não foi possível carregar as análises da HOLOS AI. Recarregue a aba.</p>';
    if (bloq) html += '<p class="hai-aviso">' + e(MSG.paciente_arquivado) + "</p>";
    var texto = tela.texto[eid] || "";
    html += '<ol class="hai-passos">' +
      passo(1, "Copiar Pacote HOLOS AI", "Mapeamento, HOLOSCAN, ferramentas, Conduta e o resultado anterior. Sem nome, contatos ou exames.",
        '<div class="hai-acoes"><button type="button" class="btn-verde" data-hai-acao="copiar-pacote">Copiar Pacote HOLOS AI</button></div>', "pronto") +
      passo(2, "Abrir HOLOS AI", "Cole o Pacote no agente HOLOS AI e copie a resposta inteira.",
        '<div class="hai-acoes">' + (urls.chatgpt ? '<a class="btn-fantasma" id="hai-abrir" href="' + e(urls.chatgpt) + '" target="_blank" rel="noopener noreferrer">Abrir HOLOS AI</a>'
          : '<span class="btn-fantasma hai-indisp" aria-disabled="true" title="O endereço do agente ainda não foi configurado">Abrir HOLOS AI <small>(endereço não configurado — abra o seu GPT HOLOS AI)</small></span>') + "</div>", "pronto") +
      passo(3, "Colar resultado HOLOS AI", "Cole a resposta inteira (o bloco ```json``` é usado). Se o JSON estiver inválido, nada é salvo.",
        '<label class="hai-colar"><span class="hai-sr">Colar resultado HOLOS AI</span><textarea id="hai-json" rows="7" spellcheck="false" aria-label="Colar resultado HOLOS AI" placeholder="Cole aqui a resposta da HOLOS AI">' + e(texto) + "</textarea></label>" +
        (tela.erros.length ? '<div class="hai-erro" role="alert"><b>Não importado.</b><ul>' + tela.erros.slice(0, 15).map(function (x) { return "<li>" + e(x) + "</li>"; }).join("") +
          (tela.erros.length > 15 ? "<li>… e mais " + (tela.erros.length - 15) + "</li>" : "") + "</ul><p>O texto colado continua acima para você corrigir.</p></div>" : "") +
        '<div class="hai-acoes"><button type="button" class="btn-verde" data-hai-acao="importar"' + (bloq ? " disabled" : "") + ">Importar e gerar resultado</button>" +
        (vigente ? '<span class="hai-nota">Uma nova análise vira a versão ' + (imps[0].versao + 1) + " e um Resultado novo; o anterior fica no histórico.</span>" : "") + "</div>",
        vigente ? "feito" : "pronto") +
      "</ol>";
    if (vigente) html += htmlPronto(pid, vigente, res);
    html += htmlDetalhes(imps, vigente || imps[0] || null);
    alvo.innerHTML = html + "</section>";
  }

  /* ---------- acoes ---------- */
  function lerTexto() { var t = document.getElementById("hai-json"); if (t && tela.eid) tela.texto[tela.eid] = t.value; return t ? t.value : ""; }
  function travar(p, btn) {
    tela.ocupado = true; if (btn && window.travarBotao) window.travarBotao(btn, "Aguarde…");
    return Promise.resolve(p).then(function (x) { tela.ocupado = false; return x; }, function (err) { tela.ocupado = false; throw err; });
  }
  /* aceitar (regra fixa) + montar o Resultado HOLOS finalizado. Sem nenhuma confirmacao item a item. */
  function aceitarEGerar(pid, importId) {
    var R = window.ResultadoHolos;
    tela.falha = "";
    return rpc("aceitar_importacao_holos_ai", { p_import_id: importId }).then(function () { return carregar(pid); }).then(function () {
      var imp = importPorId(importId);
      if (!R || !R.gerarAutomatico) return { salvo: false, mensagem: "O módulo do Resultado HOLOS não carregou." };
      return R.gerarAutomatico(imp, itensDe(importId));
    }).then(function (r) {
      if (!r || !r.salvo) tela.falha = (r && r.mensagem) || "Não foi possível montar o Resultado agora.";
      else toast("Resultado HOLOS pronto.");
      desenhar();
      if (r && r.salvo) { var p = document.getElementById("hai-pronto"); if (p && p.scrollIntoView) p.scrollIntoView({ block: "center" }); }
      return r;
    });
  }
  function importar(btn) {
    var pid = pacienteId(), eid = tela.eid, texto = lerTexto();
    tela.erros = []; tela.avisos = []; tela.falha = "";
    var x = C().extrairJson(texto);
    if (!x.json) { tela.erros = [x.erro]; return desenhar(); }
    var v = C().validar(x.json);
    if (v.erros.length) { tela.erros = (v.incompativel ? [MSG.schema_incompativel] : [MSG.resultado_invalido]).concat(v.erros); return desenhar(); }
    tela.avisos = v.avisos;
    return travar(rpc("importar_holos_ai", { p_encounter_id: eid, p_texto: texto, p_operation_id: uuid() }).then(function (r) {
      tela.texto[eid] = "";
      return carregar(pid).then(function () { return aceitarEGerar(pid, r.id); });
    }), btn).then(null, function (err) { tela.erros = [msgErro(err)]; desenhar(); });
  }
  function acao(nome, el) {
    if (tela.ocupado) return;
    var R = window.ResultadoHolos;
    if (nome === "copiar-pacote" || nome === "ver-pacote") {
      var txt = JSON.stringify(montarPacote(pacienteId(), tela.eid), null, 2);
      if (nome === "ver-pacote") { tela.pacoteTxt = tela.pacoteTxt ? "" : txt; lerTexto(); desenhar(); var d = document.getElementById("hai-detalhes"); if (d) d.open = true; return; }
      tela.pacoteTxt = txt; lerTexto();
      return copiar(txt, el, "Copiar Pacote HOLOS AI");
    }
    if (nome === "importar") return importar(el);
    if (nome === "gerar") return travar(aceitarEGerar(pacienteId(), el.getAttribute("data-hai-import")), el).then(null, function (err) { tela.falha = msgErro(err); desenhar(); });
    if (nome === "ver-resultado") { if (R && R.abrirResultado) R.abrirResultado(el.getAttribute("data-hai-res"), "paciente"); return; }
    if (nome === "editar-resultado") { if (R && R.abrirResultado) R.abrirResultado(el.getAttribute("data-hai-res"), null, true); return; }
    if (nome === "pdf") {
      var P = window.ResultadoPagina;
      if (!P || !P.emitirEPdf) return toast("A página do Resultado não carregou.");
      return travar(P.emitirEPdf(), el).then(null, function () { /* a pagina ja avisou */ });
    }
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
    if (ev.target.id === "hai-atendimento") { lerTexto(); tela.eid = ev.target.value; tela.erros = []; tela.avisos = []; tela.falha = ""; return desenhar(); }
  });
  document.addEventListener("input", function (ev) { if (ev.target && ev.target.id === "hai-json") lerTexto(); });
  document.addEventListener("DOMContentLoaded", function () {
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) window.HoloAuth.aoMudarEstado(function () { cache = { pid: null, imports: [], itens: [], carregado: false, erro: null }; });
  });

  window.HolosAIPonte = {
    desenhar: desenhar, carregar: carregar, montarPacote: montarPacote, importsDoAtendimento: importsDoAtendimento, itensDe: itensDe, resultadoDaImportacao: resultadoDaImportacao,
    esquecer: function () { cache = { pid: null, imports: [], itens: [], carregado: false, erro: null }; },
    estado: function () { return { cache: cache, tela: tela }; }
  };
})();
