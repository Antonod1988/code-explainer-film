"""Serves web/ and records what the page posts (Canvas 2D, so rows arrive top-down: no vflip).

Usage: python server.py <out-dir> [port]
  POST /png?name=x        the body is a PNG -> <out-dir>/x.png
  POST /start {w,h,fps,total,file}  starts ffmpeg writing <out-dir>/<file>
  POST /frame?i=N         raw RGBA frame N (out-of-order or repeated frames are refused or skipped)
  POST /end               closes the encoder and writes <out-dir>/page.done
  POST /log, /fatal       page messages; /fatal also ends the run
Env CRF (default 16), GOP and THREADS (x264 threads, to keep the laptop cool) for the encoder.
"""
import json
import os
import subprocess
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent
OUT = Path(sys.argv[1])
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8821
OUT.mkdir(parents=True, exist_ok=True)
lock = threading.Lock()
state = {"enc": None, "frames": 0, "bytes": 0, "total": None}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        with lock:
            status = self.handle_post(body)
        self.send_response(status)
        self.end_headers()

    def handle_post(self, body):
        path, _, query = self.path.partition("?")
        q = dict(kv.split("=", 1) for kv in query.split("&") if "=" in kv)
        if path == "/log":
            print("page:", body.decode("utf-8", "replace"), flush=True)
        elif path == "/fatal":
            print("FATAL:", body.decode("utf-8", "replace"), flush=True)
            self.done("ERROR")
        elif path == "/png":
            (OUT / f"{q['name']}.png").write_bytes(body)
            print("png:", q["name"], len(body) // 1024, "KiB", flush=True)
        elif path == "/start":
            cfg = json.loads(body)
            self.close_encoder()
            state.update(frames=0, bytes=cfg["w"] * cfg["h"] * 4, total=cfg.get("total"))
            gop = os.environ.get("GOP")
            keyframes = ["-g", gop, "-keyint_min", gop, "-sc_threshold", "0"] if gop else []
            threads = ["-threads", os.environ["THREADS"]] if os.environ.get("THREADS") else []
            dst = OUT / cfg["file"]
            state["enc"] = subprocess.Popen([
                imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
                "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{cfg['w']}x{cfg['h']}", "-r", str(cfg["fps"]), "-i", "-",
                "-c:v", "libx264", "-preset", "slow", "-crf", os.environ.get("CRF", "16"), *keyframes, *threads,
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(dst),
            ], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=open(dst.with_suffix(".log"), "w"))
            print("recording ->", dst, cfg, flush=True)
        elif path == "/frame":
            i = int(q["i"])
            if len(body) != state["bytes"]:
                return 400
            if i < state["frames"]:
                return 204
            if i > state["frames"]:
                return 409
            state["enc"].stdin.write(body)
            state["frames"] += 1
            if state["frames"] % 48 == 0:
                print("frames:", state["frames"], flush=True)
            if state["frames"] == state["total"]:
                self.close_encoder()
        elif path == "/end":
            self.close_encoder()
            self.done(str(state["frames"]))
        return 204

    @staticmethod
    def close_encoder():
        enc = state["enc"]
        if enc and enc.poll() is None:
            enc.stdin.close()
            enc.wait()
        state["enc"] = None

    @staticmethod
    def done(text):
        (OUT / "page.done").write_text(text)
        print("done:", text, flush=True)


ThreadingHTTPServer(("127.0.0.1", PORT), partial(Handler, directory=str(ROOT / "web"))).serve_forever()
