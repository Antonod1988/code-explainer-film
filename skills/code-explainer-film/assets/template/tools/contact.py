"""Contact sheet of the PNG stills in a folder: python tools/contact.py renders/check [cols] -> renders/check/contact.jpg"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

from common import ROOT, fit_size, label_font

d = Path(sys.argv[1])
if not d.is_absolute():
    d = ROOT / d
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 4
files = sorted(d.glob("t*.png"))
if not files or cols < 1:
    sys.exit("need PNG stills and a positive column count")
with Image.open(files[0]) as first:
    tw, th = fit_size(*first.size)
rows = (len(files) + cols - 1) // cols
img = Image.new("RGB", (cols * tw, rows * (th + 22)), (20, 20, 20))
dr = ImageDraw.Draw(img)
font = label_font(15)
for k, f in enumerate(files):
    x, y = (k % cols) * tw, (k // cols) * (th + 22)
    img.paste(Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS), (x, y + 22))
    dr.text((x + 4, y + 3), f.stem[1:] + " s", fill=(255, 230, 0), font=font)
img.save(d / "contact.jpg", quality=88)
print(d / "contact.jpg", img.size)
