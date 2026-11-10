# Film project

Made from the `code-explainer-film` skill template. Out of the box it is a 25-second demo about the phases of the Moon, in Russian and English: replace the content, keep the pipeline.

## Files

- `script/script.json`: narration in every language with `{cue}` markers, voices, file names, and human-readable `scene` descriptions (a string or a language dictionary).
- `tools/tts.py`: voice takes and `web/timing_<lang>.js`, the timeline both picture and sound hang on.
- `web/film.js`: shots in order, transitions. `web/shots.js`: flat shots. `web/space.js`: 3D kit and builders. `web/lib.js`, `web/labels.js`: drawing kit and on-screen text.
- `audio/score.py`: music and effects of this film. `audio/mixlib.py`, `audio/synth.py`: reused as they are.
- `render.py`, `server.py`: stills and film through a headless browser, frames piped straight into ffmpeg. `render_parts.py`: resumable parts and automatic joining.
- `tools/`: `contact.py`, `sheet.py` (sheets to look at), `qa_audio.py`, `bands.py` (sound checks), `finish_film.py`, `telegram_copy.py`, `chapters.py`, `mp4info.py` (delivery).

`renders/`, `audio/mix/`, voice WAVs and `final/` can all be remade from the rest.

## Format and voice

Optional top-level `"format": {"preset": "9:16", "fps": 30}` in `script/script.json`, or `"format": {"w": 1080, "h": 1920, "fps": 30}`.
Presets: `16:9` (1920×1080), `9:16` (1080×1920), `1:1` (1080×1080), `4:5` (1080×1350), `4k` (3840×2160).
Dimensions must be even integers from 64 to 8192; fps is an integer from 1 to 240. Defaults: 1920×1080, 24 fps.
Run TTS after changing the format to update the timeline; unchanged takes are reused. `new_project.py --format 9:16` sets the preset when creating a project.
Phone and Telegram copies retain the aspect ratio, with a short side of 540 and a long side capped at 960 (square: 540×540). Sheets follow the stills' aspect ratio.

`script/lexicon.json` holds pronunciation replacements per language. The demo stresses `полови́ну` with U+0301, a combining acute accent after the vowel.
Matching is on whole words, ignoring case and preserving the first letter's case. Respelling works too: `"МКС": "эм ка эс"`.
Only the voice receives these replacements; timeline words, subtitles and cue positions keep the original text. Editing an entry re-voices only affected beats.
A beat can override its language's voice with `"voice": {"ru": {"rate": "+0%", "pitch": "-4Hz", "name": "ru-RU-DmitryNeural"}}`.
Use repeated `--try` options to compare settings without changing the main take or timeline; trial MP3s go to `audio/voice/<lang>/try/<beat>_1.mp3`, `_2.mp3`, etc.

## Commands, from this folder

```bash
python tools/tts.py
python tools/tts.py --voices ru
python tools/tts.py ru b02 --try "rate=-4%,pitch=-6Hz" --try "name=ru-RU-DmitryNeural"
python tools/storyboard.py ru --text
python tools/preview.py ru
python render.py renders/check "lang=ru&times=2,5,9,14,18"
python tools/contact.py renders/check 3
python tools/storyboard.py ru --cols 3
python audio/score.py ru
THREADS=6 CRF=17 python render.py renders/film_ru "lang=ru&fps=24&file=film_ru.mp4"
python render_parts.py renders/film_ru "lang=ru&file=film_ru.mp4" --part 60
python tools/finish_film.py ru
python tools/telegram_copy.py ru
python tools/qa_audio.py ru whisper
```

`&from=120&to=130` in the render query records only that span. Give each language its own output folder.
Exact frame bounds `&f0=240&f1=480` override seconds; `f1` is exclusive. `fps` in the query overrides the timeline's fps.
`render_parts.py` supports `--port`, `--stall`, `--browser` and the same `CRF`, `GOP`, `THREADS` environment variables as `render.py`.
It verifies each part's frame count before writing `.ok`, reuses verified parts on rerun, then joins with ffmpeg stream copy and checks the final count.

The preview serves the whole project at `/web/index.html?lang=ru&preview`; `--port 8840` and `--no-open` are available. Ctrl+C stops its server.
Click Play to hear `audio/mix/<lang>.wav`, or the available voice takes if the mix is missing. Missing audio is allowed.
Space plays/pauses, arrows seek 1 s (Shift: 5 s), comma/period step frames, `[`/`]` jump beats, Home/End jump to the ends, M mutes, S saves a PNG.
The strip shows beats and cues (hover for cue names), the narration highlights timed words, and the corner shows drawing time and achieved fps.

`storyboard.py --text` writes `script/storyboard_<lang>.md` even before voicing, using estimates (125 words/min for Russian, 150 for others, plus pauses).
With a timeline, `storyboard.py` renders a sheet to `renders/storyboard_<lang>/storyboard.jpg`, with scenes and narration.
Each beat's still defaults to 60% of its take; optional `"still": 2.5` selects seconds into that beat. Default columns: 3 landscape, 4 portrait.
