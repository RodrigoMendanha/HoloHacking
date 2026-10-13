/* Servidor estatico minimo do HoloHacking para a captura do video (so 127.0.0.1). Uso: node servidor.mjs [porta] */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
const RAIZ = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
export function servir(porta = 5500) {
  /* o servidor falso do Supabase (testes/supabase-falso.mjs) so aceita a pagina em 127.0.0.1:5500; se ja houver um servidor la, usa ele */
  return new Promise(ok => {
    const s = createServer(async (req, res) => {
      try {
        const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        let arq = normalize(join(RAIZ, caminho));
        if (arq !== RAIZ && !arq.startsWith(RAIZ + sep)) { res.writeHead(403); res.end(); return; }
        let st = await stat(arq).catch(() => null);
        if (st && st.isDirectory()) { arq = join(arq, 'index.html'); st = await stat(arq).catch(() => null); }
        if (!st && !extname(caminho)) { arq = join(RAIZ, 'index.html'); st = await stat(arq).catch(() => null); }
        if (!st) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': TIPOS[extname(arq).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(await readFile(arq));
      } catch (e) { res.writeHead(500); res.end(String(e)); }
    }).on('error', e => { if (e.code === 'EADDRINUSE') ok(null); else throw e; }).listen(porta, '127.0.0.1', () => ok(s));
  });
}
if (import.meta.url === 'file://' + process.argv[1]) { await servir(Number(process.argv[2]) || 5500); console.log('servindo'); }
