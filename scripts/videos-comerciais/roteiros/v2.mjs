/* V2 · "SÓ AQUI" (60 s) — lista rapida, cortes no compasso (120 bpm: 1 compasso = 2 s). Trilha: pop.
   Gancho -> 5 diferenciais (8 s cada, celular com a tela real) -> tudo em um so lugar / simples -> assinatura. */
import { assinatura } from './comum.mjs';

const item = (h, n, t0, titulo, sub, visual) =>
  h.d(t0, t0 + 8, 'num', String(n).padStart(2, '0'), { s: { top: 230, left: 70 }, a: 'esq', fi: .4 }) +
  h.t(t0 + .15, t0 + 8, titulo, { top: 270, left: 330, right: 60, size: 62, cls: 'sans forte', align: 'left', a: 'dir', fi: .4 }) +
  h.t(t0 + .5, t0 + 8, sub, { top: 480, size: 40, cls: 'sans leve', a: 'fade' }) +
  h.d(t0 + 1.4, t0 + 8, 'tag', 'Só no HoloHacking', { s: { top: 610, left: 690 }, a: 'pop' }) +
  visual;

export default {
  id: 'v2-so-aqui', titulo: '5 coisas que só o HoloHacking faz', dur: 60, estilo: 'pop',
  energia: [[0, .35], [3.9, .5], [4, .8], [8, .85], [40, .88], [48, .95], [52, .6], [53.9, .6], [54, .92], [60, .7]],
  marcas: [4, 8, 16, 24, 32, 40, 48, 54],
  tema: `
:root{--fundo:#f5efe3;--destaque:#b08a3e;--moldura:#c9a35a}
.bg{position:absolute;inset:0;background:linear-gradient(180deg,#f8f3ea 0%,#efe6d6 100%)}
.circ{position:absolute;width:1300px;height:1300px;left:-110px;top:900px;border-radius:50%;background:radial-gradient(circle,rgba(201,163,90,.22),transparent 65%)}
.t{color:#0a2e22}
.forte{font-weight:700;letter-spacing:-1px;line-height:1.05}
.leve{font-weight:400;color:#41534a}
.num{font-family:'Jost',sans-serif;font-weight:800;font-size:200px;line-height:1;color:#c9a35a;letter-spacing:-8px}
.tag{font-family:'Jost',sans-serif;font-size:24px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#fff;background:#0a2e22;border-radius:40px;padding:14px 24px;transform-origin:center;box-shadow:0 10px 30px rgba(10,46,34,.3)}
.verde{position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 0%,#184a37 0%,#0c3326 45%,#071f17 100%)}
.final .t{color:#f4ecdc}
.grande{font-family:'Jost',sans-serif;font-weight:800;letter-spacing:-3px}
.card{box-shadow:0 30px 70px rgba(10,46,34,.25),0 0 0 2px var(--moldura)}
`,
  corpo: (h) => `<div class="bg"></div><div class="circ"></div>
${h.t(.2, 4, 'Seu software de nutrição', { top: 620, size: 64, cls: 'sans forte', a: 'sobe', fi: .4 })}
${h.t(1.1, 4, 'faz <em>isso</em>?', { top: 740, size: 170, cls: 'grande', a: 'pop', fi: .5 })}
${h.t(2.3, 4, '↓', { top: 1050, size: 90, cls: 'sans', cor: '#c9a35a', a: 'desce' })}

${h.t(4.1, 8, '5 coisas que só o', { top: 560, size: 72, cls: 'sans forte', a: 'sobe', fi: .35 })}
${h.t(4.6, 8, 'HoloHacking', { top: 680, size: 160, a: 'pop', fi: .5 })}
${h.t(5.3, 8, 'faz por você', { top: 890, size: 72, cls: 'sans forte', a: 'sobe', fi: .35 })}
${h.d(6, 8, 'tag', 'Corpo · Mente · Espírito', { s: { top: 1090, left: 340 }, a: 'pop' })}

${item(h, 1, 8, 'Mapeamento Holístico', 'O paciente responde no celular <b>antes da consulta</b>.<br>Você chega sabendo o que importa.',
    h.cel(8.6, 16, 'mapeamento', { top: 670, esc: .9, kb: 'auto', a: 'sobe', sai: 'esq' }))}
${item(h, 2, 16, 'HOLOSCAN', '<b>5 sistemas</b>, Índice HOLOS e a Tríade<br>Físico · Mental · Espiritual.',
    h.cel(16.6, 24, 'holoscan', { top: 670, esc: .9, kb: 'auto', fundo: '#0c3326', a: 'sobe', sai: 'esq' }))}
${item(h, 3, 24, '10 ferramentas além do prato', 'Corpo, Mente e Espírito:<br>OQ³, Linha do Momentum, Mapa do Propósito…',
    h.cel(24.5, 32, 'corpo', { top: 740, esc: .58, left: 6, kb: 'auto', a: 'sobe' }) +
    h.cel(25.0, 32, 'mente', { top: 690, esc: .58, left: 354, kb: 'auto', a: 'sobe' }) +
    h.cel(25.5, 32, 'espirito', { top: 740, esc: .58, left: 702, kb: 'auto', a: 'sobe' }))}
${item(h, 4, 32, 'Playbook HOLOS', 'Um foco e de 2 a 4 estratégias <b>prontas</b>.<br>Você só revisa e ajusta.',
    h.cel(32.6, 40, 'playbook', { top: 670, esc: .9, kb: 'auto', fundo: '#0c3326', a: 'sobe', sai: 'esq' }))}
${item(h, 5, 40, 'Resultado HOLOS', 'Lindo, com a <b>sua marca</b>,<br>direto no WhatsApp do paciente.',
    h.cel(40.6, 48, 'documento', { top: 670, esc: .9, kb: 'auto', a: 'sobe', sai: 'esq' }) +
    h.d(43.5, 48, 'whats', '<b>PDF</b><span>Resultado HOLOS enviado ✓✓</span>', { s: { top: 1560 }, a: 'pop' }))}

${h.t(48.2, 54, 'Tudo em <em>um só lugar.</em>', { top: 420, size: 96 })}
${h.t(49.1, 54, 'E simples de usar.', { top: 580, size: 58, cls: 'sans forte' })}
${['Agenda', 'Ficha completa', 'Mapeamento', 'HOLOSCAN', '10 ferramentas', 'Playbook', 'Resultado HOLOS', 'Evolução'].map((c, i) =>
    h.d(49.8 + i * .35, 54, 'chip', c, { s: { top: 800 + Math.floor(i / 2) * 140, left: i % 2 ? 560 : 120 }, a: 'pop' })).join('')}

<div class="final">${h.d(54, 61, 'verde', '', { a: 'fade', fi: .3, fo: .01 })}${assinatura(h, 54.2, 60)}</div>
`
};
