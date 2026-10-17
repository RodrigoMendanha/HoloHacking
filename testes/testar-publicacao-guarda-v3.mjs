/**
 * PUBLICACAO DIRETA — GUARDA DA REVISAO (13/10)
 * O front antigo (46cab4e) trazia o rascunho de 12/10 como MetodologiaRevisaoV3 e o publicou como v3 em producao
 * (13/10 05:37 UTC). A versao nova do codigo e a v4. Se houver no banco uma v4 em_revisao que NAO seja exatamente a
 * revisao do codigo (mesma revisao na linhagem e mesmo hash), o front novo nao a publica: nada muda e o v3 continua.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, candidatoV1 } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const v2 = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01', manterAprovador: true });

/* o rascunho de 12/10 (arquivado), lido num "window" isolado para nao sobrescrever a revisao atual */
const caixa = {};
new Function('window', 'globalThis', readFileSync(new URL('../docs/v1/metodologia/historico/rascunho-revisao-v3-2026-10-12.js', import.meta.url), 'utf8'))(caixa, caixa);
const base = candidatoV1(); base.status = 'aprovado';
const velho = globalThis.PacoteMetodologico.aplicarRevisao(base, caixa.MetodologiaRevisaoV3);
const v3errado = semearHolosAprovado(srv, UA, { pacote: velho, aprovar: false });
const rpcA = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
if (rpcA('publicar_pacote_metodologico', { p_package_id: v3errado.id }).error) throw new Error('fixture: publicar o v3 errado');
/* uma v4 em_revisao com conteudo que NAO e o da revisao do codigo (o rascunho de 12/10 renumerado) */
const falsa = JSON.parse(JSON.stringify(velho)); falsa.version = 4; falsa.content_hash = globalThis.PacoteMetodologico.hashConteudo(falsa);
const rasc = semearHolosAprovado(srv, UA, { pacote: falsa, aprovar: false });
ok(rasc.version === 4 && rasc.status === 'em_revisao' && rasc.lineage.revisao === 'HOLOS-V1-REVISAO-PERGUNTAS-2026-10' && srv.linhas('methodology_packages').find(x => x.id === v3errado.id).status === 'aprovado',
  'cenário: v3 errado no ar (como em produção) e uma v4 em_revisao que não é a revisão do código');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const P = await (await nav.createBrowserContext()).newPage();
const erros = [], consoleErros = [];
P.on('pageerror', e => erros.push(e.message));
P.on('console', m => { if (m.type() === 'error') consoleErros.push(m.text()); });
await ligarPagina(P, srv);
await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForSelector('#login-email', { visible: true });
await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
await P.waitForFunction(() => window.PacoteMetodologico && window.PacoteMetodologico.todos().length >= 3, { timeout: 15000 });
const feitas = await P.evaluate(() => window.PacoteMetodologico.publicarRevisoesPendentes());
await new Promise(r => setTimeout(r, 800));
const pk = (v) => srv.linhas('methodology_packages').find(x => x.code === 'HOLOS-V1' && x.version === v);
ok(Array.isArray(feitas) && feitas.length === 0 && pk(4).status === 'em_revisao' && pk(4).id === rasc.id, 'o responsável entra: a v4 que não é a revisão do código NÃO é publicada (continua em_revisao)');
ok(pk(3).status === 'aprovado' && pk(2).status === 'retirado' && pk(2).id === v2.id && srv.linhas('methodology_packages').length === 3, 'nada muda no ar e nenhuma outra versão é gravada');
ok(consoleErros.some(t => /v4 em revisao no banco nao e a revisao HOLOS-V1-DECISOES-2026-10-13/.test(t)), 'o motivo fica registrado no console');
ok(erros.length === 0, 'nenhum erro de JavaScript' + (erros.length ? ': ' + erros.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nguarda da publicacao: tudo ok');
process.exit(falhou ? 1 : 0);
