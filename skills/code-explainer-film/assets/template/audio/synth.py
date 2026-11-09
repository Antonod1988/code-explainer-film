"""Instruments and effects, all synthesised: plucked strings (Karplus-Strong), bells, PADsynth ensembles, a flute,
drums, ticks, paper, quill, whooshes. Everything returns float arrays at 48 kHz; mono unless stated."""
import numpy as np
from scipy.signal import butter, sosfilt, lfilter, fftconvolve

SR = 48000
RNG = np.random.default_rng(1054)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR * .49), 'low', fs=SR, output='sos'), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x, axis=0)


def bp(x, f0, f1, order=2):
    return sosfilt(butter(order, [f0, min(f1, SR * .49)], 'band', fs=SR, output='sos'), x, axis=0)


def peak(x, f, q, db):
    A = 10 ** (db / 40); w = 2 * np.pi * f / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


def shelf_hi(x, f, db):
    A = 10 ** (db / 40); w = 2 * np.pi * f / SR; c = np.cos(w); s = np.sin(w); al = s / 2 * np.sqrt(2); sq = 2 * np.sqrt(A) * al
    b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
    a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


def fade(x, a=.005, b=.02):
    n = len(x); ia = min(int(a * SR), n); ib = min(int(b * SR), n)
    env = np.ones(n)
    if ia: env[:ia] = np.linspace(0, 1, ia)
    if ib: env[-ib:] *= np.linspace(1, 0, ib)
    return (x.T * env).T


# ---------- plucked strings ----------
_pluck_cache = {}


def _ks(freq, dur, s=.5, g=.996, seed=0, pos=.18):
    rng = np.random.default_rng(seed)
    per = SR / freq
    L = max(2, int(per - s))
    n = int(dur * SR)
    burst = rng.uniform(-1, 1, L)
    burst = lp(burst, min(9000, freq * 14))
    k = max(1, int(L * pos))
    burst = burst - np.roll(burst, k)
    ex = np.zeros(n); ex[:L] = burst
    a = np.zeros(L + 2); a[0] = 1; a[L] = -g * (1 - s); a[L + 1] = -g * s
    y = lfilter([1.0], a, ex)
    # tune exactly: the loop period is L + s
    r = (per) / (L + s)
    idx = np.arange(int(n * min(1.0, 1 / r) - 2)) * r
    y = np.interp(idx, np.arange(n), y)
    return y


def pluck(m, kind='harp', v=1):
    key = (m, kind, v)
    if key not in _pluck_cache:
        f = mtof(m)
        if kind == 'harp':
            y = _ks(f, 5.0, s=.42, g=.9975 - (f / 20000), seed=m * 3 + v, pos=.14)
            y = peak(y, 320, .9, 2.5); y = lp(y, 7000)
        elif kind == 'lute':
            y = _ks(f, 2.6, s=.5, g=.9945 - (f / 26000), seed=m * 5 + v, pos=.22)
            y = peak(y, 280, 1.1, 5); y = peak(y, 1500, 1.4, 3.5); y = lp(y, 5200)
        elif kind == 'pizz':
            y = _ks(f, 1.1, s=.5, g=.985, seed=m * 7 + v, pos=.3)
            y = peak(y, 420, 1.0, 5); y = lp(y, 3400)
        else:
            raise ValueError(kind)
        y = y / (np.max(np.abs(y)) + 1e-9)
        y = fade(y, .0005, .12)
        _pluck_cache[key] = y.astype(np.float32)
    return _pluck_cache[key]


