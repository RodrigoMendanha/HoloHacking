/* V3 · "SIMPLES ASSIM" (120 s) — passo a passo no celular, do primeiro contato ao Resultado no WhatsApp.
   Trilha: lofi (Rhodes + batida suave). Visual claro e acolhedor, barra de progresso dos 5 passos. */
import { assinatura } from './comum.mjs';

const P = [9, 27, 45, 63, 81, 99];                       // inicio de cada passo (o ultimo valor = fim do passo 5)
const passo = (h, n, titulo, sub) => {
  const a = P[n - 1], b = P[n];
  return h.d(a, b, 'selo-p', 'Passo ' + n + ' de 5', { s: { top: 240 }, a: 'fade', fi: .4 }) +
    h.d(a, b, 'trilho', `<div class="enche" data-in="${a}" data-out="${b}" data-a="fade" data-fi="0.01" data-barra="${(n - 1) * 20},${n * 20}"></div>`, { s: { top: 300 } }) +
    h.t(a + .2, b, titulo, { top: 345, size: 68 }) +
    h.t(a + .8, b, sub, { top: 450, size: 38, cls: 'sans leve', a: 'fade' });
};
const dica = (h, a, b, txt, top, lado = 'dir') => h.d(a, b, 'chip', txt, { s: { top, ...(lado === 'dir' ? { right: 40 } : { left: 40 }) }, a: 'pop' });

