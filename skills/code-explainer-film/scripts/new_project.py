"""Start a film project from the template.

  python new_project.py <folder> [--langs ru,en] [--three-from DIR] [--no-three]

Copies assets/template into <folder>, sets the file names of the finals from the folder name, and puts three.js into
web/vendor: fetched at a pinned version from jsDelivr, or copied with --three-from (a vendor folder, or a project that has one).
Refuses a folder that already holds files.
"""
import argparse
import json
import shutil
import sys
import urllib.request
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "template"
THREE_VERSION = "0.186.0"
THREE_URL = f"https://cdn.jsdelivr.net/npm/three@{THREE_VERSION}/"
BUILD = ["three.module.js", "three.core.js"]
JSM = ["environments/RoomEnvironment.js", "lines/Line2.js", "lines/LineGeometry.js", "lines/LineMaterial.js",
       "lines/LineSegments2.js", "lines/LineSegmentsGeometry.js", "postprocessing/EffectComposer.js", "postprocessing/MaskPass.js",
       "postprocessing/OutputPass.js", "postprocessing/Pass.js", "postprocessing/RenderPass.js", "postprocessing/ShaderPass.js",
       "postprocessing/UnrealBloomPass.js", "shaders/CopyShader.js", "shaders/LuminosityHighPassShader.js", "shaders/OutputShader.js"]


def three_files():
    """(source path under the package, path under web/vendor)"""
    return [(f"build/{n}", n) for n in BUILD] + [(f"examples/jsm/{n}", f"jsm/{n}") for n in JSM]


def fetch_three(vendor):
    for remote, local in three_files():
        dst = vendor / local
        dst.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(THREE_URL + remote, headers={"User-Agent": "film-project-setup"})
        with urllib.request.urlopen(req, timeout=60) as r:
            dst.write_bytes(r.read())
    print(f"three.js {THREE_VERSION} fetched from jsDelivr into {vendor}")


def copy_three(source, vendor):
    source = Path(source)
    for candidate in (source, source / "vendor", source / "web" / "vendor"):
        if (candidate / "three.module.js").exists():
            shutil.copytree(candidate, vendor, dirs_exist_ok=True)
            print(f"three.js copied from {candidate}")
            return
    sys.exit(f"no three.module.js under {source}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder")
    ap.add_argument("--langs", default="ru,en", help="which of the demo's languages to keep")
    ap.add_argument("--three-from")
    ap.add_argument("--no-three", action="store_true")
    a = ap.parse_args()

    dst = Path(a.folder).resolve()
    if dst.exists() and any(dst.iterdir()):
        sys.exit(f"{dst} already holds files; pick an empty or new folder")
    shutil.copytree(TEMPLATE, dst, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__"))
    (dst / "gitignore.txt").rename(dst / ".gitignore")

    path = dst / "script" / "script.json"
    script = json.loads(path.read_text(encoding="utf-8"))
    langs = [x.strip() for x in a.langs.split(",") if x.strip()]
    unknown = [x for x in langs if x not in script["voice"]]
    if unknown:
        print(f"note: the demo has no text for {unknown}. Add a voice and text for them in script/script.json, then add them to 'voice'.")
    keep = [x for x in langs if x in script["voice"]] or list(script["voice"])
    script["voice"] = {k: v for k, v in script["voice"].items() if k in keep}
    script["stem"] = {k: f"{dst.name}-{k}" for k in keep}
    path.write_text(json.dumps(script, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    vendor = dst / "web" / "vendor"
    if a.three_from:
        copy_three(a.three_from, vendor)
    elif not a.no_three:
        try:
            fetch_three(vendor)
        except OSError as e:
            print(f"could not fetch three.js ({e}). Run again in a new folder with --three-from, or copy the files listed in new_project.py into web/vendor.")

    print(f"""
Project ready: {dst}
Prove the pipeline on the demo before changing anything, from that folder:
  python tools/tts.py
  python render.py renders/check "lang={keep[0]}&times=2,5,9,14,18"
  python tools/contact.py renders/check 3""")


if __name__ == "__main__":
    main()
