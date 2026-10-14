/**
 * CONTRATO DO JSON HOLOS_AI_RESULT schema_version 1 (holos-ai-contrato.js) — sem navegador.
 * O mesmo conjunto de regras roda no servidor (holos_ai_problemas, migration 20261023100000; provado no harness SQL HA01-HA03).
 *   C01 exemplo canonico (docs/v1/holos-ai-gpt/exemplo-resultado.json) valido; extraido da resposta inteira do GPT
 *   C02 JSON invalido / nao objeto / vazio        C03 schema_version incompativel
 *   C04 regras: chaves, tipo, ferramentas (ate 3, ID PP-V1, sem duplicata, 1 principal, nao concluida), estrategias
 *       (classificacao, territorio, origem, decisao na 1a consulta e no retorno), territorios ("Ainda nao aprofundado"), hipotese
 *   C05 explodir: um item por elemento; secoes so profissionais marcadas
 *   C06 paraDirecao: so ACEITOS; descartado e sugerido fora; so profissional nunca para a paciente; texto editado vale;
 *       foco so como sugestao; nada sem importacao confirmada
 *   C07 fechamento 14/10/2026 (mesmo schema_version 1): meta/entrada/ferramentas_ja_aplicadas/plano_acompanhamento obrigatorios;
 *       territorio "nao_aprofundado" sem estrategia; estrategia nunca baseada em hipotese (ERROS). Linguagem da nota, "concentrou mais
 *       marcadores" fora da 1a area, tarefa da Conduta como estrategia, corte inventado, hipotese virando estrategia e sugestao nova
 *       como combinada no rascunho (AVISOS: nao bloqueiam estilo). O validador do GPT (holos_ai_pdf.py) aponta os mesmos casos.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
await import('../holos-ai-contrato.js');
const C = globalThis.HolosAIContrato;
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const EX = readFileSync(new URL('../docs/v1/holos-ai-gpt/exemplo-resultado.json', import.meta.url), 'utf8');
const base = () => JSON.parse(EX);

const x = C.extrairJson('Texto antes\n```json\n' + EX + '\n```\nTexto depois ```json {"x":1}```');
ok(!!x.json && C.validar(x.json).erros.length === 0 && C.validar(base()).erros.length === 0, 'C01 exemplo canônico válido; extraído do primeiro bloco ```json``` da resposta inteira');
ok(!!C.extrairJson(EX).json && !!C.extrairJson('```\n' + EX + '\n```').json, 'C01 aceita JSON puro e bloco ``` sem rótulo');
ok(/JSON inválido/.test(C.extrairJson('{"a":').erro) && /não é um objeto/.test(C.extrairJson('[1,2]').erro) && /Cole o JSON/.test(C.extrairJson('  ').erro)
  && /grande demais/.test(C.extrairJson('{' + ' '.repeat(C.TEXTO_MAX) + '}').erro), 'C02 JSON inválido, não objeto, vazio e grande demais: erro claro');
const v2 = C.validar(Object.assign(base(), { schema_version: 2 }));
ok(v2.incompativel && v2.erros.length === 1 && /schema_version 2/.test(v2.erros[0]), 'C03 schema_version 2: incompatível (mensagem única)');

const erros = (mut) => { const r = base(); mut(r); return C.validar(r).erros.join(' | '); };
ok(/falta a chave "espirito"/.test(erros(r => { delete r.espirito; })) && /tipo deve ser/.test(erros(r => { r.tipo = 'consulta'; })), 'C04 chave obrigatória e tipo');
ok(/no máximo 3/.test(erros(r => { r.ferramentas_recomendadas.push(Object.assign({}, r.ferramentas_recomendadas[2], { regra_id: 'REC-MET-05', ferramenta: 'OQ³', ordem: 3 })); }))
  && /fora do catálogo/.test(erros(r => { r.ferramentas_recomendadas[1].regra_id = 'REC-XYZ-09'; }))
  && /duplicada/.test(erros(r => { r.ferramentas_recomendadas[2] = Object.assign({}, r.ferramentas_recomendadas[0], { papel: 'complementar' }); }))
  && /exatamente 1 principal/.test(erros(r => { r.ferramentas_recomendadas[1].papel = 'principal'; }))
  && /já foi concluída/.test(erros(r => { r.ferramentas_recomendadas[2].ferramenta = 'Mapa da Rotina'; })), 'C04 ferramentas: até 3, ID PP-V1, sem duplicata, 1 principal, nunca a concluída no encontro');
ok(C.validar(Object.assign(base(), { ferramentas_recomendadas: [] })).erros.length === 0, 'C04 menos de 3 ferramentas (inclusive nenhuma) é válido');
ok(/classificacao inválida/.test(erros(r => { r.estrategias[0].classificacao = 'clinico'; }))
  && /na primeira consulta a decisão/.test(erros(r => { r.estrategias[0].decisao_sugerida = 'MANTER'; }))
  && /é nova: decisao_sugerida deve ser null/.test(erros(r => { r.estrategias[1].decisao_sugerida = 'MANTER'; }))
  && /decisão de retorno inválida/.test(erros(r => { r.tipo = 'retorno'; r.estrategias[0].decisao_sugerida = 'MELHORAR'; }))
  && !erros(r => { r.tipo = 'retorno'; r.estrategias[0].decisao_sugerida = 'AJUSTAR'; })
  && /direcionamento inexistente/.test(erros(r => { r.estrategias[0].direcionamento_id = 'D9'; }))
  && /sem "baseado_em"/.test(erros(r => { r.estrategias[0].baseado_em = []; })), 'C04 estratégias: classificação, decisão (1ª consulta = MANTER EM OBSERVAÇÃO; retorno = MANTER/AJUSTAR/...), nova = null, direcionamento e "baseado_em"');
ok(/começa com "Ainda não aprofundado/.test(erros(r => { r.espirito.resumo = 'Nada'; }))
  && /que é do território Corpo/.test(erros(r => { r.mente = { situacao: 'com_material', resumo: 'Algo observado', estrategias: ['E1'] }; }))
  && /hipótese deve ter so_profissional/.test(erros(r => { r.pontos_para_aprofundar[3].so_profissional = false; })), 'C04 territórios sem material e hipótese só profissional');
ok(C.validar(Object.assign(base(), { rascunho_paciente: 'Seu Sistema Metabólico ficou 2,4.' })).erros.length === 0
  && C.validar(Object.assign(base(), { rascunho_paciente: 'Seu Sistema Metabólico ficou 2,4.' })).avisos.length === 2, 'C04 termos/números no rascunho da paciente: só aviso (nunca enviado sozinho)');

const its = C.explodir(base());
ok(its.length === 62 && new Set(its.map(i => i.secao)).size === 20 && its.filter(i => i.so_profissional).length === 43
  && its.find(i => i.secao === 'estrategias' && i.chave === 'E1') && its.filter(i => i.secao === 'pontos_para_aprofundar').every(i => i.so_profissional)
  && !its.find(i => i.secao === 'direcionamentos').so_profissional, 'C05 62 itens em 20 seções; 43 só profissionais (hipóteses, alertas, fontes, raciocínio...)');

let n = 0;
const itens = its.map(i => ({ id: '00000000-0000-4000-8000-' + String(++n).padStart(12, '0'), secao: i.secao, ordem: i.ordem, chave: i.chave, valor_ia: i.valor, so_profissional: i.so_profissional,
  estado: 'confirmado', valor_profissional: null, compartilhar: !i.so_profissional }));
const achar = (sec, ch) => itens.find(i => i.secao === sec && (ch === undefined || i.chave === ch));
const e1 = achar('estrategias', 'E1'); e1.estado = 'editado'; e1.valor_profissional = Object.assign({}, e1.valor_ia, { o_que_fazer: 'TEXTO EDITADO' });
achar('estrategias', 'E2').estado = 'descartado'; achar('estrategias', 'E2').compartilhar = false;
achar('direcionamentos', 'D2').estado = 'sugerido'; achar('direcionamentos', 'D2').compartilhar = false;
const imp = { id: 'aaaaaaaa-0000-4000-8000-000000000001', status: 'confirmado', versao: 1 };
const m = C.paraDirecao(imp, itens);
const est = m.S.estrategias;
ok(est.length === 1 && est.some(x => x.acao === 'TEXTO EDITADO' && x.texto_sugerido === 'Lanche planejado antes da fome forte') && !est.some(x => /Registro rápido/.test(x.texto))
  && m.S.direcionamentos.length === 1 && !JSON.stringify(m.S).includes('Compreender os momentos'),
  'C06 estratégias: editada com o texto da nutricionista (original guardado em texto_sugerido); descartada e não revisada (D2) fora');
const todos = [].concat(m.S.padroes, m.S.direcionamentos, m.S.estrategias, m.S.observar, m.S.corpo, m.S.mente, m.S.espirito, [m.proxima_etapa]);
ok(todos.every(x => x.origem === 'holos_ai' && x.ref.tipo === 'holos_ai' && x.ref.id === imp.id && x.confirmado === true && x.sugestao === true),
  'C06 todo item: origem holos_ai, ref à importação e ao item, confirmado (a revisão é a confirmação)');
ok(m.S.mente.length === 0 && m.S.espirito.length === 0 && m.S.corpo.length === 1 && !JSON.stringify(m).includes('reuniões da tarde podem dificultar') && !JSON.stringify(m.S).includes('REC-MET')
  && m.leitura && /Primeira consulta/.test(m.leitura), 'C06 território "nao_aprofundado" não vira item; hipóteses, alertas e ferramentas fora; síntese só para a leitura profissional');
ok(m.foco && m.foco.confirmado === false && m.foco.texto === 'Organizar o fim da tarde' && m.foco.origem === 'holos_ai', 'C06 foco atual só como SUGESTÃO (quem confirma é a nutricionista)');
const d = m.S.direcionamentos[0];
ok(d.territorio === 'corpo' && d.sistemas[0] === 'metabolico' && d.status === 'proposto' && est.find(x => x.acao === 'TEXTO EDITADO').direcionamento_id === d.id, 'C06 direcionamento: território, sistema e ligação com a estratégia');
const novaOk = itens.map(i => Object.assign({}, i, i.secao === 'estrategias' && i.chave === 'E2' ? { estado: 'confirmado', compartilhar: true } : {}));
const stE = C.paraDirecao(imp, novaOk).S.estrategias;
ok(stE.find(x => /^Registro rápido/.test(x.texto)).status === 'proposta' && stE.find(x => x.texto_sugerido === 'Lanche planejado antes da fome forte').status === 'acordada'
  && !JSON.stringify(C.paraDirecao(imp, novaOk)).includes('Nesta fase, nosso foco'),
  'C06 sugestão nova confirmada entra como "proposta" (nunca "acordada"); só a acordada no documento é "acordada"; o rascunho de mensagem da IA não entra');
achar('padroes_observados').compartilhar = false;
ok(C.paraDirecao(imp, itens).S.padroes.some(x => x.mostrar_paciente === false), 'C06 confirmado sem compartilhar fica só profissional (mostrar_paciente false)');
const soProf = itens.map(i => Object.assign({}, i, { compartilhar: true }));
ok(!JSON.stringify(C.paraDirecao(imp, soProf).S).includes('"mostrar_paciente":true,"descartado":false,"tipo":"hipotese"') && C.paraDirecao(imp, soProf).S.padroes.every(x => x.tipo === 'padrao_observado'),
  'C06 nada só profissional vira item compartilhável, mesmo marcado');
ok(C.paraDirecao(Object.assign({}, imp, { status: 'em_revisao' }), itens).S.estrategias.length === 0 && C.paraDirecao(Object.assign({}, imp, { status: 'descartado' }), itens).foco === null,
  'C06 importação não concluída ou descartada: nada entra');

/* C07 fechamento 14/10/2026 */
ok(['meta', 'entrada', 'ferramentas_ja_aplicadas', 'plano_acompanhamento'].every(k => new RegExp('falta a chave "' + k + '"').test(erros(r => { delete r[k]; })))
  && /"meta" deve ser objeto/.test(erros(r => { r.meta = 'x'; }))
  && C.validar(Object.assign(base(), { meta: {}, entrada: {}, ferramentas_ja_aplicadas: [], plano_acompanhamento: [] })).erros.length === 0
  && C.OPCIONAIS.length === 0 && C.OBRIGATORIAS.length === 24 && C.SCHEMA_VERSION === 1,
  'C07 meta, entrada, ferramentas_ja_aplicadas e plano_acompanhamento obrigatórios (vazios aceitos); continua schema_version 1');
