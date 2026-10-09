/**
 * SINTESE HOLOS + FECHAMENTO DAS FERRAMENTAS (decisoes aprovadas 10/10, DECISOES-V1 item 180) — unidade, sem navegador:
 *   SINTESE   sistema menor; dois prioritarios; empate; Triade com menor; empate de 2 e de 3; sistema nao avaliavel;
 *             cobertura insuficiente; ferramenta sugerida; aplicada; sem ferramenta; sem texto da nutricionista;
 *             resultado antigo (template 1) sem Proximos Passos nao busca nada ao vivo; nenhum diagnostico, gravidade,
 *             causalidade ou conduta gerada
 *   FERRAM.   OQ3, Momentum (decisao profissional), Rotina, PQQ, Crencas, Gatilhos, Roda, Carta, Conexao: so organizam
 *   F -> F    so OQ3 + PQQ -> Mapa do Proposito (opcional)
 *   S -> F    as 30 relacoes do catalogo iguais a lista aprovada; 1 principal + ate 2 complementares; nada obrigatorio
 */
import './guarda-falhas.mjs';
import { REGRAS } from './proximos-passos-catalogo-v1.mjs';
import '../ferramentas-fechamento.js';
import '../resultado-sintese.js';
import '../proximos-passos.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const RS = globalThis.ResultadoSintese, FF = globalThis.FerramentasFechamento, PP = globalThis.ProximosPassos;
const MOD = { oq3: 'corpo', linha_momentum: 'corpo', mapa_rotina_v1: 'corpo', pqq: 'mente', mapa_crencas: 'mente', gatilhos_respostas_v1: 'mente', roda_vida: 'espirito', carta_futuro: 'espirito', conexao_pertencimento_v1: 'espirito' };
const NOME = (id) => FF.NOMES[id] || id;
const SIS = (over) => [
  { sistema: 'fungico', nome: 'Sistema Fúngico', nota: 5.5, faixa: 'intermediaria', avaliavel: true },
  { sistema: 'acido_inflamatorio', nome: 'Sistema Ácido-Inflamatório', nota: 6.2, faixa: 'intermediaria', avaliavel: true },
  { sistema: 'metabolico', nome: 'Sistema Metabólico', nota: 3.1, faixa: 'atencao', avaliavel: true },
  { sistema: 'detox_linfatico', nome: 'Sistema Detox e Linfático', nota: 7, faixa: 'equilibrio', avaliavel: true },
  { sistema: 'mental_emocional_espiritual', nome: 'Sistema Mental-Emocional-Espiritual', nota: 4.0, faixa: 'atencao', avaliavel: true }].map(s => Object.assign(s, (over || {})[s.sistema] || {}));
const PPREG = (sel) => ({ registrado: true, catalogo: { code: 'HOLOS-RECOMENDACOES-V1', version: 1, content_hash: 'x' }, selection: sel });
const SEL = [
  { rule_id: 'REC-MET-01', system_id: 'metabolico', rank: 1, tool_id: 'mapa_rotina_v1', papel: 'principal', slot: 1, professional_reason: 'Ajuda a localizar.', next_action: 'Aplique.' },
  { rule_id: 'REC-MEE-01', system_id: 'mental_emocional_espiritual', rank: 1, tool_id: 'pqq', papel: 'complementar', slot: 2 },
  { rule_id: 'REC-MET-02', system_id: 'metabolico', rank: 2, tool_id: 'gatilhos_respostas_v1', papel: 'complementar', slot: 3 }];
const snapBase = (extra) => Object.assign({
  template_version: 2,
  holoscan: { quando: '2026-10-09', indice: 52.4, indice_maximo: 100, triada: { fisico: 6.1, mental: 4.2, espiritual: 7 }, triada_com_dado: { fisico: true, mental: true, espiritual: true }, sistemas: SIS() },
  ferramentas: [], proximos_passos: PPREG(SEL), visibilidade: { proximos_passos: false }, observacoes: {}
}, extra || {});
const fat = (snap) => RS.fatos(snap, (id) => MOD[id], NOME);
const textos = (snap) => RS.frases(fat(snap)).map(x => x.texto).join(' \n ');
const PROIBIDO = /diagn[oó]st|grav(e|idade)|\bleve\b|moderad|risco|doen[cç]a|\bcausa|progn[oó]st|severidade|desequil[ií]brio|prescri|dieta|trauma|padr[aã]o emocional|limitante|t[oó]xic|patol/i;

