/**
 * VIDEO COMERCIAL HOLOHACKING — roteiro (timeline). Sem narracao, sem pessoas, so telas REAIS do sistema atual
 * (capturar.mjs, paciente e nutricionista INVENTADAS).
 *
 * Camera em medidas RELATIVAS (servem para as telas de celular e de computador):
 *   { t: 0..1 da cena, z: zoom (1 = largura inteira da imagem), a: ancora (titulo da tela, em telas.json) + f: onde a
 *     ancora fica na janela (0 = topo), ou y: fracao da altura da imagem (centro da janela), x: deslocamento horizontal
 *     (fracao da largura, so no computador: xd) }
 * "titulo" e "rotulo" sao os textos na tela. Cenas "abertura" / "mensagem" / "final" nao tem tela.
 */
export const DURACAO = 57;
export const FPS = 30;
export const PASSOS = ['Mapear', 'Compreender', 'Aprofundar', 'Direcionar', 'Estratégias', 'Evolução'];

const MAP = 'a03b-mapeamento-conteudo', HOLO = 'a05-holoscan-pagina';
const ferr = (img, rotulo, ini, corte) => ({ ini, fim: ini + 2, img, rotulo, corte, titulo: 'Aprofunde <em>Corpo, Mente e Espírito.</em>',
  cam: [{ t: 0, y: 0.62, z: 1, xd: 0.09, zd: 1.25 }, { t: 1, y: 0.6, z: 1.03, xd: 0.09, zd: 1.32 }] });

export const CENAS = [
  { ini: 0, fim: 4.2, tipo: 'abertura', frase: 'Seu atendimento pode ir muito além de <em>coletar informações.</em>' },

  { ini: 4.2, fim: 10.2, img: MAP, rotulo: 'Mapeamento Holístico', titulo: 'Mapeie o que <em>realmente importa.</em>',
    cam: [{ t: 0, a: 'Motivo e objetivo', f: 0.06, z: 1 }, { t: 0.4, a: 'Motivo e objetivo', f: 0.08, z: 1.02 },
      { t: 1, a: 'História e rotina alimentar', f: 0.05, z: 1 }] },

  { ini: 10.2, fim: 17, img: HOLO, rotulo: 'HOLOSCAN · cinco sistemas', titulo: 'Identifique <em>onde aprofundar.</em>',
    cam: [{ t: 0, a: 'Onde olhar primeiro', f: 0.04, z: 1 }, { t: 0.45, a: 'Onde olhar primeiro', f: 0.02, z: 1.03 },
      { t: 0.62, a: 'Avaliação Integral do Terreno', f: -0.32, z: 1 }, { t: 1, a: 'Avaliação Integral do Terreno', f: -0.42, z: 1.02 }] },

  ferr('a04-secao-corpo', 'Corpo', 17, false), ferr('a04-secao-mente', 'Mente', 19, true), ferr('a04-secao-espirito', 'Espírito', 21, true),

  { ini: 23, fim: 27.2, tipo: 'mensagem', linhas: ['Não basta descobrir.', '<em>É preciso saber o que fazer<br>com o que você descobriu.</em>'] },

  { ini: 27.2, fim: 29.6, img: 'p1-sec-foco', rotulo: 'Resultado HOLOS · foco atual', titulo: 'Transforme informação <em>em direção.</em>',
    cam: [{ t: 0, y: 0.5, z: 1 }, { t: 1, y: 0.5, z: 1.03 }] },
  { ini: 29.6, fim: 32.2, img: 'p1-sec-direcionamentos', rotulo: 'Direcionamentos', titulo: 'Direcionamentos.', corte: true,
    cam: [{ t: 0, y: 0.5, z: 1 }, { t: 1, y: 0.5, z: 1.03 }] },
  { ini: 32.2, fim: 35.4, img: 'p1-pilar-estrategias', rotulo: 'Estratégias · Corpo · Mente · Espírito', titulo: 'Direcionamentos.<br>Estratégias.<br><em>Próximos passos.</em>', corte: true,
    cam: [{ t: 0, y: 0.12, z: 1 }, { t: 0.35, y: 0.16, z: 1 }, { t: 1, y: 0.58, z: 1 }] },

  { ini: 35.4, fim: 38, img: 'r1-sec-antes-agora', rotulo: 'Retorno · antes e agora', titulo: 'Acompanhe <em>o que funcionou.</em>',
    cam: [{ t: 0, y: 0.2, z: 1 }, { t: 1, y: 0.8, z: 1 }] },
  { ini: 38, fim: 40.6, img: 'r1-sec-testadas', rotulo: 'Estratégias testadas · decisão', titulo: 'Acompanhe <em>o que funcionou.</em>', corte: true,
    cam: [{ t: 0, y: 0.25, z: 1 }, { t: 1, y: 0.75, z: 1 }] },
  { ini: 40.6, fim: 43.4, img: 'r1-pilar-direcionamento', rotulo: 'Novo foco · novo direcionamento', titulo: 'Ajuste <em>o que precisa mudar.</em>', corte: true,
    cam: [{ t: 0, y: 0.5, z: 1 }, { t: 1, y: 0.5, z: 1.03 }] },

  ...[['Mapear', MAP, { a: 'Motivo e objetivo', f: 0.08 }], ['Compreender', HOLO, { a: 'Onde olhar primeiro', f: 0.04 }],
    ['Aprofundar', 'a04-secao-mente', { y: 0.6, xd: 0.09, zd: 1.3 }], ['Direcionar', 'p1-sec-direcionamentos', { y: 0.5 }],
    ['Criar estratégias', 'p1-sec-estrategias', { y: 0.5 }], ['Acompanhar a evolução', 'r1-sec-testadas', { y: 0.5 }]]
    .map(([rotulo, img, k], i) => ({ ini: 43.4 + i * 1.2, fim: 43.4 + (i + 1) * 1.2, img, rotulo, passo: i, corte: i > 0,
      titulo: 'Uma jornada organizada<br><em>do primeiro atendimento à evolução da paciente.</em>',
      cam: [Object.assign({ t: 0, z: 1 }, k), Object.assign({ t: 1, z: 1.03 }, k, { zd: k.zd ? k.zd * 1.03 : undefined })] })),

  { ini: 50.6, fim: 57, tipo: 'final', assinatura: 'Nutrição Holística com método, estrutura e direção.',
    fecho: 'Mais clareza para a nutricionista.<br><em>Mais direção para a paciente.</em>' }
];
