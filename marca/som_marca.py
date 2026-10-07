import json, numpy as np, soundfile as sf
from scipy import signal
SR = 48000; tm = json.load(open('times.json')); TL = tm['TL']; DUR = TL['end']
N = int(DUR * SR); out = np.zeros((N, 2)); rng = np.random.default_rng(3)
T = lambda d: np.arange(int(d * SR)) / SR
def env(n, a, d):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
def place(x, t, g=1.0, pan=0.0):
    i = int(t * SR); x = x[:N - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[i:i + len(x), 0] += x * g * l * 1.414; out[i:i + len(x), 1] += x * g * r * 1.414
nf = lambda m: 440 * 2 ** ((m - 69) / 12)
def bell(f, d=0.9):
    t = T(d); return (np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*f*2.01*t) + 0.15*np.sin(2*np.pi*f*3.02*t)) * env(len(t), 0.002, d/4)
def thump(f0=55, d=0.35):
    t = T(d); ph = 2*np.pi*np.cumsum(f0 + 90*np.exp(-t/0.025))/SR; return np.sin(ph) * env(len(t), 0.002, 0.09)
def whoosh(d, lo=300, hi=3000):
    n = int(d*SR); x = rng.standard_normal(n); sos = signal.butter(2, [lo, hi], btype='band', fs=SR, output='sos')
    w = np.sin(np.pi*np.linspace(0, 1, n))**2; return signal.sosfilt(sos, x) * w
# base e púlpito
place(thump(48), TL['base'] + 0.25, 0.9)
place(whoosh(0.4, 200, 1800), TL['base'], 0.12)
place(thump(70, 0.25), TL['pulp'] + 0.3, 0.6)
# lâmpadas: pentatônica de Ré menor subindo (mesmo tom da trilha dos vídeos)
scale = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89]
for i, t0 in enumerate(tm['seats']):
    f = nf(scale[i]); t = T(0.28)
    x = (np.sin(2*np.pi*f*t) + 0.25*np.sin(4*np.pi*f*t)) * env(len(t), 0.002, 0.07)
    place(x, t0, 0.28, pan=-0.6 + 1.2 * i / 11)
# texto entrando
place(whoosh(0.5, 800, 6000), TL['text'] - 0.1, 0.08)
# luz da sessão: dois "plim"
for k, t0 in enumerate([TL['blink'][0], TL['blink'][0] + 0.3]):
    place(bell(nf(81 + (0 if k == 0 else 5)), 1.4), t0, 0.32)
# acorde final Dm9 (D F A C E)
t = T(DUR - TL['blink'][0]); pad = np.zeros(len(t))
for m in [50, 57, 60, 64, 65, 69]:
    f = nf(m); pad += np.sin(2*np.pi*f*t) + 0.3*np.sin(2*np.pi*f*2*t + 0.3)
pad *= np.minimum(1, t/0.35) * np.clip((t[-1] - t)/0.8, 0, 1) * 0.05
pad = signal.sosfilt(signal.butter(2, 2500, fs=SR, output='sos'), pad)
place(pad, TL['blink'][0], 1.0)
out *= np.clip((DUR - np.arange(N)/SR) / 0.4, 0, 1)[:, None]
pk = np.abs(out).max(); out = out / pk * 10 ** (-3 / 20)
sf.write('vin.wav', out, SR)
