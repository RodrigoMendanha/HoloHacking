/**
 * SUPABASE FALSO — um "servidor" em memoria, no processo do Node, com a
 * semantica que importa do projeto real (supabase/migrations/):
 *
 *   - Auth: contas por e-mail/senha, sessao em localStorage do contexto;
 *   - RLS: toda tabela com nutritionist_id so mostra/altera linhas de
 *     auth.uid(); filhas (answers, scores, results) pelo dono da mae;
 *   - esquema ESTRITO: coluna que nao existe na migration e erro, como no
 *     PostgREST — o teste nao passa com payload que o banco real recusaria;
 *   - FKs: (patient_id, nutritionist_id) → patients; DELETE de paciente com
 *     filho e RESTRICT; application/collection apagam filhas em CASCADE;
 *   - RPCs salvar_holoscan_completo e salvar_coleta_exames como no SQL;
 *   - Storage: buckets privados, primeiro segmento do caminho = uid;
 *   - PostgREST devolve no maximo `maxLinhas` (1000) por pedido.
 *
 * Cada pagina recebe a biblioteca falsa no lugar do supabase-js do CDN
 * (interceptacao de rede) e fala com o servidor por page.exposeFunction.
 * Dois contextos de navegador diferentes = dois "computadores" com o mesmo
 * servidor: localStorage e IndexedDB separados, banco compartilhado.
 *
 * Falhas sob medida: servidor.falhar.push({ tabela, acao }) — acao em
 * select|insert|update|delete|upsert|rpc|upload|download|remove. `vezes`
 * opcional (padrao: sempre, ate remover).
 */

import { randomUUID } from 'node:crypto';

const COLUNAS = {
  patients: ['id', 'nutritionist_id', 'nome', 'nascimento', 'telefone', 'email', 'sexo', 'inicio', 'queixa', 'status', 'created_at', 'updated_at'],
  consultations: ['id', 'nutritionist_id', 'patient_id', 'data', 'hora', 'duracao_min', 'tipo', 'nota', 'created_at', 'updated_at'],
  schedule_blocks: ['id', 'nutritionist_id', 'data', 'inicio', 'fim', 'dia_todo', 'motivo', 'created_at', 'updated_at'],
  holoscan_applications: ['id', 'nutritionist_id', 'patient_id', 'quando', 'versao_estrutura', 'versao_bancos', 'indice', 'indice_maximo', 'avaliavel', 'nota_media', 'triada', 'triada_com_dado', 'cobertura', 'combinacoes', 'aprofundamentos', 'interpretacao_texto', 'interpretacao_em', 'interpretacao_versao', 'created_at', 'updated_at'],
  holoscan_answers: ['id', 'application_id', 'marcador_id', 'valor', 'created_at'],
  holoscan_system_scores: ['id', 'application_id', 'sistema', 'nome', 'nota', 'carga', 'faixa', 'obtido', 'maximo', 'respondidos', 'total_marcadores', 'avaliavel', 'created_at'],
  lab_collections: ['id', 'nutritionist_id', 'patient_id', 'coletado_em', 'data_coleta_desconhecida', 'laboratorio', 'observacao', 'created_at', 'updated_at'],
  lab_results: ['id', 'collection_id', 'exame_id', 'valor', 'unidade_no_momento', 'ideal_min_no_momento', 'ideal_max_no_momento', 'nome_exame_no_momento', 'sistema_no_momento', 'created_at'],
  tool_applications: ['id', 'nutritionist_id', 'patient_id', 'consultation_id', 'ferramenta_id', 'versao_ferramenta', 'origem_legada', 'status', 'iniciada_em', 'concluida_em', 'atualizada_em', 'respostas', 'resultado', 'leitura', 'prioridade', 'proximo_passo', 'created_at', 'updated_at'],
  documents: ['id', 'nutritionist_id', 'patient_id', 'nome', 'tipo', 'data_documento', 'mime_type', 'tamanho_bytes', 'storage_path', 'origem_local', 'created_at', 'updated_at'],
  professional_assets: ['id', 'nutritionist_id', 'tipo', 'nome', 'mime_type', 'tamanho_bytes', 'storage_path', 'created_at', 'updated_at'],
  profiles: null,          // nao estrito: o perfil nao e o assunto destes testes
  ai_threads: ['id', 'nutritionist_id', 'patient_id', 'titulo', 'created_at', 'updated_at'],
  ai_messages: ['id', 'thread_id', 'role', 'content', 'metadata', 'created_at']
};

