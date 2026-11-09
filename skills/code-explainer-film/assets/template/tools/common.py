"""Shared by the tools: project paths, the script, the timeline, ffmpeg and a label font."""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARK = re.compile(r"\{(\w+)\}")

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
