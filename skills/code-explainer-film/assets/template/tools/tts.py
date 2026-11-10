"""Narration: one neural-voice take per beat with word timings, then the film timeline for each language.

  python tools/tts.py            every take whose text or voice changed, all languages in script.json
  python tools/tts.py ru         one language
  python tools/tts.py ru b07     force one beat again
  python tools/tts.py ru b02 --try "rate=-4%,pitch=-6Hz" --try "name=ru-RU-DmitryNeural"
  python tools/tts.py --voices ru

Writes audio/voice/<lang>/<beat>.mp3, .json (word boundaries), .stamp and .wav, and web/timing_<lang>.js:
  {lang, total, format, beats: [{id, shot, start, dur, end, cues: {name: absolute seconds}, words: [[t0, t1, text]]}]}
A {name} marker in the text means "the moment the following word begins".

Needs edge-tts (pip install edge-tts; tested with 7.3.1). If it lives somewhere else, set EDGE_TTS_PATH to that folder.
"""
import asyncio
import argparse
import hashlib
import html
import json
import os
import re
import subprocess
import sys

from common import MARK, ROOT, ffmpeg, fmt, script

if os.environ.get("EDGE_TTS_PATH"):
    sys.path.insert(0, os.environ["EDGE_TTS_PATH"])
SCRIPT = script()
LANGS = list(SCRIPT["voice"])
LEAD_IN = SCRIPT.get("lead_in", 0.8)
TAIL = SCRIPT.get("tail", 0.2)
ATTEMPTS = 8
WORD = re.compile(r"\w+(?:[’'-]\w+)*", re.UNICODE)


def pronunciation(text, lexicon):
    """Keep a character map back to the script, including multiword respellings."""
    if not lexicon:
        return text, list(range(len(text))), [], {}
    entries = {k.lower(): v for k, v in lexicon.items()}
    spoken, offsets, replacements, used, pos = [], [], [], {}, 0
    keys = "|".join(re.escape(k) for k in sorted(entries, key=len, reverse=True))
    pattern = re.compile(r"(?<!\w)(?:" + keys + r")(?!\w)", re.IGNORECASE)
    for match in pattern.finditer(text):
        key = match.group().lower()
        if key not in entries:
            continue
        replacement = entries[key]
        if not isinstance(replacement, str) or not WORD.search(replacement):
            raise ValueError(f"lexicon entry {key!r} must contain spoken words")
        first = replacement[0].upper() if match.group()[0].isupper() else replacement[0].lower()
        replacement = first + replacement[1:]
        spoken.append(text[pos:match.start()])
        offsets.extend(range(pos, match.start()))
        begin = len(offsets)
        spoken.append(replacement)
        offsets.extend([match.start()] * len(replacement))
        replacements.append((begin, len(offsets), match.group()))
        used[key] = entries[key]
        pos = match.end()
    spoken.append(text[pos:])
    offsets.extend(range(pos, len(text)))
    return "".join(spoken), offsets, replacements, used


def restore_words(spoken, words, offsets, replacements):
    """Stress marks are invisible to alignment; continuation tokens extend the original word."""
    low, positions = [], []
    for i, char in enumerate(spoken):
        if char != "\u0301":
            for c in char.lower():
                low.append(c)
                positions.append(i)
    low = "".join(low)
    pos, out, emitted = 0, [], {}
    for word in words:
        token = html.unescape(word["text"]).replace("\u0301", "").strip()
        at = low.find(token.lower(), pos) if token else -1
        if at < 0:
            continue
        pos = at + len(token)
        source_at = positions[at]
        replacement = next((r for r in replacements if r[0] <= source_at < r[1]), None)
        if replacement and replacement[0] in emitted:
            out[emitted[replacement[0]]]["end"] = word["end"]
            continue
        restored = dict(word, text=replacement[2] if replacement else token, _at=offsets[source_at])
        if replacement:
            emitted[replacement[0]] = len(out)
        out.append(restored)
    return out


def beat_voice(lang, beat):
    return dict(SCRIPT["voice"][lang], **beat.get("voice", {}).get(lang, {}))


def trial_voice(value):
    settings = {}
    for item in value.split(","):
        key, sep, val = item.partition("=")
        if not sep or key not in ("name", "rate", "pitch") or not val:
            raise argparse.ArgumentTypeError("--try expects name=...,rate=...,pitch=...")
        settings[key] = val
    return settings


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
    import edge_tts
    speech = edge_tts.Communicate(text, voice["name"], rate=voice["rate"], pitch=voice["pitch"], boundary="WordBoundary")
    words = []
    with target.open("wb") as f:
        async for chunk in speech.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"start": chunk["offset"] / 1e7, "end": (chunk["offset"] + chunk["duration"]) / 1e7, "text": chunk["text"]})
    if not target.stat().st_size or not words:
        raise RuntimeError("the service returned no audio or word boundaries")
    return words


async def take(text, voice, target):
    for attempt in range(ATTEMPTS):
        try:
            return await synth(text, voice, target)
        except Exception as e:  # the service sometimes drops a connection or answers with nothing
            print("retry", target.name, e, flush=True)
            if attempt + 1 < ATTEMPTS:
                await asyncio.sleep(2 + attempt * 2)
    sys.exit(f"{voice['name']} gave no audio {ATTEMPTS} times for {target.stem}. "
             "A voice can be down for a day: list others with python tools/tts.py --voices ru and change it in script.json.")


