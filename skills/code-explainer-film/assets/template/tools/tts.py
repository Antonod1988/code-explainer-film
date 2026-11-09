"""Narration: one neural-voice take per beat with word timings, then the film timeline for each language.

  python tools/tts.py            every take whose text or voice changed, all languages in script.json
  python tools/tts.py ru         one language
  python tools/tts.py ru b07     force one beat again

Writes audio/voice/<lang>/<beat>.mp3, .json (word boundaries), .stamp and .wav, and web/timing_<lang>.js:
  {lang, total, beats: [{id, shot, start, dur, end, cues: {name: absolute seconds}, words: [[t0, t1, text]]}]}
A {name} marker in the text means "the moment the following word begins".

Needs edge-tts (pip install edge-tts; tested with 7.3.1). If it lives somewhere else, set EDGE_TTS_PATH to that folder.
"""
import asyncio
import hashlib
import json
import os
import subprocess
import sys

from common import MARK, ROOT, ffmpeg, script

if os.environ.get("EDGE_TTS_PATH"):
    sys.path.insert(0, os.environ["EDGE_TTS_PATH"])
try:
    import edge_tts
except ImportError:
    sys.exit("edge_tts not found: pip install edge-tts, or set EDGE_TTS_PATH to the folder that holds it")

FF = ffmpeg()
SCRIPT = script()
LANGS = list(SCRIPT["voice"])
LEAD_IN = SCRIPT.get("lead_in", 0.8)
TAIL = SCRIPT.get("tail", 0.2)
ATTEMPTS = 8


def clean(text):
    """Text without markers, and the character offset of each marker."""
    out, marks, pos = [], {}, 0
    for i, part in enumerate(MARK.split(text)):
        if i % 2:
            marks[part] = pos
        else:
            out.append(part)
            pos += len(part)
    return "".join(out), marks


def check_script():
    """Stop early on what would otherwise surface much later as a NaN in a frame."""
    seen = {}
    problems = []
    for b in SCRIPT["beats"]:
        sets = {lang: set(MARK.findall(b.get(lang, ""))) for lang in LANGS}
        for lang in LANGS:
            if not b.get(lang):
                problems.append(f"{b['id']}: no {lang} text")
            if sets[lang] != sets[LANGS[0]]:
                problems.append(f"{b['id']}: cues differ, {LANGS[0]} {sorted(sets[LANGS[0]])} vs {lang} {sorted(sets[lang])}")
        for name in sets[LANGS[0]]:
            if name in seen:
                problems.append(f"cue {name} is used in both {seen[name]} and {b['id']}; names must be unique in the film")
            seen[name] = b["id"]
    if problems:
        sys.exit("script.json:\n  " + "\n  ".join(problems))


async def synth(text, voice, target):
    speech = edge_tts.Communicate(text, voice["name"], rate=voice["rate"], pitch=voice["pitch"], boundary="WordBoundary")
    words = []
    with target.open("wb") as f:
        async for chunk in speech.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"start": chunk["offset"] / 1e7, "end": (chunk["offset"] + chunk["duration"]) / 1e7, "text": chunk["text"]})
    if not words:
        raise RuntimeError("the service returned no word boundaries")
    target.with_suffix(".json").write_text(json.dumps(words, ensure_ascii=False, indent=0), encoding="utf-8")


def to_wav(mp3):
    """48 kHz mono float WAV; audio/mixlib.py reads this. Returns its length in seconds."""
    wav = mp3.with_suffix(".wav")
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(mp3), "-ar", "48000", "-ac", "1", "-c:a", "pcm_f32le", str(wav)], check=True)
    raw = wav.read_bytes()
    return (len(raw) - raw.find(b"data") - 8) / 4 / 48000


def align(text, words, marks):
    """Walk the word list along the text, so a marker's character offset turns into a time. Returns {name: (time, word)}."""
    low, pos, spans = text.lower(), 0, []
    for w in words:
        tok = w["text"].lower().strip()
        at = low.find(tok, pos) if tok else -1
        if at < 0:
            continue
        spans.append((at, w["start"], w["text"]))
        pos = at + len(tok)
    cues = {}
    for name, off in marks.items():
        later = [(t, word) for at, t, word in spans if at >= off]
        cues[name] = later[0] if later else (spans[-1][1], spans[-1][2])
    return cues


async def main():
    only_lang = sys.argv[1] if len(sys.argv) > 1 else None
    only_beat = sys.argv[2] if len(sys.argv) > 2 else None
    check_script()
    for lang in LANGS:
        if only_lang and lang != only_lang:
            continue
        folder = ROOT / "audio" / "voice" / lang
        folder.mkdir(parents=True, exist_ok=True)
        t = LEAD_IN
        beats = []
        report = []
        for b in SCRIPT["beats"]:
            text, marks = clean(b[lang])
            mp3 = folder / f"{b['id']}.mp3"
            # a take is redone when its text or the voice settings changed; it is overwritten in place
            stamp = hashlib.sha1(json.dumps([text, SCRIPT["voice"][lang]], ensure_ascii=False).encode("utf-8")).hexdigest()
            meta = mp3.with_suffix(".stamp")
            forced = only_lang == lang and only_beat == b["id"]
            stale = not meta.exists() or meta.read_text() != stamp
            if forced or stale or not mp3.exists() or mp3.stat().st_size == 0:
                for attempt in range(ATTEMPTS):
                    try:
                        await synth(text, SCRIPT["voice"][lang], mp3)
                        meta.write_text(stamp)
                        break
                    except Exception as e:  # the service sometimes drops a connection or answers with nothing
                        print("retry", lang, b["id"], e, flush=True)
                        await asyncio.sleep(2 + attempt * 2)
                else:
                    sys.exit(f"{SCRIPT['voice'][lang]['name']} gave no audio {ATTEMPTS} times for {b['id']}. "
                             "A voice can be down for a day: list others with  python -m edge_tts --list-voices  and change it in script.json.")
                print(lang, b["id"], "synth", flush=True)
            dur = to_wav(mp3)
            words = json.loads(mp3.with_suffix(".json").read_text(encoding="utf-8"))
            cues = align(text, words, marks)
            beats.append({"id": b["id"], "shot": b["shot"], "start": round(t, 3), "dur": round(dur, 3), "end": round(t + dur, 3),
                          "cues": {k: round(t + v[0], 3) for k, v in cues.items()},
                          "words": [[round(t + w["start"], 3), round(t + w["end"], 3), w["text"]] for w in words]})
            placed = " ".join(f"{k}={v[1]}@{t + v[0]:.2f}" for k, v in cues.items())
            report.append(f"  {b['id']} {b['shot']} {t:.2f} +{dur:.2f}  {placed}")
            t += dur + b["pause"]
        total = round(t + TAIL, 3)
        out = {"lang": lang, "total": total, "beats": beats}
        (ROOT / "web" / f"timing_{lang}.js").write_text(f"TIMING.{lang} = " + json.dumps(out, ensure_ascii=False) + ";\n", encoding="utf-8")
        print(lang, "total", total, "s, words", sum(len(b["words"]) for b in beats), flush=True)
        print("\n".join(report), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
