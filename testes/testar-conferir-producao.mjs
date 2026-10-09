/**
 * scripts/conferir-producao.sh — a conferencia do ar pelo hash.
 *
 * Sobe um servidor HTTP local que serve o que o Dockerfile copia (index.html, aprovacoes.html,
 * style.css, favicon.svg, logo-holohacking.png, *.js da raiz), com o fallback do nginx (arquivo que
 * nao existe volta como index.html), e roda o script contra ele:
 *   1  tudo igual ao docs/deploy.md §3.5: "OK: N de N", exit 0
 *   2  um arquivo alterado: reprova, exit 1, e nomeia o arquivo
 *   3  um arquivo faltando: reprova e diz que voltou o index.html
 *   4  endereco fora do ar: reprova, exit 1
 * E confere que a lista do §3.5 bate com os arquivos do repo.
 */
import './guarda-falhas.mjs';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const RAIZ = new URL('..', import.meta.url);
const SCRIPT = new URL('../scripts/conferir-producao.sh', import.meta.url).pathname;

const servidos = ['index.html', 'aprovacoes.html', 'anamnese.html', 'style.css', 'favicon.svg', 'logo-holohacking.png', ...readdirSync(RAIZ).filter(f => f.endsWith('.js')).sort()];
const conteudo = Object.fromEntries(servidos.map(f => [f, readFileSync(new URL(f, RAIZ))]));

const doc = readFileSync(new URL('docs/deploy.md', RAIZ), 'utf8');
const bloco = doc.split('### 3.5 ')[1].split('```')[1];
const esperado = Object.fromEntries(bloco.trim().split('\n').map(l => l.split(/\s+/)).map(([h, n]) => [n, h]));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const divergentes = servidos.filter(f => esperado[f] !== sha(conteudo[f]));
ok(Object.keys(esperado).length === servidos.length && divergentes.length === 0,
   'docs/deploy.md §3.5 lista os ' + servidos.length + ' arquivos servidos com o sha256 do repo' +
   (divergentes.length ? ' | diferem: ' + divergentes.join(', ') : ''));

let mexidos = {};
const srv = createServer((req, res) => {
  const nome = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1)) || 'index.html';
  const corpo = nome in mexidos ? mexidos[nome] : conteudo[nome];
  res.writeHead(200);
  res.end(corpo === undefined || corpo === null ? conteudo['index.html'] : corpo);   // fallback do SPA, como o nginx
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + srv.address().port;
const rodar = (base) => new Promise(r => {
  // spawn assincrono: o servidor desta mesma thread precisa responder
  import('node:child_process').then(({ spawn }) => {
    const p = spawn('sh', [SCRIPT, base]);
    let out = '';
    p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
    p.on('close', code => r({ code, out }));
  });
});

let r = await rodar(BASE);
const N = servidos.length;
ok(r.code === 0 && r.out.includes(`OK: ${N} de ${N}`), `tudo igual: "OK: ${N} de ${N}", exit 0 → ` + r.out.trim().split('\n').at(-1));

mexidos = { 'app.js': Buffer.concat([conteudo['app.js'], Buffer.from('\n// mexido\n')]) };
r = await rodar(BASE);
ok(r.code === 1 && r.out.includes(`DIFEREM: 1 de ${N}`) && /^\s+app\.js\s+esperado/m.test(r.out),
   'app.js alterado: exit 1 e o app.js nomeado → ' + r.out.trim().split('\n').slice(1).join(' | '));

mexidos = { 'sincronizacao.js': null };
r = await rodar(BASE);
ok(r.code === 1 && /sincronizacao\.js .*voltou o index\.html/.test(r.out),
   'sincronizacao.js faltando: exit 1 e "voltou o index.html"');

srv.close();
r = await rodar('http://127.0.0.1:1');
ok(r.code === 1 && r.out.includes(`DIFEREM: ${N} de ${N}`), `endereco fora do ar: exit 1, os ${N} listados`);

const src = readFileSync(SCRIPT, 'utf8');
ok(!/Authorization|apikey|token|senha|password/i.test(src.replace(/^#.*$/gm, '')), 'o script nao usa credencial nenhuma');

process.exit(falhou ? 1 : 0);
