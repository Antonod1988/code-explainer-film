"""Record the page with a headless browser and server.py: stills as PNGs, or the film streamed straight into ffmpeg.

  python render.py renders/check "lang=ru&times=1,4.5,9"
  THREADS=6 CRF=17 python render.py renders/film_ru "lang=ru&fps=24&file=film_ru.mp4"
  python render.py renders/patch "lang=ru&fps=24&file=patch.mp4&from=120&to=130"

Options
  --port N      default 8831
  --stall S     give up after S seconds with no progress from the page (default 600)
  --browser P   a Chromium-family browser; or set BROWSER. Edge is preferred on Windows.
Env
  CRF, GOP, THREADS            read by server.py for the encoder
  RENDER_PROFILE_BASE          where the throwaway browser profile goes (default: this folder). Keep the path short.
Exit code 0 when the page finished, 1 otherwise.
"""
import argparse
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CANDIDATES = {
    "win32": [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
              r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe"],
    "darwin": ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
               "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
               "/Applications/Chromium.app/Contents/MacOS/Chromium"],
}
NAMES = ["microsoft-edge", "google-chrome", "chromium", "chromium-browser"]


def find_browser(given):
    if given:
        return given
    if os.environ.get("BROWSER"):
        return os.environ["BROWSER"]
    for path in CANDIDATES.get(sys.platform, []):
        if Path(path).exists():
            return path
    for name in NAMES:
        found = shutil.which(name)
        if found:
            return found
    sys.exit("no Chromium-family browser found: pass --browser or set BROWSER")


def kill(proc, browser=None, marker=None):
    """Stop a process with its children; for the browser also anything left that holds our profile."""
    if proc.poll() is None:
        if sys.platform == "win32":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
        else:
            proc.kill()
    if marker:
        if sys.platform == "win32":
            name = Path(browser).name
            subprocess.run(["powershell", "-NoProfile", "-Command",
                            f"Get-CimInstance Win32_Process | Where-Object {{ $_.Name -eq '{name}' -and $_.CommandLine -match '{marker}' }} | "
                            "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"], capture_output=True)
        else:
            subprocess.run(["pkill", "-f", marker], capture_output=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("query")
    ap.add_argument("--port", type=int, default=8831)
    ap.add_argument("--stall", type=int, default=600)
    ap.add_argument("--browser")
    a = ap.parse_args()

    out = (ROOT / a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    done = out / "page.done"
    done.unlink(missing_ok=True)
    log_path = out / f"server-{a.port}.log"
    marker = f"_edge{a.port}"
    profile = Path(os.environ.get("RENDER_PROFILE_BASE", ROOT)) / marker
    if len(str(profile)) > 60:
        print(f"warning: {profile} is long. Edge can show an error dialog on the user's screen for long profile paths; "
              "set RENDER_PROFILE_BASE to something short.", flush=True)
    browser = find_browser(a.browser)

    with open(log_path, "w", encoding="utf-8") as log:
        env = dict(os.environ, PYTHONIOENCODING="utf-8")
        server = subprocess.Popen([sys.executable, str(ROOT / "server.py"), str(out), str(a.port)], stdout=log, stderr=subprocess.STDOUT, env=env)
    for _ in range(50):
        try:
            urllib.request.urlopen(f"http://localhost:{a.port}/", timeout=1).read()
            break
        except OSError:
            time.sleep(.2)
    else:
        kill(server)
        sys.exit(f"server.py did not start, see {log_path}")

    flags = ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--window-size=960,540", f"--user-data-dir={profile}",
             "--no-first-run", "--no-default-browser-check", "--disable-extensions",
             "--disable-component-extensions-with-background-pages", "--disable-sync", "--disable-background-networking",
             "--disable-background-timer-throttling", "--disable-renderer-backgrounding"]
    if sys.platform == "win32":
        flags.append("--use-angle=d3d11")
    start = time.time()
    page = subprocess.Popen([browser, *flags, f"http://localhost:{a.port}/?record&{a.query}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    result, last_size, last_change, gone_at = None, -1, time.time(), None
    while result is None:
        time.sleep(1)
        if done.exists():
            result = done.read_text().strip()
            break
        if server.poll() is not None:
            result = "ERROR: server.py died"
        size = log_path.stat().st_size
        if size != last_size:
            last_size, last_change = size, time.time()
        if page.poll() is not None and gone_at is None:
            gone_at = time.time()
        if gone_at and time.time() - gone_at > 20:
            result = f"ERROR: the browser exited with code {page.returncode}"
        if time.time() - last_change > a.stall:
            result = f"ERROR: no progress for {a.stall} s (a script failed to load, or the page hung)"

    kill(page, browser, marker)
    kill(server)
    for _ in range(4):
        time.sleep(1)
        shutil.rmtree(profile, ignore_errors=True)
        if not profile.exists():
            break
    done.unlink(missing_ok=True)

    print(f"render: {time.time() - start:.0f} s, result: {result}", flush=True)
    lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    shown = [ln for ln in lines if ln.startswith(("page:", "FATAL", "Traceback")) or "Error" in ln]
    print("\n".join(shown[-30:]), flush=True)
    return 1 if str(result).startswith("ERROR") else 0


if __name__ == "__main__":
    sys.exit(main())
