'use client';

import { useState, useEffect, useMemo } from 'react';
import Script from 'next/script';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

/* ---------- types matching HOLOSCOPE browser API ---------- */

interface Pergunta { id: string; origem: string; rotulo: string; pergunta: string }
interface Resposta { marcador_id: string; intensidade: number }

interface Contribuicao {
  marcador_id: string; rotulo: string; origem: string;
  peso: number; intensidade: number; pontos: number; fonte: string;
}
interface NotaSistema {
  sistema: string; nome: string; nota: number; carga: number; faixa: string;
  obtido: number; maximo: number; respondidos: number; total_marcadores: number;
  dominantes: Contribuicao[];
}
interface CombDisparada { id: string; leitura: string; condicao: string; fonte: string }
interface Pontuacao {
  indice: number; indice_maximo: number; nota_media: number;
  sistemas: NotaSistema[];
  triada: Record<string, number>;
  frequencias: { chacra: string; nota: number; leitura: string }[];
  combinacoes: CombDisparada[];
  cobertura: { respondidos: number; total: number; percentual: number };
  auditoria: Contribuicao[];
}

declare global {
  interface Window {
    HOLOSCOPE: {
      questionario: () => Pergunta[];
      calcular: (r: Resposta[]) => Pontuacao;
      sistemas: () => { id: string; nome: string; cor: string; padrao_emocional: string; impacto_espiritual: string }[];
      resumo: () => { marcadores: number; por_origem: Record<string, number>; sistemas: number; combinacoes: number; mensagens: number };
      mensagem: (s: string, n: number, r: string) => { texto: string; primeiros_passos: string; faixa: string; fonte: string } | null;
    };
  }
}

/* ---------- constants ---------- */

const SECTION_META: Record<string, { label: string; desc: string; color: string }> = {
  sintoma:    { label: 'Corpo',    desc: 'Sintomas fisicos e funcionais',         color: '#B4553C' },
  emocao:     { label: 'Mente',    desc: 'Padroes emocionais e comportamentais',  color: '#C7A76C' },
  espiritual: { label: 'Espirito', desc: 'Conexao, proposito e dimensao sutil',   color: '#0E3A64' },
};

const SECTION_ORDER = ['sintoma', 'emocao', 'espiritual'];

const INTENSITY_LABELS = ['Ausente', 'Leve', 'Moderado', 'Intenso'];
const INTENSITY_COLORS = ['#334155', '#4F7D8C', '#C7A76C', '#B4553C'];

const SYSTEM_COLORS: Record<string, string> = {
  fungico: '#7E8B5A',
  acido_inflamatorio: '#B4553C',
  metabolico: '#C7A76C',
  detox_linfatico: '#4F7D8C',
  mental_emocional_espiritual: '#0E3A64',
};

const FAIXA_LABELS: Record<string, { label: string; color: string }> = {
  baixo: { label: 'Atencao', color: '#B4553C' },
  medio: { label: 'Moderado', color: '#C7A76C' },
  alto:  { label: 'Saudavel', color: '#7E8B5A' },
};

const TRIADA_LABELS: Record<string, string> = {
  fisico: 'Fisico',
  mental: 'Mental',
  espiritual: 'Espiritual',
};
const TRIADA_COLORS: Record<string, string> = {
  fisico: '#B4553C',
  mental: '#C7A76C',
  espiritual: '#0E3A64',
};

/* ---------- demo data (exemplo-01.json) ---------- */

