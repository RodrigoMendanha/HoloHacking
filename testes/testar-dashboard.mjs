/**
 * O dashboard era a apresentacao do metodo — o mesmo texto todo dia, com ou
 * sem paciente. Agora e o trabalho de hoje: quem esta esperando, o tamanho da
 * carteira e o terreno que se repete nela.
 *
 * As regras de pendencia sao as de panorama.js, as mesmas que a ficha usa.
 * Este teste confere que as duas telas contam a mesma historia.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1500, height: 1300 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => {
  if (!c) falhou = true;
  console.log((c ? '  ok    ' : '  FALHA ') + t);
};

// --- carteira vazia: o metodo e a resposta certa --------------------------
const vazio = await p.evaluate(() => ({
  texto: document.getElementById('dash-trabalho').innerText.replace(/\s+/g, ' ').trim(),
  metodo: !document.getElementById('dash-metodo').classList.contains('hidden'),
  pendentes: document.querySelectorAll('#dash-lista-pendentes .dash-pendente').length,
  jornada: document.querySelectorAll('#dash-trabalho .dash-jornada-passo').length,
}));
ok(/nenhum paciente cadastrado/i.test(vazio.texto), 'sem paciente, convida a cadastrar');
ok(/nenhuma consulta agendada/i.test(vazio.texto), 'sem consulta marcada, estado vazio elegante');
ok(vazio.metodo, 'e o método continua à vista — ali ele serve');
ok(vazio.pendentes === 0, 'nenhuma pendência inventada do nada');
ok(vazio.jornada === 4, 'a jornada clínica (MAPEAR → CONFRONTAR → INTEGRAR → ACOMPANHAR) sempre aparece');

// --- uma carteira de verdade ---------------------------------------------
await p.evaluate(async (respostas) => {
  const novo = async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    const v = document.getElementById('voltar-lista'); if (v) v.click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    await new Promise(x => setTimeout(x, 300));
    return window.pacienteAtivoId();
  };
  const sentido = {}; HOLOSCAN.questionario().forEach(q => sentido[q.id] = q.sentido);
  const variar = n => respostas.map(x => ({ marcador_id: x.marcador_id,
    intensidade: sentido[x.marcador_id] === 'invertido'
      ? Math.min(3, Math.max(0, x.intensidade + n))
      : Math.max(0, Math.min(3, x.intensidade - n)) }));

  await novo('Marina Alves');                       // mapa hoje, sem conduta
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  window.aplicarPontuacao(HOLOSCAN.calcular(respostas));

  const cid = await novo('Carla Souza');             // mapa antigo
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  window.aplicarPontuacao(HOLOSCAN.calcular(variar(1)));
  const h = JSON.parse(localStorage.getItem('holohacking.pontuacao'));
  h[cid][0].quando = '2026-07-01';
  localStorage.setItem('holohacking.pontuacao', JSON.stringify(h));

  await novo('Beatriz Lima');
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  window.aplicarPontuacao(HOLOSCAN.calcular(variar(2)));

  await novo('Helena Rocha');                        // questionario parado
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  document.getElementById('btn-abrir-questionario').click();
  [...document.querySelectorAll('.q-item')].slice(0, 12).forEach(i => i.querySelectorAll('.q-btn')[2].click());

  await novo('Sofia Martins');                       // nada feito
}, caso.respostas);

const cheio = await p.evaluate(() => {
  document.querySelector('.nav-item[data-secao="dashboard"]').click();
  window.redesenharDashboard();
  return {
    metodo: !document.getElementById('dash-metodo').classList.contains('hidden'),
    pendentes: [...document.querySelectorAll('#dash-lista-pendentes .dash-pendente')].map(l => ({
      nome: l.querySelector('b').textContent,
      porque: l.querySelector('.dash-porque').textContent,
      botao: l.querySelector('.dash-ir').textContent.replace(/\s*→\s*$/, '').trim(),
    })),
    tiles: [...document.querySelectorAll('.dash-tile')].map(t =>
      t.querySelector('b').textContent + ' ' + t.querySelector('span').textContent),
    barras: [...document.querySelectorAll('.dash-barra')].map(b =>
      b.querySelector('.dash-barra-nome').textContent + '=' + b.querySelector('.dash-barra-n').textContent),
    homologacao: !!document.querySelector('.dash-homologacao .selo-homologacao'),
    recentes: [...document.querySelectorAll('#dash-lista-recentes .dash-pendente b')].map(b => b.textContent),
    comMapa: window.Panorama.carteira().comMapa,
    terreno: /terreno da sua carteira/i.test(document.getElementById('dash-trabalho').innerText),
  };
});

ok(!cheio.metodo, 'com paciente cadastrado, a apresentação do método sai da frente');
ok(cheio.pendentes.length === 5, cheio.pendentes.length + ' pacientes precisando de atenção');
console.log(cheio.pendentes.map(x => '          ' + x.nome + ' — ' + x.porque).join('\n'));
ok(cheio.recentes.length === 3, 'pacientes recentes mostra no máximo 3: ' + cheio.recentes.join(' · '));
ok(cheio.recentes[0] === 'Sofia Martins', 'e o mais novo cadastro vem primeiro: ' + cheio.recentes[0]);

const carla = cheio.pendentes.find(x => /Carla/.test(x.nome));
/* Etapa 0 da V1: o alerta "reavaliação vencida" (28 dias) foi neutralizado —
   prazo de acompanhamento é da profissional (Mestre §33). A Carla continua
   na lista só pela pendência operacional ("mapa sem conduta"). */