ok(/mente está "nao_aprofundado": não pode ter estratégia/.test(erros(r => { r.mente.estrategias = ['E2']; }))
  && /no território Mente, que está "nao_aprofundado"/.test(erros(r => { r.estrategias[1].territorio = 'Mente'; r.corpo.estrategias = ['E1']; }))
  && /se baseia numa hipótese/.test(erros(r => { r.estrategias[1].baseado_em = ['Pontos para aprofundar: hipótese das reuniões'] })),
  'C07 território "nao_aprofundado" com estratégia e estratégia baseada em hipótese: ERRO (não importa)');
const t5 = C.validar(base());
ok(t5.erros.length === 0 && t5.avisos.length === 0, 'C07 T5 do fechamento: 0 erros e 0 avisos');
const PLANO_B = { id: 'E3', origem: 'nova', titulo: 'Plano B para dias de reunião às 16h', territorio: 'Corpo', direcionamento_id: 'D1', classificacao: 'comportamental_metodologica',
  decisao_sugerida: null, motivo_decisao: null, o_que_fazer: 'Combinar um horário alternativo para os dias de reunião.', o_que_observar: 'Se a reunião impediu o lanche.',
  prazo: 'Até o retorno', criterio_sucesso: 'A reunião deixar de ser o motivo de pular o lanche.', baseado_em: ['Mapa da Rotina: reuniões à tarde'], catalogo: 'not_catalogued', status: 'SUGERIDO' };
