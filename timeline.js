/* ===========================================================================
   TIMELINE CLINICA — V1, Etapa 3
   ===========================================================================

   A unica fonte de eventos da linha do tempo (Visao geral, Evolucao, HOLOS AI,
   exportacao). So entra o que esta CONSOLIDADO: atendimento registrado,
   anamnese salva/revisada, HOLOSCAN com identidade remota (com sessao),
   ferramenta concluida/revisada, conduta salva/revisada, acordo com
   situacao alterada, documento/exame guardado no prontuario, relatorio
   emitido. Coleta de exames estruturada nao entra (decisao 09/10). O
   agendamento entra como evento ADMINISTRATIVO, rotulado como tal.

   Nao entra: rascunho, previa, cache local nao sincronizado.

   Cada evento tem DATA CLINICA (`quando`, ordena) e DATA DE REGISTRO
   (`registrado_em`, sempre consultavel). Revisao e correcao documental
   (`revisao: true`, ligada ao registro original), nunca um novo evento
   clinico. Nenhuma interpretacao; nenhum delta.
   =========================================================================== */

(function () {
  "use strict";

  var escapar = window.escapar;
  var TIPOS = [
    ["tudo", "Tudo"], ["consulta", "Agendamentos"], ["atendimento", "Atendimentos"], ["anamnese", "Anamnese"],
    ["conduta", "Conduta"], ["mapa", "HOLOSCAN"], ["ferramenta", "Ferramentas"],
    ["documento", "Documentos e exames"], ["relatorio", "Relatórios"]
  ];

  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function dataBR(iso) { return window.dataBR ? window.dataBR(String(iso || "").slice(0, 10)) : String(iso || "").slice(0, 10); }
  function diaLocal(iso) {
    if (!iso) return "";
    if (String(iso).length <= 10) return iso;
    var d = new Date(iso); if (isNaN(d)) return "";
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function diaDoAtendimento(eid) {
    var A = window.AtendimentoAtual; var e = A && A.porId(eid);
    return e ? A.paraParede(e.occurred_at, e.timezone || A.fuso()).data : "";
  }
  function hojeISO() { return window.hojeISO ? window.hojeISO() : new Date().toISOString().slice(0, 10); }
  function ev(o) {
    o.registrado_em = o.registrado_em || null;
    o.revisao = !!o.revisao;
    return o;
  }

  /** Todos os eventos consolidados do paciente, ordenados por data clinica
      (mais recente primeiro); desempate pela data de registro. */
  function eventos(pid, opcoes) {
    opcoes = opcoes || {};
    var A = window.AtendimentoAtual, An = window.Anamnese, Cd = window.Conduta, R = window.Relatorios;
    var lista = [];

    if (A) A.doPaciente(pid).forEach(function (e) {
      var w = A.paraParede(e.occurred_at, e.timezone || A.fuso());
      lista.push(ev({ tipo: "atendimento", selo: "Atendimento", titulo: "Atendimento realizado",
        detalhe: w.hora + (e.type ? " · " + escapar(e.type) : "") + (e.consultation_id ? " · com agendamento" : " · sem agendamento"),
        quando: w.data, hora: w.hora, registrado_em: e.created_at, ref: { tabela: "encounters", id: e.id }, acao: "aba:consultas" }));
    });

    if (An && Cd) {
      An.doPaciente(pid).filter(An.consolidada).forEach(function (a) {
        var revisao = a.revision_number > 1;
        lista.push(ev({ tipo: "anamnese", selo: revisao ? "Revisão" : "Anamnese",
          titulo: revisao ? "Anamnese revisada (rev. " + a.revision_number + ")" : "Anamnese salva",   // revisao = correcao documental ligada ao original
          detalhe: a.status + " · " + An.contarItens(a.content) + " itens" + (a.revision_note ? " · " + escapar(a.revision_note) : "") +
            (a.superseded_at ? " · substituída por revisão posterior" : ""),
          quando: diaDoAtendimento(a.encounter_id), registrado_em: a.created_at, revisao: revisao,
          original: a.supersedes_id || null, ref: { tabela: "anamneses", id: a.id }, acao: "aba:anamnese" }));
      });
      Cd.doPaciente(pid).filter(Cd.consolidada).forEach(function (c) {
        var revisao = c.revision_number > 1;
        lista.push(ev({ tipo: "conduta", selo: revisao ? "Revisão" : "Conduta",
          titulo: revisao ? "Conduta revisada (rev. " + c.revision_number + ")" : "Conduta salva",
          detalhe: c.status + (c.objective ? " · " + escapar(c.objective) : "") + (c.revision_note ? " · " + escapar(c.revision_note) : "") +
            (c.superseded_at ? " · substituída por revisão posterior" : ""),
          quando: diaDoAtendimento(c.encounter_id), registrado_em: c.created_at, revisao: revisao,
          original: c.supersedes_id || null, ref: { tabela: "conducts", id: c.id }, acao: "aba:conduta" }));
        Cd.acordosDe(c.id).filter(function (g) { return g.status_changed_at; }).forEach(function (g) {
          lista.push(ev({ tipo: "conduta", selo: "Acordo", titulo: "Acordo: " + escapar(g.description),
            detalhe: Cd.rotulo(g.status) + (g.status_note ? " · " + escapar(g.status_note) : ""),
            quando: diaLocal(g.status_changed_at), registrado_em: g.status_changed_at, ref: { tabela: "agreements", id: g.id }, acao: "aba:conduta" }));
        });
      });
    }

    /* HOLOSCAN: com sessao, so a aplicacao com identidade remota (_supa_id) e
       consolidada; o calculo local ainda nao sincronizado e cache, nao evento. */
    var hist = window.historicoPontuacao ? (window.historicoPontuacao(pid) || []) : [];
    var comSessao = temSupa();
    hist.forEach(function (p, i) {
      if (comSessao && !p._supa_id) return;
      var cob = p.cobertura && typeof p.cobertura.respondidos === "number" ? p.cobertura.respondidos + " de " + p.cobertura.total + " respondidas" : "";
      /* O Indice aparece como ja aparece na ficha (selo "em homologacao" no
         bloco do mapa); nenhuma comparacao entre aplicacoes e feita aqui. */
      lista.push(ev({ tipo: "mapa", selo: "HOLOSCAN", titulo: (i + 1) + "ª aplicação do HOLOSCAN",
        detalhe: "Índice " + escapar(window.HoloAusencia.indiceTexto(p)) + " de " + escapar(p.indice_maximo) + (cob ? " · " + cob : "") + (p._supa_id ? "" : " · só neste dispositivo"),
        quando: p.quando, registrado_em: p._supa_criado_em || p.calculado_em || null, ref: { tabela: "holoscan_applications", id: p._supa_id || null }, acao: "aba:holoscan" }));
    });

    if (window.Aplicacoes) {
      window.Aplicacoes.doPaciente(pid).filter(function (a) { return a.status !== "rascunho" && (a.id || !comSessao); }).forEach(function (a) {
        var nome = window.Ferramentas && window.Ferramentas.nome ? window.Ferramentas.nome(a.ferramenta_id) : a.ferramenta_id;
        var cat = (window.CATALOGO_FERRAMENTAS || []).filter(function (f) { return f.id === a.ferramenta_id; })[0];
        if (cat) nome = cat.titulo; else if (a.ferramenta_id === "oq3") nome = "OQ³"; else if (a.ferramenta_id === "pqq") nome = "PQQ";
        lista.push(ev({ tipo: "ferramenta", selo: nome, titulo: nome + " aplicada",
          detalhe: a.status + (a.leitura ? " · " + escapar(a.leitura) : ""),
          quando: diaLocal(a.concluida_em || a.iniciada_em), registrado_em: a.concluida_em || a.iniciada_em, ref: { tabela: "tool_applications", id: a.id }, acao: "aba:formularios" }));
      });
    }

    /* Decisao de produto 09/10: coletas de exames (historico laboratorial estruturado) nao aparecem mais.
       Exame e documento entram como DOCUMENTO do prontuario, logo abaixo. */

    if (window.Agenda && window.Agenda.todas && !opcoes.semAgenda) {
      var hj = hojeISO();
      window.Agenda.todas(pid).forEach(function (c) {
        lista.push(ev({ tipo: "consulta", selo: c.tipo || "Agendamento", titulo: c.data > hj ? "Consulta marcada (agendamento)" : "Agendamento", administrativo: true,
          detalhe: String(c.hora).slice(0, 5) + " · " + (c.duracao || 60) + " min" + (c.nota ? " · " + escapar(c.nota) : ""),
          quando: c.data, hora: c.hora, ordem: c.data + "T" + (c.hora || "00:00"), registrado_em: c.created_at, ref: { tabela: "consultations", id: c.id }, acao: "agenda" }));
      });
    }

    /* Documento anexado: o que esta no ArquivoStore (local ou servidor). */
    if (opcoes.documentos) opcoes.documentos.forEach(function (d) {
      lista.push(ev({ tipo: "documento", selo: /^exame/i.test(d.tipo || "") ? "Exame" : (d.tipo || "Documento"), titulo: escapar(d.titulo || d.nome),
        detalhe: window.ArquivoStore && window.ArquivoStore.tamanhoLegivel ? window.ArquivoStore.tamanhoLegivel(d.tamanho) : "",
        quando: d.data || diaLocal(d.enviado_em || d.created_at), registrado_em: d.enviado_em || d.created_at, ref: { tabela: "documents", id: d._supa_id || d.id }, acao: "aba:documentos" }));
    });

    if (R && R.doPaciente) R.doPaciente(pid).filter(function (r) { return r.status === "emitido"; }).forEach(function (r) {
      lista.push(ev({ tipo: "relatorio", selo: r.supersedes_report_id ? "Retificação" : "Relatório",
        titulo: (r.supersedes_report_id ? "Relatório retificado (emissão " + r.revision_number + ")" : "Relatório emitido") + (r.title ? ": " + escapar(r.title) : ""),
        detalhe: (r.period_start ? dataBR(r.period_start) + " – " + dataBR(r.period_end) : "sem período") + (r.superseded_at ? " · substituído por retificação" : ""),
        quando: diaLocal(r.issued_at), registrado_em: r.issued_at, revisao: !!r.supersedes_report_id, original: r.supersedes_report_id || null,
        ref: { tabela: "report_emissions", id: r.id }, acao: "aba:relatorio" }));
    });

    lista.sort(function (a, b) {
      if (!a.quando !== !b.quando) return a.quando ? -1 : 1;
      return String(b.quando || "").localeCompare(String(a.quando || "")) ||
             String(b.ordem || b.registrado_em || "").localeCompare(String(a.ordem || a.registrado_em || ""));
    });
    return lista;
  }

  /** Eventos entre duas datas clinicas (inclusive), para a Evolucao. */
  function noIntervalo(pid, de, ate, opcoes) {
    return eventos(pid, opcoes).filter(function (e) { return e.quando && (!de || e.quando >= de) && (!ate || e.quando <= ate); });
  }

  /** Texto bruto para o contexto da HOLOS AI e exportacao: um evento por linha,
      com data clinica e data de registro. */
  function textoBruto(pid, opcoes) {
    return eventos(pid, opcoes).map(function (e) {
      var reg = e.registrado_em ? " (registrado em " + dataBR(e.registrado_em) + ")" : "";
      return "- " + (e.quando ? dataBR(e.quando) : "sem data clínica") + " — " + e.titulo.replace(/<[^>]+>/g, "") +
        (e.detalhe ? " — " + String(e.detalhe).replace(/<[^>]+>/g, "").replace(/&middot;/g, "·") : "") + (e.revisao ? " [revisão]" : "") + (e.administrativo ? " [agendamento]" : "") + reg;
    }).join("\n");
  }

  /** O HTML de um evento (comum a Visao geral e Evolucao). */
  function eventoHtml(e) {
    var reg = e.registrado_em && diaLocal(e.registrado_em) !== e.quando
      ? ' <span class="fic-registro" title="data de registro">registrado em ' + escapar(dataBR(e.registrado_em)) + "</span>" : "";
    return '<button type="button" class="fic-evento ' + e.tipo + (e.revisao ? " revisao" : "") + (e.administrativo ? " administrativo" : "") +
      '" data-ir="' + escapar(e.acao || "aba:visao") + '" data-tl-ref="' + escapar((e.ref && e.ref.id) || "") + '">' +
      '<span class="fic-evento-marca" aria-hidden="true"></span>' +
      '<span class="fic-evento-corpo">' +
        '<span class="fic-evento-topo"><b>' + e.titulo + "</b>" + '<span class="fic-selo">' + escapar(e.selo) + "</span></span>" +
        '<span class="fic-evento-quando">' + (e.quando ? escapar(dataBR(e.quando)) : "sem data clínica") + (e.hora ? " · " + escapar(String(e.hora).slice(0, 5)) : "") + reg + "</span>" +
        (e.detalhe ? '<span class="fic-evento-detalhe">' + e.detalhe + "</span>" : "") +
      "</span></button>";
  }

  window.Timeline = { TIPOS: TIPOS, eventos: eventos, noIntervalo: noIntervalo, textoBruto: textoBruto, eventoHtml: eventoHtml, diaLocal: diaLocal };
})();
