'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.push('/');
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      setMessage('Verifique seu email para confirmar o cadastro.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', letterSpacing: 6, textTransform: 'uppercase', marginBottom: 8 }}>
            HoloHacking
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #6ba3b5, #C7A76C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            HOLOSCOPE
          </h1>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: 15, outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: 15, outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#B4553C', background: '#B4553C15', padding: '10px 14px', borderRadius: 8 }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ fontSize: 13, color: '#7E8B5A', background: '#7E8B5A15', padding: '10px 14px', borderRadius: 8 }}>
                {message}
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? '...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
            {mode === 'login' ? (
              <>Nao tem conta? <button onClick={() => { setMode('signup'); setError(''); }} style={{ color: 'var(--accent-light)', background: 'none', textDecoration: 'underline' }}>Criar conta</button></>
            ) : (
              <>Ja tem conta? <button onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--accent-light)', background: 'none', textDecoration: 'underline' }}>Entrar</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