const COMPOSICAO = Object.assign({}, PLANO_B, { id: 'E4', titulo: 'Composição do lanche da tarde', classificacao: 'requer_decisao_profissional_na_conduta',
  o_que_fazer: 'Definir na Conduta o que compõe o lanche.', o_que_observar: 'Sem dado.', criterio_sucesso: 'Composição registrada na Conduta.', baseado_em: ['Resultado HOLOS'] });
const ruim = base();
ruim.alertas_profissionais.push({ tipo: 'metodologico', texto: 'Nota maior = mais equilíbrio.' });
ruim.sistemas_prioritarios[1].como_cuidar = 'Este eixo concentrou mais marcadores nesta aplicação.';
ruim.estrategias[0].criterio_sucesso = 'Conseguir aplicar na maior parte dos dias de trabalho.';
ruim.estrategias.push(PLANO_B, COMPOSICAO); ruim.corpo.estrategias.push('E3', 'E4');
ruim.rascunho_paciente += ' Nos dias de reunião, use o horário alternativo que combinamos.';
const vr = C.validar(ruim), av = vr.avisos.join(' | ');
ok(vr.erros.length === 0 && /linguagem da nota do HOLOSCAN/.test(av) && /"concentrou mais marcadores" não se aplica/.test(av) && /E4 parece tarefa da Conduta/.test(av)
  && /E1: corte não definido pela Conduta \("maior parte dos dias"\)/.test(av) && /E3 repete uma hipótese/.test(av) && /sugestão nova E3 como combinada/.test(av)
  && !/E1 repete|E2 repete|sugestão nova E2/.test(av),
  'C07 nota "mais equilíbrio", "concentrou mais marcadores" na 2ª área, Composição como estratégia, "maior parte dos dias", Plano B a partir de hipótese e rascunho "que combinamos": AVISO (não bloqueia)');
