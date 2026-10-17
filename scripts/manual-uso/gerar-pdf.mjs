/**
 * GUIA DE USO DO HOLOHACKING — PDF A4 para nutricionistas que JÁ têm acesso à plataforma.
 * Texto conferido no código atual (rótulos e regras exatos); telas REAIS com personagens INVENTADOS (Supabase falso).
 *   1. node scripts/manual-uso/capturar.mjs
 *   2. node scripts/manual-uso/gerar-pdf.mjs      -> docs/manual/GUIA-DE-USO-HOLOHACKING.pdf (+ .html)
 * Recursos escondidos no sistema (Holos IA, Conduta, Relatório, Conexão & Pertencimento, réguas manuais) NÃO entram aqui.
 */
import puppeteer from 'puppeteer-core';
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
const require_rm = (f) => rmSync(f, { force: true });
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const R = new URL('../../', import.meta.url).pathname;
const T = new URL('./telas/', import.meta.url).pathname;
const IMG = new URL('./saida/img/', import.meta.url).pathname; mkdirSync(IMG, { recursive: true });
const DEST = R + 'docs/manual/'; mkdirSync(DEST, { recursive: true });
const HTML = DEST + 'GUIA-DE-USO-HOLOHACKING.html', PDF = DEST + 'GUIA-DE-USO-HOLOHACKING.pdf';

/* recortes (px das capturas 2x): nome -> [arquivo, caixa x0,y0,x1,y1 | null, largura final] */
const CORTES = {
  login: ['01-login', [880, 0, 2000, 1800], 900],
  dashboard: ['02-dashboard', null, 1700],
  pacientes: ['03-pacientes', null, 1700],
  novo: ['04-novo-paciente', [640, 740, 2880, 1800], 1500],
  ficha: ['05-ficha-nova', null, 1700],
  jornada: ['05b-jornada', null, 1700],
  atVazio: ['05c-atendimento-vazio', null, 1700],
  mapAntes: ['06-mapeamento-antes', [520, 1700, 2880, 1800], 1600],
  mapLink: ['07-mapeamento-link', null, 1700],
  celInicio: ['08-celular-mapeamento-inicio', [0, 0, 780, 1700], 700],
  celEtapa: ['09-celular-mapeamento-etapa', [0, 700, 780, 2400], 700],
  mapRecebido: ['10-mapeamento-recebido', null, 1700],
  atModal: ['11-novo-atendimento-modal', [900, 500, 1980, 1300], 1000],
  atAtivo: ['12-atendimento-ativo', null, 1700],
  holoSecao: ['13-holoscan-secao', null, 1700],
  questionario: ['14-holoscan-questionario', [520, 480, 2880, 1800], 1600],
  holoRes: ['16b-holoscan-salvo-inteira', [690, 1180, 2720, 2340], 1600],
  proximos: ['16b-holoscan-salvo-inteira', [690, 2330, 2720, 3700], 1600],
  ondeOlhar: ['16b-holoscan-salvo-inteira', [690, 5700, 2720, 7100], 1600],
  cincoSis: ['16b-holoscan-salvo-inteira', [690, 7120, 2720, 8000], 1600],
  sinais: ['16b-holoscan-salvo-inteira', [690, 7980, 2720, 8950], 1600],
  triade: ['16b-holoscan-salvo-inteira', [690, 8970, 2720, 9950], 1600],
  indice: ['16b-holoscan-salvo-inteira', [690, 9950, 2720, 10900], 1600],
  corpo: ['17-ferramentas-corpo', null, 1700],
  mente: ['17b-ferramentas-mente', [520, 0, 2880, 1300], 1500],
  espirito: ['17c-ferramentas-espirito', [520, 0, 2880, 1300], 1500],
  oq3: ['18-ferramenta-oq3', null, 1700],
  rhAba: ['19-resultado-holos-aba', null, 1700],
  pb1: ['20-playbook-1-leitura', null, 1500],
  pb2: ['21-playbook-2-foco', null, 1500],
  pb3: ['22-playbook-3-estrategias', [0, 0, 1808, 1500], 1500],
  pb4: ['23-playbook-4-previa', [0, 0, 1808, 1700], 1500],
  rhGerado: ['24-resultado-gerado', null, 1700],
  rhBotoes: ['24b-resultado-botoes', null, 1500],
  rpPrevia: ['25-pagina-resultado-previa', null, 1700],
  rpEmitido: ['26-pagina-resultado-emitido', null, 1700],
  rpAcoes: ['26b-resultado-acoes', null, 1600],
  doc1: ['26c-documento-paciente', [760, 1340, 2720, 3600], 1400],
  doc2: ['26c-documento-paciente', [760, 3600, 2720, 6400], 1400],
  agNova: ['27-agenda-nova-consulta', [520, 0, 2880, 1800], 1600],
  agenda: ['28-agenda', null, 1700],
  dashPac: ['29-dashboard-com-pacientes', null, 1700],
  perfil: ['30-perfil', null, 1700],
  retorno: ['32-ficha-retorno', null, 1700],
  evolucao: ['33-evolucao', null, 1700],
  celBotoes: ['34-celular-resultado-ficha', null, 600]
};
for (const [, [f]] of Object.entries(CORTES)) if (!existsSync(T + f + '.png')) throw new Error('falta ' + f + ' — rode node scripts/manual-uso/capturar.mjs');
execFileSync('python3', ['-I', '-c', `
import sys, json
from PIL import Image
c = json.loads(sys.argv[1]); t = sys.argv[2]; out = sys.argv[3]
for n, (f, box, w) in c.items():
    im = Image.open(t + f + '.png').convert('RGB')
    if box: im = im.crop(tuple(box))
    if im.width > w: im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    im.save(out + n + '.jpg', quality=84, optimize=True)
`, JSON.stringify(CORTES), T, IMG]);
const src = (n) => 'data:image/jpeg;base64,' + readFileSync(IMG + n + '.jpg').toString('base64');
const fig = (n, leg, cls = '') => `<figure><img class="${cls}" src="${src(n)}" alt=""><figcaption>${leg}</figcaption></figure>`;
const LOGO = 'data:image/png;base64,' + readFileSync(R + 'logo-holohacking.png').toString('base64');
const CSS = readFileSync(R + 'scripts/doc-jornada/estilo.css', 'utf8');
const box = (tipo, rot, html) => `<div class="box ${tipo}"><p class="box-rotulo">${rot}</p>${html}</div>`;
const passo = (n, t) => `<p class="eyebrow">Passo ${n}</p>`;

const CAPS = ['Antes de começar', 'A tela do HoloHacking', 'O caminho de cada paciente', 'Cadastrar o paciente', 'A ficha do paciente',
  'Enviar o Mapeamento Holístico', 'Abrir o atendimento', 'Aplicar o HOLOSCAN', 'Entendendo as notas do HOLOSCAN', 'Aplicar as ferramentas',
  'Montar o Resultado HOLOS com o Playbook', 'Entregar ao paciente: PDF e WhatsApp', 'Agendar o retorno', 'O retorno', 'Dashboard e acompanhamento',
  'Outros recursos do dia a dia', 'Dúvidas rápidas', 'Checklist do atendimento'];

