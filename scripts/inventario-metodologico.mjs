/**
 * INVENTARIO METODOLOGICO V1 — Etapa 4
 *
 * Le os bancos do motor (motor/bancos/*.csv, motor/politicas/escopo.csv) e o
 * que o app carrega em codigo (corpo-bancos.js: REC/SEL; questionario.js:
 * rotulos das escalas) e gera a VERDADE EXECUTAVEL do que existe hoje:
 *
 *   docs/v1/metodologia/inventario-metodologico-v1.json   (machine-readable)
 *   docs/v1/metodologia/inventario-metodologico-v1.csv    (revisao humana)
 *   docs/v1/metodologia/PENDENCIA-SNT-101-SNT-501.md
 *   docs/v1/metodologia/MATRIZ-HOMOLOGACAO-V1.md
 *   metodologia-inventario.js                             (window.MetodologiaInventario)
 *
 * REGRA: so o que foi encontrado. Nada e inferido, normalizado, corrigido ou
 * aprovado. Todo elemento sai com status_homologacao = "pendente". Orientacao
 * vem do valor escrito na coluna `sentido`; vazio e AUSENTE, nunca "direta".
 *
 *   node scripts/inventario-metodologico.mjs          # gera
 *   node scripts/inventario-metodologico.mjs --check  # falha se algo divergir
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { lerCSV } from '../motor/src/csv.ts';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ler = (rel) => readFileSync(RAIZ + '/' + rel, 'utf8');
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const csv = (rel) => lerCSV(ler(rel), rel);

const FONTES = {
  config: 'motor/bancos/config.csv', sistemas: 'motor/bancos/sistemas.csv', regras: 'motor/bancos/regras.csv',
  sintomas: 'motor/bancos/sintomas.csv', emocoes: 'motor/bancos/emocoes.csv', espiritual: 'motor/bancos/espiritual.csv',
  mensagens: 'motor/bancos/mensagens.csv', combinacoes: 'motor/bancos/combinacoes.csv', eixos: 'motor/bancos/eixos.csv',
  exames: 'motor/bancos/exames.csv', chacras: 'motor/bancos/chacras.csv', territorios: 'motor/bancos/territorios.csv',
  escopo: 'motor/politicas/escopo.csv', corpoBancos: 'corpo-bancos.js', questionario: 'questionario.js',
  antigo_sintomas: 'Holos AI/motor/bancos/sintomas.csv', antigo_emocoes: 'Holos AI/motor/bancos/emocoes.csv'
};
const B = {};
for (const k of ['config','sistemas','regras','sintomas','emocoes','espiritual','mensagens','combinacoes','eixos','exames','chacras','territorios','escopo']) B[k] = csv(FONTES[k]);
const antigoSintomas = csv(FONTES.antigo_sintomas), antigoEmocoes = csv(FONTES.antigo_emocoes);
const corpoBancos = ler(FONTES.corpoBancos);
const questionarioJs = ler(FONTES.questionario);

const PENDENTE = 'pendente_homologacao';
const config = Object.fromEntries(B.config.map((l) => [l.chave, l.valor]));
const escalaMax = Number(config.escala_max);

/* ---------- escalas: rotulos como a tela mostra (questionario.js) ---------- */
function rotulosDe(nome) {
  const m = new RegExp(nome + ':\\s*\\[([^\\]]+)\\]').exec(questionarioJs);
  return m ? m[1].split(',').map((s) => s.trim().replace(/^"|"$/g, '')) : null;
}
const escalas = ['frequencia', 'intensidade'].map((id) => ({
  id, minimo: 0, maximo: escalaMax, rotulos: rotulosDe(id), tipo: id,
  fonte: FONTES.questionario + ' (ESCALAS) + ' + FONTES.config + ' (escala_max)',
  status_recuperado: 'estrutura_recuperada', status_homologacao: PENDENTE,
  observacao: 'Arquitetura 0..3 recuperada. Rotulos e sentido de cada escala precisam ser confirmados na edicao oficial (Mestre §12).'
}));

/* ---------- sistemas ---------- */
const sistemas = B.sistemas.map((l, i) => ({
  codigo: l.id, nome: l.nome, cor: l.cor, padrao_emocional: l.padrao_emocional, impacto_espiritual: l.impacto_espiritual,
  definicao: l.definicao, fonte: FONTES.sistemas + ':' + (i + 2) + ' — ' + l.fonte_definicao,
  status_recuperado: l.status_definicao, status_homologacao: PENDENTE, validado_clinicamente: false
}));
const codigosSistema = new Set(sistemas.map((s) => s.codigo));

