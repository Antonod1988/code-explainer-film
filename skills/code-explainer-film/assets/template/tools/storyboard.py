"""Write a storyboard before voicing, or render one still per beat.

  python tools/storyboard.py ru --text
  python tools/storyboard.py ru [--cols N]
"""
import argparse
import re
import subprocess
import sys

from common import MARK, ROOT, clock, fit_size, label_font, script, timeline


def local(value, lang):
    return value if isinstance(value, str) else (value or {}).get(lang, (value or {}).get("en", ""))


def schedule(s, lang, tl=None):
    timed = {b["id"]: b for b in tl["beats"]} if tl else {}
    t, rows = s.get("lead_in", .8), []
    for b in s["beats"]:
        if b["id"] in timed:
            beat = timed[b["id"]]
            start, dur = beat["start"], beat["dur"]
        else:
            start = t
            count = len(re.findall(r"\w+(?:[’'-]\w+)*", MARK.sub("", b.get(lang, ""))))
            dur = count * 60 / (125 if lang == "ru" else 150)
        end = start + dur
        rows.append(dict(b, start=start, dur=dur, end=end))
        t = end + b.get("pause", 0)
    return rows, tl["total"] if tl else t + s.get("tail", .2)


def markdown(rows, lang, total, estimated):
    def cell(text):
        return str(text).replace("|", "\\|").replace("\n", "<br>")
    lines = [f"# Storyboard · {lang}", "", f"Length: {clock(total)} ({'estimated' if estimated else 'timeline'}).", "",
             "| # | id | Time | Shot | Scene | Narration | Title |", "| --- | --- | --- | --- | --- | --- | --- |"]
    for i, b in enumerate(rows, 1):
        fields = [i, b["id"], f"{clock(b['start'])}–{clock(b['end'])}", b["shot"], local(b.get("scene"), lang),
                  MARK.sub(lambda m: f"⟨{m[1]}⟩", b.get(lang, "")), local(b.get("title"), lang)]
        lines.append("| " + " | ".join(map(cell, fields)) + " |")
    return "\n".join(lines) + "\n"


def wrap(text, font, width):
    lines = []
    for paragraph in text.splitlines() or [""]:
        line = ""
        for word in paragraph.split():
            candidate = f"{line} {word}".strip()
            if font.getlength(candidate) > width and line:
                lines.append(line)
                line = ""
            for char in word:
                if font.getlength(line + char) > width and line:
                    lines.append(line)
                    line = ""
                line += char
            line += " "
        lines.append(line.rstrip())
    return lines


def sheet(rows, lang, cols):
    from PIL import Image, ImageDraw
    out = ROOT / "renders" / f"storyboard_{lang}"
    times = [round(b["start"] + min(b["dur"], max(0, b.get("still", .6 * b["dur"]))), 2) for b in rows]
    query = f"lang={lang}&times=" + ",".join(f"{t:.2f}" for t in times)
    subprocess.run([sys.executable, str(ROOT / "render.py"), str(out), query], check=True)
    paths = [out / f"t{t:06.2f}.png" for t in times]
    with Image.open(paths[0]) as first:
        tw, th = fit_size(*first.size)
        cols = cols or (4 if first.height > first.width else 3)
    font, heading = label_font(16), label_font(17)
    captions = []
    for b in rows:
        top = f"{b['id']} · {clock(b['start'])}–{clock(b['end'])} · {b['shot']}"
        scene, said = wrap(local(b.get("scene"), lang), font, tw - 20), wrap(MARK.sub("", b.get(lang, "")), font, tw - 20)
        # what is seen in light grey, what is said in blue, so the two read apart at a glance
        captions.append((wrap(top, heading, tw - 20), [(s, "#dddddd") for s in scene if s] + [(s, "#9fc1e6") for s in said if s]))
    ch = th + 22 + max(len(a) * 23 + len(b) * 22 + 6 for a, b in captions)
    image = Image.new("RGB", (cols * tw, ((len(rows) + cols - 1) // cols) * ch), "#161719")
    draw = ImageDraw.Draw(image)
    for i, (path, (title, text)) in enumerate(zip(paths, captions)):
        x, y = (i % cols) * tw, (i // cols) * ch
        with Image.open(path) as still:
            image.paste(still.convert("RGB").resize((tw, th), Image.Resampling.LANCZOS), (x, y))
        cy = y + th + 8
        for line in title:
            draw.text((x + 10, cy), line, font=heading, fill="#e8c777")
            cy += 23
        last = None
        for line, colour in text:
            if last and colour != last:
                cy += 6
            draw.text((x + 10, cy), line, font=font, fill=colour)
            cy += 22
            last = colour
    path = out / "storyboard.jpg"
    image.save(path, quality=90)
    print(path)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("lang", nargs="?", default="ru")
    ap.add_argument("--text", action="store_true")
    ap.add_argument("--cols", type=int)
    a = ap.parse_args()
    if a.cols is not None and a.cols < 1:
        ap.error("--cols must be positive")
    s = script()
    if not s["beats"]:
        ap.error("script has no beats")
    path = ROOT / "web" / f"timing_{a.lang}.js"
    tl = timeline(a.lang) if path.exists() or not a.text else None
    rows, total = schedule(s, a.lang, tl)
    if a.text:
        path = ROOT / "script" / f"storyboard_{a.lang}.md"
        path.write_text(markdown(rows, a.lang, total, tl is None), encoding="utf-8")
        print(path, f"\nTotal: {total:.2f} s ({clock(total)})" + (" · estimated" if tl is None else ""))
    else:
        if any(b["id"] not in {t["id"] for t in tl["beats"]} for b in rows):
            ap.error("timeline is missing beats: run tools/tts.py again")
        sheet(rows, a.lang, a.cols)


if __name__ == "__main__":
    main()
