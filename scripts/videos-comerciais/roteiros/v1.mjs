/* V1 · "INTEIRO" (60 s) — manifesto emocional. Trilha: cinematico (piano + cordas, Re menor).
   Dor (ser vista) -> posicionamento (ser humano inteiro) -> 4 diferenciais com telas reais -> beneficios nutri/paciente -> assinatura. */
import { assinatura, FUNDO_ESCURO } from './comum.mjs';
import { LOGO } from '../motor.mjs';

const flash = (h, i, t0, rot, sub, tela, kb, extra = '') =>
  h.t(t0, t0 + 4, String(i).padStart(2, '0'), { top: 330, size: 30, cls: 'sans', ls: '10px', cor: '#c9a35a', a: 'fade' }) +
  h.t(t0 + .1, t0 + 4, rot, { top: 380, size: 84 }) +
  h.t(t0 + .4, t0 + 4, sub, { top: 500, size: 38, cls: 'sans sub' }) +
  h.card(t0 + .2, t0 + 4, tela, { top: 620, h: 1000, kb, a: 'zoom', sai: 'esq' }) + extra;

export default {
  id: 'v1-inteiro', titulo: 'Inteiro — manifesto', dur: 60, estilo: 'cinematico',
  energia: [[0, .2], [10, .35], [17, .55], [24, .7], [40, .95], [52, .8], [57, .4], [60, .3]],
  marcas: [17.3, 40, 52.3],
  tema: FUNDO_ESCURO,
  corpo: (h) => `<div class="bg"></div><div class="bg2"></div>
${h.t(.3, 5, 'Ela não precisava de', { top: 700, size: 80, a: 'desfoque', fi: 1.2 })}
${h.t(1.3, 5, '<em>mais uma dieta.</em>', { top: 810, size: 112, a: 'desfoque', fi: 1.2 })}
${h.t(5.3, 10, 'Precisava ser', { top: 720, size: 84 })}
${h.t(6.3, 10, '<em>vista.</em>', { top: 830, size: 170, a: 'desfoque', fi: 1.4, sai: 'zoom' })}

${h.t(10.3, 17, 'O que chega ao consultório junto com ela:', { top: 380, size: 52, cls: 'sans sub' })}
${h.t(11.1, 17, '<em>o cansaço</em>', { top: 640, size: 92, a: 'zoom' })}
${h.t(12.1, 17, '<em>a ansiedade</em>', { top: 780, size: 92, a: 'zoom' })}
${h.t(13.1, 17, '<em>a rotina que não para</em>', { top: 920, size: 92, a: 'zoom' })}
${h.t(14.1, 17, '<em>a falta de sentido</em>', { top: 1060, size: 92, a: 'zoom' })}
${h.t(15.3, 17, 'Nenhuma planilha enxerga isso.', { top: 1300, size: 44, cls: 'sans sub' })}

${h.t(17.3, 20.2, 'Muitos softwares<br><em>calculam dietas.</em>', { top: 740, size: 92 })}
<img class="logo" src="${LOGO}" style="top:380px" data-in="20.3" data-out="24" data-a="zoom">
${h.t(20.7, 24, 'Só o HoloHacking cuida do<br><em>ser humano inteiro.</em>', { top: 680, size: 78 })}
${h.d(21.8, 24, 'pill', 'Corpo', { s: { top: 1040, left: 390, width: 300 }, a: 'pop' })}
${h.d(22.3, 24, 'pill', 'Mente', { s: { top: 1160, left: 390, width: 300 }, a: 'pop' })}
${h.d(22.8, 24, 'pill', 'Espírito', { s: { top: 1280, left: 390, width: 300 }, a: 'pop' })}

${h.d(24, 40, 'selo', 'O que só o HoloHacking tem', { s: { top: 250 } })}
${flash(h, 1, 24, 'Mapeamento Holístico', 'O paciente responde no celular, antes da consulta', 'mapeamentoResp', '0,-430')}
${flash(h, 2, 28, 'HOLOSCAN', '5 sistemas, Índice HOLOS e Tríade', 'holoscan', '0,-900')}
${flash(h, 3, 32, 'Corpo · Mente · Espírito', '10 ferramentas que vão além do prato', 'mente', '0,-870')}
${flash(h, 4, 36, 'Resultado HOLOS', 'Com a sua marca, direto no WhatsApp', 'documento', '0,-1700',
    h.d(37.4, 40, 'whats', '<b>PDF</b><span>Resultado HOLOS enviado ✓✓</span>', { s: { top: 1500 }, a: 'pop' }))}

${h.d(40.2, 46, 'selo', 'Para você', { s: { top: 330 } })}
${h.t(40.5, 46, 'Clareza de <em>por onde começar.</em>', { top: 390, size: 78 })}
${h.t(41.4, 46, 'E um plano pronto em minutos.', { top: 600, size: 42, cls: 'sans sub' })}
${h.d(42.4, 46, 'selo', 'Para o seu paciente', { s: { top: 820 } })}
${h.t(42.7, 46, 'Entender o próprio <em>caminho.</em>', { top: 880, size: 78 })}
${h.t(43.6, 46, 'E sentir que foi visto por inteiro.', { top: 1090, size: 42, cls: 'sans sub' })}
${h.t(46.3, 52, 'Mais <em>adesão.</em>', { top: 640, size: 130, a: 'zoom' })}
${h.t(47.3, 52, 'Mais <em>fidelização.</em>', { top: 810, size: 130, a: 'zoom' })}
${h.t(48.6, 52, 'Um atendimento que nenhuma<br>calculadora de dieta entrega.', { top: 1060, size: 42, cls: 'sans sub', a: 'fade' })}
${assinatura(h, 52.3, 60)}
`
};
