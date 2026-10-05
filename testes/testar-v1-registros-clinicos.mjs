/**
 * V1 — ETAPA 6.5 (B) — REGISTROS CLINICOS ESTRUTURADOS (sem navegador)
 *
 * Mapa da Rotina (Corpo 03), Gatilhos & Respostas (Mente 03), Conexao & Pertencimento (Espirito 04).
 *  1. Catalogo (ferramentas.js) = formato do SERVIDOR (lido da migration 20261005110000): mesmas chaves, tipos e opcoes
 *  2. Natureza: sem resultado/sintese, sem score, faixa, classificacao, interpretacao ou recomendacao automatica
 *  3. Espiritualidade opcional, sem presumir religiao, Deus, "algo maior" ou familia tradicional
 *  4. Servidor (falso, espelho do SQL): criar, editar rascunho, concluir, imutavel depois, leitura profissional,
 *     "nova a partir desta", paciente certo, outro paciente, outra conta, arquivado, XSS guardado como texto, limites
 *  5. Visualizacao: tudo escapado (HTML e SVG); nenhuma palavra de classificacao/escore no que e desenhado
 *  6. Nao interferencia estatica: motores (HOLOSCAN oficial, legado, LI, laboratorio) nao leem os registros
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import { criarServidor } from './supabase-falso.mjs';
import { FORMATO, OPCOES, IDS_REGISTRO } from './registro-formato.mjs';

globalThis.window = globalThis;
globalThis.document = { addEventListener() {} };
await import('../utils.js');
await import('../ferramentas.js');
await import('../ferramentas-registro.js');
await import('../corpo-bancos.js').catch(() => {});
await import('../resultado-corpo.js').catch(() => {});

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const RAIZ = new URL('..', import.meta.url);
const ler = (f) => readFileSync(new URL(f, RAIZ), 'utf8');

const IDS = ['mapa_rotina', 'gatilhos_respostas', 'conexao_pertencimento'];
const cat = (id) => window.CATALOGO_FERRAMENTAS.find(f => f.id === id);

titulo('1. CATALOGO = SERVIDOR');
ok(JSON.stringify(IDS_REGISTRO.slice().sort()) === JSON.stringify(IDS.slice().sort()), 'o servidor conhece exatamente os 3 registros: ' + IDS_REGISTRO.join(', '));
ok(JSON.stringify(OPCOES) === JSON.stringify(window.REGISTRO_OPCOES), 'as 8 listas de opcoes do servidor = REGISTRO_OPCOES de ferramentas.js (mesma ordem, mesma grafia)');
const TIPO = (c) => c.tipo === 'opcoes' ? 'op:' + Object.keys(window.REGISTRO_OPCOES).find(k => window.REGISTRO_OPCOES[k] === c.opcoes) : c.tipo;
for (const id of IDS) {
  const f = cat(id), s = FORMATO[id];
  const campos = {};
  (f.grupos || []).forEach(g => (g.campos || []).forEach(c => { campos[c.id] = TIPO(c); }));
  (f.campos || []).forEach(c => { campos[c.id] = TIPO(c); });
  ok(JSON.stringify(Object.entries(campos).sort()) === JSON.stringify(Object.entries(s.campos).sort()), id + ': campos e tipos do catalogo = servidor (' + Object.keys(campos).length + ')');
  if (f.lista) {
    const item = {}; f.lista.campos.forEach(c => { item[c.id] = TIPO(c); });
    ok(f.lista.id === s.lista && JSON.stringify(Object.entries(item).sort()) === JSON.stringify(Object.entries(s.item).sort()), id + ': itens de "' + f.lista.id + '" = servidor (' + Object.keys(item).length + ' campos)');
    ok(f.lista.campos.filter(c => c.tipo === 'opcoes').every(c => Object.values(window.REGISTRO_OPCOES).includes(c.opcoes)), id + ': toda opcao vem de REGISTRO_OPCOES (nenhuma lista solta)');
  } else ok(s.lista === null, id + ': sem lista, como no servidor');
}
ok(cat('mapa_rotina').modulo === 'corpo' && cat('mapa_rotina').numero === '03' && cat('gatilhos_respostas').modulo === 'mente' && cat('gatilhos_respostas').numero === '03'
  && cat('conexao_pertencimento').modulo === 'espirito' && cat('conexao_pertencimento').numero === '04', 'posicao: Corpo 03, Mente 03, Espirito 04');
ok(IDS.every(id => window.FERRAMENTAS_ATIVAS.includes(id)), 'as 3 estao em FERRAMENTAS_ATIVAS');
const html = ler('index.html');
ok(IDS.every(id => (html.match(new RegExp('data-ferramenta="' + id + '"', 'g')) || []).length === 1), 'um card de cada na galeria do modulo certo');
ok(/id="contador-corpo"><b>3<\/b>/.test(html) && /id="contador-mente"><b>3<\/b>/.test(html) && /id="contador-espirito"><b>4<\/b>/.test(html), 'contadores: Corpo 3, Mente 3, Espirito 4');

titulo('2. NATUREZA: REGISTRO, NAO RESULTADO');
ok(IDS.every(id => cat(id).registro === true && cat(id).imutavel_concluida === true && cat(id).resultado === undefined), 'registro: true, imutavel_concluida: true, sem `resultado` (nenhuma sintese)');
ok(!window.ResultadoCorpo || IDS.every(id => window.ResultadoCorpo.derivar(cat(id), { eventos: [{ inicio: '08:00', categoria: 'fome', percepcao: 'alta' }], intensidade: '9' }) == null), 'ResultadoCorpo.derivar devolve null para os 3');
const rotulos = IDS.map(id => JSON.stringify(cat(id))).join(' ');
ok(!/escore|score|pontua|faixa|diagn[oó]stic|classifica[cç][aã]o autom|t[oó]xic|saud[aá]vel|rede forte|rede fraca|isolamento|depend[eê]ncia|boa conex|m[aá] conex/i.test(rotulos.replace(/não é escore clínico|nao e escore/gi, '')),
  'nenhum rotulo, dica ou opcao fala em escore, faixa, diagnostico, classificacao ou rotulo de relacao');
ok(/não é escore clínico/.test(JSON.stringify(cat('mapa_rotina'))) && /não é escore clínico/.test(JSON.stringify(cat('gatilhos_respostas'))), 'percepcao e intensidade dizem que sao do paciente, nao escore clinico');
ok(/não recomendação/.test(JSON.stringify(cat('mapa_rotina'))) && /não é prescrição/.test(JSON.stringify(cat('gatilhos_respostas'))), '"espacos para mudanca" e "alternativa" se declaram registro, nao recomendacao/prescricao');
const recs = (window.CorpoBancos && window.CorpoBancos.regrasApresentaveis) ? window.CorpoBancos.regrasApresentaveis() : [];
ok(!recs.some(r => IDS.includes(r.recommended_tool_id)), 'nenhuma regra de recomendacao apresentavel aponta para os 3 (' + recs.length + ' regras confirmadas)');

titulo('3. ESPIRITUALIDADE OPCIONAL E INCLUSIVA');
const cp = cat('conexao_pertencimento');
const gEsp = cp.grupos.find(g => /Espiritualidade/.test(g.titulo));
ok(gEsp && /opcional/i.test(gEsp.titulo) && /só se fizer sentido/.test(gEsp.titulo), 'grupo de espiritualidade titulado como opcional, "só se fizer sentido"');
ok(!/\bDeus\b|igreja|cristã|fé em|religioso obrigat/i.test(JSON.stringify(cp)), 'nenhum rotulo presume religiao, Deus ou igreja');
ok(!JSON.stringify(cp).includes('obrigat') && !cp.exige_resposta, 'nenhum campo obrigatorio');
ok(window.REGISTRO_OPCOES.vinculo_tipo.includes('parceiro(a)') && window.REGISTRO_OPCOES.vinculo_tipo.includes('amizade') && !window.REGISTRO_OPCOES.vinculo_tipo.some(t => /marido|esposa|pai|mãe/i.test(t)),
  'tipos de vinculo sem presumir familia tradicional (parceiro(a), amizade, comunidade)');
const resumoSemEsp = window.RegistroVisual.resumo(cp, { contar: 'irmã' });
ok(!/Espiritualidade/.test(resumoSemEsp), 'espiritualidade nao preenchida nao aparece no resumo (nem como "não registrado")');

titulo('4. SERVIDOR (ESPELHO DO SQL)');
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123'), UB = srv.criarConta('b@holo.test', 'senha-b-123');
const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PA = q(UA, 'patients', 'insert', { dados: { nome: 'Paciente Registro Ficticio A' } }).data[0].id;
const PA2 = q(UA, 'patients', 'insert', { dados: { nome: 'Paciente Registro Ficticio A2' } }).data[0].id;
const PB = q(UB, 'patients', 'insert', { dados: { nome: 'Paciente Registro Ficticio B' } }).data[0].id;
const ins = (uid, pid, fid, respostas, extra) => q(uid, 'tool_applications', 'insert', { dados: Object.assign({ patient_id: pid, ferramenta_id: fid, versao_ferramenta: '1', status: 'rascunho', respostas }, extra || {}) });
const upd = (uid, id, dados) => q(uid, 'tool_applications', 'update', { dados, filtros: [{ op: 'eq', col: 'id', val: id }] });
const hint = (r) => r.error ? (r.error.hint || r.error.message) : 'ACEITO';

const VAL = {
  mapa_rotina: { acorda: '06:30', dorme: '23:00', eventos: [{ inicio: '07:00', fim: '07:20', categoria: 'refeição', titulo: 'café', percepcao: 'baixa', dias: ['seg', 'ter'] }, { inicio: '12:00', categoria: 'estresse', titulo: 'reunião', dias: null }], espacos: 'pausa antes do almoço' },
  gatilhos_respostas: { data: '2026-10-01', horario: '21:30', contexto: 'em casa', gatilho: 'discussão', pensamento: 'não aguento', emocao: 'raiva', intensidade: '7', resposta: 'come doce', consequencia_imediata: 'alívio', consequencia_posterior: 'culpa', alternativa: 'ligar para a irmã' },
  conexao_pertencimento: { contar: 'irmã', vinculos: [{ rotulo: 'Irmã', natureza: 'pessoa', tipo: 'família', papel: 'apoia', proximidade: 'próxima', momento: 'presente no momento' }, { rotulo: 'Grupo', natureza: 'grupo', tipo: 'comunidade', papel: 'variável' }] }
};
const ids = {};
for (const id of IDS) {
  const r = ins(UA, PA, id, VAL[id]);
  ids[id] = r.data && r.data[0] && r.data[0].id;
  ok(!r.error && JSON.stringify(r.data[0].respostas) === JSON.stringify(VAL[id]) && r.data[0].resultado == null && r.data[0].nutritionist_id === UA, id + ': criado no paciente certo, respostas exatas, sem resultado');
  ok(hint(upd(UA, ids[id], { respostas: Object.assign({}, VAL[id], { observacoes: 'editado no rascunho' }) })) === 'ACEITO' || id === 'gatilhos_respostas', id + ': rascunho editavel');
}
ok(hint(upd(UA, ids.gatilhos_respostas, { respostas: Object.assign({}, VAL.gatilhos_respostas, { observacao_nutri: 'editado no rascunho' }) })) === 'ACEITO', 'gatilhos_respostas: rascunho editavel');
const recusas = [
  ins(UA, PA, 'mapa_rotina', { escore: 3 }), ins(UA, PA, 'mapa_rotina', { eventos: [{ categoria: 'jejum' }] }), ins(UA, PA, 'mapa_rotina', { acorda: '25:00' }),
  ins(UA, PA, 'mapa_rotina', { eventos: [{ dias: ['seg', 'seg'] }] }), ins(UA, PA, 'mapa_rotina', { eventos: Array.from({ length: 101 }, (_, i) => ({ titulo: 'e' + i })) }),
  ins(UA, PA, 'gatilhos_respostas', { intensidade: '11' }), ins(UA, PA, 'gatilhos_respostas', { data: '2026-02-31' }), ins(UA, PA, 'gatilhos_respostas', { contexto: 'a'.repeat(8001) }),
  ins(UA, PA, 'conexao_pertencimento', { vinculos: [{ rotulo: 'x', papel: 'tóxica' }] }), ins(UA, PA, 'conexao_pertencimento', { rede: 'fraca' })
].map(hint);
ok(recusas.every(h => h === 'registro_formato'), 'chave estranha, opcao fora da lista (inclusive "tóxica"), horario, dia repetido, 101 itens, intensidade 11, data impossivel, texto longo e "rede fraca" recusados: ' + [...new Set(recusas)].join(','));
ok(hint(ins(UA, PA, 'gatilhos_respostas', {}, { resultado: { classificacao: 'compulsiva' } })) === 'registro_resultado', 'resultado automatico recusado pelo servidor');
const xss = '<img src=x onerror=alert(1)>';
const rx = ins(UA, PA, 'gatilhos_respostas', { gatilho: xss });
ok(!rx.error && rx.data[0].respostas.gatilho === xss, 'texto com marcacao guardado literalmente (escapar e trabalho da tela)');
// concluir -> imutavel
for (const id of IDS) upd(UA, ids[id], { status: 'concluida', concluida_em: new Date().toISOString() });
const imut = IDS.map(id => hint(upd(UA, ids[id], { respostas: {} }))).concat([hint(upd(UA, ids.mapa_rotina, { status: 'rascunho' })), hint(upd(UA, ids.mapa_rotina, { resultado: { x: 1 } }))]);
ok(imut.every(h => h === 'registro_concluido'), 'concluido: respostas, status e resultado nao mudam (' + [...new Set(imut)].join(',') + ')');
ok(hint(upd(UA, ids.gatilhos_respostas, { leitura: 'nota da profissional', prioridade: 'alta', proximo_passo: 'retomar', status: 'revisada' })) === 'ACEITO'
  && srv.linhas('tool_applications').find(x => x.id === ids.gatilhos_respostas).status === 'revisada', 'leitura profissional continua: vira revisada');
// nova a partir desta
const copia = ins(UA, PA, 'mapa_rotina', Object.assign({}, VAL.mapa_rotina, { origem_id: ids.mapa_rotina }));
ok(!copia.error && copia.data[0].id !== ids.mapa_rotina, '"nova a partir desta": copia aceita com origem_id; e um registro NOVO');
ok(['registro_formato', 'registro_formato', 'registro_formato'].join() === [hint(ins(UA, PA2, 'mapa_rotina', { origem_id: ids.mapa_rotina })), hint(ins(UA, PA, 'gatilhos_respostas', { origem_id: ids.mapa_rotina })), hint(ins(UA, PA, 'mapa_rotina', { origem_id: '00000000-0000-4000-8000-000000000000' }))].join(),
  'origem de outro paciente, de outra ferramenta ou inexistente recusada');
ok(JSON.stringify(srv.linhas('tool_applications').find(x => x.id === ids.mapa_rotina).respostas) === JSON.stringify(Object.assign({}, VAL.mapa_rotina, { observacoes: 'editado no rascunho' })), 'a original ficou como estava (historico preservado)');
// outra conta
const vistoB = q(UB, 'tool_applications', 'select', {}).data || [];
ok(!vistoB.some(x => x.patient_id === PA), 'outra nutricionista nao ve os registros');
const rB = upd(UB, ids.conexao_pertencimento, { leitura: 'invasao' });
ok((!rB.data || rB.data.length === 0) && srv.linhas('tool_applications').find(x => x.id === ids.conexao_pertencimento).leitura == null, 'outra nutricionista nao altera');
ok(hint(ins(UB, PA, 'mapa_rotina', {})) !== 'ACEITO' && hint(ins(UA, PB, 'mapa_rotina', {})) !== 'ACEITO', 'ninguem cria registro em paciente alheio');
// arquivado
q(UA, 'patients', 'update', { dados: { status: 'inativo' }, filtros: [{ op: 'eq', col: 'id', val: PA2 }] });
ok(/arquivado/.test(hint(ins(UA, PA2, 'conexao_pertencimento', {}))), 'paciente arquivado: registro novo recusado');
// outras ferramentas: comportamento antigo
const oq = ins(UA, PA, 'oq3', { qualquer: 'coisa' }, { status: 'concluida', resultado: { x: 1 } });
ok(!oq.error && hint(upd(UA, oq.data[0].id, { respostas: { outra: 'chave' } })) === 'ACEITO', 'OQ³ (e as outras 5) sem regra nova: concluida continua editavel, com resultado');

titulo('5. VISUALIZACAO ESCAPADA, SEM CLASSIFICAR');
const RV = window.RegistroVisual;
const sujo = '"><script>alert(1)</script><img src=x onerror=alert(2)>';
const telas = {
  mapa_rotina: RV.desenhar(cat('mapa_rotina'), { acorda: sujo, eventos: [{ inicio: '07:00', categoria: 'fome', titulo: sujo, descricao: sujo, percepcao: 'alta', dias: ['seg', sujo], observacao: sujo }] }),
  gatilhos_respostas: RV.desenhar(cat('gatilhos_respostas'), Object.fromEntries(Object.keys(FORMATO.gatilhos_respostas.campos).map(k => [k, sujo]))),
  conexao_pertencimento: RV.desenhar(cat('conexao_pertencimento'), { vinculos: [{ rotulo: sujo, natureza: sujo, tipo: sujo, relacao: sujo, papel: sujo, proximidade: sujo, momento: sujo, contexto: sujo, observacao: sujo }] })
};
const resumos = IDS.map(id => RV.resumo(cat(id), Object.fromEntries(Object.keys(FORMATO[id].campos).map(k => [k, sujo]))));
const tudo = Object.values(telas).join('') + resumos.join('');
// previa e TEXTO puro (sem HTML): quem desenha o historico escapa (formulario.js: escapar(RegistroVisual.previa(...)))
ok(/escapar\(window\.RegistroVisual\.previa\(/.test(ler('formulario.js')) && RV.previa(cat('gatilhos_respostas'), { respostas: { gatilho: sujo } }).indexOf('<') >= 0,
  'previa do historico e texto puro e o formulario a escapa ao desenhar');
ok(!/<script|<img|onerror=alert\(\d\)"?>|"><script/.test(tudo.replace(/&lt;script|&lt;img/g, '')) && /&lt;script&gt;/.test(telas.mapa_rotina) && /&lt;script&gt;/.test(telas.conexao_pertencimento),
  'HTML e SVG das 3 visualizacoes e o resumo: todo texto escapado');
ok(!/class="[^"]*&lt;|class="[^"]*<|style="/.test(tudo), 'nenhum valor do registro vira classe ou estilo');
const limpo = (t) => t.replace(/<[^>]+>/g, ' ');
const normais = {
  mapa_rotina: RV.desenhar(cat('mapa_rotina'), VAL.mapa_rotina),
  gatilhos_respostas: RV.desenhar(cat('gatilhos_respostas'), VAL.gatilhos_respostas),
  conexao_pertencimento: RV.desenhar(cat('conexao_pertencimento'), VAL.conexao_pertencimento)
};
const visivel = limpo(Object.values(normais).join(' ')).replace(/não é classificação da rede nem das relações|não é sugestão do sistema/gi, '');
ok(!/escore|score|pontua|faixa|n[ií]vel|diagn[oó]stic|classifica|t[oó]xic|saud[aá]vel|forte|fraca|isolamento|depend[eê]ncia|boa conex|m[aá] conex|recomend|sugerimos|voc[eê] deve/i.test(visivel),
  'o que e desenhado nao classifica, nao pontua e nao recomenda (so as ressalvas explicitas)');
ok(/Percepção do paciente: baixa/.test(limpo(normais.mapa_rotina)) && /Intensidade percebida pelo paciente: 7 de 10/.test(limpo(normais.gatilhos_respostas)), 'intensidade aparece como percepcao do paciente, nunca como escore');
ok(/Gatilho[\s\S]*Pensamento[\s\S]*Emoção[\s\S]*Resposta[\s\S]*Consequência/.test(limpo(normais.gatilhos_respostas)), 'fluxo na ordem Gatilho → Pensamento → Emoção → Resposta → Consequência');
ok(/não é sugestão do sistema/.test(normais.gatilhos_respostas), 'alternativa marcada como registro de quem atende/paciente');
ok(/Acorda[\s\S]*café[\s\S]*reunião[\s\S]*Dorme/.test(limpo(normais.mapa_rotina)) && /data-rv-painel="semana"/.test(normais.mapa_rotina) && /Sem dia definido/.test(normais.mapa_rotina), 'linha do dia em ordem (acorda → eventos → dorme) e visao semanal com "sem dia definido"');
ok(/<svg[^>]+role="img"[^>]+aria-label=/.test(normais.conexao_pertencimento) && /<table class="rv-tabela">/.test(normais.conexao_pertencimento) && /Paciente/.test(normais.conexao_pertencimento),
  'rede com paciente no centro, SVG com aria-label e tabela com os mesmos dados (alternativa acessivel)');
ok(/como foram registrados/.test(normais.conexao_pertencimento), 'legenda: papel e proximidade "como foram registrados"');
ok(RV.previa(cat('gatilhos_respostas'), { respostas: VAL.gatilhos_respostas }) === '01/10/2026 · discussão' && RV.previa(cat('mapa_rotina'), { respostas: VAL.mapa_rotina }) === '2 eventos' && RV.previa(cat('conexao_pertencimento'), { respostas: VAL.conexao_pertencimento }) === '2 vínculos',
  'historico: previa por episodio (data · gatilho), eventos e vinculos');

titulo('6. NAO INTERFERENCIA (ESTATICA)');
const motores = ['holoscan-oficial.js', 'metodologia-motor.js', 'holoscan.js', 'leitura-integrada-motor.js', 'laboratorio-motor.js', 'questionario.js'];
ok(motores.every(f => !/Aplicacoes|tool_applications|mapa_rotina|gatilhos_respostas|conexao_pertencimento|RegistroVisual|REGISTRO_OPCOES/.test(ler(f))), 'motores (HOLOSCAN oficial e legado, LI, laboratorio, questionario) nao leem ferramentas: ' + motores.join(', '));
ok(!/mapa_rotina|gatilhos_respostas|conexao_pertencimento/.test(ler('holos-ai.js')), 'HOLOS AI nao recebe os registros (nenhuma interpretacao automatica)');
ok(/cat && cat\.registro\) return;/.test(ler('panorama.js')), 'Panorama.contexto ignora registros (nem a intensidade percebida entra em contexto de calculo)');
const sql = ler('supabase/migrations/20261005110000_ferramentas_registro_v1.sql').replace(/--.*$/gm, '');
ok(!/holoscan_|methodology_|integrated_reading|lab_/.test(sql), 'a migration nao toca HOLOSCAN, pacotes, Leitura Integrada nem laboratorio');
ok(!/create policy|drop policy|security definer/i.test(sql), 'a migration nao cria/derruba policy e nao usa SECURITY DEFINER');

console.log(falhou ? '\n  RESULTADO: FALHOU' : '\n  RESULTADO: ok');
process.exit(falhou ? 1 : 0);