const montarCorpo = (PAGS) => `
<section class="capa">
  <div class="marca">HOLOHACKING</div>
  <div><img class="pinha" src="${LOGO}" alt="">
  <h1 class="titulo-capa">Guia de uso<br>do HoloHacking</h1>
  <div class="filete"></div>
  <p class="sub">O passo a passo do dia a dia: do cadastro do paciente ao Resultado no WhatsApp e ao retorno.</p>
  <p class="sub2">Para nutricionistas que já têm acesso à plataforma. As telas são do próprio sistema, com pessoas e dados fictícios.</p></div>
  <div class="rodape-capa">Plataforma clínica da Nutrição Holística · outubro de 2026</div>
</section>

<h1 id="sumario">Sumário</h1>
<p class="abre">Siga na ordem na primeira vez. Depois, use como consulta rápida.</p>
<ol class="sumario">${CAPS.map((c, i) => `<li><span>${c}</span><b>${PAGS[i] || ''}</b></li>`).join('')}</ol>
${box('chave', '', '<p>O HoloHacking organiza o atendimento em uma sequência: o paciente responde o Mapeamento antes da consulta, você abre o atendimento, aplica o HOLOSCAN e as ferramentas, monta o Resultado com o Playbook e entrega o PDF no WhatsApp. No retorno, o ciclo recomeça a partir do que foi combinado.</p>')}
<div class="cadeia"><span>Cadastro</span><i>→</i><span>Mapeamento</span><i>→</i><span>Atendimento</span><i>→</i><span>HOLOSCAN</span><i>→</i><span>Ferramentas</span><i>→</i><span class="d">Resultado HOLOS</span><i>→</i><span class="d">PDF e WhatsApp</span><i>→</i><span>Retorno</span></div>

<!-- 1 -->
<h1>Antes de começar</h1>
<p class="abre">Entrar na plataforma e deixar o seu Perfil completo: é ele que assina os documentos que o paciente recebe.</p>
<h2>Entrar</h2>
<div class="duas"><div>
<p>Na tela <strong>Entrar na plataforma</strong>, digite o seu <strong>E-mail</strong> e a <strong>Senha</strong> e clique em <strong>Entrar</strong>. O ícone de olho mostra a senha enquanto você digita.</p>
<p>Esqueceu a senha? Clique em <strong>Esqueci minha senha</strong>, informe o e-mail e clique em <strong>Enviar instruções</strong>. O link que chega no e-mail abre a tela <strong>Criar nova senha</strong> (mínimo de 8 caracteres). Se o link tiver vencido ou já tiver sido usado, peça um novo pelo mesmo caminho.</p>
<p>Para trocar a senha estando dentro do sistema: <strong>Perfil → Conta → Alterar senha</strong>.</p>
</div>${fig('login', '<b>Tela</b> Entrar na plataforma.')}</div>
${box('atencao', 'Conta em liberação', '<p>Logo depois do cadastro, a conta fica <strong>pendente</strong> até a equipe HoloHacking liberar o acesso. Nesse período, o sistema abre <strong>somente o Perfil</strong>, com o aviso “Seu cadastro profissional está sendo preparado”. Aproveite para completar o perfil. Quando a conta for liberada, clique em <strong>Verificar acesso novamente</strong>.</p>')}

<h2>Complete o seu Perfil</h2>
<p>Abra <strong>Perfil</strong> (menu, em Configurações, ou clicando no seu nome no alto da tela). Ele tem as abas <strong>Perfil, Marca, Preferências</strong> e <strong>Conta</strong>.</p>
<ul>
<li><strong>Perfil:</strong> foto, nome completo, profissão, <strong>Registro profissional</strong> (o CRN, que sai impresso nos documentos), especialidade, e-mail, telefone/WhatsApp, cidade/UF, Instagram e fuso horário. O fuso define a data e a hora dos registros e da Agenda. Clique em <strong>Salvar alterações</strong>.</li>
<li><strong>Marca:</strong> cores, <strong>Logo</strong>, <strong>Assinatura</strong> (enviar uma imagem PNG ou desenhar na tela) e <strong>Carimbo profissional</strong>. Imagens em PNG, JPEG ou WEBP de até 4 MB.</li>
<li><strong>Preferências:</strong> esconder os módulos Atendimentos e Agenda do menu (nada é apagado) e escolher a aparência: claro, escuro ou seguir o sistema.</li>
<li><strong>Conta:</strong> sair da conta, alterar senha e ver a versão do app.</li>
</ul>
${box('resultado', 'Por que isso importa', '<p>O PDF que o paciente recebe leva no <strong>cabeçalho</strong> o seu logo, nome, profissão, registro, especialidade, cidade e contatos, e no <strong>rodapé</strong> a sua assinatura e o carimbo. Esses dados ficam <strong>congelados</strong> no momento em que o Resultado Final é gerado: mudar o Perfil depois não altera um documento já emitido.</p>')}
${fig('perfil', '<b>Tela</b> Perfil. O quadro do topo mostra o quanto o perfil está completo.')}


<!-- 2 -->
<h1>A tela do HoloHacking</h1>
<p class="abre">Um menu à esquerda, uma barra no alto e, quando há um paciente escolhido, uma barra com os atalhos dele.</p>
<div class="duas">
${box('', 'Menu lateral', '<ul><li><strong>Atendimento:</strong> Dashboard, Pacientes, Atendimentos e Agenda (o número ao lado da Agenda é a quantidade de consultas de hoje).</li><li><strong>Recursos:</strong> HOLOSCAN; Corpo, Mente e Espírito (as ferramentas); Resultado.</li><li><strong>Configurações:</strong> Perfil e Ajuda.</li><li>No rodapé: o seu cartão, <strong>Sair da conta</strong> e o quanto o perfil está completo.</li></ul>')}
${box('', 'Barra do alto', '<ul><li><strong>Buscar paciente…</strong>: procura por nome, telefone ou e-mail e abre a ficha.</li><li>Botão de tema: alterna entre modo claro e escuro.</li><li>O seu nome: abre o Perfil.</li></ul><p>Com um paciente escolhido, aparece a <strong>barra do paciente</strong>: Voltar à ficha, Atendimentos, Mapeamento Holístico, HOLOSCAN, Ferramentas e Documentos. O “×” só desmarca o paciente; não apaga nada.</p>')}
</div>${fig('dashboard', '<b>Tela</b> Dashboard, a primeira tela depois de entrar.')}


<!-- 3 -->
<h1>O caminho de cada paciente</h1>
<p class="abre">A ficha mostra a jornada em seis passos e marca o que já foi feito. É o seu mapa de “onde estou”.</p>
${fig('jornada', '<b>Ficha</b> A jornada do paciente, com a etapa atual destacada.')}
<table><thead><tr><th>Passo na tela</th><th>O que você faz</th><th>Fica concluído quando</th></tr></thead><tbody>
<tr><td><strong>Antes · Mapeamento Holístico</strong></td><td>Envia o link para o paciente responder antes da consulta</td><td>O paciente envia o Mapeamento</td></tr>
<tr><td><strong>Atendimento · Abrir atendimento + HOLOSCAN</strong></td><td>Abre o atendimento e aplica o HOLOSCAN</td><td>Há um HOLOSCAN salvo</td></tr>
<tr><td><strong>Atendimento · Ferramentas</strong></td><td>Aplica as ferramentas de Corpo, Mente e Espírito</td><td>Há ao menos uma ferramenta concluída</td></tr>
<tr><td><strong>Depois · Resultado HOLOS</strong></td><td>Monta o Resultado com o Playbook</td><td>O Resultado HOLOS foi gerado</td></tr>
<tr><td><strong>Apresentar · Resultado</strong></td><td>Gera o Resultado Final e envia o PDF</td><td>O Resultado Final foi emitido</td></tr>
<tr><td><strong>Retornos · Evolução</strong></td><td>Acompanha os retornos</td><td>Há dois ou mais HOLOSCANs salvos</td></tr>
</tbody></table>
<p>Clicar em um passo leva direto à tela dele. Os capítulos a seguir seguem exatamente essa ordem.</p>

<!-- 4 -->
<h1>Cadastrar o paciente</h1>
<p class="abre">Só o nome é obrigatório. O resto pode ser completado depois.</p>
${passo(1)}
<ol>
<li>No menu, clique em <strong>Pacientes</strong> e depois em <strong>Novo paciente</strong>.</li>
<li>Preencha o formulário <strong>Cadastrar paciente</strong>: <strong>Nome</strong> (obrigatório), data de nascimento, telefone, e-mail, sexo, início do acompanhamento e queixa principal.</li>
<li>Clique em <strong>Salvar paciente</strong>. A ficha do paciente abre sozinha, com o aviso “Cadastro realizado com sucesso.”</li>
</ol>
${fig('novo', '<b>Tela</b> Cadastrar paciente.')}
${box('atencao', 'Dicas', '<ul><li>Cadastre o <strong>telefone com DDD</strong>: é ele que abre a conversa certa no WhatsApp quando você envia o Mapeamento e o Resultado.</li><li>O sistema confere e-mail, telefone (8 a 15 dígitos) e data de nascimento (não pode ser no futuro).</li><li>Se já existir alguém com nome parecido, aparece o aviso “Já existe paciente com nome semelhante.” Confira antes de clicar em <strong>Cadastrar mesmo assim</strong>.</li></ul>')}
${fig('pacientes', '<b>Tela</b> Pacientes: busca, ordem, filtros (Todos, Ativos, Novos, Sem contato, Arquivados, Ficha vazia) e a lista.')}

<!-- 5 -->
<h1>A ficha do paciente</h1>
<p class="abre">Tudo sobre o paciente fica aqui: cabeçalho, atendimento ativo, jornada e abas.</p>
${fig('ficha', '<b>Tela</b> Ficha recém-criada. O botão principal sugere o próximo passo: aqui, “Enviar Mapeamento Holístico”.')}
${box('decide', 'O bloco “Atendimento ativo”', '<p>Logo abaixo do cabeçalho fica o atendimento escolhido. Ele é a peça mais importante da ficha: é a ele que o sistema liga o HOLOSCAN, o Mapeamento levado para a consulta, o peso e a altura e o Resultado HOLOS. Veja o capítulo “Abrir o atendimento”.</p>')}<h3>Cabeçalho</h3>
<ul>
<li><strong>Botão principal:</strong> muda conforme a etapa. Mostra “Enviar Mapeamento Holístico” para quem ainda não tem Mapeamento nem HOLOSCAN; depois, “Aplicar HOLOSCAN”, “Ir para Ferramentas”, “Montar Resultado HOLOS”, “Ver Resultado” ou “Reaplicar HOLOSCAN”.</li>
<li><strong>Nova consulta:</strong> abre a Agenda com uma consulta para este paciente.</li>
<li><strong>Mais ações:</strong> Editar cadastro, Adicionar arquivo e Exportar dados.</li>
<li><strong>Faixa de informações:</strong> Próxima consulta, Último HOLOSCAN, Etapa atual, e Peso e altura (gravados no atendimento ativo).</li>
</ul>
<h3>Abas da ficha</h3>
<p><strong>Visão geral, Atendimentos, Mapeamento Holístico, HOLOSCAN, Ferramentas, Resultado HOLOS, Documentos</strong> e <strong>Evolução</strong>.</p>


<!-- 6 -->
<h1>Enviar o Mapeamento Holístico</h1>
<p class="abre">O paciente responde pelo celular, antes da consulta, sem criar conta. Você chega ao atendimento sabendo o que importa.</p>
${passo(2)}
<ol>
<li>Na ficha, clique em <strong>Enviar Mapeamento Holístico</strong> (ou abra a aba <strong>Mapeamento Holístico</strong>).</li>
<li>O link é gerado e aparece a mensagem “Link gerado com sucesso. Copie ou envie pelo WhatsApp.”</li>
<li>Clique em <strong>Enviar pelo WhatsApp</strong>: abre a conversa do paciente com a mensagem pronta. Ou clique em <strong>Copiar link</strong> e mande por onde preferir.</li>
</ol>
${fig('mapLink', '<b>Tela</b> Aba Mapeamento Holístico com o link gerado e as etapas do envio.')}
${box('atencao', 'Importante sobre o link', '<ul><li>O link vale <strong>7 dias</strong>.</li><li>Ele só aparece no momento em que é gerado. Se perder, use <strong>Gerar novo link</strong>: o anterior deixa de valer.</li><li>Você pode cancelar um link com <strong>Revogar link</strong>.</li></ul>')}
<h2>O que o paciente vê</h2>
<div class="duas"><div>
<p>Uma página com o seu nome, registro e logo, que leva cerca de 10 minutos. Na primeira consulta são <strong>4 etapas</strong>:</p>
<ol><li>O que te traz aqui</li><li>Sua alimentação hoje</li><li>Sua saúde</li><li>Seus hábitos e seu momento</li></ol>
<p>Depois vem <strong>Revisar e enviar</strong>. As respostas são salvas sozinhas: o paciente pode parar e continuar pelo mesmo link. Depois de enviado, o Mapeamento não pode mais ser alterado por aquele link.</p>
<p>No retorno, o Mapeamento tem uma etapa só: <strong>Desde a última consulta</strong>.</p>
</div>${fig('celInicio', '<b>Celular</b> Início do Mapeamento, etapa 1 de 5 (4 etapas + revisar).', 'media')}</div>
<h2>Acompanhar e revisar</h2>
<p>As etapas do envio aparecem na aba: <strong>Não enviado → Link gerado → Link enviado → Mapeamento recebido → Revisado</strong> (ou Link expirado / Link revogado). Com a ficha aberta, o sistema confere sozinho e avisa quando o Mapeamento chega.</p>
${fig('mapRecebido', '<b>Tela</b> Mapeamento recebido, com o resumo do que o paciente trouxe.')}
<ul>
<li><strong>Abrir Mapeamento completo:</strong> mostra todas as respostas.</li>
<li><strong>Marcar como revisado:</strong> registra que você leu.</li>
<li><strong>Levar para o atendimento:</strong> cria, no atendimento ativo, o rascunho do registro com as respostas do paciente, para você revisar e salvar. Exige um atendimento aberto.</li>
</ul>

<!-- 7 -->
<h1>Abrir o atendimento</h1>
<p class="abre">Agendamento é compromisso de agenda. Atendimento é o encontro clínico: é nele que tudo fica registrado.</p>
${passo(3)}
<ol>
<li>Na ficha, no bloco <strong>Atendimento ativo</strong>, clique em <strong>Novo atendimento</strong>.</li>
<li>Confira a <strong>Data clínica</strong> e a <strong>Hora</strong> (não aceita data no futuro) e clique em <strong>Criar atendimento</strong>.</li>
<li>O atendimento passa a aparecer no bloco, com a data e a hora.</li>
</ol>
<div class="duas">${fig('atModal', '<b>Janela</b> Novo atendimento.')}${fig('atAtivo', '<b>Ficha</b> Atendimento ativo, com Selecionar, Novo atendimento e Soltar.')}</div>
<ul>
<li><strong>Selecionar:</strong> escolhe um atendimento que já existe (abre a aba Atendimentos).</li>
<li><strong>Soltar:</strong> desmarca o atendimento escolhido. Trocar de paciente também solta o atendimento.</li>
<li>Pela Agenda, o botão <strong>Iniciar atendimento</strong> de uma consulta marcada faz o mesmo.</li>
</ul>
${box('decide', 'O que precisa de um atendimento aberto', '<ul><li><strong>Salvar o HOLOSCAN</strong> (sem ele, o sistema avisa “Selecione ou inicie um atendimento para salvar.”).</li><li><strong>Levar para o atendimento</strong> o Mapeamento.</li><li>Registrar <strong>peso e altura</strong>.</li><li>Montar o <strong>Resultado HOLOS</strong> com o Playbook.</li><li>As ferramentas ficam ligadas ao atendimento quando há um aberto (sem ele, ficam sem vínculo).</li></ul>')}

<!-- 8 -->
<h1>Aplicar o HOLOSCAN</h1>
<p class="abre">O questionário que organiza o que o paciente relata em cinco sistemas, um Índice e a Tríade Corpo, Mente e Espírito.</p>
${passo(4)}
<ol>
<li>Com o paciente e o atendimento escolhidos, clique em <strong>HOLOSCAN</strong> no menu (ou no botão <strong>Aplicar HOLOSCAN</strong> da ficha).</li>
<li>Clique em <strong>Aplicar HOLOSCAN</strong> para abrir o questionário.</li>
<li>Responda cada pergunta com um dos 4 botões, de <strong>0 a 3</strong>: “Nunca / Às vezes / Frequente / Sempre” (perguntas de frequência) ou “Nada / Um pouco / Bastante / Muito” (perguntas de intensidade). Clicar de novo na resposta marcada deixa a pergunta em branco.</li>
<li>Clique em <strong>Gerar o mapa</strong> para ver o resultado.</li>
<li>Confira o atendimento escolhido e clique em <strong>Salvar HOLOSCAN</strong>. O botão vira “HOLOSCAN salvo ✓” e aparece a mensagem “HOLOSCAN concluído”.</li>
</ol>
${box('atencao', 'Bom saber', '<ul><li>A versão em uso tem <strong>81 perguntas</strong> (pacote HOLOS-V1 v7). A barra de progresso mostra “Em andamento” e “Todas respondidas · completo”.</li><li>As respostas ficam guardadas no navegador enquanto você aplica. <strong>Limpar</strong> apaga só as respostas em andamento, nunca uma aplicação já salva.</li><li>Se faltarem perguntas, ao salvar aparece “Questionário incompleto” com o número de respondidas. Você pode completar ou clicar em <strong>Salvar mesmo assim</strong>.</li><li>Clicar em salvar de novo não grava duas vezes. A próxima aplicação, no retorno, é feita em <strong>Reaplicar HOLOSCAN</strong> e começa vazia.</li></ul>')}${fig('questionario', '<b>Tela</b> Questionário do HOLOSCAN: blocos BioRoot (raízes físicas), NeuroScan (padrões emocionais) e Terreno Espiritual (propósito, valores e fé).')}


<!-- 9 -->
<h1>Entendendo as notas do HOLOSCAN</h1>
<p class="abre">As notas não são diagnóstico. Elas organizam as respostas e mostram por onde aprofundar.</p>
${fig('holoRes', '<b>Tela</b> Resultado desta aplicação: os cinco sistemas do mais baixo ao mais alto e “Por onde investigar”.')}
<h2>Os cinco sistemas</h2>
<p><strong>Sistema Fúngico</strong>, <strong>Sistema Ácido Inflamatório</strong>, <strong>Sistema Metabólico</strong>, <strong>Sistema Detox e Linfático</strong> e <strong>Sistema Mental Emocional Espiritual</strong>. São categorias de organização do mapa, não categorias de doença.</p>
<h2>A nota de cada sistema (0 a 10)</h2>
<ul>
<li>Cada sistema tem as suas perguntas. A nota é calculada a partir das respostas a elas: quanto <strong>mais marcadores</strong> o paciente relata, <strong>menor</strong> a nota.</li>
<li>Por isso, na tela, <strong>0 = comprometido</strong> e <strong>10 = muito bom</strong>. A nota baixa indica maior concentração de marcadores, ou seja, um motivo maior para aprofundar.</li>
<li>Mesmas respostas, mesma nota: a conta é sempre a mesma, definida no pacote metodológico.</li>
</ul>
<table><thead><tr><th>Faixa</th><th>Nota</th><th>Como o paciente lê</th></tr></thead><tbody>
<tr><td><strong>Baixa</strong></td><td>de 0 até 3,33</td><td>“Mais marcadores neste eixo”</td></tr>
<tr><td><strong>Intermediária</strong></td><td>de 3,33 até 6,67</td><td>“Alguns marcadores neste eixo”</td></tr>
<tr><td><strong>Alta</strong></td><td>de 6,67 até 10</td><td>“Menos marcadores neste eixo”</td></tr>
</tbody></table>
${box('atencao', 'Cobertura mínima de 80%', '<p>Um sistema só recebe nota quando pelo menos <strong>80% das perguntas dele</strong> foram respondidas. Abaixo disso aparece “Sem nota (menos de 80% das perguntas do sistema respondidas)”. Por isso vale responder o questionário inteiro.</p>')}
${fig('cincoSis', '<b>Tela</b> Cinco Sistemas: nota e faixa de cada um.')}
<h2>Índice HOLOS</h2>
<ul>
<li>É a média das cinco notas, em uma escala de <strong>0 a 100</strong> (a média de 0 a 10, multiplicada por 10). As notas são calculadas sem arredondamento, por isso o Índice pode diferir um pouco da média das notas que aparecem arredondadas na tela.</li>
<li>Só é calculado quando os <strong>cinco sistemas</strong> têm nota.</li>
<li>É uma informação secundária: <strong>não representa percentual de saúde</strong>.</li>
</ul>
<h2>Tríade HOLOS: Corpo, Mente e Espírito</h2>
<ul>
<li>Cada pergunta pertence a um bloco: físico (Corpo), mental-emocional (Mente) ou espiritual (Espírito). A Tríade dá uma nota de 0 a 10 para cada um, com a mesma conta e a mesma cobertura mínima.</li>
<li>O sistema destaca a <strong>dimensão mais baixa</strong> e explica o “Por quê” com as respostas que mais pesaram. Em caso de empate, não escolhe uma.</li>
</ul>
${fig('triade', '<b>Tela</b> Tríade HOLOS, com a dimensão mais baixa e o “Por quê”.')}
<h2>Por onde investigar e Próximos Passos HOLOS</h2>
<ul>
<li><strong>Por onde investigar:</strong> os dois sistemas com nota mais baixa e até três sinais de cada. É a aritmética das respostas, não diagnóstico nem conduta.</li>
<li><strong>Próximos Passos HOLOS:</strong> a partir desses dois sistemas, o catálogo sugere uma ferramenta principal (“Próximo passo recomendado”) e até duas complementares, com o motivo, o que ela ajuda a investigar e o botão <strong>Iniciar ferramenta</strong>. A decisão é sempre sua.</li>
<li><strong>Sua interpretação:</strong> um campo para a sua leitura clínica, salvo junto do HOLOSCAN.</li>
</ul>
${fig('proximos', '<b>Tela</b> Próximos Passos HOLOS: a ferramenta sugerida pelo catálogo e as outras possibilidades.')}
${box('resultado', 'O que o HOLOSCAN não é', '<p>O HOLOSCAN é uma avaliação nutricional integral, construída a partir do que o paciente relata. <strong>Não é exame, não é diagnóstico médico e não substitui avaliação clínica.</strong></p>')}

<!-- 10 -->
<h1>Aplicar as ferramentas</h1>
<p class="abre">Ferramentas de Corpo, Mente e Espírito para aprofundar além do prato.</p>
${passo(5)}
<table><thead><tr><th>Corpo</th><th>Mente</th><th>Espírito</th></tr></thead><tbody>
<tr><td>OQ³ — O Que Quer - Precisa - Consegue</td><td>PQQ — Pra Que Que?</td><td>Mapa do Propósito</td></tr>
<tr><td>Linha do Momentum</td><td>Mapa de Crenças Alimentares</td><td>Roda Holística da Vida</td></tr>
<tr><td>Mapa da Rotina</td><td>Gatilhos &amp; Respostas</td><td>Carta ao Futuro Eu</td></tr>
</tbody></table>
<ol>
<li>No menu, clique em <strong>Corpo</strong>, <strong>Mente</strong> ou <strong>Espírito</strong> (ou em <strong>Iniciar ferramenta</strong> nos Próximos Passos do HOLOSCAN).</li>
<li>Escolha a ferramenta. O <strong>“?”</strong> ao lado do nome explica o que é, por que e quando usar, e o “?” de cada pergunta explica o que preencher.</li>
<li>Preencha com o paciente e salve: <strong>Salvar OQ³</strong> / <strong>Salvar PQQ</strong>, ou <strong>Concluir aplicação</strong> nas demais (dá para <strong>Salvar rascunho</strong> antes).</li>
</ol>
${fig('corpo', '<b>Tela</b> Ferramentas do Corpo, com o status de cada uma.')}
${box('atencao', 'Bom saber', '<ul><li>Status nos cartões: <strong>Disponível, Em preenchimento, Concluída, Revisada</strong>.</li><li>O <strong>Mapa do Propósito</strong> é montado a partir do OQ³ e do PQQ salvos (“Falta o PQQ”, “Falta o OQ³” ou “Montado”).</li><li><strong>Mapa da Rotina</strong> e <strong>Gatilhos &amp; Respostas</strong> não são editados depois de concluídos: para corrigir, use <strong>Nova a partir desta</strong>. As demais permitem <strong>Salvar alterações</strong>.</li><li>Nas ferramentas há também a <strong>Leitura profissional</strong> (o que chamou atenção, prioridade, próximo passo).</li></ul>')}${fig('oq3', '<b>Tela</b> OQ³: as três perguntas (Quer, Precisa, Consegue).')}


<!-- 11 -->
<h1>Montar o Resultado HOLOS com o Playbook</h1>
<p class="abre">Em quatro passos, você transforma o que foi levantado em um foco claro e em poucas estratégias que o paciente consegue aplicar.</p>
${passo(6)}
<p>Na ficha, abra a aba <strong>Resultado HOLOS</strong> e clique em <strong>Montar com o Playbook</strong>. É preciso ter um <strong>atendimento aberto</strong> e o <strong>HOLOSCAN salvo</strong>. As ferramentas concluídas do atendimento entram automaticamente.</p>
${fig('rhAba', '<b>Tela</b> Aba Resultado HOLOS, com o botão Montar com o Playbook.')}
<h3>1 · Leitura do paciente</h3>
<p>Confira o atendimento, o tipo de encontro (primeira consulta ou retorno), as áreas prioritárias do HOLOSCAN, as ferramentas e o que o paciente contou. Marque o que deve entrar no Resultado.</p>
${fig('pb1', '<b>Playbook</b> Passo 1, Leitura do paciente.')}
<h3>2 · Foco desta fase</h3>
<p>Escolha <strong>1 foco</strong>. Os cartões vêm das áreas prioritárias do HOLOSCAN. Se preferir, use <strong>Ver focos de outros sistemas</strong> ou <strong>Escrever outro foco</strong>.</p>
${fig('pb2', '<b>Playbook</b> Passo 2, Foco desta fase.')}
<h3>3 · Estratégias</h3>
<p>Escolha normalmente <strong>2 a 4 estratégias</strong> (no máximo 6), de preferência 1 ou 2 ações e 1 ou 2 observações. Ao marcar, os campos <strong>O que fazer</strong>, <strong>Quando / com que frequência</strong> e <strong>O que observar</strong> já vêm preenchidos, e você ajusta. Não é obrigatório preencher Corpo, Mente e Espírito: escolha só o que o atendimento sustentou.</p>
${fig('pb3', '<b>Playbook</b> Passo 3, Estratégias, por Corpo, Mente e Espírito.')}
<h3>4 · Revisar e gerar</h3>
<p>Clique em <strong>Ver prévia</strong>: a prévia é exatamente o que o paciente vai ver. Depois clique em <strong>Gerar Resultado</strong>.</p>
${fig('pb4', '<b>Playbook</b> Passo 4, Revisar e gerar, com a prévia do documento.')}
${box('decide', 'Depois de gerar', '<ul><li>O Resultado abre na <strong>Visão do paciente</strong>. Use a troca <strong>Visão profissional / Visão do paciente</strong> para ver os dois lados.</li><li><strong>Marcar como revisado</strong> registra a sua revisão.</li><li>Para mudar algo, use <strong>Nova versão a partir desta</strong>: a versão anterior fica guardada no Histórico.</li><li>O <strong>foco</strong> é obrigatório: sem ele, o Resultado fica “em construção”, sem PDF nem WhatsApp.</li><li>Também existe o caminho <strong>Montar manualmente (avançado)</strong>, para quem prefere escrever tudo.</li></ul>')}

<!-- 12 -->
<h1>Entregar ao paciente: PDF e WhatsApp</h1>
<p class="abre">O Resultado Final é o documento que o paciente recebe, com a sua marca. Você envia em um clique.</p>
${passo(7)}
<h2>Pela ficha (o caminho mais curto)</h2>
<p>Na aba <strong>Resultado HOLOS</strong>, com a versão vigente aberta, aparecem os botões <strong>Enviar no WhatsApp</strong> e <strong>Baixar PDF</strong>. Eles geram o Resultado Final (se ainda não foi gerado) e já enviam ou baixam o PDF.</p>
${fig('rhBotoes', '<b>Ficha</b> Botões da versão vigente do Resultado HOLOS.')}
<h2>Pela página Resultado</h2>
<ol>
<li>No menu, clique em <strong>Resultado</strong>. A página mostra o último Resultado HOLOS do paciente como <strong>PRÉVIA — ainda não emitido</strong>.</li>
<li>Clique em <strong>Gerar Resultado Final</strong>. O conteúdo fica congelado: Resultado, nome, CRN, logo, assinatura, carimbo e data.</li>
<li>Use <strong>Baixar PDF</strong>, <strong>Enviar pelo WhatsApp</strong> ou <strong>Imprimir</strong>. <strong>Gerar nova emissão</strong> cria uma nova versão emitida; a lista “Emissões deste paciente” guarda todas.</li>
</ol>
${fig('rpEmitido', '<b>Tela</b> Página Resultado depois de emitir: Resultado Final nº 1, conteúdo congelado.')}
${box('atencao', 'Como o WhatsApp funciona', '<ul><li><strong>No celular:</strong> abre o compartilhar com o PDF já anexado e a mensagem pronta. Escolha o WhatsApp e a conversa.</li><li><strong>No computador:</strong> o PDF é baixado e a conversa do paciente abre com a mensagem pronta. Arraste o arquivo para a conversa. O WhatsApp não aceita anexo automático pelo navegador do computador.</li><li>Se o navegador pedir um toque a mais, aparece a faixa <strong>“PDF pronto.”</strong>: um clique envia.</li><li>Sem telefone no cadastro, a conversa abre sem o destinatário.</li></ul>')}
<h2>O que o paciente recebe</h2>
<div class="duas"><div>
<p>Título “Sua direção nesta fase” (primeira consulta) ou “Seu acompanhamento” (retorno), com as seções:</p>
<ol>
<li>Seu momento agora</li><li>O que estamos compreendendo</li><li>Foco desta fase</li><li>O que vamos trabalhar agora</li><li>Seu plano até a próxima consulta</li><li>Corpo · Mente · Espírito</li><li>Até o próximo encontro, observe</li><li>Próxima etapa</li><li>Seu mapa HOLOS (radar, Índice, Tríade e áreas que merecem mais atenção)</li><li>Ferramentas utilizadas</li>
</ol>
<p>No rodapé: assinatura, carimbo, data de emissão e o aviso “Não é exame, não é diagnóstico e não é prescrição”.</p>
</div>${fig('doc1', '<b>Documento</b> Início do Resultado que o paciente recebe.')}</div>

<!-- 13 -->
<h1>Agendar o retorno</h1>
<p class="abre">A Agenda guarda os compromissos. O atendimento só começa quando você clica em “Iniciar atendimento”.</p>
${passo(8)}
<ol>
<li>Na ficha, clique em <strong>Nova consulta</strong> (ou, na Agenda, em <strong>+ Nova consulta</strong>).</li>
<li>Escolha <strong>Paciente</strong>, <strong>Tipo</strong> (Primeira consulta, Retorno, Reavaliação HOLOSCAN, Online), <strong>Dia</strong>, <strong>Hora</strong>, <strong>Duração</strong> (30, 45, 60 ou 90 minutos) e, se quiser, uma observação.</li>
<li>Clique em <strong>Marcar consulta</strong>.</li>
</ol>
<ul>
<li>Visões <strong>Dia, Semana e Mês</strong>, com o botão <strong>Hoje</strong>.</li>
<li><strong>Desmarcar</strong> (com motivo opcional) e <strong>Reagendar</strong> não apagam o histórico.</li>
<li><strong>Bloquear</strong> reserva horários (com motivo) em que você não atende.</li>
<li>O sistema avisa sobre <strong>conflito de horário</strong> e <strong>consulta no passado</strong>.</li>
<li>No dia da consulta, clique nela e em <strong>Iniciar atendimento</strong>.</li>
</ul>${fig('agNova', '<b>Tela</b> Agenda com o formulário de nova consulta.')}


<!-- 14 -->
<h1>O retorno</h1>
<p class="abre">No retorno, você vê o que foi possível fazer e decide o que manter e o que ajustar.</p>
${passo(9)}
<ol>
<li><strong>Abra um novo atendimento</strong> (ficha → Novo atendimento, ou Iniciar atendimento na Agenda).</li>
<li>Se quiser, envie o <strong>Mapeamento de retorno</strong>: uma etapa só, “Desde a última consulta”.</li>
<li><strong>Reaplique o HOLOSCAN</strong> (o questionário começa vazio) e as ferramentas que fizerem sentido.</li>
<li>Em <strong>Resultado HOLOS → Montar com o Playbook</strong>, o sistema reconhece o retorno e acrescenta o passo <strong>Como foi desde o último encontro</strong>: para cada estratégia anterior, marque se o paciente conseguiu aplicar (Sim, Em parte, Não) e decida <strong>Manter, Ajustar, Substituir, Concluir</strong> ou <strong>Encerrar</strong>. “Manter” e “Ajustar” levam a estratégia para o novo plano. No foco, você pode manter o anterior.</li>
<li>Gere e envie como na primeira consulta.</li>
</ol>
<p>O documento do retorno começa com “O que mudou desde o último encontro”, “O que foi possível fazer”, “O que manter e o que ajustar” e “Novo foco desta fase”, e segue com as mesmas seções da primeira consulta.</p>
${fig('retorno', '<b>Tela</b> Ficha de um paciente em acompanhamento: a jornada mostra as etapas concluídas.')}
<h2>Aba Evolução</h2>
<p>Compare dois momentos: <strong>Atendimento anterior × atual</strong>, <strong>Linha de base × atual</strong>, <strong>Dois atendimentos escolhidos</strong> ou <strong>Duas datas</strong>, escolhendo as fontes (Atendimentos, Mapeamento Holístico, Medidas, HOLOSCAN, Ferramentas, Linha do tempo). O sistema mostra lado a lado e <strong>não calcula diferença de notas, Índice, Tríade ou faixas</strong>; a leitura é sua. Na tela do HOLOSCAN, com duas ou mais aplicações, aparece também “Aplicações lado a lado”.</p>
${fig('evolucao', '<b>Tela</b> Aba Evolução.')}

<!-- 15 -->
<h1>Dashboard e acompanhamento</h1>
<p class="abre">A primeira tela do dia: quem você atende hoje e em que etapa está cada paciente.</p>
${fig('dashPac', '<b>Tela</b> Dashboard com pacientes em acompanhamento.')}
<ul>
<li><strong>Cartões:</strong> Pacientes ativos, Atendimentos hoje, Próxima consulta e Em acompanhamento.</li>
<li><strong>Agenda de Hoje:</strong> as consultas do dia (botão <strong>Ver</strong>) e os atendimentos de hoje sem agendamento (botão <strong>Abrir atendimento</strong>, que já abre a ficha com o atendimento selecionado).</li>
<li><strong>Acompanhamento dos pacientes:</strong> a etapa de cada paciente ativo: Aguardando Mapeamento, Mapeamento recebido, HOLOSCAN em andamento, Em atendimento, Resultado pronto, Resultado apresentado ou Aguardando retorno.</li>
</ul>

<!-- 16 -->
<h1>Outros recursos do dia a dia</h1>
<h2>Documentos</h2>
<p>Na aba <strong>Documentos</strong> da ficha, clique em <strong>+ Adicionar arquivo</strong>, escolha o tipo (Exame, Laudo, Receita, Encaminhamento, Documento, Outro), título e data, e clique em <strong>Guardar</strong>. Aceita PDF, imagens (PNG, JPG, WEBP, HEIC), TXT e CSV de até <strong>10 MB</strong>. Documentos não são excluídos, são <strong>arquivados</strong> (e podem ser restaurados). O sistema não lê nem interpreta os arquivos.</p>
<h2>Atendimentos</h2>
<p>A seção <strong>Atendimentos</strong> do menu é o histórico clínico: todos os atendimentos (com filtro de mês), quem voltou para reavaliar e quais ainda estão sem resultado. A linha abre a ficha com o atendimento já selecionado. Há também o <strong>Histórico HOLOSCAN</strong> e <strong>Exportar CSV</strong>.</p>
<h2>Arquivar, reativar e remover pacientes</h2>
<ul>
<li><strong>Arquivar:</strong> nada é apagado. O paciente arquivado pode ser visto e exportado, mas não recebe novos registros até ser reativado (<strong>Reativar paciente</strong>).</li>
<li><strong>Remover:</strong> só é possível para quem <strong>não tem nenhum histórico clínico</strong>. Quem já tem atendimento, HOLOSCAN, ferramenta, documento ou consulta só pode ser arquivado.</li>
<li><strong>Exportar dados</strong> (Mais ações) gera um arquivo com todos os dados do paciente.</li>
</ul>
<h2>Ajuda</h2>
<p>No menu, <strong>Ajuda</strong> traz perguntas frequentes, passo a passo, glossário e “reportar um erro”.</p>

<!-- 17 -->
<h1>Dúvidas rápidas</h1>
<table><thead><tr><th>Situação</th><th>O que fazer</th></tr></thead><tbody>
<tr><td>“Selecione ou inicie um atendimento para salvar.”</td><td>Abra um atendimento no bloco <strong>Atendimento ativo</strong> da ficha (Novo atendimento ou Selecionar) e salve de novo.</td></tr>
<tr><td>Perdi o link do Mapeamento</td><td>O link só aparece quando é gerado. Use <strong>Gerar novo link</strong> (o anterior deixa de valer).</td></tr>
<tr><td>O link do Mapeamento venceu</td><td>Vale 7 dias. Gere um novo e envie.</td></tr>
<tr><td>Um sistema ficou “Sem nota”</td><td>Menos de 80% das perguntas dele foram respondidas. Complete o questionário.</td></tr>
<tr><td>O Índice HOLOS não aparece</td><td>Ele só é calculado quando os cinco sistemas têm nota.</td></tr>
<tr><td>O botão “Montar com o Playbook” não deixa seguir</td><td>Abra um atendimento e salve o HOLOSCAN do paciente.</td></tr>
<tr><td>Não aparecem “Enviar no WhatsApp” e “Baixar PDF”</td><td>Só aparecem na versão vigente do Resultado, com foco confirmado, e para paciente ativo.</td></tr>
<tr><td>“RESULTADO EM CONSTRUÇÃO”</td><td>Falta o foco. Crie uma nova versão do Resultado HOLOS e escolha o foco.</td></tr>
<tr><td>No computador o PDF não foi anexado</td><td>É uma regra do WhatsApp no navegador: arraste o PDF baixado para a conversa que abriu.</td></tr>
<tr><td>O paciente aparece como arquivado</td><td>Reative na ficha (<strong>Reativar paciente</strong>) antes de registrar.</td></tr>
<tr><td>Mudei o logo, mas o PDF antigo não mudou</td><td>O Resultado Final congela os dados do Perfil. Gere uma nova emissão.</td></tr>
</tbody></table>

<!-- 18 -->
<h1>Checklist do atendimento</h1>
<p class="abre">Imprima ou deixe aberto na primeira semana de uso.</p>
<div class="linha-tempo">
<div data-n="1"><b>Cadastrar o paciente</b><span>Pacientes → Novo paciente. Telefone com DDD.</span></div>
<div data-n="2"><b>Enviar o Mapeamento Holístico</b><span>Ficha → Enviar Mapeamento Holístico → Enviar pelo WhatsApp. O link vale 7 dias.</span></div>
<div data-n="3"><b>Revisar o Mapeamento</b><span>Aba Mapeamento Holístico → Marcar como revisado / Levar para o atendimento.</span></div>
<div data-n="4"><b>Abrir o atendimento</b><span>Ficha → Atendimento ativo → Novo atendimento (ou Iniciar atendimento na Agenda).</span></div>
<div data-n="5"><b>Aplicar e salvar o HOLOSCAN</b><span>HOLOSCAN → Aplicar → Gerar o mapa → Salvar HOLOSCAN.</span></div>
<div data-n="6"><b>Aplicar as ferramentas</b><span>Corpo, Mente e Espírito, ou Iniciar ferramenta nos Próximos Passos.</span></div>
<div data-n="7"><b>Montar o Resultado HOLOS</b><span>Aba Resultado HOLOS → Montar com o Playbook → foco + 2 a 4 estratégias → Gerar Resultado.</span></div>
<div data-n="8"><b>Entregar</b><span>Enviar no WhatsApp ou Baixar PDF (ficha), ou Resultado → Gerar Resultado Final.</span></div>
<div data-n="9"><b>Agendar o retorno</b><span>Nova consulta → Tipo Retorno → Marcar consulta.</span></div>
<div data-n="10"><b>No retorno</b><span>Novo atendimento → Mapeamento de retorno → Reaplicar HOLOSCAN → Playbook (manter, ajustar, concluir) → enviar.</span></div>
</div>

`;

