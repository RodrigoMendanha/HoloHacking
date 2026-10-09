/**
 * PROXIMOS PASSOS HOLOS — motor e catalogo, sem navegador:
 *   1  a fixture do servidor falso e IDENTICA a migration 20261012100000 (30 regras: ids, sistemas, ranks, ferramentas, textos)
 *   2  o motor e deterministico (mesma entrada = mesma saida) e segue o algoritmo V1 (principal + 2 complementares, sem repetir)
 *   3  regra nao aprovada, ferramenta fora das 10 e REC legada (corpo-bancos.js) nunca entram
 *   4  o motor nao referencia exames, documentos, Leitura Integrada, Conduta nem HOLOS AI
 *   5  o modulo nao altera HOLOS-V1@2: nao escreve em methodology_* nem em holoscan_*
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import '../proximos-passos.js';
import { CATALOGO, REGRAS, canonico } from './proximos-passos-catalogo-v1.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const P = globalThis.ProximosPassos;
const SQL = readFileSync(new URL('../supabase/migrations/20261012100000_proximos_passos_holos.sql', import.meta.url), 'utf8');
const JS = readFileSync(new URL('../proximos-passos.js', import.meta.url), 'utf8');

/* ----- 1: fixture == migration ----- */
const noSql = [...SQL.matchAll(/\('(REC-[A-Z]{3}-\d\d)', '([a-z_]+)', (\d), '([a-z0-9_]+)', '((?:[^']|'')*)', '((?:[^']|'')*)'\)/g)]
  .map(m => ({ rule_id: m[1], system_id: m[2], rank: Number(m[3]), tool_id: m[4], professional_reason: m[5].replace(/''/g, "'"), next_action: m[6].replace(/''/g, "'") }));
ok(noSql.length === 30 && REGRAS.length === 30, 'migration e fixture tem 30 regras: ' + noSql.length + ' / ' + REGRAS.length);
ok(JSON.stringify(noSql.sort((a, b) => a.rule_id.localeCompare(b.rule_id))) === JSON.stringify(REGRAS.slice().sort((a, b) => a.rule_id.localeCompare(b.rule_id))), 'as 30 regras sao IDENTICAS na migration e na fixture (ids, sistemas, ranks, ferramentas, textos)');
ok(/HOLOS-RECOMENDACOES-V1', 1, 'aprovado'/.test(SQL) && /'2026-10-09'/.test(SQL) && /aprovacao metodologica expressa do responsavel pelo projeto em 09\/10\/2026/.test(SQL), 'catalogo HOLOS-RECOMENDACOES-V1 v1 aprovado em 09/10/2026, com a proveniencia expressa (sem UUID de aprovador inventado)');
ok(!/approved_by\)\s*values|approved_by, approved_at\)/.test(SQL.split('insert into public.holos_recommendation_rules')[1] || '') && /approved_by\s+uuid references auth\.users\(id\)/.test(SQL), 'approved_by fica NULO (coluna existe, nenhum UUID inventado)');
const porSistema = {}; REGRAS.forEach(r => { (porSistema[r.system_id] = porSistema[r.system_id] || []).push(r); });
ok(Object.keys(porSistema).length === 5 && Object.values(porSistema).every(l => l.map(r => r.rank).sort().join() === '1,2,3,4,5,6' && new Set(l.map(r => r.tool_id)).size === 6), '6 regras por sistema, ranks 1..6, sem ferramenta repetida dentro do sistema');
ok(REGRAS.every(r => P.FERRAMENTAS.includes(r.tool_id)) && P.FERRAMENTAS.length === 10, 'todas as regras apontam para uma das 10 ferramentas ativas');
const hash = createHash('sha256').update(canonico(REGRAS), 'utf8').digest('hex');
ok(/string_agg\(r\.rule_id \|\| '\|' \|\| r\.system_id \|\| '\|' \|\| r\.rank \|\| '\|' \|\| r\.tool_id \|\| '\|' \|\| r\.professional_reason \|\| '\|' \|\| r\.next_action, E'\\n' order by r\.rule_id\)/.test(SQL), 'o content_hash do catalogo usa a MESMA forma canonica no SQL e no JS (' + hash.slice(0, 12) + '…)');

