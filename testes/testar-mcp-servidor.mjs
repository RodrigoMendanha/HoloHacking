/**
 * MCP DO HOLOHACKING — servidor de ponta a ponta (supabase/functions/holohacking-mcp/nucleo.js) no PostgreSQL LOCAL com
 * TODAS as migrations: o pedido HTTP do assistente -> protocolo MCP -> ferramentas -> RPCs reais, COMO a nutricionista.
 * Dados ficticios. O mesmo nucleo roda na Edge Function (index.ts).
 *   S1  HTTP: sem chave / chave errada -> 401; GET 405; OPTIONS 204; JSON quebrado 400; lote
 *   S2  protocolo: initialize (versao, instrucoes), notificacao 202, tools/list (8), prompts, metodo desconhecido
 *   S3  buscar_pacientes: por parte do nome, sem acento; so os desta nutricionista; arquivado fora
 *   S4  contexto_paciente: o "Pacote" no servidor (iniciais, sem contatos; HOLOSCAN com areas prioritarias; ferramentas;
 *       Mapeamento; Playbook com focos/estrategias)
 *   S5  gerar_resultado com JSON fora do contrato: devolve os erros, nada gravado
 *   S6  gerar_resultado com a analise no contrato: importacao aceita (automatico) + Resultado HOLOS finalizado (template 5)
 *   S7  gerar_resultado_playbook: foco + estrategias -> nova versao (a anterior fica no historico)
 *   S8  recusas: estrategia fora das opcoes, paciente de outra conta, arquivado, sem HOLOSCAN
 *   S9  chave revogada e conta pendente -> 401 na hora
 *   S10 agenda e resultados_paciente; S11 registro de uso sem a chave e sem conteudo clinico
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { conectar, criarNutri, criarCaso, como } from './mcp-pg.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const c = await conectar();
if (!c) { console.log('  PULADO: sem PostgreSQL local (scripts/montar-banco-mcp-local.sh)'); process.exit(0); }

await import('../resultado-direcao.js'); await import('../holos-ai-contrato.js'); await import('../playbook-holos.js'); await import('../sistemas-fechamento.js');
const G = globalThis;
const { criarServidor, FERRAMENTAS } = await import('../supabase/functions/holohacking-mcp/nucleo.js');
const mod = { RD: G.ResultadoDirecao, C: G.HolosAIContrato, PB: G.PlaybookHolos, SF: G.SistemasFechamento };
const EXEMPLO = JSON.parse(readFileSync(new URL('../docs/v1/holos-ai-gpt/exemplo-resultado.json', import.meta.url), 'utf8'));
const usos = [];
const srv = criarServidor({
  mod, uuid: randomUUID, site: 'https://holohacking.com.br',
  identificar: async (k) => (await c.query('select public.mcp_identificar($1) as r', [k])).rows[0].r,
  comoNutri: (uid, fn) => como(c, uid, fn),
  registrarUso: async (...a) => { usos.push(a); await c.query('select public.mcp_registrar_uso($1, $2, $3, $4, $5, $6)', a); },
  contrato: JSON.parse(readFileSync(new URL('../docs/v1/holos-ai-gpt/06-SCHEMA-HOLOS-AI-RESULT.json', import.meta.url), 'utf8')), exemplo: EXEMPLO
});

/* fixtures */
const A = await criarNutri(c, { nome: 'Ana Ficticia' }), B = await criarNutri(c);
const fx = await criarCaso(c, A, { nome: 'Marina Álves Fictícia' });
const fxB = await criarCaso(c, B, { nome: 'Marina de Outra Conta' });
const semH = await criarCaso(c, A, { nome: 'Joana Sem Holoscan', comHoloscan: false });
const arq = await criarCaso(c, A, { nome: 'Rita Arquivada' });
await c.query("update public.patients set status = 'inativo' where id = $1", [arq.PA]);
const chave = (await como(c, A, q => q("select public.criar_chave_mcp('Teste') as r")))[0].r.chave;

let n = 0;
const http = (corpo, { caminho = '/holohacking-mcp/' + chave, metodo = 'POST', headers = {} } = {}) =>
  srv.tratarHttp({ metodo, caminho, headers: Object.assign({ 'content-type': 'application/json' }, headers), corpo: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });
const rpc = async (method, params, k) => { const r = await http({ jsonrpc: '2.0', id: ++n, method, params }, k ? { caminho: '/holohacking-mcp/' + k } : {}); return { status: r.status, j: r.corpo ? JSON.parse(r.corpo) : null }; };
const tool = async (name, args) => { const r = await rpc('tools/call', { name, arguments: args }); return r.j.result; };

