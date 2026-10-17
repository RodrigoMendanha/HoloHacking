/* V5 · "A JORNADA DA MARINA" (180 s) — história em 7 capítulos (personagens e dados FICTÍCIOS, telas reais do sistema).
   Trilha: ambiente (pads + tigelas -> cordas e pulso no ápice). Dor -> Mapeamento -> HOLOSCAN -> ferramentas -> Playbook/Resultado
   -> retorno com avanços -> o que mudou (paciente e nutri) -> "pode ser a sua próxima paciente". */
import { assinatura, FUNDO_ESCURO } from './comum.mjs';

const cap = (h, a, b, n, titulo, sub) =>
  h.d(a, b, 'selo', 'Capítulo ' + n, { s: { top: 250 }, a: 'fade', fi: 1 }) +
  h.t(a + .3, b, titulo, { top: 300, size: 100, a: 'desfoque', fi: 1.1 }) +
  (sub ? h.t(a + 1.4, b, sub, { top: 450, size: 40, cls: 'sans sub', a: 'fade' }) : '');
const leg = (h, a, b, txt, top = 1660) => h.t(a, b, txt, { top, size: 40, cls: 'sans sub', a: 'fade', css: 'background:rgba(7,31,23,.78);border-radius:20px;padding:14px 22px;left:110px;right:110px' });