const DONO_DIRETO = ['patients', 'consultations', 'schedule_blocks', 'holoscan_applications',
  'lab_collections', 'tool_applications', 'documents', 'professional_assets', 'ai_threads'];
const FILHAS = {           // tabela -> [coluna, mae]
  holoscan_answers: ['application_id', 'holoscan_applications'],
  holoscan_system_scores: ['application_id', 'holoscan_applications'],
  lab_results: ['collection_id', 'lab_collections'],
  ai_messages: ['thread_id', 'ai_threads']
};
const COM_PACIENTE = ['consultations', 'holoscan_applications', 'lab_collections', 'tool_applications', 'documents', 'ai_threads'];
const UNICAS = {           // uniques alem da PK, como nas migrations
  lab_results: [['collection_id', 'exame_id']]
};
const FERRAMENTAS = ['oq3', 'pqq', 'linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro'];

const erro = (message, code) => ({ data: null, error: { message, code: code || 'XX000' } });
const agora = () => new Date().toISOString();
const copia = (x) => JSON.parse(JSON.stringify(x));

export function criarServidor() {
  const s = {
    contas: {},                        // email -> { senha, id }
    tabelas: Object.fromEntries(Object.keys(COLUNAS).map(t => [t, []])),
    storage: { 'patient-documents': {}, 'professional-assets': {} },
    falhar: [],
    log: [],
    maxLinhas: 1000,
    relogio: 0
  };

  s.criarConta = (email, senha, id) => {
    s.contas[email] = { senha, id: id || randomUUID() };
    return s.contas[email].id;
  };

  function carimbo() {
    // estritamente crescente: created_at desempata ordem de insercao
    s.relogio = Math.max(Date.now(), s.relogio + 1);
    return new Date(s.relogio).toISOString();
  }

  function deveFalhar(tabela, acao) {
    const i = s.falhar.findIndex(f => (!f.tabela || f.tabela === tabela) && (!f.acao || f.acao === acao));
    if (i < 0) return false;
    const f = s.falhar[i];
    if (typeof f.vezes === 'number') { f.vezes--; if (f.vezes <= 0) s.falhar.splice(i, 1); }
    return true;
  }

  function dono(tabela, linha) {
    if (tabela === 'profiles') return linha.id;
    if (DONO_DIRETO.includes(tabela)) return linha.nutritionist_id;
    const f = FILHAS[tabela];
    if (f) {
      const mae = s.tabelas[f[1]].find(m => m.id === linha[f[0]]);
      return mae ? mae.nutritionist_id : null;
    }
    return null;
  }

  function visiveis(tabela, uid) { return s.tabelas[tabela].filter(l => dono(tabela, l) === uid); }

  function validarColunas(tabela, obj) {
    const cols = COLUNAS[tabela];
    if (!cols) return null;
    for (const k of Object.keys(obj)) {
      if (!cols.includes(k)) return erro(`Could not find the '${k}' column of '${tabela}' in the schema cache`, 'PGRST204');
    }
    return null;
  }

  function pacienteDe(uid, pid) {
    return s.tabelas.patients.find(p => p.id === pid && p.nutritionist_id === uid);
  }

  function checarLinha(tabela, linha, uid) {
    const e = validarColunas(tabela, linha);
    if (e) return e;
    if (DONO_DIRETO.includes(tabela) && linha.nutritionist_id !== uid) {
      return erro('new row violates row-level security policy for table "' + tabela + '"', '42501');
    }
    const f = FILHAS[tabela];
    if (f) {
      const mae = s.tabelas[f[1]].find(m => m.id === linha[f[0]]);
      if (!mae || mae.nutritionist_id !== uid) return erro('new row violates row-level security policy', '42501');
    }
    if (COM_PACIENTE.includes(tabela) && !pacienteDe(uid, linha.patient_id)) {
      return erro('insert or update on table "' + tabela + '" violates foreign key constraint', '23503');
    }
    if (tabela === 'tool_applications') {
      if (!FERRAMENTAS.includes(linha.ferramenta_id)) return erro('violates check constraint "tool_applications_ferramenta_valida"', '23514');
      if (!['rascunho', 'concluida', 'revisada'].includes(linha.status)) return erro('violates check constraint "tool_applications_status_valido"', '23514');
      if (linha.consultation_id) {
        const c = s.tabelas.consultations.find(x => x.id === linha.consultation_id &&
          x.patient_id === linha.patient_id && x.nutritionist_id === uid);
        if (!c) return erro('violates foreign key constraint "tool_applications_consultation_fk"', '23503');
      }
    }
    if (tabela === 'patients' && !['ativo', 'inativo'].includes(linha.status)) {
      return erro('violates check constraint "patients_status_valido"', '23514');
    }
    if (tabela === 'lab_collections') {
      const ok = (linha.data_coleta_desconhecida === true && linha.coletado_em == null) ||
                 (linha.data_coleta_desconhecida === false && linha.coletado_em != null);
      if (!ok) return erro('violates check constraint "lab_collections_data_coerente"', '23514');
    }
    return null;
  }

  function novaLinha(tabela, dados, uid) {
    const l = Object.assign({}, dados);
    if (!l.id) l.id = randomUUID();
    const t = carimbo();
    if (DONO_DIRETO.includes(tabela) && !('nutritionist_id' in l)) l.nutritionist_id = uid;
    const cols = COLUNAS[tabela] || [];
    if (cols.includes('created_at') && !l.created_at) l.created_at = t;
    if (cols.includes('updated_at') && !l.updated_at) l.updated_at = t;
    if (tabela === 'patients' && !l.status) l.status = 'ativo';
    if (tabela === 'tool_applications') {
      if (!l.status) l.status = 'rascunho';
      if (!l.respostas) l.respostas = {};
      if (!l.iniciada_em) l.iniciada_em = t;
      if (!l.atualizada_em) l.atualizada_em = t;
    }
    if (tabela === 'lab_collections' && l.data_coleta_desconhecida === undefined) l.data_coleta_desconhecida = false;
    return l;
  }

  function comparar(a, b) {
    if (a === b) return 0;
    if (a === null || a === undefined) return 1;      // NULLS LAST
    if (b === null || b === undefined) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  }

  function filtrar(linhas, filtros) {
    return linhas.filter(l => filtros.every(f => {
      const v = l[f.col];
      switch (f.op) {
        case 'eq': return v !== null && v !== undefined && String(v) === String(f.val);
        case 'neq': return String(v) !== String(f.val);
        case 'in': return (f.val || []).map(String).includes(String(v));
        case 'is': return f.val === null ? (v === null || v === undefined) : v === f.val;
        case 'gt': return comparar(v, f.val) > 0;
        case 'gte': return comparar(v, f.val) >= 0;
        case 'lt': return comparar(v, f.val) < 0;
        case 'lte': return comparar(v, f.val) <= 0;
        default: return true;
      }
    }));
  }

  function projetar(linhas, colunas) {
    if (!colunas || colunas.trim() === '*') return linhas.map(copia);
    const cs = colunas.split(',').map(c => c.trim()).filter(Boolean);
    return linhas.map(l => { const o = {}; cs.forEach(c => { o[c] = l[c] === undefined ? null : copia(l[c]); }); return o; });
  }

  function finalizar(q, linhas) {
    if (q.single === 'single') {
      if (linhas.length !== 1) return erro('JSON object requested, multiple (or no) rows returned', 'PGRST116');
      return { data: linhas[0], error: null };
    }
    if (q.single === 'maybe') {
      if (linhas.length > 1) return erro('multiple rows returned', 'PGRST116');
      return { data: linhas[0] || null, error: null };
    }
    return { data: linhas, error: null };
  }

  function consultar(uid, q) {
    const t = q.tabela;
    if (!(t in s.tabelas)) return erro('relation "public.' + t + '" does not exist', '42P01');
    if (!uid) return erro('permission denied for table ' + t, '42501');   // anon revogado
    if (deveFalhar(t, q.acao)) return erro('falha simulada em ' + t + '/' + q.acao, 'SIMULADA');

    if (q.acao === 'select') {
      let linhas = filtrar(visiveis(t, uid), q.filtros);
      if (q.opcoes && q.opcoes.count) {
        const n = linhas.length;
        if (q.opcoes.head) return { data: null, count: n, error: null };
      }
      linhas = linhas.slice().sort((a, b) => {
        for (const o of q.ordem) { const c = comparar(a[o.col], b[o.col]); if (c) return o.asc ? c : -c; }
        return 0;
      });
      let de = 0, ate = linhas.length - 1;
      if (q.range) { de = q.range[0]; ate = q.range[1]; }
      ate = Math.min(ate, de + s.maxLinhas - 1);
      linhas = linhas.slice(de, ate + 1);
      return finalizar(q, projetar(linhas, q.colunas));
    }

    if (q.acao === 'insert' || q.acao === 'upsert') {
      const lista = Array.isArray(q.dados) ? q.dados : [q.dados];
      const novas = [];
      for (const d of lista) {
        /* conflito pela coluna do onConflict (padrao: id) — ou, num insert,
           por qualquer unique declarada na migration */
        const alvo = (q.acao === 'upsert' && q.upsert && q.upsert.onConflict)
          ? q.upsert.onConflict.split(',').map(c => c.trim()) : ['id'];
        const bate = (cols) => (l) => cols.every(c => d[c] !== undefined && d[c] !== null && String(l[c]) === String(d[c]));
        let existe = d && s.tabelas[t].find(bate(alvo));
        if (!existe && d && q.acao === 'insert') {
          for (const u of (UNICAS[t] || [])) {
            if (s.tabelas[t].some(bate(u)) || novas.some(n => n.nova && u.every(c => String(n.nova[c]) === String(d[c])))) {
              return erro('duplicate key value violates unique constraint "' + t + '_' + u.join('_') + '_unique"', '23505');
            }
          }
        }
        if (existe) {
          if (q.acao === 'upsert' && q.upsert && q.upsert.ignoreDuplicates) continue;
          if (q.acao === 'upsert') {                     // merge: update da linha propria
            if (dono(t, existe) !== uid) return erro('new row violates row-level security policy', '42501');
            const e = validarColunas(t, d); if (e) return e;
            novas.push({ merge: existe, d });
            continue;
          }
          return erro('duplicate key value violates unique constraint "' + t + '_pkey"', '23505');
        }
        const l = novaLinha(t, d, uid);
        const e = checarLinha(t, l, uid);
        if (e) return e;                                  // o comando inteiro falha
        novas.push({ nova: l });
      }
      const feitas = novas.map(n => {
        if (n.nova) { s.tabelas[t].push(n.nova); return n.nova; }
        Object.assign(n.merge, n.d);
        if ((COLUNAS[t] || []).includes('updated_at')) n.merge.updated_at = carimbo();
        return n.merge;
      });
      if (!q.retornar) return { data: null, error: null };
      return finalizar(q, projetar(feitas, q.colunas));
    }

    if (q.acao === 'update') {
      const alvo = filtrar(visiveis(t, uid), q.filtros);
      const e0 = validarColunas(t, q.dados); if (e0) return e0;
      for (const l of alvo) {
        const teste = Object.assign({}, l, q.dados);
        const e = checarLinha(t, teste, uid); if (e) return e;
      }
      alvo.forEach(l => {
        Object.assign(l, q.dados);
        if ((COLUNAS[t] || []).includes('updated_at')) l.updated_at = carimbo();
      });
      if (!q.retornar) return { data: null, error: null };
      return finalizar(q, projetar(alvo, q.colunas));
    }

    if (q.acao === 'delete') {
      const alvo = filtrar(visiveis(t, uid), q.filtros);
      if (t === 'patients') {
        for (const p of alvo) {
          for (const filha of COM_PACIENTE) {
            if (s.tabelas[filha].some(l => l.patient_id === p.id)) {
              return erro('update or delete on table "patients" violates foreign key constraint on table "' + filha + '"', '23503');
            }
          }
        }
      }
      const ids = new Set(alvo.map(l => l.id));
      s.tabelas[t] = s.tabelas[t].filter(l => !ids.has(l.id));
      // CASCADE das filhas
      Object.entries(FILHAS).forEach(([filha, [col, mae]]) => {
        if (mae === t) s.tabelas[filha] = s.tabelas[filha].filter(l => !ids.has(l[col]));
      });
      if (!q.retornar) return { data: null, error: null };
      return finalizar(q, projetar(alvo, q.colunas));
    }
    return erro('acao desconhecida ' + q.acao);
  }

  function rpc(uid, nome, args) {
    if (!uid) return erro('permission denied for function ' + nome, '42501');
    if (deveFalhar('rpc:' + nome, 'rpc') || deveFalhar(null, 'rpc')) return erro('falha simulada em rpc ' + nome, 'SIMULADA');
    const p = args && args.payload;
    if (nome === 'salvar_holoscan_completo') {
      if (!p || !p.application || !p.answers || !p.scores) return erro('payload incompleto', 'P0001');
      const a = p.application;
      const app = novaLinha('holoscan_applications', {
        nutritionist_id: uid, patient_id: a.patient_id, quando: a.quando,
        versao_estrutura: a.versao_estrutura, versao_bancos: a.versao_bancos,
        indice: a.indice, indice_maximo: a.indice_maximo, avaliavel: a.avaliavel,
        nota_media: a.nota_media, triada: a.triada, triada_com_dado: a.triada_com_dado,
        cobertura: a.cobertura, combinacoes: a.combinacoes || [], aprofundamentos: a.aprofundamentos || [],
        interpretacao_texto: a.interpretacao_texto || null,
        interpretacao_em: a.interpretacao_em || null,
        interpretacao_versao: a.interpretacao_versao || null
      }, uid);
      const e = checarLinha('holoscan_applications', app, uid);
      if (e) return e;
      s.tabelas.holoscan_applications.push(app);
      p.answers.forEach(r => s.tabelas.holoscan_answers.push(novaLinha('holoscan_answers',
        { application_id: app.id, marcador_id: r.marcador_id, valor: Number(r.valor) }, uid)));
      p.scores.forEach(r => s.tabelas.holoscan_system_scores.push(novaLinha('holoscan_system_scores',
        Object.assign({ application_id: app.id }, r), uid)));
      return { data: app.id, error: null };
    }
    if (nome === 'salvar_coleta_exames') {
      if (!p || !p.collection || !p.results) return erro('payload incompleto', 'P0001');
      const c = p.collection;
      const desconhecida = !!c.data_coleta_desconhecida;
      const dt = desconhecida ? null : (c.coletado_em || new Date().toISOString().slice(0, 10));
      if (!pacienteDe(uid, c.patient_id)) return erro('violates foreign key constraint', '23503');
      let col = s.tabelas.lab_collections.find(x => x.nutritionist_id === uid && x.patient_id === c.patient_id &&
        (desconhecida ? x.data_coleta_desconhecida === true : x.coletado_em === dt));
      if (col) {
        col.laboratorio = c.laboratorio || null; col.observacao = c.observacao || null;
        col.updated_at = carimbo();
        s.tabelas.lab_results = s.tabelas.lab_results.filter(r => r.collection_id !== col.id);
      } else {
        col = novaLinha('lab_collections', { nutritionist_id: uid, patient_id: c.patient_id, coletado_em: dt,
          data_coleta_desconhecida: desconhecida, laboratorio: c.laboratorio || null, observacao: c.observacao || null }, uid);
        s.tabelas.lab_collections.push(col);
      }
      p.results.forEach(r => s.tabelas.lab_results.push(novaLinha('lab_results',
        Object.assign({ collection_id: col.id }, r, { valor: Number(r.valor) }), uid)));
      return { data: col.id, error: null };
    }
    return erro('function ' + nome + ' does not exist', '42883');
  }

  function storage(uid, m) {
    if (!uid) return erro('not authenticated', '42501');
    if (deveFalhar(m.bucket, m.acaoStorage)) return erro('falha simulada em storage/' + m.acaoStorage, 'SIMULADA');
    const b = s.storage[m.bucket];
    if (!b) return erro('Bucket not found', '404');
    const meu = (path) => String(path).split('/')[0] === uid;
    if (m.acaoStorage === 'upload') {
      if (!meu(m.path)) return erro('new row violates row-level security policy', '42501');
      if (b[m.path]) return erro('The resource already exists', '409');
      b[m.path] = { b64: m.b64, tipo: m.tipo, dono: uid };
      return { data: { path: m.path }, error: null };
    }
    if (m.acaoStorage === 'download') {
      const o = b[m.path];
      if (!o || o.dono !== uid) return erro('Object not found', '404');
      return { data: { b64: o.b64, tipo: o.tipo }, error: null };
    }
    if (m.acaoStorage === 'remove') {
      (m.paths || []).forEach(pth => { if (b[pth] && b[pth].dono === uid) delete b[pth]; });
      return { data: [], error: null };
    }
    return erro('op desconhecida');
  }

  s.tratar = (msg) => {
    s.log.push({ op: msg.op, tabela: msg.q && msg.q.tabela, acao: msg.q && msg.q.acao, nome: msg.nome, uid: msg.uid });
    if (msg.op === 'login') {
      const c = s.contas[msg.email];
      if (!c || c.senha !== msg.password) return erro('Invalid login credentials', 'invalid_credentials');
      return { data: { id: c.id }, error: null };
    }
    if (msg.op === 'query') return consultar(msg.uid, msg.q);
    if (msg.op === 'rpc') return rpc(msg.uid, msg.nome, msg.args);
    if (msg.op === 'storage') return storage(msg.uid, msg);
    return erro('op desconhecida');
  };

  /** Linhas cruas de uma tabela (para o teste conferir o servidor). */
  s.linhas = (tabela) => copia(s.tabelas[tabela]);
  s.contarLog = (pred) => s.log.filter(pred).length;

  return s;
}