/* ===================== SINTESE ===================== */
let f = fat(snapBase());
ok(f.investigar[0].sistema === 'metabolico' && f.investigar[1].sistema === 'mental_emocional_espiritual', 'sistema menor = 1ª área para investigar (Metabólico 3,1); 2ª = Mental-Emocional-Espiritual (4,0)');
let t = textos(snapBase());
ok(/Sistema Metabólico e Sistema Mental-Emocional-Espiritual aparecem como as primeiras áreas para aprofundar/.test(t) && /1ª área para investigar: Sistema Metabólico, nota 3,1/.test(t) && /2ª área para investigar: Sistema Mental-Emocional-Espiritual, nota 4/.test(t),
  'dois sistemas prioritários na Síntese com "1ª/2ª área para investigar" (linguagem aprovada)');
ok(/Ordem de investigação: 1ª Sistema Metabólico \(3,1\) · 2ª Sistema Mental-Emocional-Espiritual \(4\) · 3ª Sistema Fúngico/.test(t), 'ordem de investigação completa');
ok(!/[Pp]rioridade cl[ií]nica|Gravidade 1|[Mm]ais grave/.test(t), 'prioridade = de investigação; nunca "prioridade clínica", "gravidade" ou "mais grave"');
const emp = snapBase({ holoscan: Object.assign({}, snapBase().holoscan, { sistemas: SIS({ fungico: { nota: 4.0 } }) }) });
f = fat(emp);
ok(f.investigar[1].sistema === 'fungico' && f.empate_investigar.join() === 'Sistema Fúngico,Sistema Mental-Emocional-Espiritual' && /Empate na nota 4 entre Sistema Fúngico e Sistema Mental-Emocional-Espiritual: a ordem segue a ordem oficial do motor/.test(textos(emp)),
  'empate entre sistemas: a ordem oficial do motor desempata e o empate é dito');
ok(/Na Tríade, Mente apresentou a menor nota/.test(t), 'Tríade com menor dimensão (Mente)');
const tri2 = snapBase({ holoscan: Object.assign({}, snapBase().holoscan, { triada: { fisico: 4, mental: 4, espiritual: 6 } }) });
const tri3 = snapBase({ holoscan: Object.assign({}, snapBase().holoscan, { triada: { fisico: 5, mental: 5, espiritual: 5 } }) });
ok(fat(tri2).triade_menor === null && /Corpo e Mente empataram na menor nota: não existe dimensão única menor/.test(textos(tri2)), 'empate entre duas dimensões: sem dimensão única menor');
ok(/as três dimensões têm a mesma nota: sem predominância/.test(textos(tri3)), 'empate entre três: sem predominância');
ok(!/pequena|grande|diferença/i.test(textos(snapBase()) + textos(tri2)), 'nenhum corte de "diferença pequena/grande" na Tríade');
const naoAval = snapBase({ holoscan: Object.assign({}, snapBase().holoscan, { sistemas: SIS({ detox_linfatico: { nota: null, avaliavel: false } }) }) });
ok(fat(naoAval).sem_nota.join() === 'Sistema Detox e Linfático' && /Sem nota \(respostas abaixo do mínimo\): Sistema Detox e Linfático/.test(textos(naoAval)), 'sistema não avaliável: fica fora da ordem e é dito');
const cob = snapBase({ holoscan: Object.assign({}, snapBase().holoscan, { indice: null }) });
ok(/O Índice HOLOS não foi calculado nesta aplicação \(cobertura insuficiente\)/.test(textos(cob)), 'cobertura insuficiente: dito, sem inventar Índice');
const nenhum = snapBase({ holoscan: Object.assign({}, snapBase().holoscan, { sistemas: SIS({ fungico: { nota: null, avaliavel: false }, acido_inflamatorio: { nota: null, avaliavel: false }, metabolico: { nota: null, avaliavel: false }, detox_linfatico: { nota: null, avaliavel: false }, mental_emocional_espiritual: { nota: null, avaliavel: false } }) }) });
ok(/nenhum sistema teve nota: o HOLOSCAN não definiu área para investigar/.test(textos(nenhum)), 'nenhum sistema com nota: nenhuma área inventada');
ok(/Pelo catálogo vigente \(HOLOS-RECOMENDACOES-V1 v1\), as ferramentas indicadas para aprofundamento são Mapa da Rotina \(principal\), PQQ — Escada dos Porquês e Gatilhos & Respostas/.test(t),
  'ferramenta sugerida: as do catálogo, congeladas no snapshot');