def to_wav(mp3):
    """48 kHz mono float WAV; audio/mixlib.py reads this. Returns its length in seconds."""
    wav = mp3.with_suffix(".wav")
    subprocess.run([ffmpeg(), "-y", "-loglevel", "error", "-i", str(mp3), "-ar", "48000", "-ac", "1", "-c:a", "pcm_f32le", str(wav)], check=True)
    raw = wav.read_bytes()
    return (len(raw) - raw.find(b"data") - 8) / 4 / 48000


def align(text, words, marks):
    """Walk the word list along the text, so a marker's character offset turns into a time. Returns {name: (time, word)}."""
    low, pos, spans = text.lower(), 0, []
    for w in words:
        if "_at" in w:
            spans.append((w["_at"], w["start"], w["text"]))
            continue
        tok = w["text"].lower().strip()
        at = low.find(tok, pos) if tok else -1
        if at < 0:
            continue
        spans.append((at, w["start"], w["text"]))
        pos = at + len(tok)
    cues = {}
    for name, off in marks.items():
        later = [(t, word) for at, t, word in spans if at >= off]
        cues[name] = later[0] if later else ((spans[-1][1], spans[-1][2]) if spans else (0, ""))
    return cues


async def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("lang", nargs="?")
    ap.add_argument("beat", nargs="?")
    ap.add_argument("--try", dest="trials", type=trial_voice, action="append", default=[])
    ap.add_argument("--voices", metavar="PREFIX")
    a = ap.parse_args()
    try:
        import edge_tts
    except ImportError:
        sys.exit("edge_tts not found: pip install edge-tts, or set EDGE_TTS_PATH to the folder that holds it")
    if a.voices is not None:
        for voice in await edge_tts.list_voices():
            if voice.get("Locale", "").lower().startswith(a.voices.lower()):
                tags = voice.get("VoiceTag", {}).get("VoicePersonalities", [])
                print(voice["ShortName"], voice.get("Gender", ""), ", ".join(tags))
        return
    only_lang, only_beat = a.lang, a.beat
    if only_lang and only_lang not in LANGS:
        ap.error(f"unknown language {only_lang}; choose from {', '.join(LANGS)}")
    if only_beat and only_beat not in {b["id"] for b in SCRIPT["beats"]}:
        ap.error(f"unknown beat {only_beat}")
    if a.trials and not (only_lang and only_beat):
        ap.error("--try needs a language and beat")
    check_script()
    format_ = fmt()
    lexpath = ROOT / "script" / "lexicon.json"
    lexicon = json.loads(lexpath.read_text(encoding="utf-8")) if lexpath.exists() else {}
    if a.trials:
        b = next(b for b in SCRIPT["beats"] if b["id"] == only_beat)
        text = pronunciation(clean(b[only_lang])[0], lexicon.get(only_lang, {}))[0]
        folder = ROOT / "audio" / "voice" / only_lang / "try"
        folder.mkdir(parents=True, exist_ok=True)
        for i, settings in enumerate(a.trials, 1):
            voice = dict(beat_voice(only_lang, b), **settings)
            mp3 = folder / f"{b['id']}_{i}.mp3"
            await take(text, voice, mp3)
            raw = subprocess.run([ffmpeg(), "-v", "error", "-i", str(mp3), "-ar", "48000", "-ac", "1",
                                  "-f", "f32le", "-"], capture_output=True, check=True).stdout
            print(mp3, json.dumps(voice, ensure_ascii=False), f"{len(raw) / 192000:.3f} s", flush=True)
        return
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
            spoken, offsets, replacements, used = pronunciation(text, lexicon.get(lang, {}))
            voice = beat_voice(lang, b)
            mp3 = folder / f"{b['id']}.mp3"
            # a take is redone when its text or the voice settings changed; it is overwritten in place
            settings = [text, voice] + ([used] if used else [])
            stamp = hashlib.sha1(json.dumps(settings, ensure_ascii=False).encode("utf-8")).hexdigest()
            meta = mp3.with_suffix(".stamp")
            forced = only_lang == lang and only_beat == b["id"]
            stale = not meta.exists() or meta.read_text() != stamp or not mp3.with_suffix(".json").exists()
            if forced or stale or not mp3.exists() or mp3.stat().st_size == 0:
                words = await take(spoken, voice, mp3)
                mp3.with_suffix(".json").write_text(json.dumps(words, ensure_ascii=False, indent=0), encoding="utf-8")
                meta.write_text(stamp)
                print(lang, b["id"], "synth", flush=True)
            dur = to_wav(mp3)
            words = json.loads(mp3.with_suffix(".json").read_text(encoding="utf-8"))
            words = restore_words(spoken, words, offsets, replacements)
            cues = align(text, words, marks)
            beats.append({"id": b["id"], "shot": b["shot"], "start": round(t, 3), "dur": round(dur, 3), "end": round(t + dur, 3),
                          "cues": {k: round(t + v[0], 3) for k, v in cues.items()},
                          "words": [[round(t + w["start"], 3), round(t + w["end"], 3), w["text"]] for w in words]})
            placed = " ".join(f"{k}={v[1]}@{t + v[0]:.2f}" for k, v in cues.items())
            report.append(f"  {b['id']} {b['shot']} {t:.2f} +{dur:.2f}  {placed}")
            t += dur + b["pause"]
        total = round(t + TAIL, 3)
        out = {"lang": lang, "total": total, "format": format_, "beats": beats}
        (ROOT / "web" / f"timing_{lang}.js").write_text(f"TIMING.{lang} = " + json.dumps(out, ensure_ascii=False) + ";\n", encoding="utf-8")
        print(lang, "total", total, "s, words", sum(len(b["words"]) for b in beats), flush=True)
        print("\n".join(report), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
