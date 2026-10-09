/* ===========================================================================
   ANAMNESE V2 — formulario clinico rapido (primeira consulta e retorno)
   ===========================================================================

   O registro continua sendo a MESMA linha de `anamneses` (mesmas RPCs, mesma
   RLS, mesmos estados rascunho -> salvo -> revisado, mesmas revisoes). Muda o
   conteudo e a tela:

     content = { formulario_versao: 2, tipo: "primeira" | "retorno",
                 formulario: { <bloco>: { <campo>: valor } },
                 meta: { "<bloco>.<campo>": { estado, origem, em, previo, fonte_anamnese_id } },
                 dominios: <GERADO> }

   REGRA RIGIDA: `content.dominios` NUNCA e editado pela tela V2. Ele e sempre
   gerado de `formulario` + `meta` por UMA funcao canonica —
   gerarDominiosDaAnamneseV2(formulario, meta, tipo) — e e o que Relatorio,
   Evolucao, HOLOS AI e o servidor (emitir_relatorio) continuam lendo, com
   estado, origem e medida como sempre. Campo vazio nao gera item (vazio nunca
   e "nao"); sintoma "Nao" gera negado_explicitamente; medida exige unidade e
   tem origem dado_medido; o resto nasce informado + relato do paciente (a
   nutricionista pode mudar em "Detalhes do registro").

   Anamnese antiga (sem formulario_versao) NAO passa por aqui: abre no formato
   antigo (anamnese.js), sem conversao nem reinterpretacao.
   =========================================================================== */

