/**
 * Anamnese V2 — consistencia da funcao CANONICA formulario -> dominios (gerarDominiosDaAnamneseV2), sem navegador.
 *   1 cada campo preenchido gera o item no dominio certo     2 campo vazio nao gera item
 *   3 sintoma "Nao" = negado_explicitamente                  4 "As vezes"/"Frequente" = informado
 *   5 medidas: unidade obrigatoria, origem dado_medido       6 demais campos: informado + relato_paciente
 *   7 editar o formulario regenera os dominios               + o content gerado passa no validador do servidor
 *   + "Detalhes do registro" (meta) muda estado/origem; previo copiado; deterministico
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import '../anamnese-v2.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const V2 = globalThis.AnamneseV2;
const G = V2.gerarDominiosDaAnamneseV2;
const so = (dom, d) => (d[dom] || { itens: [] }).itens;

/* validador do servidor (validar_conteudo_anamnese), lido da migration — a mesma lista de dominios, estados e origens */
const mig = readFileSync(new URL('../supabase/migrations/20260930170000_etapa2_anamnese_conduta.sql', import.meta.url), 'utf8');
const lista = (nome) => mig.match(new RegExp(nome + " text\\[\\] := array\\[([^\\]]+)\\]"))[1].match(/'([^']+)'/g).map(x => x.slice(1, -1));
const DOM = lista('dominios'), EST = lista('estados'), ORI = lista('origens');
const validoNoServidor = (c) => Object.entries(c.dominios || {}).every(([k, v]) => DOM.includes(k) && Array.isArray(v.itens) &&
  v.itens.every(it => EST.includes(it.estado) && ORI.includes(it.origem) && (!it.medida || it.medida.valor === null || (it.medida.unidade || '') !== '')));

/* 1 + 6: cada tipo de campo cai no dominio declarado no esquema, informado + relato do paciente */
const todos = {};
V2.BLOCOS_PRIMEIRA.forEach(b => b.campos.forEach(f => {
  const d = (todos[b.id] = todos[b.id] || {});
  if (f.tipo === 'texto' || f.tipo === 'area') d[f.id] = 'valor de ' + f.id;
  if (f.tipo === 'chips') d[f.id] = f.multi ? [f.opcoes[0], f.opcoes[1]] : f.opcoes[0];
  if (f.tipo === 'sintoma') d[f.id] = 'frequente';
  if (f.tipo === 'medida') d[f.id] = '70,5';
  if (f.tipo === 'lista') d[f.id] = [{ nome: 'item ' + f.id, valor: f.medida ? '92' : undefined, unidade: f.medida ? 'cm' : undefined, dose: '1 cp', frequencia: '1x/dia' }];
}));
const dTodos = G(todos, {}, 'primeira');
const faltou = [];
V2.BLOCOS_PRIMEIRA.forEach(b => b.campos.forEach(f => {
  const it = so(f.dom, dTodos).find(i => String(i.chave).startsWith(b.id + '.' + f.id));
  if (!it) faltou.push(b.id + '.' + f.id);
}));
ok(!faltou.length, '1. cada campo preenchido gera seu item no domínio do esquema (' + V2.BLOCOS_PRIMEIRA.reduce((n, b) => n + b.campos.length, 0) + ' campos)' + (faltou.length ? ': faltou ' + faltou.join(',') : ''));
const naoMedidas = Object.entries(dTodos).flatMap(([k, v]) => v.itens.filter(i => !i.medida).map(i => i));
ok(naoMedidas.filter(i => !/^objetiva\.(circunferencias|outras_medidas)/.test(i.chave)).every(i => i.estado === 'informado' && i.origem === 'relato_paciente'), '6. campos que não são medida nascem informado + relato do paciente');
ok(validoNoServidor({ dominios: dTodos }) && Object.keys(dTodos).every(k => DOM.includes(k)), 'o conteúdo gerado passa no validador do servidor (domínios, estados, origens, unidade)');

/* 2 */
const vazio = G({ motivo: { motivo: '', objetivo: '   ' }, alimentar: { maior_fome: [], agua: null }, saude: { dor: null }, restricoes: { medicamentos: [{ nome: '' }] }, objetiva: { peso: '' } }, {}, 'primeira');
ok(Object.keys(vazio).length === 0, '2. campo vazio (texto, chips, sintoma, lista, medida) não gera item — vazio nunca vira "não"');

/* 3 e 4 */
const sin = G({ saude: { azia_refluxo: 'nao', distensao: 'as_vezes', nausea: 'frequente', nausea_detalhe: 'de manhã' } }, {}, 'primeira');
const s = (id) => so('sintomas_relatados', sin).find(i => i.chave === 'saude.' + id);
ok(s('azia_refluxo').estado === 'negado_explicitamente' && s('azia_refluxo').valor === '', '3. sintoma "Não" gera negado_explicitamente');
ok(s('distensao').estado === 'informado' && s('distensao').valor === 'Às vezes' && s('nausea').estado === 'informado' && s('nausea').valor === 'Frequente — de manhã', '4. "Às vezes" e "Frequente" geram informado (com o detalhe)');

/* 5 */
const med = G({ objetiva: { peso: '70,5', altura: '165', altura_unidade: 'cm', circunferencias: [{ nome: 'Cintura', valor: '92', unidade: 'cm' }, { nome: 'Quadril', valor: '101', unidade: '' }] } }, {}, 'primeira');
const m = so('medidas', med);
ok(m.find(i => i.campo === 'Peso').medida.valor === 70.5 && m.find(i => i.campo === 'Peso').medida.unidade === 'kg' && m.every(i => i.origem === 'dado_medido'), '5. medidas: valor numérico, origem dado_medido, unidade do campo (kg)');
const prob = V2.problemas({ dominios: med });
ok(prob.length === 1 && /Quadril/.test(prob[0]), '5. medida sem unidade é apontada antes de gravar (não há unidade padrão): ' + prob.join(' | '));

