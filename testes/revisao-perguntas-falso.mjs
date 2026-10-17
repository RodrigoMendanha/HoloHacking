/**
 * Servidor falso da REVISAO DAS PERGUNTAS (migration 20261010100000): as 3 funcoes publicas (sem login) e a abertura
 * da revisao (so pelo dono do banco). Mesmas regras da migration; a prova no Postgres real fica em
 * supabase/tests/revisao-perguntas-harness.sql.
 */
export function criarRevisaoPerguntas(s, ctx) {
  s.revisoes = s.revisoes || [];
  const erro = (m, hint, code) => ({ data: null, error: { message: m, code: code || 'P0001', hint: hint || null, details: null } });
  const agora = () => (ctx && ctx.agora ? ctx.agora() : new Date().toISOString());
  const atual = () => s.revisoes.filter(r => r.status !== 'cancelada').sort((a, b) => (b.status === 'aberta') - (a.status === 'aberta') || String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
  const aberta = () => s.revisoes.find(r => r.status === 'aberta') || null;
  const ultima = (r, sid) => { const l = r.respostas.filter(x => x.stable_id === sid); const u = l[l.length - 1]; return u && u.decisao !== 'limpar' ? u : null; };
  let seq = 0;

  /** abrir (dono do banco): copia as perguntas do pacote aprovado */
  function abrir(code, version, dias) {
    const pk = (s.tabelas.methodology_packages || []).find(m => m.code === code && Number(m.version) === Number(version) && m.status === 'aprovado');
    if (!pk) throw new Error('pacote aprovado nao encontrado');
    if (aberta()) throw new Error('ja existe uma revisao aberta');
    const qs = s.tabelas.methodology_questions.filter(q => q.package_id === pk.id);
    const sis = s.tabelas.methodology_systems.filter(x => x.package_id === pk.id);
    const r = { id: 'rev-' + (++seq), package_code: pk.code, package_version: pk.version, titulo: 'Revisão das perguntas do HOLOSCAN (' + pk.code + ' v' + pk.version + ')',
      status: 'aberta', expira_em: new Date(Date.parse(agora()) + (dias || 15) * 86400000).toISOString(), concluida_em: null, concluida_por_nome: null, created_at: agora(), respostas: [],
      itens: qs.map(q => {
        const a = s.tabelas.methodology_associations.filter(x => x.package_id === pk.id && x.question_stable_id === q.stable_id && x.role === 'primaria' && x.destination_type === 'system')
          .sort((x, y) => String(x.destination_id).localeCompare(String(y.destination_id)))[0];
        const sm = a && sis.find(x => x.code === a.destination_id);
        return { stable_id: q.stable_id, posicao: q.position, sistema_code: a ? a.destination_id : null, sistema_nome: sm ? sm.name : null, sistema_ordem: sm ? sm.position : null,
          texto_original: q.statement, respostas: q.response_labels || [] };
      }) };
    s.revisoes.push(r);
    return r;
  }

  function ler() {
    const r = atual();
    if (!r) return { estado: 'nenhuma' };
    const estado = r.status === 'concluida' ? 'concluida' : (r.status === 'aberta' && Date.parse(r.expira_em) <= Date.parse(agora()) ? 'expirada' : 'aberta');
    const itens = r.itens.slice().sort((a, b) => ((a.sistema_ordem == null) - (b.sistema_ordem == null)) || (a.sistema_ordem - b.sistema_ordem) || (a.posicao - b.posicao)).map(i => {
      const u = ultima(r, i.stable_id);
      return Object.assign({}, i, { decisao: u ? u.decisao : null, texto_sugerido: u ? u.texto_sugerido : null, comentario: u ? u.comentario : null, decidido_em: u ? u.criado_em : null });
    });
    itens.forEach(i => { delete i.sistema_ordem; });
    return { estado, titulo: r.titulo, pacote: r.package_code + ' v' + r.package_version, expira_em: r.expira_em, concluida_em: r.concluida_em, concluida_por_nome: r.concluida_por_nome, itens };
  }

  function rpc(uid, nome, args) {
    args = args || {};
    if (nome === 'revisao_perguntas_ler') return { data: JSON.parse(JSON.stringify(ler())), error: null };
    const r = aberta();
    if (!r) return erro('nenhuma revisao aberta', 'revisao_fechada');
    if (Date.parse(r.expira_em) <= Date.parse(agora())) return erro('o prazo da revisao terminou', 'revisao_expirada');
    if (nome === 'revisao_perguntas_registrar') {
      const dec = args.p_decisao, texto = String(args.p_texto || '').trim() || null, coment = String(args.p_comentario || '').trim() || null;
      if (!['aprovar', 'negar', 'editar', 'limpar'].includes(dec)) return erro('decisao invalida', 'decisao_invalida', '22023');
      if (!r.itens.some(i => i.stable_id === args.p_stable_id)) return erro('pergunta fora desta revisao', 'pergunta_invalida', '22023');
      if (dec === 'editar' && !texto) return erro('escreva o texto sugerido', 'texto_obrigatorio', '22023');
      if ((texto && texto.length > 1000) || (coment && coment.length > 1000)) return erro('texto longo demais (maximo 1000 caracteres)', 'texto_longo', '22023');
      if (r.respostas.length >= 5000) return erro('limite de registros desta revisao atingido', 'limite');
      const reg = { stable_id: args.p_stable_id, decisao: dec, texto_sugerido: dec === 'editar' ? texto : null, comentario: ['negar', 'editar'].includes(dec) ? coment : null, criado_em: agora() };
      r.respostas.push(reg);
      return { data: { stable_id: reg.stable_id, decisao: dec, decidido_em: reg.criado_em }, error: null };
    }
    if (nome === 'revisao_perguntas_concluir') {
      const nomeR = String(args.p_nome || '').trim() || null;
      if (nomeR && nomeR.length > 80) return erro('nome longo demais', 'texto_longo', '22023');
      const us = r.itens.map(i => ultima(r, i.stable_id));
      const faltam = us.filter(u => !u).length;
      if (faltam) return erro('faltam ' + faltam + ' pergunta(s) sem decisao', 'revisao_incompleta');
      r.status = 'concluida'; r.concluida_em = agora(); r.concluida_por_nome = nomeR;
      return { data: { total: us.length, aprovadas: us.filter(u => u.decisao === 'aprovar').length, negadas: us.filter(u => u.decisao === 'negar').length, editadas: us.filter(u => u.decisao === 'editar').length }, error: null };
    }
    return erro('funcao desconhecida ' + nome);
  }
  return { rpc, abrir, NOMES: ['revisao_perguntas_ler', 'revisao_perguntas_registrar', 'revisao_perguntas_concluir'] };
}
