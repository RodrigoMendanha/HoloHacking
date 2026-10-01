/* ===========================================================================
   METODOLOGIA — a BARREIRA CENTRAL entre "conteudo em homologacao" e "saida
   oficial V1" (Etapa 0 da V1; evoluida na Etapa 4 para ler o Pacote
   Metodologico persistido)
   ===========================================================================

   O Documento Mestre (§1.2, §12, §13, §14.3, §15, §16, §17, §18, §24, §29,
   §35, §38.1, §41.1) e explicito: so conteudo APROVADO E VIGENTE do Pacote
   Metodologico produz saida oficial; conteudo em rascunho fica no ambiente
   de homologacao; nenhum parametro (peso, faixa, corte de cobertura, regra
   laboratorial, regra de sugestao) e preenchido por aproximacao, escolha do
   desenvolvedor ou sugestao da IA.

   Esta e a UNICA barreira: nenhuma tela decide por `if (status === ...)`
   por conta propria. As perguntas que ela responde:

     obterPacoteAtivo()        o pacote aprovado e vigente, ou null
     podeCalcularOficial()     ha pacote aprovado, vigente e publicavel?
     podeExibirOficial(tipo)   a saida `tipo` pode aparecer como oficial?
     motivosBloqueio()         por que nao (lista legivel; vazia = pode)
     modoHomologacao()         ?homologacao=1 — contexto de revisao tecnica
     saidaOficialPermitida()   (Etapa 0) alias de podeExibirOficial

   Hoje NAO existe pacote aprovado: status() e "em_homologacao", pacote() e
   null, toda saida oficial e negada e o selo unico continua na tela.
   Numeros do modo HOMOLOGACAO (MotorMetodologico com pacote rascunho) nunca
   passam por aqui como oficiais: `ehSaidaHomologacao(r)` os reconhece pelo
   `mode` e eles sao recusados em dashboard, Evolucao, relatorio e HOLOS AI.

   Regra de ouro: primeiro garantir que o dado e verdadeiro, depois
   calcular, depois interpretar, depois sugerir.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;

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

  /* ---------- o pacote ativo ----------
     Lido do PacoteMetodologico (cache carregado do servidor). Nunca de
     localStorage, nunca da tela, nunca de um rascunho. */
  function obterPacoteAtivo(dia) {
    var P = raiz.PacoteMetodologico;
    if (!P || !P.ativo) return null;
    var p = P.ativo(dia);
    if (!p || p.status !== "aprovado") return null;
    return p;
  }

  /** Por que a saida oficial esta bloqueada. Lista vazia = liberada. */
  function motivosBloqueio(dia) {
    var P = raiz.PacoteMetodologico, M = raiz.MotorMetodologico;
    var p = obterPacoteAtivo(dia);
    if (!p) {
      var todos = P && P.todos ? P.todos() : [];
      var aprovados = todos.filter(function (x) { return x.status === "aprovado"; });
      if (!todos.length) return ["nenhum Pacote Metodológico cadastrado (o inventário recuperado está em homologação)"];
      if (!aprovados.length) return ["nenhum Pacote Metodológico aprovado (" + todos.length + " em rascunho/revisão/retirado)"];
      return ["pacote aprovado existe, mas nenhum está vigente hoje"];
    }
    if (M && M.motivosBloqueioOficial) return M.motivosBloqueioOficial(p, dia);
    return [];
  }
  function podeCalcularOficial(dia) { return motivosBloqueio(dia).length === 0; }
  function podeExibirOficial(tipo, dia) {
    if (!podeCalcularOficial(dia)) return false;
    return SAIDAS.indexOf(tipo) >= 0;            // com pacote: so o que ele cobre
  }

  /** Estado legivel do conteudo metodologico (compatibilidade com a Etapa 0). */
  function status() { return podeCalcularOficial() ? "aprovado" : "em_homologacao"; }
  function pacote() { var p = obterPacoteAtivo(); return p ? { id: p.id, code: p.code, version: p.version, status: p.status, content_hash: p.content_hash } : null; }
  function saidaOficialPermitida(tipo) { return podeExibirOficial(tipo); }

  /** Uma regra identificada (CMB-, REC-, SEL-, ESC-) esta disponivel para
      uso oficial? So com pacote aprovado que a cubra — hoje, nenhuma. */
  function regraDisponivel(id) { void id; return podeExibirOficial("sugestoes") && false; }

  /** Cobertura minima oficial. Sem politica de parcialidade homologada e
      NULL — nunca 0,5, 0,7 ou outro valor presumido (Mestre §18). */
  function coberturaMinima() {
    var p = obterPacoteAtivo();
    if (!p || !podeCalcularOficial()) return null;
    var r = (p.regras || []).filter(function (x) { return x.rule_type === "absence"; })[0];
    return r && r.payload && typeof r.payload.cobertura_minima === "number" ? r.payload.cobertura_minima : null;
  }

  /** Modo de homologacao/desenvolvimento: so com ?homologacao=1 na URL.
      Nao e configuravel por localStorage nem pela tela. */
  function modoHomologacao() {
    try { return typeof location !== "undefined" && /[?&]homologacao=1/.test(location.search); }
    catch (e) { return false; }
  }

  /** Um resultado veio do motor em modo homologacao (ou de pacote nao
      aprovado)? Entao nao e saida oficial, com ou sem selo. */
  function ehSaidaHomologacao(r) {
    if (!r || typeof r !== "object") return false;
    if (r.mode === "homologacao") return true;
    if (r.package_status && r.package_status !== "aprovado") return true;
    return false;
  }
  /** O que uma tela oficial pode receber: recusa resultado de homologacao. */
  function aceitarSaida(r) {
    if (ehSaidaHomologacao(r)) throw new Error("saída do modo homologação (pacote " + (r.package_status || "?") + ") não entra em contexto oficial");
    return r;
  }

  function rotulo() { return ROTULO; }
  function aviso() { return AVISO; }
  function selo(extra) {
    return '<span class="selo-homologacao" title="' + AVISO + '">' + ROTULO + (extra ? " · " + extra : "") + "</span>";
  }
  function avisoHtml() { return '<p class="aviso-homologacao">' + selo() + " " + AVISO + "</p>"; }

  raiz.Metodologia = {
    status: status, pacote: pacote, obterPacoteAtivo: obterPacoteAtivo,
    podeCalcularOficial: podeCalcularOficial, podeExibirOficial: podeExibirOficial, motivosBloqueio: motivosBloqueio,
    saidaOficialPermitida: saidaOficialPermitida, regraDisponivel: regraDisponivel, coberturaMinima: coberturaMinima,
    modoHomologacao: modoHomologacao, ehSaidaHomologacao: ehSaidaHomologacao, aceitarSaida: aceitarSaida,
    rotulo: rotulo, aviso: aviso, selo: selo, avisoHtml: avisoHtml, SAIDAS: SAIDAS.slice()
  };
})();