ok(carla && !/reavalia/.test(carla.porque), 'nenhuma "reavaliação vencida" automática para a Carla: ' + carla.porque);
const helena = cheio.pendentes.find(x => /Helena/.test(x.nome));
ok(/12 de 84/.test(helena.porque) && helena.botao === 'Continuar',
   'o questionário parado da Helena convida a continuar: ' + helena.porque);
const sofia = cheio.pendentes.find(x => /Sofia/.test(x.nome));
ok(sofia.botao === 'Aplicar agora', 'quem não tem mapa é chamada para aplicar');

/* Correcao do dashboard (pos-6.5): o bloco "N pacientes / N com HOLOSCAN"
   saiu (repetia o cabecalho com outro numero) e "O terreno da sua carteira"
   fica escondido ate haver regra homologada de agregacao. "Com HOLOSCAN"
   continua contado em Panorama.carteira() (usado pelos Primeiros passos). */
ok(cheio.tiles.some(t => /^5 Pacientes ativos/.test(t)), 'tiles: ' + cheio.tiles.join(' · '));
ok(cheio.comMapa === 3 && !cheio.tiles.some(t => /com HOLOSCAN/.test(t)), 'conta quem tem mapa (3), sem tile repetido no dashboard');
ok(cheio.barras.length === 0 && !cheio.homologacao && !cheio.terreno, 'o terreno da carteira não aparece (nem barras, nem aviso de recurso desligado)');
ok(!cheio.tiles.some(t => /Índice HOLOS médio|reavaliaç(ão|ões) vencida/.test(t)), 'sem tile de Índice médio nem de reavaliações vencidas: ' + cheio.tiles.join(' · '));

// --- o botao leva mesmo ao paciente certo --------------------------------
const ida = await p.evaluate(async () => {
  const b = document.querySelector('#dash-lista-pendentes .dash-pendente .dash-ir');
  const nome = b.closest('.dash-pendente').querySelector('b').textContent;
  b.click();
  await new Promise(r => setTimeout(r, 400));
  return { nome, botao: b.textContent.replace(/\s*→\s*$/, '').trim(), ativo: window.pacienteAtivoNome(),
    secao: document.querySelector('.secao.ativa')?.id, aba: document.querySelector('[data-aba].ativa')?.dataset.aba, fichaVisivel: !document.getElementById('vista-ficha').classList.contains('hidden') };
});

// --- arquivado nao e pendencia; os numeros batem entre si -----------------
const arq = await p.evaluate(async () => {
  const sofia = window.pacientesTodos().find(x => x.nome === 'Sofia Martins');
  sofia.status = 'inativo';                      // o mesmo campo que "Arquivar" grava
  window.definirPacienteAtivo(sofia.id);         // e ela fica em foco, como no relato
  document.querySelector('.nav-item[data-secao="dashboard"]').click();
  window.redesenharDashboard();
  const txt = s => (document.querySelector(s) || {}).innerText || '';
  const nomes = s => [...document.querySelectorAll(s + ' .dash-pendente b')].map(b => b.textContent);
  const tile = r => { const t = [...document.querySelectorAll('.dash-resumo .dash-tile')].find(x => x.querySelector('span').textContent === r); return t ? Number(t.querySelector('b').textContent) : null; };
  const precisa = document.querySelector('#dash-precisa .dash-titulo em');
  const ordem = [...document.querySelectorAll('#dash-trabalho .dash-titulo')].map(h => h.childNodes[0].textContent.trim());
  // a jornada diz quem esta em foco e nao segue com arquivado
  const foco = txt('#dash-jornada-foco');
  document.querySelector('#dash-trabalho [data-jornada][data-destino="holoscan"]').click();
  await new Promise(r => setTimeout(r, 200));
  const secaoJornada = document.querySelector('.secao.ativa')?.id;
  const opcao = [...document.querySelectorAll('#sel-holoscan option')].find(o => o.value === sofia.id)?.textContent;
  const avisoComFoco = document.querySelector('#secao-holoscan .barra-paciente .aviso').hidden;
  return { pend: nomes('#dash-lista-pendentes'), recentes: nomes('#dash-lista-recentes'),
    tileAtivos: tile('Pacientes ativos'), tilePend: tile('Pendências'),
    precisa: precisa ? Number(precisa.textContent) : 0, ordem, foco, secaoJornada, opcao, avisoComFoco };
});
ok(!arq.pend.includes('Sofia Martins'), 'arquivada nao aparece em "Precisa de você": ' + arq.pend.join(' · '));
ok(!arq.recentes.includes('Sofia Martins'), 'nem em "Pacientes recentes": ' + arq.recentes.join(' · '));
ok(arq.tileAtivos === 4, 'Pacientes ativos conta 4 (sem a arquivada): ' + arq.tileAtivos);
ok(arq.tilePend === arq.precisa && arq.precisa === arq.pend.length,
   'Pendências do topo = "Precisa de você": ' + arq.tilePend + ' = ' + arq.precisa);