const comAplic = snapBase({ ferramentas: [{ ferramenta_id: 'mapa_rotina_v1', status: 'concluida', respostas: { acorda: '06:00', eventos: [] }, mostrar_paciente: false }] });
f = fat(comAplic);
ok(f.disponiveis.map(x => x.tool_id).join() === 'pqq,gatilhos_respostas_v1' && /Até o momento, neste resultado, foram aplicadas: Mapa da Rotina/.test(textos(comAplic))
  && /Ainda disponíveis para aprofundar \(sugeridas e não aplicadas neste resultado\): PQQ — Escada dos Porquês e Gatilhos & Respostas/.test(textos(comAplic)),
  'ferramenta aplicada: sai de "disponíveis"; aprofundamento ainda disponível é dito');
ok(/Próximo passo metodológico sustentado pelo catálogo: Mapa da Rotina\. Nenhuma ferramenta é obrigatória/.test(t), 'próximo passo sustentado = principal do catálogo; nenhuma ferramenta obrigatória');
ok(/Nenhuma ferramenta foi incluída neste resultado/.test(t), 'sem ferramenta: dito');
ok(fat(snapBase()).observacoes_nutri === 0 && RS.frases(fat(snapBase())).length >= 6, 'sem texto da nutricionista: a Síntese existe inteira (nada obrigatório)');
const antigo = snapBase({ template_version: undefined, proximos_passos: undefined, visibilidade: undefined });
ok(fat(antigo).proximos_passos === 'fora_do_snapshot' && /salvo antes de os Próximos Passos HOLOS fazerem parte do Resultado; eles não são buscados ao vivo/.test(textos(antigo)),
  'resultado antigo (template 1): mostra só o que tem; Próximos Passos não são buscados ao vivo');
const naoReg = snapBase({ proximos_passos: { registrado: false } });
ok(/não estavam registrados para esta aplicação quando o resultado foi salvo; o sistema não os calcula depois/.test(textos(naoReg)), 'Próximos Passos não registrados: dito, nada calculado');
const tudo = snapBase({ ferramentas: [
  { ferramenta_id: 'oq3', status: 'concluida', respostas: { quer: 'ter energia', precisa: 'dormir', consegue: 'caminhar' } },
  { ferramenta_id: 'pqq', status: 'concluida', respostas: { objetivo: 'emagrecer', r1: 'saúde', verdadeiro: 'cuidar de mim' } },
  { ferramenta_id: 'linha_momentum', status: 'concluida', respostas: { estado_confirmado: 'reorganizar', energia: 3 } },
  { ferramenta_id: 'gatilhos_respostas_v1', status: 'concluida', respostas: { gatilho: 'discussão', pensamento: 'não aguento', resposta: 'come doce' } },
  { ferramenta_id: 'carta_futuro', status: 'concluida', respostas: { carta: 'Querida eu do futuro, CONTEUDO_INTIMO' } },
  { ferramenta_id: 'conexao_pertencimento_v1', status: 'concluida', respostas: { vinculos: [{ rotulo: 'NOME_TERCEIRO' }] } }] });