# ---------- bells ----------
def bell(f, dur=3.0, bright=1.0, kind='tube'):
    t = t_(dur)
    if kind == 'tube':
        parts = [(.5, .55, 1.0), (1, 1.0, .85), (1.19, .35, .6), (1.56, .45, .5), (2, .55, .42), (2.51, .3, .3), (3.0, .22 * bright, .22), (4.1, .16 * bright, .14)]
    elif kind == 'celesta':
        parts = [(1, 1.0, .7), (2, .24, .35), (3, .1 * bright, .18), (4.02, .1 * bright, .1), (7.1, .05 * bright, .05)]
    else:  # small glass
        parts = [(1, 1.0, .5), (2.76, .5, .22), (5.4, .25 * bright, .1), (8.93, .12 * bright, .05)]
    y = np.zeros(len(t))
    for r, a, d in parts:
        if f * r < SR * .45:
            y += a * np.sin(2 * np.pi * f * r * t * (1 + .0002 * r)) * np.exp(-t / (d * dur * .5))
    y += .03 * np.random.default_rng(int(f)).standard_normal(len(t)) * np.exp(-t / .004)
    return fade(y / (np.max(np.abs(y)) + 1e-9), .0005, .05)


# ---------- PADsynth: smooth ensembles from one long wavetable per note ----------
_pad_cache = {}
PN = 2 ** 19


def _formant(fr):
    return (np.exp(-((fr - 650) / 260) ** 2) + .75 * np.exp(-((fr - 1080) / 240) ** 2) + .32 * np.exp(-((fr - 2650) / 420) ** 2) + .12)


