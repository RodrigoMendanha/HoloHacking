/* ===========================================================================
   MAPEAMENTO HOLISTICO DA SAUDE — o que o paciente responde (12/10)
   ===========================================================================

   Fonte UNICA das etapas, perguntas e campos sensiveis do Mapeamento:
   a pagina do paciente (anamnese-publica.js) e a ficha (anamnese-convite.js)
   usam este arquivo, entao a nutricionista le exatamente as perguntas que o
   paciente viu, na mesma ordem. As chaves sao as da Anamnese V2 (bloco.campo).
   respostaHtml() mostra a resposta ENVIADA, organizada por etapa; nada aqui
   interpreta, pontua ou conclui.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;

  /* Etapas do MAPEAMENTO HOLISTICO (12/10). Os blocos e as chaves sao os da Anamnese V2 (o "Levar para o atendimento"
     usa as mesmas chaves); aqui so a ordem, o que o paciente ve e os textos dele. "campos" e a lista do que aparece, na
     ordem; { secao } abre um subtitulo. Medidas (peso, altura, circunferencias), exames e observacoes fisicas NAO entram:
     sao da nutricionista, no atendimento. O ultimo campo aberto ("final") fica na tela de revisar e enviar. */
  var ETAPAS_PRIMEIRA = [
    { bloco: "motivo", titulo: "Sobre você e o que busca", intro: "Conte com suas palavras o que te traz ao acompanhamento agora.",
      campos: ["motivo", "objetivo", "ha_quanto_tempo", "ja_tentou", "ajudou", "nao_funcionou"] },
    { bloco: "alimentar", titulo: "Sua alimentação no dia a dia", intro: "Queremos entender como a alimentação acontece na sua rotina. Responda só o que souber.",
      campos: ["dia_comum", "refeicoes", "horarios", "maior_fome", "saciedade", "sem_fome", "desejos", "preferencias", "evitados",
        "agua", "bebidas", "alcool", "quem_prepara", "com_quem", "comer_fora", "delivery", "trabalho", "dificuldade"] },
    { bloco: "saude", titulo: "Como seu corpo tem se sentido", intro: "Conte o que você tem percebido no seu corpo. Não existe resposta certa.",
      campos: [{ secao: "O que você tem percebido" }, "intestino", "gastrointestinais", "azia_refluxo", "distensao", "nausea", "retencao",
        "dor_cabeca", "dor", "pele", "ciclo", "mudancas", "outros",
        { secao: "Diagnósticos já informados por profissionais de saúde" }, "condicoes", "cirurgias"] },
    { bloco: "restricoes", titulo: "Medicamentos, suplementos, alergias e intolerâncias", intro: "O que você usa hoje e o que já sabe sobre alergias e intolerâncias.",
      campos: ["medicamentos", "suplementos", "alergias", "intolerancias", "evita_desconforto"] },
    { bloco: "estilo", titulo: "Sono, energia e rotina", intro: "Sono, energia e o ritmo da sua semana.",
      campos: ["dorme", "acorda", "sono", "despertares", "energia", "trabalho", "deslocamento", "atividade", "pausas", "rotina",
        "dias_diferentes", "estresse", "tabagismo", "dificulta", "funciona"] },
    { bloco: "contexto", titulo: "Sua história e seu momento de vida", intro: "O que ajuda a sua nutricionista a entender o seu momento. Tudo aqui é opcional.",
      campos: ["historia_alimentacao", "familiar_saude", "mudancas_vida", "familiar", "responsabilidades", "sobrecarga", "apoio",
        "financeiro", "emocional", "sentido_importante", "sentido"] }
  ];
  var ETAPAS_RETORNO = [{ bloco: "retorno", titulo: "Desde a última consulta", intro: "Conte o que mudou desde o último encontro.",
    campos: ["melhorou", "piorou", "praticou", "nao_praticou", "facilitou", "dificultou", "alimentacao", "rotina", "sintomas", "nova_questao",
      "medicamento", "suplemento", "dificuldade"] }];
  /* campo aberto final, na tela de revisar e enviar */
  var FINAL = { primeira: { bloco: "contexto", campo: "obs" }, retorno: { bloco: "retorno", campo: "obs" } };
  var TXT_FINAL = "Tem alguma coisa importante sobre você, sua alimentação, sua saúde ou seu momento atual que não perguntamos e que gostaria que sua nutricionista soubesse?";
  /* campo que so aparece com uma resposta: "Se quiser, conte um pouco" so com "Sim" */
  var SE = { "contexto.sentido": { campo: "sentido_importante", valor: "Sim" } };

  /* Perguntas para o paciente (a chave continua a mesma da V2). */
  var ROTULO = {
    "motivo.motivo": "Qual é o principal motivo para buscar acompanhamento agora?", "motivo.objetivo": "O que você gostaria que estivesse diferente?",
    "motivo.ha_quanto_tempo": "Há quanto tempo isso chama a sua atenção ou incomoda?", "motivo.ja_tentou": "O que você já tentou antes?",
    "motivo.ajudou": "O que ajudou?", "motivo.nao_funcionou": "O que não funcionou?",
    "alimentar.dia_comum": "Como costuma ser a sua alimentação em um dia comum?",
    "alimentar.refeicoes": "Quantas refeições você costuma fazer por dia?", "alimentar.horarios": "Em que horários, mais ou menos?",
    "alimentar.maior_fome": "Em que períodos sente mais fome?", "alimentar.saciedade": "Depois de comer, você costuma se sentir satisfeito(a)?",
    "alimentar.sem_fome": "Você percebe que come mesmo sem fome?", "alimentar.desejos": "Tem vontade frequente de algum alimento específico?",
    "alimentar.preferencias": "Alimentos de que mais gosta", "alimentar.evitados": "Alimentos que evita ou não come",
    "alimentar.agua": "Quanta água bebe por dia?", "alimentar.bebidas": "Outras bebidas no dia a dia (café, chás, sucos, refrigerantes…)",
    "alimentar.alcool": "Consome bebida alcoólica?", "alimentar.quem_prepara": "Quem prepara as suas refeições?",
    "alimentar.com_quem": "Onde e com quem costuma comer?", "alimentar.comer_fora": "Com que frequência come fora?",
    "alimentar.delivery": "Com que frequência pede delivery?", "alimentar.trabalho": "Como você se alimenta no trabalho?",
    "alimentar.dificuldade": "Qual a sua maior dificuldade com a alimentação?",
    "saude.intestino": "Como funciona o seu intestino?", "saude.gastrointestinais": "Você percebe desconfortos digestivos?",
    "saude.azia_refluxo": "Azia ou refluxo", "saude.distensao": "Barriga estufada", "saude.nausea": "Enjoo",
    "saude.retencao": "Sensação de inchaço ou retenção", "saude.dor_cabeca": "Dor de cabeça", "saude.dor": "Outras dores",
    "saude.pele": "Percebe alguma mudança na pele?", "saude.ciclo": "Se fizer sentido para você: algo sobre o ciclo menstrual que queira contar?",
    "saude.mudancas": "Percebeu mudanças no seu corpo recentemente?", "saude.outros": "Outros sinais que tem percebido",
    "saude.condicoes": "Algum diagnóstico já informado por um profissional de saúde?", "saude.cirurgias": "Já fez alguma cirurgia?",
    "restricoes.medicamentos": "Medicamentos que usa", "restricoes.suplementos": "Suplementos que usa",
    "restricoes.alergias": "Alergias conhecidas ou diagnosticadas", "restricoes.intolerancias": "Intolerâncias conhecidas",
    "restricoes.evita_desconforto": "Existe algum alimento que você evita porque percebe desconforto? Se quiser, conte qual e o que costuma perceber.",
    "estilo.dorme": "Que horas costuma dormir, mais ou menos?", "estilo.acorda": "E que horas costuma acordar?",
    "estilo.sono": "Como está o seu sono?", "estilo.despertares": "Acorda durante a noite?",
    "estilo.energia": "Como está a sua energia ao longo do dia?", "estilo.trabalho": "Como é o seu trabalho?",
    "estilo.deslocamento": "Como são os seus deslocamentos no dia a dia?", "estilo.atividade": "Pratica atividade física?",
    "estilo.pausas": "Consegue fazer pausas para comer com calma?", "estilo.rotina": "Como é a sua rotina, em poucas palavras? Quais períodos são mais corridos?",
    "estilo.dias_diferentes": "Seus dias úteis e fins de semana são muito diferentes?", "estilo.estresse": "Como está o seu nível de estresse?",
    "estilo.tabagismo": "Fuma?",
    "estilo.dificulta": "Qual parte da sua rotina hoje mais dificulta cuidar da sua alimentação e da sua saúde?",
    "estilo.funciona": "Existe alguma parte da sua rotina que já funciona bem e você gostaria de preservar?",
    "contexto.historia_alimentacao": "Algo da sua história com a alimentação que considera importante? (dietas, fases, mudanças)",
    "contexto.familiar_saude": "Alguma condição de saúde importante na família?",
    "contexto.mudancas_vida": "Aconteceu alguma mudança importante na sua vida recentemente?",
    "contexto.familiar": "Como é o seu contexto familiar?", "contexto.responsabilidades": "Quais são as suas principais responsabilidades no dia a dia?",
    "contexto.sobrecarga": "Você tem se sentido sobrecarregado(a)?", "contexto.apoio": "Com quem você pode contar no dia a dia?",
    "contexto.financeiro": "Algo sobre condições financeiras que influencia a sua alimentação?",
    "contexto.emocional": "Você percebe que emoções ou situações específicas influenciam a sua alimentação?",
    "contexto.sentido_importante": "Existe algo relacionado ao seu momento de vida, valores, propósito, espiritualidade ou sentido pessoal que você considera importante para o seu cuidado?",
    "contexto.sentido": "Se quiser, conte um pouco.",
    "contexto.obs": TXT_FINAL,
    "retorno.melhorou": "O que melhorou?", "retorno.piorou": "O que piorou?",
    "retorno.praticou": "O que você conseguiu colocar em prática desde a última consulta?", "retorno.nao_praticou": "O que você não conseguiu colocar em prática?",
    "retorno.facilitou": "O que facilitou?", "retorno.dificultou": "O que dificultou?",
    "retorno.alimentacao": "O que mudou na alimentação?", "retorno.rotina": "Mudou alguma coisa na rotina?", "retorno.sintomas": "Mudou algo nos sintomas ou percebeu sinais novos?",
    "retorno.nova_questao": "Apareceu alguma questão nova desde o último encontro?", "retorno.medicamento": "Mudou algum medicamento?",
    "retorno.suplemento": "Mudou algum suplemento?", "retorno.dificuldade": "Qual foi a principal dificuldade desde a última consulta?",
    "retorno.obs": TXT_FINAL
  };
  /* campos sensiveis: opcionais, com "Prefiro nao responder" */
  var SENSIVEIS = { "contexto.familiar": true, "contexto.sobrecarga": true, "contexto.apoio": true, "contexto.financeiro": true,
    "contexto.emocional": true, "contexto.sentido_importante": true, "contexto.sentido": true, "saude.ciclo": true };
  var TXT_SENSIVEL = "Opcional. Responda só se quiser: não há resposta certa, e você pode deixar em branco ou marcar \"Prefiro não responder\".";


  function blocosDe(tipo) { var V2 = raiz.AnamneseV2; return V2 ? (tipo === "retorno" ? V2.BLOCOS_RETORNO : V2.BLOCOS_PRIMEIRA) : []; }
  function etapasDe(tipo) { return tipo === "retorno" ? ETAPAS_RETORNO : ETAPAS_PRIMEIRA; }
  function blocoDef(tipo, id) { return blocosDe(tipo).filter(function (b) { return b.id === id; })[0]; }
  /** campos de uma etapa, na ordem (com { secao } no meio) */
  function camposDa(tipo, et) {
    var b = blocoDef(tipo, et.bloco); if (!b) return [];
    return (et.campos || b.campos.map(function (f) { return f.id; })).map(function (c) {
      if (typeof c !== "string") return c;
      return b.campos.filter(function (f) { return f.id === c; })[0] || null;
    }).filter(Boolean);
  }
  function rotuloDe(b, f) { return ROTULO[b + "." + f.id] || f.rotulo; }
  function tem(v) { return v !== null && v !== undefined && (typeof v !== "string" || v.trim() !== "") && (!Array.isArray(v) || v.length > 0); }
  /** a resposta de um campo como texto (o que o paciente marcou ou escreveu) */
  function valorTexto(f, d) {
    var v = d[f.id];
    if (d[f.id + "_prefiro_nao"] === true) return "Prefiro não responder";
    if (f.tipo === "chips") return Array.isArray(v) ? v.join(", ") : (v || "");
    if (f.tipo === "sintoma") return v ? ({ nao: "Não", as_vezes: "Às vezes", frequente: "Frequente" }[v] || "") + (tem(d[f.id + "_detalhe"]) ? " — " + d[f.id + "_detalhe"] : "") : "";
    if (f.tipo === "medida") return tem(v) ? v + " " + (d[f.id + "_unidade"] || f.unidades[0]) : "";
    if (f.tipo === "lista") {
      var l = (Array.isArray(v) ? v : []).filter(function (x) { return x && tem(x.nome); });
      if (!l.length && d[f.id + "_nega"] === true) return "Não";
      return l.map(function (x) { return f.colunas.map(function (c) { return x[c[0]]; }).filter(tem).join(" · "); }).join("\n");
    }
    return v || "";
  }
  function visivel(form, b, f) { var c = SE[b + "." + f.id]; return !c || (form[b] || {})[c.campo] === c.valor; }

  /** A resposta ENVIADA, completa e organizada pelas etapas que o paciente viu. So o que foi respondido aparece;
      etapa sem resposta diz "Sem resposta". Campos antigos (ex.: peso de formularios anteriores) aparecem em "Outras respostas". */
  function respostaHtml(conteudo, esc) {
    esc = esc || function (x) { return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
    var tipo = conteudo && conteudo.tipo === "retorno" ? "retorno" : "primeira";
    var form = (conteudo && conteudo.formulario) || {};
    var vistos = {};
    var item = function (rot, txt) { return '<div class="mh-item"><dt>' + esc(rot) + "</dt><dd>" + esc(txt).replace(/\n/g, "<br>") + "</dd></div>"; };
    var html = etapasDe(tipo).map(function (et, n) {
      var d = form[et.bloco] || {}, linhas = "", secao = "";
      camposDa(tipo, et).forEach(function (f) {
        if (f.secao) { secao = f.secao; return; }
        vistos[et.bloco + "." + f.id] = true;
        if (!visivel(form, et.bloco, f)) return;
        var t = valorTexto(f, d);
        if (!tem(t)) return;
        if (secao) { linhas += '<h6 class="mh-secao">' + esc(secao) + "</h6>"; secao = ""; }
        linhas += item(rotuloDe(et.bloco, f), t);
      });
      return '<section class="mh-etapa"><h5><span class="mh-n">' + (n + 1) + "</span>" + esc(et.titulo) + "</h5>" +
        (linhas ? '<dl class="mh-lista">' + linhas + "</dl>" : '<p class="mh-vazio">Sem resposta nesta etapa.</p>') + "</section>";
    }).join("");
    /* campo aberto final */
    var fin = FINAL[tipo], fdef = (blocoDef(tipo, fin.bloco) || { campos: [] }).campos.filter(function (f) { return f.id === fin.campo; })[0];
    if (fdef) {
      vistos[fin.bloco + "." + fin.campo] = true;
      var tf = valorTexto(fdef, form[fin.bloco] || {});
      html += '<section class="mh-etapa"><h5><span class="mh-n">+</span>Algo mais que o paciente quis contar</h5>' +
        (tem(tf) ? '<dl class="mh-lista">' + item(TXT_FINAL, tf) + "</dl>" : '<p class="mh-vazio">Sem resposta.</p>') + "</section>";
    }
    /* respostas de campos que nao estao mais nas etapas (formulario antigo): nada se perde */
    var outros = "";
    blocosDe(tipo).forEach(function (b) {
      var d = form[b.id] || {};
      b.campos.forEach(function (f) {
        if (vistos[b.id + "." + f.id]) return;
        var t = valorTexto(f, d);
        if (tem(t)) outros += item(rotuloDe(b.id, f), t);
      });
    });
    if (outros) html += '<section class="mh-etapa"><h5><span class="mh-n">·</span>Outras respostas (formulário anterior)</h5><dl class="mh-lista">' + outros + "</dl></section>";
    return '<div class="mh-resposta">' + html + "</div>";
  }

  raiz.MapeamentoHolistico = {
    ETAPAS_PRIMEIRA: ETAPAS_PRIMEIRA, ETAPAS_RETORNO: ETAPAS_RETORNO, FINAL: FINAL, TXT_FINAL: TXT_FINAL, SE: SE,
    ROTULO: ROTULO, SENSIVEIS: SENSIVEIS, TXT_SENSIVEL: TXT_SENSIVEL,
    etapasDe: etapasDe, camposDa: camposDa, rotuloDe: rotuloDe, valorTexto: valorTexto, respostaHtml: respostaHtml
  };
})();
