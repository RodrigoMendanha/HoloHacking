/**
 * Administracao no Supabase falso — o mesmo contrato da migration 20261016100000 (provada no harness SQL local,
 * supabase/tests/administracao-harness.sql): admin_painel, admin_definir_status, admin_editar_perfil, admin_historico
 * e o registro imutavel. A Edge Function admin-usuarios roda com o MESMO nucleo de producao
 * (supabase/functions/admin-usuarios/nucleo.js), so com o Auth simulado.
 */
import { randomUUID, randomBytes } from 'node:crypto';
import { tratarPedido } from '../supabase/functions/admin-usuarios/nucleo.js';

const copia = (x) => JSON.parse(JSON.stringify(x));
export const NOMES = ['admin_painel', 'admin_definir_status', 'admin_editar_perfil', 'admin_historico'];

export function criarAdministracao(s, ctx) {
  const { statusConta, agora } = ctx;
  const T = s.tabelas;
  s.registroAdmin = [];   // admin_audit_log (so cresce)
  const recusa = (m, hint, code) => ({ data: null, error: { message: m, code: code || 'P0001', hint: hint || null, details: null } });
  const ehAdmin = (uid) => !!uid && s.administradores.includes(uid);
  const emailDe = (id) => Object.keys(s.contas).find(e => s.contas[e].id === id) || null;
  const perfil = (id) => T.profiles.find(p => p.id === id) || null;
  function registrar(ator, alvo, acao, detalhes) {
    s.registroAdmin.push({ id: randomUUID(), actor_id: ator, target_user: alvo, target_email: emailDe(alvo), acao, detalhes: detalhes || {}, created_at: agora() });
  }
  const conta = (email) => s.contas[email];
  const banido = (c) => !!(c && c.banido_ate && new Date(c.banido_ate).getTime() > Date.now());

  function painel() {
    const conta1 = (email) => {
      const c = s.contas[email], id = c.id, p = perfil(id) || {};
      const conte = (t) => T[t].filter(x => x.nutritionist_id === id);
      const tipos = new Set(conte('professional_assets').map(a => a.tipo));
      const ult = ['patients', 'encounters', 'holoscan_applications', 'holos_results'].flatMap(t => conte(t).map(x => x.created_at)).sort().pop() || null;
      const campos = [p.nome, p.telefone, p.profissao, p.registro, p.especialidade, p.cidade].filter(v => v && String(v).trim()).length
        + ['foto', 'logo', 'assinatura', 'carimbo'].filter(t => tipos.has(t)).length;
      const ap = p.aprovado_por ? perfil(p.aprovado_por) : null;
      return { id, email, nome: p.nome || null, telefone: p.telefone || null, status: statusConta(id), criado_em: c.criado_em,
        aprovado_em: p.aprovado_em || null, aprovado_por: ap ? ap.nome : null, email_confirmado_em: c.confirmado_em === undefined ? c.criado_em : c.confirmado_em,
        ultimo_acesso: c.ultimo_acesso || null, bloqueado: banido(c), bloqueado_ate: c.banido_ate || null,
        precisa_trocar_senha: !!(c.meta && c.meta.precisa_trocar_senha === true), admin: ehAdmin(id),
        perfil: { profissao: p.profissao || null, registro: p.registro || null, especialidade: p.especialidade || null, cidade: p.cidade || null, instagram: p.instagram || null,
          foto: tipos.has('foto'), logo: tipos.has('logo'), assinatura: tipos.has('assinatura'), carimbo: tipos.has('carimbo') },
        completude: campos * 10,
        uso: { pacientes: conte('patients').length, atendimentos: conte('encounters').length, holoscans: conte('holoscan_applications').length,
          resultados: conte('holos_results').filter(r => !r.superseded_at).length, ultima_atividade: ult } };
    };
    const contas = Object.keys(s.contas).map(conta1).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
    const d = (iso) => new Date(iso).getTime(), h = Date.now(), dia = 86400000;
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const soma = (k) => contas.reduce((n, c) => n + c.uso[k], 0);
    return { gerado_em: agora(), contas, resumo: {
      total: contas.length, pendentes: contas.filter(c => c.status === 'pendente').length, ativos: contas.filter(c => c.status === 'ativo').length,
      recusados: contas.filter(c => c.status === 'recusado').length, bloqueados: contas.filter(c => c.bloqueado).length,
      cadastros_hoje: contas.filter(c => new Date(c.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) === hoje).length,
      cadastros_7d: contas.filter(c => d(c.criado_em) > h - 7 * dia).length, cadastros_30d: contas.filter(c => d(c.criado_em) > h - 30 * dia).length,
      acessaram_7d: contas.filter(c => c.ultimo_acesso && d(c.ultimo_acesso) > h - 7 * dia).length, nunca_acessaram: contas.filter(c => !c.ultimo_acesso).length,
      pacientes: soma('pacientes'), atendimentos: soma('atendimentos'), holoscans: soma('holoscans'), resultados: soma('resultados') } };
  }

  function rpc(uid, nome, args) {
    if (s.semAdminSql) return recusa('Could not find the function public.' + nome, null, 'PGRST202');   // SQL da administracao ainda nao aplicado
    if (!uid) return recusa('permission denied for function ' + nome, '42501');
    if (!ehAdmin(uid)) return recusa('apenas administradores', null, '42501');
    args = args || {};
    if (nome === 'admin_painel') return { data: painel(), error: null };
    if (nome === 'admin_historico') {
      const lim = Math.max(1, Math.min(Number(args.p_limite) || 100, 500));
      return { data: s.registroAdmin.slice().reverse().slice(0, lim).map(l => {
        const pa = perfil(l.target_user), pr = perfil(l.actor_id);
        return { id: l.id, created_at: l.created_at, acao: l.acao, detalhes: copia(l.detalhes), alvo_id: l.target_user,
          alvo_nome: (pa && pa.nome) || l.target_email, alvo_email: l.target_email, ator_nome: pr ? pr.nome : null };
      }), error: null };
    }
    if (nome === 'admin_definir_status') {
      if (!['ativo', 'recusado', 'pendente'].includes(args.p_status)) return recusa('status invalido', 'status_invalido', '22023');
      if (args.p_user === uid) return recusa('ninguem altera o status da propria conta', 'propria_conta', '42501');
      const p = perfil(args.p_user);
      if (!p) return recusa('conta nao encontrada', 'conta_nao_encontrada', 'P0002');
      const de = p.status || 'ativo';
      if (de === args.p_status) return { data: { status: de, alterado: false }, error: null };
      p.status = args.p_status;
      p.aprovado_em = args.p_status === 'pendente' ? null : agora();
      p.aprovado_por = args.p_status === 'pendente' ? null : uid;
      const motivo = String(args.p_motivo || '').trim().slice(0, 500);
      registrar(uid, args.p_user, args.p_status === 'ativo' ? 'liberar' : args.p_status === 'recusado' ? 'recusar' : 'voltar_pendente',
        Object.assign({ de, para: args.p_status }, motivo ? { motivo } : {}));
      return { data: { status: args.p_status, alterado: true }, error: null };
    }
    if (nome === 'admin_editar_perfil') {
      const nomeN = String(args.p_nome || '').trim(), tel = String(args.p_telefone || '').replace(/\D/g, '');
      if (nomeN.length < 2 || nomeN.length > 120) return recusa('nome invalido', 'nome_invalido', '22023');
      if (tel && (tel.length < 10 || tel.length > 11)) return recusa('telefone invalido', 'telefone_invalido', '22023');
      const p = perfil(args.p_user);
      if (!p) return recusa('conta nao encontrada', 'conta_nao_encontrada', 'P0002');
      const mud = {};
      if (p.nome !== nomeN) mud.nome = { de: p.nome, para: nomeN };
      if ((p.telefone || '') !== tel) mud.telefone = { de: p.telefone, para: tel || null };
      if (!Object.keys(mud).length) return { data: { alterado: false }, error: null };
      p.nome = nomeN; p.telefone = tel || null;
      registrar(uid, args.p_user, 'editar_perfil', mud);
      return { data: { alterado: true }, error: null };
    }
    return recusa('function ' + nome + ' does not exist', '42883');
  }

  /* Edge Function admin-usuarios: o MESMO nucleo de producao, Auth simulado */
  s.pedidosLinkSenha = [];
  function funcao(uid, nome, corpo) {
    if (nome !== 'admin-usuarios' || s.semFuncaoAdmin) return Promise.resolve({ data: null, error: { message: 'Function not found', name: 'FunctionsHttpError' } });
    return tratarPedido(corpo, {
      quemChama: async () => uid,
      ehAdmin: async (u) => ehAdmin(u),
      alvoEhAdmin: async (id) => ehAdmin(id),
      lerUsuario: async (id) => { const e = emailDe(id); return e ? { id, email: e, user_metadata: copia(conta(e).meta || {}) } : null; },
      atualizarUsuario: async (id, attrs) => {
        const e = emailDe(id); if (!e) return { erro: 'User not found' };
        const c = conta(e);
        if (attrs.email) {
          if (s.contas[attrs.email]) return { erro: 'A user with this email address has already been registered' };
          delete s.contas[e]; s.contas[attrs.email] = c; c.confirmado_em = agora();
        }
        if (attrs.password) c.senha = attrs.password;
        if (attrs.user_metadata) c.meta = Object.assign({}, c.meta || {}, attrs.user_metadata);
        if (attrs.ban_duration) c.banido_ate = attrs.ban_duration === 'none' ? null : new Date(Date.now() + 876000 * 3600000).toISOString();
        return {};
      },
      enviarLinkSenha: async (email) => { if (s.limiteRecuperacao) return { erro: 'email rate limit exceeded' }; s.pedidosLinkSenha.push(email); return {}; },
      atualizarEmailContato: async (id, email) => { const p = perfil(id); if (p) p.email_contato = email; },
      registrar: async (ator, alvo, acao, det) => registrar(ator, alvo, acao, Object.fromEntries(Object.entries(det || {}).filter(([k]) => !['senha', 'password', 'token', 'link'].includes(k)))),
      bytesAleatorios: (n) => new Uint8Array(randomBytes(n))
    }).then((r) => ({ data: r, error: null }));
  }

  return { NOMES, rpc, funcao, banido };
}
