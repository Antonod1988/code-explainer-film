"""Chapter lines for a video description, from the beats that have a "title": python tools/chapters.py ru

A beat with no title stays inside the chapter before it. YouTube wants the first chapter at 0:00, at least three chapters
and at least 10 s in each; the tool warns when that does not hold.
"""
import sys

from common import clock, script, timeline

lang = sys.argv[1]
rows = []
for b, sb in zip(timeline(lang)["beats"], script()["beats"]):
    title = sb.get("title", {}).get(lang)
    if title:
        rows.append((0.0 if not rows else b["start"], title))
for t, title in rows:
    print(clock(t), title)
total = timeline(lang)["total"]
ends = [r[0] for r in rows[1:]] + [total]
short = [r[1] for r, e in zip(rows, ends) if e - r[0] < 10]
if len(rows) < 3:
    print("warning: fewer than three chapters")
if short:
    print("warning: under 10 s:", "; ".join(short))
