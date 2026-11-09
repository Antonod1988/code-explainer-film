"""A copy made for Telegram: small, and built to stream.

  python tools/telegram_copy.py ru [--mb 28.6]

H.264 High@3.1 with few reference frames, a keyframe every 2 s, a capped bitrate, AAC-LC, moov at the very start of the
file. Reads final/<stem>.mp4, writes final/<stem>-telegram.mp4. Tell the user to attach it as a video, not as a file.
"""
import argparse
import os
import subprocess

from common import ROOT, ffmpeg, stem, timeline

ap = argparse.ArgumentParser()
ap.add_argument("lang")
ap.add_argument("--mb", type=float, default=28.6)
a = ap.parse_args()
FF = ffmpeg()
src = ROOT / "final" / f"{stem(a.lang)}.mp4"
out = ROOT / "final" / f"{stem(a.lang)}-telegram.mp4"
(ROOT / "renders").mkdir(exist_ok=True)
log = str(ROOT / "renders" / f"_tg_{a.lang}")
audio = 96
kbps = min(3000, max(200, int((a.mb * 8 * 1024) / timeline(a.lang)["total"] - audio - 4)))
video = ["-vf", "hqdn3d=2.5:2.5:5:5,scale=960:540:flags=lanczos,format=yuv420p",
         "-c:v", "libx264", "-preset", "medium", "-profile:v", "high", "-level:v", "3.1",
         "-refs", "4", "-bf", "2", "-g", "48", "-keyint_min", "24", "-sc_threshold", "40", "-flags", "+cgop",
         "-b:v", f"{kbps}k", "-maxrate", f"{int(kbps * 1.5)}k", "-bufsize", f"{int(kbps * 2)}k", "-threads", os.environ.get("THREADS", "6"),
         "-passlogfile", log]
base = [FF, "-y", "-loglevel", "error", "-i", str(src)]
subprocess.run(base + video + ["-pass", "1", "-an", "-f", "null", os.devnull], check=True)
subprocess.run(base + video + ["-pass", "2", "-c:a", "aac", "-profile:a", "aac_low", "-b:a", f"{audio}k", "-ar", "48000", "-ac", "2",
                               "-map_metadata", "-1", "-brand", "mp42", "-movflags", "+faststart", str(out)], check=True)
for leftover in (ROOT / "renders").glob(f"_tg_{a.lang}*"):
    leftover.unlink()
print(out, round(out.stat().st_size / 1048576, 2), "MiB, video", kbps, "kbps")
