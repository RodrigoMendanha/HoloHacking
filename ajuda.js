/* ===========================================================================
   AJUDA — perguntas frequentes, passo a passo, glossario e "reportar um erro"
   ===========================================================================

   Pagina de ajuda para a nutricionista (pedido de 07/10). So texto e um
   formulario de relato: nada aqui le ou grava dado clinico. O relato de erro
   e montado no navegador e COPIADO (ou aberto num e-mail, se houver endereco
   de suporte configurado): nao sai nada sozinho, e o texto avisa para nao
   colocar nome nem dado de paciente.

   As respostas descrevem o sistema como ele e hoje (V1, HOLOS-V1@2): quando
   algo depende de decisao de metodo, a resposta diz isso — nao promete.
   =========================================================================== */
(function () {
  "use strict";
  var escapar = window.escapar || function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* Endereco de suporte. Vazio = o relato so e copiado (a profissional cola
     onde combinar com o suporte). Preencher aqui quando houver um canal. */
  var SUPORTE_EMAIL = "";

  /* ---------- perguntas frequentes ---------------------------------------- */
  var FAQ = [
    { grupo: "Primeiros passos", itens: [
      ["Como crio minha conta?",
       "Na tela de entrada, clique em <b>Criar conta</b> (ou use o link <b>holohacking.com.br/cadastro</b>). Preencha nome completo, e-mail, telefone com DDD e uma senha de pelo menos 8 caracteres. A conta fica <b>aguardando liberação</b> até a equipe HoloHacking liberar o acesso."],
      ["Meu cadastro está “em análise”. E agora?",
       "É só aguardar: a equipe confere os cadastros e avisa por WhatsApp ou e-mail quando o acesso for liberado. Depois disso, entre com o e-mail e a senha que você cadastrou. Na tela de análise, o botão <b>Verificar de novo</b> confere na hora."],
      ["Por onde eu começo?",
       "Complete o seu <b>Perfil</b> (nome completo, registro profissional e, se quiser, assinatura e marca): é isso que aparece nos relatórios. Depois cadastre o paciente em <b>Pacientes → Novo paciente</b>, agende a consulta na <b>Agenda</b> e, no dia, inicie o atendimento a partir da consulta."],
      ["Qual é o caminho de um atendimento completo?",
       "Agenda → <b>Iniciar atendimento</b> → HOLOSCAN (questionário) → ferramentas de Corpo, Mente e Espírito → Resultado HOLOS → Conduta → Resultado para a paciente (PDF ou WhatsApp). Nenhuma etapa trava a seguinte: você usa o que fizer sentido para a pessoa."],
      ["Meus dados ficam salvos onde?",
       "Com a conta conectada, tudo vai para o servidor da sua conta (só você vê). A mensagem de sucesso só aparece depois que o servidor confirmou. Se aparecer “não salvo no servidor”, o dado está só neste navegador: abra a tela indicada e salve de novo."],
      ["Posso usar em mais de um computador ou no celular?",
       "Sim. Entre com a mesma conta: o que foi salvo no servidor aparece em qualquer aparelho. Rascunhos que ainda não foram salvos ficam só no navegador em que foram escritos."]
    ]},
    { grupo: "Pacientes, agenda e atendimentos", itens: [
      ["Qual a diferença entre consulta e atendimento?",
       "A <b>consulta</b> é o horário marcado na agenda. O <b>atendimento</b> é o encontro que aconteceu de fato: é nele que ficam o HOLOSCAN, as ferramentas e a conduta. Você inicia o atendimento a partir da consulta (Agenda → abrir a consulta → Iniciar atendimento) ou direto na ficha, aba Atendimentos."],
      ["O que é o “atendimento ativo”?",
       "É o atendimento em que o que você salvar vai ficar registrado. Ele aparece no topo da ficha. Para trocar, use a aba <b>Atendimentos</b> da ficha. O sistema lembra a sua escolha enquanto a aba do navegador estiver aberta."],
      ["Como remarco ou desmarco uma consulta?",
       "Abra a consulta na Agenda, mude a data ou a hora e clique em <b>Reagendar</b>; ou use <b>Desmarcar</b>. Consulta que já virou atendimento não pode ser desmarcada nem reagendada, porque ela já aconteceu."],
      ["Como arquivo um paciente? Perco os dados?",
       "Na ficha, menu do paciente → <b>Arquivar paciente</b>. Nada é apagado: a ficha fica só para leitura e some das listas do dia a dia. Para voltar a atender, use <b>Reativar</b> na própria ficha."]
    ]},
    { grupo: "HOLOSCAN", itens: [
      ["Como aplico o HOLOSCAN?",
       "Com o atendimento ativo, vá em <b>HOLOSCAN → Aplicar questionário</b>, marque as respostas (clicar de novo na marcada desmarca) e clique em <b>Gerar o mapa</b>. Depois, <b>Salvar HOLOSCAN</b>: só assim ele vai para o servidor, ligado ao atendimento mostrado na tela."],
      ["O que o resultado mostra?",
       "O quadro <b>Resultado desta aplicação</b> traz os cinco sistemas do mais baixo ao mais alto (nota de 0 a 10 e faixa baixa / intermediária / alta), a Tríade (Físico, Mental, Espiritual), quantas perguntas foram respondidas e <b>Por onde investigar</b>: os dois sistemas de nota mais baixa e os sinais que mais pesaram neles. Abaixo ficam o radar, os cartões e o aprofundamento com a definição oficial de cada sistema."],
      ["Por que o sistema não escreve uma conclusão?",
       "Porque o método aprovado (HOLOS-V1@2) ainda não tem texto de conclusão homologado. O sistema não inventa interpretação clínica: ele organiza o que as respostas mostram, e a leitura é sua, no campo <b>Sua interpretação</b>, que vai junto para o relatório."],
      ["Por que um sistema ficou sem nota (“—”)?",
       "Para ter nota, o sistema precisa de pelo menos 80% das perguntas dele respondidas. Abaixo disso, ele aparece como “sem dado suficiente”, e o Índice HOLOS não é calculado."],
      ["Apareceu “não salvo no servidor”. E agora?",
       "O mapa foi gerado mas ainda não foi salvo: confira se há um atendimento selecionado na tela do HOLOSCAN e clique em <b>Salvar HOLOSCAN</b>. Gerar de novo com as mesmas respostas de uma aplicação já salva não cria duplicata."]
    ]},
    { grupo: "Resultado para a paciente", itens: [
      ["Onde fica o resultado para mostrar e enviar à paciente?",
       "No menu <b>Resultado</b>. Ele mostra o último <b>Resultado HOLOS finalizado</b> da paciente (versão para a paciente), as ferramentas que você escolheu mostrar, os seus textos e a <b>Conduta vigente</b>, com o seu nome, registro, logo, assinatura e carimbo do Perfil."],
      ["O Resultado está vazio. Por quê?",
       "A página só mostra resultado <b>finalizado</b>. Na ficha, aba <b>Resultado HOLOS</b>, prepare, revise e clique em <b>Finalizar</b>. Rascunho não aparece para a paciente."],
      ["Como envio pelo WhatsApp?",
       "Clique em <b>Enviar pelo WhatsApp</b>. No <b>celular</b>, abre o menu de compartilhar com o PDF já anexado: escolha o WhatsApp e a conversa da paciente. No <b>computador</b>, o PDF é baixado e a conversa com o número cadastrado da paciente abre com uma mensagem pronta: é só anexar o arquivo baixado. Nenhum link público é criado."],
      ["O resultado traz dieta ou prescrição?",
       "Não. O HoloHacking não prescreve dieta nem calorias e não emite laudo. Os próximos passos são as ferramentas do método e as orientações que você mesma escreveu na Conduta."]
    ]},
    { grupo: "Documentos e exames", itens: [
      ["Como guardo um exame ou documento do paciente?",
       "Ficha → aba <b>Documentos</b> → <b>+ Adicionar arquivo</b>. Escolha o tipo (Exame, Laudo, Receita, Encaminhamento, Documento ou Outro), dê um título, informe a data do documento e escolha o arquivo (PDF, foto ou texto, até 10 MB). A observação é opcional. Clique em <b>Guardar</b>."],
      ["O sistema lê ou interpreta os exames?",
       "<b>Não.</b> Exames e documentos são só arquivos do prontuário, para você consultar. O sistema não lê o arquivo, não extrai valores, não compara com referência e não usa o exame no HOLOSCAN, no Índice, na Tríade, no Resultado HOLOS, em relatórios, na Evolução nem no HOLOS AI."],
      ["O arquivo aparece em outro computador ou no celular?",
       "Sim. Com login, o arquivo vai para o armazenamento privado da sua conta e abre em qualquer aparelho em que você entrar (<b>Abrir</b> ou <b>Baixar</b>). Se aparecer “só neste dispositivo”, o envio falhou: adicione de novo com conexão."],
      ["Como tiro um documento da lista?",
       "Use <b>Arquivar</b>. O documento sai da lista, mas <b>não é apagado</b>: o registro e o arquivo continuam guardados no prontuário. Para ver ou devolver à lista, clique em <b>Ver arquivados</b> → <b>Restaurar</b>."],
      ["Onde foram parar os valores de exame e a Leitura Integrada?",
       "Saíram do sistema: exame não produz resultado. O que já tinha sido registrado continua guardado no banco, sem alteração, mas não aparece mais nas telas."]
    ]},
    { grupo: "Ferramentas (Corpo, Mente, Espírito)", itens: [
      ["Qual a diferença entre salvar e concluir uma ferramenta?",
       "<b>Salvar</b> guarda um rascunho que você pode continuar. <b>Concluir</b> fecha a aplicação no atendimento ativo. Ferramenta vazia não é concluída."],
      ["O que é a “leitura profissional”?",
       "Depois de concluir, você registra o que chamou atenção, a prioridade e o próximo passo. Com a leitura escrita, a aplicação passa a “revisada” e a leitura vai para o relatório."],
      ["As ferramentas geram uma interpretação automática?",
       "Não. Elas registram e organizam o que a pessoa respondeu (algumas desenham uma linha do tempo, uma rede ou barras). A interpretação é sua, na leitura profissional."]
    ]},
    { grupo: "Conduta e relatório", itens: [
      ["Como registro a conduta?",
       "Na ficha, aba <b>Conduta</b>, com o atendimento ativo: <b>Iniciar conduta</b>, preencha os campos e os acordos, e <b>Salvar</b>. Para mudar depois, use <b>Revisar (nova revisão)</b>: a anterior fica no histórico."],
      ["A aba Conduta diz “Iniciar conduta”, mas eu já salvei uma.",
       "A conduta pertence a um atendimento. Se o atendimento ativo for outro, a aba avisa em qual atendimento está a conduta vigente e mostra um botão para abri-lo."],
      ["Como emito um relatório?",
       "Na ficha, aba <b>Relatório</b>: escolha o que entra (atendimentos, HOLOSCAN, ferramentas, conduta), escreva a sua interpretação e clique em <b>Emitir</b>. A emissão fica registrada e não muda; para corrigir, emita uma retificação."]
    ]},
    { grupo: "Conta, dados e segurança", itens: [
      ["Alguém além de mim vê os meus pacientes?",
       "Não. Cada conta só enxerga os próprios pacientes; isso é garantido pelo servidor, não só pela tela."],
      ["Uso um computador compartilhado. Cuidado com o quê?",
       "Sempre clique em <b>Sair</b> ao terminar. Rascunhos não sincronizados podem ficar guardados neste navegador, separados por conta."],
      ["Encontrei algo errado. O que faço?",
       "Use <b>Reportar um erro</b>, no fim desta página. Descreva o que fez, o que esperava e o que aconteceu — <b>sem nome nem dado de paciente</b>."]
    ]}
  ];

  var PASSOS = [
    ["Perfil", "Nome completo, registro e assinatura — aparecem nos relatórios."],
    ["Paciente", "Pacientes → Novo paciente."],
    ["Consulta", "Agenda → clique no horário → escolha o paciente."],
    ["Atendimento", "No dia: abra a consulta → Iniciar atendimento."],
    ["HOLOSCAN", "Aplicar questionário → Gerar o mapa → Salvar HOLOSCAN → Sua interpretação."],
    ["Ferramentas", "Corpo, Mente, Espírito: preencher → Concluir → leitura profissional."],
    ["Resultado HOLOS", "Ficha → Resultado HOLOS → escolher o que entra → Finalizar."],
    ["Conduta", "Ficha → Conduta → objetivo, ações, orientações, acordos → Salvar."],
    ["Resultado para a paciente", "Menu Resultado → Baixar PDF ou Enviar pelo WhatsApp."],
    ["Documentos e exames", "Ficha → Documentos → + Adicionar arquivo → tipo, título, data, arquivo → Guardar."],
    ["Relatório", "Ficha → Relatório → escolher as fontes → Emitir → Imprimir."]
  ];

  var GLOSSARIO = [
    ["Atendimento", "O encontro clínico que aconteceu. Tudo o que é clínico fica ligado a um atendimento."],
    ["Faixa", "Baixa, intermediária ou alta: onde a nota do sistema caiu nesta aplicação."],
    ["Cobertura", "Quantas perguntas foram respondidas. Abaixo de 80% num sistema, ele fica sem nota."],
    ["Tríade", "Físico, Mental e Espiritual, calculados a partir da origem das perguntas."],
    ["Índice HOLOS", "Informação secundária; só existe quando os cinco sistemas têm nota."],
    ["Arquivar (documento)", "Tirar da lista sem apagar: o registro e o arquivo continuam guardados e podem ser restaurados."],
    ["Revisada", "Ferramenta com leitura profissional registrada."],
    ["Rascunho", "Algo guardado que ainda não vale como registro (não entra no Resultado nem no relatório)."]
  ];

  /* ---------- desenho ----------------------------------------------------- */
  function htmlFaq(filtro) {
    var q = norm(filtro);
    var total = 0;
    var html = FAQ.map(function (g) {
      var itens = g.itens.filter(function (it) { return !q || norm(it[0] + " " + it[1].replace(/<[^>]+>/g, "")).indexOf(q) >= 0; });
      total += itens.length;
      if (!itens.length) return "";
      return '<div class="aj-grupo"><h4>' + escapar(g.grupo) + "</h4>" + itens.map(function (it) {
        return '<details class="aj-item"' + (q ? " open" : "") + "><summary>" + escapar(it[0]) + '</summary><div class="aj-resp">' + it[1] + "</div></details>";
      }).join("") + "</div>";
    }).join("");
    return total ? html : '<p class="dash-vazio">Nenhuma pergunta encontrada. Tente outra palavra ou use “Reportar um erro”.</p>';
  }
  function norm(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }

  function desenhar() {
    var alvo = document.getElementById("ajuda-corpo");
    if (!alvo) return;
    alvo.innerHTML =
      '<div class="aj-busca"><input type="search" id="aj-busca" placeholder="Buscar na ajuda (ex.: exame, conduta, salvar)" aria-label="Buscar na ajuda"></div>' +
      '<section class="aj-bloco"><span class="eyebrow">Perguntas frequentes</span><div id="aj-faq">' + htmlFaq("") + "</div></section>" +
      '<section class="aj-bloco"><span class="eyebrow">Passo a passo de um atendimento</span><ol class="aj-passos">' +
        PASSOS.map(function (p) { return "<li><b>" + escapar(p[0]) + "</b> — " + escapar(p[1]) + "</li>"; }).join("") + "</ol></section>" +
      '<section class="aj-bloco"><span class="eyebrow">Glossário</span><dl class="aj-glossario">' +
        GLOSSARIO.map(function (g) { return "<dt>" + escapar(g[0]) + "</dt><dd>" + escapar(g[1]) + "</dd>"; }).join("") + "</dl></section>" +
      '<section class="aj-bloco" id="aj-reportar"><span class="eyebrow">Reportar um erro</span>' +
        '<p class="aj-aviso"><b>Não escreva nome, telefone nem dado clínico de paciente.</b> Descreva a tela e o passo; nós identificamos o resto.</p>' +
        '<label class="aj-campo">Em qual tela aconteceu?<input type="text" id="aj-tela" placeholder="ex.: HOLOSCAN, Agenda, ficha → Conduta"></label>' +
        '<label class="aj-campo">O que você fez?<textarea id="aj-fez" rows="3" placeholder="Os passos, na ordem"></textarea></label>' +
        '<label class="aj-campo">O que você esperava?<textarea id="aj-esperava" rows="2"></textarea></label>' +
        '<label class="aj-campo">O que aconteceu?<textarea id="aj-aconteceu" rows="3" placeholder="Mensagem que apareceu, o que ficou errado"></textarea></label>' +
        '<div class="aj-acoes"><button type="button" class="btn-verde" id="aj-copiar">Copiar relato</button>' +
        (SUPORTE_EMAIL ? '<button type="button" class="perf-botao" id="aj-email">Enviar por e-mail</button>' : "") +
        '<span class="aj-estado" id="aj-estado" role="status"></span></div>' +
        '<p class="dash-sub">O relato leva junto, automaticamente, a versão do sistema, o navegador e a data/hora — sem nenhum dado de paciente.' +
        (SUPORTE_EMAIL ? "" : " Depois de copiar, cole no canal de suporte combinado (WhatsApp ou e-mail).") + "</p></section>";

    var busca = document.getElementById("aj-busca");
    busca.addEventListener("input", function () { document.getElementById("aj-faq").innerHTML = htmlFaq(busca.value); });
    document.getElementById("aj-copiar").addEventListener("click", function () { relato().then(copiar); });
    var em = document.getElementById("aj-email");
    if (em) em.addEventListener("click", function () {
      relato().then(function (t) {
        window.location.href = "mailto:" + SUPORTE_EMAIL + "?subject=" + encodeURIComponent("HoloHacking — relato de erro") + "&body=" + encodeURIComponent(t);
      });
    });
  }

  function versao() {
    if (typeof fetch !== "function") return Promise.resolve(null);
    return fetch("/version.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function valor(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function relato() {
    return versao().then(function (v) {
      return [
        "RELATO DE ERRO — HoloHacking",
        "Tela: " + (valor("aj-tela") || "(não informada)"),
        "O que fiz: " + (valor("aj-fez") || "(não informado)"),
        "O que esperava: " + (valor("aj-esperava") || "(não informado)"),
        "O que aconteceu: " + (valor("aj-aconteceu") || "(não informado)"),
        "---",
        "Versão: " + (v ? v.version + " (" + v.commit + ")" : "desconhecida"),
        "Navegador: " + (navigator.userAgent || ""),
        "Tela do aparelho: " + window.innerWidth + "x" + window.innerHeight,
        "Data/hora: " + new Date().toLocaleString("pt-BR")
      ].join("\n");
    });
  }
  function copiar(texto) {
    var est = document.getElementById("aj-estado");
    var ok = function () { if (est) est.textContent = "Relato copiado. Cole no canal de suporte."; if (window.avisar) window.avisar("Relato copiado."); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(ok, function () { mostrarParaCopiar(texto); });
    } else mostrarParaCopiar(texto);
  }
  function mostrarParaCopiar(texto) {
    var est = document.getElementById("aj-estado");
    if (est) est.innerHTML = '<textarea class="aj-copia" rows="8" readonly>' + escapar(texto) + "</textarea><br>Selecione o texto acima e copie (Ctrl+C).";
  }

  window.Ajuda = { desenhar: desenhar, faq: function () { return FAQ; } };
  document.addEventListener("DOMContentLoaded", desenhar);
})();