/* ---------- perguntas e associacoes: linha a linha, sem fundir ---------- */
const BLOCO = { sintomas: 'fisico', emocoes: 'mental_emocional', espiritual: 'espiritual' };
const ORIGEM = { sintomas: 'sintoma', emocoes: 'emocao', espiritual: 'espiritual' };
const porId = new Map();
const associacoes = [];
function orientacao(v) { return v === 'direto' ? 'direta' : v === 'invertido' ? 'invertida' : null; }
function registrar(tabela, l, n, extra) {
  const id = l.id;
  const enunciado = l.pergunta;
  const rot = tabela === 'sintomas' ? l.sintoma : tabela === 'emocoes' ? l.emocao : l.item;
  const linha = { arquivo: FONTES[tabela], linha: n, sistema: extra.sistema, peso: extra.peso, papel: extra.papel };
  if (!porId.has(id)) {
    porId.set(id, {
      stable_id: id, enunciado, bloco: BLOCO[tabela], origem: ORIGEM[tabela], rotulo: rot, sinonimos: l.sinonimos ? l.sinonimos.split(';').map((s) => s.trim()) : [],
      escala_id: l.escala || null, escala_ausente: !l.escala, rotulos_resposta: l.escala ? rotulosDe(l.escala) : null,
      orientacao_recuperada: orientacao(l.sentido), orientacao_bruta: l.sentido || '', orientacao_ausente: !l.sentido,
      orientacao_status: PENDENTE, contexto_temporal: null,
      dimensao: l.dimensao || null, leitura: l.leitura || null, padrao_emocional: l.padrao_emocional || null,
      aprofundar: l.aprofundar || null, chacra: l.chacra || null, territorio: l.territorio || null,
      fonte: l.fonte, status_recuperado: l.status, status_homologacao: PENDENTE, versao: 'recuperada',
      linhas: [], enunciados_divergentes: false
    });
  }
  const p = porId.get(id);
  if (p.enunciado !== enunciado) p.enunciados_divergentes = true;
  if (p.orientacao_bruta !== (l.sentido || '')) p.orientacao_divergente = true;
  p.linhas.push(linha);
  associacoes.push({
    question_id: id, destination_type: 'system', destination_id: extra.sistema, weight: extra.peso, role: extra.papel,
    source: FONTES[tabela] + ':' + n, status: PENDENTE, conflito: false, conflito_nota: null
  });
}
B.sintomas.forEach((l, i) => registrar('sintomas', l, i + 2, { sistema: l.sistema, peso: Number(l.peso), papel: 'primaria' }));
B.emocoes.forEach((l, i) => {
  registrar('emocoes', l, i + 2, { sistema: l.sistema_primario, peso: Number(l.peso), papel: 'primaria' });
  if (l.sistema_secundario) associacoes.push({
    question_id: l.id, destination_type: 'system', destination_id: l.sistema_secundario,
    weight: Number(l.peso) * Number(config.peso_secundario_fator), role: 'secundaria',
    source: FONTES.emocoes + ':' + (i + 2) + ' × config.csv peso_secundario_fator=' + config.peso_secundario_fator,
    status: PENDENTE, conflito: false, conflito_nota: 'peso secundario derivado de peso_secundario_fator ("decidido 27/08", sem homologacao)'
  });
});
B.espiritual.forEach((l, i) => registrar('espiritual', l, i + 2, { sistema: l.sistema, peso: Number(l.peso), papel: 'primaria' }));

// conflitos: mesmo id em mais de uma linha primaria (SNT-101, SNT-501)
for (const p of porId.values()) {
  const prim = p.linhas.filter((x) => x.papel === 'primaria');
  if (prim.length > 1) {
    p.conflito = 'mesmo ID em ' + prim.length + ' linhas primarias (' + prim.map((x) => x.sistema + ' peso ' + x.peso).join(' / ') + ')';
    for (const a of associacoes) if (a.question_id === p.stable_id && a.role === 'primaria') { a.conflito = true; a.conflito_nota = p.conflito; }
  }
}
// associacoes com a Triada: DERIVADAS da origem do bloco pelo motor atual (nao e decisao)
const EIXO = { sintoma: 'fisico', emocao: 'mental', espiritual: 'espiritual' };
for (const p of porId.values()) {
  const primeira = p.linhas.find((x) => x.papel === 'primaria');
  associacoes.push({
    question_id: p.stable_id, destination_type: 'triad', destination_id: EIXO[p.origem], weight: primeira ? primeira.peso : null, role: 'derivada',
    source: 'motor/src/motor.ts EIXO_POR_ORIGEM (origem do bloco; peso da primeira linha primaria)', status: PENDENTE, conflito: false,
    conflito_nota: 'vinculo com a Triada implementado por derivacao da origem, nao por tabela aprovada (Mestre §17)'
  });
}
const perguntas = [...porId.values()].sort((a, b) => ({ sintoma: 0, emocao: 1, espiritual: 2 }[a.origem] - { sintoma: 0, emocao: 1, espiritual: 2 }[b.origem]) || a.stable_id.localeCompare(b.stable_id))
  .map((p, i) => ({ ...p, posicao: i + 1 }));

const contagem = {
  ids_unicos: perguntas.length,
  fisico: perguntas.filter((p) => p.bloco === 'fisico').length,
  mental_emocional: perguntas.filter((p) => p.bloco === 'mental_emocional').length,
  espiritual: perguntas.filter((p) => p.bloco === 'espiritual').length,
  linhas_nos_bancos: B.sintomas.length + B.emocoes.length + B.espiritual.length,
  associacoes_sistema: associacoes.filter((a) => a.destination_type === 'system').length,
  associacoes_triada: associacoes.filter((a) => a.destination_type === 'triad').length,
  ids_com_conflito: perguntas.filter((p) => p.conflito).map((p) => p.stable_id),
  orientacao_ausente: perguntas.filter((p) => p.orientacao_ausente).map((p) => p.stable_id),
  invertidas_recuperadas: perguntas.filter((p) => p.orientacao_recuperada === 'invertida').map((p) => p.stable_id),
  escala_ausente: perguntas.filter((p) => p.escala_ausente).map((p) => p.stable_id)
};

