/**
 * GOLDEN da emissao RF-1 (12/10, motor de resultados V1, item 4.7).
 * Gerado UMA vez com o codigo ANTERIOR ao motor de resultados (commit 4680dbb): monta no Supabase falso um caso ficticio
 * com as 9 ferramentas, salva o Resultado HOLOS (template 3), emite o Resultado Final (RF-1) e grava:
 *   testes/golden/rf1-fixture.json  — a linha do resultado + a linha da emissao (entrada)
 *   testes/golden/rf1-paciente.html — o HTML que ResultadoPagina.documentoEmissao desenhava (saida)
 * O teste testar-emissao-imutavel.mjs desenha a MESMA entrada com o codigo atual e exige o MESMO HTML.
 * Nao rodar de novo depois do motor de resultados (o golden e o retrato do que ja foi emitido).
 * Uso: node testes/golden/gerar-golden-rf1.mjs   (com o servidor estatico em 127.0.0.1:5500)
 */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from '../supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from '../holos-aprovado.mjs';

const srv = criarServidor();
const UA = srv.criarConta('golden@holo.test', 'senha-golden-1');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Golden Ficticia', registro: 'CRN-0 0000', profissao: 'Nutricionista', especialidade: 'Nutrição', cidade: 'Cidade Ficticia', status: 'ativo', created_at: '2026-10-01T10:00:00.000Z', updated_at: '2026-10-01T10:00:00.000Z' });
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const PA = ins('patients', { nome: 'Paciente Golden Ficticia', telefone: '62900000000' }).id;
const EA = ins('encounters', { patient_id: PA, occurred_at: '2026-10-12T13:00:00.000Z', timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const HA = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: '2026-10-12' }) }).data;
const conc = '2026-10-12T14:00:00.000Z';
const tool = (id, r, extra) => ins('tool_applications', Object.assign({ patient_id: PA, encounter_id: EA, ferramenta_id: id, versao_ferramenta: '1', status: 'concluida', respostas: r, iniciada_em: conc, concluida_em: conc }, extra || {})).id;
const T = {
  oq3: tool('oq3', { quer: 'ter energia à tarde', precisa: 'dormir melhor', consegue: 'caminhar 10 minutos', alavancas: 'a filha' }),
  pqq: tool('pqq', { objetivo: 'emagrecer', r1: 'para me sentir bem', r2: 'para ter disposição', r3: 'para brincar com a filha', verdadeiro: 'estar presente para a família' }),
  mom: tool('linha_momentum', { energia: 4, carga: 7, controle: 3, suporte: 6, espaco: 4, estabilidade: 5, sustenta: 'a rotina da manhã', limita: 'o trabalho à noite', nao_pedir: 'mudanças no jantar', estado_confirmado: 'Reorganizar', justificativa_estado: 'JUSTIFICATIVA_SO_PROFISSIONAL' }),
  rot: tool('mapa_rotina_v1', { acorda: '06:00', dorme: '23:30', sono: 'curto', trabalho: 'escritório', dificuldade: '16h e à noite', disponiveis: 'manhã cedo', espacos: 'lanche das 16h', eventos: [{ inicio: '07:00', titulo: 'Café da manhã', categoria: 'refeição', percepcao: 'baixa' }] }, { status: 'revisada', leitura: 'Janela crítica às 16h.', prioridade: 'Aprofundar', proximo_passo: 'Planejar o lanche das 16h' }),
  cre: tool('mapa_crencas', { crencas: 'comer à noite engorda', origem: 'a mãe dizia', mais_atrapalha: 'culpa depois do jantar', alternativa: 'posso jantar com calma' }),
  gat: tool('gatilhos_respostas_v1', { contexto: 'fim do dia', gatilho: 'cansaço', pensamento: 'mereço', emocao: 'ansiedade', intensidade: 7, resposta: 'come doce', consequencia_imediata: 'alívio', alternativa: 'chá', observacao_nutri: 'OBS_SO_PROFISSIONAL' }),
  rod: tool('roda_vida', { saude: 4, relacoes: 7, trabalho: 5, financas: 6, espiritualidade: 8, lazer: 3, desenvolvimento: 6, proposito: 7, puxa: 'lazer' }),
  car: tool('carta_futuro', { carta: 'CARTA_INTIMA_NAO_MOSTRAR', para_quando: '2027-01-01' }),
  con: tool('conexao_pertencimento_v1', { contar: 'a irmã', pertence: 'grupo de corrida', vinculos: [{ rotulo: 'Irmã Ficticia', natureza: 'pessoa', papel: 'apoia', proximidade: 'próxima' }, { rotulo: 'Colega Ficticio', natureza: 'pessoa', papel: 'dificulta', proximidade: 'distante' }] })
};
rpc('registrar_proximos_passos', { p_application_id: HA });
const ids = Object.values(T);
const vis = {}; ids.forEach(id => { vis[id] = { mostrar: true }; });
const R = rpc('salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HA, tool_application_ids: ids,
  visao_paciente: { ferramentas: vis, proximos_passos: true }, leitura_profissional: 'Leitura da nutricionista ficticia.', pontos_acompanhar: 'Sono e lanche.', questoes_aprofundar: 'QUESTAO_SO_PROFISSIONAL' } });
if (R.error) throw new Error(R.error.message);
const C1 = ins('conducts', { patient_id: PA, encounter_id: EA, status: 'salvo', revision_number: 1, objective: 'Estabilizar a energia', nutrition_strategy: 'Organizar o lanche', actions: 'Lanche às 16h', resources: 'Lista de lanches', professional_guidance: 'Observar a fome', return_plan: 'Retorno em 30 dias', monitoring: 'MONITORAMENTO_NAO_VAI' }).id;
ins('agreements', { patient_id: PA, conduct_id: C1, description: 'Beber água', due_text: 'diário', status: 'acordado', position: 1 });
const E = rpc('emitir_resultado_final', { payload: { holos_result_id: R.data } });
if (E.error) throw new Error(E.error.message);
const linhaR = srv.linhas('holos_results').find(r => r.id === R.data);
const linhaE = srv.linhas('holos_result_emissions').find(e => e.id === E.data.id);
const fixture = JSON.parse(JSON.stringify({ resultado: linhaR, emissao: linhaE }));

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const P = await nav.newPage();
await P.emulateTimezone('America/Sao_Paulo');
await ligarPagina(P, srv);
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForFunction(() => window.ResultadoPagina && window.ResultadoHolos && window.CATALOGO_FERRAMENTAS, { timeout: 15000 });
const html = await P.evaluate((fx) => window.ResultadoPagina.documentoEmissao(fx.emissao, fx.resultado), fixture);
await nav.close();
const dir = new URL('./', import.meta.url);
writeFileSync(new URL('rf1-fixture.json', dir), JSON.stringify(fixture, null, 1));
writeFileSync(new URL('rf1-paciente.html', dir), html);
console.log('golden gravado:', html.length, 'caracteres');
process.exit(0);
