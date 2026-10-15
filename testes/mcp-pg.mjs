/**
 * Apoio dos testes do MCP no PostgreSQL LOCAL (banco "mcp", montado por scripts/montar-banco-mcp-local.sh com TODAS as
 * migrations). Liga o cluster local se ele existir e estiver parado; monta o banco se faltar. Sem PostgreSQL local, os
 * testes que dependem dele avisam "PULADO" (nunca tocam banco remoto: so socket unix local).
 * Fixtures FICTICIAS: nutricionista (ativa ou pendente), paciente, atendimento, HOLOSCAN oficial, ferramentas, Mapeamento.
 */
import pg from 'pg';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const SOCK = process.env.MCP_PGHOST || '/tmp/pgsock', PORTA = Number(process.env.MCP_PGPORT || 55432), DADOS = '/tmp/pgcad/data';
const R = new URL('../', import.meta.url).pathname;

async function tentar(db) {
  const c = new pg.Client({ host: SOCK, port: PORTA, user: 'postgres', database: db });
  try { await c.connect(); return c; } catch (e) { try { await c.end(); } catch {} return null; }
}

/* devolve um cliente (superusuario LOCAL) no banco "mcp", ou null quando nao ha PostgreSQL local */
export async function conectar() {
  if (!SOCK.startsWith('/')) throw new Error('so socket local');
  let c = await tentar('postgres');
  if (!c && existsSync(DADOS)) {
    try { execSync(`su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D ${DADOS} -l /tmp/pgcad/log -o '-k ${SOCK} -p ${PORTA}' start"`, { stdio: 'ignore' }); } catch {}
    for (let i = 0; i < 20 && !c; i++) { await new Promise(r => setTimeout(r, 300)); c = await tentar('postgres'); }
  }
  if (!c) return null;
  const tem = (await c.query("select 1 from pg_database where datname = 'mcp'")).rowCount;
  let precisa = !tem;
  if (tem) {
    const m = await tentar('mcp');
    precisa = !(await m.query("select to_regclass('public.mcp_keys') is not null as ok")).rows[0].ok;
    await m.end();
  }
  await c.end();
  if (precisa) execSync('sh scripts/montar-banco-mcp-local.sh', { cwd: R, stdio: 'ignore', env: Object.assign({}, process.env, { PGHOST: SOCK, PGPORT: String(PORTA) }) });
  return tentar('mcp');
}

/* executa fn(q) COMO a nutricionista (o que o PostgREST faz): role authenticated + claims, numa transacao */
export async function como(c, uid, fn) {
  await c.query('begin');
  try {
    await c.query('set local role authenticated');
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    const r = await fn((t, p) => c.query(t, p).then(x => x.rows));
    await c.query('commit');
    return r;
  } catch (e) { await c.query('rollback'); throw e; }
}

export async function criarNutri(c, { ativa = true, nome = 'Nutri Ficticia MCP' } = {}) {
  const id = randomUUID();
  await c.query('insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)', [id, 'mcp-' + id.slice(0, 8) + '@local.invalid', { nome }]);
  if (ativa) await c.query("update public.profiles set status = 'ativo' where id = $1", [id]);
  return id;
}