/* --------------------------------------------------------------------------
   A biblioteca que substitui o supabase-js dentro da pagina.
   -------------------------------------------------------------------------- */
const BIBLIOTECA = `(function () {
  var CHAVE = "sb-falso-auth-token";
  function chamar(msg) { return window.__supaFalso(JSON.stringify(msg)).then(function (t) { return JSON.parse(t); }); }
  function sessao() { try { return JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { return null; } }
  function uid() { var s = sessao(); return s && s.user ? s.user.id : null; }

  function Builder(tabela) {
    this.q = { tabela: tabela, acao: "select", filtros: [], ordem: [], range: null,
               colunas: "*", single: null, opcoes: {}, retornar: false };
  }
  Builder.prototype.select = function (c, o) {
    if (this.q.acao === "select") { this.q.colunas = c || "*"; this.q.opcoes = o || {}; }
    else { this.q.retornar = true; this.q.colunas = c || "*"; }
    return this;
  };
  Builder.prototype.insert = function (d) { this.q.acao = "insert"; this.q.dados = d; return this; };
  Builder.prototype.upsert = function (d, o) { this.q.acao = "upsert"; this.q.dados = d; this.q.upsert = o || {}; return this; };
  Builder.prototype.update = function (d) { this.q.acao = "update"; this.q.dados = d; return this; };
  Builder.prototype["delete"] = function () { this.q.acao = "delete"; return this; };
  ["eq", "neq", "in", "is", "gt", "gte", "lt", "lte"].forEach(function (op) {
    Builder.prototype[op] = function (col, val) { this.q.filtros.push({ op: op, col: col, val: val }); return this; };
  });
  Builder.prototype.order = function (col, o) { this.q.ordem.push({ col: col, asc: !o || o.ascending !== false }); return this; };
  Builder.prototype.range = function (a, b) { this.q.range = [a, b]; return this; };
  Builder.prototype.limit = function (n) { this.q.range = [0, n - 1]; return this; };
  Builder.prototype.single = function () { this.q.single = "single"; return this; };
  Builder.prototype.maybeSingle = function () { this.q.single = "maybe"; return this; };
  Builder.prototype.then = function (ok, falhou) {
    return chamar({ op: "query", uid: uid(), q: this.q }).then(ok, falhou);
  };
  Builder.prototype["catch"] = function (fn) { return this.then(null, fn); };

  function paraBase64(arquivo) {
    return new Promise(function (ok, falhou) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(",")[1] || ""); };
      r.onerror = function () { falhou(r.error); };
      r.readAsDataURL(arquivo);
    });
  }
  function deBase64(b64, tipo) {
    var bin = atob(b64 || ""), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type: tipo || "application/octet-stream" });
  }

  function createClient() {
    var ouvintes = [];
    function emitir(ev, s) {
      setTimeout(function () { ouvintes.slice().forEach(function (fn) { try { fn(ev, s); } catch (e) {} }); }, 0);
    }
    return {
      auth: {
        getSession: function () { return Promise.resolve({ data: { session: sessao() }, error: null }); },
        getUser: function () { var s = sessao(); return Promise.resolve({ data: { user: s ? s.user : null }, error: null }); },
        onAuthStateChange: function (fn) {
          ouvintes.push(fn);
          setTimeout(function () { try { fn("INITIAL_SESSION", sessao()); } catch (e) {} }, 0);
          return { data: { subscription: { unsubscribe: function () {
            var i = ouvintes.indexOf(fn); if (i >= 0) ouvintes.splice(i, 1); } } } };
        },
        signInWithPassword: function (c) {
          return chamar({ op: "login", email: c.email, password: c.password }).then(function (r) {
            if (r.error) return { data: { session: null, user: null }, error: { name: "AuthApiError", message: r.error.message } };
            var s = { access_token: "falso-" + r.data.id, user: { id: r.data.id, email: c.email } };
            localStorage.setItem(CHAVE, JSON.stringify(s));
            emitir("SIGNED_IN", s);
            return { data: { session: s, user: s.user }, error: null };
          });
        },
        signOut: function () {
          localStorage.removeItem(CHAVE);
          emitir("SIGNED_OUT", null);
          return Promise.resolve({ error: null });
        },
        resetPasswordForEmail: function () { return Promise.resolve({ data: {}, error: null }); },
        updateUser: function () { return Promise.resolve({ data: {}, error: null }); }
      },
      from: function (t) { return new Builder(t); },
      rpc: function (nome, args) { return chamar({ op: "rpc", uid: uid(), nome: nome, args: args }); },
      storage: {
        from: function (bucket) {
          return {
            upload: function (path, arquivo) {
              return paraBase64(arquivo).then(function (b64) {
                return chamar({ op: "storage", uid: uid(), bucket: bucket, acaoStorage: "upload", path: path, b64: b64, tipo: arquivo.type });
              });
            },
            download: function (path) {
              return chamar({ op: "storage", uid: uid(), bucket: bucket, acaoStorage: "download", path: path }).then(function (r) {
                if (r.error) return r;
                return { data: deBase64(r.data.b64, r.data.tipo), error: null };
              });
            },
            remove: function (paths) {
              return chamar({ op: "storage", uid: uid(), bucket: bucket, acaoStorage: "remove", paths: paths });
            }
          };
        }
      }
    };
  }
  window.supabase = { createClient: createClient };
})();`;

/**
 * Liga uma pagina ao servidor falso. Chamar ANTES do goto.
 */
export async function ligarPagina(page, servidor) {
  await page.exposeFunction('__supaFalso', (texto) => {
    let r;
    try { r = servidor.tratar(JSON.parse(texto)); }
    catch (e) { r = { data: null, error: { message: 'erro no servidor falso: ' + e.message, code: 'FALSO' } }; }
    return JSON.stringify(r);
  });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/.test(url)) {
      req.respond({ status: 200, contentType: 'text/javascript', body: BIBLIOTECA });
      return;
    }
    if (!/^http:\/\/127\.0\.0\.1:5500\//.test(url) && !/^(data|blob):/.test(url)) {
      req.abort();   // nada sai para a rede de verdade
      return;
    }
    req.continue();
  });
}
