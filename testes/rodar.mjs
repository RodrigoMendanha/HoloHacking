/**
 * RODAR — o comando canonico da suite completa.
 *
 *   npm run teste            (o mesmo que npm run test:release)
 *
 * O que ele faz, nesta ordem:
 *   1. confere que toda testes/testar-*.mjs esta na lista canonica
 *      (suites.mjs) — suite esquecida fora da lista e falha, nao silencio;
 *   2. sobe um servidor estatico temporario em 127.0.0.1:5500 servindo a
 *      raiz do repositorio (o que os testes esperam). Se a porta ja estiver
 *      ocupada, PARA com erro: reaproveitar um servidor desconhecido podia
 *      testar outra copia do app e dar verde falso. Quem quiser mesmo usar
 *      um servidor proprio passa --servidor-existente;
 *   3. roda cada suite num processo proprio, em serie, sem parar na
 *      primeira falha (o relatorio final lista todas);
 *   4. julga cada suite por avaliarSuite(): exit 0 E nenhuma linha FALHA
 *      E pelo menos uma assercao ok;
 *   5. derruba o servidor e sai com exit 1 se qualquer suite reprovou.
 *
 * Opcoes:
 *   --so <padrao>            roda so as suites cujo nome contem <padrao>
 *   --servidor-existente     nao sobe servidor; usa o que ja esta na 5500
 *   --verboso                repete a saida inteira de cada suite
 *
 * A saida de cada suite fica em testes/.saida/<suite>.log (ignorado pelo git).
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat, mkdir, writeFile, readdir } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUITES } from './suites.mjs';
import { avaliarSuite } from './avaliar-suite.mjs';

const TESTES = fileURLToPath(new URL('.', import.meta.url));
const RAIZ = normalize(join(TESTES, '..'));
const SAIDA = join(TESTES, '.saida');
const PORTA = 5500;
const HOST = '127.0.0.1';

const args = process.argv.slice(2);
const opcao = (n) => args.includes(n);
const iSo = args.indexOf('--so');
const filtro = iSo >= 0 ? args[iSo + 1] : null;

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.ico': 'image/x-icon'
};

function subirServidor() {
  const srv = createServer(async (req, res) => {
    try {
      let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let arq = normalize(join(RAIZ, caminho));
      if (arq !== RAIZ && !arq.startsWith(RAIZ + sep)) { res.writeHead(403); res.end(); return; }
      let s = await stat(arq).catch(() => null);
      if (s && s.isDirectory()) { arq = join(arq, 'index.html'); s = await stat(arq).catch(() => null); }
      /* como o nginx de producao (try_files ... /index.html): caminho sem
         extensao que nao e arquivo (ex.: /cadastro) devolve o index.html */
      if (!s && !extname(caminho)) { arq = join(RAIZ, 'index.html'); s = await stat(arq).catch(() => null); }
      if (!s) { res.writeHead(404); res.end('404'); return; }
      const corpo = await readFile(arq);
      res.writeHead(200, {
        'Content-Type': TIPOS[extname(arq).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(corpo);
    } catch (e) {
      res.writeHead(500); res.end(String(e && e.message || e));
    }
  });
  return new Promise((ok, falhou) => {
    srv.once('error', falhou);
    srv.listen(PORTA, HOST, () => ok(srv));
  });
}

function rodarSuite(nome) {
  return new Promise((ok) => {
    const inicio = Date.now();
    const filho = spawn(process.execPath, [join(TESTES, nome)], {
      cwd: RAIZ, env: process.env, stdio: ['ignore', 'pipe', 'pipe']
    });
    let saida = '';
    filho.stdout.on('data', d => { saida += d; });
    filho.stderr.on('data', d => { saida += d; });
    filho.on('close', (codigo, sinal) => ok({
      codigo: codigo === null ? (sinal || 'sinal') : codigo, saida, ms: Date.now() - inicio
    }));
  });
}

async function conferirLista() {
  const arquivos = (await readdir(TESTES)).filter(f => /^testar-.*\.mjs$/.test(f));
  const fora = arquivos.filter(f => !SUITES.includes(f));
  const fantasmas = SUITES.filter(f => !arquivos.includes(f));
  const repetidas = SUITES.filter((f, i) => SUITES.indexOf(f) !== i);
  return { fora, fantasmas, repetidas };
}

const lista = await conferirLista();
if (lista.fora.length || lista.fantasmas.length || lista.repetidas.length) {
  console.error('Lista de suites inconsistente (testes/suites.mjs):');
  if (lista.fora.length) console.error('  fora da lista: ' + lista.fora.join(', '));
  if (lista.fantasmas.length) console.error('  listadas mas inexistentes: ' + lista.fantasmas.join(', '));
  if (lista.repetidas.length) console.error('  repetidas: ' + lista.repetidas.join(', '));
  process.exit(1);
}

const alvo = filtro ? SUITES.filter(s => s.includes(filtro)) : SUITES;
if (!alvo.length) { console.error('Nenhuma suite corresponde a "' + filtro + '".'); process.exit(1); }

let servidor = null;
if (!opcao('--servidor-existente')) {
  try {
    servidor = await subirServidor();
  } catch (e) {
    console.error('Nao consegui subir o servidor em ' + HOST + ':' + PORTA + ' (' + (e.code || e.message) + ').');
    console.error('Se ja existe um servidor servindo ESTE repositorio nessa porta, rode com --servidor-existente.');
    process.exit(1);
  }
}

await mkdir(SAIDA, { recursive: true });
console.log('HoloHacking — ' + alvo.length + ' suite(s)' + (filtro ? ' (filtro: ' + filtro + ')' : '') +
            (servidor ? ', servidor temporario em http://' + HOST + ':' + PORTA : ', servidor existente') + '\n');

const resultados = [];
for (const nome of alvo) {
  const r = await rodarSuite(nome);
  const v = avaliarSuite(r);
  resultados.push({ nome, ...v, ms: r.ms });
  await writeFile(join(SAIDA, nome.replace(/\.mjs$/, '.log')), r.saida);
  const marca = v.passou ? 'ok   ' : 'FALHOU';
  console.log('  ' + marca + ' ' + nome.padEnd(44) + String(v.oks).padStart(4) + ' assercoes  ' +
              (r.ms / 1000).toFixed(1).padStart(6) + 's' + (v.passou ? '' : '  ← ' + v.motivos.join(', ')));
  if (!v.passou || opcao('--verboso')) {
    const linhas = r.saida.split('\n');
    const relevantes = v.passou ? linhas : linhas.filter(l => /FALHA|ERRO|Error|error/.test(l)).slice(0, 30);
    relevantes.forEach(l => console.log('        │ ' + l));
  }
}

if (servidor) await new Promise(ok => servidor.close(ok));

const reprovadas = resultados.filter(r => !r.passou);
const assercoes = resultados.reduce((s, r) => s + r.oks, 0);
const falhas = resultados.reduce((s, r) => s + r.falhas, 0);
console.log('\n  suites:     ' + resultados.length);
console.log('  assercoes:  ' + assercoes);
console.log('  falhas:     ' + falhas);
console.log('  reprovadas: ' + reprovadas.length + (reprovadas.length ? ' (' + reprovadas.map(r => r.nome).join(', ') + ')' : ''));
console.log(reprovadas.length ? '\nRESULTADO: FALHOU' : '\nRESULTADO: VERDE');
process.exit(reprovadas.length ? 1 : 0);