const tt = textos(tudo), htmlProf = RS.html(tudo, 'profissional', { moduloDe: (id) => MOD[id], nomeFerramenta: NOME }), htmlPac = RS.html(tudo, 'paciente', { moduloDe: (id) => MOD[id], nomeFerramenta: NOME });
ok(!PROIBIDO.test(tt) && !PROIBIDO.test(RS.frasesPaciente(fat(tudo)).join(' ')), 'nenhum diagnóstico, gravidade, risco, causa, prognóstico, dieta ou interpretação nas frases da Síntese');
ok(!PROIBIDO.test(htmlProf.replace(/Não significa gravidade, risco ou prioridade clínica\./, '').replace(/<p class="rh-sintese-limite">[\s\S]*?<\/p>/, '').replace(/<details class="rh-pendencias">[\s\S]*?<\/details>/, '').replace(/<[^>]+>/g, ' ')),
  'nenhuma causalidade corpo ↔ emoção nem conduta gerada no HTML (fora o limite explícito e as pendências)');
ok(htmlProf.includes(RS.LIMITE.slice(0, 60)) && /PENDÊNCIA METODOLÓGICA — AGUARDANDO RODRIGO\/DANIEL/.test(htmlProf) && RS.PENDENCIAS.map(p => p.id).join() === 'PM-06,PM-07,PM-08,PM-09,PM-10,PM-11,PM-12,PM-13,PM-14',
  'limite explícito ("sem regra homologada para gravidade, diagnóstico ou causa") + pendências que continuam abertas (PM-06…PM-14)');
ok(/Carta ao Futuro Eu realizada/.test(tt) && !/CONTEUDO_INTIMO/.test(tt + htmlProf) && !/NOME_TERCEIRO/.test(tt + htmlProf), 'Carta: só "realizada"; Conexão: só contagem (nenhum conteúdo íntimo nem nome de terceiro na Síntese)');
ok(/Linha do Momentum: estado escolhido pela nutricionista — Reorganizar\. Ele informa a Conduta; não a determina/.test(tt), 'Momentum: estado escolhido pela nutricionista; informa, não determina a Conduta');
ok(!/mapeamento conclu[ií]do|\d+ ?%|pronto para/i.test(tt.replace(RS.LIMITE, '')) && !/reaplica|30 dias|60 dias|90 dias/i.test(tt), 'sem "mapeamento concluído", percentual, selo ou intervalo de reaplicação');

/* visao da paciente */
const pacSnap = snapBase({ ferramentas: [{ ferramenta_id: 'oq3', status: 'concluida', respostas: { quer: 'x' }, mostrar_paciente: true }, { ferramenta_id: 'gatilhos_respostas_v1', status: 'concluida', respostas: { gatilho: 'y' }, mostrar_paciente: false }] });
const pacOff = RS.html(pacSnap, 'paciente', { moduloDe: (id) => MOD[id], nomeFerramenta: NOME });
ok(/as áreas que aparecem primeiro para aprofundar com a sua nutricionista são Sistema Metabólico e Sistema Mental-Emocional-Espiritual/.test(pacOff) && /Mente foi a dimensão com a menor nota/.test(pacOff)
  && /compartilhou com você: OQ³/.test(pacOff) && !/Gatilhos/.test(pacOff), 'paciente: áreas para aprofundar, Tríade simples e só as ferramentas autorizadas');
