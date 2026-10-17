/* admin-usuarios — NUCLEO (sem Deno, sem rede): a regra de cada acao.

   O index.ts liga este nucleo ao Supabase de verdade (Auth Admin com a
   service_role, que so existe no ambiente da Edge Function). Os testes
   (testes/testar-admin-usuarios.mjs) e o servidor falso usam o MESMO nucleo
   com dependencias simuladas.

   Acoes (corpo JSON { acao, user_id, ... }):
     definir_senha      gera uma senha provisoria, marca
                        user_metadata.precisa_trocar_senha = true e devolve a
                        senha UMA vez (nunca vai para o registro)
     enviar_link_senha  e-mail "criar nova senha" (fluxo normal do Supabase)
     trocar_email       { email } troca o e-mail de login (ja confirmado) e o
                        e-mail de contato do perfil
     bloquear           { motivo? } ban no Auth: a pessoa nao entra
     desbloquear        tira o ban

   Regras: so administrador (conferido com o JWT de quem chama); nunca na
   propria conta; nunca numa conta de administrador; tudo registrado em
   admin_audit_log (admin_registrar_acao_servico), sem senha/token/link.
   Resposta sempre { ok: true, ... } ou { ok: false, erro, mensagem }. */

export const ACOES = ['definir_senha', 'enviar_link_senha', 'trocar_email', 'bloquear', 'desbloquear'];
export const BAN_LONGO = '876000h';   // ~100 anos: "ate desbloquear"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sem 0/O, 1/l/I

export function gerarSenha(bytesAleatorios) {
  // 12 caracteres sem vies (descarta bytes >= 220 = 4 x 55), com maiuscula, minuscula e numero
  for (let tentativa = 0; tentativa < 100; tentativa++) {
    let s = '';
    while (s.length < 12) for (const x of bytesAleatorios(32)) { if (x < 220 && s.length < 12) s += ALFABETO[x % ALFABETO.length]; }
    if (/[a-z]/.test(s) && /[A-Z]/.test(s) && /[2-9]/.test(s)) return s;
  }
  throw new Error('gerador de senha sem entropia');
}

const falha = (erro, mensagem) => ({ ok: false, erro, mensagem: mensagem || erro });

/**
 * @param corpo  objeto do pedido
 * @param d      dependencias:
 *   quemChama() -> uid | null            (JWT de quem chamou)
 *   ehAdmin(uid) -> boolean              (eh_administrador com o JWT de quem chamou)
 *   alvoEhAdmin(uid) -> boolean
 *   lerUsuario(uid) -> { id, email, user_metadata } | null
 *   atualizarUsuario(uid, attrs) -> { erro?: string }
 *   enviarLinkSenha(email) -> { erro?: string }
 *   atualizarEmailContato(uid, email) -> void
 *   registrar(ator, alvo, acao, detalhes) -> void
 *   bytesAleatorios(n) -> Uint8Array
 */
export async function tratarPedido(corpo, d) {
  const uid = await d.quemChama();
  if (!uid) return falha('nao_autenticado', 'Entre de novo.');
  if (!(await d.ehAdmin(uid))) return falha('apenas_administradores', 'Só a administração pode fazer isso.');
  corpo = corpo && typeof corpo === 'object' ? corpo : {};
  const acao = corpo.acao, alvo = String(corpo.user_id || '');
  if (!ACOES.includes(acao)) return falha('acao_invalida');
  if (!UUID.test(alvo)) return falha('conta_nao_encontrada');
  if (alvo === uid) return falha('propria_conta', 'Use o Perfil para mudar a sua própria conta.');
  const u = await d.lerUsuario(alvo);
  if (!u) return falha('conta_nao_encontrada');
  if (await d.alvoEhAdmin(alvo)) return falha('alvo_administrador', 'Contas da administração não são alteradas por aqui.');

  if (acao === 'definir_senha') {
    const senha = gerarSenha(d.bytesAleatorios);
    const meta = Object.assign({}, u.user_metadata || {}, { precisa_trocar_senha: true });
    const r = await d.atualizarUsuario(alvo, { password: senha, user_metadata: meta });
    if (r && r.erro) return falha('falha_auth', r.erro);
    await d.registrar(uid, alvo, 'definir_senha', { provisoria: true });
    return { ok: true, senha_provisoria: senha };
  }
  if (acao === 'enviar_link_senha') {
    if (!u.email) return falha('email_invalido');
    const r = await d.enviarLinkSenha(u.email);
    if (r && r.erro) return falha(/rate limit|too many/i.test(r.erro) ? 'limite_envio' : 'falha_auth', r.erro);
    await d.registrar(uid, alvo, 'enviar_link_senha', {});
    return { ok: true };
  }
  if (acao === 'trocar_email') {
    const novo = String(corpo.email || '').trim().toLowerCase();
    if (!EMAIL.test(novo) || novo.length > 254) return falha('email_invalido');
    if (novo === String(u.email || '').toLowerCase()) return falha('email_igual');
    const r = await d.atualizarUsuario(alvo, { email: novo, email_confirm: true });
    if (r && r.erro) return falha(/already|registered|exists|duplicate/i.test(r.erro) ? 'email_em_uso' : 'falha_auth', r.erro);
    await d.atualizarEmailContato(alvo, novo);
    await d.registrar(uid, alvo, 'trocar_email', { de: u.email || null, para: novo });
    return { ok: true, email: novo };
  }
  const bloquear = acao === 'bloquear';
  const r = await d.atualizarUsuario(alvo, { ban_duration: bloquear ? BAN_LONGO : 'none' });
  if (r && r.erro) return falha('falha_auth', r.erro);
  const motivo = String(corpo.motivo || '').trim().slice(0, 500);
  await d.registrar(uid, alvo, acao, bloquear && motivo ? { motivo } : {});
  return { ok: true };
}