export default {
  id: 'v5-jornada-marina', titulo: 'A jornada da Marina', dur: 180, estilo: 'ambiente',
  energia: [[0, .25], [12, .3], [31, .4], [53, .5], [75, .55], [95, .65], [118, .74], [142, .85], [155, .95], [162, .7], [169, .85], [176, .6], [180, .4]],
  marcas: [12, 31, 53, 75, 95, 118, 142, 169],
  tema: FUNDO_ESCURO + `
.luz{position:absolute;width:1400px;height:1400px;left:-160px;top:300px;border-radius:50%;background:radial-gradient(circle,rgba(227,200,142,.10),transparent 60%)}
.zap{left:120px;width:840px}
.lin{left:120px;right:120px;font-family:'Cormorant Garamond',serif;font-size:58px;color:#f4ecdc;text-align:left}
.lin:before{content:'— ';color:#c9a35a}
`,
  corpo: (h) => `<div class="bg"></div><div class="bg2"></div>${h.d(0, 181, 'luz', '', { a: 'fade', fi: 3, zoom: '0.8,1.3' })}
${h.t(.6, 12, 'Esta é a <em>Marina.</em>', { top: 620, size: 120, a: 'desfoque', fi: 1.5 })}
${h.t(3, 12, '34 anos. Dois filhos.<br>Uma rotina que não para.', { top: 830, size: 46, cls: 'sans sub', a: 'fade', fi: 1 })}
${h.t(6.3, 12, 'Já tentou várias dietas.', { top: 1030, size: 46, cls: 'sans sub', a: 'fade', fi: 1 })}
${h.t(8.3, 12, '<em>Nenhuma durou.</em>', { top: 1120, size: 80, a: 'desfoque', fi: 1.2 })}
${h.d(.6, 12, 'nota', 'Personagens e dados fictícios', { s: { top: 1680 } })}

${cap(h, 12, 31, 1, 'O <em>cansaço</em>')}
${h.zap(14, 25.4, 'Nutri Ana', [
    [14.8, 'Oi, Ana! Queria marcar uma consulta', '19:02'],
    [16.8, 'Chego em casa morta de fome e ataco a geladeira 😩', '19:03'],
    [19.2, 'Eu sei o que devo comer… só não consigo', '19:03'],
    [21.8, 'Oi, Marina! Vamos olhar para você por inteiro, não só para o prato 🌿', '19:10', true]], { top: 560 })}
${h.t(25.8, 31, 'Ela sabia o que comer.', { top: 760, size: 70 })}
${h.t(27, 31, '<em>Não sabia por que não conseguia.</em>', { top: 880, size: 70 })}

${cap(h, 31, 53, 2, 'Antes da <em>consulta</em>')}
${h.card(33, 40, 'mapeamentoEnvio', { top: 560, w: 860, h: 1000, kb: 'auto:.5', css: 'background:#0c3326', sai: 'esq' })}
${leg(h, 33.8, 40, 'Ana envia o Mapeamento Holístico. Um link, pelo WhatsApp.')}
${h.card(40, 46.5, 'mapeamentoResp', { top: 560, w: 860, h: 1000, kb: 'auto', css: 'background:#0c3326', a: 'dir' })}
${leg(h, 40.8, 46.5, 'Marina responde no celular, no sofá, antes da consulta.')}
${h.t(46.8, 53, 'Pela primeira vez, alguém perguntou<br>sobre o <em>sono</em>, a <em>rotina</em><br>e o que dá <em>sentido</em> à vida dela.', { top: 700, size: 58, left: 40, right: 40, a: 'desfoque', fi: 1.2 })}

${cap(h, 53, 75, 3, 'O <em>mapa</em>')}
${h.card(55, 65.5, 'holoscan', { top: 560, w: 860, h: 1000, kb: 'auto', css: 'background:#0c3326', sai: 'esq' })}
${leg(h, 55.8, 65.5, 'O HOLOSCAN mostra os 5 sistemas e por onde começar.')}
${h.card(65.5, 75, 'sistema', { top: 560, w: 860, h: 1000, kb: 'auto:.7', a: 'dir' })}
${leg(h, 66.3, 75, 'Ana não precisou adivinhar. O caminho apareceu.')}

${cap(h, 75, 95, 4, 'Além do <em>prato</em>')}
${h.cel(77, 86, 'corpo', { top: 620, esc: .56, left: 10, kb: 'auto:.4', a: 'sobe' })}
${h.cel(77.6, 86, 'mente', { top: 560, esc: .56, left: 361, kb: 'auto:.4', a: 'sobe' })}
${h.cel(78.2, 86, 'espirito', { top: 620, esc: .56, left: 712, kb: 'auto:.4', a: 'sobe' })}
${leg(h, 78.8, 86, 'Ferramentas de corpo, mente e espírito.')}
${h.card(86, 95, 'cme', { top: 560, w: 860, h: 1000, kb: 'auto', a: 'zoom' })}
${leg(h, 86.8, 95, 'O que ela quer construir: mais disposição à tarde.')}

${cap(h, 95, 118, 5, 'Um caminho <em>possível</em>')}
${h.cel(97, 106.5, 'playbook', { top: 560, esc: .9, kb: 'auto', fundo: '#0c3326', sai: 'esq' })}
${leg(h, 98, 106.5, 'Um foco. Poucas estratégias. Não trinta regras.')}
${h.zap(106.5, 118, 'Marina (paciente)', [
    [107.3, 'Marina, seu Resultado HOLOS 🌿', '18:40', true],
    [108.8, '📄 Resultado HOLOS — Marina.pdf', '18:40', true],
    [111.5, 'Que lindo! Agora entendi por onde começar 🙏', '18:52']], { top: 560, a: 'dir' })}
${leg(h, 112.5, 118, 'Com a marca da Ana, direto no WhatsApp.')}

${cap(h, 118, 142, 6, 'Três semanas <em>depois</em>')}
${h.card(120, 130.5, 'antesAgora', { top: 560, w: 860, h: 1000, kb: 'auto', sai: 'esq' })}
${leg(h, 120.8, 130.5, 'No retorno: antes e agora, lado a lado.')}
${h.card(130.5, 142, 'avancos', { top: 560, w: 860, h: 1000, kb: 'auto', a: 'dir' })}
${leg(h, 131.5, 142, '“Chego em casa com menos fome nos dias em que levo o lanche.”')}

${cap(h, 142, 162, 7, 'O que <em>mudou</em>')}
${h.d(143.5, 162, 'selo', 'Para a Marina', { s: { top: 520 } })}
${h.d(144.3, 162, 'lin', 'Se sentiu vista.', { s: { top: 580 }, a: 'esq' })}
${h.d(145.3, 162, 'lin', 'Entendeu o próprio caminho.', { s: { top: 660 }, a: 'esq' })}
${h.d(146.3, 162, 'lin', 'Voltou, e quer continuar.', { s: { top: 740 }, a: 'esq' })}
${h.d(148.5, 162, 'selo', 'Para a Ana', { s: { top: 900 } })}
${h.d(149.3, 162, 'lin', 'Um atendimento mais profundo.', { s: { top: 960 }, a: 'esq' })}
${h.d(150.3, 162, 'lin', 'Um plano pronto em minutos.', { s: { top: 1040 }, a: 'esq' })}
${h.d(151.3, 162, 'lin', 'Uma paciente fiel.', { s: { top: 1120 }, a: 'esq' })}
${h.t(154.5, 162, 'Mais <em>adesão.</em> Mais <em>fidelização.</em>', { top: 1330, size: 72, a: 'zoom' })}

${h.t(162.5, 169, 'A Marina é fictícia.', { top: 640, size: 86, a: 'desfoque', fi: 1 })}
${h.t(164.6, 169, 'Mas pode ser a sua<br><em>próxima paciente.</em>', { top: 780, size: 96, a: 'desfoque', fi: 1.2 })}
${assinatura(h, 169.4, 180)}
`
};
