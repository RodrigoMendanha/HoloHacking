/* ===========================================================================
   METODOLOGIA — a fronteira unica entre "conteudo em homologacao" e
   "saida oficial V1" (Etapa 0 da V1, reconciliacao com o Documento Mestre)
   ===========================================================================

   O Documento Mestre (secoes 1.2, 12, 13, 14.3, 15, 16, 17, 18, 24, 29, 35,
   38.1, 41.1) e explicito: so conteudo APROVADO E VIGENTE do Pacote
   Metodologico produz saida oficial; conteudo em rascunho fica no ambiente
   de homologacao; nenhum parametro (peso, faixa, corte de cobertura, regra
   laboratorial, regra de sugestao) e preenchido por aproximacao, escolha do
   desenvolvedor ou sugestao da IA.

   Hoje NAO existe Pacote Metodologico aprovado: todos os bancos do motor
   (perguntas, pesos, associacoes, inversoes, faixas, exames, combinacoes,
   eixos, textos) estao com status "rascunho", e regras.csv nem tem status.
   Portanto esta fronteira responde "nao" para toda saida oficial e deixa
   isso visivel na tela com um unico selo.

   Isto NAO e o Pacote Metodologico: e a menor barreira tecnica possivel para
   que conteudo nao aprovado nao seja apresentado como "resultado oficial
   V1". Quando o pacote existir, so este arquivo precisa aprender a le-lo.

   Regra de ouro: primeiro garantir que o dado e verdadeiro, depois
   calcular, depois interpretar, depois sugerir.
   =========================================================================== */
(function () {
  "use strict";

  /* O estado do conteudo metodologico. Nao e configuravel pela tela nem
     por localStorage: so muda com um pacote aprovado, versionado, lido aqui. */
  var STATUS = "em_homologacao";          // rascunho | em_revisao | aprovado (Mestre §13)
  var PACOTE = null;                       // id/versao do pacote aprovado, quando existir

  /* Tipos de saida que dependem de parametro metodologico. Qualquer tipo
     desconhecido tambem e tratado como dependente (resposta "nao"). */
  var SAIDAS = [
    "notas_sistemas", "faixas", "prioridade", "indice", "triada",
    "combinacoes", "sugestoes", "leitura_integrada", "evolucao_delta",
    "cobertura_minima", "alertas_metodologicos"
  ];

  var ROTULO = "Em homologação";
  var AVISO = "Resultado em homologação: perguntas, pesos, faixas e regras ainda não foram " +
    "aprovados no Pacote Metodológico da V1. Serve à revisão do método, não é saída oficial.";

  function status() { return STATUS; }
  function pacote() { return PACOTE; }

  /** "Este conteudo pode produzir saida oficial?" — a unica pergunta. */
  function saidaOficialPermitida(tipo) {
    if (STATUS !== "aprovado" || !PACOTE) return false;
    return SAIDAS.indexOf(tipo) >= 0;      // com pacote: so o que ele cobre
  }

  /** Uma regra identificada (CMB-, REC-, SEL-, ESC-) esta disponivel para
      uso oficial? Sem pacote aprovado, nenhuma. */
  function regraDisponivel(id) {
    void id;
    return saidaOficialPermitida("sugestoes") && false;
  }

  /** Cobertura minima oficial para ler uma nota. Sem politica de
      parcialidade homologada e NULL — nunca 0,5, 0,7 ou outro valor
      presumido (Mestre §18). A cobertura bruta (respondidos/total) continua
      sendo calculada e mostrada; ela so nao decide avaliabilidade. */
  function coberturaMinima() { return null; }

  /** Modo de homologacao/desenvolvimento: so com ?homologacao=1 na URL.
      Nao e configuravel por localStorage nem pela tela. E o unico contexto
      em que a pontuacao manual pelas reguas (LEGADO / EM REVISAO) aparece. */
  function modoHomologacao() {
    try { return /[?&]homologacao=1/.test(window.location.search); }
    catch (e) { return false; }
  }

  function rotulo() { return ROTULO; }
  function aviso() { return AVISO; }

  /** O selo, em HTML, para a tela. Um so, sempre igual. */
  function selo(extra) {
    return '<span class="selo-homologacao" title="' + AVISO + '">' + ROTULO +
      (extra ? " · " + extra : "") + "</span>";
  }

  /** O aviso em paragrafo, para blocos inteiros (HOLOSCAN, ficha, relatorio). */
  function avisoHtml() {
    return '<p class="aviso-homologacao">' + selo() + " " + AVISO + "</p>";
  }

  window.Metodologia = {
    status: status,
    pacote: pacote,
    saidaOficialPermitida: saidaOficialPermitida,
    regraDisponivel: regraDisponivel,
    coberturaMinima: coberturaMinima,
    modoHomologacao: modoHomologacao,
    rotulo: rotulo,
    aviso: aviso,
    selo: selo,
    avisoHtml: avisoHtml,
    SAIDAS: SAIDAS.slice()
  };
})();