/* paciente com 1a consulta, HOLOSCAN oficial (Metabolico e Detox como areas prioritarias), 4 ferramentas e Mapeamento */
export async function criarCaso(c, uid, { nome = 'Paciente Ficticia MCP', comHoloscan = true, comMapeamento = true } = {}) {
  return como(c, uid, async (q) => {
    const [p] = await q('insert into public.patients (nutritionist_id, nome, nascimento, sexo, telefone) values ($1, $2, $3, $4, $5) returning id', [uid, nome, '1990-05-10', 'F', '62900000000']);
    const [e] = await q("insert into public.encounters (nutritionist_id, patient_id, occurred_at, timezone, type, modality) values ($1, $2, now() - interval '2 hours', 'America/Sao_Paulo', 'consulta', 'presencial') returning id", [uid, p.id]);
    let h = null;
    if (comHoloscan) {
      const [mp] = await q("select id, version, content_hash from public.methodology_packages where status = 'aprovado' and effective_from <= current_date and (effective_to is null or effective_to >= current_date) order by version desc limit 1");
      const ans = await q('select q.stable_id as marcador_id, s.min_value + 1 as valor from public.methodology_questions q join public.methodology_scales s on s.package_id = q.package_id and s.code = q.scale_code where q.package_id = $1 order by q.stable_id', [mp.id]);
      const sis = await q("select y.code, y.name, (select count(*)::int from public.methodology_associations x where x.package_id = $1 and x.destination_type = 'system' and x.role = 'primaria' and x.destination_id = y.code) as n from public.methodology_systems y where y.package_id = $1 order by y.code", [mp.id]);
      const NOTA = { metabolico: [3.8, 'intermediaria'], detox_linfatico: [6.7, 'alta'], mental_emocional_espiritual: [8.7, 'alta'], fungico: [10, 'alta'], acido_inflamatorio: [10, 'alta'] };
      const scores = sis.map(s => ({ sistema: s.code, nome: s.name, nota: (NOTA[s.code] || [8, 'alta'])[0], carga: 10 - (NOTA[s.code] || [8])[0], faixa: (NOTA[s.code] || [8, 'alta'])[1],
        obtido: 1, maximo: 2, respondidos: s.n, total_marcadores: s.n, avaliavel: true }));
      const payload = { application: { patient_id: p.id, encounter_id: e.id, quando: new Date().toISOString().slice(0, 10), versao_estrutura: 3, indice: 78, indice_maximo: 100, avaliavel: true,
          nota_media: 7.8, triada: { fisico: 8, mental: 8.9, espiritual: 8.3 }, triada_com_dado: { fisico: true, mental: true, espiritual: true },
          cobertura: { respondidos: ans.length, total: ans.length }, combinacoes: [], aprofundamentos: [],
          methodology_package_id: mp.id, methodology_package_version: mp.version, methodology_content_hash: mp.content_hash,
          engine_version: 'motor-generico-2.0.0', engine_contract_version: 'holoscan-motor-contrato-v1', calculation_mode: 'oficial' },
        answers: ans, scores };
      [{ salvar_holoscan_completo: h }] = await q('select public.salvar_holoscan_completo($1::jsonb)', [payload]);
    }
    const tool = async (id, r) => (await q("insert into public.tool_applications (nutritionist_id, patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas, iniciada_em, concluida_em) values ($1, $2, $3, $4, '1', 'concluida', $5, now(), now()) returning id",
      [uid, p.id, e.id, id, r]))[0].id;
    const T = {
      rotina: await tool('mapa_rotina_v1', { acorda: '06:30', dorme: '23:30', sono: 'Acorda cansada', trabalho: 'Escritório, 9h às 18h', dificuldade: 'Fim da tarde: fome forte e cansaço', disponiveis: 'Manhã cedo e almoço', espacos: 'Preparar o lanche da tarde na noite anterior' }),
      momentum: await tool('linha_momentum', { energia: 4, carga: 8, controle: 4, suporte: 6, espaco_mental: 4, estabilidade: 6, sustenta: 'Gosta de cozinhar no fim de semana', limita: 'Jornada longa', nao_pedir: 'Mudanças grandes no jantar agora', estado: 'Reorganizar' }),
      pqq: await tool('pqq', { objetivo: 'ter mais disposição à tarde', r1: 'para render melhor no trabalho', r2: 'para chegar em casa com energia', verdadeiro: 'sentir que dou conta da minha rotina' }),
      oq3: await tool('oq3', { quer: 'chegar à noite com menos fome', precisa: 'comer melhor à tarde', consegue: 'levar um lanche pronto de casa' })
    };
    if (comMapeamento) await q("insert into public.anamneses (nutritionist_id, patient_id, encounter_id, revision_number, status, content_version, content) values ($1, $2, $3, 1, 'salvo', 2, $4)",
      [uid, p.id, e.id, { formulario_versao: 2, tipo: 'primeira', meta: {}, dominios: {}, formulario: {
        motivo: { motivo: 'Cansaço no fim da tarde e fome forte à noite', objetivo: 'Ter mais disposição à tarde', mudar_primeiro: 'O lanche da tarde', ajudou: 'Levar marmita nos dias de escritório' },
        alimentar: { dificuldade: 'Belisco quando chego em casa', maior_fome: ['Tarde', 'Noite'], dificuldades: ['Falta de tempo', 'Comer à noite'] },
        saude: { sinal_principal: 'Fome muito intensa ou difícil de controlar' } } }]);
    return { PA: p.id, E1: e.id, H: h, T };
  });
}
