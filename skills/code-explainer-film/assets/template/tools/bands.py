"""Octave balance of the mix per beat, in dB under the strongest band: python tools/bands.py ru

Use it to compare sections, and to spot a boomy low end or a section with no top at all, without ears.
"""
import sys
import wave

import numpy as np

from common import ROOT, timeline

lang = sys.argv[1]
with wave.open(str(ROOT / "audio" / "mix" / f"{lang}.wav"), "rb") as w:
    sr, n = w.getframerate(), w.getnframes()
    x = np.frombuffer(w.readframes(n), dtype=np.int32).reshape(-1, 2).astype(np.float32) / 2147483648
m = x.mean(axis=1)
edges = [30, 60, 120, 240, 480, 960, 1920, 3840, 7680, 15360]
print("section".ljust(14), " ".join(f"{e:>5}" for e in edges[:-1]))
for b in timeline(lang)["beats"]:
    s = m[int(b["start"] * sr):int(b["end"] * sr)]
    F = np.abs(np.fft.rfft(s * np.hanning(len(s)))) ** 2
    fr = np.fft.rfftfreq(len(s), 1 / sr)
    lv = [10 * np.log10(F[(fr >= edges[i]) & (fr < edges[i + 1])].sum() + 1e-9) for i in range(len(edges) - 1)]
    top = max(lv)
    print(b["shot"].ljust(14), " ".join(f"{v - top:5.0f}" for v in lv))
