"""Checks without ears: a spectrogram with level lanes of the mix, and speech recognition set against the script.

  python tools/qa_audio.py ru            picture only  -> renders/qa/ru_mix.png, plus peak and clipped samples
  python tools/qa_audio.py ru whisper    also transcribe -> renders/qa/ru_whisper.txt, a match score per beat

Whisper uses transformers + torch when installed, else faster-whisper. WHISPER_MODEL picks the model
(default openai/whisper-base; base or small for faster-whisper). HF_HOME and HF_HUB_OFFLINE are honoured.
Read the score for missing chunks of speech, not for spelling: small models mishear names and numbers.
"""
import os
import re
import sys
import wave
from difflib import SequenceMatcher

import numpy as np
from PIL import Image, ImageDraw
from scipy.signal import stft

from common import MARK, ROOT, label_font, script, timeline

lang = sys.argv[1]
OUT = ROOT / "renders" / "qa"
OUT.mkdir(parents=True, exist_ok=True)
with wave.open(str(ROOT / "audio" / "mix" / f"{lang}.wav"), "rb") as w:
    sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
    raw = w.readframes(n)
x = np.frombuffer(raw, dtype=np.int32).reshape(-1, ch).astype(np.float32) / 2147483648
mono = x.mean(axis=1)
TL = timeline(lang)

# the picture: log frequency, one line per beat
f, t, Z = stft(mono[::2], fs=sr / 2, nperseg=2048, noverlap=2048 - 480)
S = 20 * np.log10(np.abs(Z) + 1e-6)
Wd, Hg = 1800, 500
ix = np.clip(((np.arange(Wd) / Wd) * S.shape[1]).astype(int), 0, S.shape[1] - 1)
fr = 40 * (11000 / 40) ** (1 - np.arange(Hg) / (Hg - 1))
iy = np.clip((fr / (sr / 2 / 2) * (S.shape[0] - 1)).astype(int), 0, S.shape[0] - 1)
A = np.clip((S[iy][:, ix] + 95) / 75, 0, 1)
img = Image.fromarray((np.stack([A ** .7, A ** 1.2, A ** 2.2], axis=2) * 255).astype(np.uint8))
canvas = Image.new("RGB", (Wd, Hg + 170), (16, 16, 16))
canvas.paste(img, (0, 0))
d = ImageDraw.Draw(canvas)
font = label_font(13)
hop = max(1, len(mono) // Wd)
lev = np.array([20 * np.log10(np.sqrt(np.mean(mono[i * hop:(i + 1) * hop] ** 2)) + 1e-6) for i in range(Wd)])
pk = np.array([20 * np.log10(np.max(np.abs(mono[i * hop:(i + 1) * hop]) + 1e-9)) for i in range(Wd)])
for i in range(Wd):
    y0 = Hg + 150
    d.line([(i, y0), (i, y0 + int(pk[i] * 3))], fill=(90, 110, 120))
    d.line([(i, y0), (i, y0 + int(lev[i] * 3))], fill=(230, 190, 90))
for b in TL["beats"]:
    xp = int(b["start"] / (len(mono) / sr) * Wd)
    d.line([(xp, 0), (xp, Hg + 20)], fill=(255, 255, 255))
    d.text((xp + 3, Hg + 4), b["shot"], fill=(255, 255, 255), font=font)
canvas.save(OUT / f"{lang}_mix.png")
print("picture", OUT / f"{lang}_mix.png")
print("peak dBFS", round(20 * np.log10(np.max(np.abs(x)) + 1e-9), 2), " clipped samples", int(np.sum(np.abs(x) > .999)))


def recogniser():
    """A function from 16 kHz mono audio to text."""
    name = os.environ.get("WHISPER_MODEL", "openai/whisper-base")
    try:
        import torch
        from transformers import WhisperForConditionalGeneration, WhisperProcessor
    except ImportError:
        from faster_whisper import WhisperModel
        model = WhisperModel(name.split("/")[-1].replace("whisper-", ""), compute_type="int8", cpu_threads=int(os.environ.get("THREADS", 6)))

        def run_fw(audio):
            segments, _ = model.transcribe(audio.astype(np.float32), language=lang, beam_size=1)
            return " ".join(s.text.strip() for s in segments)
        return run_fw
    torch.set_num_threads(int(os.environ.get("THREADS", 6)))
    proc = WhisperProcessor.from_pretrained(name)
    model = WhisperForConditionalGeneration.from_pretrained(name).eval()
    gen = {} if ".en" in name else {"language": lang, "task": "transcribe"}

    def run_tf(audio):
        out = []
        for k in range(0, len(audio), 28 * 16000):
            features = proc(audio[k:k + 29 * 16000], sampling_rate=16000, return_tensors="pt").input_features
            with torch.no_grad():
                ids = model.generate(features, max_new_tokens=220, **gen)
            out.append(proc.batch_decode(ids, skip_special_tokens=True)[0])
        return " ".join(out).strip()
    return run_tf


if len(sys.argv) > 2 and sys.argv[2] == "whisper":
    hear = recogniser()
    audio16 = np.interp(np.arange(0, len(mono), sr / 16000), np.arange(len(mono)), mono)
    norm = lambda s: re.sub(r"[^\w ]", " ", s.lower().replace("ё", "е")).split()
    lines = []
    for sb, tb in zip(script()["beats"], TL["beats"]):
        heard = hear(audio16[int(tb["start"] * 16000):int((tb["end"] + .2) * 16000)])
        want = MARK.sub("", sb[lang])
        ratio = SequenceMatcher(None, norm(want), norm(heard)).ratio()
        lines.append(f"{tb['id']} match {ratio:.2f}\n  want: {want}\n  heard: {heard}\n")
        print(tb["id"], round(ratio, 2), flush=True)
    (OUT / f"{lang}_whisper.txt").write_text("\n".join(lines), encoding="utf-8")
    print("text", OUT / f"{lang}_whisper.txt")
