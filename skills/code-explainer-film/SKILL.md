---
name: code-explainer-film
description: "Make a complete narrated short film or animated explainer entirely in code, with no video generator: Canvas 2D illustration and three.js 3D inserts recorded frame by frame to MP4, a neural voice-over whose word timings drive the edit, a score and sound effects synthesised in numpy, separate versions per language, checks of picture and sound without a human, and delivery copies for Telegram, YouTube and X. Use whenever the user wants an animation, explainer, video essay, educational film or intro with voice-over, especially 'like this YouTube video', 'сделай такое видео', 'сделай анимацию или ролик с озвучкой', 'в стиле этого ролика', 'на русском и английском', even if they never say 'code'. Not for editing existing footage or for Blender scenes."
---

# Film in code

The film is a program. Every frame is a pure function of time, drawn by code you write, and the voice, the music and every sound come out of code too. No image or video generator is involved. So any second can be changed and re-rendered, and another language is a re-run, not a new edit.

This pipeline made a 5:16 film in Russian and English: 16 beats, 57 cues, ten 3D inserts, about 1.5 to 2 hours from script to the first language, 14 to 16 minutes of rendering per language on a laptop. The code of that film is in `assets/examples/court-astronomer/`.

## The one idea: voice first

Write the script with markers. Let the voice service say it and report the time of every word. A marker then becomes an absolute second, and picture and sound both hang on those seconds.

```
Придворные астрономы {plant}поставили её на карту и {cut}записали дату.

CUE.plant = 9.21    the hand sets the star down: thunk, sparks
CUE.cut   = 10.50   cut to the deed, the quill starts writing
```

Each language gets its own timeline from its own take, so a Russian and an English film are cut differently with no extra work, and a rewritten sentence moves everything after it. This is why the order below is script, voice, picture, sound, and never picture first.

```
script/script.json ─ tools/tts.py ─> audio/voice/<lang>/  +  web/timing_<lang>.js
                                                                   │
                         ┌─────────────────────────────────────────┴───────┐
                  web/film.js + shots + space.js                    audio/score.py
                         │ render.py                                       │
                  renders/film_<lang>/film_<lang>.mp4               audio/mix/<lang>.wav
                         └───────────────── tools/finish_film.py ──────────┘
                                 final/<stem>.mp4, -phone.mp4, .srt
```

## Start a project

```bash
python <this-skill>/scripts/check_env.py
python <this-skill>/scripts/new_project.py <folder>
```

Put the project on a drive with room, in a folder named after the film, on a short path. Frames are streamed to the encoder and never stored, so a 5-minute film needs about 1 GiB.

The new project is a working 25-second demo about the phases of the Moon, in two languages. Run the commands `new_project.py` prints and look at the contact sheet before changing anything: if the demo works, every later failure is yours and not the machine's.

**Status of the template.** The pipeline made the real film, but this template was extracted from it afterwards. On the demo, `tts.py`, the mix and the sound checks have been run. The delivery tools have been run on a black clip, `render.py` against stub pages, and the flat picture logic over every frame against a stub canvas in both languages. The template has never drawn a real frame, and its 3D shot has never run. So the first stills are also the test of the template: if they fail, compare with `assets/examples/court-astronomer/`, which is the code that did render.

Then replace the content and keep the machinery:

| Replace for each film | Normally leave alone |
|---|---|
| `script/script.json` | `tools/` |
| `web/shots.js` (flat shots) | `render.py`, `server.py` |
| `web/film.js`: `SHOT` and `SEQ` | `web/main.js`, `web/lib.js`, `web/labels.js` |
| `web/space.js`: the builders | `web/space.js`: the kit above them |
| `audio/score.py` | `audio/mixlib.py`, `audio/synth.py` |

## Workflow

Run commands that take over two minutes in the background. If the machine has a job queue or a thermal rule (look in project notes and memory), run renders through it.

### 1. Pin down the request

Ask only what you cannot default: the subject, the languages, where it will be posted. Default to 1920x1080, 24 fps, -15 LUFS, a length that follows from the script. Build a complete rough film before polishing any part of it. People judge a whole film far better than a perfect ten seconds, and they often say outright that top quality can wait.

### 2. Read the reference, if there is one

Measure it instead of guessing: cuts, rhythm, palette, how often the character updates, line weight, grain. You can do this frame by frame in a browser without downloading the video. Read `references/reference-analysis.md`. Write the numbers down as a short style sheet in the project's README.

Take the technique and leave the content. Invent your own character, story and designs. Do not reuse frames, characters, logos or a recognisable tune from the reference, and do not recreate a specific work even under a new name.

### 3. Make a 10-second trial

One shot in the final look, silent. Hard-coded times are fine here because this only tests the look. Send it to the user. This is the cheapest moment in the whole project to change direction.

### 4. Collect facts, write the script

Read `references/script-and-voice.md`. Split the film into beats of 10 to 35 seconds, each one idea and usually one shot. Budget words: about 125 a minute in Russian and 150 in English, pauses included. Put cues on the words where something must happen on screen.

