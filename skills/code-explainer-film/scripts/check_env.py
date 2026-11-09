"""What this machine has for the film pipeline: python check_env.py. Exit code 1 when something required is missing."""
import importlib
import os
import shutil
import sys
from pathlib import Path

if os.environ.get("EDGE_TTS_PATH"):
    sys.path.insert(0, os.environ["EDGE_TTS_PATH"])
missing = []


def has(module):
    try:
        importlib.import_module(module)
        return True
    except Exception:
        return False


def report(name, ok, fix, required=True):
    print(f"{'ok ' if ok else ('MISSING' if required else 'absent ')}  {name}" + ("" if ok else f"   ->  {fix}"))
    if required and not ok:
        missing.append(name)


print("python", sys.version.split()[0])
report("numpy", has("numpy"), "pip install numpy")
report("scipy", has("scipy"), "pip install scipy")
report("Pillow", has("PIL"), "pip install pillow")
report("ffmpeg", has("imageio_ffmpeg") or bool(shutil.which("ffmpeg")), "pip install imageio-ffmpeg")
report("edge_tts (voice)", has("edge_tts"), "pip install edge-tts, or set EDGE_TTS_PATH to the folder that holds it")

browsers = [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
found = os.environ.get("BROWSER") or next((b for b in browsers if Path(b).exists()), None) or next(
    (shutil.which(n) for n in ("microsoft-edge", "google-chrome", "chromium", "chromium-browser") if shutil.which(n)), None)
report(f"headless browser ({found})", bool(found), "install Edge or Chrome, or set BROWSER")

whisper = (has("torch") and has("transformers")) or has("faster_whisper")
report("speech recognition for the sound check", whisper, "pip install faster-whisper (optional; the picture check works without it)", required=False)

free = shutil.disk_usage(Path.cwd()).free / 2 ** 30
print(f"free on this drive: {free:.0f} GiB. A 5-minute film needs about 1 GiB: frames are streamed to the encoder, not stored.")
if missing:
    print("\nMissing:", ", ".join(missing))
    sys.exit(1)
print("\nReady.")