export default {
  id: 'v3-simples-assim', titulo: 'Simples assim — passo a passo', dur: 120, estilo: 'lofi',
  energia: [[0, .3], [9, .45], [27, .55], [45, .6], [63, .65], [81, .75], [99, .6], [106, .8], [112, .7], [120, .4]],
  marcas: [9, 27, 45, 63, 81, 99, 112],
  tema: `
:root{--fundo:#f3ede2;--destaque:#a77f33;--moldura:#c9a35a}
.bg{position:absolute;inset:0;background:linear-gradient(180deg,#f7f2e9 0%,#efe5d3 100%)}
.folha{position:absolute;width:900px;height:900px;right:-300px;top:-260px;border-radius:50%;background:radial-gradient(circle,rgba(31,59,48,.10),transparent 65%)}
.folha2{position:absolute;width:900px;height:900px;left:-380px;bottom:-200px;border-radius:50%;background:radial-gradient(circle,rgba(201,163,90,.22),transparent 65%)}
.t{color:#0a2e22}
.leve{font-weight:400;color:#4a5a52;line-height:1.3}
.selo-p{left:0;right:0;text-align:center;font-family:'Jost',sans-serif;font-size:26px;font-weight:600;letter-spacing:8px;text-transform:uppercase;color:#a77f33}
.trilho{left:240px;width:600px;height:8px;border-radius:8px;background:rgba(10,46,34,.12)}
.enche{left:0;top:0;width:0;height:8px;border-radius:8px;background:linear-gradient(90deg,#1f5a43,#c9a35a)}
.relogio{font-family:'Jost',sans-serif;font-size:34px;color:#0a2e22;background:#fff;border-radius:60px;padding:18px 36px;box-shadow:0 14px 34px rgba(10,46,34,.15);left:50%;margin-left:-330px;width:660px;text-align:center}
.cel{box-shadow:0 40px 80px rgba(10,46,34,.35),inset 0 0 0 3px #2b322e}
.lista{left:150px;right:150px;font-family:'Jost',sans-serif;font-size:44px;color:#0a2e22}
.lista span{color:#1f8a5b;font-weight:700;margin-right:18px}
.verde{position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 0%,#184a37 0%,#0c3326 45%,#071f17 100%)}
.final .t{color:#f4ecdc}
.card{box-shadow:0 30px 70px rgba(10,46,34,.25),0 0 0 2px var(--moldura)}
`,
  corpo: (h) => `<div class="bg"></div><div class="folha"></div><div class="folha2"></div>
${h.t(.4, 4.3, 'Atendimento holístico', { top: 640, size: 86 })}
${h.t(1.4, 4.3, '<em>dá trabalho?</em>', { top: 760, size: 130, a: 'pop', fi: .5 })}
${h.t(4.6, 9, 'Olha como fica', { top: 600, size: 80 })}
${h.t(5.2, 9, '<em>simples.</em>', { top: 710, size: 150, a: 'desfoque', fi: .9 })}
${h.d(6.4, 9, 'relogio', 'do 1º contato ao Resultado HOLOS', { s: { top: 1000 }, a: 'pop' })}

${passo(h, 1, 'Envie o Mapeamento Holístico', 'Um link no WhatsApp. O paciente responde<br>no celular, sem criar conta.')}
${h.cel(9.5, 15.5, 'ficha', { top: 620, esc: .9, kb: 'auto:.35', sai: 'esq' })}
${h.cel(15.5, 21.3, 'mapeamentoEnvio', { top: 620, esc: .9, kb: 'auto:.5', fundo: '#0c3326', a: 'dir', sai: 'esq' })}
${h.cel(21.3, 27, 'mapeamentoResp', { top: 620, esc: .9, kb: 'auto', fundo: '#0c3326', a: 'dir' })}
${dica(h, 16.5, 21.3, '1 clique para enviar', 1240)}
${dica(h, 22.3, 27, 'Chega antes da consulta', 1300, 'esq')}

${passo(h, 2, 'Aplique o HOLOSCAN', 'Perguntas simples. O sistema calcula<br>e mostra por onde começar.')}
${h.cel(27.5, 35.5, 'questionario', { top: 620, esc: .9, kb: 'auto:.3', sai: 'esq' })}
${h.cel(35.5, 45, 'holoscan', { top: 620, esc: .9, kb: 'auto', fundo: '#0c3326', a: 'dir' })}
${dica(h, 29.5, 35.5, 'Cálculo automático', 1240)}
${dica(h, 37, 45, '5 sistemas + Tríade', 1300, 'esq')}

${passo(h, 3, 'Escolha as ferramentas', '10 ferramentas de Corpo, Mente<br>e Espírito, prontas para aplicar.')}
${h.cel(45.5, 51.5, 'corpo', { top: 620, esc: .9, kb: 'auto:.4', sai: 'esq' })}
${h.cel(51.5, 57.5, 'mente', { top: 620, esc: .9, kb: 'auto:.4', a: 'dir', sai: 'esq' })}
${h.cel(57.5, 63, 'espirito', { top: 620, esc: .9, kb: 'auto:.4', a: 'dir' })}
${dica(h, 46.5, 51.5, 'Corpo', 1240)}
${dica(h, 52.5, 57.5, 'Mente', 1240, 'esq')}
${dica(h, 58.5, 63, 'Espírito', 1240)}

${passo(h, 4, 'Monte o plano com o Playbook', 'Um foco e de 2 a 4 estratégias.<br>Você revisa e ajusta.')}
${h.cel(63.5, 81, 'playbook', { top: 620, esc: .9, kb: 'auto', fundo: '#0c3326' })}
${dica(h, 65.5, 72, 'Sugestões prontas', 1240)}
${dica(h, 72.5, 81, 'A decisão é sua', 1300, 'esq')}

${passo(h, 5, 'Envie o Resultado HOLOS', 'Um documento lindo, com a sua marca,<br>direto no WhatsApp.')}
${h.cel(81.5, 90, 'documento', { top: 620, esc: .9, kb: 'auto:.6', sai: 'esq' })}
${dica(h, 83.5, 90, 'Com a sua marca', 1240)}
${h.zap(90, 99, 'Marina (paciente)', [
    [90.6, 'Oi, Marina! Seu Resultado HOLOS está pronto 🌿', '18:40', true],
    [91.8, '📄 Resultado HOLOS — Marina.pdf', '18:40', true],
    [94, 'Que lindo! Agora entendi por onde começar 🙏', '18:52']], { top: 640, a: 'dir' })}

${h.d(99, 106, 'selo-p', 'E no retorno?', { s: { top: 240 } })}
${h.t(99.3, 106, 'Antes e agora, <em>lado a lado.</em>', { top: 300, size: 80 })}
${h.t(99.9, 106, 'A evolução que o paciente enxerga.', { top: 420, size: 38, cls: 'sans leve', a: 'fade' })}
${h.card(99.6, 106, 'antesAgora', { top: 560, w: 860, h: 980, kb: 'auto', a: 'zoom' })}

${h.t(106.2, 112, 'Recapitulando:', { top: 360, size: 72 })}
${['Mapeamento pelo WhatsApp', 'HOLOSCAN automático', '10 ferramentas prontas', 'Plano com o Playbook', 'Resultado com a sua marca'].map((x, i) =>
    h.d(106.8 + i * .6, 112, 'lista', '<span>✓</span>' + x, { s: { top: 560 + i * 110 }, a: 'esq' })).join('')}

<div class="final">${h.d(112, 121, 'verde', '', { a: 'fade', fi: .4, fo: .01 })}
${assinatura(h, 112.3, 120, { frase: 'Simples para você.<br><em>Transformador para o paciente.</em>' })}</div>
`
};