/* S1 */
ok((await http({ jsonrpc: '2.0', id: 1, method: 'ping' }, { caminho: '/holohacking-mcp' })).status === 401, 'S1 sem chave -> 401');
ok((await http({ jsonrpc: '2.0', id: 1, method: 'ping' }, { caminho: '/holohacking-mcp/hh_mcp_' + 'x'.repeat(43) })).status === 401, 'S1 chave errada -> 401');
ok((await http({ jsonrpc: '2.0', id: 1, method: 'ping' }, { caminho: '/holohacking-mcp', headers: { Authorization: 'Bearer ' + chave } })).status === 200, 'S1 chave no cabecalho Authorization: Bearer tambem vale');
ok((await http('', { metodo: 'GET' })).status === 405 && (await http('', { metodo: 'OPTIONS' })).status === 204, 'S1 GET 405 (sem SSE); OPTIONS 204 (CORS)');
ok((await http('{quebrado')).status === 400, 'S1 JSON quebrado -> 400');
const lote = await http([{ jsonrpc: '2.0', id: 'a', method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }, { jsonrpc: '2.0', id: 'b', method: 'tools/list' }]);
ok(lote.status === 200 && JSON.parse(lote.corpo).length === 2, 'S1 lote JSON-RPC: 2 respostas (a notificacao nao responde)');

/* S2 */
const ini = await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'teste', version: '1' } });
ok(ini.j.result.protocolVersion === '2025-03-26' && ini.j.result.serverInfo.name === 'holohacking' && /não diagnosticar/.test(ini.j.result.instructions) && ini.j.result.capabilities.tools,
  'S2 initialize: versao pedida, servidor holohacking, instrucoes do metodo');
ok((await rpc('initialize', { protocolVersion: '1999-01-01' })).j.result.protocolVersion === '2025-06-18', 'S2 versao desconhecida -> a mais nova suportada');
ok((await http({ jsonrpc: '2.0', method: 'notifications/initialized' })).status === 202, 'S2 notificacao -> 202 sem corpo');
const lista = (await rpc('tools/list')).j.result.tools;
ok(lista.length === 8 && ['buscar_pacientes', 'contexto_paciente', 'instrucoes_resultado', 'gerar_resultado', 'gerar_resultado_playbook', 'resultados_paciente', 'agenda', 'estrategias_playbook'].every(x => lista.some(t => t.name === x))
  && lista.every(t => t.inputSchema && t.inputSchema.type === 'object' && t.description), 'S2 tools/list: 8 ferramentas com descricao e schema');
ok(lista.filter(t => t.annotations && t.annotations.readOnlyHint === false).map(t => t.name).sort().join() === 'gerar_resultado,gerar_resultado_playbook', 'S2 so as 2 de gerar gravam (as outras sao so leitura)');
const pg = await rpc('prompts/get', { name: 'gerar_resultado', arguments: { paciente: 'Marina' } });
ok((await rpc('prompts/list')).j.result.prompts.length === 1 && /Marina/.test(pg.j.result.messages[0].content.text), 'S2 prompt pronto "gerar_resultado"');
ok((await rpc('xyz/abc')).j.error.code === -32601 && (await rpc('tools/call', { name: 'nao_existe' })).j.error.code === -32602, 'S2 metodo/ferramenta desconhecidos -> erro JSON-RPC');

/* S3 */
const b1 = (await tool('buscar_pacientes', { nome: 'marina alves' })).structuredContent;
ok(b1.total === 1 && b1.pacientes[0].paciente_id === fx.PA && b1.pacientes[0].ultimo_holoscan, 'S3 acha "marina alves" (sem acento, parte do nome) so nesta conta: ' + b1.total);
ok(!JSON.stringify(b1).includes(fxB.PA) && !JSON.stringify(b1).includes('62900000000'), 'S3 nao mostra paciente de outra nutricionista nem telefone');
ok((await tool('buscar_pacientes', { nome: 'rita' })).structuredContent.total === 0 && (await tool('buscar_pacientes', { nome: 'rita', incluir_arquivados: true })).structuredContent.total === 1, 'S3 arquivado so com incluir_arquivados');