/* capítulos: cartão verde com número, título, subtítulo e a pinha */
const capitulos = (h) => { let n = 0; return h.replace(/<h1>([^<]+)<\/h1>\n(?:<p class="abre">([\s\S]*?)<\/p>\n)?/g, (m, t, a) => { n++;
  return `<header class="cap"><img src="${LOGO}" alt=""><span class="cap-n">Capítulo ${String(n).padStart(2, '0')}</span><h1 data-cap="${n}">${t}</h1>${a ? `<p class="abre">${a}</p>` : ''}</header>\n`; }); };
const ESTILO = `
@page fundo{ margin:0; }
.capa,.contracapa{ page:fundo; }
body{ color:#1d3a2e; }
strong{ color:#14503b; }
h2{ color:#0b3325; border-bottom:1px solid rgba(201,163,90,.55); padding-bottom:1.6mm; }
h3{ color:#8a6f32; }
p.eyebrow{ display:inline-block; background:#0b3325; color:#e2c98a; padding:1.3mm 4mm; border-radius:10mm; letter-spacing:.24em; margin:2mm 0 3mm; }
ol > li::marker{ color:#8a6f32; font-weight:600; }
th{ color:#e2c98a; }
figure img{ border:1px solid rgba(201,163,90,.6); }
.cap{ break-before:page; page-break-before:always; position:relative; overflow:hidden; border-radius:4mm; padding:10mm 11mm 8.5mm; margin:0 0 7mm;
  background:radial-gradient(120% 140% at 85% 0%, #14503b 0%, #0b3325 45%, #06231a 100%); color:#f4efe3; break-after:avoid; page-break-after:avoid; }
.cap::after{ content:""; position:absolute; inset:2.6mm; border:1px solid rgba(201,163,90,.4); border-radius:2.6mm; pointer-events:none; }
.cap img{ position:absolute; right:6mm; top:50%; transform:translateY(-50%); width:30mm; opacity:.28; }
.cap .cap-n{ font-size:7.8pt; letter-spacing:.32em; text-transform:uppercase; color:#e2c98a; font-weight:600; }
.cap h1{ break-before:auto; page-break-before:auto; color:#f4efe3; font-size:27pt; margin:2.5mm 0 2mm; padding:0; max-width:130mm; }
.cap h1::before{ display:none; }
.cap p.abre{ color:#e2c98a; font-family:'Cormorant Garamond',serif; font-style:italic; font-size:13.5pt; line-height:1.35; margin:0; max-width:132mm; }
h1#sumario{ color:#0b3325; }
ol.sumario li{ justify-content:space-between; align-items:baseline; }
ol.sumario li span{ flex:1; }
ol.sumario li b{ font-family:'Cormorant Garamond',serif; color:#8a6f32; font-size:11.5pt; }
.contracapa{ break-before:page; page-break-before:always; width:210mm; height:297mm; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;
  background:radial-gradient(120% 80% at 50% 35%, #0f3d2c 0%, #0b3325 45%, #06231a 100%); color:#f4efe3; position:relative; }
.contracapa::before{ content:""; position:absolute; inset:9mm; border:1px solid rgba(201,163,90,.35); }
.contracapa img{ width:40mm; margin-bottom:6mm; }
.contracapa .cc-nome{ font-family:'Cormorant Garamond',serif; font-size:30pt; margin:0; }
.contracapa .cc-frase{ font-family:'Cormorant Garamond',serif; font-size:18pt; line-height:1.3; margin:0 0 6mm; }
.contracapa .cc-frase em{ color:#e2c98a; }
.contracapa .cc-pilares{ font-size:8.5pt; letter-spacing:.4em; text-transform:uppercase; color:#c9a35a; }
.contracapa .cc-rodape{ position:absolute; bottom:22mm; font-size:8pt; letter-spacing:.2em; text-transform:uppercase; color:rgba(226,201,138,.8); margin:0; }
.duas{align-items:start}
figure img.media{max-width:78%}
.box.chave p{margin:0}
`;
const CONTRA = `<section class="capa"><div class="marca">HOLOHACKING</div><div><img class="pinha" src="${LOGO}" alt=""><h1 class="titulo-capa">Nutrição que cuida do<br>ser humano inteiro.</h1><div class="filete"></div><p class="sub">Corpo · Mente · Espírito</p></div><div class="rodape-capa">Plataforma clínica da Nutrição Holística</div></section>`;
const montarHtml = (PAGS) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Guia de uso do HoloHacking</title><style>${CSS}${ESTILO}</style></head><body>${capitulos(montarCorpo(PAGS))}</body></html>`;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
async function imprimir(PAGS) {
  writeFileSync(HTML, montarHtml(PAGS));
  const p = await nav.newPage();
  await p.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  await p.emulateMediaType('print');
  await p.pdf({ path: PDF, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await p.close();
}
/* 1ª passada: descobre a página de cada capítulo ("Capítulo NN"); 2ª passada: sumário com os números */
await imprimir([]);
const PAGS = JSON.parse(execFileSync('python3', ['-I', '-c', `
import sys, json, pymupdf
doc = pymupdf.open(sys.argv[1]); n = int(sys.argv[2]); r = []
for k in range(1, n + 1):
    alvo = 'CAPÍTULO%02d' % k; achou = ''
    for i, pg in enumerate(doc):
        t = ''.join(pg.get_text().upper().split())
        if alvo in t: achou = i + 1; break
    r.append(achou)