(function () {
  "use strict";

  var raiz = typeof window !== "undefined" ? window : globalThis;
  var VERSAO = 2;

  /* ---------- esquema (unica fonte: tela, dominios e resumo) ----------------- */
  var SINTOMA = [["nao", "Não"], ["as_vezes", "Às vezes"], ["frequente", "Frequente"]];
  function T(id, rotulo, dom, extra) { return Object.assign({ id: id, rotulo: rotulo, tipo: "texto", dom: dom }, extra || {}); }
  function A(id, rotulo, dom, extra) { return Object.assign({ id: id, rotulo: rotulo, tipo: "area", dom: dom }, extra || {}); }
  function C(id, rotulo, dom, opcoes, extra) { return Object.assign({ id: id, rotulo: rotulo, tipo: "chips", dom: dom, opcoes: opcoes }, extra || {}); }
  function S(id, rotulo) { return { id: id, rotulo: rotulo, tipo: "sintoma", dom: "sintomas_relatados" }; }
  function L(id, rotulo, dom, colunas, extra) { return Object.assign({ id: id, rotulo: rotulo, tipo: "lista", dom: dom, colunas: colunas }, extra || {}); }
  function M(id, rotulo, unidades) { return { id: id, rotulo: rotulo, tipo: "medida", dom: "medidas", unidades: unidades }; }
  var COL_MED = [["nome", "Nome"], ["dose", "Dose (opcional)"], ["frequencia", "Frequência"], ["obs", "Observação"]];
  var COL_MEDIDA = [["nome", "Medida"], ["valor", "Valor"], ["unidade", "Unidade"]];

  var BLOCOS_PRIMEIRA = [
    { id: "motivo", titulo: "Motivo e objetivo", campos: [
      A("motivo", "Motivo da consulta", "motivo_objetivo"), A("objetivo", "Principal objetivo", "motivo_objetivo"),
      A("expectativa", "Expectativa com o acompanhamento", "motivo_objetivo"), A("mudar_primeiro", "O que gostaria de mudar primeiro", "motivo_objetivo")] },
    { id: "alimentar", titulo: "História e rotina alimentar", campos: [
      C("refeicoes", "Número habitual de refeições", "historia_alimentar", ["1–2", "3", "4", "5", "6 ou mais"]),
      T("horarios", "Horários aproximados", "historia_alimentar"),
      T("cafe", "Café da manhã", "historia_alimentar"), T("almoco", "Almoço", "historia_alimentar"),
      T("jantar", "Jantar", "historia_alimentar"), T("lanches", "Lanches", "historia_alimentar"),
      C("agua", "Consumo de água", "historia_alimentar", ["Menos de 1 L", "1–2 L", "Mais de 2 L"]),
      C("alcool", "Álcool (se pertinente)", "historia_alimentar", ["Não consome", "Ocasional", "Semanal", "Diário"]),
      T("preferencias", "Preferências alimentares", "historia_alimentar"), T("evitados", "Alimentos evitados", "historia_alimentar"),
      T("dificuldade", "Maior dificuldade alimentar", "historia_alimentar"),
      C("maior_fome", "Períodos de maior fome", "historia_alimentar", ["Manhã", "Tarde", "Noite", "Madrugada", "Sem padrão"], { multi: true }),
      C("quem_prepara", "Quem prepara as refeições", "rotina_acesso", ["Eu", "Parceiro(a)", "Família", "Restaurante", "Varia"], { multi: true }),
      C("comer_fora", "Frequência de comer fora", "rotina_acesso", ["Raramente", "1–2x/semana", "3–5x/semana", "Quase todo dia"]),
      C("delivery", "Delivery", "rotina_acesso", ["Raramente", "1–2x/semana", "3–5x/semana", "Quase todo dia"]),
      T("trabalho", "Alimentação no trabalho", "rotina_acesso"), A("obs", "Observações livres", "historia_alimentar")] },
    { id: "saude", titulo: "Saúde e sintomas", campos: [
      A("condicoes", "Condições / diagnósticos informados", "condicoes_diagnosticos_informados"),
      T("cirurgias", "Cirurgias relevantes", "antecedentes"),
      C("intestino", "Intestino", "sintomas_relatados", ["Regular", "Constipação", "Diarreia", "Alternado"]),
      S("gastrointestinais", "Sintomas gastrointestinais"), S("azia_refluxo", "Azia / refluxo"), S("distensao", "Distensão"),
      S("nausea", "Náusea"), S("dor", "Dor"), T("outros", "Outros sintomas relevantes", "sintomas_relatados")] },
    { id: "restricoes", titulo: "Medicamentos, suplementos e restrições", campos: [
      L("medicamentos", "Medicamentos", "medicamentos", COL_MED, { nega: "Não usa medicamentos", item: "medicamento" }),
      L("suplementos", "Suplementos", "suplementos", COL_MED, { nega: "Não usa suplementos", item: "suplemento" }),
      L("alergias", "Alergias", "alergias_informadas", [["nome", "Alergia"], ["obs", "Observação"]], { nega: "Nega alergias", item: "alergia" }),
      L("intolerancias", "Intolerâncias", "intolerancias_informadas", [["nome", "Intolerância"], ["obs", "Observação"]], { nega: "Nega intolerâncias", item: "intolerância" })] },
    { id: "estilo", titulo: "Estilo de vida", rotina: true, campos: [
      C("sono", "Sono", "sono", ["Bom", "Regular", "Ruim"]),
      C("atividade", "Atividade física", "atividade_fisica", ["Não pratica", "1–2x/semana", "3–4x/semana", "5+x/semana"]),
      T("trabalho", "Trabalho", "rotina_acesso"),
      C("estresse", "Estresse percebido", "contexto_social", ["Baixo", "Moderado", "Alto"]),
      C("tabagismo", "Tabagismo (se pertinente)", "antecedentes", ["Não fuma", "Ex-fumante", "Fuma"]),
      A("rotina", "Rotina geral (resumo)", "rotina_acesso")] },
    { id: "contexto", titulo: "Histórico e contexto", campos: [
      A("familiar_saude", "Histórico familiar relevante", "antecedentes"), A("familiar", "Contexto familiar", "contexto_familiar"),
      A("social", "Contexto social", "contexto_social"), A("financeiro", "Condições financeiras/alimentares relevantes (se necessário)", "contexto_social"),
      A("obs", "Observações importantes", "contexto_social"),
      A("emocional", "Campos emocionais", "emocional", { intimo: true }), A("sentido", "Sentido pessoal", "sentido_pessoal", { intimo: true })] },
    { id: "objetiva", titulo: "Avaliação objetiva", campos: [
      M("peso", "Peso", ["kg"]), M("altura", "Altura", ["cm", "m"]),
      L("circunferencias", "Circunferências", "medidas", COL_MEDIDA, { medida: true, item: "circunferência", padrao: "cm" }),
      L("outras_medidas", "Outras medidas", "medidas", COL_MEDIDA, { medida: true, item: "medida", padrao: "" }),
      A("obs_fisicas", "Observações físicas pertinentes", "avaliacoes"), A("exames", "Exames disponíveis", "avaliacoes"),
      A("outras_avaliacoes", "Outras avaliações relevantes", "avaliacoes")] }
  ];
  var BLOCOS_RETORNO = [
    { id: "retorno", titulo: "Desde a última consulta", campos: [
      A("melhorou", "O que melhorou?", "motivo_objetivo"), A("piorou", "O que piorou?", "motivo_objetivo"),
      A("alimentacao", "O que mudou na alimentação?", "historia_alimentar"), A("rotina", "Mudou a rotina?", "rotina_acesso"),
      A("sintomas", "Novos sintomas?", "sintomas_relatados"), A("medicamento", "Alterou medicamento?", "medicamentos"),
      A("suplemento", "Alterou suplemento?", "suplementos"), A("peso_medidas", "Mudou peso/medidas?", "medidas"),
      M("peso", "Peso atual", ["kg"]),
      A("dificuldade", "Principal dificuldade desde a última consulta?", "motivo_objetivo"), A("obs", "Alguma observação importante?", "motivo_objetivo")] }
  ];
  var ESTADOS = [["informado", "Informado"], ["negado_explicitamente", "Negado explicitamente"], ["desconhecido", "Desconhecido"],
    ["nao_investigado", "Não investigado"], ["nao_aplicavel", "Não aplicável"], ["recusado", "Recusado"]];
  var ORIGENS = [["relato_paciente", "Relato do paciente"], ["observacao_profissional", "Observação profissional"],
    ["documento_externo", "Documento externo"], ["dado_medido", "Dado medido"]];
  var ROT = {}; ESTADOS.concat(ORIGENS).forEach(function (p) { ROT[p[0]] = p[1]; });

  function blocosDe(tipo) { return tipo === "retorno" ? BLOCOS_RETORNO : BLOCOS_PRIMEIRA; }
  function ehV2(content) { return !!(content && content.formulario_versao === VERSAO); }
  function tem(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }
  function chave(b, c) { return b + "." + c; }

  /* ---------- valores de exibicao ----------------------------------------------- */
  function textoChips(f, val, outro, detalhe) {
    var lista = Array.isArray(val) ? val.slice() : (tem(val) ? [val] : []);
    var partes = lista.map(function (v) { return v === "Outro" && tem(outro) ? "Outro: " + String(outro).trim() : v; });
    return partes.join(", ") + (tem(detalhe) ? (partes.length ? " — " : "") + String(detalhe).trim() : "");
  }
  function numero(v) { if (!tem(v)) return null; var n = Number(String(v).replace(",", ".")); return isNaN(n) ? null : n; }

  /* ==========================================================================
     FUNCAO CANONICA: formulario + meta -> dominios (formato validado pelo servidor)
     Deterministica: mesma entrada, mesma saida, na ordem do esquema.
     ========================================================================== */
  function gerarDominiosDaAnamneseV2(formulario, meta, tipo) {
    formulario = formulario || {}; meta = meta || {};
    var dominios = {};
    var push = function (dom, it) { (dominios[dom] = dominios[dom] || { itens: [] }).itens.push(it); };
    blocosDe(tipo).forEach(function (b) {
      var dados = formulario[b.id] || {};
      b.campos.forEach(function (f) {
        var k = chave(b.id, f.id), m = meta[k] || {}, v = dados[f.id];
        var base = function (campo, valor, padraoEstado, padraoOrigem, extra) {
          return Object.assign({ campo: campo, valor: valor, estado: m.estado || padraoEstado, origem: m.origem || padraoOrigem, medida: null,
            previo: !!m.previo, chave: k }, m.fonte_anamnese_id ? { fonte_anamnese_id: m.fonte_anamnese_id } : {}, extra || {});
        };
        if (f.tipo === "texto" || f.tipo === "area") {
          if (tem(v)) push(f.dom, base(f.rotulo, String(v).trim(), "informado", "relato_paciente"));
          else if (m.estado && m.estado !== "informado") push(f.dom, base(f.rotulo, "", m.estado, "relato_paciente"));
        } else if (f.tipo === "chips") {
          var txt = textoChips(f, v, dados[f.id + "_outro"], dados[f.id + "_detalhe"]);
          if (tem(txt)) push(f.dom, base(f.rotulo, txt, "informado", "relato_paciente"));
          else if (m.estado && m.estado !== "informado") push(f.dom, base(f.rotulo, "", m.estado, "relato_paciente"));
        } else if (f.tipo === "sintoma") {
          var det = dados[f.id + "_detalhe"];
          if (v === "nao") push(f.dom, base(f.rotulo, tem(det) ? String(det).trim() : "", "negado_explicitamente", "relato_paciente", { estado: "negado_explicitamente" }));
          else if (v === "as_vezes" || v === "frequente") push(f.dom, base(f.rotulo, (v === "frequente" ? "Frequente" : "Às vezes") + (tem(det) ? " — " + String(det).trim() : ""), "informado", "relato_paciente"));
          else if (m.estado && m.estado !== "informado") push(f.dom, base(f.rotulo, "", m.estado, "relato_paciente"));
        } else if (f.tipo === "medida") {
          var n = numero(v), u = dados[f.id + "_unidade"] || f.unidades[0];   // a unidade que a tela mostra selecionada
          if (n !== null) push(f.dom, base(f.rotulo, "", "informado", "dado_medido", { medida: { valor: n, unidade: u, data: dados[f.id + "_data"] || null, metodo: null, responsavel: null } }));
          else if (m.estado && m.estado !== "informado") push(f.dom, base(f.rotulo, "", m.estado, "dado_medido"));
        } else if (f.tipo === "lista") {
          var linhas = Array.isArray(v) ? v : [];
          linhas.forEach(function (l, i) {
            if (!l || !tem(l.nome)) return;
            var mi = meta[k + "." + i] || {};
            var it = { campo: String(l.nome).trim(), valor: "", estado: mi.estado || "informado", origem: mi.origem || (f.medida ? "dado_medido" : "relato_paciente"),
              medida: null, previo: !!mi.previo, chave: k + "." + i };
            if (mi.fonte_anamnese_id) it.fonte_anamnese_id = mi.fonte_anamnese_id;
            if (f.medida) {
              var nv = numero(l.valor);
              // a unidade que a tela mostra (o padrao do campo, ex.: cm, ate a nutri trocar) e a que vai para o registro
              var un = l.unidade !== undefined ? l.unidade : (f.padrao || "");
              if (nv !== null) it.medida = { valor: nv, unidade: tem(un) ? String(un).trim() : "", data: null, metodo: null, responsavel: null };
            } else {
              it.valor = [l.dose, l.frequencia, l.obs].filter(tem).map(function (x) { return String(x).trim(); }).join(" · ");
            }
            push(f.dom, it);
          });
          if (!linhas.some(function (l) { return l && tem(l.nome); }) && dados[f.id + "_nega"] === true) {
            push(f.dom, base(f.rotulo, "", "negado_explicitamente", "relato_paciente", { estado: "negado_explicitamente" }));
          }
        }
      });
    });
    return dominios;
  }

  /** Monta o content completo; o unico caminho que escreve `dominios` na V2. */
  function montarContent(tipo, formulario, meta) {
    var f = JSON.parse(JSON.stringify(formulario || {})), m = JSON.parse(JSON.stringify(meta || {}));
    // so o tipo ativo entra no registro: o outro tipo nao fica guardado escondido
    var ativos = blocosDe(tipo).map(function (b) { return b.id; });
    Object.keys(f).forEach(function (k) { if (ativos.indexOf(k) < 0) delete f[k]; });
    Object.keys(m).forEach(function (k) { if (ativos.indexOf(k.split(".")[0]) < 0) delete m[k]; });
    return { formulario_versao: VERSAO, tipo: tipo === "retorno" ? "retorno" : "primeira", formulario: f, meta: m,
      dominios: gerarDominiosDaAnamneseV2(f, m, tipo) };
  }

  /** Problemas que impedem gravar (medida sem unidade). */
  function problemas(content) {
    var erros = [];
    Object.keys((content || {}).dominios || {}).forEach(function (d) {
      (content.dominios[d].itens || []).forEach(function (it) {
        if (it.medida && it.medida.valor !== null && it.medida.valor !== undefined && !tem(it.medida.unidade)) erros.push("Medida “" + it.campo + "” sem unidade: informe a unidade.");
      });
    });
    return erros;
  }

  /* ---------- resumo (so organizacao do que foi registrado; sem interpretacao) --- */
  function resumo(content) {
    if (!ehV2(content)) return null;
    var f = content.formulario || {}, g = function (b, c) { return (f[b] || {})[c]; };
    var d = content.dominios || {};
    var itens = function (dom, filtro) { return ((d[dom] || {}).itens || []).filter(filtro || function () { return true; }); };
    var inf = function (it) { return it.estado === "informado"; };
    var neg = function (it) { return it.estado === "negado_explicitamente"; };
    var lin = function (it) { return it.campo + (tem(it.valor) ? ": " + it.valor : "") + (it.medida ? ": " + String(it.medida.valor).replace(".", ",") + " " + it.medida.unidade : ""); };
    var blocos = [];
    var add = function (titulo, linhas) { linhas = linhas.filter(tem); if (linhas.length) blocos.push({ titulo: titulo, linhas: linhas }); };
    if (content.tipo === "retorno") {
      add("Desde a última consulta", BLOCOS_RETORNO[0].campos.filter(function (c) { return c.tipo !== "medida"; }).map(function (c) { return tem(g("retorno", c.id)) ? c.rotulo.replace(/\?$/, "") + ": " + String(g("retorno", c.id)).trim() : ""; }));
      add("Medidas", itens("medidas", function (it) { return !!it.medida; }).map(lin));
      return blocos;
    }
    add("Objetivo principal", [g("motivo", "objetivo"), tem(g("motivo", "motivo")) ? "Motivo: " + g("motivo", "motivo") : "", tem(g("motivo", "mudar_primeiro")) ? "Mudar primeiro: " + g("motivo", "mudar_primeiro") : ""]);
    add("Pontos clínicos relevantes (informados)", itens("condicoes_diagnosticos_informados", inf).map(lin).concat(itens("antecedentes", inf).filter(function (it) { return it.chave === "saude.cirurgias" || it.chave === "contexto.familiar_saude"; }).map(lin)));
    add("Hábitos alimentares", itens("historia_alimentar", inf).concat(itens("rotina_acesso", inf).filter(function (it) { return /^alimentar\./.test(it.chave || ""); })).map(lin));
    add("Sintomas informados", itens("sintomas_relatados", inf).map(lin));
    add("Sintomas negados", itens("sintomas_relatados", neg).map(function (it) { return it.campo; }));
    add("Medicamentos e suplementos", itens("medicamentos").map(function (it) { return neg(it) ? "Não usa medicamentos" : "Medicamento: " + lin(it); })
      .concat(itens("suplementos").map(function (it) { return neg(it) ? "Não usa suplementos" : "Suplemento: " + lin(it); })));
    add("Alergias e intolerâncias", itens("alergias_informadas").map(function (it) { return neg(it) ? "Nega alergias" : "Alergia: " + lin(it); })
      .concat(itens("intolerancias_informadas").map(function (it) { return neg(it) ? "Nega intolerâncias" : "Intolerância: " + lin(it); })));
    add("Sono e atividade", itens("sono", inf).concat(itens("atividade_fisica", inf)).map(lin));
    add("Contexto relevante", itens("contexto_familiar", inf).concat(itens("contexto_social", inf)).map(lin));
    add("Medidas", itens("medidas", function (it) { return !!it.medida; }).map(lin));
    var intimo = itens("emocional").length + itens("sentido_pessoal").length;
    if (intimo) blocos.push({ titulo: "Conteúdo íntimo", linhas: ["Registrado (campos emocionais / sentido pessoal) — não aparece no resumo; só entra em relatório com marcação explícita."], intimo: true });
    return blocos;
  }
  function resumoHtml(content, esc) {
    var r = resumo(content); if (!r) return "";
    if (!r.length) return '<p class="an2-vazio">Nada registrado ainda.</p>';
    return '<div class="an2-resumo">' + r.map(function (b) {
      return '<section class="an2-resumo-bloco' + (b.intimo ? " an2-resumo-intimo" : "") + '"><h5>' + esc(b.titulo) + "</h5><ul>" +
        b.linhas.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul></section>";
    }).join("") + "</div>";
  }

  /* =========================================================================
     TELA
     ========================================================================= */
  var esc = function (x) { return raiz.escapar ? raiz.escapar(x === null || x === undefined ? "" : String(x)) : String(x); };
  var st = null;   // estado da tela: { eid, pid, id, updated_at, corrigeDe, tipo, formulario, meta, abertos, estado, salvoEm, sujo, salvando, pendente, erro }
  var timer = null, relogio = null;

  function novoEstado(e, base) {
    var c = base ? base.content : null;
    return { eid: e.id, pid: e.patient_id, id: base && base.status === "rascunho" ? base.id : null, updated_at: base && base.status === "rascunho" ? base.updated_at : null,
      corrigeDe: base && base.status !== "rascunho" ? base.id : null, copiado: !!(base && base.copied_from_previous),
      tipo: c && c.tipo === "retorno" ? "retorno" : "primeira", formulario: JSON.parse(JSON.stringify((c && c.formulario) || {})),
      meta: JSON.parse(JSON.stringify((c && c.meta) || {})), abertos: {}, estado: "", salvoEm: null, sujo: false, salvando: false, pendente: false };
  }
  function contentAtual() { return montarContent(st.tipo, st.formulario, st.meta); }

  function textoEstado() {
    if (!st) return "";
    if (st.estado === "salvando") return "Salvando…";
    if (st.estado === "conflito") return "Alterada em outra sessão — recarregue para não sobrescrever";
    if (st.estado === "falha") return "Não salvo — tentar novamente";
    if (st.estado === "salvo" && st.salvoEm) {
      var s = Math.max(0, Math.round((Date.now() - st.salvoEm) / 1000));
      return s < 10 ? "Salvo automaticamente há poucos segundos" : s < 60 ? "Salvo automaticamente há " + s + " s" : "Salvo automaticamente há " + Math.round(s / 60) + " min";
    }
    if (st.sujo) return "Alterações ainda não salvas";
    return "";
  }
  function pintarEstado() {
    var el = document.getElementById("an2-estado"); if (!el) return;
    el.textContent = textoEstado();
    el.className = "an2-estado" + (st && (st.estado === "falha" || st.estado === "conflito") ? " erro" : "");
    var b = document.getElementById("an2-tentar"); if (b) b.hidden = !(st && (st.estado === "falha" || st.estado === "conflito"));
    if (b && st) b.textContent = st.estado === "conflito" ? "Recarregar" : "Tentar novamente";
  }

  /* ---------- campos ---------------------------------------------------------- */
  function chipsHtml(b, f, dados, ro) {
    var val = dados[f.id], sel = Array.isArray(val) ? val : (tem(val) ? [val] : []);
    var nome = "an2-" + b.id + "-" + f.id;
    var opcoes = f.opcoes.concat(["Outro"]);
    return '<div class="an2-chips" role="group" aria-label="' + esc(f.rotulo) + '">' + opcoes.map(function (o) {
      var on = sel.indexOf(o) >= 0;
      return '<button type="button" class="an2-chip' + (on ? " on" : "") + '" aria-pressed="' + on + '" data-an2-chip="' + esc(b.id + "." + f.id) + '" data-valor="' + esc(o) + '"' + (f.multi ? ' data-multi="1"' : "") + (ro ? " disabled" : "") + ">" + esc(o) + "</button>";
    }).join("") + "</div>" +
      (sel.indexOf("Outro") >= 0 ? '<input type="text" class="an2-input an2-outro" id="' + nome + '-outro" aria-label="' + esc(f.rotulo) + ' — outro" data-an2-campo="' + esc(b.id + "." + f.id + "_outro") + '" value="' + esc(dados[f.id + "_outro"] || "") + '" placeholder="Qual?"' + (ro ? " disabled" : "") + ">" : "") +
      /* o detalhe so aparece depois de escolher (ou se ja tiver texto): menos ruido na tela */
      (sel.length || tem(dados[f.id + "_detalhe"]) ? '<input type="text" class="an2-input an2-detalhe" aria-label="' + esc(f.rotulo) + ' — detalhe" data-an2-campo="' + esc(b.id + "." + f.id + "_detalhe") + '" value="' + esc(dados[f.id + "_detalhe"] || "") + '" placeholder="Detalhar (opcional)"' + (ro ? " disabled" : "") + ">" : "");
  }
  function sintomaHtml(b, f, dados, ro) {
    var v = dados[f.id], det = dados[f.id + "_detalhe"];
    var aberto = tem(det) || (st && st.abertos["det:" + b.id + "." + f.id]);
    return '<div class="an2-chips" role="group" aria-label="' + esc(f.rotulo) + '">' + SINTOMA.map(function (o) {
      var on = v === o[0];
      return '<button type="button" class="an2-chip' + (on ? " on" : "") + (o[0] === "nao" ? " an2-chip-nao" : "") + '" aria-pressed="' + on + '" data-an2-chip="' + esc(b.id + "." + f.id) + '" data-valor="' + o[0] + '"' + (ro ? " disabled" : "") + ">" + esc(o[1]) + "</button>";
    }).join("") + (ro ? "" : '<button type="button" class="an2-mais" data-an2-detalhar="' + esc(b.id + "." + f.id) + '" aria-expanded="' + !!aberto + '">+ Detalhar</button>') + "</div>" +
      (aberto ? '<input type="text" class="an2-input an2-detalhe" aria-label="' + esc(f.rotulo) + ' — detalhe" data-an2-campo="' + esc(b.id + "." + f.id + "_detalhe") + '" value="' + esc(det || "") + '" placeholder="Como, quando, quanto"' + (ro ? " disabled" : "") + ">" : "");
  }
  function listaHtml(b, f, dados, ro) {
    var linhas = Array.isArray(dados[f.id]) ? dados[f.id] : [];
    var semNada = !linhas.some(function (l) { return l && tem(l.nome); });
    var h = '<div class="an2-lista" data-an2-lista="' + esc(b.id + "." + f.id) + '">';
    linhas.forEach(function (l, i) {
      h += '<div class="an2-lista-linha' + ((st && st.meta[chave(b.id, f.id) + "." + i] || {}).previo ? " previo" : "") + '">' + f.colunas.map(function (c) {
        if (f.medida && c[0] === "unidade") {
          return '<input type="text" class="an2-input an2-curto" aria-label="' + esc(c[1]) + " " + (i + 1) + '" data-an2-linha="' + esc(b.id + "." + f.id + "." + i + "." + c[0]) + '" value="' + esc(l[c[0]] !== undefined ? l[c[0]] : (f.padrao || "")) + '" placeholder="unidade"' + (ro ? " disabled" : "") + ">";
        }
        return '<input type="' + (f.medida && c[0] === "valor" ? "text\" inputmode=\"decimal" : "text") + '" class="an2-input' + (c[0] === "nome" ? "" : " an2-curto") + '" aria-label="' + esc(c[1]) + " " + (i + 1) + '" data-an2-linha="' + esc(b.id + "." + f.id + "." + i + "." + c[0]) + '" value="' + esc(l[c[0]] || "") + '" placeholder="' + esc(c[1]) + '"' + (ro ? " disabled" : "") + ">";
      }).join("") + (ro ? "" : '<button type="button" class="an2-tirar" data-an2-tirar="' + esc(b.id + "." + f.id + "." + i) + '" aria-label="Remover ' + esc(f.item || "item") + " " + (i + 1) + '">×</button>') + "</div>";
    });
    if (!ro) h += '<button type="button" class="an2-mais" data-an2-add="' + esc(b.id + "." + f.id) + '">+ Adicionar ' + esc(f.item || "item") + "</button>";
    if (f.nega && semNada) h += '<label class="an2-nega"><input type="checkbox" data-an2-nega="' + esc(b.id + "." + f.id) + '"' + (dados[f.id + "_nega"] ? " checked" : "") + (ro ? " disabled" : "") + "> " + esc(f.nega) + "</label>";
    return h + "</div>";
  }
  function medidaHtml(b, f, dados, ro) {
    var u = dados[f.id + "_unidade"] || f.unidades[0];
    return '<div class="an2-medida"><input type="text" inputmode="decimal" class="an2-input an2-curto" id="an2-' + b.id + "-" + f.id + '" data-an2-campo="' + esc(b.id + "." + f.id) + '" value="' + esc(dados[f.id] || "") + '" placeholder="valor"' + (ro ? " disabled" : "") + ">" +
      (f.unidades.length > 1 ? '<select class="an2-input an2-curto" aria-label="Unidade de ' + esc(f.rotulo) + '" data-an2-campo="' + esc(b.id + "." + f.id + "_unidade") + '"' + (ro ? " disabled" : "") + ">" + f.unidades.map(function (x) { return "<option" + (x === u ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select>"
        : '<span class="an2-unidade">' + esc(f.unidades[0]) + "</span>") + "</div>";
  }
  function campoHtml(b, f, dados, ro) {
    var k = chave(b.id, f.id), m = (st && st.meta[k]) || {}, id = "an2-" + b.id + "-" + f.id;
    // leitura: so o que foi registrado (um campo sem item gerado nao aparece como formulario vazio)
    if (ro && !gerouItem(b, f)) return "";
    var ctrl;
    if (f.tipo === "texto") ctrl = '<input type="text" class="an2-input" id="' + id + '" data-an2-campo="' + esc(k) + '" value="' + esc(dados[f.id] || "") + '"' + (ro ? " disabled" : "") + ">";
    else if (f.tipo === "area") ctrl = '<textarea class="an2-input" rows="2" id="' + id + '" data-an2-campo="' + esc(k) + '"' + (ro ? " disabled" : "") + ">" + esc(dados[f.id] || "") + "</textarea>";
    else if (f.tipo === "chips") ctrl = chipsHtml(b, f, dados, ro);
    else if (f.tipo === "sintoma") ctrl = sintomaHtml(b, f, dados, ro);
    else if (f.tipo === "lista") ctrl = listaHtml(b, f, dados, ro);
    else ctrl = medidaHtml(b, f, dados, ro);
    var semFor = f.tipo === "chips" || f.tipo === "sintoma" || f.tipo === "lista";
    return '<div class="an2-campo an2-t-' + f.tipo + (m.previo ? " previo" : "") + '" data-an2-k="' + esc(k) + '">' +
      (semFor ? '<span class="an2-rot">' + esc(f.rotulo) + "</span>" : '<label class="an2-rot" for="' + id + '">' + esc(f.rotulo) + "</label>") +
      (m.previo ? '<span class="an2-selo-previo" title="Copiado da anamnese anterior; revise">prévio — a revisar</span>' : "") +
      (m.estado && m.estado !== "informado" ? '<span class="an2-selo-estado">' + esc(ROT[m.estado] || m.estado) + "</span>" : "") +
      ctrl + "</div>";
  }
  function gerouItem(b, f) {
    var x = {}; x[b.id] = st.formulario[b.id] || {};
    var dom = gerarDominiosDaAnamneseV2(x, st.meta, st.tipo), k = chave(b.id, f.id);
    return Object.keys(dom).some(function (d) { return dom[d].itens.some(function (it) { return it.chave === k || String(it.chave).indexOf(k + ".") === 0; }); });
  }
  function preenchidos(b) {
    var dom = gerarDominiosDaAnamneseV2((function () { var x = {}; x[b.id] = st.formulario[b.id] || {}; return x; })(), st.meta, st.tipo);
    var n = 0; Object.keys(dom).forEach(function (k) { n += dom[k].itens.length; }); return n;
  }
  function detalhesHtml(b, ctx, ro) {
    var c = contentAtual(), lin = [];
    Object.keys(c.dominios).forEach(function (d) { c.dominios[d].itens.forEach(function (it) { if (String(it.chave || "").split(".")[0] === b.id) lin.push({ d: d, it: it }); }); });
    var linha = ctx.linha || {};
    var auto = '<p class="an2-auditoria">Autoria: ' + esc(ctx.autoria || "a nutricionista desta conta") + " · Consulta: " + esc(ctx.consulta || "") +
      (linha.updated_at ? " · Última gravação: " + esc(dataHora(linha.updated_at)) : " · ainda não gravado") + "</p>";
    if (!lin.length) return '<details class="an2-detalhes"><summary>Detalhes do registro</summary>' + auto + '<p class="an2-vazio">Nenhum item registrado neste bloco.</p></details>';
    return '<details class="an2-detalhes"' + (st.abertos["meta:" + b.id] ? " open" : "") + ' data-an2-meta-bloco="' + esc(b.id) + '"><summary>Detalhes do registro (origem e rastreabilidade)</summary>' + auto +
      '<table class="an2-meta"><thead><tr><th scope="col">Item</th><th scope="col">Estado</th><th scope="col">Fonte</th><th scope="col">Medido</th><th scope="col">Registrado em</th></tr></thead><tbody>' +
      lin.map(function (x) {
        var k = x.it.chave, m = st.meta[k] || {};
        var sel = function (nome, opcoes, val) {
          return ro ? esc(ROT[val] || val) : '<select class="an2-input an2-curto" aria-label="' + nome + " de " + esc(x.it.campo) + '" data-an2-meta="' + esc(k) + '" data-an2-meta-campo="' + (nome === "Estado" ? "estado" : "origem") + '">' +
            opcoes.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
        };
        return "<tr><td>" + esc(x.it.campo) + (x.it.previo ? ' <span class="an2-selo-previo">prévio</span>' : "") + "</td><td>" + sel("Estado", ESTADOS, x.it.estado) + "</td><td>" + sel("Fonte", ORIGENS, x.it.origem) +
          "</td><td>" + (x.it.medida ? "sim · " + esc(String(x.it.medida.valor).replace(".", ",") + " " + x.it.medida.unidade) : "não") + "</td><td>" + esc(m.em ? dataHora(m.em) : (linha.updated_at ? dataHora(linha.updated_at) : "—")) + "</td></tr>";
      }).join("") + "</tbody></table></details>";
  }
  function dataHora(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return String(iso); return (raiz.dataBR ? raiz.dataBR(iso.slice(0, 10)) : iso.slice(0, 10)) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

  function blocoHtml(b, i, ctx, ro) {
    var dados = st.formulario[b.id] || {};
    var normais = b.campos.filter(function (f) { return !f.intimo; }), intimos = b.campos.filter(function (f) { return f.intimo; });
    var n = preenchidos(b), aberto = st.abertos[b.id] !== undefined ? st.abertos[b.id] : (i === 0 || n > 0);
    return '<details class="an2-bloco" data-an2-bloco="' + esc(b.id) + '"' + (aberto ? " open" : "") + '><summary><span class="an2-bloco-n">' + (i + 1) + '</span><span class="an2-bloco-t">' + esc(b.titulo) + '</span><span class="an2-conta">' + (n ? n + (n === 1 ? " registro" : " registros") : "vazio") + "</span></summary>" +
      '<div class="an2-campos">' + normais.map(function (f) { return campoHtml(b, f, dados, ro); }).join("") + "</div>" +
      (b.rotina ? '<div class="an2-cta"><span>Quer aprofundar a rotina?</span><button type="button" class="perf-botao" data-an2-rotina="1">Abrir Mapa da Rotina</button></div>' : "") +
      (intimos.length ? '<details class="an2-intimo" data-an2-intimo="1"' + (st.abertos.intimo ? " open" : "") + '><summary>Campos emocionais e sentido pessoal <small>(opcional, conteúdo íntimo — só entra em relatório com marcação explícita)</small></summary>' +
        '<div class="an2-campos">' + intimos.map(function (f) { return campoHtml(b, f, dados, ro); }).join("") + "</div></details>" : "") +
      detalhesHtml(b, ctx, ro) + "</details>";
  }

  /** Tela de edicao (rascunho) ou leitura (consolidada). ctx vem de anamnese.js. */
  function desenhar(alvo, ctx) {
    var e = ctx.encounter, ro = !!ctx.somenteLeitura;
    if (!ro && (!st || st.eid !== e.id || (ctx.base && ctx.base.id && st.id && ctx.base.id !== st.id && !st.sujo) || ctx.recomecar)) {
      if (!(st && st.eid === e.id && st.sujo)) st = novoEstado(e, ctx.base || null);
      if (!ctx.base && ctx.sugerirRetorno && !st.id && !st.sujo) st.tipo = "retorno";
    }
    if (ro) {
      /* leitura (consolidada ou historico): desenha com um estado temporario; o rascunho em edicao (se houver) fica intacto */
      var guardado = st, leitura = Object.assign(novoEstado(e, ctx.base), { somente: true });
      if (guardado && guardado.eid === e.id) leitura.abertos = guardado.abertos;
      st = leitura;
      try { desenharCorpo(alvo, ctx, true); } finally { st = guardado; }
      return;
    }
    desenharCorpo(alvo, ctx, false);
  }
  function desenharCorpo(alvo, ctx, ro) {
    var html = "";
    if (!ro) {
      html += '<div class="an2-tipo" role="radiogroup" aria-label="Tipo de anamnese">' +
        [["primeira", "Primeira consulta"], ["retorno", "Retorno"]].map(function (t) {
          var on = st.tipo === t[0];
          return '<button type="button" role="radio" class="an2-tipo-btn' + (on ? " on" : "") + '" aria-checked="' + on + '" data-an2-tipo="' + t[0] + '">' + esc(t[1]) +
            (t[0] === "retorno" && ctx.sugerirRetorno ? ' <small class="an2-sugerido">sugerido</small>' : "") + "</button>";
        }).join("") + "</div>";
      if (st.tipo === "primeira" && ctx.anterior && !st.id && !st.sujo && !st.corrigeDe) {
        html += '<div class="an2-cta"><span>Já existe uma anamnese concluída deste paciente.</span><button type="button" class="perf-botao" data-an-acao="copiar" data-an-fonte="' + esc(ctx.anterior.id) + '">Criar a partir da anamnese anterior</button></div>';
      }
      if (st.tipo === "retorno" && ctx.anterior) {
        html += '<details class="an2-anterior"><summary>Ver anamnese completa anterior</summary><div class="an2-anterior-corpo">' + (ctx.anteriorHtml || "") + "</div></details>";
      }
      if (st.copiado) html += '<p class="an-titulo"><span class="an-selo previo">criada a partir da anamnese anterior — itens prévios precisam ser revisados</span></p>';
    }
    var blocos = blocosDe(st.tipo);
    html += '<div class="an2-form" data-an2-form="1">' + blocos.map(function (b, i) { return blocoHtml(b, i, ctx, ro); }).join("") + "</div>";
    html += '<section class="an2-resumo-caixa" aria-labelledby="an2-t-resumo"><h4 id="an2-t-resumo">Resumo da anamnese</h4><p class="an2-nota">Organização automática do que foi registrado — não é interpretação clínica.</p>' + resumoHtml(contentAtual(), esc) + "</section>";
    if (!ro) {
      html += '<div class="an2-rodape"><span class="an2-estado" id="an2-estado" role="status" aria-live="polite"></span>' +
        '<button type="button" class="btn-fantasma" id="an2-tentar" hidden data-an2-acao="tentar">Tentar novamente</button>' +
        (st.corrigeDe ? '<button type="button" class="btn-fantasma" data-an-acao="descartar">Descartar correção</button>' : "") +
        '<button type="button" class="btn-verde" data-an2-acao="concluir">Concluir anamnese</button></div>';
    }
    alvo.innerHTML = html;
    pintarEstado();
    if (!relogio) relogio = setInterval(function () { if (st && st.estado === "salvo") pintarEstado(); }, 5000);
  }

  /* ---------- edicao ------------------------------------------------------------ */
  function lerCampo(el) {
    var p = el.dataset.an2Campo.split("."), b = p[0], c = p[1];
    st.formulario[b] = st.formulario[b] || {};
    st.formulario[b][c] = el.value;
    tocarMeta(chave(b, c.replace(/_(outro|detalhe|unidade)$/, "")));
  }
  function tocarMeta(k) {
    var m = st.meta[k] || {};
    m.em = new Date().toISOString();
    if (m.previo) { delete m.previo; delete m.fonte_anamnese_id; }
    st.meta[k] = m;
  }
  function sujar() {
    st.sujo = true; if (st.estado !== "salvando") st.estado = "";
    pintarEstado();
    clearTimeout(timer); timer = setTimeout(function () { salvarRascunho(); }, 2500);
  }
  var ctxAtual = null;
  function salvarRascunho() {
    clearTimeout(timer);
    if (!st || st.somente || !st.sujo || !ctxAtual) return Promise.resolve(null);
    if (st.concluindo) return Promise.resolve(null);   // a conclusao grava tudo de uma vez
    if (st.salvando) { st.pendente = true; return Promise.resolve(null); }
    if (st.estado === "conflito") return Promise.resolve(null);
    var content = contentAtual();
    if (problemas(content).length) { st.estado = "falha"; pintarEstado(); var el = document.getElementById("an2-estado"); if (el) el.textContent = problemas(content)[0]; return Promise.resolve(null); }
    st.salvando = true; st.estado = "salvando"; st.sujo = false; pintarEstado();
    var payload = { id: st.id || st.corrigeDe || null, encounter_id: st.eid, content: content, status: "rascunho" };
    if (st.id && st.updated_at) payload.expected_updated_at = st.updated_at;
    if (st.copiadoDe) { payload.source_anamnesis_id = st.copiadoDe; payload.copied_from_previous = true; }
    var voo = ctxAtual.salvar(payload).then(function (linha) {
      st.salvando = false;
      if (linha && linha.id) { st.id = linha.id; st.updated_at = linha.updated_at; st.corrigeDe = null; st.copiadoDe = null; }
      st.estado = "salvo"; st.salvoEm = Date.now(); pintarEstado();
      if (st.pendente || st.sujo) { st.pendente = false; st.sujo = true; return salvarRascunho(); }
      return linha;
    }, function (err) {
      st.salvando = false; st.sujo = true;
      st.estado = /conflito|alterada em outro lugar|outra sess/i.test((err && (err.message + " " + (err.hint || ""))) || "") ? "conflito" : "falha";
      pintarEstado();
      return null;
    });
    st.voo = voo;
    return voo;
  }
  /* espera a gravacao automatica em andamento (e a que ela encadear) terminar */
  function esperarGravacao() {
    if (!st || !st.salvando || !st.voo) return Promise.resolve();
    return st.voo.then(esperarGravacao, esperarGravacao);
  }
  function concluir() {
    clearTimeout(timer);
    if (!st || st.concluindo) return Promise.resolve(null);
    var content = contentAtual();
    var probs = problemas(content);
    if (probs.length) { if (raiz.avisar) raiz.avisar(probs[0]); return Promise.resolve(null); }
    var n = 0; Object.keys(content.dominios).forEach(function (k) { n += content.dominios[k].itens.length; });
    if (!n) { if (raiz.avisar) raiz.avisar("Preencha ao menos um campo antes de concluir a anamnese."); return Promise.resolve(null); }
    if (st.estado === "conflito") { if (raiz.avisar) raiz.avisar("A anamnese mudou em outra sessão: recarregue antes de concluir."); return Promise.resolve(null); }
    // Concluir logo depois de digitar: a gravacao automatica (ao sair do campo) pode estar em andamento.
    // Espera ela terminar para mandar o updated_at novo; enquanto isso, nenhuma outra gravacao comeca.
    var ctx = ctxAtual, est = st;
    st.concluindo = true;
    st.estado = "salvando"; pintarEstado();
    return esperarGravacao().then(function () {
      if (st !== est) return null;
      if (st.estado === "conflito") {
        st.concluindo = false; pintarEstado();
        if (raiz.avisar) raiz.avisar("A anamnese mudou em outra sessão: recarregue antes de concluir.");
        return null;
      }
      var payload = { id: st.id || st.corrigeDe || null, encounter_id: st.eid, content: contentAtual(), status: "salvo" };
      if (st.id && st.updated_at) payload.expected_updated_at = st.updated_at;
      if (st.copiadoDe) { payload.source_anamnesis_id = st.copiadoDe; payload.copied_from_previous = true; }
      st.estado = "salvando"; pintarEstado();
      return ctx.salvar(payload).then(function (linha) {
        st = null;
        if (raiz.avisar) raiz.avisar("Anamnese concluída (rev. " + (linha && linha.revision_number) + ").");
        ctx.redesenhar();
        return linha;
      }, function (err) {
        if (st === est) {
          st.concluindo = false;
          st.estado = /conflito|alterada em outro lugar|outra sess/i.test((err && (err.message + " " + (err.hint || ""))) || "") ? "conflito" : "falha"; pintarEstado();
        }
        if (raiz.avisar) raiz.avisar(raiz.mensagemHumana ? raiz.mensagemHumana(err) : "Não foi possível concluir a anamnese.");
        return null;
      });
    });
  }

  function ligar(alvo) {
    if (alvo.dataset.an2Ligado) return;
    alvo.dataset.an2Ligado = "1";
    alvo.addEventListener("input", function (ev) {
      if (!st || st.somente) return;
      var t = ev.target;
      if (t.dataset.an2Campo) { lerCampo(t); sujar(); }
      else if (t.dataset.an2Linha) {
        var p = t.dataset.an2Linha.split("."), b = p[0], c = p[1], i = Number(p[2]), col = p[3];
        var l = ((st.formulario[b] = st.formulario[b] || {})[c] = st.formulario[b][c] || [])[i] = st.formulario[b][c][i] || {};
        l[col] = t.value; tocarMeta(chave(b, c) + "." + i); sujar();
      }
    });
    alvo.addEventListener("change", function (ev) {
      if (!st || st.somente) return;
      var t = ev.target;
      if (t.dataset.an2Campo && t.tagName === "SELECT") { lerCampo(t); sujar(); return; }
      if (t.dataset.an2Nega) { var p = t.dataset.an2Nega.split("."); (st.formulario[p[0]] = st.formulario[p[0]] || {})[p[1] + "_nega"] = t.checked; tocarMeta(t.dataset.an2Nega); sujar(); return; }
      if (t.dataset.an2Meta) {
        var m = st.meta[t.dataset.an2Meta] = st.meta[t.dataset.an2Meta] || {};
        m[t.dataset.an2MetaCampo] = t.value; m.em = new Date().toISOString();
        st.abertos["meta:" + t.dataset.an2Meta.split(".")[0]] = true;
        sujar(); ctxAtual.redesenhar(); return;
      }
    });
    // salvar ao sair do campo
    alvo.addEventListener("focusout", function (ev) {
      if (!st || st.somente || !st.sujo) return;
      if (ev.target && (ev.target.dataset.an2Campo || ev.target.dataset.an2Linha)) salvarRascunho();
    });
    // salvar ao trocar de bloco
    alvo.addEventListener("toggle", function (ev) {
      if (!st) return;
      var d = ev.target;
      if (d.dataset && d.dataset.an2Bloco) { st.abertos[d.dataset.an2Bloco] = d.open; if (st.sujo) salvarRascunho(); }
      if (d.dataset && d.dataset.an2Intimo) st.abertos.intimo = d.open;
      if (d.dataset && d.dataset.an2MetaBloco) st.abertos["meta:" + d.dataset.an2MetaBloco] = d.open;
    }, true);
    alvo.addEventListener("click", function (ev) {
      if (!st) return;
      var t = ev.target.closest("button, [data-an2-rotina]"); if (!t || t.disabled) return;
      if (t.dataset.an2Rotina) { if (st.sujo) salvarRascunho(); if (raiz.abrirFerramentaPorId) { var r = raiz.abrirFerramentaPorId((raiz.FERRAMENTAS_ATIVAS || []).filter(function (x) { return /^mapa_rotina/.test(x); })[0] || "mapa_rotina"); void r; } return; }
      if (st.somente) return;
      if (t.dataset.an2Tipo) {
        if (t.dataset.an2Tipo === st.tipo) return;
        var temDados = Object.keys(contentAtual().dominios).length > 0;
        var trocar = function () { st.tipo = t.dataset.an2Tipo; if (st.id || temDados) sujar(); ctxAtual.redesenhar(); };
        if (temDados && raiz.abrirModalConfirmar) {
          raiz.abrirModalConfirmar({ titulo: "Trocar o tipo de anamnese", corpo: "<p>Os campos já preenchidos do tipo atual <b>não entram</b> no registro do outro tipo.</p>", botaoConfirmar: "Trocar" })
            .then(function (r2) { if (r2 === "confirmar") trocar(); });
        } else trocar();
        return;
      }
      if (t.dataset.an2Chip) {
        var p = t.dataset.an2Chip.split("."), b = p[0], c = p[1], v = t.dataset.valor;
        var dados = st.formulario[b] = st.formulario[b] || {};
        if (t.dataset.multi) {
          var lst = Array.isArray(dados[c]) ? dados[c].slice() : [];
          var i = lst.indexOf(v); if (i >= 0) lst.splice(i, 1); else lst.push(v);
          dados[c] = lst;
        } else dados[c] = dados[c] === v ? null : v;
        tocarMeta(chave(b, c)); sujar(); ctxAtual.redesenhar(); focar('[data-an2-chip="' + t.dataset.an2Chip + '"][data-valor="' + v + '"]');
        return;
      }
      if (t.dataset.an2Detalhar) { st.abertos["det:" + t.dataset.an2Detalhar] = true; ctxAtual.redesenhar(); focar('[data-an2-campo="' + t.dataset.an2Detalhar + '_detalhe"]'); return; }
      if (t.dataset.an2Add) {
        var q = t.dataset.an2Add.split("."), dd = st.formulario[q[0]] = st.formulario[q[0]] || {};
        var linhas = Array.isArray(dd[q[1]]) ? dd[q[1]] : (dd[q[1]] = []);
        linhas.push({}); ctxAtual.redesenhar(); focar('[data-an2-linha="' + q[0] + "." + q[1] + "." + (linhas.length - 1) + '.nome"]');
        return;
      }
      if (t.dataset.an2Tirar) {
        var r3 = t.dataset.an2Tirar.split("."), arr = (st.formulario[r3[0]] || {})[r3[1]] || [];
        var idx = Number(r3[2]); arr.splice(idx, 1);
        // a meta das linhas segue a posicao
        var base = chave(r3[0], r3[1]) + ".", novo = {};
        Object.keys(st.meta).forEach(function (k) { if (k.indexOf(base) === 0) { var j = Number(k.slice(base.length)); if (j < idx) novo[k] = st.meta[k]; else if (j > idx) novo[base + (j - 1)] = st.meta[k]; } else novo[k] = st.meta[k]; });
        st.meta = novo; sujar(); ctxAtual.redesenhar(); return;
      }
      if (t.dataset.an2Acao === "concluir") { concluir(); return; }
      if (t.dataset.an2Acao === "tentar") { if (st.estado === "conflito") { st = null; ctxAtual.recarregar(); return; } st.estado = ""; st.sujo = true; salvarRascunho(); return; }
    });
  }
  function focar(sel) { setTimeout(function () { var el = document.querySelector("#aba-anamnese " + sel); if (el) el.focus(); }, 0); }

  /** Copia de uma anamnese V2 consolidada para um rascunho novo: cada campo vira previo a revisar. */
  function prepararCopia(e, fonte) {
    st = novoEstado(e, null);
    st.tipo = "primeira";
    var c = fonte.content || {};
    st.formulario = JSON.parse(JSON.stringify(c.formulario || {}));
    Object.keys(st.formulario).forEach(function (k) { if (k === "retorno") delete st.formulario[k]; });
    var dom = gerarDominiosDaAnamneseV2(st.formulario, c.meta || {}, "primeira");
    st.meta = {};
    Object.keys(dom).forEach(function (d) { dom[d].itens.forEach(function (it) {
      var antigo = (c.meta || {})[it.chave] || {};
      st.meta[it.chave] = Object.assign({}, antigo, { previo: true, fonte_anamnese_id: fonte.id });
    }); });
    st.copiado = true; st.copiadoDe = fonte.id; st.sujo = true;
    return salvarRascunho();
  }

  /** Pre-consulta (09/10): a resposta que a PACIENTE enviou pelo link vira um RASCUNHO V2 deste atendimento, para a
      nutricionista revisar. Cada campo leva origem relato_paciente e a referencia do convite; peso/altura informados
      pela paciente NAO viram dado_medido; "Prefiro nao responder" vira estado recusado. O convite nao muda. */
  function prepararDePreConsulta(e, convite) {
    var env = (convite && convite.submitted_content) || {};
    st = novoEstado(e, null);
    st.tipo = env.tipo === "retorno" ? "retorno" : "primeira";
    var f = JSON.parse(JSON.stringify(env.formulario || {})), meta = {};
    var marca = { origem: "relato_paciente", pre_consulta: convite.id };
    blocosDe(st.tipo).forEach(function (b) {
      var d = f[b.id]; if (!d) return;
      b.campos.forEach(function (c) {
        var k = chave(b.id, c.id);
        if (d[c.id + "_prefiro_nao"] === true) { meta[k] = Object.assign({}, marca, { estado: "recusado" }); delete d[c.id]; }
        delete d[c.id + "_prefiro_nao"];
        if (c.tipo === "lista") (Array.isArray(d[c.id]) ? d[c.id] : []).forEach(function (l, i) { meta[k + "." + i] = Object.assign({}, marca); });
        else if (tem(d[c.id]) || d[c.id + "_nega"] === true) meta[k] = Object.assign({}, meta[k] || {}, marca);
      });
    });
    st.formulario = f; st.meta = meta; st.sujo = true; st.preConsulta = convite.id;
    return salvarRascunho().then(function (linha) { return linha || (st && st.id ? { id: st.id } : null); });
  }

  raiz.AnamneseV2 = {
    prepararDePreConsulta: function (ctx, e, convite) { ctxAtual = ctx; return prepararDePreConsulta(e, convite); },
    VERSAO: VERSAO, BLOCOS_PRIMEIRA: BLOCOS_PRIMEIRA, BLOCOS_RETORNO: BLOCOS_RETORNO,
    ehV2: ehV2, gerarDominiosDaAnamneseV2: gerarDominiosDaAnamneseV2, montarContent: montarContent, problemas: problemas,
    resumo: resumo, resumoHtml: function (c) { return resumoHtml(c, esc); },
    desenhar: function (alvo, ctx) { ctxAtual = ctx; ligar(alvo); desenhar(alvo, ctx); },
    prepararCopia: function (ctx, e, fonte) { ctxAtual = ctx; return prepararCopia(e, fonte); },
    salvarAgora: function () { return salvarRascunho(); },
    temPendencia: function () { return !!(st && (st.sujo || st.salvando)); },
    esquecer: function () { clearTimeout(timer); st = null; },
    estado: function () { return st ? { tipo: st.tipo, id: st.id, sujo: st.sujo, estado: st.estado, salvando: st.salvando } : null }
  };
})();
