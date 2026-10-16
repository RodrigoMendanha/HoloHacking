"""Trilhas ORIGINAIS dos 5 videos comerciais (sintetizadas aqui, sem amostras nem melodia de terceiros: livres de direitos).
Uso: python3 trilhas.py '<spec json>' saida.wav
  spec = {"estilo": "cinematico|pop|lofi|violao|ambiente", "dur": 60, "energia": [[t, 0..1], ...], "marcas": [t, ...]}
A curva de ENERGIA vem do roteiro do video (mesma fonte dos tempos das cenas): as camadas entram e saem com ela,
e as MARCAS sao os acentos (viradas, impactos) nos cortes importantes.
  cinematico  piano em arpejo + violoncelos + violinos + pad, Re menor, 72 bpm        (V1 — manifesto)
  pop         plucks, baixo, bumbo 4x4, palmas, chimbal, risers, Fa-Do-Sol-Lam, 120 bpm (V2 — 5 diferenciais)
  lofi        piano eletrico (Rhodes), batida suave com swing, vinil, glockenspiel, 82 bpm (V3 — simples assim)
  violao      violao dedilhado (Karplus-Strong) + violoncelo + shaker, Sol maior, 92 bpm   (V4 — dois lados)
  ambiente    pads, tigelas tibetanas, piano esparso -> cordas e pulso no apice, Mi, 64 bpm (V5 — jornada)
"""
import sys, json, wave
import numpy as np

SPEC = json.loads(sys.argv[1]); SAIDA = sys.argv[2]
SR = 44100
DUR = float(SPEC['dur'])
N = int((DUR + 5) * SR)
rng = np.random.default_rng(abs(hash(SPEC['estilo'])) % 1000 + 7)
L = np.zeros(N); R = np.zeros(N)
EP = SPEC.get('energia') or [[0, .5], [DUR, .5]]
_ex, _ey = zip(*EP)
def E(t): return float(np.interp(t, _ex, _ey))
MARCAS = SPEC.get('marcas') or []

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def por(sig, t0, l=.6, r=.6):
    if t0 >= DUR + 4: return
    i0 = int(t0 * SR);
    if i0 < 0: sig = sig[-i0:]; i0 = 0
    i1 = min(N, i0 + len(sig))
    if i1 <= i0: return
    L[i0:i1] += sig[:i1 - i0] * l; R[i0:i1] += sig[:i1 - i0] * r
def tt(d): return np.arange(int(d * SR)) / SR

# ------------------------------------------------------------------ instrumentos
def piano(m, dur, vel):
    f = hz(m); t = tt(dur + 1.8); s = np.zeros(len(t))
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        if fk > SR / 2.2: break
        s += (1.0 / k ** 1.25) * (1.15 if k == 1 else 1) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28)) * np.exp(-t * (0.9 + 0.55 * k + f / 900.0))
    s += 0.02 * rng.standard_normal(len(t)) * np.exp(-t * 90)
    return s * np.minimum(1, t / 0.004) * np.where(t > dur, np.exp(-(t - dur) * 7), 1.0) * vel * 0.16

def corda(m, dur, vel, brilho=10, atk=0.7):
    f = hz(m); t = tt(dur + 1.2); s = np.zeros(len(t))
    vib = 1 + 0.0045 * np.sin(2 * np.pi * 5.3 * t + rng.uniform(0, 6)) * np.minimum(1, t / 1.2)
    for d in (-0.06, 0.0, 0.07):
        fd = f * 2 ** (d / 12); fase = 2 * np.pi * np.cumsum(fd * vib) / SR
        for k in range(1, brilho + 1):
            if fd * k > SR / 2.4: break
            s += (1.0 / k) * (0.88 ** k) * np.sin(k * fase + rng.uniform(0, 6))
    return s * np.minimum(1, t / atk) * np.where(t > dur, np.exp(-(t - dur) * 3.2), 1.0) * vel * 0.035

def pad(notas, dur, vel, atk=1.6, brilho=1.0):
    t = tt(dur + 1.8); s = np.zeros(len(t))
    for m in notas:
        f = hz(m)
        for k, a in ((1, 1), (2, .45 * brilho), (3, .18 * brilho), (4, .08 * brilho)):
            s += a * (np.sin(2 * np.pi * f * k * t) + np.sin(2 * np.pi * f * k * 1.0016 * t + 1))
    return s * np.minimum(1, t / atk) * np.where(t > dur, np.exp(-(t - dur) * 2.2), 1.0) * vel * 0.012

