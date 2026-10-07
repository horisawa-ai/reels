# Desenho de som do Reels: música sintetizada + efeitos sincronizados + mixagem com a voz.
# Uso: sounddesign.py events.json voz.wav saida.wav
import sys, json
import numpy as np, soundfile as sf
from scipy import signal

ev = json.load(open(sys.argv[1]))
voice, SR = sf.read(sys.argv[2], dtype='float64')
if voice.ndim == 1: voice = np.stack([voice, voice], 1)
DUR = ev['dur']; N = int(DUR * SR)
voice = np.pad(voice, ((0, max(0, N - len(voice))), (0, 0)))[:N]
rng = np.random.default_rng(7)
T = lambda d: np.arange(int(d * SR)) / SR

def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414
    buf[i:i + len(x), 1] += x * gain * r * 1.414

def env(n, a, d):  # ataque linear + decaimento exponencial
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)

def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def lp(x, f, order=2):
    sos = signal.butter(order, f, btype='low', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def hp(x, f, order=2):
    sos = signal.butter(order, f, btype='high', fs=SR, output='sos'); return signal.sosfilt(sos, x)

# ---------------- efeitos
def pop(f0=700, f1=180, d=0.09):
    t = T(d); f = f1 + (f0 - f1) * np.exp(-t / 0.018)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(len(t), 0.002, 0.035) + hp(rng.standard_normal(len(t)), 3000) * env(len(t), 0.0005, 0.004) * 0.25

def blip(freqs=(1480, 2220), d=0.12):
    t = T(d); x = sum(np.sin(2 * np.pi * f * t) * (0.6 ** i) for i, f in enumerate(freqs))
    return x * env(len(t), 0.002, 0.03)

def whoosh(dur, rising=True):
    n = int(dur * SR); x = rng.standard_normal(n)
    # filtro passa-banda que varre a frequência (em blocos curtos)
    out = np.zeros(n); blk = 1024
    for i in range(0, n, blk):
        u = i / max(1, n - 1); u = u if rising else 1 - u
        c = 250 * (14 ** u)
        out[i:i + blk] = bp(x[max(0, i - 2048):i + blk], c * 0.6, min(c * 1.7, SR / 2 - 100))[-len(out[i:i + blk]):]
    u = np.linspace(0, 1, n); shape = np.sin(np.pi * np.clip(u / 0.65, 0, 1) * 0.5) ** 2 * np.clip((1 - u) / 0.35, 0, 1) ** 1.5
    return out * shape

def thump(f=85, d=0.22):
    t = T(d); ph = 2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-t / 0.02))) / SR
    body = np.sin(ph) * env(len(t), 0.002, 0.07)
    click = lp(rng.standard_normal(len(t)), 2200) * env(len(t), 0.0005, 0.012)
    return body + click * 0.5

def swish(d=0.2):
    n = int(d * SR); x = hp(rng.standard_normal(n), 2500)
    u = np.linspace(0, 1, n); return x * np.sin(np.pi * u) ** 2

def tick(f=2600, d=0.025):
    t = T(d); return np.sin(2 * np.pi * f * t) * env(len(t), 0.0005, 0.006) + hp(rng.standard_normal(len(t)), 4000) * env(len(t), 0.0003, 0.002) * 0.4

def bell(freqs, d=1.6):
    t = T(d); x = np.zeros(len(t))
    for i, f in enumerate(freqs):
        x += np.sin(2 * np.pi * f * t) * np.exp(-t / (d * (0.5 - i * 0.06))) * (0.7 ** i)
        x += 0.25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.25) * (0.7 ** i)
    return x * env(len(t), 0.003, 10)

def riser(d):
    t = T(d); f = 180 * (6 ** (t / d)); ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * (t / d) ** 2
    noise = hp(rng.standard_normal(len(t)), 1500) * (t / d) ** 3
    return 0.5 * tone + 0.35 * noise

def boom(d=1.4):
    t = T(d); f = 48 + 40 * np.exp(-t / 0.08); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(len(t), 0.004, 0.45) + lp(rng.standard_normal(len(t)), 400) * env(len(t), 0.002, 0.15) * 0.4

