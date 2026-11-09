"""Mux picture + mix for one language, encode a small phone copy, write subtitles.

  python tools/finish_film.py ru [--phone-mb 29]

Reads renders/film_<lang>/film_<lang>.mp4 and audio/mix/<lang>.wav.
Writes final/<stem>.mp4 (master), final/<stem>-phone.mp4 (960x540, two-pass, under the limit), final/<stem>.srt.
<stem> comes from "stem" in script/script.json.
"""
import argparse
import os
import re
import subprocess
import textwrap

from common import MARK, ROOT, ffmpeg, script, stem, timeline

ap = argparse.ArgumentParser()
ap.add_argument("lang")
ap.add_argument("--phone-mb", type=float, default=29.0)
a = ap.parse_args()
lang = a.lang
FF = ffmpeg()
pic = ROOT / "renders" / f"film_{lang}" / f"film_{lang}.mp4"
mix = ROOT / "audio" / "mix" / f"{lang}.wav"
final = ROOT / "final"
final.mkdir(exist_ok=True)
(ROOT / "renders").mkdir(exist_ok=True)
master = final / f"{stem(lang)}.mp4"
phone = final / f"{stem(lang)}-phone.mp4"
TL = timeline(lang)

subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(pic), "-i", str(mix), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "224k",
                "-shortest", "-movflags", "+faststart", str(master)], check=True)

# the phone copy: two passes to land under the limit; hqdn3d calms the grain, which otherwise eats the bitrate
kbps = min(3000, max(200, int((a.phone_mb * 8 * 1024) / TL["total"] - 96)))
log = str(ROOT / "renders" / f"_2pass_{lang}")
for p in (1, 2):
    extra = ["-an", "-f", "null", os.devnull] if p == 1 else ["-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(phone)]
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(master), "-vf", "hqdn3d=2.5:2.5:5:5,scale=960:540:flags=lanczos", "-c:v", "libx264", "-preset", "slower",
                    "-tune", "animation", "-b:v", f"{kbps}k", "-maxrate", f"{int(kbps * 1.6)}k", "-bufsize", f"{kbps * 3}k", "-threads", os.environ.get("THREADS", "6"),
                    "-pix_fmt", "yuv420p", "-pass", str(p), "-passlogfile", log] + extra, check=True)
for leftover in (ROOT / "renders").glob(f"_2pass_{lang}*"):
    leftover.unlink()


def ts(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


# subtitles: sentences timed from the real word times; a long sentence goes on in two cues, two lines at most
cues = []
for b, sb in zip(TL["beats"], script()["beats"]):
    text = MARK.sub("", sb[lang])
    low, pos, spans = text.lower(), 0, []
    for t0, t1, w in b["words"]:
        tok = w.lower().strip()
        at = low.find(tok, pos) if tok else -1
        if at >= 0:
            spans.append((at, t0, t1))
            pos = at + len(tok)
    parts, off = [], 0
    for sent in re.split(r"(?<=[.?!:])\s+", text):
        begin = text.index(sent, off)
        off = begin + len(sent)
        if len(sent) > 84:
            mid = sent.rfind(" ", 0, len(sent) // 2 + 10)
            parts += [(begin, begin + mid), (begin + mid + 1, off)]
        else:
            parts.append((begin, off))
    for x0, x1 in parts:
        inside = [s for s in spans if x0 <= s[0] < x1]
        if inside:
            cues.append((inside[0][1], inside[-1][2], "\n".join(textwrap.wrap(text[x0:x1].strip(), 44))))
srt = "\n".join(f"{i + 1}\n{ts(s)} --> {ts(e)}\n{t}\n" for i, (s, e, t) in enumerate(cues))
(final / f"{stem(lang)}.srt").write_text(srt, encoding="utf-8")
for f in (master, phone):
    print(f, round(f.stat().st_size / 1048576, 1), "MiB")
print(final / f"{stem(lang)}.srt", len(cues), "cues")