const DEMO_RESPOSTAS: Record<string, number> = {
  'SNT-101':1,'SNT-102':1,'SNT-103':1,'SNT-104':1,'SNT-105':1,
  'SNT-106':1,'SNT-107':1,'SNT-108':1,'SNT-109':1,'SNT-110':1,'SNT-111':1,
  'SNT-201':1,'SNT-202':1,'SNT-203':1,'SNT-204':1,'SNT-205':1,
  'SNT-206':1,'SNT-207':1,'SNT-208':1,'SNT-209':1,'SNT-210':1,
  'SNT-301':3,'SNT-302':3,'SNT-303':3,'SNT-304':3,'SNT-305':3,
  'SNT-306':3,'SNT-307':3,'SNT-308':3,'SNT-309':3,'SNT-310':3,
  'SNT-401':1,'SNT-402':1,'SNT-403':1,'SNT-404':1,'SNT-405':1,
  'SNT-406':1,'SNT-407':1,'SNT-408':1,'SNT-409':1,'SNT-410':1,
  'SNT-501':3,'SNT-502':3,'SNT-503':3,'SNT-504':3,'SNT-505':3,
  'SNT-506':3,'SNT-507':3,'SNT-508':3,'SNT-509':3,'SNT-510':3,
  'EMO-101':1,'EMO-102':1,'EMO-103':1,
  'EMO-201':1,'EMO-202':1,'EMO-203':1,'EMO-204':1,
  'EMO-301':3,'EMO-302':3,'EMO-303':3,
  'EMO-401':1,'EMO-402':1,'EMO-403':1,
  'EMO-501':3,'EMO-502':3,'EMO-503':3,'EMO-504':3,'EMO-505':3,'EMO-506':3,'EMO-507':3,
  'ESP-101':3,'ESP-102':3,'ESP-103':3,
  'ESP-201':3,'ESP-202':3,'ESP-203':1,
  'ESP-301':3,'ESP-302':3,'ESP-303':3,
  'ESP-401':3,'ESP-402':3,'ESP-403':3,'ESP-404':1,'ESP-405':1,
  'ESP-501':1,'ESP-502':1,
};

/* ---------- component ---------- */

type View = 'loading' | 'intro' | 'quiz' | 'results';

export default function Home() {
  const [view, setView] = useState<View>('loading');
  const [ready, setReady] = useState(false);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [secaoIdx, setSecaoIdx] = useState(0);
  const [pontuacao, setPontuacao] = useState<Pontuacao | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  }

  function onHoloscope() {
    setReady(true);
    const qs = window.HOLOSCOPE.questionario();
    setPerguntas(qs);
    setView('intro');
  }

  const sections = useMemo(() => {
    const grouped: Record<string, Pergunta[]> = {};
    for (const p of perguntas) {
      (grouped[p.origem] ??= []).push(p);
    }
    return SECTION_ORDER.filter(k => grouped[k]).map(k => ({
      key: k,
      ...SECTION_META[k],
      perguntas: grouped[k],
    }));
  }, [perguntas]);

  const currentSection = sections[secaoIdx];

  function setResposta(id: string, valor: number) {
    setRespostas(prev => ({ ...prev, [id]: valor }));
  }

  function loadDemo() {
    setRespostas(DEMO_RESPOSTAS);
    setView('quiz');
    setSecaoIdx(0);
  }

  function startFresh() {
    setRespostas({});
    setView('quiz');
    setSecaoIdx(0);
  }

  function calcular() {
    const rs: Resposta[] = perguntas.map(p => ({
      marcador_id: p.id,
      intensidade: respostas[p.id] ?? 0,
    }));
    const result = window.HOLOSCOPE.calcular(rs);
    setPontuacao(result);
    setView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function voltarInicio() {
    setPontuacao(null);
    setView('intro');
  }

  /* progress within quiz */
  const answeredInSection = currentSection
    ? currentSection.perguntas.filter(p => respostas[p.id] !== undefined).length
    : 0;
  const totalInSection = currentSection?.perguntas.length ?? 0;
  const totalAnswered = perguntas.filter(p => respostas[p.id] !== undefined).length;

  return (
    <>
      <Script
        src="/holoscope.js"
        strategy="afterInteractive"
        onLoad={onHoloscope}
      />

      {/* navbar */}
      {view !== 'loading' && (
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          padding: '10px 24px', background: 'rgba(10,14,23,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 3, color: 'var(--accent-light)', cursor: 'pointer' }} onClick={voltarInicio}>
            HOLOSCOPE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{user.email}</span>
                <button onClick={handleLogout} style={{ fontSize: 12, color: 'var(--accent-light)', background: 'none', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: 6 }}>
                  Sair
                </button>
              </>
            ) : (
              <button onClick={() => router.push('/login')} style={{ fontSize: 12, color: 'var(--accent-light)', background: 'none', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: 6 }}>
                Entrar
              </button>
            )}
          </div>
        </nav>
      )}

      {view === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 4, color: 'var(--accent-light)' }}>
              HOLOSCOPE
            </div>
            <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 14 }}>Carregando motor...</div>
          </div>
        </div>
      )}

      {view === 'intro' && <IntroView onStart={startFresh} onDemo={loadDemo} />}
      {view === 'quiz' && currentSection && (
        <QuizView
          section={currentSection}
          secaoIdx={secaoIdx}
          totalSections={sections.length}
          respostas={respostas}
          setResposta={setResposta}
          answeredInSection={answeredInSection}
          totalInSection={totalInSection}
          totalAnswered={totalAnswered}
          totalPerguntas={perguntas.length}
          onPrev={() => secaoIdx > 0 ? setSecaoIdx(secaoIdx - 1) : setView('intro')}
          onNext={() => secaoIdx < sections.length - 1 ? setSecaoIdx(secaoIdx + 1) : calcular()}
          isLast={secaoIdx === sections.length - 1}
        />
      )}
      {view === 'results' && pontuacao && <ResultsView pontuacao={pontuacao} onRedo={voltarInicio} />}
    </>
  );
}

