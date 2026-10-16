/* V4 · "DOIS LADOS" (120 s) — cada beneficio em par: PARA VOCE, NUTRI (fundo verde) e PARA O SEU PACIENTE (fundo creme).
   Trilha: violao dedilhado + violoncelo. 6 pares de 16 s (8 s cada lado), abertura e fechamento com a tela dividida. */
import { assinatura } from './comum.mjs';

const PARES = [
  { n: ['Chega à consulta<br><em>sabendo o que importa.</em>', 'O Mapeamento Holístico chega respondido antes da consulta.', { card: 'mapeamentoResp' }],
    p: ['Se sente <em>escutado</em><br>desde o primeiro contato.', 'Perguntas sobre rotina, sono e o que dá sentido à vida.', { zap: [
      ['Oi, Marina! Antes da consulta, responda o seu Mapeamento Holístico 🌿', '10:12', true],
      ['Respondi! Nunca tinham me perguntado sobre a minha rotina 😊', '21:30']] }] },
  { n: ['Sabe <em>por onde começar.</em>', 'O HOLOSCAN mostra as áreas que mais pedem atenção.', { card: 'holoscan', fundo: '#0c3326' }],
    p: ['Entende o que está<br><em>pesando agora.</em>', 'Em linguagem simples, sem termos difíceis.', { card: 'previa', fundo: '#0c3326' }] },
  { n: ['Plano pronto<br><em>em minutos.</em>', 'O Playbook sugere o foco e as estratégias. Você ajusta.', { card: 'playbook', fundo: '#0c3326' }],
    p: ['Poucos passos,<br><em>possíveis de cumprir.</em>', 'Nada de trinta regras de uma vez.', { card: 'estrategias' }] },
  { n: ['Um documento<br><em>com a sua marca.</em>', 'Profissional, bonito e pronto para enviar.', { card: 'documento' }],
    p: ['Leva o caminho<br><em>no celular.</em>', 'O Resultado HOLOS chega direto no WhatsApp.', { zap: [
      ['Seu Resultado HOLOS está pronto 🌿', '18:40', true], ['📄 Resultado HOLOS — Marina.pdf', '18:40', true], ['Que lindo! Agora entendi por onde começar 🙏', '18:52']] }] },
  { n: ['Acompanha a evolução<br><em>em cada retorno.</em>', 'Antes e agora, lado a lado.', { card: 'antesAgora' }],
    p: ['Vê os<br><em>próprios avanços.</em>', 'E ganha motivação para continuar.', { card: 'avancos' }] },
  { n: ['Pacientes que<br><em>voltam.</em>', 'Mais adesão e mais fidelização para o seu consultório.', { pills: ['Adesão', 'Retorno', 'Fidelização'] }],
    p: ['Cuidado como<br><em>ser humano inteiro.</em>', 'Corpo, mente e espírito no mesmo caminho.', { card: 'cme' }] }
];

function lado(h, t0, quem, [titulo, sub, vis], i) {
  const b = t0 + 8, nutri = quem === 'n';
  let v = '';
  if (vis.card) v = h.card(t0 + .5, b, vis.card, { top: 700, w: 860, h: 900, kb: 'auto', a: 'sobe', css: vis.fundo ? 'background:' + vis.fundo : '' });
  if (vis.zap) v = h.zap(t0 + .5, b, nutri ? 'Marina (paciente)' : 'Nutri Ana', vis.zap.map(([txt, hora, eu], k) => [t0 + 1.2 + k * 1.4, txt, hora, eu]), { top: 700 });
  if (vis.pills) v = vis.pills.map((x, k) => h.d(t0 + 1 + k * .6, b, 'pill grande-pill', x, { s: { top: 820 + k * 190, left: 240, width: 600 }, a: 'pop' })).join('');
  return h.d(t0, b, nutri ? 'fundo-n' : 'fundo-p', '', { a: 'fade', fi: .5, fo: .5 }) +
    h.d(t0 + .2, b, 'rotulo ' + (nutri ? 'rot-n' : 'rot-p'), (nutri ? 'Para você, nutri' : 'Para o seu paciente') + ' · ' + (i + 1) + '/6', { s: { top: 250 } }) +
    h.t(t0 + .4, b, titulo, { top: 320, size: 80, cls: 'serif ' + (nutri ? 'claro' : 'escuro') }) +
    h.t(t0 + 1, b, sub, { top: 540, size: 38, cls: 'sans ' + (nutri ? 'sub-n' : 'sub-p'), a: 'fade' }) + v;
}

