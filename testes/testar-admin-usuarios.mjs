/**
 * Edge Function admin-usuarios — o NUCLEO (supabase/functions/admin-usuarios/nucleo.js), sem rede:
 * so administrador; nunca a propria conta nem conta de administrador; senha provisoria forte, devolvida uma vez e
 * nunca registrada; marca precisa_trocar_senha; trocar e-mail valida e confere duplicado; bloquear/desbloquear;
 * tudo registrado. O index.ts so liga estas dependencias ao Supabase.
 */
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { tratarPedido, gerarSenha, ACOES, BAN_LONGO } from '../supabase/functions/admin-usuarios/nucleo.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const ADM = '11111111-1111-4111-8111-111111111111', NUT = '22222222-2222-4222-8222-222222222222', OUTRO_ADM = '33333333-3333-4333-8333-333333333333';

function mundo(chamador) {
  const m = { usuarios: { [ADM]: { id: ADM, email: 'adm@x.test', user_metadata: {} }, [NUT]: { id: NUT, email: 'nut@x.test', user_metadata: { nome: 'Nut' } },
    [OUTRO_ADM]: { id: OUTRO_ADM, email: 'adm2@x.test', user_metadata: {} } }, admins: [ADM, OUTRO_ADM], registro: [], atualizacoes: [], links: [], contato: {} };
  m.deps = {
    quemChama: async () => chamador,
    ehAdmin: async (u) => m.admins.includes(u),
    alvoEhAdmin: async (u) => m.admins.includes(u),
    lerUsuario: async (id) => m.usuarios[id] ? JSON.parse(JSON.stringify(m.usuarios[id])) : null,
    atualizarUsuario: async (id, a) => {
      if (a.email && Object.values(m.usuarios).some(u => u.email === a.email)) return { erro: 'A user with this email address has already been registered' };
      m.atualizacoes.push({ id, a });
      if (a.email) m.usuarios[id].email = a.email;
      if (a.user_metadata) m.usuarios[id].user_metadata = a.user_metadata;
      return {};
    },
    enviarLinkSenha: async (e) => { if (m.limite) return { erro: 'email rate limit exceeded' }; m.links.push(e); return {}; },
    atualizarEmailContato: async (id, e) => { m.contato[id] = e; },
    registrar: async (ator, alvo, acao, det) => { m.registro.push({ ator, alvo, acao, det }); },
    bytesAleatorios: (n) => new Uint8Array(randomBytes(n))
  };
  return m;
}

/* quem chama */
let m = mundo(null);
ok((await tratarPedido({ acao: 'bloquear', user_id: NUT }, m.deps)).erro === 'nao_autenticado', 'sem sessão: recusado');
m = mundo(NUT);
ok((await tratarPedido({ acao: 'bloquear', user_id: ADM }, m.deps)).erro === 'apenas_administradores' && !m.atualizacoes.length, 'conta comum: recusada, nada muda');
m = mundo(ADM);
ok((await tratarPedido({ acao: 'apagar', user_id: NUT }, m.deps)).erro === 'acao_invalida', 'ação fora da lista recusada (' + ACOES.join(', ') + ')');
ok((await tratarPedido({ acao: 'bloquear', user_id: 'x' }, m.deps)).erro === 'conta_nao_encontrada', 'user_id que não é uuid recusado');
ok((await tratarPedido({ acao: 'bloquear', user_id: '44444444-4444-4444-8444-444444444444' }, m.deps)).erro === 'conta_nao_encontrada', 'conta inexistente recusada');
ok((await tratarPedido({ acao: 'bloquear', user_id: ADM }, m.deps)).erro === 'propria_conta', 'nunca na própria conta');
ok((await tratarPedido({ acao: 'definir_senha', user_id: OUTRO_ADM }, m.deps)).erro === 'alvo_administrador' && !m.atualizacoes.length, 'nunca em conta de administrador');

/* senha provisoria */
const senhas = new Set();
for (let i = 0; i < 300; i++) senhas.add(gerarSenha((n) => new Uint8Array(randomBytes(n))));
ok(senhas.size === 300 && [...senhas].every(s => s.length === 12 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /[2-9]/.test(s) && !/[0O1lI]/.test(s)),
  'senha provisória: 12 caracteres, maiúscula+minúscula+número, sem caracteres ambíguos, sem repetição em 300');