/* ============================================================
   INTRO
   ============================================================ */

function IntroView({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return (
    <div className="fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="container" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ marginBottom: 12, color: 'var(--text-dim)', fontSize: 13, letterSpacing: 6, textTransform: 'uppercase' }}>
          HoloHacking
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 8vw, 64px)', fontWeight: 800, letterSpacing: 2, marginBottom: 16, background: 'linear-gradient(135deg, #6ba3b5, #C7A76C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          HOLOSCOPE
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.6 }}>
          Avaliacao Integrativa de Nutricao Holistica.
          <br />
          87 marcadores &middot; 5 sistemas &middot; 3 eixos da Triada HOLOS.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={onStart}>
            Iniciar Avaliacao
          </button>
          <button className="btn-outline" onClick={onDemo}>
            Carregar Demo
          </button>
        </div>

        <div style={{ marginTop: 80, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, textAlign: 'left' }}>
          {[
            { label: 'Corpo', desc: 'Sintomas fisicos e funcionais dos 5 sistemas', color: '#B4553C' },
            { label: 'Mente', desc: 'Padroes emocionais e comportamentais', color: '#C7A76C' },
            { label: 'Espirito', desc: 'Dimensao sutil, proposito e conexao', color: '#0E3A64' },
          ].map(({ label, desc, color }) => (
            <div key={label} className="card" style={{ borderTop: `3px solid ${color}` }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color }}>{label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   QUIZ
   ============================================================ */

interface QuizProps {
  section: { key: string; label: string; desc: string; color: string; perguntas: Pergunta[] };
  secaoIdx: number;
  totalSections: number;
  respostas: Record<string, number>;
  setResposta: (id: string, v: number) => void;
  answeredInSection: number;
  totalInSection: number;
  totalAnswered: number;
  totalPerguntas: number;
  onPrev: () => void;
  onNext: () => void;
  isLast: boolean;
}

function QuizView({
  section, secaoIdx, totalSections, respostas, setResposta,
  answeredInSection, totalInSection, totalAnswered, totalPerguntas,
  onPrev, onNext, isLast,
}: QuizProps) {
  return (
    <div className="fade-in" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <div className="container" style={{ paddingTop: 32 }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
              Secao {secaoIdx + 1} de {totalSections}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: section.color }}>
              {section.label}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{section.desc}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-light)' }}>
              {totalAnswered}/{totalPerguntas}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>respondidas</div>
          </div>
        </div>

        {/* progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
          {Array.from({ length: totalSections }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i < secaoIdx ? section.color : i === secaoIdx ? section.color : 'var(--border)',
              opacity: i === secaoIdx ? 1 : i < secaoIdx ? 0.6 : 0.3,
            }} />
          ))}
        </div>

        {/* questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {section.perguntas.map((p, qi) => {
            const selected = respostas[p.id];
            return (
              <div key={p.id} className="card" style={{ padding: '16px 20px', transition: 'border-color 0.15s', borderColor: selected !== undefined ? section.color + '40' : 'var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{p.rotulo}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.pergunta}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {INTENSITY_LABELS.map((label, val) => (
                      <button
                        key={val}
                        onClick={() => setResposta(p.id, val)}
                        style={{
                          padding: '8px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: '1px solid',
                          borderColor: selected === val ? INTENSITY_COLORS[val] : 'var(--border)',
                          background: selected === val ? INTENSITY_COLORS[val] + '30' : 'transparent',
                          color: selected === val ? INTENSITY_COLORS[val] : 'var(--text-dim)',
                          minWidth: 70,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* navigation */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px',
          background: 'linear-gradient(transparent, var(--bg) 30%)',
          display: 'flex', justifyContent: 'center', gap: 16,
        }}>
          <button className="btn-outline" onClick={onPrev}>
            Voltar
          </button>
          <button className="btn-primary" onClick={onNext}>
            {isLast ? 'Ver Resultados' : 'Proximo'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RESULTS
   ============================================================ */

function ResultsView({ pontuacao, onRedo }: { pontuacao: Pontuacao; onRedo: () => void }) {
  const { indice, indice_maximo, sistemas, triada, combinacoes, cobertura } = pontuacao;
  const pct = (indice / indice_maximo) * 100;
  const indiceColor = pct >= 70 ? '#7E8B5A' : pct >= 40 ? '#C7A76C' : '#B4553C';

  return (
    <div className="fade-in" style={{ paddingBottom: 80 }}>
      <div className="container" style={{ paddingTop: 40 }}>

        {/* header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
            Resultado
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: 1 }}>
            Indice HOLOS
          </h2>
        </div>

        {/* gauge */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ position: 'relative', display: 'inline-block', width: 200, height: 200 }}>
            <svg viewBox="0 0 200 200" width="200" height="200">
              <circle cx="100" cy="100" r="85" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle
                cx="100" cy="100" r="85" fill="none"
                stroke={indiceColor} strokeWidth="10"
                strokeDasharray={`${pct * 5.34} ${534 - pct * 5.34}`}
                strokeDashoffset="133.5"
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: indiceColor }}>{indice}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>de {indice_maximo}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-muted)' }}>
            Cobertura: {cobertura.respondidos}/{cobertura.total} marcadores ({cobertura.percentual}%)
          </div>
        </div>

        {/* triada */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>Triada HOLOS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {(['fisico', 'mental', 'espiritual'] as const).map(eixo => {
              const val = triada[eixo] ?? 0;
              return (
                <div key={eixo} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: TRIADA_COLORS[eixo] }}>{val.toFixed(1)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{TRIADA_LABELS[eixo]}</div>
                  <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${val * 10}%`, background: TRIADA_COLORS[eixo], borderRadius: 3, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* sistemas */}
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>Sistemas</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {sistemas.map(s => {
            const cor = SYSTEM_COLORS[s.sistema] ?? 'var(--accent)';
            const faixa = FAIXA_LABELS[s.faixa] ?? { label: s.faixa, color: 'var(--text-muted)' };
            return (
              <div key={s.sistema} className="card" style={{ borderLeft: `4px solid ${cor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{s.nome}</span>
                    <span style={{
                      marginLeft: 10, fontSize: 11, fontWeight: 600, padding: '2px 8px',
                      borderRadius: 4, background: faixa.color + '25', color: faixa.color,
                    }}>
                      {faixa.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: cor }}>{s.nota.toFixed(1)}</div>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', width: `${s.nota * 10}%`, background: cor, borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>
                {s.dominantes.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    Marcadores dominantes: {s.dominantes.slice(0, 5).map(d => d.rotulo).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* combinacoes */}
        {combinacoes.length > 0 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>Leituras Combinadas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {combinacoes.map(c => (
                <div key={c.id} className="card" style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{c.leitura}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>{c.id} &middot; {c.fonte}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* footer */}
        <div style={{ textAlign: 'center', marginTop: 40, paddingBottom: 40 }}>
          <button className="btn-outline" onClick={onRedo}>Nova Avaliacao</button>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 24, maxWidth: 480, margin: '24px auto 0', lineHeight: 1.5 }}>
            Este resultado e uma ferramenta de apoio a nutricao holistica integrativa.
            Nao substitui diagnostico medico. Sempre consulte profissionais de saude qualificados.
          </p>
        </div>
      </div>
    </div>
  );
}