const py = spawnSync('python3', ['--version']);
if (py.status === 0) {
  const dir = mkdtempSync(join(tmpdir(), 'hai-'));
  writeFileSync(join(dir, 'bom.json'), JSON.stringify(base())); writeFileSync(join(dir, 'ruim.json'), JSON.stringify(ruim));
  const script = new URL('../docs/v1/holos-ai-gpt/holos_ai_pdf.py', import.meta.url).pathname;
  const run = (f) => JSON.parse(spawnSync('python3', ['-c', 'import json,sys\nexec(open(sys.argv[1],encoding="utf-8").read())\nprint(json.dumps(validar_resultado(json.load(open(sys.argv[2],encoding="utf-8")))))', script, join(dir, f)], { encoding: 'utf8' }).stdout);
  const pb = run('bom.json'), pr = run('ruim.json').join(' | ');
  ok(pb.length === 0 && /linguagem da nota/.test(pr) && /concentrou mais marcadores/.test(pr) && /E4 parece tarefa da Conduta/.test(pr) && /maior parte dos dias/.test(pr)
    && /E3 repete uma hipótese/.test(pr) && /sugestão nova E3 como combinada/.test(pr),
    'C07 validador do GPT (holos_ai_pdf.py): T5 = [] e os mesmos seis casos apontados');
  const sem = base(); delete sem.plano_acompanhamento; sem.mente.estrategias = ['E2'];
  writeFileSync(join(dir, 'sem.json'), JSON.stringify(sem));
  const ps = run('sem.json').join(' | ');
  ok(/falta a chave "plano_acompanhamento"/.test(ps) && /mente está "nao_aprofundado"/.test(ps), 'C07 validador do GPT: chave obrigatória e território não aprofundado com estratégia');
} else console.log('  (python3 ausente: conferência do validador do GPT pulada)');

console.log(falhou ? '\nFALHOU' : '\nOK: contrato HOLOS_AI_RESULT v1');
process.exit(falhou ? 1 : 0);