ok(!/Próximos passos de aprofundamento|Mapa da Rotina/.test(pacOff) && RS.htmlProximosPassosPaciente(pacSnap, NOME) === '', 'Próximos Passos OFF (padrão): não aparecem para a paciente');
const pacOn = snapBase({ visibilidade: { proximos_passos: true } });
ok(RS.frasesPaciente(RS.fatos(pacOn, null, NOME)).some(t => t === 'Próximos passos de aprofundamento: Mapa da Rotina, PQQ — Escada dos Porquês e Gatilhos & Respostas. A escolha e o momento são combinados com a sua nutricionista.') && /Próximos passos de aprofundamento: Mapa da Rotina/.test(RS.html(pacOn, 'paciente', { nomeFerramenta: NOME })) && /Ferramentas do método que podem ajudar/.test(RS.htmlProximosPassosPaciente(pacOn, NOME))
  && !/Ajuda a localizar|REC-|rule_id|Aplique\./.test(RS.htmlProximosPassosPaciente(pacOn, NOME)), 'Próximos Passos ON: aparecem para a paciente em linguagem simples (sem justificativa técnica nem códigos)');
ok(!/PENDÊNCIA|PM-0|REC-|hash|package|peso|Regra oficial|Fato|Decisão da nutricionista/.test(RS.html(pacOn, 'paciente', { nomeFerramenta: NOME })), 'paciente: sem pendência, código, hash, regra interna ou rótulo técnico');
ok(RS.html(snapBase({ holoscan: Object.assign({}, snapBase().holoscan, { sistemas: SIS({ metabolico: { nome: 'Sistema <img src=x onerror=alert(1)>' } }) }) }), 'profissional', {}).includes('Sistema &lt;img src=x'), 'XSS: nomes vindos do snapshot escapados');

/* ===================== FERRAMENTAS ===================== */
const fe = (id, r) => FF.de({ ferramenta_id: id, respostas: r });
const txtF = (x) => x.itens.map(i => i.rotulo + ': ' + i.valor).join(' | ') + ' | ' + x.linha;
const CLASSIF = /\b(baixo|m[eé]dio|alto|score|pontua[cç][aã]o|classifica[cç][aã]o:|categoria|boa|ruim|t[oó]xic|saud[aá]vel|fraca|forte)\b/i;
let x = fe('oq3', { quer: 'ter energia', precisa: 'dormir melhor', consegue: 'caminhar 10 min', alavancas: 'apoio da irmã' });
ok(x.itens.map(i => i.rotulo).join() === 'O que quer,O que precisa de atenção,O que consegue sustentar agora,Alavancas' && x.linha === 'Quero, Preciso e Consigo registrados.' && !CLASSIF.test(txtF(x)),
  'OQ³: fechamento Quero/Preciso/Consigo/Alavancas, sem nível nem classificação');
x = fe('linha_momentum', { estado_confirmado: 'construir', justificativa_estado: 'sono melhorou', energia: 8, carga: 2 });
const x2 = fe('linha_momentum', { energia: 10, carga: 0, controle: 10, suporte: 10, espaco: 10, estabilidade: 10 });
ok(x.estado === 'Construir' && /Justificativa/.test(txtF(x)) && x.itens.find(i => /Justificativa/.test(i.rotulo)).so_profissional && /Energia disponível 8 · Carga de vida 2/.test(txtF(x))
  && x2.estado === null && /não registrado/.test(txtF(x2)) && !/Expandir|Construir/.test(txtF(x2)),
  'Momentum: estado só quando escolhido pela profissional (nunca calculado das dimensões, mesmo todas 10); justificativa só na visão profissional');
x = fe('mapa_rotina_v1', { acorda: '06:00', dorme: '23:00', trabalho: 'escritório', eventos: [{ inicio: '07:00', titulo: 'café' }], espacos: 'pausa da tarde' });
ok(/Sono: acorda 06:00 · dorme 23:00/.test(txtF(x)) && /Oportunidades \/ espaços para a mudança: pausa da tarde/.test(txtF(x)) && !CLASSIF.test(txtF(x)) && !/OQ³|PQQ|Momentum|Gatilhos|Crenças/.test(txtF(x)),
  'Mapa da Rotina: descritivo (sono, trabalho, o dia, espaços), sem score e sem próxima ferramenta');