sfx = np.zeros((N, 2))
# intro: subida + impacto no título, ilhas brotando, cano se desenhando
place(sfx, riser(0.45), 0.0, 0.35)
place(sfx, boom(), 0.42, 0.75)
place(sfx, whoosh(0.7, True), 0.05, 0.5)
for k, at in enumerate([0.05, 0.15, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0]):
    place(sfx, pop(760 - k * 30, 200), at + 0.06, 0.32, pan=(-0.4 if k % 2 else 0.4))
place(sfx, whoosh(1.7, True) * 0.6, 0.7, 0.3)
# zooms da câmera
for z in ev['zooms']:
    d = max(0.5, z['t1'] - z['t0'])
    place(sfx, whoosh(d, z['dir'] == 'in'), z['t0'], 0.42)
# balões
for name, at in ev['labels'].items():
    place(sfx, blip((1480, 2220) if len(name) > 3 else (1760, 2640)), at + 0.02, 0.17, pan=0.15)
# lâmpadas da votação e mesas que acendem
for t in ev['vote_lamps']: place(sfx, blip((1175, 1760), 0.2), t + 0.05, 0.12)
for t in ev['roles']:
    place(sfx, blip((1318, 1975), 0.15), t + 0.02, 0.08)
    place(sfx, swish(0.3), t + 0.1, 0.18, pan=0.3)
# PL aparece e cai no funil
place(sfx, bell((1568, 2349), 0.9), ev['pl_show'] + 0.15, 0.14)
place(sfx, whoosh(0.5, False), ev['pl_drop'], 0.25)
# contadores (assinaturas, plenário, derrubada do veto): tiques desacelerando
def counter(a, b, n=16, g=0.13):
    for i in range(n):
        u = 1 - (1 - i / n) ** 0.5  # mais rápido no começo
        place(sfx, tick(2400 + 300 * (i % 2)), a + u * (b - a), g)
counter(*ev['assin'], n=10)
for i in range(5): place(sfx, blip((1318, 1975), 0.18), ev['estados'][0] + i * (ev['estados'][1] - ev['estados'][0]) / 5 + 0.05, 0.1)
counter(*ev['plen_count'], n=20)
counter(ev['derruba'][0] - 0.2, ev['derruba'][0] + 0.8, n=16)
counter(ev['derruba'][1] - 0.2, ev['derruba'][1] + 0.6, n=10)
# Câmara: máquina de escrever, carimbos de emenda, CCJ aprova
t = ev['relator'][0]
while t < ev['relator'][1]:
    place(sfx, tick(1800 + rng.integers(0, 900), 0.02), t, 0.09, pan=-0.2); t += 0.06 + rng.random() * 0.07
m0 = ev['mudancas']
for h in (m0 + 0.075, m0 + 0.525): place(sfx, thump(95, 0.2), h, 0.42)
place(sfx, bell((1046.5, 1318.5, 1568), 1.4), ev['constit'] + 0.25, 0.16)
# Senado: revisão, arquivo
place(sfx, blip((988, 1480), 0.2), ev['revisa'], 0.1)
place(sfx, swish(0.45), ev['rejeitar'] + 0.15, 0.22, pan=0.4)
place(sfx, thump(140, 0.12), ev['rejeitar'] + 1.05, 0.2, pan=0.4)
# sanção ou veto: carimbos e relógio
place(sfx, thump(80, 0.25), ev['sancionar'] + 0.22, 0.55)
place(sfx, thump(72, 0.25), ev['vetar'] + 0.22, 0.55)
t = ev['clock'][0]
while t < ev['clock'][1]: place(sfx, tick(3200, 0.02), t, 0.1, pan=0.3); t += 0.33
# Diário Oficial: prensa e folha saindo
p0 = ev['publicada']
for h in (p0 + 0.3, p0 + 0.8): place(sfx, thump(110, 0.18), h, 0.38); place(sfx, lp(rng.standard_normal(int(0.08 * SR)), 1500) * env(int(0.08 * SR), 0.001, 0.02), h + 0.02, 0.3)
place(sfx, swish(0.6), p0 + 0.9, 0.22)
counter(ev['n45'] - 0.1, ev['n45'] + 1.0, n=14, g=0.1)
# fechamento: cano todo acende + título
place(sfx, riser(1.6), ev['agora'] - 0.2, 0.22)
place(sfx, bell((523.25, 659.25, 783.99, 1046.5), 3.2), ev['agora'] + 1.35, 0.3)
place(sfx, whoosh(0.8, True), ev['agora'] + 0.7, 0.3)

