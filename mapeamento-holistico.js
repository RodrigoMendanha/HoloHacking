/* ===========================================================================
   MAPEAMENTO HOLISTICO DA SAUDE — o que o paciente responde (enxuto, 12/10)
   ===========================================================================

   Fonte UNICA das etapas, perguntas e regras do Mapeamento: a pagina do
   paciente (anamnese-publica.js) e a ficha (anamnese-convite.js) usam este
   arquivo, entao a nutricionista le exatamente as perguntas que o paciente
   viu. As chaves sao as da Anamnese V2 (bloco.campo): "Levar para o
   atendimento" leva tudo para o rascunho profissional sem traducao.

   Principio: o Mapeamento e CONTEXTO antes da consulta. Nao e um segundo
   HOLOSCAN: sinais aparecem como TRIAGEM (presenca e qual incomoda mais), sem
   a escala Nunca/As vezes/Frequente/Sempre, sem score e sem alimentar sistemas,
   Indice ou Triade. Pouca digitacao, muito toque: selecao, chips e perguntas
   condicionais (o campo de texto so aparece quando a resposta pede).

   Nada aqui interpreta, pontua ou conclui. Medidas, exames e observacoes
   fisicas nao entram (sao da nutricionista, no atendimento).
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;

  /* Etapas. "campos": "campo" (do bloco da etapa) ou "bloco.campo"; { secao } abre um subtitulo. */
  var ETAPAS_PRIMEIRA = [
    { bloco: "motivo", titulo: "O que te traz aqui", intro: "Para a sua nutricionista entender o que você busca.",
      campos: ["motivos", "objetivo", "acomp_anterior", "acomp_experiencia"] },
    { bloco: "alimentar", titulo: "Alimentação e sinais que você percebe", intro: "Toque nas opções que combinam com você. Pode marcar mais de uma quando indicado.",
      campos: ["padrao", "dificuldades", "fome_percebida", "saude.sinais", "saude.sinal_principal", "saude.sinal_relacao", "saude.sinal_relacao_obs", "agua"] },
    { bloco: "saude", titulo: "Sua saúde e seus cuidados atuais", intro: "O que já foi informado por profissionais e o que você usa hoje.",
      campos: ["condicoes_tem", "condicoes", "cirurgias_tem", "cirurgias", "restricoes.medicamentos", "restricoes.suplementos",
        "restricoes.alergias", "restricoes.intolerancias", "restricoes.evita_tem", "restricoes.evita_desconforto"] },
    { bloco: "estilo", titulo: "Sono, hábitos e rotina", intro: "Como é a sua vida prática no dia a dia.",
      campos: ["dorme", "acorda", "previsibilidade", "trabalho_tipo", "atividade", "alimentar.alcool", "tabagismo", "dificulta_opcoes", "funciona_tem", "funciona"] },
    { bloco: "contexto", titulo: "Seu momento atual", intro: "Só o essencial. Tudo aqui é opcional.",
      campos: ["mudanca_tem", "mudancas_vida", "apoio_nivel", "pessoal_tem", "pessoal"] }
  ];
  var ETAPAS_RETORNO = [{ bloco: "retorno", titulo: "Desde a última consulta", intro: "Toque no que combina com você. Escreva só se quiser detalhar.",
    campos: ["melhorou_opcoes", "melhorou", "piorou_opcoes", "piorou", "praticou_nivel", "praticou", "nao_praticou", "facilitou_opcoes", "dificultou_opcoes",
      "mudanca_geral", "mudanca_obs", "med_sup_mudou", "medicamento", "nova_questao_tem", "nova_questao"] }];

  /* campo aberto final, na tela de revisar e enviar */
  var FINAL = { primeira: { bloco: "contexto", campo: "obs" }, retorno: { bloco: "retorno", campo: "obs" } };
  var TXT_FINAL = "Existe algo importante que não perguntamos e que você gostaria que sua nutricionista soubesse?";

  /* Perguntas para o paciente (a chave continua a mesma da V2). */
  var ROTULO = {
    "motivo.motivos": "Qual é o principal motivo para buscar acompanhamento?",
    "motivo.objetivo": "O que você mais gostaria de melhorar neste momento?",
    "motivo.acomp_anterior": "Você já fez acompanhamento nutricional antes?",
    "motivo.acomp_experiencia": "Quer contar algo sobre essa experiência?",
    "alimentar.padrao": "Como sua alimentação acontece na maior parte dos dias?",
    "alimentar.dificuldades": "Quais são hoje suas principais dificuldades com a alimentação?",
    "alimentar.fome_percebida": "Como você percebe sua fome atualmente?",
    "saude.sinais": "O que você tem percebido no seu corpo ultimamente?",
    "saude.sinal_principal": "Qual desses sinais mais incomoda você hoje?",
    "saude.sinal_relacao": "Você percebe alguma relação desse desconforto com alimentação ou refeições?",
    "saude.sinal_relacao_obs": "Se quiser, conte brevemente o que percebe.",
    "alimentar.agua": "Quanto de água você costuma beber por dia?",
    "saude.condicoes_tem": "Algum profissional de saúde já informou que você possui alguma condição ou diagnóstico?",
    "saude.condicoes": "Qual condição ou diagnóstico?",
    "saude.cirurgias_tem": "Já realizou alguma cirurgia?",
    "saude.cirurgias": "Qual e quando?",
    "restricoes.medicamentos": "Medicamentos que usa",
    "restricoes.suplementos": "Suplementos que usa",
    "restricoes.alergias": "Possui alguma alergia conhecida ou diagnosticada?",
    "restricoes.intolerancias": "Possui alguma intolerância conhecida?",
    "restricoes.evita_tem": "Existe algum alimento que você evita porque percebe desconforto?",
    "restricoes.evita_desconforto": "Qual alimento e o que você costuma perceber?",
    "estilo.dorme": "Que horas costuma dormir?",
    "estilo.acorda": "Que horas costuma acordar?",
    "estilo.previsibilidade": "Como seus dias costumam ser?",
    "estilo.trabalho_tipo": "Seu trabalho ou atividade principal acontece principalmente em:",
    "estilo.atividade": "Você pratica atividade física atualmente?",
    "alimentar.alcool": "Com que frequência costuma consumir bebida alcoólica?",
    "estilo.tabagismo": "Em relação ao cigarro/tabaco:",
    "estilo.dificulta_opcoes": "O que mais dificulta cuidar de você hoje?",
    "estilo.funciona_tem": "Existe algo na sua rotina que funciona bem e você gostaria de preservar?",
    "estilo.funciona": "Se quiser, conte o que funciona.",
    "contexto.mudanca_tem": "Aconteceu alguma mudança importante na sua vida recentemente?",
    "contexto.mudancas_vida": "Se quiser, conte brevemente.",
    "contexto.apoio_nivel": "Você sente que tem apoio para cuidar da sua saúde neste momento?",
    "contexto.pessoal_tem": "Existe alguma questão pessoal que você considera importante que sua nutricionista saiba antes da consulta?",
    "contexto.pessoal": "Se quiser, conte um pouco.",
    "contexto.obs": TXT_FINAL,
    "retorno.melhorou_opcoes": "O que melhorou desde a última consulta?",
    "retorno.melhorou": "Quer detalhar o que melhorou?",
    "retorno.piorou_opcoes": "O que piorou?",
    "retorno.piorou": "Quer detalhar o que piorou?",
    "retorno.praticou_nivel": "Quanto você conseguiu colocar em prática?",
    "retorno.praticou": "O que você conseguiu colocar em prática?",
    "retorno.nao_praticou": "O que você não conseguiu colocar em prática?",
    "retorno.facilitou_opcoes": "O que facilitou?",
    "retorno.dificultou_opcoes": "O que dificultou?",
    "retorno.mudanca_geral": "Houve alguma mudança importante na alimentação, rotina ou sintomas?",
    "retorno.mudanca_obs": "Qual mudança?",
    "retorno.med_sup_mudou": "Houve mudança em medicamentos ou suplementos?",
    "retorno.medicamento": "O que mudou?",
    "retorno.nova_questao_tem": "Apareceu alguma questão nova desde o último encontro?",
    "retorno.nova_questao": "Qual questão?",
    "retorno.obs": "Existe algo mais que gostaria que sua nutricionista soubesse?"
  };

  /* Regras de cada campo na tela do paciente:
       se        so aparece quando outra resposta pede ({ campo, igual } | { campo, inclui } | { campo, algum, exceto })
       max       limite de opcoes marcadas
       exclusivo opcao que desmarca as outras (e e desmarcada por elas)
       opcoesDe  as opcoes sao as marcadas em outro campo (sem a exclusiva)
       opcoes    opcoes mostradas ao paciente, na ordem: [valor gravado, texto] (as antigas continuam valendo no registro)
       curto     campo de uma linha (em vez de caixa de texto)
       hora      relogio (hh:mm)
       outro     texto da opcao "Outro" quando ela abre o campo curto */
  var NENHUM = "Não tenho percebido nenhum desses";
  var REGRAS = {
    "motivo.motivos": { outro: "Qual motivo?" },
    "motivo.objetivo": { curto: true },
    "motivo.acomp_experiencia": { se: { campo: "motivo.acomp_anterior", algum: true, exceto: ["Nunca"] }, curto: true },
    "alimentar.dificuldades": { max: 3, outro: "Qual dificuldade?", opcoes: [["Falta de tempo"], ["Falta de organização"], ["Vontade de doces"], ["Fome muito intensa"], ["Beliscar"],
      ["Comer à noite"], ["Comer fora / delivery"], ["Finais de semana"], ["Dificuldade para manter mudanças"], ["Falta de apoio"], ["Não saber o que fazer"], ["Outro", "Outra"]] },
    "saude.sinais": { exclusivo: NENHUM, ajuda: "Pode marcar mais de uma opção." },
    "saude.sinal_principal": { se: { campo: "saude.sinais", algum: true, exceto: [NENHUM] }, opcoesDe: "saude.sinais" },
    "saude.sinal_relacao": { se: { campo: "saude.sinais", algum: true, exceto: [NENHUM] } },
    "saude.sinal_relacao_obs": { se: { campo: "saude.sinal_relacao", igual: "Sim" }, curto: true },
    "alimentar.agua": { opcoes: [["Menos de 1 L", "Menos de 1 litro"], ["1–2 L", "Entre 1 e 2 litros"], ["Mais de 2 L", "Mais de 2 litros"], ["Não sei dizer"]] },
    "saude.condicoes": { se: { campo: "saude.condicoes_tem", igual: "Sim" }, curto: true },
    "saude.cirurgias": { se: { campo: "saude.cirurgias_tem", igual: "Sim" }, curto: true },
    "restricoes.evita_desconforto": { se: { campo: "restricoes.evita_tem", igual: "Sim" }, curto: true },
    "estilo.dorme": { hora: true, par: "estilo.acorda" },
    "estilo.acorda": { hora: true },
    "estilo.trabalho_tipo": { outro: "Qual?" },
    "estilo.atividade": { opcoes: [["Não pratica", "Não"], ["1–2x/semana", "1 a 2 vezes por semana"], ["3–4x/semana", "3 a 4 vezes por semana"], ["5+x/semana", "5 ou mais vezes por semana"]] },
    "alimentar.alcool": { opcoes: [["Não consome", "Não consumo"], ["Ocasional", "Ocasionalmente"], ["1–2x/semana", "1 a 2 vezes por semana"], ["3+x/semana", "3 ou mais vezes por semana"]] },
    "estilo.tabagismo": { opcoes: [["Não fuma", "Nunca fumei"], ["Ex-fumante", "Sou ex-fumante"], ["Fuma", "Fumo atualmente"]] },
    "estilo.dificulta_opcoes": { max: 2, outro: "O que mais?", opcoes: [["Tempo"], ["Trabalho"], ["Cansaço"], ["Filhos / família"], ["Organização"], ["Questões financeiras"], ["Saúde"], ["Falta de apoio"], ["Outro", "Outra"]] },
    "estilo.funciona": { se: { campo: "estilo.funciona_tem", igual: "Sim" }, curto: true },
    "contexto.mudancas_vida": { se: { campo: "contexto.mudanca_tem", igual: "Sim" }, curto: true },
    "contexto.pessoal": { se: { campo: "contexto.pessoal_tem", igual: "Sim" } },
    "retorno.melhorou_opcoes": { exclusivo: "Nada mudou ainda", outro: "O quê?" },
    "retorno.melhorou": { se: { campo: "retorno.melhorou_opcoes", algum: true, exceto: ["Nada mudou ainda"] }, curto: true },
    "retorno.piorou_opcoes": { exclusivo: "Nada mudou ainda", outro: "O quê?" },
    "retorno.piorou": { se: { campo: "retorno.piorou_opcoes", algum: true, exceto: ["Nada mudou ainda"] }, curto: true },
    "retorno.praticou": { curto: true },
    "retorno.nao_praticou": { curto: true },
    "retorno.facilitou_opcoes": { outro: "O quê?" },
    "retorno.dificultou_opcoes": { outro: "O quê?" },
    "retorno.mudanca_geral": { exclusivo: "Nenhuma mudança importante" },
    "retorno.mudanca_obs": { se: { campo: "retorno.mudanca_geral", algum: true, exceto: ["Nenhuma mudança importante"] }, curto: true },
    "retorno.medicamento": { se: { campo: "retorno.med_sup_mudou", igual: "Sim" }, curto: true },
    "retorno.nova_questao": { se: { campo: "retorno.nova_questao_tem", igual: "Sim" }, curto: true }
  };
  /* campos sensiveis: opcionais, com "Prefiro nao responder" */
  var SENSIVEIS = { "estilo.tabagismo": true, "contexto.mudanca_tem": true, "contexto.apoio_nivel": true, "contexto.pessoal_tem": true };
  var TXT_SENSIVEL = "Opcional. Responda só se quiser.";

  function blocosDe(tipo) { var V2 = raiz.AnamneseV2; return V2 ? (tipo === "retorno" ? V2.BLOCOS_RETORNO : V2.BLOCOS_PRIMEIRA) : []; }
  function etapasDe(tipo) { return tipo === "retorno" ? ETAPAS_RETORNO : ETAPAS_PRIMEIRA; }
  function blocoDef(tipo, id) { return blocosDe(tipo).filter(function (b) { return b.id === id; })[0]; }
  function campoDef(tipo, b, id) { var bl = blocoDef(tipo, b); return bl ? bl.campos.filter(function (f) { return f.id === id; })[0] || null : null; }
  function regra(b, id) { return REGRAS[b + "." + id] || {}; }
  /** campos de uma etapa, na ordem: { b, f, r } (ou { secao }) */
  function camposDa(tipo, et) {
    return (et.campos || []).map(function (c) {
      if (typeof c !== "string") return c;
      var b = c.indexOf(".") > 0 ? c.split(".")[0] : et.bloco, id = c.indexOf(".") > 0 ? c.split(".")[1] : c;
      var f = campoDef(tipo, b, id);
      return f ? { b: b, f: f, r: regra(b, id) } : null;
    }).filter(Boolean);
  }
  function rotuloDe(b, f) { return ROTULO[b + "." + f.id] || f.rotulo; }
  function tem(v) { return v !== null && v !== undefined && (typeof v !== "string" || v.trim() !== "") && (!Array.isArray(v) || v.length > 0); }
  function valorDe(form, chave) { var p = chave.split("."); return (form[p[0]] || {})[p[1]]; }
  /** a pergunta aparece? (condicional) */
  function visivel(form, b, f) {
    var se = regra(b, f.id).se; if (!se) return true;
    var v = valorDe(form, se.campo);
    if (se.igual !== undefined) return v === se.igual;
    if (se.inclui !== undefined) return Array.isArray(v) ? v.indexOf(se.inclui) >= 0 : v === se.inclui;
    if (se.algum) { var l = Array.isArray(v) ? v : (tem(v) ? [v] : []); return l.some(function (x) { return (se.exceto || []).indexOf(x) < 0; }); }
    return true;
  }
  /** as opcoes que o paciente ve: [[valor, texto]] */
  function opcoesDe(form, b, f) {
    var r = regra(b, f.id);
    if (r.opcoesDe) {
      var marc = valorDe(form, r.opcoesDe); marc = Array.isArray(marc) ? marc : [];
      var ex = (REGRAS[r.opcoesDe] || {}).exclusivo;
      return marc.filter(function (x) { return x !== ex; }).map(function (x) { return [x, x]; });
    }
    if (r.opcoes) return r.opcoes.map(function (o) { return [o[0], o[1] || o[0]]; });
    return (f.opcoes || []).map(function (o) { return [o, o]; });
  }
  function textoOpcao(b, f, v) {
    var r = regra(b, f.id);
    var o = (r.opcoes || []).filter(function (x) { return x[0] === v; })[0];
    return o ? (o[1] || o[0]) : v;
  }
  /** a resposta de um campo como texto (o que o paciente marcou ou escreveu) */
  function valorTexto(f, d, b) {
    var v = d[f.id];
    if (d[f.id + "_prefiro_nao"] === true) return "Prefiro não responder";
    if (f.tipo === "chips") {
      var l = Array.isArray(v) ? v : (tem(v) ? [v] : []);
      return l.map(function (x) { return x === "Outro" && tem(d[f.id + "_outro"]) ? textoOpcao(b, f, x) + ": " + String(d[f.id + "_outro"]).trim() : textoOpcao(b, f, x); }).join(", ");
    }
    if (f.tipo === "sintoma") return v ? ({ nao: "Não", as_vezes: "Às vezes", frequente: "Frequente" }[v] || "") + (tem(d[f.id + "_detalhe"]) ? " — " + d[f.id + "_detalhe"] : "") : "";
    if (f.tipo === "medida") return tem(v) ? v + " " + (d[f.id + "_unidade"] || f.unidades[0]) : "";
    if (f.tipo === "lista") {
      var li = (Array.isArray(v) ? v : []).filter(function (x) { return x && tem(x.nome); });
      if (!li.length && d[f.id + "_nega"] === true) return "Não";
      return li.map(function (x) { return f.colunas.map(function (c) { return x[c[0]]; }).filter(tem).join(" · "); }).join("\n");
    }
    return v || "";
  }
  /** limpa respostas que nao valem mais (condicional fechada, sinal principal desmarcado) — so do rascunho do paciente */
  function limparForm(form, tipo) {
    var f2 = JSON.parse(JSON.stringify(form || {}));
    etapasDe(tipo).forEach(function (et) {
      camposDa(tipo, et).forEach(function (c) {
        if (c.secao || !c.r.se) return;
        if (!visivel(f2, c.b, c.f)) { var d = f2[c.b]; if (d) { delete d[c.f.id]; delete d[c.f.id + "_outro"]; delete d[c.f.id + "_prefiro_nao"]; } }
      });
    });
    var sp = valorDe(f2, "saude.sinal_principal");
    if (sp && f2.saude) { var s = f2.saude.sinais; if (!Array.isArray(s) || s.indexOf(sp) < 0) delete f2.saude.sinal_principal; }
    return f2;
  }

  /** A resposta ENVIADA, completa e organizada pelas etapas que o paciente viu. So o que foi respondido aparece.
      Respostas de campos que nao estao mais no formulario (versoes anteriores) aparecem em "Outras respostas": nada se perde. */
  function respostaHtml(conteudo, esc) {
    esc = esc || function (x) { return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
    var tipo = conteudo && conteudo.tipo === "retorno" ? "retorno" : "primeira";
    var form = (conteudo && conteudo.formulario) || {};
    var vistos = {};
    var item = function (rot, txt) { return '<div class="mh-item"><dt>' + esc(rot) + "</dt><dd>" + esc(txt).replace(/\n/g, "<br>") + "</dd></div>"; };
    var html = etapasDe(tipo).map(function (et, n) {
      var linhas = "";
      camposDa(tipo, et).forEach(function (c) {
        if (c.secao) return;
        vistos[c.b + "." + c.f.id] = true;
        if (!visivel(form, c.b, c.f)) return;
        var t = valorTexto(c.f, form[c.b] || {}, c.b);
        if (tem(t)) linhas += item(rotuloDe(c.b, c.f), t);
      });
      return '<section class="mh-etapa"><h5><span class="mh-n">' + (n + 1) + "</span>" + esc(et.titulo) + "</h5>" +
        (linhas ? '<dl class="mh-lista">' + linhas + "</dl>" : '<p class="mh-vazio">Sem resposta nesta etapa.</p>') + "</section>";
    }).join("");
    var fin = FINAL[tipo], fdef = campoDef(tipo, fin.bloco, fin.campo);
    if (fdef) {
      vistos[fin.bloco + "." + fin.campo] = true;
      var tf = valorTexto(fdef, form[fin.bloco] || {}, fin.bloco);
      html += '<section class="mh-etapa"><h5><span class="mh-n">+</span>Algo mais que o paciente quis contar</h5>' +
        (tem(tf) ? '<dl class="mh-lista">' + item(ROTULO[fin.bloco + "." + fin.campo] || TXT_FINAL, tf) + "</dl>" : '<p class="mh-vazio">Sem resposta.</p>') + "</section>";
    }
    var outros = "";
    blocosDe(tipo).forEach(function (b) {
      var d = form[b.id] || {};
      b.campos.forEach(function (f) {
        if (vistos[b.id + "." + f.id]) return;
        var t = valorTexto(f, d, b.id);
        if (tem(t)) outros += item(rotuloDe(b.id, f), t);
      });
    });
    if (outros) html += '<section class="mh-etapa"><h5><span class="mh-n">·</span>Outras respostas (versão anterior do formulário)</h5><dl class="mh-lista">' + outros + "</dl></section>";
    return '<div class="mh-resposta">' + html + "</div>";
  }

  /* RESUMO (Plano mestre, Fase 1, 13/10): o essencial do que o paciente respondeu, para ler em segundos na ficha
     (e, na Fase 2, no atendimento/HOLOSCAN). So as respostas, com as palavras do paciente; nada e interpretado,
     pontuado nem vira sistema. A resposta completa continua em respostaHtml. */
  var RESUMO = {
    primeira: [["Motivo da consulta", "motivo.motivos"], ["O que quer melhorar agora", "motivo.objetivo"],
      ["Dificuldades com a alimentação", "alimentar.dificuldades"], ["Como percebe a fome", "alimentar.fome_percebida"],
      ["Sinais que tem percebido", "saude.sinais"], ["O que mais incomoda", "saude.sinal_principal"],
      ["Como são os dias", "estilo.previsibilidade"], ["O que dificulta cuidar de si", "estilo.dificulta_opcoes"],
      ["Algo mais que quis contar", "contexto.obs"]],
    retorno: [["O que melhorou", "retorno.melhorou_opcoes"], ["O que piorou", "retorno.piorou_opcoes"],
      ["Quanto colocou em prática", "retorno.praticou_nivel"], ["O que facilitou", "retorno.facilitou_opcoes"],
      ["O que dificultou", "retorno.dificultou_opcoes"], ["Mudança importante", "retorno.mudanca_geral"],
      ["Questão nova", "retorno.nova_questao"], ["Algo mais que quis contar", "retorno.obs"]]
  };
  /** [{ chave, rotulo, texto }] so com o que foi respondido (e visivel pela regra condicional) */
  function resumo(conteudo) {
    var tipo = conteudo && conteudo.tipo === "retorno" ? "retorno" : "primeira";
    var form = (conteudo && conteudo.formulario) || {};
    return RESUMO[tipo].map(function (r) {
      var b = r[1].split(".")[0], id = r[1].split(".")[1], f = campoDef(tipo, b, id);
      if (!f || !visivel(form, b, f)) return null;
      var t = valorTexto(f, form[b] || {}, b);
      return tem(t) ? { chave: r[1], rotulo: r[0], texto: String(t) } : null;
    }).filter(Boolean);
  }

  raiz.MapeamentoHolistico = {
    RESUMO: RESUMO, resumo: resumo,
    ETAPAS_PRIMEIRA: ETAPAS_PRIMEIRA, ETAPAS_RETORNO: ETAPAS_RETORNO, FINAL: FINAL, TXT_FINAL: TXT_FINAL, ROTULO: ROTULO, REGRAS: REGRAS,
    SENSIVEIS: SENSIVEIS, TXT_SENSIVEL: TXT_SENSIVEL, NENHUM: NENHUM,
    etapasDe: etapasDe, camposDa: camposDa, campoDef: campoDef, regra: regra, rotuloDe: rotuloDe, visivel: visivel, opcoesDe: opcoesDe,
    textoOpcao: textoOpcao, valorTexto: valorTexto, limparForm: limparForm, respostaHtml: respostaHtml
  };
})();
