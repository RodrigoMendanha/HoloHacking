"""Trilha instrumental do video comercial — sintetizada aqui (sem amostras de terceiros: livre de direitos por construcao).
Pad suave + arpejo dedilhado + grave, crescendo ate ~43 s e saida suave. So biblioteca padrao (sem numpy).
Uso: python3 trilha.py [saida.wav] [duracao_s]
"""
import math, random, struct, sys, wave

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida/trilha.wav'
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 57.0
SR = 32000
N = int(DUR * SR)
random.seed(7)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

# progressao (midi): Dmaj9 - Bm7 - Gmaj7 - A(sus) ; 4 s por acorde
ACORDES = [[50, 57, 62, 66, 69, 76], [47, 54, 59, 62, 66, 73], [43, 55, 59, 62, 66, 71], [45, 52, 57, 61, 64, 71]]
BLOCO = 4.0

def intensidade(t):
    """curva de energia: entra leve, sobe no Resultado/Retorno, pousa no final."""
    pts = [(0, .35), (4, .5), (17, .62), (23, .55), (27, .8), (43, 1.0), (50.6, .75), (DUR, .55)]
    for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
        if t <= t1: return v0 + (v1 - v0) * (t - t0) / max(t1 - t0, 1e-6)
    return pts[-1][1]

L = [0.0] * N
R = [0.0] * N

# pad: senos levemente desafinados com ataque/saida lentos, crossfade entre acordes
for i in range(N):
    t = i / SR
    k = int(t // BLOCO)
    fr = (t % BLOCO) / BLOCO
    ac, prox = ACORDES[k % 4], ACORDES[(k + 1) % 4]
    mix = 0.0 if fr < 0.8 else (fr - 0.8) / 0.2
    e = intensidade(t)
    sl = sr_ = 0.0
    for j, (a, b) in enumerate(zip(ac[1:5], prox[1:5])):
        for m, w in ((a, 1 - mix), (b, mix)):
            if w <= 0: continue
            f = hz(m)
            sl += w * math.sin(2 * math.pi * f * 0.998 * t + j)
            sr_ += w * math.sin(2 * math.pi * f * 1.002 * t + j * 1.7)
    trem = 0.85 + 0.15 * math.sin(2 * math.pi * 0.13 * t)
    g = 0.045 * e * trem
    L[i] += sl * g
    R[i] += sr_ * g
    # grave
    bm = ac[0] if mix < 0.5 else prox[0]
    gb = 0.11 * e * min(1, t / 3)
    b = math.sin(2 * math.pi * hz(bm) * t) * gb
    L[i] += b; R[i] += b

# arpejo dedilhado (colcheias a 92 bpm) a partir de 4 s
passo = 60 / 92 / 2
t0 = 4.2
n = 0
while t0 < DUR - 1.5:
    k = int(t0 // BLOCO)
    ac = ACORDES[k % 4]
    padrao = [3, 4, 5, 4, 2, 4, 5, 3]
    m = ac[padrao[n % 8]] + 12
    f = hz(m)
    e = intensidade(t0)
    amp = 0.09 * e * (1.0 if n % 2 == 0 else 0.7)
    pan = 0.5 + 0.35 * math.sin(n * 0.9)
    ini = int(t0 * SR)
    dur = int(1.6 * SR)
    for d in range(dur):
        i = ini + d
        if i >= N: break
        tt = d / SR
        env = math.exp(-tt * 3.2) * min(1, tt / 0.004)
        s = (math.sin(2 * math.pi * f * tt) + 0.3 * math.sin(4 * math.pi * f * tt) * math.exp(-tt * 6)) * amp * env
        L[i] += s * (1 - pan) * 1.4
        R[i] += s * pan * 1.4
    t0 += passo
    n += 1

# eco simples (profundidade)
atraso = int(0.33 * SR)
for i in range(atraso, N):
    L[i] += R[i - atraso] * 0.22
    R[i] += L[i - atraso] * 0.22

# entrada / saida
for i in range(N):
    t = i / SR
    g = min(1, t / 1.2) * min(1, max(0, (DUR - t) / 3.0))
    L[i] *= g; R[i] *= g

pico = max(max(abs(x) for x in L), max(abs(x) for x in R)) or 1
esc = 0.7 / pico
with wave.open(SAIDA, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<hh', int(L[i] * esc * 32767), int(R[i] * esc * 32767)) for i in range(N)))
print(SAIDA, DUR, 's')
