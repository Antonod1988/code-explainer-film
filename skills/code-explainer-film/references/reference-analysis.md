# Reading a reference video

The goal is numbers for a style sheet. You are after the technique: how fast things update, how heavy the lines are, what the palette is, how shots change. Your eye over a few screenshots will get this wrong; measuring takes minutes.

## In a browser, without downloading

Tested on YouTube in a browser you can run JavaScript in (the desktop app's built-in pane). No file is saved. The video stays in the page, and you read it through a canvas.

YouTube's `<video>` uses a blob: MSE source, so `drawImage(video, ...)` does not taint the canvas and `getImageData` works. Another site may taint it: if `getImageData` throws a SecurityError, fall back to screenshots.

A cookie dialog and ads come first. Choose the most privacy-preserving option in the dialog. Wait until the player no longer reports `ad-showing`.

**Prepare the player.** Pause, mute, ask for 1080p, drop captions, go to the start.

```js
(async () => {
  const p = document.querySelector('#movie_player');
  const v = document.querySelector('video');
  v.pause();
  try { p.setPlaybackQualityRange('hd1080', 'hd1080'); } catch (e) {}
  try { v.muted = true; } catch (e) {}
  try { p.unloadModule && p.unloadModule('captions'); } catch (e) {}
  v.currentTime = 0.05;
  await new Promise((r) => { v.onseeked = r; setTimeout(r, 4000); });
  return { t: v.currentTime, d: v.duration, w: v.videoWidth, h: v.videoHeight,
           q: p.getPlaybackQuality && p.getPlaybackQuality(), ad: p.classList.contains('ad-showing') };
})()
```

**Cuts and motion.** Mean absolute difference between samples on a tiny canvas, every 0.2 s. Cuts are spikes, holds are near zero. The same loop gives the mean colour.

```js
(async () => {
  const v = document.querySelector('video'); v.pause();
  const seek = (t) => new Promise((r) => { const on = () => { v.removeEventListener('seeked', on); r(); }; v.addEventListener('seeked', on); v.currentTime = t; setTimeout(r, 5000); });
  const W = 64, H = 36, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  let prev = null; const out = [];
  for (let t = 0.04; t <= 10.5; t += 0.2) {
    await seek(t);
    await new Promise((r) => setTimeout(r, 60));
    g.drawImage(v, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    let m = 0, r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; if (prev) m += Math.abs(d[i] - prev[i]) + Math.abs(d[i + 1] - prev[i + 1]) + Math.abs(d[i + 2] - prev[i + 2]); }
    const n = W * H; out.push([+v.currentTime.toFixed(2), +(m / n / 3).toFixed(1), Math.round(r / n), Math.round(gg / n), Math.round(b / n)]);
    prev = d.slice();
  }
  return out;
})()
```

**How animation steps.** Run the same loop at steps of 1/48 or 1/60 s over a stretch with a moving character. Zero differences are held frames. A character changing every second frame at 24 fps is animated at 12, while a camera move in the same shot may change on every frame. Measure the two separately, on small crops.

**Contact sheet.** Draw frames into a fixed full-window canvas above the page and take a screenshot. Screenshots can lag the canvas, so wait a moment after drawing.

```js
(async () => {
  const v = document.querySelector('video'); v.pause();
  const seek = (t) => new Promise((r) => { const on = () => { v.removeEventListener('seeked', on); r(); }; v.addEventListener('seeked', on); v.currentTime = t; setTimeout(r, 5000); });
  document.getElementById('__sheet')?.remove();
  const ov = document.createElement('canvas'); ov.id = '__sheet'; ov.width = 1280; ov.height = 900;
  ov.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:900px;z-index:2147483647;background:#000';
  document.documentElement.appendChild(ov);
  const g = ov.getContext('2d');
  const times = [0.15, 0.6, 1.2, 1.8, 2.5, 3.3, 3.7, 4.9, 5.8, 7.5, 7.8, 8.0];
  const cols = 3, w = 426, h = 240;
  for (let i = 0; i < times.length; i++) {
    await seek(times[i]);
    await new Promise((r) => setTimeout(r, 80));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h;
    g.drawImage(v, x, y, w, h);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y, 50, 16); g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(times[i].toFixed(2), x + 4, y + 12);
  }
  await new Promise((r) => setTimeout(r, 300));
  return 'ok';
})()
```

**Close look.** Draw one frame at 1280x720 into the same overlay and zoom the screenshot to read line weight and grain.

**Palette.** Take a 320x180 frame, quantise each channel to 5 bits, count, and list the top colours as hex.

Remove the overlay when you are done: `document.getElementById('__sheet').remove()`. Clear any viewport emulation you set.

If a site is login-gated or will not play in the pane, ask the user for a file or a few screenshots. Do not work around a sign-in.

## The style sheet

Write this into the project's README before drawing anything. Example values are from the real film's reference, as measured.

| Measure | Example |
|---|---|
| Character update rate | 12 fps, with long holds |
| Camera and paper | every frame, 24 fps |
| Line weight at 1080p | about 3 px, uniform ink, near-black, not pure black |
| Fill | flat colour, almost no gradients |
| Grain | fine woven cloth in screen space, about 5.6 px period, does not move with the art |
| Palette | list of hex values with names (night, parchment, gold, brick) |
| Shot length | list from the difference spikes |
| Transitions | cut, a parchment band sweeping across, short dissolves |
| Lettering | one hand-like face on notched parchment tags |

## Keep it yours

Write down, next to the sheet, what is new in your film: the character, the story, the setting, the objects. If you cannot fill that list, you are making a copy. Measurements of a look are fine to reuse; frames, characters, logos and a recognisable tune are not.
