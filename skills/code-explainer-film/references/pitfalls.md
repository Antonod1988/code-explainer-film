# Pitfalls: symptom, cause, fix

All of these happened. Search this file by symptom.

## Voice and timeline

| Symptom | Cause | Fix |
|---|---|---|
| `No audio was received` | The service is flaky, or that voice is down | `tts.py` retries 8 times. If it still fails, change the voice; one voice can be out for a day while others work |
| No word boundaries, or an argument error on `boundary` | Old edge-tts | Upgrade; 7.3.1 is tested |
| The local neural voice will not start | Its runtime or environment is gone | Check that it starts before planning around it, or use edge-tts |
| Film far longer than planned | Word budget ignored | About 125 words a minute in Russian, 150 in English. Cut text; keep `rate` at +10% or less |
| A word stressed wrong, in every take | Homograph or rare word | Lexicon entry with U+0301 after the stressed vowel; ask the user to listen. An upper-case vowel does nothing |
| One beat sounds rushed or flat | One voice setting for the whole film | That beat's own `voice` with its `rate` or `pitch`; compare with `--try` first |
| A cue fires on the wrong word | Marker misplaced, or a number read differently from the text | Read the `name=word@time` lines. Spell numbers out |
| A shot breaks in one language only | Code assumed the order of two cues, or a typed-in time | Derive from cues, guard spans. Stills in every language |
| `audio/voice/.../*.wav is missing` | WAVs were cleaned up | `python tools/tts.py` remakes them from the mp3s without calling the service |

## Text on screen

| Symptom | Cause | Fix |
|---|---|---|
| `23,4°` in English | A number outside `T_` | Pass every number through `T_` |
| Label overflows in one language | Text length differs | Check the longest label in each language |
| Wrong font on another machine | System font | Bundle a licensed font, check it covers your scripts |

## 3D

| Symptom | Cause | Fix |
|---|---|---|
| Washed-out dials, a hot spot across lettering | Painted surface under lights | `MeshBasicMaterial` for painted discs and charts |
| Brass blown white | Too much light or bloom | Lower the light, bloom threshold 1.25 |
| A bright square appears | HDR spike into bloom | Clamp pass before bloom, about 5.0 |
| Teal night turns olive | Wide bloom off large lit areas, sRGB toe | Threshold 1 or more |
| Night sky crushed to black | `pow(2.2)` plus OutputPass's sRGB | Keep the sky at .08 or more on its ramp |
| Radial streaks on a plate | Z-fighting | Separate by a visible distance: plate .012, gears .04 |
| Faceted sphere | Too few segments under toon shading | 200x140 |
| Near-side lettering upside-down | Dial text rotated one way all round | `dialRot(a, nearLon)` flips the near half |
| Parts fly through the lens | Camera inside the sweep of a moving part | Camera radius outside the sweep. Check at both ends of the move |
| Empty frame on a far pull-away | Space is mostly black | Cut to another subject |
| Subject never in frame | Its path was not checked | Look at a sheet across the whole shot |
| Blank 3D shot in the 2D canvas | No `preserveDrawingBuffer` | Set it on the renderer |

## Flat shots

| Symptom | Cause | Fix |
|---|---|---|
| A vertical film crops its scenes | Layout typed in for 1920x1080 | Lay out from `W` and `H`; give 3D cameras more distance when `H > W` |
| Sleeves or limbs like thick pipes | Constant-width shapes | `taperPath`, narrower wrists, folds |
| Page off-centre | A scale around the wrong origin | Translate to the centre first; check on a sheet |
| Empty stage at the start of a beat | Content arrives only on a later cue | Give the stage something from its first frame |
| Movement looks like cheap software | Everything on every frame | Character on `step(t, 12)`, holds, overshoot |

## Render

| Symptom | Cause | Fix |
|---|---|---|
| An error dialog appears on the user's screen | Long browser profile path | `RENDER_PROFILE_BASE` to something short |
| Recording restarts, setup pages open | Machine-wide extensions in the fresh profile | `--disable-extensions` (already set) |
| Browser exits at once with code 21 | Chrome headless on that machine | Use Edge |
| About 1 fps | Recording in a hidden browser pane | Use the headless browser through `render.py` |
| ffmpeg waits forever | The final `/end` never arrived | The server finalises on the last frame (`total` in `/start`) |
| Torn or shifted frames | Retried upload without an index | `/frame?i=N` refuses out-of-order frames |
| `AttributeError` or odd behaviour in the server | A method named `finish` on the request handler | The base class calls `finish()` after each request. Pick another name |
| Render waits for frames that never come | A script failed before the handlers | The early handler in `index.html` and `--stall` catch this |
| Laptop powers off | Sustained GPU and CPU load, heat | One heavy job at a time, a queue or watchdog, no chained renders |
| Disk fills up | PNG sequences | Stream to the encoder, as `render.py` does |

## Encoding

| Symptom | Cause | Fix |
|---|---|---|
| Halftone or grain pulses at each keyframe | Dense texture at a keyframe | `GOP` at the clip length for loops, CRF about 19 |
| A loop's seam looks like a small jump, though the frames match | Encoding noise differs on each side | Not an animation bug |
| Phone copy looks mushy | Grain eats the bitrate | `hqdn3d` first (already set), `-tune animation` |
| "Not optimized for streaming" in Telegram | Often not moov | `telegram_copy.py`, and attach as a video, not a file |
| The file card refuses the file | A 30 MiB limit on sending | Send the small copy, name the master's path |

## Sound

| Symptom | Cause | Fix |
|---|---|---|
| Voice buried on a beat | Busy section | Read voice-over-rest; lower that section's gains. Aim for about 10 dB |
| Music feels too loud in the finished film | Master too hot | -15 LUFS, music -9.5 dB, ducking -7.5 dB |
| Boomy low end | Pads and bass stacked | High-pass 38 Hz, cut at 75 and 160 Hz (in `mixdown`); read `bands.py` |
| Whisper scores low on a good take | Small models mishear names and numbers | Read for missing chunks, not spelling |
| A swell comes out far too loud | Normalised by body RMS | Normalise one-shots by the loudest 100 ms |
| Spikes at the edges of a stem | `istft` with `boundary=False` | Use the default |
| Two runs of the mix differ | Unseeded random, or Python `hash()` | Seed everything |
| Stem clipped silently | PCM stems | Float WAV |

## Shell and tools

| Symptom | Cause | Fix |
|---|---|---|
| `unexpected EOF` from a bash heredoc with long Python | Quoting in a long heredoc | Write the script to a file with the file tool and run it |
| `rm` with a glob is refused by a safety check | The harness protects against mass deletion | Do not work around it. `tts.py` overwrites stale takes; cleanup goes to the Recycle Bin |
| Garbled Russian in tool output | Console encoding | `tools/common.py` sets UTF-8; do the same in your own scripts |
| Edge pops up while you take a quick screenshot | No separate profile | `--user-data-dir` on a short path, `--headless=new` |
| Headless page looks clipped at 400 px | Headless windows have a minimum width of about 500 px | Put the page in a 400 px iframe |
