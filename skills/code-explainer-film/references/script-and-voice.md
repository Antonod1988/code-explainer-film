# Script and voice

## script/script.json

```json
{
 "stem": { "ru": "chasy-neba-ru", "en": "clock-of-the-sky-en" },
 "lead_in": 0.8,
 "tail": 0.2,
 "voice": {
  "ru": { "name": "ru-RU-SvetlanaNeural", "rate": "+6%", "pitch": "-2Hz" },
  "en": { "name": "en-GB-SoniaNeural", "rate": "+2%", "pitch": "-1Hz" }
 },
 "beats": [
  {
   "id": "b01",
   "shot": "opening",
   "pause": 0.7,
   "title": { "ru": "Звезда 1054 года", "en": "The star of 1054" },
   "ru": "Летом тысяча пятьдесят четвёртого года на небе {flare}вспыхнула новая звезда.",
   "en": "In the summer of ten fifty-four, a new star {flare}blazed into the sky."
  }
 ]
}
```

- `voice` decides the languages. Every beat needs text in each.
- `stem` names the final files.
- `pause` is the silence after a beat. Use 0.5 to 0.8 between beats. Give the last beat 1.5 to 3 s, so the ending can breathe under the fade.
- `shot` is a label printed by tools. The order of shots in the film is set by `SEQ` in `web/film.js`, and one beat can hold several shots.
- `title` is optional and feeds `tools/chapters.py`.

## Word budget

From the real film at 5:16: Russian 664 words, about 126 a minute with `rate +6%`. English 793 words, about 150 a minute with `rate +2%`, pauses included. Its first pass came out near 6 minutes and was fixed by cutting text and raising the rate a little. Multiply your target minutes by those rates before writing. Past about +10% a voice starts to sound hurried, and you cannot hear that, so cut words instead.

## Writing for a synthetic voice

- Short sentences, one idea each. Read it as speech, not as an article.
- **Spell out numbers and years as words:** `тысяча пятьдесят четвёртого`, `ten fifty-four`. Digits are read inconsistently, and spoken tokens that differ from the text break word alignment.
- Write `ё` in Russian, and spell out abbreviations.
- Avoid rare names at the start of a beat. Whisper mishears them, so you get no confirmation they were read well. Ask the user to listen to any you are unsure of.
- edge-tts takes plain text, so a wrong stress is fixed by rewording.

## Cue grammar

`{name}` goes immediately before a word. Its time is the moment that word starts.

- Names are letters, digits and underscores, unique across the film. `tts.py` stops on a duplicate.
- Each beat must have the same set of cues in every language. `tts.py` stops on a mismatch. The order within a beat may differ, because word order does.
- Name cues by meaning: `plant`, `eclipse`, `y1896`, not `c3`.
- Use a cue wherever the picture or a sound must land on a word. The real film had 57 cues on 16 beats, 2 to 7 in a beat.
- A beat's start and end are already available as `BEAT.b03.start` and `.end`, so they do not need cues.
- A marker with no word after it falls on the last word of the beat.

`tts.py` prints each beat as `b01 opening 0.80 +11.50  flare=вспыхнула@3.18 plant=поставили@9.21`. Check that each name sits on the word you meant.

## The timeline it writes

`web/timing_<lang>.js`:

```js
TIMING.ru = { "lang": "ru", "total": 315.933, "beats": [
  { "id": "b01", "shot": "opening", "start": 0.8, "dur": 11.5, "end": 12.3,
    "cues": { "flare": 3.176, "plant": 9.211, "cut": 10.496 },
    "words": [[0.8, 1.2, "Летом"], ...] } ] };
```

`film.js` and `mixlib.py` both read this. Nothing else holds timing.

## Takes

`audio/voice/<lang>/<beat>.mp3` with `.json` (word boundaries), `.stamp` (hash of text and voice) and `.wav`. A take is redone only when its stamp changes, and the old one is overwritten, so there is nothing to delete by hand. Running `tts.py` remakes the WAVs from the mp3s; `audio/score.py` needs them. After any text change, re-run it and re-read the cue lines, since every later time moved.

## Voices

edge-tts is an unofficial client for the neural voices of Microsoft Edge. It is free, needs internet, and sends your text to Microsoft. Check that its terms fit the use the user has in mind.

```bash
pip install edge-tts
python -m edge_tts --list-voices
```

- Tested version: 7.3.1. It needs `boundary="WordBoundary"`, which `tts.py` passes; versions without that argument fail. No word times means no timeline, so `tts.py` treats empty boundaries as an error.
- The service drops connections and sometimes answers "No audio was received". `tts.py` retries 8 times.
- A voice can go down for a whole day while others work. `ru-RU-DmitryNeural` did this during the real film; Svetlana worked. Switch voice rather than waiting.

Any other engine fits if it writes the same files: an mp3 per beat and `[{"start": s, "end": s, "text": word}]`. If it gives no word times, get them with Whisper (`word_timestamps=True` in faster-whisper) and write that JSON. Local neural voices need their runtime in place, so check it starts before planning around one.

Do not clone a real person's voice without their consent, and do not present a synthetic voice as a person.

## Facts

- Two kinds of statement exist: exact (computed, sourced, checkable) and interpretive (tradition, opinion, forecast). Keep them visibly apart on screen. The real film uses a book with a page called Exact and a page called Tradition, stamped "no link found", because the script says science has found no such link.
- Reuse computed data if a neighbouring project has it. Put it in a file the page loads, so dates and positions on screen come from the data and not from your memory.
- Never invent a number to fill a label. If you cannot confirm something, cut it or say that it is uncertain.
- On anything people might act on (health, money, law), add the uncertainty to the script itself, and show the user the script before voicing it.