m = mundo(ADM);
let r = await tratarPedido({ acao: 'definir_senha', user_id: NUT }, m.deps);
ok(r.ok && typeof r.senha_provisoria === 'string' && m.atualizacoes[0].a.password === r.senha_provisoria, 'definir_senha troca a senha no Auth e devolve a senha uma vez');
ok(m.usuarios[NUT].user_metadata.precisa_trocar_senha === true && m.usuarios[NUT].user_metadata.nome === 'Nut', 'marca precisa_trocar_senha sem apagar os outros metadados');
ok(m.registro.length === 1 && m.registro[0].acao === 'definir_senha' && !JSON.stringify(m.registro).includes(r.senha_provisoria), 'registrado, e a senha NUNCA vai para o registro');

/* link de nova senha */
r = await tratarPedido({ acao: 'enviar_link_senha', user_id: NUT }, m.deps);
ok(r.ok && m.links[0] === 'nut@x.test' && m.registro[1].acao === 'enviar_link_senha', 'enviar_link_senha manda para o e-mail da conta e registra');
m.limite = true;
ok((await tratarPedido({ acao: 'enviar_link_senha', user_id: NUT }, m.deps)).erro === 'limite_envio', 'limite de e-mails do Supabase vira mensagem clara');

/* trocar e-mail */
m = mundo(ADM);
ok((await tratarPedido({ acao: 'trocar_email', user_id: NUT, email: 'nao-e-email' }, m.deps)).erro === 'email_invalido', 'e-mail inválido recusado');
ok((await tratarPedido({ acao: 'trocar_email', user_id: NUT, email: 'NUT@x.test' }, m.deps)).erro === 'email_igual', 'mesmo e-mail recusado');
ok((await tratarPedido({ acao: 'trocar_email', user_id: NUT, email: 'adm2@x.test' }, m.deps)).erro === 'email_em_uso', 'e-mail de outra conta recusado');
r = await tratarPedido({ acao: 'trocar_email', user_id: NUT, email: '  Nova@X.test ' }, m.deps);
ok(r.ok && m.usuarios[NUT].email === 'nova@x.test' && m.atualizacoes[0].a.email_confirm === true && m.contato[NUT] === 'nova@x.test',
  'trocar_email: e-mail limpo e minúsculo, já confirmado, e o e-mail de contato do perfil acompanha');
ok(JSON.stringify(m.registro[0]) === JSON.stringify({ ator: ADM, alvo: NUT, acao: 'trocar_email', det: { de: 'nut@x.test', para: 'nova@x.test' } }), 'registro com de → para');

/* bloquear / desbloquear */
m = mundo(ADM);
r = await tratarPedido({ acao: 'bloquear', user_id: NUT, motivo: '  teste  ' }, m.deps);
ok(r.ok && m.atualizacoes[0].a.ban_duration === BAN_LONGO && m.registro[0].det.motivo === 'teste', 'bloquear: ban longo no Auth, motivo registrado');
r = await tratarPedido({ acao: 'desbloquear', user_id: NUT }, m.deps);
ok(r.ok && m.atualizacoes[1].a.ban_duration === 'none' && m.registro[1].acao === 'desbloquear', 'desbloquear: tira o ban e registra');

/* o index.ts nao carrega segredo no codigo e usa o nucleo */
const idx = readFileSync(new URL('../supabase/functions/admin-usuarios/index.ts', import.meta.url), 'utf8');
ok(/from "\.\/nucleo\.js"/.test(idx) && /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/.test(idx) && !/eyJ[A-Za-z0-9_-]{10,}/.test(idx) && !/sb_secret_/.test(idx),
  'index.ts usa o núcleo e lê a service_role só do ambiente (nenhuma chave no código)');
ok(/rpc\("eh_administrador"\)/.test(idx) && /comoQuemChama\.rpc\("eh_administrador"\)/.test(idx), 'quem é administrador é conferido com o JWT de quem chama');

const { gerar } = await import('../scripts/gerar-admin-usuarios-unico.mjs');
ok(readFileSync(new URL('../supabase/functions/admin-usuarios/ARQUIVO-UNICO-PAINEL.ts', import.meta.url), 'utf8') === gerar(),
  'ARQUIVO-UNICO-PAINEL.ts (para colar no painel) está igual a index.ts + nucleo.js');

console.log(falhou ? '\nFALHOU' : '\nadmin-usuarios: tudo ok');
process.exit(falhou ? 1 : 0);