def rhodes(m, dur, vel):
    f = hz(m); t = tt(dur + 1.5)
    mod = np.sin(2 * np.pi * f * t) * (1.4 * np.exp(-t * 6) + 0.25)
    s = np.sin(2 * np.pi * f * t + mod) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
    s *= 1 + 0.12 * np.sin(2 * np.pi * 4.2 * t)                       # tremolo
    return s * np.minimum(1, t / 0.006) * np.exp(-t * 0.9) * np.where(t > dur, np.exp(-(t - dur) * 6), 1.0) * vel * 0.10

def pluck(m, dur, vel, brilho=1.0):
    f = hz(m); t = tt(dur + .5)
    s = np.zeros(len(t))
    for k in range(1, 7):
        s += (1 / k) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (5 + k * 4 / brilho))
    s += 0.6 * np.sin(2 * np.pi * f * 1.005 * t) * np.exp(-t * 6)
    return s * np.minimum(1, t / 0.002) * np.where(t > dur, np.exp(-(t - dur) * 12), 1.0) * vel * 0.09

def violao(m, dur, vel, claro=0.5):
    """Karplus-Strong vetorizado em blocos (o atraso e > 1 bloco, entao cada bloco so depende dos anteriores)."""
    f = hz(m); D = max(2, int(round(SR / f))); n = int((dur + 1.4) * SR)
    y = np.zeros(n + D + 2)
    ruido = rng.uniform(-1, 1, D)
    ruido = np.convolve(ruido, np.ones(3) / 3, mode='same') * (1 - claro) + ruido * claro
    y[:D] = ruido
    g = 0.996 - 0.0006 * max(0, (m - 52) / 12)
    k = D
    while k < n:
        b = min(D, n - k)
        y[k:k + b] = g * 0.5 * (y[k - D:k - D + b] + y[k - D - 1:k - D - 1 + b] if k - D - 1 >= 0 else y[k - D:k - D + b] * 2)
        k += b
    s = y[:n]
    t = np.arange(n) / SR
    s = s * np.where(t > dur, np.exp(-(t - dur) * 5), 1.0)
    corpo = np.convolve(s, np.exp(-np.arange(200) / 40.0) * np.sin(np.arange(200) * 2 * np.pi * 110 / SR), mode='same') * 0.004
    return (s + corpo) * vel * 0.33

def sino(m, dur, vel, tigela=False):
    f = hz(m); t = tt(dur + 3)
    parc = ((1, 1, .9), (2.76, .45, 1.6), (5.4, .22, 2.6), (8.9, .1, 3.5)) if not tigela else ((1, 1, .35), (2.71, .5, .7), (4.95, .25, 1.1), (7.6, .12, 1.6))
    s = np.zeros(len(t))
    for r_, a, d in parc:
        bat = (1 + 0.35 * np.sin(2 * np.pi * (0.7 + r_ * .3) * t)) if tigela else 1
        s += a * np.sin(2 * np.pi * f * r_ * t + rng.uniform(0, 6)) * np.exp(-t * d) * bat
    return s * np.minimum(1, t / (0.002 if not tigela else 0.03)) * vel * 0.07

def baixo(m, dur, vel, sub=True):
    f = hz(m); t = tt(dur + .3)
    s = np.sin(2 * np.pi * f * t) + (0.3 * np.sin(2 * np.pi * 2 * f * t) if sub else 0.5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 8))
    return s * np.minimum(1, t / 0.008) * np.where(t > dur, np.exp(-(t - dur) * 25), np.exp(-t * .4)) * vel * 0.20

def bumbo(vel, duro=1.0):
    t = tt(.5); f = 48 + 110 * np.exp(-t * 28 * duro)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * vel * 0.55
def caixa(vel, suave=False):
    t = tt(.35); r = rng.standard_normal(len(t))
    r = r - np.concatenate([[0], r[:-1]]) * (0.6 if suave else 0.2)
    return (r * np.exp(-t * (22 if suave else 16)) * 0.5 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 20) * .5) * vel * 0.22