x = fe('pqq', { objetivo: 'emagrecer', r1: 'saúde', r2: 'filhos', r3: 'presença', r4: 'cuidar', r5: 'amor', verdadeiro: 'estar presente' });
ok(x.itens.filter(i => /^Nível/.test(i.rotulo)).length === 5 && /Síntese construída com a paciente: estar presente/.test(txtF(x)) && !CLASSIF.test(txtF(x)) && !/padr[aã]o oculto/i.test(txtF(x)), 'PQQ: cinco níveis + síntese construída com a paciente, sem padrão oculto');
x = fe('mapa_crencas', { crencas: 'comer à noite engorda', origem: 'mãe', mais_atrapalha: 'fome à noite', alternativa: 'jantar leve' });
ok(/Crença\(s\) relatada\(s\): comer à noite engorda/.test(txtF(x)) && !/limitante|categoria|tipo de cren|predominante/i.test(txtF(x)), 'Crenças: descritivo, sem taxonomia nem "limitante"');
x = fe('gatilhos_respostas_v1', { contexto: 'trabalho', gatilho: 'cobrança', pensamento: 'não dou conta', emocao: 'ansiedade', intensidade: 8, resposta: 'come doce', consequencia_imediata: 'alívio', alternativa: 'respirar', observacao_nutri: 'NOTA_PRIVADA' });
ok(/Gatilho: cobrança/.test(txtF(x)) && /Emoção relatada: ansiedade \(intensidade 8\)/.test(txtF(x)) && !/\bcausa|trauma|padr[aã]o|diagn/i.test(txtF(x))
  && x.itens.find(i => i.valor === 'NOTA_PRIVADA').so_profissional && !RS.htmlFechamento(Object.assign({}, x, { nome: 'G' }), true).includes('NOTA_PRIVADA'),
  'Gatilhos: a cadeia registrada, sem causa/trauma/padrão; observação da nutricionista nunca na visão da paciente');
x = fe('roda_vida', { saude: 4, relacoes: 9, trabalho: 6, financas: 9, espiritualidade: 5, lazer: 3, desenvolvimento: 7, proposito: 8, puxa: 'lazer' });
ok(/Áreas percebidas como mais cuidadas: Relações, Finanças/.test(txtF(x)) && /Áreas percebidas como menos cuidadas: Lazer/.test(txtF(x)) && /\(sem média\)/.test(x.linha) && !/m[eé]dia[: ]+\d|6,4|6\.4/.test(txtF(x)), 'Roda: percepção por área, mais/menos cuidadas, sem média');
x = fe('carta_futuro', { carta: 'CONTEUDO_INTIMO', para_quando: '2027-01-01' });
ok(!txtF(x).includes('CONTEUDO_INTIMO') && /realizada/.test(txtF(x)) && x.conteudo_privado && RS.htmlFechamento(Object.assign({}, x, { nome: 'Carta ao Futuro Eu' }), true) === '<dl class="rh-fech"><div><dt>Carta ao Futuro Eu</dt><dd>realizada</dd></div></dl>',
  'Carta: só "realizada" (sem interpretar nem expor o texto)');
x = fe('conexao_pertencimento_v1', { contar: 'irmã', vinculos: [{ rotulo: 'NOME_TERCEIRO', proximidade: 'perto' }, { rotulo: 'Outro' }], espiritualidade: 'igreja' });
ok(/Vínculos registrados: 2 vínculos/.test(txtF(x)) && !/NOME_TERCEIRO/.test(txtF(x)) && !CLASSIF.test(txtF(x)) && !/escore|score/i.test(txtF(x)), 'Conexão: mapa contextual, vínculos só contados (minimiza terceiros), sem score espiritual nem classificação');

/* ===================== FERRAMENTA -> FERRAMENTA ===================== */
const oq = { ferramenta_id: 'oq3', status: 'concluida', respostas: { quer: 'a' } }, pq = { ferramenta_id: 'pqq', status: 'concluida', respostas: { verdadeiro: 'b' } };
ok(FF.propositoDisponivel([oq, pq]) && !FF.propositoDisponivel([oq]) && !FF.propositoDisponivel([oq, { ferramenta_id: 'pqq', status: 'concluida', respostas: {} }])
  && !FF.propositoDisponivel([{ ferramenta_id: 'oq3', status: 'rascunho', respostas: { quer: 'a' } }, pq]) && FF.proposito([oq, pq]).itens.length === 2,
  'OQ³ + PQQ (válidos, com conteúdo) → Mapa do Propósito disponível; sem um deles ou vazio, não');
