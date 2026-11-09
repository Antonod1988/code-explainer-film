# Film in code

An Agent Skill that lets a coding agent make a complete narrated explainer film with no video generator: Canvas 2D illustration, three.js 3D inserts, a neural voice-over, a score and sound effects synthesised in numpy, separate versions per language, and delivery copies for Telegram, YouTube and X.

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
  assets/template/         a project skeleton with a 25-second demo: voice, flat shots, a 3D shot, a score
  assets/examples/         the code of the real film, to read for technique
```

## Install

```bash
git clone https://github.com/Antonod1988/code-explainer-film
cp -r code-explainer-film/skills/code-explainer-film ~/.claude/skills/
```

Then ask your agent for an animated explainer. Needs Python 3 with numpy, scipy, Pillow, imageio-ffmpeg and edge-tts, and Edge or Chrome. `scripts/check_env.py` tells you what is missing.

## What has been run

The pipeline made a real 5:16 film in Russian and English: 16 beats, 57 cues, ten 3D inserts, 14 to 16 minutes of rendering per language on a laptop.

The template was extracted from that film afterwards. On the demo, the voice, the mix and the sound checks have been run, the delivery tools on a black clip, `render.py` against stub pages, and the flat picture logic over every frame against a stub canvas in both languages. **The template has not yet drawn a real frame**, and its 3D shot has never run. Rendering has only ever been done on Windows with Edge. Nobody has run the skill from a clean start yet. `SKILL.md` tells the agent to treat its first stills as the test.

`edge-tts` is an unofficial client for the voices of Microsoft Edge. Check that its terms fit your use.

## License

MIT, see [LICENSE](LICENSE). It covers the code in this repository, including the example film's code.