def palma(vel):
    t = tt(.3); r = rng.standard_normal(len(t)); r = r - np.concatenate([[0], r[:-1]])
    env = sum(np.where(t >= o, np.exp(-(t - o) * 60), 0) for o in (0, .011, .022)) + np.where(t > .03, np.exp(-(t - .03) * 18), 0)
    return r * env * vel * 0.11
def chimbal(vel, aberto=False):
    t = tt(.4 if aberto else .08); r = rng.standard_normal(len(t))
    r = r - np.concatenate([[0], r[:-1]]); r = r - np.concatenate([[0], r[:-1]])
    return r * np.exp(-t * (14 if aberto else 70)) * vel * 0.035
def shaker(vel):
    t = tt(.12); r = rng.standard_normal(len(t)); r = r - np.concatenate([[0], r[:-1]])
    return r * np.sin(np.pi * np.minimum(1, t / .12)) * vel * 0.03
def riser(dur, vel):
    t = tt(dur); r = rng.standard_normal(len(t))
    out = np.zeros(len(t)); a = 0.0
    alfa = 0.02 + 0.6 * (t / dur) ** 2                            # filtro abrindo
    for i in range(0, len(t), 512):
        seg = r[i:i + 512]; al = alfa[i]
        o = np.empty(len(seg))
        for j, x in enumerate(seg): a += al * (x - a); o[j] = a
        out[i:i + 512] = o
    return out * (t / dur) ** 2 * vel * 0.25
def impacto(vel):
    t = tt(3.5); f = 30 + 50 * np.exp(-t * 5)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.4)
    ru = np.convolve(rng.standard_normal(len(t)), np.ones(40) / 40, mode='same')   # ruido grave (sem chiado na reverb)
    s += ru * np.exp(-t * 14) * 0.5
    return s * vel * 0.5