ok(FF.RELACOES_AUTOMATICAS.length === 1 && FF.RELACOES_AUTOMATICAS[0].para === 'mapa' && FF.RELACOES_AUTOMATICAS[0].obrigatoria === false, 'a única relação ferramenta → ferramenta automática é OQ³ + PQQ → Mapa do Propósito, opcional');
const semPP = snapBase({ proximos_passos: { registrado: false }, ferramentas: ['oq3', 'linha_momentum', 'mapa_crencas', 'gatilhos_respostas_v1', 'roda_vida', 'conexao_pertencimento_v1'].map(id => ({ ferramenta_id: id, status: 'concluida', respostas: { quer: 'a', crencas: 'b', gatilho: 'c', saude: 5, contar: 'd' } })) });
const tsp = textos(semPP);
ok(!/disponíveis para aprofundar|Mapa do Propósito|Mapa da Rotina|Carta ao Futuro Eu/.test(tsp.replace(/foram aplicadas:[^\n]*/, '').replace(/Resultados estruturados registrados:[^\n]*/, '')), 'nenhuma outra relação gerada (OQ³→Rotina, Crenças→Gatilhos, Momentum→Rotina, Roda→Carta, Conexão→Propósito...)');

/* ===================== SISTEMA -> FERRAMENTA ===================== */
const APROVADA = {
  fungico: ['mapa_rotina_v1', 'gatilhos_respostas_v1', 'mapa_crencas', 'linha_momentum', 'oq3', 'conexao_pertencimento_v1'],
  acido_inflamatorio: ['mapa_rotina_v1', 'linha_momentum', 'gatilhos_respostas_v1', 'roda_vida', 'conexao_pertencimento_v1', 'oq3'],
  metabolico: ['mapa_rotina_v1', 'gatilhos_respostas_v1', 'mapa_crencas', 'linha_momentum', 'oq3', 'carta_futuro'],
  detox_linfatico: ['mapa_rotina_v1', 'linha_momentum', 'oq3', 'roda_vida', 'conexao_pertencimento_v1', 'gatilhos_respostas_v1'],
  mental_emocional_espiritual: ['pqq', 'mapa_crencas', 'gatilhos_respostas_v1', 'mapa', 'carta_futuro', 'conexao_pertencimento_v1'] };
const vigente = {};
REGRAS.forEach(r => { (vigente[r.system_id] = vigente[r.system_id] || [])[r.rank - 1] = r.tool_id; });
ok(REGRAS.length === 30 && JSON.stringify(vigente) === JSON.stringify(APROVADA), 'as 30 relações Sistema → Ferramenta são idênticas à lista aprovada, na mesma ordem (rank)');
let todas = true, maxSel = 0;
for (const a of Object.keys(APROVADA)) for (const b of Object.keys(APROVADA)) {
  if (a === b) continue;
  const sel = PP.selecionar({ sistemas: [{ system_id: a, nota: 2 }, { system_id: b, nota: 3 }].map(s => Object.assign(s, { nome: s.system_id, dominantes: [] })), regras: REGRAS.map(r => Object.assign({ status: 'aprovado' }, r)), concluidas: [] }).selection;
  maxSel = Math.max(maxSel, sel.length);
  if (sel.filter(s => s.papel === 'principal').length !== 1 || sel.filter(s => s.papel === 'complementar').length > 2 || new Set(sel.map(s => s.tool_id)).size !== sel.length || sel.some(s => s.obrigatoria)) todas = false;
}
ok(todas && maxSel === 3, '1 principal + até 2 complementares, sem repetir, para os 20 pares de sistemas; nenhuma ferramenta marcada como obrigatória');

if (falhou) process.exitCode = 1;
