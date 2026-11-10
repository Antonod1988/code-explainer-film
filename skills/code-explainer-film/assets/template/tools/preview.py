"""Serve the whole project for the sound preview: python tools/preview.py [lang] [--port 8840] [--no-open]."""
import argparse
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode

from common import ROOT


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, *args):
        pass


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("lang", nargs="?", default="ru")
    ap.add_argument("--port", type=int, default=8840)
    ap.add_argument("--no-open", action="store_true")
    a = ap.parse_args()
    url = f"http://localhost:{a.port}/web/index.html?{urlencode({'lang': a.lang})}&preview"
    with ThreadingHTTPServer(("127.0.0.1", a.port), partial(Handler, directory=str(ROOT))) as server:
        print(url, "\nCtrl+C stops the preview server.", flush=True)
        if not a.no_open:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