# ------------------------------------------------------------------ estilos
def cinematico():
    BPM = 72; BEAT = 60 / BPM; BAR = 4 * BEAT
    AC = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]   # Rem Sib F C
    def ac(t): return AC[int(t // (2 * BAR)) % 4]
    # piano: tercinas de colcheia (arpejo que gira)
    passo = BEAT / 3; t = 0.0; i = 0
    while t < DUR - 2.5:
        b, nt = ac(t); e = E(t)
        pad_ = [nt[0], nt[1], nt[2], nt[1] + 12, nt[2], nt[1]]
        m = pad_[i % 6] + (12 if e > .85 and i % 3 == 2 else 0)
        v = (.42 + .5 * e) * (1 if i % 3 == 0 else .78) * (1 + rng.uniform(-.05, .05))
        pn = .5 + .2 * np.sin(i * .5); por(piano(m, passo * .95, v), t, 1.1 - pn, .5 + pn)
        t += passo; i += 1
    for k in range(int(DUR // (2 * BAR)) + 1):
        t0 = k * 2 * BAR
        if t0 > DUR - 3: break
        b, nt = ac(t0 + .01); e = E(t0)
        por(piano(b - 12, 2 * BAR * .95, .35 + .45 * e), t0)
        if e > .32: por(corda(b - 12, 2 * BAR, .4 + .8 * e, 8, 1.0), t0, .65, .55); por(corda(b, 2 * BAR, (.4 + .8 * e) * .5, 8, 1.2), t0, .5, .7)
        if e > .5: por(pad([b, b + 7, nt[0] - 12, nt[1] - 12], 2 * BAR, .5 + .5 * e), t0)
    MEL = [[(74, 1), (72, .5), (69, .5)], [(70, 1.5), (69, .5)], [(72, 1), (77, 1)], [(76, 1.5), (72, .5)]]
    t0 = 0.0; k = 0
    while t0 < DUR - 4:
        if E(t0) > .55:
            tt_ = t0
            for m, c in MEL[k % 4]:
                d = c * BAR; e = E(tt_); up = 12 if e > .85 else 0
                por(corda(m + up, d * .98, .5 + .55 * e, 12, .45), tt_, .45, .8)
                if e > .75: por(corda(m + up - 12, d * .98, (.5 + .55 * e) * .5, 10, .5), tt_, .8, .45)
                tt_ += d
        t0 += 2 * BAR; k += 1
    for m_ in MARCAS: por(impacto(.8), m_ - .02)
    for m in (38, 50, 57, 62, 65, 69): por(piano(m, 4.5, .5), DUR - 3.0)

def pop():
    BPM = 120; BEAT = .5; BAR = 2.0
    AC = [(53, [65, 69, 72]), (48, [64, 67, 72]), (55, [62, 67, 71]), (57, [64, 69, 72])]   # F C G Am
    def ac(t): return AC[int(t // BAR) % 4]
    s16 = BEAT / 4; i = 0; t = 0.0
    while t < DUR - 1.5:
        e = E(t); b, nt = ac(t); pos = i % 16
        arp = [nt[0], nt[1], nt[2], nt[1] + 12, nt[2] + 12, nt[2], nt[1], nt[0] + 12]
        if e > .15 and (pos % 2 == 0 or e > .6):
            pn = .5 + .3 * np.sin(i * .9); por(pluck(arp[i % 8], s16 * 1.6, (.45 + .5 * e) * (1 if pos % 4 == 0 else .7)), t, 1.1 - pn, .5 + pn)
        if e > .3 and pos % 2 == 0: por(baixo(b - 12, s16 * 1.8, .55 + .4 * e * (1.2 if pos % 4 == 0 else .8), sub=False), t)
        if e > .45 and pos % 4 == 0: por(bumbo(.85 + .2 * e), t)
        if e > .5 and pos in (4, 12): por(palma(.9), t)
        if e > .3 and pos % 4 == 2: por(chimbal(.8 + .4 * e, aberto=e > .75), t, .5, .7)
        if e > .62 and pos % 2 == 1: por(chimbal(.45), t, .7, .5)
        t += s16; i += 1
    for k in range(int(DUR // BAR) + 1):
        t0 = k * BAR; e = E(t0)
        if t0 > DUR - 2: break
        b, nt = ac(t0 + .01)
        if e > .55: por(pad([nt[0] - 12, nt[1] - 12, nt[2] - 12, nt[0]], BAR * .96, .4 + .5 * e, atk=.08, brilho=1.6), t0)
    HOOK = [(72, 0, .75), (74, .75, .25), (76, 1, .5), (79, 1.5, .5), (76, 2, .75), (74, 2.75, .25), (72, 3, 1)]
    k = 0
    while k * 2 * BAR < DUR - 4:
        t0 = k * 2 * BAR
        if E(t0) > .7:
            for m, o, d in HOOK: por(pluck(m + 12, d * BEAT * 1.6, .7, brilho=2.2) + 0, t0 + o * BEAT, .55, .65); por(sino(m + 12, .3, .35), t0 + o * BEAT, .5, .7)
        k += 1
    for m_ in MARCAS:
        if m_ > 1.5: por(riser(1.5, .8), m_ - 1.5, .55, .65)
        por(impacto(.5), m_); por(chimbal(1.4, aberto=True), m_, .6, .6)
    for m in (41, 53, 60, 65, 69, 72): por(pad([m], 3, .6, atk=.02, brilho=1.4), DUR - 2.2)
    por(bumbo(1.1), DUR - 2.2); por(impacto(.6), DUR - 2.2)

def lofi():
    BPM = 82; BEAT = 60 / BPM; BAR = 4 * BEAT
    AC = [(41, [57, 60, 64, 69]), (40, [55, 59, 62, 67]), (38, [57, 60, 65, 69]), (36, [55, 59, 64, 67])]   # Fmaj7 Em7 Dm7 Cmaj7
    def ac(t): return AC[int(t // BAR) % 4]
    sw = lambda j: (j // 2) * BEAT + ((BEAT * .58) if j % 2 else 0)           # colcheia com swing
    for k in range(int(DUR // BAR) + 1):
        t0 = k * BAR
        if t0 > DUR - 2.5: break
        b, nt = ac(t0 + .01); e = E(t0)
        for j, m in enumerate(nt): por(rhodes(m, BAR * .9, .55 + .3 * e), t0 + j * .018, .55 + .1 * (j - 1.5) * .3, .65 - .1 * (j - 1.5) * .3)
        if k % 2: por(rhodes(nt[-1] + 12, BEAT * 1.5, .35 + .2 * e), t0 + sw(5))
        if e > .25:
            por(baixo(b, BEAT * 1.6, .7), t0); por(baixo(b, BEAT * .8, .55), t0 + sw(3)); por(baixo(b + 7, BEAT * .9, .55), t0 + sw(6))
        if e > .35:
            for j in range(8):
                tj = t0 + sw(j)
                if j in (0, 5) : por(bumbo(.7, duro=.6), tj)
                if j in (2, 6): por(caixa(.75, suave=True), tj, .55, .6)
                por(chimbal(.55 if j % 2 == 0 else .35), tj, .45, .65)
    MEL = [(76, 0), (74, 1.5), (72, 2), (69, 3), (72, 4.5), (74, 5), (76, 6), (79, 7.5)]
    k = 0
    while k * 2 * BAR < DUR - 3:
        t0 = k * 2 * BAR
        if E(t0) > .6:
            for m, o in MEL: por(sino(m + 12, 1.2, .55), t0 + o * BEAT, .45, .75)
        k += 1
    vinil = np.convolve(rng.standard_normal(N), np.ones(6) / 6, mode='same') * 0.0012
    estalos = (rng.random(N) > 0.99992) * rng.uniform(-.08, .08, N)
    L[:] += vinil + estalos; R[:] += vinil * .9 + np.roll(estalos, 37)
    for m_ in MARCAS: por(sino(84, 2, .6), m_, .5, .7)
    for j, m in enumerate((53, 57, 60, 64, 67, 72)): por(rhodes(m, 3.5, .6), DUR - 3.0 + j * .05)

def violao_():
    BPM = 92; BEAT = 60 / BPM; BAR = 4 * BEAT
    AC = [(43, [55, 59, 62, 67]), (42, [57, 62, 66, 69]), (40, [55, 59, 64, 67]), (36, [55, 60, 64, 67])]   # G D/F# Em C(add9)
    def ac(t): return AC[int(t // BAR) % 4]
    col = BEAT / 2
    for k in range(int(DUR // BAR) + 1):
        t0 = k * BAR
        if t0 > DUR - 2.5: break
        b, nt = ac(t0 + .01); e = E(t0)
        ordem = [b, nt[2], nt[1], nt[3], b + 12 if b < 40 else nt[0], nt[2], nt[1], nt[3]]
        for j, m in enumerate(ordem):
            v = (.5 + .35 * e) * (1 if j in (0, 4) else .72) * (1 + rng.uniform(-.06, .06))
            por(violao(m, col * (3 if j in (0, 4) else 1.6), v, claro=.35 + .3 * e), t0 + j * col + rng.uniform(0, .008), .7 - .04 * j, .5 + .04 * j)
        if e > .4: por(corda(b, BAR, .45 + .6 * e, 8, .9), t0, .6, .55)
        if e > .5:
            for j in range(8): por(shaker(.8 + .5 * e if j % 2 else .5), t0 + j * col, .45, .7)
        if e > .65:
            por(bumbo(.55, duro=.7), t0); por(bumbo(.45, duro=.7), t0 + 2.5 * BEAT)
            por(caixa(.4, suave=True), t0 + BEAT); por(caixa(.45, suave=True), t0 + 3 * BEAT)
    MEL = [[(74, 0, 1.5), (71, 1.5, .5), (69, 2, 2)], [(69, 0, 1), (71, 1, 1), (74, 2, 2)], [(76, 0, 1.5), (74, 1.5, .5), (71, 2, 2)], [(72, 0, 1), (71, 1, 1), (67, 2, 2)]]
    k = 0
    while k * BAR < DUR - 3:
        t0 = k * BAR; e = E(t0)
        if e > .55:
            for m, o, d in MEL[k % 4]:
                por(corda(m, d * BEAT * .95, .45 + .4 * e, 11, .25), t0 + o * BEAT, .45, .8)
                if e > .75: por(sino(m + 12, .8, .3), t0 + o * BEAT, .5, .7)
        k += 1
    for m_ in MARCAS: por(sino(79, 2.5, .5), m_, .5, .7)
    for j, m in enumerate((43, 50, 55, 59, 62, 67)): por(violao(m, 3.5, .65), DUR - 3.0 + j * .06)

def ambiente():
    BPM = 64; BEAT = 60 / BPM; BAR = 4 * BEAT
    AC = [(40, [64, 68, 71]), (37, [61, 64, 68]), (45, [64, 69, 73]), (47, [63, 66, 71])]   # E C#m A B
    def ac(t): return AC[int(t // (2 * BAR)) % 4]
    for k in range(int(DUR // (2 * BAR)) + 1):
        t0 = k * 2 * BAR
        if t0 > DUR - 3: break
        b, nt = ac(t0 + .01); e = E(t0)
        por(pad([b, b + 7, nt[0] - 12, nt[1] - 12, nt[2]], 2 * BAR, .55 + .5 * e, atk=2.5, brilho=.6 + .6 * e), t0)
        por(sino(b + 24 if b < 44 else b + 12, 6, .8 + .4 * (1 - e), tigela=True), t0 + .3, .55, .65)
        if e <= .72 and k % 2 == 1: por(sino(nt[1] + 12, 4, .45, tigela=True), t0 + BAR + .2, .4, .8)
        if e > .45: por(corda(b - 12, 2 * BAR, .3 + .8 * e, 7, 1.4), t0, .65, .55)
        if e > .6: por(corda(nt[2], 2 * BAR, .35 + .6 * e, 10, 1.5), t0, .45, .75)
        if e > .72:
            for j in range(8): por(piano(nt[j % 3] + 12 * (j % 2), BEAT * .45, .3 + .3 * e), t0 + j * BEAT, .5 + .05 * (j % 3), .7 - .05 * (j % 3))
            por(bumbo(.45, duro=.5), t0); por(bumbo(.4, duro=.5), t0 + 4 * BEAT)
    # piano esparso (motivo original de 4 notas que volta, mais cheio no fim)
    MOT = [(76, 0), (75, 1), (71, 2), (73, 3.5)]
    k = 0
    while k * 2 * BAR < DUR - 4:
        t0 = k * 2 * BAR; e = E(t0)
        if e > .2 and k % 2 == 0:
            for m, o in MOT: por(piano(m + (12 if e > .8 else 0), BEAT * 1.6, .45 + .35 * e), t0 + o * BEAT + BAR * .5, .45, .75)
        k += 1
    for m_ in MARCAS: por(sino(88, 4, .5, tigela=False), m_, .5, .7); por(sino(52, 6, .8, tigela=True), m_)
    for m in (40, 52, 59, 64, 68, 71, 76): por(piano(m, 5, .45), DUR - 3.6)
    por(sino(64, 6, .7, tigela=True), DUR - 3.6)

{'cinematico': cinematico, 'pop': pop, 'lofi': lofi, 'violao': violao_, 'ambiente': ambiente}[SPEC['estilo']]()

# ------------------------------------------------------------------ sala + master
def reverb(x, seed, seg=3.0, dec=2.4):
    r = np.random.default_rng(seed); n = int(seg * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * dec); ir[:int(.012 * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
    tam = 1 << int(np.ceil(np.log2(len(x) + n)))
    return np.fft.irfft(np.fft.rfft(x, tam) * np.fft.rfft(ir, tam), tam)[:len(x)]
WET = {'cinematico': .38, 'pop': .16, 'lofi': .2, 'violao': .26, 'ambiente': .45}[SPEC['estilo']]
DEC = {'cinematico': 2.4, 'pop': 4.0, 'lofi': 3.5, 'violao': 3.0, 'ambiente': 1.6}[SPEC['estilo']]
L2 = L * (1 - WET) + reverb(L, 1, dec=DEC) * WET * 2.2
R2 = R * (1 - WET) + reverb(R, 2, dec=DEC) * WET * 2.2
t = np.arange(N) / SR
fade = np.minimum(1, t / 0.4) * np.clip((DUR - t) / 2.5, 0, 1)
L2 = (L2 * fade)[:int(DUR * SR)]; R2 = (R2 * fade)[:int(DUR * SR)]
g = 0.9 / max(np.max(np.abs(L2)), np.max(np.abs(R2)), 1e-9)
st = np.empty(2 * len(L2)); st[0::2] = L2 * g; st[1::2] = R2 * g
pcm = (np.tanh(st * 1.1) / np.tanh(1.1) * 32767).astype('<i2')
with wave.open(SAIDA, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('trilha', SPEC['estilo'], f'{DUR:.0f}s ->', SAIDA)