/* S4 */
const cx = (await tool('contexto_paciente', { paciente_id: fx.PA })).structuredContent;
const txt = JSON.stringify(cx);
ok(cx.paciente.iniciais === 'M. Á. F.' && cx.paciente.idade > 30 && !/Marina|62900000000|1990-05-10/.test(txt), 'S4 so iniciais e idade (sem nome, telefone, nascimento)');
ok(cx.atendimento.atendimento_id === fx.E1 && cx.atendimento.tipo === 'primeira_consulta', 'S4 atendimento do HOLOSCAN; primeira consulta');
ok(cx.holoscan.areas_prioritarias.map(a => a.sistema).join() === 'metabolico,detox_linfatico' && cx.holoscan.sistemas.length === 5, 'S4 HOLOSCAN: 5 sistemas; areas prioritarias Metabolico e Detox');
ok(cx.ferramentas_aplicadas.length === 4 && cx.ferramentas_aplicadas.some(f => f.ferramenta === 'pqq' && /dou conta/.test(f.respostas.verdadeiro)), 'S4 as 4 ferramentas do atendimento, com as respostas');
ok(cx.mapeamento && /Cansaço no fim da tarde/.test(cx.mapeamento.respostas.motivo.motivo) && cx.relato_para_o_resultado.momento.length >= 1, 'S4 Mapeamento e o relato que entra no Resultado');
ok(cx.playbook.focos.length === 2 && cx.playbook.focos[0].focos.some(f => f.foco_id === 'ME-F1') && cx.playbook.estrategias.some(e => e.estrategia_id === 'ME-C1' && e.combina_com_ferramentas.length) && cx.linha_do_momentum.estado === 'Reorganizar',
  'S4 Playbook: focos das 2 areas, estrategias com "combina com" e a Linha do Momentum');
const ins = (await tool('instrucoes_resultado', {})).structuredContent;
ok(ins.contrato && ins.exemplo && ins.exemplo.schema_version === 1 && /INEGOCIÁVEL/.test(ins.instrucoes), 'S4 instrucoes_resultado: contrato (06), exemplo e regras do metodo');

/* S5 */
const antes = (await c.query('select count(*)::int n from public.holos_results where patient_id = $1', [fx.PA])).rows[0].n;
const ruim = await tool('gerar_resultado', { paciente_id: fx.PA, resultado: { schema_version: 1, tipo: 'primeira_consulta', paciente: 'x' } });
ok(ruim.isError && ruim.structuredContent.erro === 'contrato' && ruim.structuredContent.detalhes.erros.length > 3, 'S5 fora do contrato: isError com a lista de erros para a IA corrigir');
ok((await c.query('select count(*)::int n from public.holos_results where patient_id = $1', [fx.PA])).rows[0].n === antes, 'S5 nada gravado');

const tx = await tool('gerar_resultado', { paciente_id: fx.PA, resultado: 'Segue a análise:\n```json\n{"schema_version": 1, "tipo": "primeira_consulta"}\n```' });
ok(tx.isError && tx.structuredContent.erro === 'contrato', 'S5 texto com bloco ```json``` e lido (e validado: incompleto -> erros)');
ok((await tool('gerar_resultado', { paciente_id: fx.PA, resultado: 'sem json nenhum' })).structuredContent.erro === 'json_invalido', 'S5 texto sem JSON -> json_invalido');

/* S6 */
const ex = JSON.parse(JSON.stringify(EXEMPLO)); ex.tipo = 'primeira_consulta';
const g1 = await tool('gerar_resultado', { paciente_id: fx.PA, resultado: ex });
const r1 = g1.structuredContent;
ok(!g1.isError && r1.gravado && r1.foco && r1.estrategias.length >= 1 && /Nada foi enviado/.test(r1.proximo_passo), 'S6 Resultado gravado a partir da analise: foco "' + (r1.foco || '').slice(0, 50) + '…", ' + (r1.estrategias || []).length + ' estrategia(s)' + (g1.isError ? ' ERRO ' + JSON.stringify(r1) : ''));
const row1 = (await c.query('select * from public.holos_results where id = $1', [r1.resultado_id])).rows[0];
ok(row1 && row1.status === 'salvo' && row1.template_version === 5 && row1.encounter_id === fx.E1 && row1.holoscan_application_id === fx.H && row1.direcao.foco_atual.confirmado && /via MCP/.test(row1.leitura_profissional),
  'S6 holos_results: salvo, template 5, no atendimento e HOLOSCAN certos, foco confirmado, origem MCP registrada');
const imp = (await c.query('select status, aceite, agente from public.holos_ai_imports where encounter_id = $1 order by versao desc limit 1', [fx.E1])).rows[0];
ok(imp.status === 'confirmado' && imp.aceite === 'automatico', 'S6 a analise ficou guardada como importacao HOLOS AI aceita (imutavel, auditavel)');
ok(row1.content_snapshot && row1.content_snapshot.direcao_paciente && row1.content_snapshot.direcao_paciente.foco_atual, 'S6 o documento do paciente (snapshot) ja sai pronto para o app emitir');

