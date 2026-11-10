"""Shared by the tools: project paths, the script, the timeline, ffmpeg and a label font."""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARK = re.compile(r"\{(\w+)\}")
PRESETS = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080),
           "4:5": (1080, 1350), "4k": (3840, 2160)}

# Russian words in a Windows console otherwise raise UnicodeEncodeError or come out garbled.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        found = shutil.which("ffmpeg")
        if found:
            return found
        sys.exit("ffmpeg not found: pip install imageio-ffmpeg")


def script():
    return json.loads((ROOT / "script" / "script.json").read_text(encoding="utf-8"))


def fmt(config=None):
    """Resolve script.format; pass a dict explicitly for an older timeline's fallback."""
    config = script().get("format", {}) if config is None else config
    if not isinstance(config, dict):
        raise ValueError("format must be an object with preset or w/h, and optional fps")
    preset = config.get("preset")
    if preset is not None and preset not in PRESETS:
        raise ValueError(f"unknown format preset {preset!r}; choose from: {', '.join(PRESETS)}")
    if preset is not None:
        w, h = PRESETS[preset]
        if config.get("w", w) != w or config.get("h", h) != h:
            raise ValueError("format: w/h disagree with preset")
    elif "w" in config or "h" in config:
        w, h = config.get("w"), config.get("h")
    else:
        w, h, preset = 1920, 1080, "16:9"
    for name, value in (("w", w), ("h", h)):
        if type(value) is not int or value % 2 or not 64 <= value <= 8192:
            raise ValueError(f"format.{name} must be an even integer from 64 to 8192")
    fps = config.get("fps", 24)
    if type(fps) is not int or not 1 <= fps <= 240:
        raise ValueError("format.fps must be an integer from 1 to 240")
    return {"w": w, "h": h, "fps": fps, "preset": preset}


def fit_size(w, h, long=480):
    scale = long / max(w, h)
    return max(1, round(w * scale)), max(1, round(h * scale))


def copy_size(tl):
    f = fmt(tl.get("format", {}))
    scale = min(540 / min(f["w"], f["h"]), 960 / max(f["w"], f["h"]))
    return tuple(max(2, round(v * scale / 2) * 2) for v in (f["w"], f["h"]))


def timeline(lang):
    """web/timing_<lang>.js as a dict."""
    path = ROOT / "web" / f"timing_{lang}.js"
    if not path.exists():
        sys.exit(f"{path} is missing: run python tools/tts.py first")
    text = path.read_text(encoding="utf-8")
    return json.loads(text[text.index("=") + 1:].rstrip().rstrip(";"))


def stem(lang):
    """The file name of this language's finals."""
    return script().get("stem", {}).get(lang) or f"{ROOT.name}-{lang}"


def label_font(size):
    from PIL import ImageFont
    for name in ("arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def clock(seconds):
    """m:ss, rounded to the nearest second."""
    s = int(round(seconds))
    return f"{s // 60}:{s % 60:02d}"