export default {
  id: 'v4-dois-lados', titulo: 'Dois lados — benefícios nutri e paciente', dur: 120, estilo: 'violao',
  energia: [[0, .3], [8, .45], [40, .6], [72, .7], [96, .85], [104, .8], [112, .65], [120, .4]],
  marcas: [8, 104],
  tema: `
:root{--fundo:#f4ecdc;--destaque:#b08a3e;--moldura:#c9a35a}
.base{position:absolute;inset:0;background:#f4ecdc}
.fundo-n{inset:0;background:radial-gradient(120% 70% at 50% 0%,#184a37 0%,#0c3326 45%,#071f17 100%)}
.fundo-p{inset:0;background:linear-gradient(180deg,#f8f3ea 0%,#efe5d3 100%)}
.claro{color:#f4ecdc}.claro em{color:#e3c88e}
.escuro{color:#0a2e22}.escuro em{color:#a77f33}
.sub-n{color:#d9d1bc;font-weight:300;line-height:1.3}.sub-p{color:#4a5a52;line-height:1.3}
.rotulo{left:50%;transform-origin:center;font-family:'Jost',sans-serif;font-size:26px;font-weight:600;letter-spacing:6px;text-transform:uppercase;padding:12px 30px;border-radius:40px;white-space:nowrap}
.rot-n{color:#0a2e22;background:#c9a35a;margin-left:-260px;width:520px;text-align:center}
.rot-p{color:#f4ecdc;background:#0a2e22;margin-left:-300px;width:600px;text-align:center}
.grande-pill{font-size:44px;padding:30px 0;background:rgba(201,163,90,.08)}
.meia{top:620px;bottom:0;width:540px}
.meia-n{left:0;background:radial-gradient(120% 70% at 50% 0%,#184a37 0%,#0c3326 60%,#071f17 100%)}
.meia-p{left:540px;background:#efe5d3}
.lado{font-family:'Jost',sans-serif;font-size:40px;font-weight:600;letter-spacing:8px;text-transform:uppercase;width:540px;text-align:center}
.faixa{left:60px;right:60px;text-align:center;font-family:'Cormorant Garamond',serif;font-weight:500;font-size:58px;line-height:1.2;color:#f4ecdc;background:#0a2e22;border:2px solid #c9a35a;border-radius:30px;padding:36px 30px;box-shadow:0 30px 70px rgba(0,0,0,.35)}
.faixa span{font-size:84px}
.verde{position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 0%,#184a37 0%,#0c3326 45%,#071f17 100%)}
.final .t{color:#f4ecdc}
`,
  corpo: (h) => `<div class="base"></div>
${h.t(.4, 8, 'Todo atendimento tem', { top: 300, size: 76, cls: 'serif escuro' })}
${h.t(1.2, 8, '<em>dois lados.</em>', { top: 400, size: 130, cls: 'serif escuro', a: 'desfoque', fi: 1 })}
${h.d(3.2, 8, 'meia meia-n', '', { a: 'esq', fi: .9 })}
${h.d(3.2, 8, 'meia meia-p', '', { a: 'dir', fi: .9 })}
${h.d(4, 8, 'lado', 'O seu', { s: { top: 900, left: 0, color: '#e3c88e' }, a: 'sobe' })}
${h.d(4.6, 8, 'lado', 'O do paciente', { s: { top: 880, left: 540, color: '#0a2e22' }, a: 'sobe' })}
${h.d(5.6, 8, 'faixa', 'O HoloHacking cuida <em>dos dois.</em>', { s: { top: 1100 }, a: 'pop' })}

${PARES.map((par, i) => lado(h, 8 + i * 16, 'n', par.n, i) + lado(h, 16 + i * 16, 'p', par.p, i)).join('\n')}

${h.d(104, 112, 'meia meia-n', '', { a: 'esq', fi: .9 })}
${h.d(104, 112, 'meia meia-p', '', { a: 'dir', fi: .9 })}
${h.d(104.8, 112, 'faixa', 'Quando os dois lados ganham,<br><span>o tratamento <em>acontece.</em></span>', { s: { top: 760 }, a: 'pop' })}
<div class="final">${h.d(111.6, 121, 'verde', '', { a: 'fade', fi: .5, fo: .01 })}${assinatura(h, 112.2, 120)}</div>
`
};
