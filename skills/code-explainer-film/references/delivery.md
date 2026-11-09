# Delivery

## The files

| File | Made by | Settings | Use |
|---|---|---|---|
| `final/<stem>.mp4` | `finish_film.py` | 1080p, CRF 16 to 17 picture copied, AAC 224k, faststart | YouTube, archive. 5:16 came to about 210 MiB |
| `final/<stem>-phone.mp4` | `finish_film.py` | 960x540, two-pass under 29 MiB, `hqdn3d`, tune animation, AAC 96k | Sending to a phone, X |
| `final/<stem>-telegram.mp4` | `telegram_copy.py` | See below | Telegram |
| `final/<stem>.srt` | `finish_film.py` | Sentences timed from word times, two lines at most | Upload as captions |

`--phone-mb` and `--mb` set the size limits. The bitrate comes from the duration, capped at 3 Mbps, so a longer film gets softer at the same size. Past about 10 minutes, raise the limit or lower the resolution.

Some ways of sending files to a user have their own limit, 30 MiB in the desktop app's file card. Send the small copy and name the path of the master.

## Telegram

A copy under 30 MiB made in the usual way still showed "not optimized for streaming" to the user. What ended it:

- `telegram_copy.py`: H.264 High@3.1, 4 reference frames, 2 B-frames, a keyframe every 2 s (`-g 48`), closed GOP, capped bitrate, AAC-LC stereo 48 kHz, `-brand mp42`, moov at the very start.
- Telling the user to **attach it as a video, not as a file**.

Which of the two fixed it is unknown, so do both and say that you do not know. Telegram Desktop's own check only looks for the moov atom near the start of the file. Check with `python tools/mp4info.py <file>`: it prints the atoms and `moov before mdat: True`.

## YouTube text

Give title options, a description and tags as plain text ready to paste, in the film's language.

- **Title:** 3 options, under 70 characters, saying what the viewer will learn. No clickbait the film does not deliver.
- **Description:** the first two lines carry the point, since they show before "more". Then chapters from `python tools/chapters.py <lang>`. YouTube wants the first at 0:00, at least three, and at least 10 s each. Then sources for the data, and a line saying the voice is synthetic and the picture is made with code.
- **Tags:** 10 to 15, under 500 characters, the subject first.
- Keep the same honest line the film draws between exact facts and interpretation. Do not promise in the title what the film labels as tradition.
- Check the platform's current rules on labelling synthetic content, and tell the user if one applies.

## X

A short post in the post's language, one or two sentences, stating the subject and what is unusual about it. Use the phone copy. Accounts have video length limits (2:20 for many), so tell the user the limit before they try, and offer a cut. Do not make the cut unless they want it.

## Who publishes

You prepare; the user posts. Do not upload, post or send anything on their behalf unless they asked for that specific action. You also cannot see how a post looks from inside their account, so ask them what they see.

## Cleaning up

- Move test renders and voice WAVs to the Recycle Bin or Trash, not to oblivion. Keep finals and everything needed to remake them: script, takes (mp3, json, stamp), web, audio code. WAVs and `renders/` can be remade.
- On Windows, from PowerShell:

  ```powershell
  Add-Type -AssemblyName Microsoft.VisualBasic
  [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('<project>\renders\check', 'OnlyErrorDialogs', 'SendToRecycleBin')
  ```

- Do not touch a delivered final without asking.
- Update the project README with what was made and how to remake it.

## The report

Short, in the user's language, in this order:

1. What they have now: file paths, sizes, length.
2. What you verified, and how: "looked at a sheet of frames every 8 s in both languages", "-15 LUFS, voice 7 to 14 dB over the rest on every beat", "Whisper recovered every sentence".
3. What you did not verify: "nobody has heard it", "not watched in real time", "not tried in Telegram".
4. Known flaws, with a time code and the cost of fixing. Example: "the English master shows 23,4° with a comma at 0:30-0:36. Fixed in code, the file needs a 16-minute re-render if you want it."
5. The one question that matters next, if any.

Do not describe the film in glowing terms: you have not seen it as a viewer.
