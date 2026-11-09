"""Music and effects written against the narration of one language, then the mix.

  python audio/score.py ru       writes audio/mix/ru.wav (−15 LUFS), audio/mix/ru_buses.npz-free stems as wavs on request
"""
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from scipy.signal import fftconvolve

sys.path.insert(0, str(Path(__file__).resolve().parent))
from synth import *  # noqa

ROOT = Path(__file__).resolve().parent.parent
LANG = sys.argv[1] if len(sys.argv) > 1 else 'ru'
FF = imageio_ffmpeg.get_ffmpeg_exe()
TL = json.loads(re.search(r"=\s*(\{.*\})\s*;", (ROOT / 'web' / f'timing_{LANG}.js').read_text(encoding='utf-8'), re.S).group(1))
BEAT = {b['id']: b for b in TL['beats']}
CUE = {}
for b in TL['beats']:
    CUE.update(b['cues'])
TOTAL = TL['total']
N = int((TOTAL + 1.0) * SR)
music = np.zeros((N, 2), np.float32)
fx = np.zeros((N, 2), np.float32)
rng = np.random.default_rng(2026)


def put(bus, t, x, g=1.0, pan=0.0):
    s = int(t * SR)
    if s >= N or s < 0 and len(x) + s <= 0:
        return
    if s < 0:
        x = x[-s:]; s = 0
    x = x[:N - s]
    if x.ndim == 1:
        th = (pan + 1) * np.pi / 4
        bus[s:s + len(x), 0] += (g * np.cos(th) * x).astype(np.float32)
        bus[s:s + len(x), 1] += (g * np.sin(th) * x).astype(np.float32)
    else:
        bus[s:s + len(x)] += (g * x).astype(np.float32)


