"""Top-level MP4 atoms and the streams: python tools/mp4info.py <file> [...]"""
import struct
import subprocess
import sys
from pathlib import Path

from common import ffmpeg

FF = ffmpeg()
for p in sys.argv[1:]:
    size = Path(p).stat().st_size
    atoms = []
    with open(p, "rb") as f:
        pos = 0
        while pos < size:
            f.seek(pos)
            h = f.read(8)
            if len(h) < 8:
                break
            n, t = struct.unpack(">I4s", h)
            if n == 1:
                n = struct.unpack(">Q", f.read(8))[0]
            elif n == 0:
                n = size - pos
            atoms.append((t.decode("latin1"), pos, n))
            pos += n
    print(p, f"{size / 1048576:.2f} MiB")
    print("  atoms:", " ".join(f"{t}@{o}({n})" for t, o, n in atoms))
    names = [a[0] for a in atoms]
    print("  moov before mdat:", names.index("moov") < names.index("mdat") if "moov" in names and "mdat" in names else "n/a")
    r = subprocess.run([FF, "-hide_banner", "-i", p], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    for line in r.splitlines():
        if "Stream #" in line or "major_brand" in line or "compatible_brands" in line or "Duration" in line:
            print("  " + line.strip())
