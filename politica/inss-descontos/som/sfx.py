# Efeitos sonoros suaves (sem música). Uso: sfx.py eventos.json saida.wav
import sys, json, numpy as np, soundfile as sf
from scipy import signal
ev = json.load(open(sys.argv[1])); SR = 48000; N = int((ev['dur'] + 1) * SR)
out = np.zeros((N, 2)); rng = np.random.default_rng(11)
T = lambda d: np.arange(int(d * SR)) / SR
def env(n, a, d):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
def filt(x, f, kind): return signal.sosfilt(signal.butter(2, f, btype=kind, fs=SR, output='sos'), x)
def place(x, t, g, pan=0.0):
    i = int(t * SR)
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[i:i + len(x), 0] += x * g * l * 1.414; out[i:i + len(x), 1] += x * g * r * 1.414
def tone(f, d, a=0.002, dec=0.05, h=(1, 0.3)):
    t = T(d); return sum(np.sin(2 * np.pi * f * (k + 1) * t) * v for k, v in enumerate(h)) * env(len(t), a, dec)
def noise(d): return rng.standard_normal(int(d * SR))
def whoosh(d, up):
    n = int(max(d, 0.3) * SR); x = noise(n / SR); o = np.zeros(n); blk = 1024
    for i in range(0, n, blk):
        u = i / n; u = u if up else 1 - u; c = 300 * (10 ** u)
        o[i:i + blk] = filt(x[max(0, i - 2048):i + blk], [c * 0.6, min(c * 1.6, 20000)], 'band')[-len(o[i:i + blk]):]
    u = np.linspace(0, 1, n); return o * np.sin(np.pi * u) ** 2
S = {
    'pop': lambda e: tone(520, 0.12, 0.002, 0.03) + filt(noise(0.12), 3000, 'high') * env(int(0.12 * SR), 0.0005, 0.004) * 0.2,
    'blip': lambda e: tone(1320, 0.14, 0.002, 0.03, (1, 0.25)),
    'tick': lambda e: tone(2200 + rng.integers(0, 500), 0.03, 0.0005, 0.006),
    'swish': lambda e: filt(noise(0.28), 2500, 'high') * np.sin(np.pi * np.linspace(0, 1, int(0.28 * SR))) ** 2 * 0.5,
    'stamp': lambda e: (lambda t: np.sin(2 * np.pi * np.cumsum(70 * (1 + 0.8 * np.exp(-t / 0.02))) / SR) * env(len(t), 0.002, 0.08) + filt(noise(0.25), 1800, 'low') * env(len(t), 0.0005, 0.02) * 0.6)(T(0.25)),
    'whoosh_in': lambda e: whoosh(e['d'], True) * 0.6, 'whoosh_out': lambda e: whoosh(e['d'], False) * 0.6,
    'low': lambda e: tone(147, 0.9, 0.01, 0.35, (1, 0.4, 0.15)),
    'clank': lambda e: tone(420, 0.35, 0.001, 0.07, (1, 0.6, 0.4, 0.3)) * 0.7 + filt(noise(0.35), 2000, 'high') * env(int(0.35 * SR), 0.0005, 0.01) * 0.3,
    'coin': lambda e: tone(2637, 0.25, 0.001, 0.06, (1, 0.5)) * 0.6 + tone(3520, 0.25, 0.001, 0.05) * 0.3,
    'rise': lambda e: (lambda t: np.sin(2 * np.pi * np.cumsum(220 * 3 ** (t / t[-1])) / SR) * (t / t[-1]) ** 1.5 * np.clip((t[-1] - t) / 0.08, 0, 1) * 0.45)(T(max(e['d'], 0.4))),
    'bell': lambda e: sum(np.sin(2 * np.pi * f * T(1.6)) * np.exp(-T(1.6) / 0.5) * v for f, v in ((880, 1), (1318.5, 0.5), (1760, 0.25))) * env(int(1.6 * SR), 0.003, 10) * 0.5,
    'flip': lambda e: filt(noise(0.05), 1500, 'high') * env(int(0.05 * SR), 0.0005, 0.01) * 0.8,
    'beepA': lambda e: tone(660, 0.12, 0.004, 0.05), 'beepB': lambda e: tone(880, 0.12, 0.004, 0.05),
    'down': lambda e: (lambda t: np.sin(2 * np.pi * np.cumsum(330 * 0.5 ** (t / t[-1])) / SR) * env(len(t), 0.01, 0.35) * 0.6)(T(0.8)),
}
for e in ev['events']:
    place(S[e['k']](e), e['t'], e['g'], e.get('pan', 0))
sf.write(sys.argv[2], out.astype(np.float32), SR, subtype='FLOAT')
print('efeitos ok, pico', round(20 * np.log10(np.abs(out).max() + 1e-9), 1), 'dB')
