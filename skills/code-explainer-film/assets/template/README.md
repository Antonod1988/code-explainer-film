# Film project

Made from the `code-explainer-film` skill template. Out of the box it is a 25-second demo about the phases of the Moon, in Russian and English: replace the content, keep the pipeline.

## Files

- `script/script.json`: narration in every language with `{cue}` markers, voices, file names.
- `tools/tts.py`: voice takes and `web/timing_<lang>.js`, the timeline both picture and sound hang on.
- `web/film.js`: shots in order, transitions. `web/shots.js`: flat shots. `web/space.js`: 3D kit and builders. `web/lib.js`, `web/labels.js`: drawing kit and on-screen text.
- `audio/score.py`: music and effects of this film. `audio/mixlib.py`, `audio/synth.py`: reused as they are.
- `render.py`, `server.py`: stills and film through a headless browser, frames piped straight into ffmpeg.
- `tools/`: `contact.py`, `sheet.py` (sheets to look at), `qa_audio.py`, `bands.py` (sound checks), `finish_film.py`, `telegram_copy.py`, `chapters.py`, `mp4info.py` (delivery).

`renders/`, `audio/mix/`, voice WAVs and `final/` can all be remade from the rest.

## Commands, from this folder

```bash
python tools/tts.py
python render.py renders/check "lang=ru&times=2,5,9,14,18"
python tools/contact.py renders/check 3
python audio/score.py ru
THREADS=6 CRF=17 python render.py renders/film_ru "lang=ru&fps=24&file=film_ru.mp4"
python tools/finish_film.py ru
python tools/telegram_copy.py ru
python tools/qa_audio.py ru whisper
```

`&from=120&to=130` in the render query records only that span. Give each language its own output folder.