/* S7 */
const g2 = await tool('gerar_resultado_playbook', { paciente_id: fx.PA, foco_id: 'ME-F1', estrategias: ['ME-C1', { estrategia_id: 'ME-C4', acao: 'Levar um lanche pronto para as 16h.' }, 'ME-M1'] });
const r2 = g2.structuredContent;
ok(!g2.isError && r2.gravado && r2.versao === r1.versao + 1 && r2.substituiu_versao_anterior && r2.estrategias.length === 3 && r2.estrategias.some(e => /16h/.test(e.acao || '')),
  'S7 Playbook: nova versao ' + r2.versao + ' com 3 estrategias (uma editada)' + (g2.isError ? ' ERRO ' + JSON.stringify(r2) : ''));
const row2 = (await c.query('select leitura_profissional, supersedes_id from public.holos_results where id = $1', [r2.resultado_id])).rows[0];
ok(/Playbook HOLOS PB-V2 · Foco ME-F1/.test(row2.leitura_profissional) && row2.supersedes_id === r1.resultado_id && (await c.query('select superseded_at from public.holos_results where id = $1', [r1.resultado_id])).rows[0].superseded_at,
  'S7 rastreavel ao Playbook; a versao anterior fica no historico (substituida)');

/* S8 */
const e1 = (await tool('gerar_resultado_playbook', { paciente_id: fx.PA, foco_id: 'ME-F1', estrategias: ['FU-C1'] })).structuredContent;
ok(e1.erro === 'estrategias' && /FU-C1/.test(e1.mensagem), 'S8 estrategia fora das opcoes deste paciente -> recusada');
ok((await tool('contexto_paciente', { paciente_id: fxB.PA })).structuredContent.erro === 'paciente_nao_encontrado', 'S8 paciente de outra nutricionista -> "nao encontrado" (RLS)');
ok((await tool('gerar_resultado_playbook', { paciente_id: fxB.PA, foco_id: 'ME-F1', estrategias: ['ME-C1'] })).structuredContent.erro === 'paciente_nao_encontrado', 'S8 nem gravar em paciente de outra conta');
ok((await tool('contexto_paciente', { paciente_id: arq.PA })).structuredContent.erro === 'paciente_arquivado', 'S8 paciente arquivado -> reativar no app');
ok((await tool('contexto_paciente', { paciente_id: semH.PA })).structuredContent.erro === 'holoscan_obrigatorio', 'S8 sem HOLOSCAN oficial -> aplicar o HOLOSCAN primeiro');
ok((await tool('contexto_paciente', { paciente_id: 'nao-e-uuid' })).structuredContent.erro === 'paciente_id', 'S8 paciente_id invalido');

/* S10 */
await como(c, A, q => q("insert into public.consultations (nutritionist_id, patient_id, data, hora, duracao_min, tipo) values ($1, $2, current_date, '14:00', 60, 'retorno')", [A, fx.PA]));
const ag = (await tool('agenda', {})).structuredContent;
ok(ag.consultas.length === 1 && ag.consultas[0].hora === '14:00' && ag.consultas[0].paciente_id === fx.PA, 'S10 agenda de hoje');
const rs = (await tool('resultados_paciente', { paciente_id: fx.PA })).structuredContent.resultados;
ok(rs.length === 2 && rs.filter(r => r.vigente).length === 1 && rs.find(r => r.vigente).resultado_id === r2.resultado_id, 'S10 resultados_paciente: 2 versoes, 1 vigente');
ok((await tool('estrategias_playbook', { sistema: 'fungico' })).structuredContent.estrategias.length === 12, 'S10 estrategias_playbook por sistema');

/* S11 */
const log = (await c.query('select ferramenta, ok, erro, patient_id from public.mcp_usage_log where nutritionist_id = $1', [A])).rows;
ok(log.length >= 15 && log.some(l => l.ferramenta === 'gerar_resultado' && l.ok) && log.some(l => !l.ok && l.erro === 'contrato'), 'S11 cada chamada registrada (ferramenta, ok/erro): ' + log.length);
ok(!JSON.stringify(usos).includes(chave) && !JSON.stringify(log).includes('Marina'), 'S11 o registro nao guarda a chave nem dado clinico');

/* S9 */
await c.query("update public.profiles set status = 'pendente' where id = $1", [A]);
ok((await rpc('ping')).status === 401, 'S9 conta que voltou a ficar pendente -> 401 na hora');
await c.query("update public.profiles set status = 'ativo' where id = $1", [A]);
const kid = (await c.query('select id from public.mcp_keys where nutritionist_id = $1', [A])).rows[0].id;
await como(c, A, q => q('select public.revogar_chave_mcp($1)', [kid]));
ok((await rpc('ping')).status === 401, 'S9 chave revogada -> 401 na hora');
ok(FERRAMENTAS.length === 8, 'S9 catalogo de ferramentas estavel');

await c.end();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
