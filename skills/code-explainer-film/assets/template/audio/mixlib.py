"""Buses, harmony, bar styles, the voice chain, ducking and the mix. It stays the same from film to film; audio/score.py changes.

  F = Film('ru')           the timeline of one language and two empty buses (F.music, F.fx)
  F.put(bus, t, x, g, pan) place a sound
  F.write(SECTIONS, fn)    call fn(name, t, bar, chord, i, nb) for each bar; a section always holds a whole number of bars
  F.mixdown()              voice + buses -> audio/mix/<lang>.wav at -15 LUFS, and a voice-over-rest report per beat
"""
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "tools"))
from common import ROOT, ffmpeg, timeline  # noqa: E402
from synth import *  # noqa: E402,F401,F403
from synth import SR, bell, convolve_st, frame_drum, hall_ir, hp, mtof, pad, peak, pluck, shelf_hi  # noqa: E402

PC = {"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}


def chord(name):
    """'Dm', 'F', 'Asus' -> root pitch class and intervals."""
    m = re.match(r"([A-G]b?)(m?)(sus)?", name)
    third = 5 if m.group(3) else (3 if m.group(2) else 4)
    return PC[m.group(1)], [0, third, 7]


def voiced(name, lo=52):
    """Close triad at or above lo."""
    r, iv = chord(name)
    return sorted(lo + ((r + i - lo) % 12) for i in iv)


def arp_notes(name, lo=60, n=6):
    r, iv = chord(name)
    pool = [r + i + 12 * (o + 4) for o in range(4) for i in iv]
    return sorted(m for m in pool if m >= lo)[:n]


def bass_of(name, lo=36):
    return lo + ((chord(name)[0] - lo) % 12)


class Film:
    def __init__(self, lang, seed=2026):
        self.lang = lang
        self.TL = timeline(lang)
        self.BEAT = {b["id"]: b for b in self.TL["beats"]}
        self.CUE = {}
        for b in self.TL["beats"]:
            self.CUE.update(b["cues"])
        self.TOTAL = self.TL["total"]
        self.N = int((self.TOTAL + 1.0) * SR)
        self.music = np.zeros((self.N, 2), np.float32)
        self.fx = np.zeros((self.N, 2), np.float32)
        self.rng = np.random.default_rng(seed)   # seeded, so a re-run gives the same mix

    def put(self, bus, t, x, g=1.0, pan=0.0):
        s = int(t * SR)
        if s >= self.N or (s < 0 and len(x) + s <= 0):
            return
        if s < 0:
            x = x[-s:]
            s = 0
        x = x[:self.N - s]
        if x.ndim == 1:
            th = (pan + 1) * np.pi / 4
            bus[s:s + len(x), 0] += (g * np.cos(th) * x).astype(np.float32)
            bus[s:s + len(x), 1] += (g * np.sin(th) * x).astype(np.float32)
        else:
            bus[s:s + len(x)] += (g * x).astype(np.float32)

    # ---------- styles: each writes one bar ----------
    def s_pad(self, t, bar, c, kind="strings", g=.24, lo=52, att=1.0):
        self.put(self.music, t, pad(voiced(c, lo), bar + .3, kind, att=att, rel=1.8), g)

    def s_bass(self, t, bar, c, g=.32, kind="organ"):
        self.put(self.music, t, pad([bass_of(c)], bar + .2, kind, att=.5, rel=1.2), g)

    def s_arp(self, t, bar, c, pattern, inst="harp", g=.2, lo=60, div=8, width=.5):
        notes = arp_notes(c, lo, 7)
        step = bar / div
        for i in range(div):
            k = pattern[i % len(pattern)]
            if k is None:
                continue
            v = (1.0 if i % 4 == 0 else .72) * (.88 + .24 * self.rng.random())
            pan = np.sin(i * 1.3 + t) * width
            self.put(self.music, t + i * step + self.rng.normal(0, .004), pluck(notes[k % len(notes)], inst, int(i % 2)), g * v, pan)

    def s_bells(self, t, bar, c, g=.1, lo=76, pat=(0, 3, 5, 6), div=8, kind="celesta"):
        notes = arp_notes(c, lo, 7)
        step = bar / div
        for i, k in enumerate(pat):
            if k is not None:
                self.put(self.music, t + k * step, bell(mtof(notes[i % len(notes)]), 1.8, .8, kind), g, .3 * np.sin(i * 2 + t))

    def s_drum(self, t, bar, pat=(0,), g=.25, low=88, div=8):
        for k in pat:
            self.put(self.music, t + k * bar / div, frame_drum(.8 + .2 * self.rng.random(), low), g, self.rng.uniform(-.1, .1))

    def write(self, sections, write_bar, bar0=3.2):
        """sections: (name, t0, t1, chords). The bar is stretched so each section holds a whole number of bars."""
        for name, t0, t1, chords in sections:
            nb = max(1, round((t1 - t0) / bar0))
            bar = (t1 - t0) / nb
            for i in range(nb):
                write_bar(name, t0 + i * bar, bar, chords[i % len(chords)], i, nb)
            print("music", name, round(t1 - t0, 1), "s,", nb, "bars", flush=True)

    # ---------- the voice ----------
    def voice_bus(self):
        voice = np.zeros(self.N, np.float32)
        for b in self.TL["beats"]:
            path = ROOT / "audio" / "voice" / self.lang / f"{b['id']}.wav"
            if not path.exists():
                sys.exit(f"{path} is missing: run python tools/tts.py first")
            raw = path.read_bytes()
            data = raw[raw.find(b"data") + 8:]   # float32 WAV written by ffmpeg
            y = np.frombuffer(data[:len(data) // 4 * 4], dtype=np.float32)
            s = int(b["start"] * SR)
            voice[s:s + len(y)] += y[:self.N - s]
        v = hp(voice, 85)
        v = peak(v, 180, 1.0, 1.0)
        v = peak(v, 3000, .9, 3.2)     # presence
        v = shelf_hi(v, 8000, .5)
        air = hp(np.tanh(hp(v, 4500) * 5) / 5, 6500)   # harmonics of the top band that the source lacks
        v = v + .1 * air
        # slow levelling: evens out phrases without pumping
        w = int(.4 * SR)
        envw = np.sqrt(fftconvolve(v ** 2, np.ones(w) / w, mode="same") + 1e-8)
        target = np.percentile(envw[envw > 1e-3], 70)
        gain = np.clip(target / (envw + 1e-4), .7, 1.5)
        h = np.hanning(int(.25 * SR))
        gain = fftconvolve(gain, h / np.sum(h), mode="same")
        v = v * np.where(envw > 1e-3, gain, 1.0)
        return v / (np.max(np.abs(v)) + 1e-9) * .8

    # ---------- duck, room, sum, loudness ----------
    def mixdown(self, music_db=-9.5, fx_db=-5.5, duck_music=-7.5, duck_fx=-2.5, lufs_target=-15.0):
        N, TOTAL = self.N, self.TOTAL
        v = self.voice_bus()
        vst = np.stack([v, v], axis=1)
        vmix = vst + .05 * convolve_st(vst, hall_ir(.55, seed=9, predelay=.012))
        # ducking: attack 60 ms, release 450 ms
        w = int(.06 * SR)
        env = np.sqrt(fftconvolve(v ** 2, np.ones(w) / w, mode="same") + 1e-9)
        on = (env > .02).astype(np.float32)
        att, rel = np.exp(-1 / (.06 * SR)), np.exp(-1 / (.45 * SR))
        duck = np.zeros(N, np.float32)
        d, hop = 0.0, 64
        for i in range(0, N, hop):
            x = on[i]
            c = att ** hop if x > d else rel ** hop
            d = x + (d - x) * c
            duck[i:i + hop] = d
        low_m, low_f = 10 ** (duck_music / 20), 10 ** (duck_fx / 20)
        music_g = low_m + (1 - low_m) * (1 - duck)
        fx_g = low_f + (1 - low_f) * (1 - duck)
        print("reverb", flush=True)
        hall = hall_ir(2.6)
        mus = self.music + .42 * convolve_st(self.music, hall)
        fxs = hp(self.fx + .3 * convolve_st(self.fx, hall), 28)
        mus = peak(mus, 2800, .8, -2.5)   # a pocket for the voice in the music
        mus = hp(mus, 38)
        mus = peak(mus, 75, .7, -5.0)
        mus = peak(mus, 160, .9, -2.0)
        mus = (mus.T * music_g).T
        fxs = (fxs.T * fx_g).T
        rest = 10 ** (music_db / 20) * mus + 10 ** (fx_db / 20) * fxs
        mix = vmix + rest
        # fade the very end with the picture
        fo = np.ones(N)
        i0 = int((TOTAL - 1.5) * SR)
        fo[i0:] = np.clip(1 - (np.arange(N - i0) / (1.5 * SR)), 0, 1) ** 1.5
        mix = (mix.T * fo).T
        mix = np.tanh(mix * .95) / .95

        out = ROOT / "audio" / "mix"
        out.mkdir(parents=True, exist_ok=True)
        tmp = out / f"_{self.lang}_tmp.wav"
        write_wav(tmp, mix * .5)
        i, _, _ = loudness(tmp)
        g = .5 * 10 ** ((lufs_target - i) / 20)
        for _ in range(3):
            if 20 * np.log10(np.max(np.abs(mix)) * g + 1e-9) > -1.2:
                # a gentle limiter pass if the gain would touch the ceiling
                ceil_ = 10 ** (-1.2 / 20) / g
                mix = np.where(np.abs(mix) > ceil_ * .8, np.sign(mix) * (ceil_ * .8 + (ceil_ * .2) * np.tanh((np.abs(mix) - ceil_ * .8) / (ceil_ * .2))), mix)
        final = out / f"{self.lang}.wav"
        write_wav(final, mix * g)
        i, p, lra = loudness(final)
        print(self.lang, "mix: I", i, "LUFS, peak", p, "dBFS, LRA", lra, "LU,", round(N / SR, 1), "s", flush=True)
        tmp.unlink(missing_ok=True)
        # the words must stay on top: aim for about 10 dB on every beat
        for b in self.TL["beats"]:
            a, c = int(b["start"] * SR), int(b["end"] * SR)
            rv = np.sqrt(np.mean(vmix[a:c] ** 2) + 1e-12)
            rr = np.sqrt(np.mean(rest[a:c] ** 2) + 1e-12)
            print(" ", b["id"], b["shot"], "voice over rest", round(20 * np.log10(rv / rr), 1), "dB", flush=True)
        return final


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 2147483647).astype(np.int32)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(4)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def loudness(path):
    """Integrated LUFS, true peak and LRA through ffmpeg's ebur128."""
    t = subprocess.run([ffmpeg(), "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    return (float(re.findall(r"I:\s*(-?[\d.]+) LUFS", t)[-1]),
            float(re.findall(r"Peak:\s*(-?[\d.]+) dBFS", t)[-1]),
            float(re.findall(r"LRA:\s*(-?[\d.]+) LU", t)[-1]))
