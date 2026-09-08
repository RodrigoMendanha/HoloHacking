/**
 * PORTA DE ENTRADA DO MOTOR NO NAVEGADOR
 *
 * O motor nao tem dependencia nenhuma e nao fala com a rede, entao roda inteiro
 * dentro do app — sem backend, sem instalar nada. O que muda em relacao ao Node
 * e so de onde vem os bancos:
 *
 *   Node      -> bancos-node.ts le os CSV do disco
 *   Navegador -> este arquivo traz build/bancos.json embutido no pacote
 *
 * A normalizacao e o calculo sao os mesmos nos dois. Nenhuma regra vive aqui.
 *
 * Gera holoscope.js com:
 *   npx esbuild src/navegador.ts --bundle --format=iife --global-name=HOLOSCOPE \
 *     --loader:.json=json --minify --outfile=../../../holos-app/holoscope.js
 */

import brutos from '../build/bancos.json';
import { normalizarBancos, montarQuestionario, type BancosBrutos } from './bancos.ts';
import { pontuar, avaliarCondicao } from './motor.ts';
import { verificarEscopo } from './escopo.ts';
import type { Bancos, Resposta, Pontuacao } from './tipos.ts';

const bancos: Bancos = normalizarBancos(brutos as unknown as BancosBrutos);

/** As 87 perguntas, na ordem: sintomas, emocoes, espiritual. */
export function questionario() {
  return montarQuestionario(bancos);
}

/** Respostas (0 a 3 por marcador) -> Indice, notas, Triada, combinacoes. */
export function calcular(respostas: Resposta[]): Pontuacao {
  return pontuar(bancos, respostas);
}

/** Verifica se um texto pede algo fora do escopo da nutricao. */
export function escopo(texto: string) {
  return verificarEscopo(bancos, texto);
}

/** Os 5 sistemas, com padrao emocional e impacto espiritual. */
export function sistemas() {
  return bancos.sistemas;
}

/**
 * Combinacoes disparadas a partir das cinco notas, sem precisar do
 * questionario. E o que permite a tela do HOLOSCOPE — onde a nutricionista
 * ainda pontua a mao — usar as leituras do banco em vez de texto no codigo.
 * As condicoes vem de combinacoes.csv e sao avaliadas contra as notas.
 */
export function combinacoesDeNotas(notas: Record<string, number>) {
  // Ha condicao que fala de "indice" (CMB-004), entao ele precisa estar no
  // mapa. Calculado aqui pela mesma formula do motor, para nao existir uma
  // segunda versao da conta em lugar nenhum.
  const valores = { ...notas, indice: indiceDeNotas(notas) };
  return bancos.combinacoes
    .filter((c) => avaliarCondicao(c.condicao, valores))
    .sort((a, b) => a.prioridade - b.prioridade)
    .map((c) => ({ id: c.id, leitura: c.leitura, condicao: c.condicao, fonte: c.fonte }));
}

/**
 * Indice HOLOS a partir das cinco notas — a mesma conta que pontuar() faz:
 *   nota_media = Sum(nota x peso_indice)
 *   indice     = nota_media x (indice_maximo / 10)
 * A tela tinha isso escrito a mao como "soma x 2". Funcionava porque os pesos
 * sao 0,20 e o maximo e 100, mas era uma segunda copia da regra esperando para
 * divergir — foi assim que a escala invertida passou despercebida.
 */
export function indiceDeNotas(notas: Record<string, number>): number {
  let media = 0;
  for (const [sistema, regra] of bancos.regras) {
    media += (notas[sistema] ?? 0) * regra.peso_indice;
  }
  const bruto = media * (bancos.config.indice_maximo / 10);
  const casas = bancos.config.indice_casas;
  return Math.round(bruto * 10 ** casas) / 10 ** casas;
}

/** A mensagem do banco para um sistema numa faixa, no registro pedido. */
export function mensagem(sistema: string, nota: number, registro: 'tecnico' | 'acolhedor') {
  const regra = bancos.regras.get(sistema);
  const faixa = !regra ? 'media'
    : nota <= regra.faixa_baixa_ate ? 'baixa'
    : nota <= regra.faixa_media_ate ? 'media' : 'alta';
  const m = bancos.mensagens.find(
    (x) => x.sistema === sistema && x.faixa === faixa && x.registro === registro
  );
  return m ? { texto: m.texto, primeiros_passos: m.primeiros_passos, faixa, fonte: m.fonte } : null;
}

/** Quantos marcadores existem, por origem. Util para conferir o pacote. */
export function resumo() {
  const porOrigem: Record<string, number> = {};
  const vistos = new Set<string>();
  for (const m of bancos.marcadores) {
    if (vistos.has(m.id)) continue;
    vistos.add(m.id);
    porOrigem[m.origem] = (porOrigem[m.origem] ?? 0) + 1;
  }
  return {
    marcadores: vistos.size,
    por_origem: porOrigem,
    sistemas: bancos.sistemas.length,
    combinacoes: bancos.combinacoes.length,
    mensagens: bancos.mensagens.length,
  };
}
