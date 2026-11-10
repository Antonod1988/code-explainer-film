# Film in code

[Русская версия: этапы, команды, что агент может и чего не может](README.ru.md)

An Agent Skill that lets a coding agent make a complete narrated explainer film with no video generator: Canvas 2D illustration, three.js 3D inserts, a neural voice-over, a score and sound effects synthesised in numpy, separate versions per language, horizontal or vertical, and delivery copies for Telegram, YouTube and X. It runs straight through to a rough cut, or stage by stage (format, script, mock-up, voice, final) with you approving each step.

The film is a program. Every frame is a function of time, so any second can be changed and re-rendered, and another language is a re-run, not a new edit.

## The main idea: voice first

The script carries markers. The voice service reports the time of every word, so each marker becomes a second, and picture and sound both hang on those seconds.

```
Придворные астрономы {plant}поставили её на карту и {cut}записали дату.

CUE.plant = 9.21    the hand sets the star down: thunk, sparks
CUE.cut   = 10.50   cut to the deed, the quill starts writing
```

Each language gets its own timeline from its own take, so it gets its own edit for free.

## What is inside

```
skills/code-explainer-film/
  SKILL.md                 the workflow, from a reference video to delivery
  references/              how to measure a video, script and voice, picture, sound, review and render, delivery, pitfalls
  scripts/                 check the machine, start a project
  assets/template/         a project skeleton with a 25-second demo: voice, flat shots, a 3D shot, a score,
                           a preview player with sound, a storyboard sheet, rendering in resumable parts
  assets/examples/         the code of the real film, to read for technique
```

The stages, and the tools a person uses at each:

| Stage | What you get | Command in the project |
|---|---|---|
| Format | 16:9, 9:16, 1:1, 4:5, 4k or your own size and fps | `"format"` in `script/script.json` |
| Script | Beats with scene, narration and cues, as a table | `python tools/storyboard.py ru --text` |
| Voice | Takes with word times, the timeline; stresses in a lexicon, trial takes | `python tools/tts.py`, `--try`, `--voices` |
| Mock-up | The film in a browser with sound, timeline and seeking; a storyboard sheet | `python tools/preview.py ru`, `python tools/storyboard.py ru` |
| Sound | Score and effects on the same cues, mix at -15 LUFS, checks | `python audio/score.py ru`, `tools/bands.py`, `tools/qa_audio.py` |
| Final | Film streamed into ffmpeg, in parts if long; master, phone copy, Telegram copy, subtitles | `render_parts.py`, `tools/finish_film.py`, `tools/telegram_copy.py` |

## Install

```bash
git clone https://github.com/Antonod1988/code-explainer-film
cp -r code-explainer-film/skills/code-explainer-film ~/.claude/skills/
```

Then ask your agent for an animated explainer. Needs Python 3 with numpy, scipy, Pillow, imageio-ffmpeg and edge-tts, and Edge or Chrome. `scripts/check_env.py` tells you what is missing.

## What has been run

The pipeline made a real 5:16 film in Russian and English: 16 beats, 57 cues, ten 3D inserts, 14 to 16 minutes of rendering per language on a laptop.

The template was extracted from that film afterwards. Its demo has since drawn real stills, flat and 3D, and a second film's concept frames were built on it. The stage tools were run on the demo in fresh 16:9 and 9:16 projects: voice with a lexicon, trial takes, storyboards, the preview player in a browser, a render in parts joined and resumed, and the vertical delivery copies. Rendering has only ever been done on Windows with Edge, nobody has listened to the takes, and no agent has run the skill from a clean start yet.

`edge-tts` is an unofficial client for the voices of Microsoft Edge. Check that its terms fit your use.

## License

MIT, see [LICENSE](LICENSE). It covers the code in this repository, including the example film's code.
