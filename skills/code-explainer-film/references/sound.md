# Sound

All music and effects are synthesised in numpy, 48 kHz float. There are no samples to find or license, and every sound is placed by the same cues as the picture. You will not hear any of it, so write conservatively and check with numbers.

## Instruments: audio/synth.py

| Function | Sound | How |
|---|---|---|
| `pluck(m, 'harp'/'lute'/'pizz', v)` | plucked strings | Karplus-Strong, retuned by resampling |
| `pad(notes, dur, 'strings'/'choir'/'organ', att, rel)` | ensembles | PADsynth tables: wide, free of beating |
| `bell(f, dur, bright, 'tube'/'celesta'/'glass')` | bells | additive partials. Takes frequency: `mtof(m)` |
| `flute(m, dur, v, slide_from)` | a tune | breath noise plus harmonics |
| `frame_drum(v, low)`, `tick`, `tock`, `thunk`, `stamp`, `boom(dur, f0, f1)` | percussion and hits | |
| `whoosh(dur, f0, f1, v, width)`, `swell(dur, f0, f1)`, `shimmer(dur, v, lo, hi, n, seed)` | moves and sparkle | shaped noise and sine clouds |
| `paper_wipe`, `paper_slide`, `page_turn`, `quill(dur, v, rate)` | paper | shaped noise |
| `hum`, `rumble`, `relay_burst`, `blips`, `plop`, `hoof`, `owl_hoot`, `low_call` | special effects | |
| `hall_ir(rt, seed, predelay)`, `convolve_st(x, ir)` | synthetic hall | FFT convolution |
| `lp`, `hp`, `bp`, `peak`, `shelf_hi`, `fade` | filters | |

Add a new sound as a small function. Seed anything random (`seed=`), so a re-run gives the same mix. Python's `hash()` is salted per run, so never derive a seed from it.

## The score: audio/score.py

```python
F = Film(lang)
BEAT, CUE, TOTAL, put, music, fx = F.BEAT, F.CUE, F.TOTAL, F.put, F.music, F.fx

SECTIONS = [("open", .5, b2 - .2, ["Dm", "Bb", "F", "C"]), ("orbit", b2 - .2, b3 - .2, [...])]
def write_bar(name, t, bar, c, i, nb): ...
F.write(SECTIONS, write_bar)
```

- **Sections start on voice beats**, a little before them (.1 to .3 s). The bar length is stretched so a section holds a whole number of bars (`bar0` 3.2 s as the target). So the same score fits every language, and the harmony changes with the narration.
- **One bar style per section**, built from `F.s_pad`, `F.s_bass`, `F.s_arp(pattern)`, `F.s_bells`, `F.s_drum`. An arp pattern lists chord-note indices, with `None` for a rest. Vary orchestration by section: pizzicato for a light list, choir for wonder, low strings and drums for tension. `u = i / (nb - 1)` lets a section grow.
- **Levels stay low.** Typical gains in `put` are .1 to .25 for pads and arps, .05 to .1 for bells. `mixdown` sets the balance afterwards.
- **A tune is optional and sparing.** The real film has one flute phrase in D dorian, used twice. Write your own; do not imitate a known melody.
- **End on a held chord** past the last word, with bells, under the fade.

Chord names: root, optional `m`, optional `sus`: `Dm`, `Bb`, `Asus`. See `chord()`.

## Effects, cue by cue

```python
put(fx, CUE["plant"] - .42, whoosh(.46, 500, 2400), .2, .2)   # a run-up starts before the hit
put(fx, CUE["plant"], thunk(), .62, .15)                      # the hit lands on the word
put(fx, CUE["plant"], bell(mtof(81), 1.8, .8, "celesta"), .22, .15)
put(fx, CUE["plant"] + .02, shimmer(.7, 1.0, seed=2), .12, .15)
```

- A hit is several layers: low thump, pitched bell, high sparkle.
- Anything that needs a run-up starts before its cue, by its own length.
- Mirror the picture exactly: a wipe's `SEQ` time minus `.75` for `paper_wipe(1.5)`; a row of things appearing gets a note each at the same spacing as the shot uses.
- Pan by where the thing is on screen (`pan` from -1 to 1).
- Use the pauses: effects read best where the voice rests.

A list of about 100 placed sounds carries a 5-minute film. See the end of `examples/court-astronomer/score.py`.

## The chain: audio/mixlib.py

Voice: high-pass 85 Hz, +1 dB at 180 Hz, +3.2 dB at 3 kHz, +.5 dB shelf at 8 kHz, a touch of saturated top for air, slow levelling (.7 to 1.5 gain, 400 ms), a short room at 5%.

Ducking: an envelope on the voice, attack 60 ms, release 450 ms. Music goes down 7.5 dB, effects 2.5 dB.

Music: hall 2.6 s at .42 send, a -2.5 dB pocket at 2.8 kHz for the voice, high-pass 38 Hz, -5 dB at 75 Hz, -2 dB at 160 Hz.

Effects: hall at .3 send, high-pass 28 Hz.

Sum: music at -9.5 dB, effects at -5.5 dB, a soft tanh, a 1.5 s fade at the end, then normalised to -15 LUFS with a gentle limiter under -1.2 dB. Change these through `F.mixdown(music_db=..., fx_db=..., duck_music=..., duck_fx=..., lufs_target=...)`.

**Why -15 LUFS.** A mix at -10 felt too loud with the music too present to the person who asked for the film. -15 is a good place for narrated video on phones.

A run takes about a minute for a 5-minute film. The voice WAVs must exist: `tools/tts.py` remakes them.

## Checks without ears

| Check | Tool | What to look for |
|---|---|---|
| Voice over the rest, per beat | printed by `mixdown` | Aim for about 10 dB. Real film: 6.7 to 14.2, mostly 7 to 9. Below that range, lower that section's music |
| Loudness, peak, range | printed by `mixdown` | I -15 LUFS, peak under -1 dBFS |
| Clipping | `qa_audio.py` | 0 clipped samples |
| Octave balance per section | `bands.py` | A section with a very different shape; a hump at 60 to 120 Hz means boom; nothing above 4 kHz means dull |
| Spectrogram and level lanes | `qa_audio.py` → `renders/qa/<lang>_mix.png` | Open it. Holes where music should be, a bar of constant noise, effects landing at beat lines |
| Is every word still there | `qa_audio.py <lang> whisper` | Match per beat. Real film: Russian .65 to .95 with a base model, English .79 to 1.0 |

Read the Whisper score for missing chunks of speech, not spelling. Small models mishear names and numbers constantly. A low score with the words present in `heard` is fine; a chunk missing from `heard` is a real fault. It runs on CPU and takes several minutes for a full film.

For melodies, also compare the melody stem's loudness with the accompaniment per section. A first pass in an earlier film had melodies 4 to 11 LU under it; aim for -3 to +2 LU.

## Gotchas

- Write stems as float WAV. PCM clips silently on the way.
- Normalise a one-shot such as a cymbal swell by its loudest 100 ms, not by its overall RMS, or a swell gets a +20 dB boost.
- scipy `istft` with `boundary=False` spikes at the edges. Use the default.
- Tell the user no human has listened to the mix, and ask them to listen first to the balance of voice and music.
