// main.js: page modes.
//   ?lang=ru&film&fps=24&record&file=x.mp4     the whole film, frame by frame into the encoder
//   ?lang=ru&times=1,4.5,9&record              single frames as PNGs, for checking
//   ?from=120&to=130                           record only that span (for a partial re-render)
//   &pause=40                                  rest this many ms after each recorded frame
const Q = new URLSearchParams(location.search);
const RECORD = Q.has('record');
const send = async (path, body) => {
  for (let k = 0; k < 6; k++) {
    try {
      const r = await fetch(path, { method: 'POST', body });
      if (r.ok || r.status === 409) return r.status;
    } catch (e) { /* retry */ }
    await new Promise((res) => setTimeout(res, 250 * (k + 1)));
  }
  throw new Error('POST failed: ' + path);
};
const log = (s) => { console.log(s); if (RECORD) send('/log', String(s)); };
let failed = false;
const fatal = (s) => {
  if (failed) return;
  failed = true;
  console.error(s);
  if (RECORD) send('/fatal', String(s));
};
addEventListener('error', (e) => fatal(`JS: ${e.message} @${e.filename}:${e.lineno}`));
addEventListener('unhandledrejection', (e) => fatal(`JS: ${(e.reason && e.reason.stack) || e.reason}`));

const canvas = document.createElement('canvas');
canvas.width = W; canvas.height = H;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
const pngOut = () => new Promise((res) => canvas.toBlob(res, 'image/png'));

async function run() {
  await document.fonts.load(`700 40px ${FONT}`);
  const { SPACE } = await import('./space.js');
  await FILM.init(SPACE);
  const fps = +(Q.get('fps') || 24);
  const times = Q.get('times') ? Q.get('times').split(',').map(Number) : null;
  if (times) {
    for (const t of times) {
      const t0 = performance.now();
      ctx.save(); FILM.frame(ctx, t); ctx.restore();
      log(`t=${t} ${(performance.now() - t0).toFixed(0)} ms`);
      if (RECORD) await send(`/png?name=t${t.toFixed(2).padStart(6, '0')}`, await pngOut());
    }
  } else if (RECORD) {
    const from = +(Q.get('from') || 0), to = +(Q.get('to') || FILM.DUR);
    const i0 = Math.round(from * fps), i1 = Math.round(to * fps), n = i1 - i0;
    await send('/start', JSON.stringify({ w: W, h: H, fps, total: n, file: Q.get('file') || 'film.mp4' }));
    const t0 = performance.now();
    for (let i = i0; i < i1; i++) {
      ctx.save(); FILM.frame(ctx, i / fps); ctx.restore();
      await send(`/frame?i=${i - i0}`, ctx.getImageData(0, 0, W, H).data);
      if (Q.get('pause')) await new Promise((res) => setTimeout(res, +Q.get('pause')));
      if ((i - i0) % 240 === 0) log(`frame ${i - i0}/${n}, ${((performance.now() - t0) / (i - i0 + 1)).toFixed(0)} ms per frame`);
    }
  } else {
    const start = performance.now() - 1000 * +(Q.get('t') || 0);
    (function loop() {
      const t = ((performance.now() - start) / 1000) % FILM.DUR;
      ctx.save(); FILM.frame(ctx, Math.floor(t * fps) / fps); ctx.restore();
      requestAnimationFrame(loop);
    })();
    return;
  }
  if (RECORD) await send('/end', '');
}
run();
