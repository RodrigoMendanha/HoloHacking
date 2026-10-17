"""Trilha ORIGINAL do video Instagram (60 s) — piano em ostinato + cordas (violinos/violoncelos) + pad, clima cinematografico.
Composta e sintetizada aqui (sem amostras nem melodia de terceiros: livre de direitos por construcao).
Estrutura: 0-10 piano sozinho (dor) · 10-17 entram os graves · 17-24 abertura (posicionamento) · 24-40 pulso + violino
· 40-52 apice (beneficios) · 52-60 resolucao e cauda.   Uso: python3 trilha.py [saida.wav]
"""
import sys, wave
import numpy as np

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida/trilha.wav'
SR = 44100
DUR = 60.0
N = int((DUR + 4) * SR)          # +4 s de cauda (cortada no fade final)
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
BPM = 96.0
BEAT = 60.0 / BPM               # 0,625 s
BAR = 4 * BEAT                  # 2,5 s
# progressao (2 compassos = 5 s por acorde): Am - F - C - G  (ciclo de 20 s, 3 ciclos)
ACORDES = [(57, [69, 72, 76]), (53, [69, 72, 77]), (48, [67, 72, 76]), (55, [67, 71, 74])]   # (baixo, [notas do ostinato])
def acorde(t): return ACORDES[int(t // (2 * BAR)) % 4]

def env_secao(t, pts):
    xs, ys = zip(*pts)
    return float(np.interp(t, xs, ys))

def por(sig, t0, l, r):
    i0 = max(0, int(t0 * SR)); i1 = min(N, i0 + len(sig))
    if i1 <= i0: return
    L[i0:i1] += sig[:i1 - i0] * l; R[i0:i1] += sig[:i1 - i0] * r

# ---------- piano: parciais com leve inarmonicidade, decaimento por parcial, ataque de martelo ----------
def piano(m, dur, vel):
    f = hz(m); n = int((dur + 1.8) * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    B = 0.0004
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > SR / 2.2: break
        a = (1.0 / k ** 1.25) * (1.0 if k > 1 else 1.15)
        dec = 0.9 + 0.55 * k + f / 900.0
        s += a * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28)) * np.exp(-t * dec)
    s += 0.02 * rng.standard_normal(n) * np.exp(-t * 90)              # martelo
    atk = np.minimum(1, t / 0.004)
    rel = np.where(t > dur, np.exp(-(t - dur) * 7), 1.0)               # abafador ao soltar
    return s * atk * rel * vel * 0.16

# ---------- cordas: dente-de-serra limitada em banda, 3 vozes desafinadas, vibrato, ataque lento ----------
def corda(m, dur, vel, brilho=10, atk_s=0.7):
    f = hz(m); n = int((dur + 1.2) * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    vib = 1 + 0.0045 * np.sin(2 * np.pi * 5.3 * t + rng.uniform(0, 6)) * np.minimum(1, t / 1.2)
    for d in (-0.06, 0.0, 0.07):
        fd = f * 2 ** (d / 12)
        fase = 2 * np.pi * np.cumsum(fd * vib) / SR
        for k in range(1, brilho + 1):
            if fd * k > SR / 2.4: break
            s += (1.0 / k) * (0.88 ** k) * np.sin(k * fase + rng.uniform(0, 6))
    env = np.minimum(1, t / atk_s) * np.where(t > dur, np.exp(-(t - dur) * 3.2), 1.0)
    return s * env * vel * 0.035

# ---------- pad (tipo orgao suave) ----------
def pad(notas, t0, dur, vel):
    n = int((dur + 1.5) * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for m in notas:
        f = hz(m)
        for k, a in ((1, 1), (2, .45), (3, .18), (4, .08)):
            s += a * (np.sin(2 * np.pi * f * k * t) + np.sin(2 * np.pi * f * k * 1.0015 * t))
    env = np.minimum(1, t / 1.6) * np.where(t > dur, np.exp(-(t - dur) * 2.2), 1.0)
    return s * env * vel * 0.012

# ===== piano: ostinato de colcheias (alternando notas do acorde), presente o tempo todo =====
COL = BEAT / 2
t = 0.0; i = 0
while t < 57.5:
    baixo, nt = acorde(t)
    padrao = [nt[0], nt[2], nt[1], nt[2]]          # balanço de relógio
    m = padrao[i % 4] + (12 if 40 <= t < 52 and i % 2 else 0)
    vel = env_secao(t, [(0, .55), (9, .62), (17, .72), (24, .78), (40, .9), (52, .8), (57.5, .45)]) * (1.0 if i % 2 == 0 else 0.82)
    vel *= 1 + rng.uniform(-0.05, 0.05)
    p = piano(m, COL * 0.95, vel)
    pan = 0.5 + 0.18 * np.sin(i * 0.7)
    por(p, t + rng.uniform(-0.004, 0.004), 1.1 - pan, 0.5 + pan)
    t += COL; i += 1
# baixo do piano (semibreves a cada 2 compassos)
for k in range(12):
    t0 = k * 2 * BAR
    if t0 > 57: break
    b, _ = acorde(t0 + .01)
    v = env_secao(t0, [(0, .35), (10, .55), (40, .8), (55, .6)])
    por(piano(b - 12, 2 * BAR * .95, v), t0, .6, .6)
# acorde final do piano (lá menor -> pousa em lá com nona, aberto)
for m in (45, 57, 64, 69, 71, 76):
    por(piano(m, 5.0, .55), 57.5, .6, .6)

# ===== cordas graves (violoncelos) a partir de 10 s =====
for k in range(12):
    t0 = k * 2 * BAR
    if t0 < 10 or t0 > 55: continue
    b, nt = acorde(t0 + .01)
    v = env_secao(t0, [(10, .5), (17, .8), (40, 1.1), (52, .8)])
    por(corda(b - 12, 2 * BAR, v, brilho=8, atk_s=1.0), t0, .65, .55)
    por(corda(b, 2 * BAR, v * .55, brilho=8, atk_s=1.2), t0, .5, .7)

# ===== pad de orgao a partir de 17 s (abertura) =====
for k in range(12):
    t0 = k * 2 * BAR
    if t0 < 17.5 or t0 > 55: continue
    b, nt = acorde(t0 + .01)
    v = env_secao(t0, [(17, .7), (40, 1.0), (52, .7)])
    por(pad([b, b + 7, nt[0] - 12, nt[1] - 12], t0, 2 * BAR, v), t0, .6, .6)

# ===== violino: melodia original em notas longas (24-57 s), uma oitava acima no apice =====
MEL = {0: [(76, 2), (74, 2)], 1: [(72, 2), (69, 2)], 2: [(76, 2), (79, 2)], 3: [(74, 3), (71, 1)]}
t0 = 25.0
while t0 < 55:
    k = int(t0 // (2 * BAR)) % 4
    tt = t0
    for m, compassos in MEL[k]:
        d = compassos * BAR / 2
        sobe = 12 if 40 <= tt < 52 else 0
        v = env_secao(tt, [(25, .55), (32, .75), (40, 1.05), (50, 1.0), (55, .6)])
        por(corda(m + sobe, d * .98, v, brilho=12, atk_s=.45), tt, .45, .8)
        if tt >= 40: por(corda(m + sobe - 12, d * .98, v * .5, brilho=10, atk_s=.5), tt, .8, .45)   # dobra uma oitava abaixo
        tt += d
    t0 += 2 * BAR
# nota final longa do violino
por(corda(76, 4.0, .6, brilho=12, atk_s=.8), 55.0, .5, .75)

# ===== reverberação de sala (resposta ao impulso sintética, estéreo) =====
def reverb(x, seed, seg=3.2):
    r = np.random.default_rng(seed)
    n = int(seg * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 2.4)
    ir[:int(.012 * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
    tam = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, tam) * np.fft.rfft(ir, tam), tam)[:len(x)]
    return y
wet = .38
L2 = L * (1 - wet) + reverb(L, 1) * wet * 2.2
R2 = R * (1 - wet) + reverb(R, 2) * wet * 2.2

# fade de entrada curto, fade final 57-60 s, corte em 60 s
tt = np.arange(N) / SR
fade = np.minimum(1, tt / 0.6) * np.clip((60.0 - tt) / 3.0, 0, 1)
L2 *= fade; R2 *= fade
L2, R2 = L2[:int(DUR * SR)], R2[:int(DUR * SR)]
pico = max(np.max(np.abs(L2)), np.max(np.abs(R2)))
g = 0.89 / pico
st = np.empty(2 * len(L2)); st[0::2] = L2 * g; st[1::2] = R2 * g
pcm = (np.tanh(st * 1.05) / np.tanh(1.05) * 32767).astype('<i2')
with wave.open(SAIDA, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('trilha:', SAIDA, f'{DUR:.0f} s')
