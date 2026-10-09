/**
 * Anamnese pre-consulta no Supabase falso — o mesmo contrato da migration 20261014100000 (provada no Postgres local,
 * supabase/tests/anamnese-pre-consulta-harness.sql): criar/revogar/marcar (nutricionista logada) e as 3 funcoes
 * publicas (sem login, so com o token). O token puro nunca fica na tabela: o hash mora num mapa a parte, fora do
 * alcance do select da API (como a coluna sem grant no banco real).
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';

export function criarAnamnesePreConsulta(s, ctx) {
  const T = s.tabelas;
  const hashes = new Map();   // invite id -> sha256 do token
  s.convitesAnamnese = { hashes };
  let ultimo = 0;   // relogio estritamente crescente (como o now() de transacoes diferentes no banco)
  const agora = () => { if (ctx && ctx.agora) return ctx.agora(); ultimo = Math.max(Date.now(), ultimo + 1); return new Date(ultimo).toISOString(); };
  const recusa = (m, hint, code) => ({ data: null, error: { message: m, code: code || 'P0001', hint: hint || null, details: null } });
  const sha = (t) => createHash('sha256').update(String(t || ''), 'utf8').digest('hex');
  const copia = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const PERMITIDOS = { primeira: ['motivo', 'alimentar', 'saude', 'restricoes', 'estilo', 'contexto', 'objetiva'], retorno: ['retorno'] };

  function porToken(tok) {
    if (typeof tok !== 'string' || !/^[A-Za-z0-9_-]{40,64}$/.test(tok)) return null;
    const h = sha(tok);
    return T.anamnesis_invites.find(c => hashes.get(c.id) === h) || null;
  }
  function limpar(conteudo, tipo) {
    if (!conteudo || typeof conteudo !== 'object' || Array.isArray(conteudo)) return null;
    const f = conteudo.formulario;
    if (!f || typeof f !== 'object' || Array.isArray(f)) return null;
    const saida = {};
    for (const b of Object.keys(f)) {
      if (!(PERMITIDOS[tipo] || []).includes(b) || !f[b] || typeof f[b] !== 'object' || Array.isArray(f[b])) continue;
      if (b === 'objetiva') { const o = {}; ['peso', 'peso_unidade', 'altura', 'altura_unidade'].forEach(k => { if (k in f[b]) o[k] = f[b][k]; }); saida[b] = o; }
      else saida[b] = copia(f[b]);
    }
    return { formulario_versao: 2, tipo, formulario: saida };
  }
  const grande = (x) => JSON.stringify(x).length > 65536;
  function estadoPublico(c) {
    if (!c) return 'invalido';
    if (c.status === 'revogado') return 'revogado';
    if (c.status === 'concluido') return 'concluido';
    if (Date.parse(c.expires_at) < Date.parse(agora())) return 'expirado';
    return 'aberto';
  }
  function bloqueio(c) {
    const e = estadoPublico(c);
    return e === 'invalido' ? recusa('link invalido', 'link_invalido') : e === 'revogado' ? recusa('link revogado', 'link_revogado')
      : e === 'concluido' ? recusa('anamnese ja enviada', 'ja_enviada') : e === 'expirado' ? recusa('link expirado', 'link_expirado') : null;
  }

  function rpc(uid, nome, a) {
    a = a || {};
    if (nome === 'anamnese_publica_abrir') {
      const c = porToken(a.p_token), e = estadoPublico(c);
      if (e !== 'aberto') return { data: e === 'concluido' ? { estado: e, enviado_em: c.submitted_at } : { estado: e }, error: null };
      const pac = T.patients.find(p => p.id === c.patient_id), ps = c.professional_snapshot || {};
      return { data: { estado: 'aberto', status: c.status, tipo: c.form_tipo, form_version: c.form_version, expira_em: c.expires_at, salvo_em: c.last_saved_at,
        rascunho: copia(c.draft_content || {}), paciente: { primeiro_nome: pac ? String(pac.nome || '').trim().split(/\s+/)[0] || null : null },
        profissional: { nome: ps.nome || null, profissao: ps.profissao || null, registro: ps.registro || null, cor_primaria: ps.cor_primaria || null,
          cor_secundaria: ps.cor_secundaria || null, logo: ps.logo || null } }, error: null };
    }
    if (nome === 'anamnese_publica_salvar' || nome === 'anamnese_publica_enviar') {
      const c = porToken(a.p_token), b = bloqueio(c);
      if (b) return b;
      if (nome === 'anamnese_publica_salvar' && c.save_count >= 2000) return recusa('limite de salvamentos', 'limite');
      const limpo = limpar(a.p_conteudo, c.form_tipo);
      if (!limpo) return recusa('conteudo invalido', 'conteudo_invalido', '22023');
      if (grande(limpo)) return recusa('conteudo grande demais', 'grande_demais', '22023');
      const t = agora();
      if (nome === 'anamnese_publica_salvar') {
        Object.assign(c, { draft_content: limpo, status: 'iniciado', started_at: c.started_at || t, last_saved_at: t, save_count: c.save_count + 1 });
        return { data: { salvo_em: t }, error: null };
      }
      if (!Object.keys(limpo.formulario).length) return recusa('nada preenchido', 'vazio', '22023');
      Object.assign(c, { submitted_content: limpo, submitted_at: t, status: 'concluido', draft_content: null, started_at: c.started_at || t, last_saved_at: t });
      return { data: { enviado_em: t }, error: null };
    }
    if (!uid) return recusa('permission denied for function ' + nome, null, '42501');
    if (nome === 'criar_convite_anamnese') {
      const pac = T.patients.find(p => p.id === a.p_patient_id && p.nutritionist_id === uid);
      if (!pac) return recusa('paciente nao encontrado', 'paciente_invalido', 'P0002');
      if (pac.status === 'inativo') return recusa('paciente arquivado', 'paciente_arquivado');
      if (a.p_encounter_id && !T.encounters.find(e => e.id === a.p_encounter_id && e.patient_id === pac.id && e.nutritionist_id === uid)) return recusa('atendimento nao encontrado', 'atendimento_invalido', 'P0002');
      const dias = a.p_dias === undefined || a.p_dias === null ? 7 : a.p_dias;
      if (dias < 1 || dias > 30) return recusa('validade de 1 a 30 dias', 'validade_invalida', '22023');
      const tipo = a.p_tipo || 'primeira';
      if (!['primeira', 'retorno'].includes(tipo)) return recusa('tipo invalido', 'tipo_invalido', '22023');
      if (a.p_logo != null && (String(a.p_logo).length > 90000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.p_logo))) return recusa('logo invalido', 'logo_invalido', '22023');
      const t = agora();
      T.anamnesis_invites.filter(c => c.patient_id === pac.id && c.nutritionist_id === uid && ['enviado', 'iniciado'].includes(c.status))
        .forEach(c => { c.status = 'revogado'; c.revoked_at = t; });
      const pr = T.profiles.find(p => p.id === uid) || {};
      const tok = randomBytes(32).toString('base64url');
      const c = { id: randomUUID(), nutritionist_id: uid, patient_id: pac.id, encounter_id: a.p_encounter_id || null, status: 'enviado', form_version: 2, form_tipo: tipo,
        expires_at: new Date(Date.parse(t) + dias * 86400000).toISOString(), draft_content: null, submitted_content: null, save_count: 0,
        professional_snapshot: { nome: pr.nome || null, profissao: pr.profissao || null, registro: pr.registro || null, cor_primaria: pr.cor_primaria || null,
          cor_secundaria: pr.cor_secundaria || null, logo: a.p_logo || null },
        imported_anamnesis_id: null, imported_at: null, created_at: t, started_at: null, last_saved_at: null, submitted_at: null, revoked_at: null };
      T.anamnesis_invites.push(c);
      hashes.set(c.id, sha(tok));
      return { data: { id: c.id, token: tok, expires_at: c.expires_at, status: c.status, form_tipo: c.form_tipo }, error: null };
    }
    const c = T.anamnesis_invites.find(x => x.id === a.p_id && x.nutritionist_id === uid);
    if (nome === 'revogar_convite_anamnese') {
      if (!c) return recusa('convite nao encontrado', 'convite_invalido', 'P0002');
      if (c.status === 'concluido') return recusa('convite ja respondido nao e revogado', 'convite_concluido');
      if (c.status !== 'revogado') { c.status = 'revogado'; c.revoked_at = agora(); }
      return { data: { id: c.id, status: c.status, revoked_at: c.revoked_at }, error: null };
    }
    if (nome === 'marcar_convite_anamnese_usado') {
      if (!c) return recusa('convite nao encontrado', 'convite_invalido', 'P0002');
      if (c.status !== 'concluido') return recusa('a paciente ainda nao enviou', 'convite_nao_concluido');
      if (!T.anamneses.find(x => x.id === a.p_anamnesis_id && x.nutritionist_id === uid && x.patient_id === c.patient_id)) return recusa('anamnese nao encontrada', 'anamnese_invalida', 'P0002');
      c.imported_anamnesis_id = a.p_anamnesis_id; c.imported_at = agora();
      return { data: { id: c.id, imported_anamnesis_id: c.imported_anamnesis_id, imported_at: c.imported_at }, error: null };
    }
    return recusa('function ' + nome + ' does not exist', null, '42883');
  }

  return {
    rpc,
    PUBLICAS: ['anamnese_publica_abrir', 'anamnese_publica_salvar', 'anamnese_publica_enviar'],
    NOMES: ['anamnese_publica_abrir', 'anamnese_publica_salvar', 'anamnese_publica_enviar', 'criar_convite_anamnese', 'revogar_convite_anamnese', 'marcar_convite_anamnese_usado'],
    /** para os testes: vencer um convite */
    vencer(id) { const c = T.anamnesis_invites.find(x => x.id === id); if (c) c.expires_at = new Date(Date.parse(agora()) - 60000).toISOString(); }
  };
}
