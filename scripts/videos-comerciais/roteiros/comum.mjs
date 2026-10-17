/* Pecas comuns aos 5 videos: assinatura final (logo, nome, frase, CTA) e fundos. */
import { LOGO } from '../motor.mjs';

/* assinatura final, de t0 ate fim. claro=true: texto escuro sobre fundo claro */
export function assinatura(h, t0, fim, { claro = false, cta = 'Chame no direct', frase = 'Nutrição que cuida do<br><em>ser humano inteiro.</em>' } = {}) {
  const cor = claro ? '#0a2e22' : '#f4ecdc';
  return `<img class="logo" src="${LOGO}" style="top:400px" data-in="${t0}" data-out="${fim + 1}" data-a="zoom" data-fo="0.01">` +
    h.t(t0 + .5, fim + 1, 'HoloHacking', { top: 670, size: 112, cor, fo: .01 }) +
    h.d(t0 + 1.1, fim + 1, 'linha', '', { s: { top: 840, left: 440, width: 200 }, fo: .01 }) +
    h.t(t0 + 1.3, fim + 1, frase, { top: 890, size: 62, cor, fo: .01 }) +
    h.t(t0 + 2.2, fim + 1, 'CORPO · MENTE · ESPÍRITO', { top: 1110, size: 30, cls: 'sans', ls: '10px', cor: '#c9a35a', a: 'fade', fo: .01 }) +
    h.d(t0 + 3, fim + 1, 'cta', cta, { s: { top: 1290 }, a: 'pop', fo: .01, pulso: '' });
}

export const FUNDO_ESCURO = `
:root{--fundo:#071f17;--destaque:#e3c88e;--moldura:#c9a35a}
.bg{position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 0%,#184a37 0%,#0c3326 45%,#071f17 100%)}
.bg2{position:absolute;inset:0;background:radial-gradient(60% 40% at 50% 100%,rgba(201,163,90,.16),transparent 70%)}
.t{color:#f4ecdc;text-shadow:0 2px 20px rgba(0,0,0,.35)}
.sub{font-family:'Jost',sans-serif;font-weight:300;color:#d9d1bc}
`;