# ---------- harmony ----------
PC = {'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'Bb': 10, 'B': 11}


def chord(name):
    m = re.match(r'([A-G]b?)(m?)(sus|7)?', name)
    r = PC[m.group(1)]
    third = 3 if m.group(2) else 4
    if m.group(3) == 'sus':
        third = 5
    return r, [0, third, 7]


def voiced(name, lo=52):
    """Close triad at or above lo."""
    r, iv = chord(name)
    notes = []
    for i in iv:
        n = lo + ((r + i - lo) % 12)
        notes.append(n)
    return sorted(notes)


def arp_notes(name, lo=60, n=6):
    r, iv = chord(name)
    pool = []
    for oct_ in range(0, 4):
        for i in iv:
            m = r + i + 12 * (oct_ + 4)
            if m >= lo:
                pool.append(m)
    return sorted(pool)[:n]


def bass_of(name, lo=36):
    r, _ = chord(name)
    return lo + ((r - lo) % 12)


# ---------- styles: each writes one bar ----------
def s_pad(t, bar, c, kind='strings', g=.24, lo=52, att=1.0):
    put(music, t, pad(voiced(c, lo), bar + .3, kind, att=att, rel=1.8), g)


def s_bass(t, bar, c, g=.32, kind='organ'):
    put(music, t, pad([bass_of(c)], bar + .2, kind, att=.5, rel=1.2), g)


def s_arp(t, bar, c, pattern, inst='harp', g=.2, lo=60, div=8, width=.5):
    notes = arp_notes(c, lo, 7)
    step = bar / div
    for i in range(div):
        k = pattern[i % len(pattern)]
        if k is None:
            continue
        m = notes[k % len(notes)]
        v = (1.0 if i % 4 == 0 else .72) * (.88 + .24 * rng.random())
        pan = np.sin(i * 1.3 + t) * width
        put(music, t + i * step + rng.normal(0, .004), pluck(m, inst, int(i % 2)), g * v, pan)


def s_bells(t, bar, c, g=.1, lo=76, pat=(0, 3, 5, 6), div=8, kind='celesta'):
    notes = arp_notes(c, lo, 7)
    step = bar / div
    for i, k in enumerate(pat):
        if k is None:
            continue
        put(music, t + k * step, bell(mtof(notes[i % len(notes)]), 1.8, .8, kind), g, .3 * np.sin(i * 2 + t))


def s_drum(t, bar, pat=(0,), g=.25, low=88, div=8):
    for k in pat:
        put(music, t + k * bar / div, frame_drum(.8 + .2 * rng.random(), low), g, rng.uniform(-.1, .1))


# the only tune in the film: a short modal phrase for flute, in D dorian
TUNE = [(0, 69, 1), (1, 72, .5), (1.5, 74, 1.5), (3, 72, .5), (3.5, 69, .5), (4, 67, 1), (5, 69, 1), (6, 65, .5), (6.5, 67, .5), (7, 69, 1.8),
        (8.5, 74, .5), (9, 76, 1), (10, 74, .5), (10.5, 72, .5), (11, 69, 1), (12, 67, .5), (12.5, 69, .5), (13, 62, 2.6)]


def s_tune(t, beat, g=.13, every=None, transpose=0):
    prev = None
    for at, m, d in TUNE:
        put(music, t + at * beat, flute(m + transpose, d * beat * .96, 1.0, prev), g, -.18)
        prev = m + transpose


# ---------- the plan: sections start exactly on the voice beats ----------
BAR0 = 3.2
SECTIONS = [
    ('opening', 0.5, BEAT['b02']['start'] - .1, ['Dm', 'C', 'Bb', 'Am']),
    ('drift', BEAT['b02']['start'] - .1, BEAT['b03']['start'] - .2, ['Dm', 'Am', 'Bb', 'F']),
    ('wonder', BEAT['b03']['start'] - .2, BEAT['b06']['start'] - .1, ['F', 'C', 'Dm', 'Am', 'Bb', 'F', 'Gm', 'Asus', 'A']),
    ('ages', BEAT['b06']['start'] - .1, BEAT['b07']['start'] - .1, ['Dm', 'Am', 'Bb', 'A']),
    ('pins', BEAT['b07']['start'] - .1, BEAT['b08']['start'] - .2, ['F', 'C', 'Gm', 'Dm']),
    ('clockwork', BEAT['b08']['start'] - .2, BEAT['b09']['start'] - .2, ['Dm', 'Bb', 'Gm', 'A']),
    ('conj', BEAT['b09']['start'] - .2, BEAT['b10']['start'] - .2, ['F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C']),
    ('wheel', BEAT['b10']['start'] - .2, BEAT['b11']['start'] - .2, ['Gm', 'Dm', 'Eb', 'Bb', 'Gm', 'Dm', 'Asus', 'A']),
    ('now', BEAT['b11']['start'] - .2, BEAT['b12']['start'] - .2, ['Dm', 'Eb', 'Dm', 'Bb', 'Gm', 'Asus', 'A']),
    ('book', BEAT['b12']['start'] - .2, BEAT['b13']['start'] - .2, ['Dm', 'Am', 'Bb', 'F', 'Gm', 'Dm', 'Eb', 'A', 'Dm', 'Am', 'F', 'C']),
    ('eclipse', BEAT['b13']['start'] - .2, BEAT['b14']['start'] - .2, ['Dm', 'Bb', 'Dm', 'A']),
    ('knot', BEAT['b14']['start'] - .2, CUE['tri'] - .3, ['Bb', 'Gm', 'Eb', 'Asus', 'A']),
    ('lift', CUE['tri'] - .3, BEAT['b15']['start'] - .2, ['F', 'C', 'Dm', 'Bb']),
    ('stairs', BEAT['b15']['start'] - .2, BEAT['b16']['start'] - .3, ['F', 'G', 'Am', 'Bb', 'C', 'Dm']),
    ('ending', BEAT['b16']['start'] - .3, CUE['last'] - .1, ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A']),
]
UP = [0, 1, 2, 3, 4, 3, 2, 1]
WAVE = [0, 2, 1, 3, 2, 4, 3, 5]
CLOCK = [0, 2, 1, 2, 0, 3, 1, 2, 0, 2, 1, 2, 0, 4, 2, 3]


def write_section(name, t0, t1, chords):
    nb = max(1, round((t1 - t0) / BAR0))
    bar = (t1 - t0) / nb
    for i in range(nb):
        t = t0 + i * bar
        c = chords[i % len(chords)]
        u = i / max(1, nb - 1)
        if name == 'opening':
            s_pad(t, bar, c, 'strings', .16, att=1.6)
            s_bass(t, bar, c, .18)
            if i >= 1: s_arp(t, bar, c, [0, 2, 1, 3, 2, 4, None, 3], 'harp', .17)
            if i == 1: s_tune(t, bar / 4, .1)
        elif name == 'drift':
            s_pad(t, bar, c, 'strings', .17)
            s_arp(t, bar, c, [0, None, 2, None, 1, None, 3, None], 'harp', .15)
            if i % 2 == 0: s_bells(t, bar, c, .05)
        elif name == 'wonder':
            s_pad(t, bar, c, 'choir', .19, lo=55)
            s_pad(t, bar, c, 'strings', .1)
            s_bass(t, bar, c, .2)
            s_arp(t, bar, c, WAVE, 'harp', .16)
            s_bells(t, bar, c, .07, pat=(0, 3, 6))
        elif name == 'ages':
            s_pad(t, bar, c, 'strings', .1)
            s_arp(t, bar, c, [0, None, 1, 2, None, 1, 3, None], 'pizz', .24, lo=55)
            put(music, t, pluck(bass_of(c, 40), 'pizz', 0), .3)
            put(music, t + bar / 2, pluck(bass_of(c, 40) + 7, 'pizz', 1), .22)
            s_drum(t, bar, (0, 4, 6), .16, 110)
        elif name == 'pins':
            s_pad(t, bar, c, 'strings', .11)
            s_arp(t, bar, c, [0, 1, 2, None, 3, 2, None, 1], 'lute', .17)
            put(music, t, pluck(bass_of(c, 40), 'pizz', 0), .24)
        elif name == 'clockwork':
            s_pad(t, bar, c, 'strings', .14 + .05 * u)
            s_bass(t, bar, c, .24)
            s_arp(t, bar, c, CLOCK, 'lute', .16 + .05 * u, lo=57, div=16)
            s_drum(t, bar, (0, 3, 6), .16 + .1 * u, 76)
        elif name == 'conj':
            s_pad(t, bar, c, 'choir', .2, lo=57)
            s_pad(t, bar, c, 'strings', .1)
            s_bass(t, bar, c, .22)
            s_arp(t, bar, c, [0, None, 2, 1, None, 3, 2, None], 'harp', .13)
            s_bells(t, bar, c, .08, lo=79)
        elif name == 'wheel':
            s_pad(t, bar, c, 'strings', .15)
            s_bass(t, bar, c, .26)
            s_arp(t, bar, c, [0, 2, 1, 3, 0, 2, 4, 3], 'lute', .17, lo=55)
            s_drum(t, bar, (0, 5), .18, 72)
        elif name == 'now':
            s_pad(t, bar, c, 'strings', .13, lo=48)
            s_bass(t, bar, 'Dm', .26)
            s_arp(t, bar, c, [0, None, None, 2, None, None, 1, None], 'harp', .12)
        elif name == 'book':
            s_pad(t, bar, c, 'strings', .1, lo=50)
            s_arp(t, bar, c, [0, None, 2, None, None, 1, None, None], 'harp', .15)
            if i % 4 == 3: s_bells(t, bar, c, .05, pat=(4,))
        elif name == 'eclipse':
            s_pad(t, bar, c, 'choir', .22, lo=50, att=1.6)
            s_bass(t, bar, 'Dm', .3)
            if i == 0: put(music, t + .1, bell(mtof(50), 6, .7, 'tube'), .22)
        elif name == 'knot':
            s_pad(t, bar, c, 'strings', .17, lo=48)
            s_bass(t, bar, c, .3)
            s_arp(t, bar, c, [0, 0, 2, 0, 1, 0, 3, 0], 'lute', .13, lo=48)
            s_drum(t, bar, (0, 2, 5), .2, 64)
        elif name == 'lift':
            s_pad(t, bar, c, 'choir', .2, lo=57)
            s_pad(t, bar, c, 'strings', .11)
            s_bass(t, bar, c, .24)
            s_arp(t, bar, c, WAVE, 'harp', .17)
            s_bells(t, bar, c, .08)
        elif name == 'stairs':
            s_pad(t, bar, c, 'strings', .14 + .07 * u)
            s_pad(t, bar, c, 'choir', .12 + .1 * u, lo=60)
            s_bass(t, bar, c, .26)
            s_arp(t, bar, c, UP, 'harp', .17 + .05 * u, lo=60 + int(u * 7), div=8)
            s_bells(t, bar, c, .07 + .05 * u, lo=79, pat=(0, 2, 4, 6))
            s_drum(t, bar, (0, 4), .14 + .1 * u, 80)
        elif name == 'ending':
            s_pad(t, bar, c, 'strings', .17, att=1.4)
            s_bass(t, bar, c, .2)
            s_arp(t, bar, c, [0, None, 2, None, 3, None, 1, None] if u < .6 else [0, None, None, 2, None, None, 3, None], 'harp', .15)
            if i == 1: s_tune(t, bar / 4, .08)


for sec in SECTIONS:
    write_section(*sec)
    print('music', sec[0], round(sec[2] - sec[1], 1), flush=True)
# the last chord: D major, on "a little"
tEnd = CUE['last'] - .1
put(music, tEnd, pad([50, 57, 62, 66, 69, 74], TOTAL - tEnd - .4, 'strings', att=.9, rel=2.2), .24)
put(music, tEnd, pad([38, 45, 50], TOTAL - tEnd - .4, 'organ', att=.8, rel=2.2), .3)
put(music, tEnd + .05, bell(mtof(74), 5, .8, 'tube'), .2, -.1)
put(music, tEnd + .5, bell(mtof(78), 4.5, .8, 'tube'), .13, .15)
put(music, tEnd + 1.0, bell(mtof(81), 4.5, .8, 'tube'), .13, -.2)
for i, m in enumerate([62, 66, 69, 74, 78, 81]):
    put(music, tEnd + .1 + i * .13, pluck(m, 'harp', 0), .2, np.sin(i) * .4)


# ---------- effects, cue by cue ----------
WIPES = [BEAT['b03']['start'] - .3, BEAT['b06']['start'] - .15, BEAT['b07']['start'] - .15, BEAT['b08']['start'] - .2, BEAT['b12']['start'] - .15, BEAT['b13']['start'] - .15, CUE['end'] - .25]
put(fx, 0.25, paper_wipe(1.6), .3, .4)
for w in WIPES:
    put(fx, w - .75, paper_wipe(1.5), .28, .35)

# opening: the star flares, she plants it, the deed slides in, the quill writes
F, P, CUT = CUE['flare'], CUE['plant'], CUE['cut']
put(fx, F - .5, swell(.55, 800, 5200), .12)
put(fx, F, shimmer(1.8, 1.0, seed=1), .26, .3)
put(fx, F, bell(mtof(86), 2.5, 1.0, 'glass'), .2, .3)
put(fx, P - 3.62 + .68 + .14, bell(mtof(93), .9, .8, 'glass'), .14, .35)   # she takes the star
put(fx, P - .42, whoosh(.46, 500, 2400), .2, .2)
put(fx, P, thunk(), .62, .15)
put(fx, P, bell(mtof(81), 1.8, .8, 'celesta'), .22, .15)
put(fx, P + .02, shimmer(.7, 1.0, seed=2), .12, .15)
put(fx, P + .1, owl_hoot(), .05, -.5)
put(fx, CUT + .1, paper_slide(1.6), .3, -.2)
put(fx, CUT + 1.12, quill(.96), .24, .15)
put(fx, CUE['old'] - .1, paper_slide(.9), .22, .3)

# drift: a faint, slow turning of the sky
put(fx, CUE['drift'] - .5, swell(3.2, 120, 900), .06)
for i in range(4):
    put(fx, CUE['drift'] + i * 1.1, bell(mtof(84 + i * 2), .9, .5, 'glass'), .05, -.3 + i * .2)

# wobble: top hums, axis turns
tTop, tE = CUE['top'], CUE['earth']
put(fx, tTop - .7, hum(tE + .9 - (tTop - .7), 165, 1.0, .4), .05, .3)
put(fx, BEAT['b03']['start'], swell(1.6, 100, 700), .05)
put(fx, tE, boom(2.4, 62, 38), .2)
# pole: the year runs, bright pings when a pole star is reached
put(fx, CUE['thuban'] - 1.3, whoosh(1.5, 300, 1500), .1, -.3)
put(fx, CUE['thuban'], bell(mtof(79), 2.2, .9, 'tube'), .2, -.25)
put(fx, CUE['vega'] - 1.5, whoosh(1.9, 300, 2200), .12, .3)
put(fx, CUE['vega'] + .3, bell(mtof(84), 2.2, .9, 'tube'), .2, .3)
put(fx, BEAT['b04']['start'] + .7, bell(mtof(74), 2.2, .8, 'tube'), .12)
# zodiac: borders tick by; a low gong on "age"
vp0 = CUE['vp'] + 3.3
span = CUE['era'] - .1 - vp0
for yr in (-1865, -67):
    u = (yr + 4400) / (2026 + 4400)
    put(fx, vp0 + u * span, bell(mtof(69 if yr < 0 else 72), 2.8, .8, 'tube'), .2)
put(fx, CUE['vp'] - .2, shimmer(1.3, 1.0, seed=3), .14)
put(fx, CUE['era'], bell(mtof(50), 4.5, .7, 'tube'), .3)
put(fx, CUE['era'], boom(2.2, 55, 36), .16)

# ages: a sound for each banner, then the owl
put(fx, CUE['tau'] + .05, low_call(), .34, -.1)
put(fx, CUE['tau'] + .05, frame_drum(1, 66), .18)
for i in (0, .16, .34, .5):
    put(fx, CUE['ari'] + i, hoof(), .16, .2)
for i in (0, .22, .5):
    put(fx, CUE['psc'] + i, plop(), .2, -.2 + i)
put(fx, CUE['back'] - .15, whoosh(.3, 400, 1600), .12, .5)
put(fx, CUE['back'] + .22, owl_hoot(), .26, .5)
put(fx, CUE['back'] + .1, pluck(55, 'pizz', 0), .3, .4)
put(fx, CUE['back'] + .3, pluck(50, 'pizz', 1), .3, .4)

# pins
for q, pan, m in [(CUE['d1'] - .4, -.2, 74), (CUE['d1'], -.7, 77), (CUE['d2'], .8, 81), (CUE['d3'], .1, 86)]:
    put(fx, q, thunk(.8), .22, pan)
    put(fx, q, bell(mtof(m), 1.4, .8, 'celesta'), .2, pan)
put(fx, CUE['life'], whoosh(.8, 900, 400), .08)
for i, m in enumerate([74, 72, 69, 65]):
    put(fx, CUE['life'] + .1 + i * .17, pluck(m, 'pizz', 0), .2, -.2)
put(fx, CUE['life'] + .95, owl_hoot(), .18, -.2)

# the orrery: gears, faster and faster, and a carillon of planets
s0 = BEAT['b08']['start']; s1 = BEAT['b09']['start']
t = s0 - .2
while t < s1 + .1:
    rate = 1.6 if t < CUE['fast'] - .4 else 1.6 + (t - CUE['fast'] + .4) * 2.2
    put(fx, t, tick(1.0, 1.0) if int(t * rate) % 2 else tock(1.0), .1, np.sin(t * 2) * .25)
    t += 1 / min(rate * 2, 14)
for q, m in [('j', 86), ('s', 81), ('u', 77), ('n', 74), ('p', 69)]:
    put(fx, CUE[q], bell(mtof(m), 2.6, 1.0, 'tube'), .27, {'j': -.3, 's': .25, 'u': -.15, 'n': .3, 'p': -.35}[q])
put(fx, CUE['fast'] - .1, swell(.9, 400, 2400), .08)

# the meeting of 2020
put(fx, CUE['gc'] - .3, swell(2.6, 200, 1900), .1)
put(fx, CUE['gc'] + 2.3, shimmer(2.4, 1.0, seed=6), .2)
put(fx, CUE['gc'] + 2.3, bell(mtof(62), 5, .9, 'tube'), .26)
put(fx, CUE['gc'] + 2.3, bell(mtof(69), 5, .9, 'tube'), .2)
put(fx, CUE['gc'] + 2.3, boom(3, 50, 32), .18)
# signs slide off the stars: a ratchet
t = CUE['sign'] + .9
while t < CUE['sign'] + 5.4:
    put(fx, t, tick(.7, 1.0), .07, .2)
    t += .11
put(fx, CUE['sign'] + 5.4, thunk(.9), .24, .1)

# the wheel: each hand arrives
for q, m, pan in [('pl', 58, -.3), ('ne', 62, .25), ('ur', 65, .35)]:
    put(fx, CUE[q], bell(mtof(m + 12), 3, .9, 'tube'), .26, pan)
    put(fx, CUE[q], frame_drum(1, 58), .24, pan)
put(fx, CUE['sn'], bell(mtof(69), 3.2, .9, 'tube'), .26, .2)
put(fx, CUE['sn'] + .08, bell(mtof(74), 3.2, .9, 'tube'), .22, .25)
for i, m in enumerate([74, 77, 81, 86]):
    put(fx, CUE['hex'] + .12 + i * .46, bell(mtof(m), 3, 1.0, 'tube'), .24, -.3 + i * .2)
put(fx, CUE['hex'] + .1, swell(1.9, 300, 2600), .08)
put(fx, CUE['hex'] + 2.0, shimmer(1.7, 1.0, seed=7), .16)

# now: three turns
for dt, m, pan in [(.5, 69, .3), (1.3, 62, .1), (2.1, 74, -.35)]:
    q = CUE['st'] + dt
    put(fx, q - .34, swell(.36, 300, 1500), .1, pan)
    put(fx, q, thunk(.8), .2, pan)
    put(fx, q, bell(mtof(m), 2.6, .8, 'tube'), .2, pan)
# the inside lane: the Earth sweeps past
tL = CUE['loop']
for dt in (1.0, 5.4):
    put(fx, tL + dt, whoosh(1.3, 220, 900, 1.0, .5), .13, -.4)
put(fx, CUE['y1896'], bell(mtof(69), 3, .8, 'tube'), .18)

# the book
put(fx, BEAT['b12']['start'] + .25, thunk(.7), .2)
put(fx, CUE['exact'] - .9, quill(.8, 1.0, 7), .3, 0)
for i in range(6):
    put(fx, CUE['exact'] + .25 + i * .22, bell(mtof(86), .3, .5, 'glass'), .05, -.3)
put(fx, CUE['trad'] + 1.2, stamp(), .46, .3)
for q in ('pw', 'un', 'eniac', 'bomb', 'ai'):
    put(fx, CUE[q] - .15, page_turn(), .16, .3)
put(fx, CUE['pw'] - .5, whoosh(.9, 400, 1100, 1, .5), .05)
put(fx, CUE['eniac'] + .1, relay_burst(CUE['bomb'] - CUE['eniac'] - .3), .15, .25)
put(fx, CUE['bomb'] + .1, boom(3.4, 46, 28), .3)
put(fx, CUE['bomb'] + .1, rumble(3.2, 1.0, 200), .14)
put(fx, CUE['ai'] + .05, blips(BEAT['b12']['end'] - CUE['ai'] + .3), .08, .2)

# the eclipse: everything hushes as the shadow arrives
put(fx, CUE['ecl'] - .3, swell(1.4, 90, 700), .12)
put(fx, CUE['lux'], boom(4, 44, 26), .3)
put(fx, CUE['lux'], rumble(5, 1.0, 130), .14)
put(fx, CUE['lux'] + .1, shimmer(4.5, 1.0, 3000, 9000, 60, seed=8), .14)
put(fx, CUE['sp'], bell(mtof(69), 2.4, .7, 'tube'), .13, -.4)
put(fx, CUE['af'], bell(mtof(65), 2.4, .7, 'tube'), .13, -.1)

# 2028
put(fx, CUE['s2'], stamp(.9), .28, .25)
put(fx, CUE['sq'], boom(1.8, 74, 44), .22)
put(fx, CUE['sq'] + .75, pad([50, 51, 57], 1.6, 'strings', att=.08, rel=.9), .22)
for i, m in enumerate([69, 74, 81]):
    put(fx, CUE['tri'] + .1 + i * .45, bell(mtof(m), 3.2, 1.0, 'tube'), .24, -.35 + i * .35)
put(fx, CUE['tri'] + 1.3, shimmer(1.6, 1.0, seed=9), .14)

# stairs: a step and a note at each meeting, then the border
for dt, m in [(CUE['h32'], 69), (CUE['h40'], 74), (CUE['h40'] + 1.15, 77), (CUE['h40'] + 2.3, 81)]:
    put(fx, dt, thunk(.9), .2, .1)
    put(fx, dt, bell(mtof(m), 2.6, 1.0, 'tube'), .25, .1)
hB = BEAT['b15']['end'] - .2
put(fx, CUE['h2597'] - .2, swell(hB - CUE['h2597'] + .2, 200, 2800), .12)
put(fx, hB, boom(3, 52, 32), .24)
put(fx, hB, bell(mtof(62), 5, .9, 'tube'), .28)
put(fx, hB, bell(mtof(81), 4, 1.0, 'tube'), .18)
put(fx, hB, shimmer(2.2, 1.0, seed=10), .2)

# the clock ticks once a second, the nebula breathes, the pen writes the new year
s = BEAT['b16']['start']
k = 0
while s + k < CUE['star'] - .1:
    put(fx, s + k, (tick if k % 2 == 0 else tock)(1.0, 1.0) if k % 2 == 0 else tock(1.0), .2, .12)
    k += 1
put(fx, CUE['star'] - .3, swell(CUE['crab'] - CUE['star'] + .5, 120, 2200), .13)
put(fx, CUE['crab'], boom(3.6, 42, 26), .24)
put(fx, CUE['crab'], rumble(CUE['end'] - CUE['crab'] + 1, 1.0, 150), .12)
put(fx, CUE['crab'] + .2, shimmer(CUE['end'] - CUE['crab'], 1.0, 2500, 9500, 90, seed=11), .16)
put(fx, CUE['end'] + .1, quill(CUE['last'] - CUE['end'] + .1), .22, .15)
put(fx, CUE['last'] + 1.0, owl_hoot(), .1, -.45)


# ---------- the voice ----------
voice = np.zeros(N, np.float32)
for b in TL['beats']:
    with open(ROOT / 'audio' / 'voice' / LANG / f"{b['id']}.wav", 'rb') as f:
        raw = f.read()
    # float32 wav written by ffmpeg: find the data chunk
    i = raw.find(b'data')
    y = np.frombuffer(raw[i + 8:], dtype=np.float32)
    s = int(b['start'] * SR)
    voice[s:s + len(y)] += y[:N - s]
v = hp(voice, 85)
v = peak(v, 180, 1.0, 1.0)
v = peak(v, 3000, .9, 3.2)
v = shelf_hi(v, 8000, .5)
# a touch of air: harmonics of the top band that the source lacks
air = hp(np.tanh(hp(v, 4500) * 5) / 5, 6500)
v = v + .1 * air
# slow levelling: evens out phrases without pumping
envw = np.sqrt(fftconvolve(v ** 2, np.ones(int(.4 * SR)) / int(.4 * SR), mode='same') + 1e-8)
target = np.percentile(envw[envw > 1e-3], 70)
gain = np.clip(target / (envw + 1e-4), .7, 1.5)
gain = fftconvolve(gain, np.hanning(int(.25 * SR)) / np.sum(np.hanning(int(.25 * SR))), mode='same')
v = v * np.where(envw > 1e-3, gain, 1.0)
v = v / (np.max(np.abs(v)) + 1e-9) * .8
room = hall_ir(.55, seed=9, predelay=.012)
vst = np.stack([v, v], axis=1)
vwet = convolve_st(vst, room)
vmix = vst + .05 * vwet

# ---------- duck, room, sum ----------
env = np.sqrt(fftconvolve(v ** 2, np.ones(int(.06 * SR)) / int(.06 * SR), mode='same') + 1e-9)
on = (env > .02).astype(np.float32)
# attack 60 ms, release 450 ms
att = np.exp(-1 / (.06 * SR)); rel = np.exp(-1 / (.45 * SR))
duck = np.zeros(N, np.float32); d = 0.0
step_ = 64
for i in range(0, N, step_):
    x = on[i]
    for _ in range(1):
        c = att ** step_ if x > d else rel ** step_
        d = x + (d - x) * c
    duck[i:i + step_] = d
music_g = 10 ** (-7.5 / 20) + (1 - 10 ** (-7.5 / 20)) * (1 - duck)
fx_g = 10 ** (-2.5 / 20) + (1 - 10 ** (-2.5 / 20)) * (1 - duck)
hall = hall_ir(2.6)
print('reverb', flush=True)
mwet = convolve_st(music, hall)
fwet = convolve_st(fx, hall)
# a pocket for the voice in the music
mus = music + .42 * mwet
mus = peak(mus, 2800, .8, -2.5)
mus = hp(mus, 38)
mus = peak(mus, 75, .7, -5.0)
mus = peak(mus, 160, .9, -2.0)
fxs = hp(fx + .3 * fwet, 28)
mus = (mus.T * music_g).T
fxs = (fxs.T * fx_g).T
MUS = 10 ** (-9.5 / 20); FXG = 10 ** (-5.5 / 20)
mix = vmix + MUS * mus + FXG * fxs
# fade the very end with the picture
fo = np.ones(N); i0 = int((TOTAL - 1.5) * SR); fo[i0:] = np.clip(1 - (np.arange(N - i0) / (1.5 * SR)), 0, 1) ** 1.5
mix = (mix.T * fo).T
mix = np.tanh(mix * .95) / .95


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    pcm = (x * 2147483647).astype(np.int32)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(4); w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def lufs(path):
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    t = r.stderr
    i = re.findall(r'I:\s*(-?[\d.]+) LUFS', t)[-1]
    p = re.findall(r'Peak:\s*(-?[\d.]+) dBFS', t)[-1]
    lra = re.findall(r'LRA:\s*(-?[\d.]+) LU', t)[-1]
    return float(i), float(p), float(lra)


out = ROOT / 'audio' / 'mix'
out.mkdir(parents=True, exist_ok=True)
tmp = out / f'_{LANG}_tmp.wav'
write_wav(tmp, mix * .5)
i, p, _ = lufs(tmp)
g = .5 * 10 ** ((-15.0 - i) / 20)
for _ in range(3):
    if 20 * np.log10(np.max(np.abs(mix)) * g + 1e-9) > -1.2:
        # a gentle limiter pass if the gain would touch the ceiling
        ceil_ = 10 ** (-1.2 / 20) / g
        mix = np.where(np.abs(mix) > ceil_ * .8, np.sign(mix) * (ceil_ * .8 + (ceil_ * .2) * np.tanh((np.abs(mix) - ceil_ * .8) / (ceil_ * .2))), mix)
final = out / f'{LANG}.wav'
write_wav(final, mix * g)
i, p, lra = lufs(final)
print(LANG, 'mix', 'I', i, 'peak', p, 'LRA', lra, 'seconds', round(N / SR, 1), flush=True)

# balance per beat: voice against the rest (dB), so the words stay on top
rest = MUS * mus + FXG * fxs
for b in TL['beats']:
    a, c = int(b['start'] * SR), int(b['end'] * SR)
    rv = np.sqrt(np.mean(vmix[a:c] ** 2) + 1e-12); rr = np.sqrt(np.mean(rest[a:c] ** 2) + 1e-12)
    print(' ', b['id'], b['shot'], 'voice over rest', round(20 * np.log10(rv / rr), 1), 'dB', flush=True)
try:
    tmp.unlink()
except OSError:
    pass
