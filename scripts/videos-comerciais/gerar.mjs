/**
 * Gera os 5 videos comerciais (Instagram / trafego pago, vertical 1080x1920).
 *   node scripts/videos-comerciais/gerar.mjs                 -> todos
 *   node scripts/videos-comerciais/gerar.mjs v2 v4           -> so esses
 *   node scripts/videos-comerciais/gerar.mjs v1 --quadros=3,10,25   -> so quadros de conferencia (saida/<id>/quadros)
 * Saida final: docs/comercial/videos/<id>.mp4
 */
import { mkdirSync } from 'node:fs';
import { renderizar, R } from './motor.mjs';
const quadros = (process.argv.find(x => x.startsWith('--quadros=')) || '').slice(10).split(',').filter(Boolean).map(Number);
const pedidos = process.argv.slice(2).filter(x => !x.startsWith('--'));
const todos = ['v1', 'v2', 'v3', 'v4', 'v5'];
const DEST = R + 'docs/comercial/videos/'; mkdirSync(DEST, { recursive: true });
for (const n of (pedidos.length ? pedidos : todos)) {
  const v = (await import('./roteiros/' + n + '.mjs')).default;
  const t0 = Date.now();
  const r = await renderizar(v, quadros.length ? { quadros } : { saida: DEST + 'holohacking-' + v.id + '.mp4' });
  console.log(v.id, '->', r, Math.round((Date.now() - t0) / 1000) + 's');
}
