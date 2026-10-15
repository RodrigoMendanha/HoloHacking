/**
 * MCP no Supabase falso — o mesmo contrato da migration 20261027100000 (provada no PostgreSQL local em
 * testes/testar-mcp-banco.mjs): criar_chave_mcp (so conta ativa, no maximo 5 ativas, chave mostrada uma vez, banco guarda
 * so o SHA-256) e revogar_chave_mcp (so a dona). mcp_keys e mcp_usage_log: so leitura pela API (sem key_hash).
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';

export function criarMcp(s, ctx) {
  const T = s.tabelas;
  const erro = (m, hint, code) => ({ data: null, error: { message: m, code: code || 'P0001', hint: hint || null, details: null } });
  function rpc(uid, nome, a) {
    a = a || {};
    if (nome === 'criar_chave_mcp') {
      if (ctx.statusConta(uid) !== 'ativo') return erro('conta ainda nao liberada', 'conta_nao_liberada', '42501');
      if (T.mcp_keys.filter(k => k.nutritionist_id === uid && !k.revoked_at).length >= 5) return erro('limite de chaves ativas', 'mcp_limite_chaves');
      const nome2 = String(a.p_nome || '').trim().slice(0, 60) || 'Assistente';
      const tok = 'hh_mcp_' + randomBytes(32).toString('base64url');
      const k = { id: randomUUID(), nutritionist_id: uid, nome: nome2, key_hash: createHash('sha256').update(tok).digest('hex'), prefixo: tok.slice(0, 12),
        created_at: new Date().toISOString(), last_used_at: null, revoked_at: null };
      T.mcp_keys.push(k);
      return { data: { id: k.id, nome: nome2, prefixo: k.prefixo, chave: tok }, error: null };
    }
    if (nome === 'revogar_chave_mcp') {
      const k = T.mcp_keys.find(x => x.id === a.p_id && x.nutritionist_id === uid);
      if (!k) return erro('chave nao encontrada', 'mcp_chave_nao_encontrada', 'P0002');
      if (!k.revoked_at) k.revoked_at = new Date().toISOString();
      return { data: { id: k.id, revogada: true }, error: null };
    }
    return erro('rpc desconhecida ' + nome, null, '42883');
  }
  return { rpc, NOMES: ['criar_chave_mcp', 'revogar_chave_mcp'] };
}