/* ---------- pesos ---------- */
const pesos = {
  escala_admitida_no_motor: '1..3 (aviso do validador do motor; nao homologada)',
  distribuicao: Object.fromEntries([1, 2, 3].map((w) => [w, associacoes.filter((a) => a.destination_type === 'system' && a.weight === w).length])),
  peso_secundario_fator: Number(config.peso_secundario_fator),
  fonte: FONTES.sintomas + ', ' + FONTES.emocoes + ', ' + FONTES.espiritual + ', ' + FONTES.config,
  status_homologacao: PENDENTE, normalizados: false, defaults_oficiais: false
};

/* ---------- faixas (regras.csv + mensagens.csv) ---------- */
const faixas = [];
B.regras.forEach((r, i) => {
  const baixa = Number(r.faixa_baixa_ate), media = Number(r.faixa_media_ate);
  const msg = (f, reg) => (B.mensagens.find((m) => m.sistema === r.sistema && m.faixa === f && m.registro === reg) || {});
  const base = { destination_type: 'system', destination_id: r.sistema, dominio: 'nota 0..10 (10 = maior estabilidade)', fonte: FONTES.regras + ':' + (i + 2) + ' + ' + FONTES.mensagens, status_homologacao: PENDENTE };
  faixas.push({ ...base, rotulo: 'baixo', limite_inferior: 0, limite_superior: baixa, inferior_inclusivo: true, superior_inclusivo: true, regra_motor: 'nota <= ' + baixa, mensagem_nutri: msg('baixo', 'nutri').texto || null, mensagem_paciente: msg('baixo', 'paciente').texto || null });
  faixas.push({ ...base, rotulo: 'medio', limite_inferior: baixa, limite_superior: media, inferior_inclusivo: false, superior_inclusivo: true, regra_motor: baixa + ' < nota <= ' + media, mensagem_nutri: msg('medio', 'nutri').texto || null, mensagem_paciente: msg('medio', 'paciente').texto || null });
  faixas.push({ ...base, rotulo: 'alto', limite_inferior: media, limite_superior: 10, inferior_inclusivo: false, superior_inclusivo: true, regra_motor: 'nota > ' + media, mensagem_nutri: msg('alto', 'nutri').texto || null, mensagem_paciente: msg('alto', 'paciente').texto || null });
});
const faixasHistoricas = [{
  destination_type: 'index', destination_id: 'indice_holos', observacao: 'Quatro faixas do Indice (<40, <60, <80, >=80) com frases clinicas existiram em app.js e foram REMOVIDAS na Rodada 08 (sem fonte, sem status). Nao ha faixa de Indice recuperada.',
  status_homologacao: 'inexistente', fonte: 'app.js (comentario em aplicarPontuacao)'
}];

/* ---------- Indice, Triada, ausencia, cobertura, comparabilidade ---------- */
const indice = {
  pesos_atuais: Object.fromEntries(B.regras.map((r) => [r.sistema, Number(r.peso_indice)])),
  soma_pesos: B.regras.reduce((s, r) => s + Number(r.peso_indice), 0),
  formula_atual: 'nota_media = Σ nota_s × (peso_s / Σ pesos dos sistemas avaliaveis); indice = nota_media × (indice_maximo / 10)',
  indice_maximo: Number(config.indice_maximo), casas: Number(config.indice_casas),
  renormalizacao_atual: 'sistema sem nenhuma resposta sai do Indice e os pesos restantes sao renormalizados (motor.ts)',
  elegibilidade_atual: 'avaliavel = ao menos um sistema com ao menos uma resposta',
  sistema_ausente: 'excluido da media; nao vale 10 nem 0',
  fonte: FONTES.regras + ' (peso_indice) + motor/src/motor.ts + ' + FONTES.config,
  status_homologacao: PENDENTE, oficial: false,
  observacao: 'Mestre §16: pesos iguais nao sao decisao final; comportamento conservador nao publica Indice com sistema faltante; renormalizacao automatica nao e adotada.'
};
const triada = {
  eixos: ['fisico', 'mental', 'espiritual'],
  contribuicao_atual: 'por ID (primeira linha primaria), eixo derivado da origem do bloco (sintoma→fisico, emocao→mental, espiritual→espiritual)',
  pesos_atuais: 'peso da linha primaria do marcador', escala_atual: '0..10 = 10 − carga', elegibilidade_atual: 'eixo com ao menos uma resposta (triada_com_dado); sem dado = null na tela',
  agregacao_atual: 'Σ peso × carga / Σ peso × escala_max, so respondidos', fonte: 'motor/src/motor.ts',
  status_homologacao: PENDENTE, oficial: false,
  observacao: 'Mestre §17: escala e agregacao congeladas no pacote; ate la a Triada organiza relatos sem emitir nota.'
};
const ausencia = {
  politica_oficial_aprovada: false,
  denominador_atual: 'Σ peso × escala_max dos marcadores RESPONDIDOS (politica "por respondidos", nao homologada — Mestre §14.3)',
  cobertura_minima_atual: null, exclusoes_atuais: null, minimos_atuais: null, redistribuicao_atual: 'pesos do Indice renormalizados entre sistemas avaliaveis',
  estados_de_resposta_representados: ['respondido (0..3)', 'ausente'],
  estados_de_resposta_nao_representados: ['recusado', 'nao_aplicavel', 'invalido (recusado pelo motor com erro)'],
  fonte: 'motor/src/motor.ts, utils.js (HoloAusencia), metodologia.js (coberturaMinima() = null)',
  status_homologacao: PENDENTE,
  consequencia: 'dados e cobertura podem ser guardados e exibidos; nota oficial dependente continua bloqueada'
};
const cobertura = {
  definicao_permitida: 'COBERTURA DE PREENCHIMENTO = IDs validamente respondidos / ' + perguntas.length + ' IDs da edicao',
  denominador: perguntas.length, decide_avaliabilidade: false, corte_minimo: null, fonte: 'motor/src/motor.ts (cobertura), Mestre §18', status_homologacao: PENDENTE
};
const comparabilidade = {
  implementada: false, regra_recuperada: null,
  fonte: 'docs/v1/DECISOES-V1.md (31): sem delta metodologico; Evolucao mostra lado a lado', status_homologacao: PENDENTE
};

