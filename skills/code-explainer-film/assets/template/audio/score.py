"""The score and effects of this film, written against its cues. Rewrite this file for each film; audio/mixlib.py stays.

  python audio/score.py ru       -> audio/mix/ru.wav at -15 LUFS, about a minute for a 5-minute film
"""
import sys

from mixlib import *  # noqa: F403  (Film, chord helpers, and every instrument from synth.py)

F = Film(sys.argv[1] if len(sys.argv) > 1 else "ru")
BEAT, CUE, TOTAL, put, music, fx = F.BEAT, F.CUE, F.TOTAL, F.put, F.music, F.fx
b2, b3 = BEAT["b02"]["start"], BEAT["b03"]["start"]

# ---------- the plan: sections start exactly on voice beats, so the same score fits every language ----------
SECTIONS = [
    ("open", .5, b2 - .2, ["Dm", "Bb", "F", "C"]),
    ("orbit", b2 - .2, b3 - .2, ["F", "C", "Dm", "Am"]),
    ("phases", b3 - .2, CUE["end"] + .3, ["Bb", "F", "Gm", "Asus"]),
]


def write_bar(name, t, bar, c, i, nb):
    if name == "open":
        F.s_pad(t, bar, c, "strings", .16, att=1.6)
        F.s_bass(t, bar, c, .18)
        if i >= 1:
            F.s_arp(t, bar, c, [0, 2, 1, 3, 2, 4, None, 3], "harp", .17)
    elif name == "orbit":
        F.s_pad(t, bar, c, "choir", .18, lo=55)
        F.s_pad(t, bar, c, "strings", .1)
        F.s_bass(t, bar, c, .2)
        F.s_arp(t, bar, c, [0, 2, 1, 3, 2, 4, 3, 5], "harp", .16)
        F.s_bells(t, bar, c, .07, pat=(0, 3, 6))
    elif name == "phases":
        F.s_pad(t, bar, c, "strings", .15)
        F.s_bass(t, bar, c, .2)
        F.s_arp(t, bar, c, [0, 1, 2, 3, 4, 3, 2, 1], "harp", .16)


F.write(SECTIONS, write_bar)

# the last chord, held under the fade
tEnd = CUE["end"] + .3
put(music, tEnd, pad([50, 57, 62, 66, 69], TOTAL - tEnd - .4, "strings", att=.9, rel=2.2), .22)
put(music, tEnd, pad([38, 45, 50], TOTAL - tEnd - .4, "organ", att=.8, rel=2.2), .26)
put(music, tEnd + .05, bell(mtof(74), 4, .8, "tube"), .16, -.1)

# ---------- effects, cue by cue: a sound starts a little before the thing it belongs to when it needs a run-up ----------
put(fx, b2 - .3 - .75, paper_wipe(1.5), .28, .35)          # the wipe in film.js SEQ
put(fx, CUE["turn"], shimmer(1.6, 1.0, seed=1), .2, .2)
put(fx, CUE["turn"], bell(mtof(86), 2.4, 1.0, "glass"), .14, .2)
put(fx, CUE["orbit"] - .4, whoosh(1.4, 300, 1400), .1, -.3)
put(fx, CUE["side"], bell(mtof(74), 2.6, .8, "tube"), .18)
t0, each = b3 + .2, (CUE["end"] - b3 - .2) / 8             # the same spacing as shotPhases in shots.js
for i, m in enumerate([74, 77, 81, 86, 89, 86, 81, 77]):
    put(fx, t0 + i * each + .08, bell(mtof(m), 1.4, .8, "celesta"), .14, -.4 + i * .11)
put(fx, CUE["end"], thunk(.8), .2)

F.mixdown()