/* listas e negacoes */
const lst = G({ restricoes: { medicamentos: [{ nome: 'Losartana', dose: '50 mg', frequencia: '1x/dia' }, { nome: 'Metformina', frequencia: '2x/dia', obs: 'após refeição' }], suplementos_nega: true, alergias: [{ nome: 'Amendoim' }], intolerancias_nega: true } }, {}, 'primeira');
ok(so('medicamentos', lst).length === 2 && so('medicamentos', lst)[0].campo === 'Losartana' && so('medicamentos', lst)[0].valor === '50 mg · 1x/dia' && so('medicamentos', lst)[1].valor === '2x/dia · após refeição',
  'medicamentos múltiplos: um item por linha (nome, dose, frequência, observação)');
ok(so('suplementos', lst)[0].estado === 'negado_explicitamente' && so('intolerancias_informadas', lst)[0].estado === 'negado_explicitamente' && so('alergias_informadas', lst)[0].campo === 'Amendoim',
  '"Não usa suplementos" / "Nega intolerâncias" geram negado_explicitamente; alergia vira item');
const negaComLinha = G({ restricoes: { alergias: [{ nome: 'Leite' }], alergias_nega: true } }, {}, 'primeira');
ok(so('alergias_informadas', negaComLinha).length === 1 && so('alergias_informadas', negaComLinha)[0].estado === 'informado', 'com item listado, a negação não é gerada (não há contradição)');

/* 7: editar regenera; deterministico */
const f1 = { motivo: { objetivo: 'perder peso' } };
const a1 = JSON.stringify(G(f1, {}, 'primeira'));
const f2 = { motivo: { objetivo: 'ganhar energia' } };
ok(JSON.stringify(G(f1, {}, 'primeira')) === a1 && so('motivo_objetivo', G(f2, {}, 'primeira'))[0].valor === 'ganhar energia', '7. mesma entrada = mesma saída; editar o formulário regenera o domínio');
const c = V2.montarContent('primeira', { motivo: { objetivo: 'x' }, retorno: { melhorou: 'nao deve ficar' } }, {});
ok(c.formulario_versao === 2 && c.tipo === 'primeira' && !c.formulario.retorno && JSON.stringify(c.dominios) === JSON.stringify(G(c.formulario, c.meta, 'primeira')), 'montarContent: só o tipo ativo entra e os domínios são exatamente os gerados');

/* meta: Detalhes do registro */
const comMeta = G({ motivo: { motivo: 'dor de estômago' }, saude: { cirurgias: '' } }, { 'motivo.motivo': { estado: 'informado', origem: 'documento_externo' }, 'saude.cirurgias': { estado: 'nao_investigado' } }, 'primeira');
ok(so('motivo_objetivo', comMeta)[0].origem === 'documento_externo' && so('antecedentes', comMeta)[0].estado === 'nao_investigado' && so('antecedentes', comMeta)[0].valor === '',
  '"Detalhes do registro": a fonte e o estado escolhidos (ex.: não investigado, sem valor) vão para o domínio');
const previo = G({ motivo: { objetivo: 'copiado' } }, { 'motivo.objetivo': { previo: true, fonte_anamnese_id: 'abc' } }, 'primeira');
ok(so('motivo_objetivo', previo)[0].previo === true && so('motivo_objetivo', previo)[0].fonte_anamnese_id === 'abc', 'cópia da anterior: o item sai prévio, com a anamnese de origem');

/* retorno */
const ret = G({ retorno: { melhorou: 'sono', sintomas: 'azia nova', peso: '69', medicamento: 'parou o omeprazol' } }, {}, 'retorno');
ok(so('motivo_objetivo', ret)[0].valor === 'sono' && so('sintomas_relatados', ret)[0].valor === 'azia nova' && so('medidas', ret)[0].medida.unidade === 'kg' && so('medicamentos', ret)[0].valor === 'parou o omeprazol' && validoNoServidor({ dominios: ret }),
  'retorno: "desde a última consulta" vai para os domínios correspondentes; peso como medida (kg)');
ok(Object.keys(G({ motivo: { objetivo: 'nao deve entrar' } }, {}, 'retorno')).length === 0, 'retorno não gera domínio de campos da primeira consulta');

/* intimo */
const int = G({ contexto: { emocional: 'ansiedade relatada', sentido: 'família' } }, {}, 'primeira');
ok(so('emocional', int).length === 1 && so('sentido_pessoal', int).length === 1, 'bloco íntimo vai para os domínios emocional / sentido_pessoal (os mesmos que o relatório só inclui com marcação explícita)');
const r = V2.resumo(V2.montarContent('primeira', { contexto: { emocional: 'SEGREDO_INTIMO' }, saude: { azia_refluxo: 'nao' } }, {}));
ok(!JSON.stringify(r).includes('SEGREDO_INTIMO') && r.some(b => b.titulo === 'Sintomas negados'), 'resumo: o texto íntimo não aparece (só a indicação de que existe); sintomas negados em bloco próprio');
ok(V2.resumo({ dominios: {} }) === null && !V2.ehV2({ dominios: {} }), 'anamnese antiga (sem formulario_versao): não é V2 e não ganha resumo (sem reinterpretação)');

if (falhou) process.exitCode = 1;