/* ---------- regras relacionadas (nao sao perguntas) ---------- */
const combinacoes = B.combinacoes.map((c, i) => ({ id: c.id, condicao: c.condicao, leitura: c.leitura, tipo: c.tipo, prioridade: Number(c.prioridade), fonte: FONTES.combinacoes + ':' + (i + 2) + ' — ' + c.fonte, status_recuperado: c.status, status_homologacao: PENDENTE, exibida_na_interface: false }));
const rec = [...corpoBancos.matchAll(/\{\s*id:\s*"(REC-\d+)",\s*version:\s*(\d+),\s*source:\s*"([^"]+)",[\s\S]*?recommended_tool_id:\s*"([^"]+)",[\s\S]*?status:\s*STATUS\.(\w+)/g)]
  .map((m) => ({ id: m[1], versao: Number(m[2]), origem: m[3], ferramenta: m[4], status_recuperado: m[5], status_homologacao: PENDENTE, executavel_hoje: m[5] !== 'nao_validado', apresentavel_hoje: false, fonte: FONTES.corpoBancos }));
const selMatch = /id:\s*"SEL-001"[\s\S]*?do_pior_sistema:\s*(\d+)[\s\S]*?do_segundo_sistema:\s*(\d+)[\s\S]*?maximo:\s*(\d+)/.exec(corpoBancos);
const selecao = selMatch ? { id: 'SEL-001', do_pior_sistema: Number(selMatch[1]), do_segundo_sistema: Number(selMatch[2]), do_momentum: null, maximo: Number(selMatch[3]), status_recuperado: 'rascunho', status_homologacao: PENDENTE, fonte: FONTES.corpoBancos } : null;
const escopo = B.escopo.map((e) => ({ id: e.id, motivo: e.motivo, gravidade: e.gravidade, fonte: FONTES.escopo, status_recuperado: 'sem coluna status', status_homologacao: PENDENTE }));
const eixosTerapeuticos = B.eixos.map((e, i) => ({ sistema: e.sistema, eixo: e.eixo, praticas: e.praticas, ordem: Number(e.ordem), fonte: FONTES.eixos + ':' + (i + 2) + ' — ' + e.fonte, status_recuperado: e.status, status_homologacao: PENDENTE }));
const exames = B.exames.map((e) => ({ id: e.id, exame: e.exame, sistema: e.sistema, unidade: e.unidade, ideal_min: Number(e.ideal_min), ideal_max: Number(e.ideal_max), fonte: FONTES.exames + ' — ' + e.fonte, status_recuperado: e.status, status_homologacao: PENDENTE, observacao: 'regra laboratorial relacionada ao HOLOSCAN; catalogo de 45 exames fica fora desta etapa' }));
const subferramentas = {
  mapa_frequencias: { ativo: config.mapa_frequencias_ativo, chacras: B.chacras.length, marcadores_mapeados: perguntas.filter((p) => p.chacra).length, status_homologacao: PENDENTE, fonte: FONTES.chacras + ', ' + FONTES.config },
  territorios: { ativo: config.territorios_ativo, declarados: B.territorios.length, marcadores_mapeados: perguntas.filter((p) => p.territorio).length, status_homologacao: PENDENTE, fonte: FONTES.territorios + ', ' + FONTES.config }
};

/* ---------- SNT-101 / SNT-501 ---------- */
function pendenciaSNT(id) {
  const p = porId.get(id);
  const linhas = [B.sintomas, B.emocoes, B.espiritual].flatMap((t, k) => t.map((l, i) => ({ l, arquivo: [FONTES.sintomas, FONTES.emocoes, FONTES.espiritual][k], n: i + 2 })))
    .filter((x) => x.l.id === id);
  const antigas = antigoSintomas.map((l, i) => ({ l, n: i + 2 })).filter((x) => x.l.id === id || x.l.pergunta === p.enunciado);
  return {
    id, enunciado: p.enunciado, bloco: p.bloco, rotulo: p.rotulo,
    linhas_atuais: linhas.map((x) => ({ arquivo: x.arquivo, linha: x.n, sistema: x.l.sistema, peso: Number(x.l.peso), escala: x.l.escala, sentido: x.l.sentido, chacra: x.l.chacra || null, territorio: x.l.territorio || null, fonte: x.l.fonte, status: x.l.status })),
    associacoes_atuais: associacoes.filter((a) => a.question_id === id),
    triada_atual: { eixo: EIXO[p.origem], peso_usado: p.linhas[0].peso, regra: 'primeira linha primaria do banco (motor.ts); a segunda linha nao entra na Triada' },
    cobertura_atual: 'conta UMA vez (por ID) na cobertura; pontua em DOIS sistemas com pesos diferentes',
    copia_anterior: antigas.map((x) => ({ arquivo: FONTES.antigo_sintomas, linha: x.n, id: x.l.id, sistema: x.l.sistema, peso: Number(x.l.peso), enunciado: x.l.pergunta })),
    diferencas: [],
    status_homologacao: PENDENTE,
    decisao_necessaria: 'Confirmar se o item contribui para um ou dois sistemas, com que peso em cada um, e qual eixo/peso vale na Triada. Nada e corrigido por inferencia.'
  };
}
const snt101 = pendenciaSNT('SNT-101'), snt501 = pendenciaSNT('SNT-501');
snt101.diferencas = ['pesos diferentes por sistema (fungico 2 × metabolico 3)', 'na copia anterior (Holos AI/motor) a linha do metabolico tinha o ID SNT-302 — o ID foi unificado depois, sem registro de decisao', 'territorio "comportamento" nas duas linhas; chacra "sacral" nas duas'];
snt501.diferencas = ['pesos diferentes por sistema (metabolico 2 × mental_emocional_espiritual 3)', 'na copia anterior (Holos AI/motor) a linha do metabolico era SNT-310 ("cansaco ao acordar mesmo dormindo", enunciado diferente) — unificada depois, sem registro de decisao', 'eixo da Triada derivado como fisico pela origem; o sistema mental_emocional_espiritual nao muda isso'];

/* ---------- conflitos e matriz ---------- */
const conflitos = [
  ...perguntas.filter((p) => p.conflito).map((p) => ({ tema: 'Perguntas/Associacoes', elemento: p.stable_id, descricao: p.conflito, fonte: p.linhas.map((x) => x.arquivo + ':' + x.linha).join(', ') })),
  { tema: 'Perguntas', elemento: 'EMO-506', descricao: 'existia na copia anterior (Holos AI/motor/bancos/emocoes.csv) e nao existe no banco ativo (19 emocoes); sem registro da retirada', fonte: FONTES.antigo_emocoes },
  { tema: 'Pesos', elemento: 'secundarias (9 emocoes)', descricao: 'peso secundario = peso primario × peso_secundario_fator (1) — "decidido 27/08" em config.csv, sem homologacao', fonte: FONTES.config },
  { tema: 'Associacoes', elemento: 'Triada', descricao: 'vinculo derivado da origem do bloco (motor.ts), nao de tabela aprovada; Mestre §17 exige politica explicita por ID', fonte: 'motor/src/motor.ts' },
  { tema: 'Combinacoes', elemento: 'CMB-001', descricao: 'status "confirmado" no CSV (material HOLOSCAN bloco 1) mas sem pacote aprovado; nenhuma CMB e exibida (cmbParaExibir = [])', fonte: FONTES.combinacoes },
  { tema: 'Sugestoes', elemento: 'REC-001..015', descricao: 'status legado_nao_validado: executaveis no motor de conduta, nunca apresentaveis', fonte: FONTES.corpoBancos },
  { tema: 'Sistemas', elemento: 'nomenclatura', descricao: 'nomes recuperados ("Sistema Ácido-Inflamatório", "Sistema Detox + Linfático") diferem da grafia do Mestre ("Sistema Ácido Inflamatório", "Sistema Detox e Linfático"); nenhum alterado automaticamente', fonte: FONTES.sistemas + ' × Mestre §11' }
];

const inventario = {
  inventario: 'metodologia-v1', etapa: 4, estrutura: 'ESTRUTURA RECUPERADA — PARA HOMOLOGACAO', status_global: PENDENTE,
  regra: 'Somente o que foi encontrado nos arquivos listados. Nada inferido, normalizado, corrigido ou aprovado.',
  fontes: Object.fromEntries(Object.entries(FONTES).map(([k, rel]) => [k, { arquivo: rel, sha256: existsSync(RAIZ + '/' + rel) ? sha(ler(rel)) : null }])),
  config_recuperada: config,
  contagem, escalas, sistemas, perguntas, associacoes, pesos, faixas, faixas_historicas: faixasHistoricas,
  indice, triada, ausencia, cobertura, comparabilidade,
  regras: { combinacoes, recomendacoes: rec, selecao, escopo, eixos_terapeuticos: eixosTerapeuticos, exames_relacionados: exames, subferramentas },
  pendencias_snt: { 'SNT-101': snt101, 'SNT-501': snt501 },
  conflitos,
  legado_fora_da_barreira: [
    { onde: 'app.js indiceDoMotor()', o_que: 'Indice pela conta antiga (soma × 2) quando o motor nao carrega; e HOLOSCAN.indiceDeNotas (pesos 0,20)', saida_oficial: false },
    { onde: 'app.js combinacoesDoMotor() / cmbParaExibir()', o_que: 'combinacoes das notas manuais; cmbParaExibir devolve [] (revisao clinica da Rodada 08)', saida_oficial: false },
    { onde: 'holoscan.js (motor L1 empacotado) via questionario.js', o_que: 'notas, faixas, Indice, Triada, combinacoes, aprofundamentos — calculo da coleta experimental; exibido com selo "em homologacao"', saida_oficial: false },
    { onde: 'corpo-bancos.js REC/SEL via app.js montarConduta()', o_que: 'regras de recomendacao legado; regrasApresentaveis() = [] (nenhuma confirmada)', saida_oficial: false },
    { onde: 'app.js reguas manuais (modoHomologacao)', o_que: 'pontuacao manual LEGADO / EM REVISAO; so com ?homologacao=1; nao sincroniza', saida_oficial: false },
    { onde: 'motor/bancos/exames.csv + exames.ts (confronto)', o_que: 'faixas laboratoriais rascunho e confronto exame × sistema (Leitura Integrada)', saida_oficial: false }
  ]
};

/* ---------- saidas ---------- */
const json = JSON.stringify(inventario, null, 2) + '\n';

function csvEscape(v) { const s = v === null || v === undefined ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
const linhasCsv = [['tipo', 'id', 'bloco_ou_sistema', 'destino', 'valor', 'orientacao', 'escala', 'fonte', 'status_recuperado', 'status_homologacao', 'conflito', 'observacao']];
for (const s of sistemas) linhasCsv.push(['sistema', s.codigo, '', '', s.nome, '', '', s.fonte, s.status_recuperado, s.status_homologacao, '', s.definicao]);
for (const e of escalas) linhasCsv.push(['escala', e.id, '', '', (e.rotulos || []).join(' / '), '', e.minimo + '..' + e.maximo, e.fonte, e.status_recuperado, e.status_homologacao, '', e.observacao]);
for (const p of perguntas) linhasCsv.push(['pergunta', p.stable_id, p.bloco, '', p.enunciado, p.orientacao_recuperada || 'AUSENTE', p.escala_id || 'AUSENTE', p.fonte, p.status_recuperado, p.status_homologacao, p.conflito || '', p.rotulo]);
for (const a of associacoes) linhasCsv.push(['associacao', a.question_id, '', a.destination_type + ':' + a.destination_id, a.weight, '', a.role, a.source, '', a.status, a.conflito ? 'sim' : '', a.conflito_nota || '']);
for (const f of faixas) linhasCsv.push(['faixa', f.destination_id + ':' + f.rotulo, f.destination_id, f.destination_type, f.regra_motor, '', '', f.fonte, 'rascunho', f.status_homologacao, '', f.mensagem_nutri || '']);
for (const [k, v] of Object.entries(indice.pesos_atuais)) linhasCsv.push(['indice_peso', k, k, 'index', v, '', '', indice.fonte, 'nao_oficial', PENDENTE, '', 'pesos iguais nao sao decisao final (Mestre §16)']);
for (const c of combinacoes) linhasCsv.push(['combinacao', c.id, '', c.tipo, c.condicao, '', '', c.fonte, c.status_recuperado, c.status_homologacao, '', c.leitura]);
for (const r of rec) linhasCsv.push(['recomendacao', r.id, '', r.ferramenta, r.origem, '', '', r.fonte, r.status_recuperado, r.status_homologacao, '', '']);
if (selecao) linhasCsv.push(['selecao', selecao.id, '', '', 'pior=' + selecao.do_pior_sistema + ' segundo=' + selecao.do_segundo_sistema + ' max=' + selecao.maximo, '', '', selecao.fonte, selecao.status_recuperado, selecao.status_homologacao, '', '']);
for (const e of escopo) linhasCsv.push(['escopo', e.id, '', e.gravidade, e.motivo, '', '', e.fonte, e.status_recuperado, e.status_homologacao, '', '']);
for (const e of eixosTerapeuticos) linhasCsv.push(['eixo_terapeutico', e.sistema + ':' + e.ordem, e.sistema, '', e.eixo, '', '', e.fonte, e.status_recuperado, e.status_homologacao, '', e.praticas]);
for (const e of exames) linhasCsv.push(['exame_relacionado', e.id, e.sistema, '', e.ideal_min + '..' + e.ideal_max + ' ' + e.unidade, '', '', e.fonte, e.status_recuperado, e.status_homologacao, '', e.exame]);
const csvTexto = linhasCsv.map((l) => l.map(csvEscape).join(',')).join('\n') + '\n';

const sntMd = `# PENDÊNCIA DE HOMOLOGAÇÃO — SNT-101 e SNT-501

Gerado por \`scripts/inventario-metodologico.mjs\` a partir dos bancos atuais. **Nada foi corrigido.** Os dois IDs aparecem em DUAS linhas primárias cada um, com sistemas e pesos diferentes. O Mestre (§12) é explícito: "IDs como SNT-101 e SNT-501 exigem revisão dos vínculos, sem herdar automaticamente pesos inconsistentes encontrados no AS-IS". Enquanto a decisão humana não existir, **nenhuma saída oficial pode depender destes vínculos**.

Status: **PENDENTE DE HOMOLOGAÇÃO** (os dois).

${[snt101, snt501].map((s) => `## ${s.id} — ${s.rotulo}

- **Enunciado:** ${s.enunciado}
- **Bloco:** ${s.bloco}
- **Cobertura:** ${s.cobertura_atual}
- **Tríada atual:** eixo ${s.triada_atual.eixo}, peso usado ${s.triada_atual.peso_usado} (${s.triada_atual.regra})

### Linhas atuais (duplicadas)

| Arquivo:linha | Sistema | Peso | Escala | Sentido | Chacra | Território | Fonte | Status |
|---|---|---|---|---|---|---|---|---|
${s.linhas_atuais.map((l) => `| ${l.arquivo}:${l.linha} | ${l.sistema} | ${l.peso} | ${l.escala} | ${l.sentido} | ${l.chacra || '—'} | ${l.territorio || '—'} | ${l.fonte} | ${l.status} |`).join('\n')}

### Associações atuais

| Destino | Peso | Papel | Conflito |
|---|---|---|---|
${s.associacoes_atuais.map((a) => `| ${a.destination_type}:${a.destination_id} | ${a.weight} | ${a.role} | ${a.conflito ? 'sim — ' + a.conflito_nota : (a.conflito_nota || '—')} |`).join('\n')}

### Onde mais aparece (cópia anterior dos bancos)

| Arquivo:linha | ID na cópia | Sistema | Peso | Enunciado |
|---|---|---|---|---|
${s.copia_anterior.map((c) => `| ${c.arquivo}:${c.linha} | ${c.id} | ${c.sistema} | ${c.peso} | ${c.enunciado} |`).join('\n') || '| — | — | — | — | — |'}

### Diferenças encontradas

${s.diferencas.map((d) => '- ' + d).join('\n')}

### Decisão necessária

${s.decisao_necessaria}
`).join('\n')}
`;

const linhaM = (tema, elemento, valor, fonte, conflito, decisao, status, impacto) => `| ${tema} | ${elemento} | ${valor} | ${fonte} | ${conflito} | ${decisao} | ${status} | ${impacto} |`;
const matrizLinhas = [];
matrizLinhas.push(linhaM('Cinco sistemas', 'nomes e textos públicos (5)', sistemas.map((s) => s.nome).join('; '), FONTES.sistemas, 'grafia difere do Mestre §11', 'confirmar nome, definição e textos públicos de cada sistema', 'PENDENTE', 'tela mostra nome/definição marcados como rascunho; nenhuma saída oficial'));
matrizLinhas.push(linhaM('Perguntas', `${contagem.ids_unicos} IDs (${contagem.fisico} físico / ${contagem.mental_emocional} mental-emocional / ${contagem.espiritual} espiritual)`, 'enunciados recuperados, status rascunho', 'sintomas/emocoes/espiritual.csv', contagem.ids_com_conflito.join(', ') + '; EMO-506 retirado sem registro', 'revisar os 84 enunciados e congelar a edição V1', 'PENDENTE', 'coleta experimental sem indicador oficial'));
for (const p of perguntas) matrizLinhas.push(linhaM('Pergunta', p.stable_id, '"' + p.enunciado.replace(/\|/g, '/') + '"', p.linhas.map((x) => x.arquivo.replace('motor/bancos/', '') + ':' + x.linha).join(' '), p.conflito ? 'sim — ' + p.conflito : '—', 'aceitar / corrigir / retirar o enunciado; confirmar escala, orientação (' + (p.orientacao_recuperada || 'AUSENTE') + ') e vínculos', 'PENDENTE', 'item fora da saída oficial'));
matrizLinhas.push(linhaM('Escalas', 'frequencia; intensidade', escalas.map((e) => e.id + ' 0..' + e.maximo + ' (' + (e.rotulos || []).join('/') + ')').join('; '), FONTES.questionario, 'arquitetura 0..3 recuperada, não oficial', 'confirmar rótulos, sentido e tipo de cada item', 'PENDENTE', 'respostas guardadas; nota oficial bloqueada'));
matrizLinhas.push(linhaM('Inversões', contagem.invertidas_recuperadas.length + ' invertidas recuperadas', contagem.invertidas_recuperadas.join(', '), 'coluna sentido dos bancos', 'orientação não foi homologada; inferir pelo texto é proibido', 'confirmar a orientação de cada um dos 84 itens', 'PENDENTE', 'carga orientada não oficial'));
matrizLinhas.push(linhaM('Associações', contagem.associacoes_sistema + ' pergunta→sistema; ' + contagem.associacoes_triada + ' pergunta→Tríada (derivadas)', 'primárias, 9 secundárias (emoções), Tríada por origem do bloco', 'bancos + motor.ts', 'SNT-101/SNT-501 em dois sistemas; Tríada derivada', 'aprovar cada vínculo (sistema primário/secundário e eixo da Tríada)', 'PENDENTE', 'sem contribuição inferida na saída oficial'));
matrizLinhas.push(linhaM('Pesos', 'por contribuição (1..3) e fator secundário (' + pesos.peso_secundario_fator + ')', 'distribuição ' + JSON.stringify(pesos.distribuicao), pesos.fonte, 'secundário "decidido 27/08" sem homologação', 'congelar peso de cada contribuição; decidir fator secundário', 'PENDENTE', 'sem nota oficial dependente'));
matrizLinhas.push(linhaM('SNT-101', 'vínculos e pesos', 'fungico 2 / metabolico 3', 'sintomas.csv:2, :24', 'duplicado; era SNT-302 na cópia anterior', 'um ou dois sistemas? que pesos? que eixo?', 'PENDENTE', 'bloqueia saída oficial dependente'));
matrizLinhas.push(linhaM('SNT-501', 'vínculos e pesos', 'metabolico 2 / mental_emocional_espiritual 3', 'sintomas.csv:32, :43', 'duplicado; era SNT-310 na cópia anterior (enunciado diferente)', 'um ou dois sistemas? que pesos? que eixo?', 'PENDENTE', 'bloqueia saída oficial dependente'));
matrizLinhas.push(linhaM('Parcialidade', 'denominador, exclusões, mínimos, redistribuição', 'por respondidos; sem corte; recusa/não aplicável não representados', ausencia.fonte, 'política "por respondidos" não homologada (Mestre §14.3, §15)', 'definir política de ausência (denominador, recusa, não aplicável, mínimos)', 'PENDENTE', 'dados e cobertura sem síntese oficial'));
matrizLinhas.push(linhaM('Cobertura', 'cobertura de preenchimento', 'respondidos / ' + cobertura.denominador + ' IDs; sem corte', cobertura.fonte, '—', 'definir completo / parcial avaliável / parcial não avaliável', 'PENDENTE', 'cobertura bruta exibida; não decide avaliabilidade'));
matrizLinhas.push(linhaM('Faixas', faixas.length + ' faixas (5 sistemas × 3)', 'baixo ≤3, médio ≤6, alto >6 sobre a nota; mensagens rascunho 13/09', FONTES.regras + ', ' + FONTES.mensagens, 'sem lacuna/sobreposição estrutural; conteúdo não homologado; faixas do Índice inexistentes', 'congelar limites, inclusividade, rótulos e mensagens; decidir faixas do Índice', 'PENDENTE', 'sem classificação oficial'));
matrizLinhas.push(linhaM('Índice', 'pesos α e elegibilidade', JSON.stringify(indice.pesos_atuais) + '; renormalização entre avaliáveis', indice.fonte, 'pesos iguais não são decisão final (Mestre §16)', 'congelar α (soma 1), elegibilidade global e índice parcial', 'PENDENTE', 'sem Índice global oficial'));
matrizLinhas.push(linhaM('Tríada', 'eixos, contribuições, pesos, escala, elegibilidade', triada.contribuicao_atual, triada.fonte, 'política por ID derivada, não explícita (Mestre §17)', 'congelar contribuição por ID, pesos, escala e agregação por eixo', 'PENDENTE', 'organiza relatos sem nota oficial'));
matrizLinhas.push(linhaM('Comparabilidade', 'regras de versão, cobertura e contexto', 'nenhuma regra recuperada', comparabilidade.fonte, '—', 'definir comparável / com ressalvas / não comparável', 'PENDENTE', 'consulta lado a lado sem delta'));
matrizLinhas.push(linhaM('Combinações', combinacoes.length + ' CMB', 'CMB-001 "confirmado" no CSV; 15 rascunho', FONTES.combinacoes, 'nenhuma exibida (cmbParaExibir = [])', 'aprovar cada combinação e o tipo (leitura/encaminhar)', 'PENDENTE', 'sem hipótese automática na interface'));
matrizLinhas.push(linhaM('Sugestões', rec.length + ' REC + SEL-001', 'REC-001..015 legado; REC-016..023 rascunho não validado', FONTES.corpoBancos, 'nenhuma confirmada', 'aprovar regras de sugestão e cotas', 'PENDENTE', 'seleção profissional no catálogo'));
matrizLinhas.push(linhaM('Laboratório (relacionado)', exames.length + ' EXA', 'faixas funcionais rascunho', FONTES.exames, 'catálogo de 45 exames fora desta etapa', 'fora da Etapa 4', 'PENDENTE', 'registro do laudo sem regra presumida'));
const matrizMd = `# MATRIZ DE HOMOLOGAÇÃO — V1 (Pacote Metodológico)

Gerada por \`scripts/inventario-metodologico.mjs\` a partir de \`inventario-metodologico-v1.json\`. Cada linha é um elemento que **precisa de decisão humana** (Mestre §13, §42). Valor atual = o que foi recuperado dos arquivos, **não** o valor aprovado. Status de todas as linhas: PENDENTE.

Resumo: ${contagem.ids_unicos} IDs únicos (${contagem.fisico}/${contagem.mental_emocional}/${contagem.espiritual}) em ${contagem.linhas_nos_bancos} linhas; ${contagem.associacoes_sistema} associações pergunta→sistema; ${contagem.invertidas_recuperadas.length} invertidas recuperadas; ${faixas.length} faixas; ${combinacoes.length} combinações; ${rec.length} regras de sugestão; conflitos: ${conflitos.length}.

| Tema | Elemento | Valor atual recuperado | Fonte | Conflito | Decisão necessária | Status | Impacto se pendente |
|---|---|---|---|---|---|---|---|
${matrizLinhas.join('\n')}
`;

const js = `/* GERADO por scripts/inventario-metodologico.mjs — NAO EDITAR A MAO.
   Inventario metodologico V1 (Etapa 4): estrutura recuperada dos bancos do
   motor, PARA HOMOLOGACAO. Nenhum elemento esta aprovado. */
window.MetodologiaInventario = ${JSON.stringify(inventario)};
`;

const SAIDAS = {
  'docs/v1/metodologia/inventario-metodologico-v1.json': json,
  'docs/v1/metodologia/inventario-metodologico-v1.csv': csvTexto,
  'docs/v1/metodologia/PENDENCIA-SNT-101-SNT-501.md': sntMd,
  'docs/v1/metodologia/MATRIZ-HOMOLOGACAO-V1.md': matrizMd,
  'metodologia-inventario.js': js
};
const check = process.argv.includes('--check');
let divergiu = false;
for (const [rel, conteudo] of Object.entries(SAIDAS)) {
  const caminho = RAIZ + '/' + rel;
  if (check) {
    const atual = existsSync(caminho) ? readFileSync(caminho, 'utf8') : null;
    if (atual !== conteudo) { divergiu = true; console.error('DIVERGE: ' + rel); }
  } else {
    writeFileSync(caminho, conteudo);
    console.log('gerado ' + rel + ' (' + conteudo.length + ' bytes)');
  }
}
if (check) { console.log(divergiu ? 'inventario DESATUALIZADO' : 'inventario em dia'); process.exit(divergiu ? 1 : 0); }
console.log('IDs unicos: ' + contagem.ids_unicos + ' (' + contagem.fisico + '/' + contagem.mental_emocional + '/' + contagem.espiritual + '), linhas ' + contagem.linhas_nos_bancos + ', associacoes sistema ' + contagem.associacoes_sistema + ', conflitos ' + conflitos.length);
