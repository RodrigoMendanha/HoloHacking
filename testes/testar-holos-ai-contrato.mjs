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
 */
import { readFileSync } from 'node:fs';
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
ok(/começa com "Ainda não aprofundado/.test(erros(r => { r.espirito.resumo = 'Nada'; })) && /que é do território Corpo/.test(erros(r => { r.mente.estrategias = ['E1']; }))
  && /hipótese deve ter so_profissional/.test(erros(r => { r.pontos_para_aprofundar[3].so_profissional = false; })), 'C04 territórios sem material e hipótese só profissional');
ok(C.validar(Object.assign(base(), { rascunho_paciente: 'Seu Sistema Metabólico ficou 2,4.' })).erros.length === 0
  && C.validar(Object.assign(base(), { rascunho_paciente: 'Seu Sistema Metabólico ficou 2,4.' })).avisos.length === 2, 'C04 termos/números no rascunho da paciente: só aviso (nunca enviado sozinho)');

const its = C.explodir(base());
ok(its.length === 62 && new Set(its.map(i => i.secao)).size === 20 && its.filter(i => i.so_profissional).length === 41
  && its.find(i => i.secao === 'estrategias' && i.chave === 'E1') && its.filter(i => i.secao === 'pontos_para_aprofundar').every(i => i.so_profissional)
  && !its.find(i => i.secao === 'direcionamentos').so_profissional, 'C05 62 itens em 20 seções; 41 só profissionais (hipóteses, alertas, fontes, raciocínio...)');

let n = 0;
const itens = its.map(i => ({ id: '00000000-0000-4000-8000-' + String(++n).padStart(12, '0'), secao: i.secao, ordem: i.ordem, chave: i.chave, valor_ia: i.valor, so_profissional: i.so_profissional,
  estado: 'confirmado', valor_profissional: null, compartilhar: !i.so_profissional }));
const achar = (sec, ch) => itens.find(i => i.secao === sec && (ch === undefined || i.chave === ch));
const e1 = achar('estrategias', 'E1'); e1.estado = 'editado'; e1.valor_profissional = Object.assign({}, e1.valor_ia, { o_que_fazer: 'TEXTO EDITADO' });
achar('estrategias', 'E2').estado = 'descartado'; achar('estrategias', 'E2').compartilhar = false;
achar('estrategias', 'E3').estado = 'sugerido'; achar('estrategias', 'E3').compartilhar = false;
const imp = { id: 'aaaaaaaa-0000-4000-8000-000000000001', status: 'confirmado', versao: 1 };
const m = C.paraDirecao(imp, itens);
const est = m.S.estrategias;
ok(est.length === 3 && est.some(x => x.acao === 'TEXTO EDITADO' && x.texto_sugerido === 'Lanche planejado antes da fome forte') && !est.some(x => /Plano B|Registro rápido/.test(x.texto)),
  'C06 estratégias: editada com o texto da nutricionista (original guardado em texto_sugerido); descartada e não revisada fora');
const todos = [].concat(m.S.padroes, m.S.direcionamentos, m.S.estrategias, m.S.observar, m.S.corpo, m.S.mente, m.S.espirito, [m.proxima_etapa]);
ok(todos.every(x => x.origem === 'holos_ai' && x.ref.tipo === 'holos_ai' && x.ref.id === imp.id && x.confirmado === true && x.sugestao === true),
  'C06 todo item: origem holos_ai, ref à importação e ao item, confirmado (a revisão é a confirmação)');
ok(m.S.mente.length === 0 && m.S.espirito.length === 0 && m.S.corpo.length === 1 && !JSON.stringify(m).includes('reuniões da tarde podem dificultar') && !JSON.stringify(m.S).includes('REC-MET')
  && m.leitura && /Primeira consulta/.test(m.leitura), 'C06 território "nao_aprofundado" não vira item; hipóteses, alertas e ferramentas fora; síntese só para a leitura profissional');
ok(m.foco && m.foco.confirmado === false && m.foco.texto === 'Organizar o fim da tarde' && m.foco.origem === 'holos_ai', 'C06 foco atual só como SUGESTÃO (quem confirma é a nutricionista)');
const d = m.S.direcionamentos[0];
ok(d.territorio === 'corpo' && d.sistemas[0] === 'metabolico' && d.status === 'proposto' && est.find(x => x.acao === 'TEXTO EDITADO').direcionamento_id === d.id, 'C06 direcionamento: território, sistema e ligação com a estratégia');
achar('padroes_observados').compartilhar = false;
ok(C.paraDirecao(imp, itens).S.padroes.some(x => x.mostrar_paciente === false), 'C06 confirmado sem compartilhar fica só profissional (mostrar_paciente false)');
const soProf = itens.map(i => Object.assign({}, i, { compartilhar: true }));
ok(!JSON.stringify(C.paraDirecao(imp, soProf).S).includes('"mostrar_paciente":true,"descartado":false,"tipo":"hipotese"') && C.paraDirecao(imp, soProf).S.padroes.every(x => x.tipo === 'padrao_observado'),
  'C06 nada só profissional vira item compartilhável, mesmo marcado');
ok(C.paraDirecao(Object.assign({}, imp, { status: 'em_revisao' }), itens).S.estrategias.length === 0 && C.paraDirecao(Object.assign({}, imp, { status: 'descartado' }), itens).foco === null,
  'C06 importação não concluída ou descartada: nada entra');
console.log(falhou ? '\nFALHOU' : '\nOK: contrato HOLOS_AI_RESULT v1');
process.exit(falhou ? 1 : 0);