def pad_table(m, kind, seed):
    key = (m, kind, seed)
    if key in _pad_cache: return _pad_cache[key]
    f0 = mtof(m)
    rng = np.random.default_rng(m * 13 + seed + hash(kind) % 1 + len(kind) * 101)
    amp = np.zeros(PN // 2 + 1)
    frq = np.arange(PN // 2 + 1) * SR / PN
    K = int(min(40, 9000 / f0))
    for k in range(1, K + 1):
        fk = f0 * k
        if kind == 'strings':
            a = 1 / k ** 1.05 * (1 + .6 * np.exp(-((fk - 2800) / 1200) ** 2)); bw = 24
        elif kind == 'choir':
            a = float(_formant(np.array([fk]))[0]) / k ** .25; bw = 34
        elif kind == 'organ':
            a = (1 / k ** 1.5) * (1.2 if k % 2 else .5); bw = 10
        else:
            raise ValueError(kind)
        bwh = (2 ** (bw / 1200) - 1) * fk * (k ** .35) * .5 + 1.2
        i0 = int(max(0, (fk - 3.2 * bwh) * PN / SR)); i1 = int(min(PN // 2, (fk + 3.2 * bwh) * PN / SR))
        amp[i0:i1] += a * np.exp(-((frq[i0:i1] - fk) / bwh) ** 2) / np.sqrt(bwh)
    spec = amp * np.exp(2j * np.pi * rng.random(PN // 2 + 1))
    y = np.fft.irfft(spec)
    y /= np.max(np.abs(y)) + 1e-9
    _pad_cache[key] = y.astype(np.float32)
    return _pad_cache[key]


def pad(notes, dur, kind='strings', att=1.2, rel=1.6, gains=None):
    """A sustained chord; returns stereo. Each channel reads its own random-phase table, so it is wide and never beats."""
    n = int((dur + rel) * SR)
    out = np.zeros((n, 2), np.float32)
    env = np.ones(n, np.float32)
    ia = int(att * SR); ir = int(rel * SR)
    env[:ia] = (np.sin(np.linspace(0, np.pi / 2, ia)) ** 2)
    env[-ir:] *= (np.cos(np.linspace(0, np.pi / 2, ir)) ** 2)
    for j, m in enumerate(notes):
        g = 1.0 if gains is None else gains[j]
        for c in (0, 1):
            tb = pad_table(m, kind, c)
            off = int(RNG.integers(0, PN))
            idx = (off + np.arange(n)) % PN
            out[:, c] += g * tb[idx] * env
    return out / np.sqrt(max(1, len(notes)))


# ---------- flute ----------
def flute(m, dur, v=1.0, slide_from=None):
    t = t_(dur)
    f = mtof(m)
    vib = 1 + .006 * np.minimum(1, t / .5) * np.sin(2 * np.pi * 5.1 * t)
    fr = f * vib
    if slide_from is not None:
        fr = fr * (1 + (mtof(slide_from) / f - 1) * np.exp(-t / .05))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    y = np.sin(ph) + .22 * np.sin(2 * ph) + .08 * np.sin(3 * ph)
    br = bp(RNG.standard_normal(len(t)), f * .9, min(f * 3.2, 9000)) * .22
    env = np.minimum(1, t / .07) * np.minimum(1, (dur - t) / .12)
    env = np.clip(env, 0, 1) * (.9 + .1 * np.sin(2 * np.pi * 3.3 * t + 1))
    return (y + br) * env * v


# ---------- percussion and clockwork ----------
def frame_drum(v=1.0, low=88):
    t = t_(.7)
    f = low * (1 + .5 * np.exp(-t / .03))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .16)
    n = lp(RNG.standard_normal(len(t)), 1200) * np.exp(-t / .03) * .5
    return fade((y + n) * v, .0005, .05)


def tick(pitch=1.0, v=1.0):
    t = t_(.05)
    y = (np.sin(2 * np.pi * 2300 * pitch * t) * np.exp(-t / .004) + .6 * np.sin(2 * np.pi * 5100 * pitch * t) * np.exp(-t / .0025)
         + .5 * np.sin(2 * np.pi * 820 * pitch * t) * np.exp(-t / .008))
    n = hp(RNG.standard_normal(len(t)), 2500) * np.exp(-t / .0016) * .7
    return fade((y + n) * v, .0001, .004)


def tock(v=1.0):
    t = t_(.09)
    y = np.sin(2 * np.pi * 410 * t) * np.exp(-t / .016) + .5 * np.sin(2 * np.pi * 1180 * t) * np.exp(-t / .006)
    n = bp(RNG.standard_normal(len(t)), 500, 3000) * np.exp(-t / .004) * .6
    return fade((y + n) * v, .0001, .006)


def thunk(v=1.0):
    t = t_(.4)
    y = np.sin(2 * np.pi * 150 * t) * np.exp(-t / .07) + .7 * np.sin(2 * np.pi * 395 * t) * np.exp(-t / .03) + .3 * np.sin(2 * np.pi * 980 * t) * np.exp(-t / .012)
    n = lp(RNG.standard_normal(len(t)), 3000) * np.exp(-t / .005) * .6
    return fade((y + n) * v, .0002, .03)


def stamp(v=1.0):
    t = t_(.5)
    f = 92 * (1 + .6 * np.exp(-t / .012))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .09)
    n = bp(RNG.standard_normal(len(t)), 300, 4000) * np.exp(-t / .018) * .6
    return fade((y + n) * v, .0002, .03)


def boom(dur=2.2, f0=58, f1=34, v=1.0):
    t = t_(dur)
    f = f1 + (f0 - f1) * np.exp(-t / .35)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * .34))
    r = lp(RNG.standard_normal(len(t)), 240) * np.exp(-t / (dur * .26)) * .55
    return fade(np.tanh((y + r) * 1.3) * v, .002, .1)


def plop(v=1.0):
    t = t_(.14)
    f = 330 + 1300 * (t / .14) ** 1.6
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .045)
    return fade(y * v, .001, .01)


def hoof(v=1.0):
    t = t_(.12)
    y = np.sin(2 * np.pi * 640 * t) * np.exp(-t / .012) + .6 * np.sin(2 * np.pi * 1330 * t) * np.exp(-t / .007) + .7 * np.sin(2 * np.pi * 210 * t) * np.exp(-t / .02)
    return fade(y * v, .0002, .01)


def owl_hoot(v=1.0):
    def hoo(f0, d):
        t = t_(d)
        vib = 1 + .012 * np.sin(2 * np.pi * 7 * t)
        f = f0 * (1 + .04 * np.sin(np.pi * t / d)) * vib
        ph = 2 * np.pi * np.cumsum(f) / SR
        y = np.sin(ph) + .22 * np.sin(2 * ph)
        br = bp(RNG.standard_normal(len(t)), 500, 2600) * .05
        return (y + br) * np.sin(np.pi * np.minimum(1, t / d)) ** .7
    a, b = hoo(345, .26), hoo(305, .55)
    y = np.concatenate([a, np.zeros(int(.09 * SR)), b])
    return y * v


def low_call(v=1.0):
    t = t_(1.5)
    f = 118 - 26 * (t / 1.5)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = sum(np.sin(k * ph) / k ** .9 for k in range(1, 9))
    y = lp(y, 620) * np.sin(np.pi * t / 1.5) ** .8
    return y * v * .4


# ---------- shaped noise: a moving band of noise from a filter-bank in the STFT domain ----------
def shaped(dur, center, width, env, seed=None):
    """center, width, env: arrays or callables over 0..1 (Hz, Hz, gain)."""
    rng = np.random.default_rng(seed) if seed is not None else RNG
    n = int(dur * SR); nfft = 1024; hop = 256
    win = np.hanning(nfft)
    frq = np.arange(nfft // 2 + 1) * SR / nfft
    out = np.zeros(n + nfft)
    frames = (n // hop) + 1
    u = np.linspace(0, 1, frames)
    c = center(u) if callable(center) else np.interp(u, np.linspace(0, 1, len(center)), center)
    w = width(u) if callable(width) else np.interp(u, np.linspace(0, 1, len(width)), width)
    e = env(u) if callable(env) else np.interp(u, np.linspace(0, 1, len(env)), env)
    for i in range(frames):
        mag = e[i] * np.exp(-((np.log(frq + 40) - np.log(c[i] + 40)) / (w[i] / (c[i] + 40) + 1e-3)) ** 2)
        spec = mag * np.exp(2j * np.pi * rng.random(len(frq)))
        out[i * hop:i * hop + nfft] += np.fft.irfft(spec) * win
    y = out[:n]
    return y / (np.max(np.abs(y)) + 1e-9)


def whoosh(dur=1.2, f0=500, f1=4200, v=1.0, width=.6):
    u = lambda a: np.sin(np.pi * a) ** 1.6
    y = shaped(dur, lambda a: f0 * (f1 / f0) ** a, lambda a: width * (f0 * (f1 / f0) ** a), u)
    return y * v


def paper_wipe(dur=1.5, v=1.0):
    """Parchment rushing past: a broad whoosh plus crackle."""
    y = whoosh(dur, 900, 3600, .8, .9)
    t = np.arange(len(y)) / SR
    cr = hp(RNG.standard_normal(len(y)), 2600)
    gate = lp((RNG.random(len(y)) < .0016).astype(float) * 30, 900)
    cr = cr * np.clip(gate, 0, 1) * np.sin(np.pi * t / dur) ** .7
    return (y + .55 * cr) * v


def paper_slide(dur=1.6, v=1.0):
    t = t_(dur)
    y = bp(RNG.standard_normal(len(t)), 700, 5200)
    env = np.minimum(1, t / .2) * np.minimum(1, (dur - t) / .5) * (.7 + .3 * lp(RNG.standard_normal(len(t)), 8) * 8)
    return y * np.clip(env, 0, 1) * v * .5


def quill(dur=1.0, v=1.0, rate=11):
    t = t_(dur)
    y = bp(RNG.standard_normal(len(t)), 2600, 8200)
    # strokes: irregular bursts
    pulses = np.abs(np.sin(2 * np.pi * rate * t + 3 * np.sin(2 * np.pi * 2.3 * t))) ** 3
    return y * pulses * np.minimum(1, t / .03) * np.minimum(1, (dur - t) / .05) * v * .6


def page_turn(v=1.0):
    y = whoosh(.42, 1400, 3000, .8, .9)
    return y * v


def shimmer(dur=2.0, v=1.0, lo=2200, hi=7800, n=38, seed=5):
    rng = np.random.default_rng(seed)
    out = np.zeros(int((dur + .6) * SR))
    for i in range(n):
        at = rng.random() ** .8 * dur
        f = lo * (hi / lo) ** rng.random()
        b = bell(f, .6, .5, 'glass') * (.35 + .65 * rng.random())
        s = int(at * SR)
        out[s:s + len(b)] += b[:len(out) - s]
    return out / (np.max(np.abs(out)) + 1e-9) * v


def swell(dur=2.0, f0=200, f1=2400, v=1.0):
    y = shaped(dur, lambda a: f0 * (f1 / f0) ** a, lambda a: .7 * (f0 * (f1 / f0) ** a), lambda a: a ** 2.2)
    return fade(y, .01, .03) * v


def hum(dur, f, v=1.0, wob=.5):
    t = t_(dur)
    fr = f * (1 + .02 * np.sin(2 * np.pi * wob * t))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    y = np.sin(ph) + .5 * np.sin(2 * ph) + .25 * np.sin(3 * ph) + .08 * np.sin(5 * ph)
    env = np.minimum(1, t / .4) * np.minimum(1, (dur - t) / .6) * (.75 + .25 * np.sin(2 * np.pi * wob * t))
    return y * env * v


def rumble(dur, v=1.0, f=170):
    y = lp(RNG.standard_normal(int(dur * SR)), f, 3)
    t = np.arange(len(y)) / SR
    env = np.minimum(1, t / 1.5) * np.minimum(1, (dur - t) / 1.5) * (.8 + .2 * np.sin(2 * np.pi * .13 * t))
    return y / (np.max(np.abs(y)) + 1e-9) * env * v


def relay_burst(dur=2.2, v=1.0):
    out = np.zeros(int(dur * SR))
    t = 0
    while t < dur - .06:
        c = tick(.6 + RNG.random() * .9, .4 + RNG.random() * .6)
        s = int(t * SR); out[s:s + len(c)] += c[:len(out) - s]
        t += .03 + RNG.random() ** 2 * .16
    return out * v


def blips(dur=2.4, v=1.0):
    out = np.zeros(int((dur + .4) * SR))
    t = 0
    while t < dur:
        m = int(RNG.choice([74, 77, 79, 81, 84, 86, 89]))
        b = bell(mtof(m), .28, .4, 'celesta') * (.5 + .5 * RNG.random())
        s = int(t * SR); out[s:s + len(b)] += b[:len(out) - s]
        t += RNG.choice([.09, .13, .18, .26])
    return out * v


# ---------- room ----------
def hall_ir(rt=2.6, seed=3, predelay=.024):
    rng = np.random.default_rng(seed)
    n = int(rt * 1.2 * SR)
    t = np.arange(n) / SR
    out = np.zeros((n + int(predelay * SR), 2))
    for c in (0, 1):
        y = rng.standard_normal(n) * 10 ** (-3 * t / rt)
        y = lp(y, 7600); y = hp(y, 150)
        # highs die sooner
        y2 = lp(rng.standard_normal(n), 1500) * 10 ** (-3 * t / rt)
        y = .55 * y * np.exp(-t / (rt * .32)) + .55 * y2
        out[int(predelay * SR):, c] = y
    for d, g in [(.011, .6), (.019, .5), (.027, .42), (.041, .36), (.057, .3)]:
        out[int(d * SR), 0] += g * .6 * rng.choice([-1, 1]); out[int((d * 1.13) * SR), 1] += g * .6 * rng.choice([-1, 1])
    out /= np.sqrt(np.sum(out ** 2, axis=0) + 1e-9)
    return out


def convolve_st(x, ir):
    return np.stack([fftconvolve(x[:, c], ir[:, c], mode='full')[:len(x)] for c in (0, 1)], axis=1)