Keep exact facts and interpretation visibly apart, in the film and not only in your notes. If you compute something, keep the data in a file the film reads, so what is on screen is what the data says.

Show the script to the user if the subject is sensitive or they asked to approve it. Otherwise carry on and let them react to the film.

### 5. Voice, then timeline

```bash
python tools/tts.py
```

It prints each cue as `name=word@seconds`. Read those lines: a cue on the wrong word is far cheaper to catch here. Check the total against the target. If it runs long, cut text; do not speed the voice past about +10%.

### 6. Write the shots

Read `references/picture.md`. Everything on screen is a function of `(g, t)` and every time derives from `CUE` or `BEAT`. Flat shots draw with the Canvas kit; 3D shots render through the composer into the same 2D canvas. One grain pass at the end of every frame and one set of labels make the two read as one film.

### 7. Look at stills, fix, repeat

```bash
python render.py renders/check "lang=ru&times=25,66,241,273"
python tools/contact.py renders/check 4
```

Read `references/review-and-render.md` for how to choose moments and what to look for. Open the sheet and really inspect it: most defects are invisible in code and obvious in a picture. Batch your questions. Back-to-back review renders are what makes a laptop hot and a session slow.

### 8. Write the sound

Read `references/sound.md`. Sections start on voice beats, effects sit on the same cue names as the picture, the music ducks under the voice, and the mix lands at -15 LUFS.

```bash
python audio/score.py ru
python tools/bands.py ru
python tools/qa_audio.py ru whisper
```

You cannot hear it, so use the numbers. Aim for about 10 dB of voice over the rest on every beat; the real film came out at 6.7 to 14.2 dB, mostly 7 to 9, so do not go below that range. Say plainly that nobody has listened to it yet.

### 9. Stills in every language, then the full render

```bash
python render.py renders/check_en "lang=en&times=25,66,241,273"
THREADS=6 CRF=17 python render.py renders/film_ru "lang=ru&fps=24&file=film_ru.mp4"
```

Do the stills pass in each language first. A wrong decimal comma in one language costs a whole re-render later. Run one heavy job at a time. Sound-only changes need no picture render: remake the mix and run `finish_film.py` again.

### 10. Deliver, clean up, report

```bash
python tools/finish_film.py ru
python tools/telegram_copy.py ru
python tools/chapters.py ru
```

Read `references/delivery.md` for platform copies, descriptions and the report. Never upload or post on the user's behalf unless they asked for that specific post. Move drafts to the Recycle Bin or Trash instead of deleting them, and keep the finals and everything needed to remake them.

## Rules that save the most rework

- **A frame depends only on `t`.** No clocks, no unseeded random, no state carried from the previous frame. Otherwise a still does not match the film and a partial re-render does not match its neighbours.
- **Times come from cues.** An offset from a cue is fine. A typed-in absolute second breaks in the other language and after any rewrite.
- **All on-screen text goes through `T_`, numbers included.** `29,5 дня` and `29.5 days` are different strings. This is the bug that shipped in the real film's English master: a `23,4°`.
- **Do not assume cue order across languages.** Word order differs, so `CUE.a < CUE.b` may hold in only one of them. Guard spans built from two cues.
- **Labels are 2D, placed with `project()`.** They then share lettering, grain and language handling with the flat shots.
- **Keep the camera outside anything that rotates.** Check the extremes of a move on a sheet, not only its middle.
- **Static layers go into a `plate()`.** Redrawing a detailed background every frame is what makes a render slow.
- **Change, then look, then report.** Do not call something fixed until you have seen the frame.

## What you cannot check, and must say

- **Sound.** You see loudness, balance, spectrograms and a transcript. You do not know how it sounds.
- **Flow.** You see frames, not a viewer's experience, so pacing is your weakest judgement. Ask the user about rhythm specifically.
- **Platforms.** You cannot see how a file behaves inside the user's Telegram or YouTube account.

Report what was verified and what was not, in those words. The decisions (idea, direction, what to cut) are the user's.

## Bundled files

| Path | What it is | When to read |
|---|---|---|
| `references/reference-analysis.md` | Tested browser snippets for measuring a video, style sheet template | There is a reference video |
| `references/script-and-voice.md` | `script.json`, cue grammar, word budget, voices, facts | Before writing the script |
| `references/picture.md` | Timeline, flat kit, acting on cues, text, grain, 3D kit, map of the example code | Before writing shots |
| `references/sound.md` | Instruments, score structure, voice chain, mix numbers, checks | Before writing the score |
| `references/review-and-render.md` | What to look for on sheets, render modes and options, load | Before the first review, before the full render |
| `references/delivery.md` | Master, phone, Telegram, YouTube, X, subtitles, cleanup, the report | At the end |
| `references/pitfalls.md` | Symptom, cause, fix, across the whole pipeline | When something looks wrong |
| `scripts/check_env.py` | What the machine has | First |
| `scripts/new_project.py` | Makes a project from the template | Second |
| `assets/template/` | The project skeleton, a working demo | Copied by `new_project.py` |
| `assets/examples/court-astronomer/` | The real film's code: 10 3D builders, flat shots, a hand rig, a full score | Grep it for a technique; it does not run on its own |
