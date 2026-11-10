"""Resume a film render in frame-exact parts, then join without re-encoding.

  python render_parts.py renders/film_ru "lang=ru&file=film_ru.mp4" --part 60
  Options: --port 8831 --stall 600 --browser PATH. CRF/GOP/THREADS pass through.
"""
import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import time
from urllib.parse import parse_qsl, urlencode

from tools.common import ROOT, ffmpeg, timeline


def frame_count(path):
    result = subprocess.run([ffmpeg(), "-nostdin", "-hide_banner", "-i", str(path),
                             "-map", "0:v:0", "-c", "copy", "-f", "null", "-", "-stats"],
                            capture_output=True, text=True, errors="replace", check=True)
    counts = re.findall(r"frame=\s*(\d+)", result.stderr)
    if not counts:
        raise ValueError(f"ffmpeg reported no video frame count for {path}")
    return int(counts[-1])


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("out")
    ap.add_argument("query")
    ap.add_argument("--part", type=float, default=60)
    ap.add_argument("--port", type=int, default=8831)
    ap.add_argument("--stall", type=int, default=600)
    ap.add_argument("--browser")
    a = ap.parse_args()
    q = dict(parse_qsl(a.query, keep_blank_values=True))
    if any(key in q for key in ("times", "preview")):
        ap.error("parts need a film query without times or preview")
    tl = timeline(q.get("lang") or "ru")
    fps = float(q.get("fps") or tl.get("format", {}).get("fps", 24))
    if not math.isfinite(fps) or not 0 < fps <= 240 or not math.isfinite(a.part) or a.part <= 0:
        ap.error("fps must be positive (up to 240), and --part must be positive")
    total = math.floor(tl["total"] * fps + .5)
    size = max(1, math.floor(a.part * fps + .5))
    if total < 1:
        ap.error("the timeline has no frames")
    name = q.pop("file", "") or "film.mp4"
    if name in (".", "..") or "/" in name or "\\" in name or ":" in name:
        ap.error("file must be a file name, without directories")
    for key in ("f0", "f1", "from", "to", "record"):
        q.pop(key, None)
    q["fps"] = str(fps)
    out = (ROOT / a.out).resolve()
    parts = out / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    # A changed timeline, query or encoder setting must not silently reuse an old part.
    stamp = hashlib.sha256(json.dumps([tl, q, size, {k: os.environ.get(k) for k in ("CRF", "GOP", "THREADS")}],
                                     sort_keys=True).encode()).hexdigest()
    paths = []
    for n, f0 in enumerate(range(0, total, size)):
        f1 = min(total, f0 + size)
        path = parts / f"part_{n:03}.mp4"
        ok = path.with_suffix(".ok")
        signature = f"{stamp}:{f0}:{f1}"
        reuse = path.exists() and ok.exists() and ok.read_text() == signature
        found = None
        if reuse:
            try:
                found = frame_count(path)
                reuse = found == f1 - f0
            except (subprocess.CalledProcessError, ValueError):
                reuse = False
        if not reuse:
            ok.unlink(missing_ok=True)
            query = urlencode(dict(q, f0=f0, f1=f1, file=path.name))
            cmd = [sys.executable, str(ROOT / "render.py"), str(parts), query,
                   "--port", str(a.port), "--stall", str(a.stall)]
            if a.browser:
                cmd += ["--browser", a.browser]
            subprocess.run(cmd, check=True)
            found = frame_count(path)
        print(f"{path.name}: {f0}..{f1}, expected {f1 - f0}, found {found}" + (" (reused)" if reuse else ""), flush=True)
        if found != f1 - f0:
            raise ValueError(f"wrong frame count in {path}")
        if not reuse:
            temp = ok.with_suffix(".ok.tmp")
            temp.write_text(signature)
            temp.replace(ok)
        paths.append(path)
    listing = parts / "concat.txt"
    listing.write_text("".join("file '" + p.as_posix().replace("'", "'\\''") + "'\n" for p in paths), encoding="utf-8")
    joined = out / ("_joining_" + name)
    subprocess.run([ffmpeg(), "-nostdin", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(listing),
                    "-c", "copy", "-movflags", "+faststart", str(joined)], check=True)
    found = frame_count(joined)
    print(f"joined {len(paths)} parts: expected {total} frames, found {found}", flush=True)
    if found != total:
        raise ValueError("joined frame count differs")
    joined.replace(out / name)
    print(out / name)


if __name__ == "__main__":
    start = time.monotonic()
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        sys.exit(f"render_parts: {error}")
    finally:
        print(f"render_parts: {time.monotonic() - start:.1f} s", flush=True)