ok(arq.ordem.indexOf('Precisa de você') < arq.ordem.indexOf('Próximas consultas marcadas') &&
   arq.ordem.indexOf('Próximas consultas marcadas') < arq.ordem.indexOf('Pacientes recentes') &&
   arq.ordem.indexOf('Pacientes recentes') < arq.ordem.indexOf('Jornada clínica'),
   'ordem: Precisa de você → Próximas → Recentes → Jornada: ' + arq.ordem.join(' → '));
ok(/Sofia Martins/.test(arq.foco) && /arquivad/.test(arq.foco), 'a jornada diz quem está em foco (e que está arquivada): ' + arq.foco);
ok(arq.secaoJornada === 'secao-pacientes', 'com arquivada em foco, a jornada pede outro paciente em vez de abrir o HOLOSCAN: ' + arq.secaoJornada);
ok(arq.avisoComFoco === true, 'HOLOSCAN: com paciente escolhido, o aviso "Selecione um paciente" some');
ok(/\(arquivado\)/.test(arq.opcao || ''), 'no seletor, a arquivada aparece como "(arquivado)": ' + arq.opcao);
ok(ida.ativo === ida.nome, 'clicar na linha troca o paciente ativo: ' + ida.ativo);
/* a primeira da lista e "mapa sem conduta": o botao "Abrir conduta" leva a
   ficha, na aba Conduta (antes "Ver por onde começar" abria o HOLOSCAN) */
ok(ida.botao === 'Abrir conduta' && ida.secao === 'secao-pacientes' && ida.aba === 'conduta',
   'e leva para a tela certa: ' + ida.botao + ' → ' + ida.secao + ' / aba ' + ida.aba);

// --- a ficha tem que contar a mesma historia ------------------------------
const mesma = await p.evaluate(() => {
  const pid = window.pacienteAtivoId();
  const d = window.Panorama.doPaciente(pid);
  return { doPanorama: window.Panorama.alertas(d).map(a => a.texto) };
});
ok(mesma.doPanorama.length > 0, 'ficha e dashboard leem a mesma regra: ' + mesma.doPanorama[0]);

// --- consultas: hora sem segundos, todas as futuras, por data e hora ------
const ag = await p.evaluate(async () => {
  const id = n => window.pacientesTodos().find(x => x.nome === n).id;
  const dia = k => { const d = new Date(); d.setDate(d.getDate() + k); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  // o banco devolve time como "HH:MM:SS"
  const ins = (n, k, h) => window.DadosLocais.from('consultas').insert({ paciente_id: id(n), data: dia(k), hora: h, duracao: 60, tipo: 'Retorno', nota: '' });
  await ins('Beatriz Lima', 0, '14:00:00');
  await ins('Carla Souza', 3, '11:00:00');
  await ins('Beatriz Lima', 3, '09:00:00');
  await ins('Helena Rocha', 1, '16:00:00');
  await window.Agenda.recarregar();
  document.querySelector('.nav-item[data-secao="dashboard"]').click();
  window.redesenharDashboard();
  const linhas = s => [...document.querySelectorAll(s + ' .dash-pendente')].map(l => l.querySelector('b').textContent + ' ' + l.querySelector('.dash-porque').textContent);
  return { hoje: linhas('#dash-lista-hoje'), prox: linhas('#dash-lista-atendimentos'),
    tudo: document.getElementById('dash-trabalho').innerText };
});
ok(ag.hoje.length === 1 && /14:00/.test(ag.hoje[0]) && !/\d\d:\d\d:\d\d/.test(ag.tudo), 'hora sem segundos: ' + ag.hoje[0]);
ok(ag.prox.length === 3 && /^Helena/.test(ag.prox[0]) && /^Beatriz.*09:00/.test(ag.prox[1]) && /^Carla.*11:00/.test(ag.prox[2]),
   'próximas: todas as consultas futuras (a Beatriz tem duas), por data e hora: ' + ag.prox.join(' | '));

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