print(json.dumps(r))
`, PDF, String(CAPS.length)]).toString());
console.log('paginas dos capitulos', PAGS.join(' '));
await imprimir(PAGS);
{ const CCPDF = PDF.replace('.pdf', '.contracapa.pdf');
  writeFileSync(HTML + '.cc.html', `<!doctype html><html><head><meta charset="utf-8"><style>${CSS} .capa h1.titulo-capa{font-size:32pt}</style></head><body>${CONTRA}</body></html>`);
  const p = await nav.newPage(); await p.goto(pathToFileURL(HTML + '.cc.html').href, { waitUntil: 'networkidle0' }); await p.evaluate(() => document.fonts.ready); await p.emulateMediaType('print');
  await p.pdf({ path: CCPDF, format: 'A4', printBackground: true, preferCSSPageSize: true, pageRanges: '1' }); await p.close();
  execFileSync('python3', ['-I', '-c', 'import sys, pymupdf\nd = pymupdf.open(sys.argv[1]); c = pymupdf.open(sys.argv[2]); d.insert_pdf(c); d.saveIncr() if False else d.save(sys.argv[1] + ".t", garbage=3, deflate=True)\nimport os; os.replace(sys.argv[1] + ".t", sys.argv[1]); os.remove(sys.argv[2])', PDF, CCPDF]);
  require_rm(HTML + '.cc.html'); }
await nav.close();

/* rodapé com a pinha (sem rodapé na capa e na contracapa) */
execFileSync('python3', ['-I', '-c', `
import sys, pathlib, pymupdf
pdf = pathlib.Path(sys.argv[1]); logo = sys.argv[2]
doc = pymupdf.open(pdf)
fonte = pymupdf.Font(fontfile=str(pathlib.Path.home() / '.local/share/fonts/jost-latin-500-normal.ttf')) if (pathlib.Path.home() / '.local/share/fonts/jost-latin-500-normal.ttf').exists() else pymupdf.Font(fontfile=str(pathlib.Path.home() / '.local/share/fonts/jost-latin-400-normal.ttf'))
ultima = len(doc) - 1
for i, pg in enumerate(doc):
    if i == 0 or i == ultima: continue
    pg.wrap_contents(); w, h = pg.rect.width, pg.rect.height
    pg.draw_line((54, h - 42), (w - 54, h - 42), color=(0.79, 0.64, 0.35), width=0.5)
    pg.insert_image(pymupdf.Rect(54, h - 37, 66, h - 25), filename=logo)
    tw = pymupdf.TextWriter(pg.rect)
    tw.append((71, h - 28.5), 'HOLOHACKING', font=fonte, fontsize=7.2)
    tw.write_text(pg, color=(0.043, 0.2, 0.145))
    tw2 = pymupdf.TextWriter(pg.rect)
    tw2.append((71 + fonte.text_length('HOLOHACKING', 7.2) + 6, h - 28.5), '·  Guia de uso', font=fonte, fontsize=7.2)
    n = str(i + 1); tw2.append((w - 54 - fonte.text_length(n, 9), h - 28.5), n, font=fonte, fontsize=9)
    tw2.write_text(pg, color=(0.54, 0.44, 0.2))
tmp = pdf.with_suffix('.tmp.pdf'); doc.save(tmp, garbage=3, deflate=True); n = len(doc); doc.close(); tmp.replace(pdf)
print('paginas', n)
`, PDF, R + 'logo-holohacking.png'], { stdio: 'inherit' });
/* versão leve para baixar no celular */
execFileSync('python3', ['-I', '-c', `
import sys, pymupdf
d = pymupdf.open(sys.argv[1]); d.rewrite_images(dpi_threshold=110, dpi_target=100, quality=62); d.save(sys.argv[2], garbage=4, deflate=True)
`, PDF, PDF.replace('.pdf', '-leve.pdf')]);
console.log('pdf', PDF);