# ---------------- música: Dm9 · B♭maj7 · Fmaj7 · Am7 a 92 bpm
BPM = 92; beat = 60 / BPM; bar = 4 * beat
nf = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [[50, 53, 57, 60, 64], [46, 50, 53, 57, 62], [41, 45, 48, 52, 57], [45, 48, 52, 55, 60]]
music = np.zeros((N, 2))
end_t = ev['agora'] + 1.35  # acorde final
t_all = np.arange(N) / SR
# pad
pad = np.zeros(N)
seg = 2 * bar
for ci in range(int(DUR / seg) + 1):
    ch = chords[ci % 4]; a = ci * seg
    if a > end_t: break
    d = min(seg + 0.8, DUR - a)
    if a + seg > end_t: d = DUR - a  # último acorde segura até o fim
    t = T(d)
    x = np.zeros(len(t))
    for m in ch:
        for det in (-0.12, 0.0, 0.11):
            f = nf(m) * 2 ** (det / 12)
            for h in range(1, 6): x += np.sin(2 * np.pi * f * h * t + rng.random() * 6.28) / (h * 1.6)
    x = lp(x, 1100)
    e = np.minimum(1, t / 0.9) * np.minimum(1, (d - t) / 0.9)
    i = int(a * SR); pad[i:i + len(x)] += (x * e)[:N - i]
pad /= np.max(np.abs(pad)) + 1e-9
# baixo
bass = np.zeros(N)
for bi in range(int(DUR / bar) + 1):
    a = bi * bar
    if a > end_t + bar: break
    m = chords[(bi // 2) % 4][0] - 12; d = min(bar, DUR - a); t = T(d)
    x = np.sin(2 * np.pi * nf(m) * t) * env(len(t), 0.02, 0.9)
    i = int(a * SR); bass[i:i + len(x)] += x[:N - i]
# arpejo (colcheias), começa com o título
arp = np.zeros((N, 2))
k = 0; t0 = 0.45
while t0 < end_t - 0.1:
    ci = int(t0 // seg) % 4; ch = chords[ci]
    m = ch[[0, 2, 3, 4, 2, 3][k % 6]] + 12
    t = T(0.45); f = nf(m)
    x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * env(len(t), 0.003, 0.16)
    place(arp, x, t0, 0.5, pan=(-0.35 if k % 2 else 0.35)); k += 1; t0 += beat / 2
# bateria leve a partir da narração
drums = np.zeros((N, 2))
b = 3.7
while b < end_t - 0.2:
    idx = round((b - 3.7) / beat)
    if idx % 2 == 0:
        t = T(0.35); ph = 2 * np.pi * np.cumsum(50 + 70 * np.exp(-t / 0.03)) / SR
        place(drums, np.sin(ph) * env(len(t), 0.002, 0.12), b, 0.55)
    hat = hp(rng.standard_normal(int(0.05 * SR)), 7000) * env(int(0.05 * SR), 0.001, 0.012)
    place(drums, hat, b + beat / 2, 0.22, pan=0.25)
    b += beat
mus = np.stack([pad, pad], 1) * 0.42 + np.stack([bass, bass], 1) * 0.35 + arp * 0.33 + drums * 0.6
mus *= np.minimum(1, t_all / 0.15)[:, None] * np.clip((DUR - t_all) / 1.2, 0, 1)[:, None]

# ducking: a música baixa ~8 dB enquanto você fala
v = np.abs(voice).mean(1)
envv = signal.filtfilt(*signal.butter(1, 4, fs=SR), v)
on = np.clip(envv / 0.02, 0, 1)
win = int(0.25 * SR); on = np.convolve(on, np.ones(win) / win, mode='same')
duck = 1 - 0.72 * np.clip(on * 1.5, 0, 1)
mus *= duck[:, None]
# intro com mais presença (+4 dB até a primeira fala)
mus *= (1 + 0.58 * np.clip((3.6 - t_all) / 0.5, 0, 1))[:, None]

def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
mix = voice * 1.0 + mus * 0.26 + sfx * 0.6
peak = np.max(np.abs(mix))
if peak > 0.98: mix *= 0.98 / peak
sf.write(sys.argv[3], mix.astype(np.float32), SR, subtype='FLOAT')
print('voz', round(rms_db(voice), 1), 'dB | música', round(rms_db(mus * 0.16), 1), '| efeitos', round(rms_db(sfx * 0.55), 1), '| pico', round(20 * np.log10(peak), 1))
