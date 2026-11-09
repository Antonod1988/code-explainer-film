# Review and render

## Choosing stills

Stills are cheap, so use them instead of test renders. For each new shot take its first moment plus .3 s, every cue in it plus .2 s, its middle, and its last moment minus .3 s. Then:

```bash
python render.py renders/check "lang=ru&times=25,66,241,273"
python tools/contact.py renders/check 4       # renders/check/contact.jpg
```

To read cue times without opening the timing file, use the lines `tts.py` printed. Open the sheet, then open any suspect PNG at full size. Grain, hands and lettering only show at full size.

For a transition, take consecutive moments: `times=8.0,8.3,8.6,8.9`. For a suspected pop, take two frames 1/24 s apart.

After a render, make a sheet from the video itself: `python tools/sheet.py renders/film_ru/film_ru.mp4 sheet.jpg 6 0:316:8` samples every 8 s. It is the closest you get to watching. Do it for each language.

## What to look for

Every one of these was found in the real film by looking at a sheet.

- **Reads at a glance?** Can you tell what the frame is about in one second, with the sound off?
- **Is the subject in frame**, at both ends of a camera move, not only in the middle?
- **Empty frames.** A far camera in space shows black.
- **Washed-out or blown surfaces.** Dials with no contrast, brass gone white.
- **Upside-down or mirrored lettering**, especially on the near side of a dial.
- **Streaks or flicker** on flat surfaces: two planes too close.
- **Parts crossing the camera.**
- **Empty stages.** A book open with nothing on it at the start of a beat, because the text arrives only on a later cue.
- **Off-centre layouts** after a scale or translate.
- **Faceted spheres**, a jagged terminator.
- **Text:** overflow in the longer language, wrong decimal separator, a label over a label, labels near the edge.
- **Hands and faces.** Most likely to look wrong, first to be noticed.
- **Colour cast** in dark scenes. Compare against the style sheet.
- **The join between 2D and 3D.** Do the two share grain and palette?

Fix in batches, then re-shoot only the same moments.

## Render modes

Everything goes through `render.py <out-dir> "<query>"`. It starts `server.py` and a headless browser, and stops both afterwards.

| Query | Result |
|---|---|
| `lang=ru&times=1,4.5,9` | PNG stills `t001.00.png` ... |
| `lang=ru&fps=24&file=film_ru.mp4` | The whole film, streamed into libx264 |
| `lang=ru&fps=24&file=patch.mp4&from=120&to=130` | Only that span |
| `...&pause=40` | Rest 40 ms after each frame, to run cooler |

Without `record` in the URL (open `index.html` through a server yourself), the page plays in real time, which helps a person looking at it.

Environment, read by `server.py`: `CRF` (default 16; 17 is fine for a master, 23 for a casual clip), `GOP` (keyframe spacing; set it for loops), `THREADS` (x264 threads; 6 leaves room on an 8-core laptop).

How it works: the page renders frame `i` at time `i / fps`, posts raw RGBA to `/frame?i=N`, and the server pipes it to ffmpeg. Frames carry their index, so a retried upload cannot desync the stream. The server closes the encoder at the last frame by itself, so a lost `/end` cannot leave ffmpeg waiting. PNG sequences are never written, which matters on a small disk.

A page error reaches `/fatal` and ends the run with exit code 1. `--stall` ends a run with no progress for 600 s. If a watchdog on the machine can pause jobs for longer than that, raise it.

## Time

Measure before promising. The page logs `ms per frame` every 240 frames into `<out-dir>/server-<port>.log`. Frames × ms per frame is the render time: the real film took 14 to 16 minutes per language. Tell the user the estimate, start in the background, and work on something else.

A 16-minute render should be started once. Before it, take stills in that language, including each label's longest text, and make sure the mix can be made afterwards.

## Load

- One heavy job at a time on a laptop: a render uses the GPU, the browser and the encoder together. Two at once have powered a laptop off, and so has one long full-power render with no cooling.
- If the machine has a job queue or a thermal watchdog, use them. If the project notes say not to watch the load, do not watch it.
- Do not chain review renders back to back. Batch your changes.
- If the user complains about the load, stop at once and offer a choice. Do not silently throttle: slowing a render by adding pauses annoyed the same person who had complained.

## Partial re-render

`from` and `to` record a span with identical settings. Splicing it into the master has not been needed yet, so treat that as untested: concat only on a keyframe, with identical encoder settings, and check the join on a sheet. For anything short of a big film, re-rendering the whole language is simpler. Sound changes never need this: re-run `finish_film.py`.

## Browser notes

- Edge headless is what has been tested on Windows. Chrome headless exited at once with code 21 on the same machine; `render.py` reports an early exit.
- Keep the profile path short. A long `--user-data-dir` made Edge show an error dialog on the user's screen. `render.py` warns over 60 characters; set `RENDER_PROFILE_BASE`.
- Keep `--disable-extensions`. Without it Edge installs machine-wide extensions into the fresh profile, which open setup pages and restart the recording.
- Do not record through a hidden browser pane: it runs as a background page and manages about 1 fps.
- On Linux or macOS `render.py` should work with Chromium-family browsers, but this has not been tested.