/* ----- 2: motor deterministico, algoritmo V1 ----- */
const regras = REGRAS.map(r => Object.assign({ status: 'aprovado' }, r));
const S = (...ids) => ids.map(id => ({ system_id: id, nome: id, nota: 3, dominantes: [] }));
const sel = (x) => x.selection.map(s => s.papel + ':' + s.rule_id + ':' + s.tool_id).join(' ');
const a = P.selecionar({ sistemas: S('fungico', 'metabolico'), regras, concluidas: [] });
ok(sel(a) === 'principal:REC-FUN-01:mapa_rotina_v1 complementar:REC-MET-02:gatilhos_respostas_v1 complementar:REC-FUN-03:mapa_crencas', 'sistema 1 + sistema 2: principal + 2 complementares, sem repetir ferramenta (MET-01 repetiria o Mapa da Rotina): ' + sel(a));
ok(JSON.stringify(P.selecionar({ sistemas: S('fungico', 'metabolico'), regras, concluidas: [] })) === JSON.stringify(a), 'mesma entrada + mesmo catalogo = mesma saida');
ok(sel(P.selecionar({ sistemas: S('fungico', 'metabolico'), regras, concluidas: ['mapa_rotina_v1'] })) === 'principal:REC-FUN-02:gatilhos_respostas_v1 complementar:REC-MET-03:mapa_crencas complementar:REC-FUN-04:linha_momentum', 'ferramenta concluida no atendimento atual e pulada (quando ha outra elegivel)');
ok(sel(P.selecionar({ sistemas: S('fungico'), regras, concluidas: [] })) === 'principal:REC-FUN-01:mapa_rotina_v1 complementar:REC-FUN-02:gatilhos_respostas_v1 complementar:REC-FUN-03:mapa_crencas', 'so um sistema avaliavel: ate 3 regras dele, por rank');
const vazio = P.selecionar({ sistemas: [], regras, concluidas: [] });
ok(vazio.selection.length === 0 && vazio.motivo === 'Não há dados suficientes para gerar Próximos Passos HOLOS nesta aplicação.', 'nenhum sistema avaliavel: nenhuma ferramenta, com o motivo');
const todas = P.selecionar({ sistemas: S('mental_emocional_espiritual'), regras, concluidas: ['pqq', 'mapa_crencas', 'gatilhos_respostas_v1', 'mapa', 'carta_futuro', 'conexao_pertencimento_v1'] });
ok(sel(todas) === 'principal:REC-MEE-01:pqq complementar:REC-MEE-02:mapa_crencas complementar:REC-MEE-03:gatilhos_respostas_v1', 'se TODAS as ferramentas do sistema ja foram concluidas no atendimento, nada e inventado nem escondido: seguem por rank');
ok(sel(P.selecionar({ sistemas: S('detox_linfatico', 'acido_inflamatorio'), regras, concluidas: [] })) === 'principal:REC-DTL-01:mapa_rotina_v1 complementar:REC-AIN-02:linha_momentum complementar:REC-DTL-03:oq3', 'detox + acido: DTL-01, AIN-02 (AIN-01 repetiria), DTL-03 (DTL-02 repetiria o Momentum)');

/* ----- 3: nao aprovada, fora das 10, REC legada ----- */
const semFun01 = regras.map(r => r.rule_id === 'REC-FUN-01' ? Object.assign({}, r, { status: 'retirado' }) : r);
ok(sel(P.selecionar({ sistemas: S('fungico'), regras: semFun01, concluidas: [] })).startsWith('principal:REC-FUN-02'), 'regra nao aprovada (retirada) nunca aparece');
const comTravada = regras.concat([{ rule_id: 'REC-X-00', system_id: 'fungico', rank: 0, tool_id: 'diario_corporal', status: 'aprovado', professional_reason: 'x', next_action: 'y' }]);
ok(sel(P.selecionar({ sistemas: S('fungico'), regras: comTravada, concluidas: [] })).startsWith('principal:REC-FUN-01'), 'ferramenta fora das 10 ativas (diario_corporal, travada) nunca aparece, mesmo com rank menor');
const legadas = regras.concat([{ rule_id: 'REC-001', system_id: 'fungico', rank: 0, tool_id: 'gatilhos_respostas', status: 'legado_nao_validado', professional_reason: 'x', next_action: 'y' }, { rule_id: 'SEL-001', system_id: 'fungico', rank: 0, tool_id: 'oq3', status: 'rascunho', professional_reason: 'x', next_action: 'y' }]);
const l = P.selecionar({ sistemas: S('fungico', 'metabolico'), regras: legadas, concluidas: [] });
ok(l.selection.every(s => /^REC-(FUN|AIN|MET|DTL|MEE)-0[1-6]$/.test(s.rule_id)), 'REC-001…023 e SEL-001 (legado nao validado) nunca entram no motor novo');
ok(!/corpo-bancos|\bRECOMENDACOES\s*=|regrasApresentaveis|\bSELECAO\b|legado_nao_validado/.test(JS.replace(/\/\*[\s\S]*?\*\//g, '')), 'o modulo nao importa nem consulta as regras legadas de corpo-bancos.js');

/* ----- 4: fronteira ----- */
ok(!/lab_|exame|Laboratorio|LeituraIntegrada|integrated_reading|documents|ArquivoStore|holos-ai|HolosAI|Conduta\b/.test(JS.replace(/\/\*[\s\S]*?\*\//g, '')), 'o codigo do motor (fora dos comentarios) nao referencia exames, documentos, Leitura Integrada, Conduta nem HOLOS AI');
ok(!/\.from\("methodology_|\.from\("holoscan_|\.insert\(|\.update\(|\.delete\(|\.upsert\(/.test(JS), 'o modulo nao escreve em tabela nenhuma (so RPC do servidor e SELECT no catalogo e nos registros)');
ok(/registrar_proximos_passos|proximos_passos_holos/.test(JS) && /holos_recommendation_rules/.test(JS) && /holos_next_steps/.test(JS), 'le o catalogo e os registros; registra so pela RPC');
ok(!/tratamento|prescri[çc][ãa]o|diagn[óo]stico|cura\b|protocolo indicado|conduta obrigat[óo]ria/i.test(JS.replace(/\/\*[\s\S]*?\*\//g, '')), 'linguagem: nenhuma palavra proibida nos textos do bloco (tratamento, prescricao, diagnostico, cura, protocolo indicado, conduta obrigatoria)');
ok(!/candid[ií]ase|fungos|prolifera|inflama[çc][ãa]o|acidose|resist[êe]ncia insul|diabetes|toxinas|desintoxica|linf[áa]tico deficiente|psiqui[áa]tric/i.test(REGRAS.map(r => r.professional_reason + ' ' + r.next_action).join(' ')), 'as 30 regras nao transformam nome de sistema em diagnostico');

console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
