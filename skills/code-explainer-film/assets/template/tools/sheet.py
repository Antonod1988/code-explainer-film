"""Contact sheet of chosen moments of a video: python tools/sheet.py <video> <out.jpg> <cols> <t1> <t2> ... (or a:b:step)"""
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

from common import ffmpeg, label_font

FF = ffmpeg()
video, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3])
times = []
for a in sys.argv[4:]:
    if ":" in a:
        s, e, st = map(float, a.split(":"))
        times += list(np.arange(s, e + 1e-6, st))
    else:
        times.append(float(a))
tw, th = 480, 270
rows = (len(times) + cols - 1) // cols
img = Image.new("RGB", (cols * tw, rows * (th + 20)), (20, 20, 20))
dr = ImageDraw.Draw(img)
font = label_font(14)
for k, t in enumerate(times):
    raw = subprocess.run([FF, "-loglevel", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", "-vf", f"scale={tw}:{th}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    if len(raw) < tw * th * 3:
        continue
    im = Image.frombuffer("RGB", (tw, th), raw[:tw * th * 3])
    x, y = (k % cols) * tw, (k // cols) * (th + 20)
    img.paste(im, (x, y + 20))
    dr.text((x + 4, y + 3), f"{t:.2f} s", fill=(255, 230, 0), font=font)
img.save(out, quality=88)
print(out, img.size)
